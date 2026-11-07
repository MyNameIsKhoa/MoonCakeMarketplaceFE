import { paymentApi, type Payment } from './paymentApi';

import { endedPayment, initiationKey, sellerInitiationKey, usableCheckout } from './paymentState';

const PAY_ORDER = ['FULL', 'DEPOSIT', 'REMAINING'];
const needsReconcile = (p: Payment) => p.status !== 'SUCCESS' && !endedPayment(p.status);

/** Newest row of the first unpaid obligation; undefined when everything is paid. */
function dueObligation(payments: Payment[]): Payment | undefined {
  for (const type of PAY_ORDER) {
    const rows = payments.filter(p => p.paymentType === type);
    if (rows.length === 0 || rows.some(p => p.status === 'SUCCESS')) continue;
    return rows.reduce((newest, p) => (p.paymentId > newest.paymentId ? p : newest));
  }
  return undefined;
}

function redirectCustomer(orderId: number, url: string) {
  sessionStorage.setItem('financeCustomerOrderId', String(orderId));
  window.location.assign(url);
}

export async function openCustomerCheckout(orderId: number) {
  let summary = await paymentApi.customerSummary(orderId);
  if (summary.paidAmount > 0 || summary.payment?.status === 'SUCCESS') throw new Error('Đơn này đã ghi nhận thanh toán. Vui lòng tải lại đơn hàng.');
  let url = summary.payment && usableCheckout(summary.payment);
  if (url) { redirectCustomer(orderId, url); return; }
  if (summary.payment && !endedPayment(summary.payment.status)) {
    summary = await paymentApi.reconcileCustomer(orderId);
    if (summary.paidAmount > 0 || summary.payment?.status === 'SUCCESS') throw new Error('PayOS đã ghi nhận thanh toán. Vui lòng tải lại đơn hàng.');
    url = summary.payment && usableCheckout(summary.payment);
    if (url) { redirectCustomer(orderId, url); return; }
    if (!summary.payment || !endedPayment(summary.payment.status)) {
      throw new Error('Giao dịch đang được xác minh với PayOS. Vui lòng đối soát lại sau.');
    }
  }
  const scope = `customer:${orderId}:${summary.payment?.id ?? 'initial'}`;
  summary = await paymentApi.initiateCustomer(orderId, initiationKey(scope));
  url = summary.payment && usableCheckout(summary.payment);
  if (!url) throw new Error('Chưa có link thanh toán hợp lệ. Vui lòng đối soát PayOS trước khi thử lại.');
  redirectCustomer(orderId, url);
}

export async function openSellerCheckout(sellerOrderId: number) {
  let summary = await paymentApi.summary(sellerOrderId);
  let obligation = dueObligation(summary.payments);
  if (!obligation) throw new Error('Đơn này đã được thanh toán đủ.');
  let url = usableCheckout(obligation);
  if (url) { window.location.assign(url); return; }
  const unresolved = summary.payments.filter(needsReconcile);
  if (unresolved.length) {
    for (const payment of unresolved) {
      if ((await paymentApi.reconcile(payment.paymentId)).status === 'SUCCESS') {
        throw new Error('PayOS đã ghi nhận khoản thanh toán này. Vui lòng tải lại đơn hàng.');
      }
    }
    summary = await paymentApi.summary(sellerOrderId);
    obligation = dueObligation(summary.payments);
    if (!obligation) throw new Error('Đơn này đã được thanh toán đủ.');
    url = usableCheckout(obligation);
    if (url) { window.location.assign(url); return; }
    const unresolvedAttempt = summary.payments.some(p => needsReconcile(p) &&
      !(p.status === 'PENDING' && !p.checkoutUrl && !p.expiresAt));
    if (unresolvedAttempt) throw new Error('Giao dịch đang được xác minh với PayOS. Vui lòng đối soát lại sau.');
  }
  if (!endedPayment(obligation.status) && !(obligation.status === 'PENDING' && !obligation.checkoutUrl && !obligation.expiresAt)) {
    throw new Error('Đơn này chưa có khoản thanh toán sẵn sàng.');
  }
  const payment = await paymentApi.initiate(obligation.paymentId, sellerInitiationKey(obligation));
  url = usableCheckout(payment);
  if (!url) throw new Error('Chưa có link thanh toán hợp lệ. Vui lòng đối soát PayOS trước khi thử lại.');
  window.location.assign(url);
}
