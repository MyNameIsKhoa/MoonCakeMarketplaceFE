import { paymentApi, type Payment } from './paymentApi';

// PayOS may still move money in these states, so ask PayOS before issuing another link.
const IN_FLIGHT = ['CREATING', 'RECONCILING', 'CANCELLING'];
// The backend reissues a link only from these states (a new payment row of the same type).
const RETRYABLE = ['CANCELLED', 'EXPIRED', 'FAILED'];
// Seller-order obligations: FULL alone, or DEPOSIT before REMAINING.
const PAY_ORDER = ['FULL', 'DEPOSIT', 'REMAINING'];

// A link past its expiry stays PENDING until PayOS is asked again.
const needsReconcile = (p: Payment) => IN_FLIGHT.includes(p.status) || (p.status === 'PENDING' && !!p.expiresAt);

/** Newest row of the first unpaid obligation; undefined when everything is paid. */
function dueObligation(payments: Payment[]): Payment | undefined {
  for (const type of PAY_ORDER) {
    const rows = payments.filter(p => p.paymentType === type);
    if (rows.length === 0 || rows.some(p => p.status === 'SUCCESS')) continue;
    return rows.reduce((newest, p) => (p.paymentId > newest.paymentId ? p : newest));
  }
  return undefined;
}

function checkoutUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function redirect(value: string | null) {
  const url = checkoutUrl(value);
  if (!url) throw new Error('Chưa lấy được link thanh toán PayOS. Vui lòng thử lại.');
  window.location.assign(url);
}

function redirectCustomer(orderId: number, value: string | null) {
  const url = checkoutUrl(value);
  if (!url) throw new Error('Chưa lấy được link thanh toán PayOS. Vui lòng thử lại.');
  sessionStorage.setItem('financeCustomerOrderId', String(orderId));
  window.location.assign(url);
}

export async function openCustomerCheckout(orderId: number) {
  let summary = await paymentApi.customerSummary(orderId);
  if (summary.payment?.status === 'PENDING' && summary.payment.expiresAt &&
      Date.parse(summary.payment.expiresAt) > Date.now()) {
    redirectCustomer(orderId, summary.payment.checkoutUrl);
    return;
  }
  if (summary.payment && ['CREATING', 'RECONCILING', 'CANCELLING', 'PENDING'].includes(summary.payment.status)) {
    summary = await paymentApi.reconcileCustomer(orderId);
  }
  if (summary.payment && ['CREATING', 'RECONCILING', 'CANCELLING', 'PENDING'].includes(summary.payment.status)) {
    throw new Error('Giao dịch đang được xác minh với PayOS. Vui lòng thử lại sau.');
  }
  if (summary.paidAmount > 0) throw new Error('Đơn này đã được thanh toán.');
  summary = await paymentApi.initiateCustomer(orderId, crypto.randomUUID());
  // The backend cancels a link whose URL never reached it; one more attempt issues a fresh link.
  if (summary.payment && RETRYABLE.includes(summary.payment.status)) {
    summary = await paymentApi.initiateCustomer(orderId, crypto.randomUUID());
  }
  if (summary.payment?.status !== 'PENDING') throw new Error('PayOS chưa sẵn sàng. Vui lòng thử lại.');
  redirectCustomer(orderId, summary.payment.checkoutUrl);
}

export async function openSellerCheckout(sellerOrderId: number) {
  let summary = await paymentApi.summary(sellerOrderId);
  const active = summary.payments.find(p => p.status === 'PENDING' && p.checkoutUrl &&
    (!p.expiresAt || Date.parse(p.expiresAt) > Date.now()));
  if (active) {
    redirect(active.checkoutUrl);
    return;
  }
  const stale = summary.payments.filter(needsReconcile);
  if (stale.length > 0) {
    for (const p of stale) {
      // Paid after all: stop here so the buyer sees it instead of being sent to pay the next obligation.
      if ((await paymentApi.reconcile(p.paymentId)).status === 'SUCCESS') {
        throw new Error('PayOS đã ghi nhận khoản thanh toán này. Vui lòng tải lại đơn hàng.');
      }
    }
    summary = await paymentApi.summary(sellerOrderId);
    if (summary.payments.some(needsReconcile)) {
      throw new Error('Giao dịch đang được xác minh với PayOS. Vui lòng thử lại sau.');
    }
  }
  const obligation = dueObligation(summary.payments);
  if (!obligation) throw new Error('Đơn này đã được thanh toán đủ.');
  if (!(obligation.status === 'PENDING' && !obligation.checkoutUrl) && !RETRYABLE.includes(obligation.status)) {
    throw new Error('Đơn này chưa có khoản thanh toán sẵn sàng.');
  }
  let payment = await paymentApi.initiate(obligation.paymentId, crypto.randomUUID());
  // The backend cancels a link whose URL never reached it; one more attempt issues a fresh link.
  if (RETRYABLE.includes(payment.status)) payment = await paymentApi.initiate(payment.paymentId, crypto.randomUUID());
  if (payment.status !== 'PENDING') throw new Error('PayOS chưa sẵn sàng. Vui lòng thử lại.');
  redirect(payment.checkoutUrl);
}
