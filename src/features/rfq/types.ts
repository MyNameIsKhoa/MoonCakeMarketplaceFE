// Mirrors the RFQ & Negotiation service contract (docs/TV4_BACKEND_GUIDE.md): IDs and money are
// decimal strings, quantity/version are integers, timestamps are UTC ISO-8601.
// Identity/Catalog responses keep their own numeric IDs.

export type RfqStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED';
export type QuotationStatus = 'DRAFT' | 'SUBMITTED' | 'REVISED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
export type ConversionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface PageResult<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Rfq {
  rfqId: string;
  rfqCode: string;
  /** Only returned to the owner. */
  customerId?: string;
  title: string;
  description?: string;
  quantity: number;
  budgetAmount?: string;
  requestedDeliveryDate?: string;
  deliveryLocation?: string;
  customizationRequirements?: string;
  status: RfqStatus;
  expiresAt?: string;
  createdAt: string;
}

export interface CreateRfqInput {
  title: string;
  description?: string;
  quantity: number;
  budgetAmount?: string;
  requestedDeliveryDate?: string;
  deliveryLocation?: string;
  customizationRequirements?: string;
  expiresAt?: string;
}

export interface QuotationSummary {
  quotationId: string;
  rfqId: string;
  supplierId: string;
  storeId: string;
  previousQuotationId: string | null;
  version: number;
  totalAmount: string;
  depositPercent: string;
  shippingFee: string;
  proposedDeliveryDate: string;
  validUntil: string;
  status: QuotationStatus;
  submittedAt: string;
}

export interface QuotationItem {
  quotationItemId: string;
  variantId: string | null;
  itemNameSnapshot: string;
  skuSnapshot: string | null;
  quantity: number;
  unitPrice: string;
  discountAmount: string;
  subtotal: string;
  customizationNote: string | null;
}

export interface Quotation extends QuotationSummary {
  leadTimeDays: number | null;
  shippingMethod: string | null;
  paymentTerms: string | null;
  items: QuotationItem[];
  acceptedAt: string | null;
  decisionReason: string | null;
}

export interface QuotationItemInput {
  productId?: string;
  variantId?: string;
  itemNameSnapshot?: string;
  skuSnapshot?: string;
  quantity: number;
  unitPrice: string;
  discountAmount?: string;
  customizationNote?: string;
}

export interface QuotationTermsInput {
  depositPercent: string;
  validUntil: string;
  leadTimeDays?: number;
  proposedDeliveryDate: string;
  shippingMethod?: string;
  shippingFee: string;
  paymentTerms?: string;
  items: QuotationItemInput[];
}

export interface QuotationAccepted {
  quotationId: string;
  rfqId: string;
  customerId: string;
  supplierId: string;
  storeId: string;
  versionNo: number;
  orderId: string | null;
  sellerOrderId: string | null;
  conversionStatus: ConversionStatus;
}

// --- Identity / Catalog lookups used by TV4 screens -------------------------

export interface SupplierProfile {
  supplierId: number;
  userId: number;
  companyName: string;
  verificationStatus: string;
}

export interface StoreInfo {
  storeId: number;
  supplierIdRef: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: string;
}

export interface BuyerAddress {
  addressId: number;
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  ward: string | null;
  district: string | null;
  city: string;
  isDefault: boolean;
}
