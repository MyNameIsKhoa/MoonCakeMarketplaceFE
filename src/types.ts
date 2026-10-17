// ---------------------------------------------------------------------------
// Catalog (mss_catalog_store) — UI view models
// ---------------------------------------------------------------------------

export interface Product {
  id: string;
  name: string;
  brandId: string;
  brandName: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  image: string;
  gallery: string[];
  category: 'truyen-thong' | 'hiện-đại' | 'chay' | 'cao-cap' | 'thieu-nhi';
  flavor: string;
  weight: string;
  ingredients: string[];
  sugarLevel: 'Ít ngọt (Giảm 30%)' | 'Tiêu chuẩn' | 'Không đường (Dành cho người ăn kiêng)';
  description: string;
  salesCount: number;
  inStock: boolean;
  isFlashSale?: boolean;
  flashSaleEnds?: string;
  isBestSeller?: boolean;
}

/** promotion_rule.rule_type — the only enum with a CHECK constraint in Catalog. */
export type PromotionRuleType = 'PERCENT_DISCOUNT' | 'FIXED_DISCOUNT' | 'BUY_X_GET_Y';

/** promotion_rule */
export interface PromotionRule {
  promotionRuleId: string;
  ruleType: PromotionRuleType;
  minQuantity?: number;
  discountPercent?: number;
  discountAmount?: number;
  rewardQuantity?: number;
}

/** promotion (per store, time-boxed). There is no voucher code in the schema. */
export interface Promotion {
  promotionId: string;
  storeId: string;
  name: string;
  startAt: string;
  endAt: string;
  status: string;
  rules: PromotionRule[];
}

/** store + supplier_profile summary as the storefront needs it. */
export interface Brand {
  id: string;
  storeCode: string;
  name: string;
  supplierId: string;
  supplierName: string;
  logo: string;
  banner: string;
  description: string;
  rating: number;
  productCount: number;
  responseRate: string;
  joinedYear: number;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  sugarLevel: string;
}

// ---------------------------------------------------------------------------
// Identity (mss_identity)
// ---------------------------------------------------------------------------

/** address — customer's editable address book. */
export interface Address {
  addressId: string;
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  ward?: string;
  district?: string;
  city: string;
  isDefault: boolean;
}

// ---------------------------------------------------------------------------
// Commerce (mss_commerce)
//
// Money: backend-authoritative values; FE only formats them.
// Status: plain strings from the API — labels/colors live in utils/status.ts.
// ---------------------------------------------------------------------------

export type Money = number;

/** Payment provider chosen at checkout (payment.provider). */
export type PaymentProvider = 'VNPAY' | 'MOMO' | 'BANK_TRANSFER' | 'COD';

/** order_item — immutable snapshot at purchase time. */
export interface OrderItem {
  orderItemId: string;
  variantIdRef?: string;
  productCodeSnapshot?: string;
  productNameSnapshot: string;
  skuSnapshot?: string;
  variantNameSnapshot?: string;
  imageUrlSnapshot?: string;
  quantity: number;
  unitPrice: Money;
  discountAmount: Money;
  subtotal: Money;
}

/** payment — a payment obligation/instalment of a seller order. */
export interface Payment {
  paymentId: string;
  paymentType: string;
  amount: Money;
  dueAt?: string;
  provider?: string;
  transactionRef?: string;
  status: string;
  paidAt?: string;
}

/** shipment */
export interface Shipment {
  shipmentId: string;
  shippingMethod: string;
  provider?: string;
  trackingCode?: string;
  expectedShipAt?: string;
  shippedAt?: string;
  expectedDeliveryAt?: string;
  deliveredAt?: string;
  shippingFee: Money;
  status: string;
}

/** cancellation (max one per seller order in v1) */
export interface Cancellation {
  cancellationId: string;
  actorType: string;
  reason: string;
  refundPercent?: number;
  status: string;
  cancelledAt?: string;
}

/** seller_order — sub-order per store/supplier. */
export interface SellerOrder {
  sellerOrderId: string;
  sellerOrderNo: string;
  storeIdRef: string;
  supplierIdRef: string;
  quotationIdRef?: string;
  storeNameSnapshot: string;
  supplierNameSnapshot: string;
  subtotal: Money;
  discountTotal: Money;
  shippingFee: Money;
  totalAmount: Money;
  depositPercent?: number;
  depositAmount?: Money;
  remainingAmount?: Money;
  remainingDueAt?: string;
  deliveryDateSnapshot?: string;
  shippingMethodSnapshot?: string;
  status: string;
  items: OrderItem[];
  payments: Payment[];
  shipments: Shipment[];
  cancellation?: Cancellation;
  /** Actions the backend currently allows the customer to perform. */
  allowedActions: string[];
}

/** delivery_address — snapshot of the address at order time (1–1 with order). */
export interface DeliveryAddress {
  sourceAddressIdRef?: string;
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  ward?: string;
  district?: string;
  city: string;
}

/** customer_order — one checkout (or one accepted RFQ). */
export interface CustomerOrder {
  orderId: string;
  orderNo: string;
  sourceType: 'RETAIL' | 'RFQ';
  rfqIdRef?: string;
  subtotal: Money;
  discountTotal: Money;
  shippingTotal: Money;
  grandTotal: Money;
  status: string;
  placedAt: string;
  deliveryAddress: DeliveryAddress;
  sellerOrders: SellerOrder[];
}

/** Backend checkout preview: cart grouped by seller with server-side totals. */
export interface CheckoutPreviewLine {
  cartItemId: string;
  variantIdRef: string;
  sku: string;
  productName: string;
  variantName: string;
  imageUrl: string;
  quantity: number;
  unitPrice: Money;
  subtotal: Money;
}

export interface CheckoutPreviewGroup {
  storeId: string;
  storeName: string;
  supplierName: string;
  lines: CheckoutPreviewLine[];
  appliedPromotions: { promotionId: string; name: string; discountAmount: Money }[];
  subtotal: Money;
  discountTotal: Money;
  shippingFee: Money;
  shippingMethod: string;
  totalAmount: Money;
}

export interface CheckoutPreview {
  groups: CheckoutPreviewGroup[];
  subtotal: Money;
  discountTotal: Money;
  shippingTotal: Money;
  grandTotal: Money;
}

// ---------------------------------------------------------------------------
// RFQ (mss_rfq_negotiation) & misc
// ---------------------------------------------------------------------------

export interface Review {
  id: string;
  productId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  date: string;
  comment: string;
  photos?: string[];
  sugarLevelOption: string;
}
