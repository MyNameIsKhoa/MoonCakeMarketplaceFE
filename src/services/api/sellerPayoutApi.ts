import { http } from './http';

/**
 * Seller payout view (Commerce GET /api/payments/settlements/mine). Amounts are exact integer VND.
 * payoutStatus: PAID, PROCESSING (manual transfer reserved), READY (eligible or settlement READY), ON_HOLD,
 * BLOCKED (not eligible yet), NO_PAYOUT (cancelled or fully refunded).
 * Until a settlement snapshot exists (feeEstimated = true) platformFee/netPayout are estimates on the money collected
 * minus confirmed refunds; they are null while the fee rounding rule is not configured.
 */
export interface SellerPayoutRow {
  sellerOrderId: number;
  sellerOrderNo: string;
  orderId: number;
  orderNo: string;
  storeName: string;
  orderStatus: string;
  placedAt: string | null;
  totalAmount: number;
  grossCollected: number;
  refundedAmount: number;
  platformFee: number | null;
  netPayout: number | null;
  feeEstimated: boolean;
  eligible: boolean;
  blockingReasons: string[];
  settlementId: number | null;
  settlementStatus: string | null;
  payoutStatus: string;
  payoutReference: string | null;
  paidAt: string | null;
}

/** Over every seller order of the supplier: pending = BLOCKED + ON_HOLD, ready = READY + PROCESSING, paid = PAID. */
export interface SellerPayoutTotals {
  pendingAmount: number;
  readyAmount: number;
  paidAmount: number;
}

export interface SellerPayoutPage {
  content: SellerPayoutRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  totals: SellerPayoutTotals;
}

export const sellerPayoutApi = {
  /** The signed-in verified supplier's seller orders, newest first (page from 0, size 1–100). */
  list: async (page = 0, size = 20): Promise<SellerPayoutPage> =>
    (await http.get<SellerPayoutPage>('/api/payments/settlements/mine', { params: { page, size } })).data
};
