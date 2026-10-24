import { paymentApi } from './paymentApi';

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
  if (summary.payment?.status !== 'PENDING') throw new Error('PayOS chưa sẵn sàng. Vui lòng thử lại.');
  redirectCustomer(orderId, summary.payment.checkoutUrl);
}

export async function openSellerCheckout(sellerOrderId: number) {
  const summary = await paymentApi.summary(sellerOrderId);
  const active = summary.payments.find(p => p.status === 'PENDING' && p.checkoutUrl &&
    (!p.expiresAt || Date.parse(p.expiresAt) > Date.now()));
  if (active) {
    redirect(active.checkoutUrl);
    return;
  }
  if (summary.payments.some(p => ['CREATING', 'RECONCILING', 'CANCELLING'].includes(p.status) ||
    (p.status === 'PENDING' && p.expiresAt))) {
    throw new Error('Giao dịch đang được xác minh với PayOS. Vui lòng thử lại sau.');
  }
  const obligation = summary.payments.find(p => p.status === 'PENDING' && !p.checkoutUrl);
  if (!obligation) throw new Error('Đơn này chưa có khoản thanh toán sẵn sàng.');
  const payment = await paymentApi.initiate(obligation.paymentId, crypto.randomUUID());
  if (payment.status !== 'PENDING') throw new Error('PayOS chưa sẵn sàng. Vui lòng thử lại.');
  redirect(payment.checkoutUrl);
}
