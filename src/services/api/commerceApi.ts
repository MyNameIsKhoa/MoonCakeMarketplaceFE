import type { Address, CartItem, CheckoutPreview, CustomerOrder, Product } from '../../types';
import { IMAGE_FALLBACK } from '../../utils/imageFallback';
import { ApiError, http } from './http';

type AddressWire = Omit<Address, 'addressId'> & { addressId: number };
type CartLine = { cartItemId: number; variantId: number; productName: string; variantName: string;
  sku: string; imageUrl: string | null; quantity: number; unitPrice: number; subtotal: number;
  discountAmount: number; selected: boolean; availableQuantity: number | null };
type StorePrice = { storeId: number; supplierId: number; storeName: string; subtotal: number;
  discountTotal: number; totalAmount: number; promotions: string[]; items: CartLine[] };
/** A line Catalog no longer sells: not priced, shown so the buyer can remove it before checkout. */
type UnavailableLine = { cartItemId: number; variantId: number; productName: string; variantName: string;
  sku: string; imageUrl: string | null; quantity: number; reason: string; availableQuantity: number | null };
type CartPricing = { subtotal: number; discountTotal: number; totalAmount: number; stores: StorePrice[];
  unavailableItems?: UnavailableLine[] };
type OrderWire = Omit<CustomerOrder, 'orderId' | 'sellerOrders' | 'deliveryAddress'> & {
  orderId: number; deliveryAddress: CustomerOrder['deliveryAddress'] & { sourceAddressIdRef: number | null };
  sellerOrders: Array<Omit<CustomerOrder['sellerOrders'][number],
    'sellerOrderId' | 'storeIdRef' | 'supplierIdRef' | 'items' | 'payments' | 'shipments' | 'allowedActions'> & {
      sellerOrderId: number; storeIdRef: number; supplierIdRef: number;
      items: Array<Omit<CustomerOrder['sellerOrders'][number]['items'][number], 'orderItemId' | 'variantIdRef'> &
        { orderItemId: number; variantIdRef: number | null }>;
    }>;
};
type FinanceWire = {
  payments: Array<{ paymentId: number; paymentType: string; amount: number;
    status: string; dueAt: string | null; expiresAt?: string | null; checkoutUrl?: string | null }>;
  cancellations: Array<{ id: number; status: string; reason: string }>;
};
type ShipmentWire = {
  shipmentId: number;
  sellerOrderId: number;
  shippingMethod: string;
  provider?: string | null;
  trackingCode?: string | null;
  expectedShipAt?: string | null;
  shippedAt?: string | null;
  expectedDeliveryAt?: string | null;
  deliveredAt?: string | null;
  shippingFee: number;
  status: string;
};
export type CheckoutPlaced = { orderId: number; orderNo: string; status: string; grandTotal: number;
  sellerOrders: Array<{ sellerOrderId: number; sellerOrderNo: string; totalAmount: number }> };

const address = (a: AddressWire): Address => ({ ...a, addressId: String(a.addressId) });
const orderId = (id: string) => {
  if (!/^\d+$/.test(id)) throw new Error('Mã đơn hàng không hợp lệ.');
  return id;
};

export const addressApi = {
  list: async () => (await http.get<AddressWire[]>('/api/addresses')).data.map(address),
  create: async (input: Omit<Address, 'addressId'>) =>
    address((await http.post<AddressWire>('/api/addresses', input)).data),
  setDefault: async (id: string) => {
    await http.patch(`/api/addresses/${orderId(id)}`, { isDefault: true });
    return addressApi.list();
  },
  /** PATCH: omitted/blank name, phone, line and city keep their value; '' clears ward/district.
   *  `isDefault: false` on the default address is rejected (409): set another default instead. */
  update: async (id: string, input: Partial<Omit<Address, 'addressId'>>) =>
    address((await http.patch<AddressWire>(`/api/addresses/${orderId(id)}`, input)).data),
  /** 204. Deleting the default address makes the oldest remaining address the default. */
  remove: async (id: string) => {
    await http.delete(`/api/addresses/${orderId(id)}`);
  }
};

async function pricing(): Promise<CartPricing> {
  return (await http.post<CartPricing>('/api/cart/pricing')).data;
}

export type CheckoutSelection = { cartItemIds: number[]; quantity?: number };

export const cartApi = {
  get: async () => (await http.get<{ items: Array<{ cartItemId: number; variantId: number; quantity: number }> }>("/api/cart")).data,
  list: async (): Promise<CartItem[]> => {
    const data = await pricing();
    return data.stores.flatMap((store) => store.items.map((line): CartItem => {
      const product: Product = {
        id: `variant-${line.variantId}`, name: line.productName, storeId: String(store.storeId),
        storeName: store.storeName, price: line.unitPrice, rating: 0, reviewCount: 0,
        image: line.imageUrl || IMAGE_FALLBACK, gallery: [], category: '', flavor: '', weight: '',
        ingredients: [], sugarLevel: 'Tiêu chuẩn', description: '', salesCount: 0, inStock: true,
        variantId: String(line.variantId)
      };
      return { id: String(line.cartItemId), productId: product.id, product,
        quantity: line.quantity, sugarLevel: line.variantName, variantId: String(line.variantId),
        selected: line.selected, availableQuantity: line.availableQuantity };
    })).concat((data.unavailableItems ?? []).map((line): CartItem => {
      const product: Product = {
        id: `variant-${line.variantId}`, name: line.productName, storeId: '',
        storeName: '', price: 0, rating: 0, reviewCount: 0,
        image: line.imageUrl || IMAGE_FALLBACK, gallery: [], category: '', flavor: '', weight: '',
        ingredients: [], sugarLevel: 'Tiêu chuẩn', description: '', salesCount: 0, inStock: false,
        variantId: String(line.variantId)
      };
      return { id: String(line.cartItemId), productId: product.id, product,
        quantity: line.quantity, sugarLevel: line.variantName, variantId: String(line.variantId),
        selected: false, availableQuantity: line.availableQuantity, unavailableReason: line.reason };
    }));
  },
  select: async (cartItemIds: number[]) => {
    await http.patch("/api/cart/selection", { cartItemIds });
  },
  add: async (variantId: string, quantity: number) => {
    return (await http.post<{ cartItemId: number }>('/api/cart/items', { variantId: Number(variantId), quantity })).data;
  },
  update: async (itemId: string, quantity: number) => {
    await http.patch(`/api/cart/items/${orderId(itemId)}`, { quantity });
  },
  remove: async (itemId: string) => {
    await http.delete(`/api/cart/items/${orderId(itemId)}`);
  }
};

export const checkoutApi = {
  preview: async (selection: CheckoutSelection, signal?: AbortSignal): Promise<CheckoutPreview> => {
    type Wire = Omit<CheckoutPreview, "groups"> & { groups: Array<{ price: StorePrice; shippingFee: number }> };
    const { data } = await http.post<Wire>("/api/checkout/preview", selection, { signal });
    const groups = data.groups.map(({ price: store, shippingFee }) => ({
      storeId: String(store.storeId), storeName: store.storeName, supplierName: "",
      lines: store.items.map(line => ({
        cartItemId: String(line.cartItemId), variantIdRef: String(line.variantId), sku: line.sku,
        productName: line.productName, variantName: line.variantName, imageUrl: line.imageUrl || IMAGE_FALLBACK,
        quantity: line.quantity, unitPrice: line.unitPrice, subtotal: line.subtotal
      })),
      appliedPromotions: store.discountTotal > 0 && store.promotions.length > 0
        ? [{ promotionId: String(store.storeId), name: store.promotions.join(", "), discountAmount: store.discountTotal }] : [],
      subtotal: store.subtotal, discountTotal: store.discountTotal, shippingFee,
      shippingMethod: "Phí cố định của gian hàng", totalAmount: store.totalAmount + shippingFee
    }));
    return { ...data, groups };
  },
  placeOrder: async (addressId: string, key: string, selection: CheckoutSelection, quote: string): Promise<CheckoutPlaced> => {
    return (await http.post<CheckoutPlaced>("/api/checkout",
      { addressId: Number(orderId(addressId)), selection, quote }, { headers: { "Idempotency-Key": key }, timeout: 30000 })).data;
  }
};

export interface CustomerOrderSummary {
  orderId: number; orderNo: string; sourceType: 'RETAIL' | 'RFQ'; rfqIdRef: number | null;
  status: string; placedAt: string; subtotal: number; discountTotal: number;
  shippingTotal: number; grandTotal: number; sellerOrderCount: number; itemCount: number;
  sellerOrderStatuses: string[]; hasCancellation: boolean;
}

export const orderApi = {
  summaries: async (): Promise<CustomerOrderSummary[]> => {
    const result: CustomerOrderSummary[] = [];
    let page = 0;
    let totalPages = 1;
    do {
      const response = (await http.get<{ content: CustomerOrderSummary[]; totalPages: number }>(
        '/api/orders', { params: { page, size: 100 } })).data;
      result.push(...response.content);
      totalPages = response.totalPages;
      page++;
    } while (page < totalPages);
    return result;
  },
  get: async (id: string): Promise<CustomerOrder> => {
    const raw = (await http.get<OrderWire>(`/api/orders/${orderId(id)}`)).data;
    const sellerOrders = await Promise.all(raw.sellerOrders.map(async (seller) => {
      const [finance, rawShipments]: [FinanceWire, ShipmentWire[]] = raw.status === 'PENDING_STOCK'
        ? [{ payments: [], cancellations: [] }, []]
        : await Promise.all([
            http.get<FinanceWire>(`/api/payments/orders/${seller.sellerOrderId}`)
              .then((response) => response.data)
              .catch((error: unknown) => {
                if (error instanceof ApiError && error.status === 404) return { payments: [], cancellations: [] };
                throw error;
              }),
            http.get<ShipmentWire[]>('/api/shipments', { params: { sellerOrderId: seller.sellerOrderId } })
              .then((response) => (Array.isArray(response.data) ? response.data : []))
              .catch(() => [])
          ]);
      // Cases come oldest first; a REJECTED case may be followed by a new request.
      const cancellation = finance.cancellations.at(-1);
      const canRequestCancellation = finance.cancellations.every((c) => c.status === 'REJECTED') &&
        !['PENDING_STOCK', 'CANCEL_REQUESTED', 'CANCELLED', 'DELIVERED', 'ACCEPTED', 'COMPLETED', 'SETTLED', 'DISPUTED'].includes(seller.status);
      return {
        ...seller, sellerOrderId: String(seller.sellerOrderId), storeIdRef: String(seller.storeIdRef),
        supplierIdRef: String(seller.supplierIdRef), discountTotal: seller.items.reduce((n, i) => n + i.discountAmount, 0),
        items: seller.items.map((item) => ({ ...item, orderItemId: String(item.orderItemId),
          variantIdRef: item.variantIdRef === null ? undefined : String(item.variantIdRef) })),
        payments: finance.payments.map((p) => ({ paymentId: String(p.paymentId), paymentType: p.paymentType,
          amount: p.amount, status: p.status, dueAt: p.dueAt ?? undefined, provider: 'PAYOS', hasPayosLink: !!(p.checkoutUrl || p.expiresAt) })),
        shipments: rawShipments.map((s) => ({
          shipmentId: String(s.shipmentId),
          shippingMethod: s.shippingMethod,
          provider: s.provider ?? undefined,
          trackingCode: s.trackingCode ?? undefined,
          expectedShipAt: s.expectedShipAt ?? undefined,
          shippedAt: s.shippedAt ?? undefined,
          expectedDeliveryAt: s.expectedDeliveryAt ?? undefined,
          deliveredAt: s.deliveredAt ?? undefined,
          shippingFee: s.shippingFee,
          status: s.status
        })),
        cancellation: cancellation ? { cancellationId: String(cancellation.id),
          status: cancellation.status, reason: cancellation.reason } : undefined,
        allowedActions: canRequestCancellation ? ['CANCEL'] : []
      };
    }));
    return { ...raw, orderId: String(raw.orderId),
      deliveryAddress: { ...raw.deliveryAddress,
        sourceAddressIdRef: raw.deliveryAddress.sourceAddressIdRef === null ? undefined
          : String(raw.deliveryAddress.sourceAddressIdRef) }, sellerOrders };
  },
  list: async (): Promise<CustomerOrder[]> => {
    const first = (await http.get<{ content: Array<{ orderId: number }>; totalPages: number }>(
      '/api/orders', { params: { size: 100 } })).data;
    const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
      http.get<{ content: Array<{ orderId: number }> }>('/api/orders',
        { params: { page: i + 1, size: 100 } })));
    return Promise.all([...first.content, ...rest.flatMap((page) => page.data.content)]
      .map((summary) => orderApi.get(String(summary.orderId))));
  },
  requestCancellation: async (orderIdValue: string, sellerOrderId: string, reason: string) => {
    await http.post(`/api/payments/orders/${orderId(sellerOrderId)}/cancellations`, { reason },
      { headers: { 'Idempotency-Key': crypto.randomUUID() } });
    return orderApi.get(orderIdValue);
  },
  cancelUnpaidCustomerOrder: async (orderIdValue: string, reason: string) => {
    await http.post(`/api/payments/customer-orders/${orderId(orderIdValue)}/cancel-unpaid`, { reason });
    return orderApi.get(orderIdValue);
  }
};

export interface SellerOrderSummary {
  sellerOrderId: number; orderId: number; sellerOrderNo: string; storeIdRef: number;
  storeNameSnapshot: string; status: string; totalAmount: number; cancellationPending: boolean;
}

/** OrderItemResponse. Retail lines: subtotal = unitPrice × quantity (before discount); RFQ lines: after discount. */
export interface SellerOrderItem {
  orderItemId: number; variantIdRef: number | null; productCodeSnapshot: string | null;
  productNameSnapshot: string; skuSnapshot: string | null; variantNameSnapshot: string | null;
  imageUrlSnapshot: string | null; quantity: number; unitPrice: number; discountAmount: number; subtotal: number;
}

export interface SellerOrderDeliveryAddress {
  recipientName: string; recipientPhone: string; addressLine: string;
  ward: string | null; district: string | null; city: string;
}

/**
 * GET /api/seller-orders/{id} (SellerOrderResponse) — the order's supplier or buyer; anyone else gets 404.
 * `subtotal` is before discount for retail orders but after line discounts for RFQ orders (quotationIdRef set).
 * remainingDueAt is UTC without offset; deliveryDateSnapshot is a date (YYYY-MM-DD).
 */
export interface SellerOrderDetailResponse {
  sellerOrderId: number; orderId: number; sellerOrderNo: string; storeIdRef: number; supplierIdRef: number;
  quotationIdRef: number | null; storeNameSnapshot: string; supplierNameSnapshot: string; status: string;
  subtotal: number; shippingFee: number; totalAmount: number;
  depositPercent: number | null; depositAmount: number | null; remainingAmount: number | null;
  remainingDueAt: string | null; deliveryDateSnapshot: string | null;
  shippingMethodSnapshot: string | null; paymentTermsSnapshot: string | null;
  /** Being added by the backend; absent on older builds. */
  deliveryAddress?: SellerOrderDeliveryAddress | null;
  items: SellerOrderItem[];
}

export const sellerOrderApi = {
  get: async (sellerOrderId: number): Promise<SellerOrderDetailResponse> =>
    (await http.get<SellerOrderDetailResponse>(`/api/seller-orders/${orderId(String(sellerOrderId))}`)).data,
  list: async (): Promise<SellerOrderSummary[]> => {
    const first = (await http.get<{ content: SellerOrderSummary[]; totalPages: number }>(
      '/api/seller-orders', { params: { size: 100 } })).data;
    const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
      http.get<{ content: SellerOrderSummary[] }>('/api/seller-orders', { params: { page: i + 1, size: 100 } })));
    return [...first.content, ...rest.flatMap((page) => page.data.content)];
  }
};
