import { request } from '../../services/api/http';
import type { SellerPayoutRow } from '../../services/api/sellerPayoutApi';

export interface Payment {
  paymentId: number; sellerOrderId: number; paymentType: string; amount: number;
  status: string; holdStatus: string | null; dueAt: string | null; expiresAt: string | null;
  checkoutUrl: string | null; qrCode: string | null; refundableAmount?: number | null;
}
export interface FinanceCase {
  id: number; status: string; reason: string; amount: number | null;
  evidenceUrl: string | null; resolution: string | null;
  sellerResponse: string | null; openedAt: string | null; respondedAt: string | null;
  escalatedAt: string | null; decisionType: string | null; disputeId: number | null;
}
export interface Settlement {
  settlementId: number; grossAmount: number; feeBasis: string; roundingRule: string;
  feeAmount: number; supplierPayoutAmount: number; status: string; refundedAmount: number;
}
export interface FinanceSummary {
  context: { sellerOrderId: number; totalAmount: number; depositAmount: number | null;
    deliveryDate: string | null; accepted: boolean; paidAmount: number; remainingDueAt: string | null;
    disputeDeadlineAt: string | null };
  payments: Payment[]; cancellations: FinanceCase[]; refunds: FinanceCase[];
  disputes: FinanceCase[]; settlements: Settlement[];
  eligibility: { eligible: boolean; blockingReasons: string[] };
  history: { auditId: number; eventType: string; resourceId: number; actor: string; detail: string; createdAt: string }[];
}
export interface TransferInstruction {
  kind: 'REFUND' | 'PAYOUT'; id: number; amount: number; status: string; memo: string;
  bankBin: string | null; bankName: string | null; accountNumber: string | null;
  accountHolder: string | null; qrImageUrl: string | null;
}
export interface CustomerPaymentSummary {
  customerOrderId: number;
  totalAmount: number;
  paidAmount: number;
  payment: null | {
    id: number; orderId: number; orderCode: number; amount: number; status: string;
    linkId: string | null; checkoutUrl: string | null; qrCode: string | null; expiresAt: string | null;
  };
  allocations: { paymentId: number; sellerOrderId: number; amount: number; sellerOrderNo: string }[];
}
/** Admin finance list (GET /api/payments/settlements): every seller order, newest first; rows as in the seller view. */
export interface AdminPayoutPage {
  content: SellerPayoutRow[]; page: number; size: number; totalElements: number; totalPages: number;
}
// Calls that reach PayOS: a create may be followed by a reconcile and a cancel, each up to the
// backend's 30 s PayOS timeout, so these wait longer than the default 20 s.
const PAYOS_CALL = { timeoutMs: 100000 };

export const paymentApi = {
  adminPayouts: (q: string, page: number, size: number) => request<AdminPayoutPage>(
    `/api/payments/settlements?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page), size: String(size) })}`),
  summary: (orderId: number) => request<FinanceSummary>(`/api/payments/orders/${orderId}`),
  transfers: (orderId: number) => request<{ transfers: TransferInstruction[] }>(`/api/payments/orders/${orderId}/transfer-instructions`),
  prepareTransfer: (orderId: number, kind: TransferInstruction['kind'], id: number, key: string) =>
    request<{ transfers: TransferInstruction[] }>(`/api/payments/orders/${orderId}/${kind === 'REFUND' ? 'refunds' : 'settlements'}/${id}/prepare-transfer`,
      { method: 'POST', key }),
  initiate: (id: number, key: string) => request<Payment>(`/api/payments/${id}/initiate`, { method: 'POST', key, ...PAYOS_CALL }),
  reconcile: (id: number) => request<Payment>(`/api/payments/${id}/reconcile`, { method: 'POST', ...PAYOS_CALL }),
  cancelLink: (id: number) => request<Payment>(`/api/payments/${id}/cancel-link`, { method: 'POST', ...PAYOS_CALL }),
  customerSummary: (orderId: number) => request<CustomerPaymentSummary>(`/api/payments/customer-orders/${orderId}`),
  initiateCustomer: (orderId: number, key: string) => request<CustomerPaymentSummary>(`/api/payments/customer-orders/${orderId}/initiate`, { method: 'POST', key, ...PAYOS_CALL }),
  reconcileCustomer: (orderId: number) => request<CustomerPaymentSummary>(`/api/payments/customer-orders/${orderId}/reconcile`, { method: 'POST', ...PAYOS_CALL }),
  cancelCustomerLink: (orderId: number) => request<CustomerPaymentSummary>(`/api/payments/customer-orders/${orderId}/cancel-link`, { method: 'POST', ...PAYOS_CALL }),
  command: (orderId: number, command: string, body: unknown, key: string) =>
    request<FinanceSummary>(`/api/payments/orders/${orderId}/${command}`, { method: 'POST', body, key }),
};
