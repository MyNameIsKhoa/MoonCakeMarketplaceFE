// Single place that maps backend status codes to Vietnamese labels + badge variants.
// The SQL schema has no CHECK enum for most status columns, so every lookup has a
// fallback that shows the raw code instead of guessing.

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusMeta {
  label: string;
  variant: BadgeVariant;
}

type StatusMap = Record<string, StatusMeta>;

export const ORDER_STATUS: StatusMap = {
  AWAITING_PAYMENT: { label: 'Chờ thanh toán', variant: 'warning' },
  PENDING_CONFIRMATION: { label: 'Chờ nhà bán xác nhận', variant: 'warning' },
  CONFIRMED: { label: 'Đã xác nhận', variant: 'info' },
  PROCESSING: { label: 'Đang xử lý', variant: 'info' },
  PREPARING: { label: 'Đang chuẩn bị hàng', variant: 'info' },
  SHIPPING: { label: 'Đang giao hàng', variant: 'info' },
  DELIVERED: { label: 'Đã giao hàng', variant: 'success' },
  COMPLETED: { label: 'Hoàn tất', variant: 'success' },
  CANCEL_REQUESTED: { label: 'Đang yêu cầu hủy', variant: 'warning' },
  CANCELLED: { label: 'Đã hủy', variant: 'danger' },
  DISPUTED: { label: 'Đang khiếu nại', variant: 'danger' }
};

export const PAYMENT_STATUS: StatusMap = {
  PENDING: { label: 'Chờ thanh toán', variant: 'warning' },
  PAID: { label: 'Đã thanh toán', variant: 'success' },
  FAILED: { label: 'Thanh toán thất bại', variant: 'danger' },
  REFUNDED: { label: 'Đã hoàn tiền', variant: 'neutral' },
  CANCELLED: { label: 'Đã hủy', variant: 'neutral' }
};

export const PAYMENT_TYPE: StatusMap = {
  FULL: { label: 'Thanh toán toàn bộ', variant: 'neutral' },
  DEPOSIT: { label: 'Tiền cọc', variant: 'neutral' },
  REMAINING: { label: 'Phần còn lại', variant: 'neutral' }
};

export const PAYMENT_PROVIDER: StatusMap = {
  VNPAY: { label: 'VNPAY-QR', variant: 'neutral' },
  MOMO: { label: 'Ví MoMo', variant: 'neutral' },
  BANK_TRANSFER: { label: 'Chuyển khoản ngân hàng', variant: 'neutral' },
  COD: { label: 'Thanh toán khi nhận hàng (COD)', variant: 'neutral' }
};

export const SHIPMENT_STATUS: StatusMap = {
  READY_TO_SHIP: { label: 'Chờ bàn giao vận chuyển', variant: 'warning' },
  IN_TRANSIT: { label: 'Đang vận chuyển', variant: 'info' },
  DELIVERED: { label: 'Đã giao', variant: 'success' },
  FAILED: { label: 'Giao thất bại', variant: 'danger' }
};

export const CANCELLATION_STATUS: StatusMap = {
  REQUESTED: { label: 'Đã gửi yêu cầu hủy', variant: 'warning' },
  APPROVED: { label: 'Đã chấp nhận hủy', variant: 'danger' },
  REJECTED: { label: 'Từ chối hủy', variant: 'neutral' }
};

export const ORDER_SOURCE: StatusMap = {
  RETAIL: { label: 'Mua lẻ', variant: 'neutral' },
  RFQ: { label: 'Đơn từ báo giá (RFQ)', variant: 'info' }
};

export const PROMOTION_RULE: StatusMap = {
  PERCENT_DISCOUNT: { label: 'Giảm theo %', variant: 'neutral' },
  FIXED_DISCOUNT: { label: 'Giảm số tiền', variant: 'neutral' },
  BUY_X_GET_Y: { label: 'Mua X tặng Y', variant: 'neutral' }
};

export function getStatusMeta(map: StatusMap, code: string | undefined): StatusMeta {
  if (!code) return { label: '—', variant: 'neutral' };
  return map[code] ?? { label: code, variant: 'neutral' };
}
