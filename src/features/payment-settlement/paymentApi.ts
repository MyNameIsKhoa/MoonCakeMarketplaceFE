import { request } from '../../services/api/http';

export interface Payment {
  paymentId: number; sellerOrderId: number; paymentType: string; amount: number;
  status: string; holdStatus: string | null; dueAt: string | null; expiresAt: string | null;
  checkoutUrl: string | null; qrCode: string | null;
}
export interface FinanceCase {
  id: number; status: string; reason: string; amount: number | null;
  evidenceUrl: string | null; resolution: string | null;
}
export interface Settlement {
  settlementId: number; grossAmount: number; feeBasis: string; roundingRule: string;
  feeAmount: number; supplierPayoutAmount: number; status: string;
}
export interface FinanceSummary {
  context: { sellerOrderId: number; totalAmount: number; depositAmount: number | null;
    deliveryDate: string | null; accepted: boolean; paidAmount: number; remainingDueAt: string | null };
  payments: Payment[]; cancellations: FinanceCase[]; refunds: FinanceCase[];
  disputes: FinanceCase[]; settlements: Settlement[];
  eligibility: { eligible: boolean; blockingReasons: string[] };
  history: { auditId: number; eventType: string; actor: string; detail: string; createdAt: string }[];
}
export const paymentApi = {
  summary: (orderId: number) => request<FinanceSummary>(`/api/payments/orders/${orderId}`),
  initiate: (id: number, key: string) => request<Payment>(`/api/payments/${id}/initiate`, { method: 'POST', key }),
  reconcile: (id: number) => request<Payment>(`/api/payments/${id}/reconcile`, { method: 'POST' }),
  cancelLink: (id: number) => request<Payment>(`/api/payments/${id}/cancel-link`, { method: 'POST' }),
  command: (orderId: number, command: string, body: unknown, key: string) =>
    request<FinanceSummary>(`/api/payments/orders/${orderId}/${command}`, { method: 'POST', body, key }),
};
