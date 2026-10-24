import type { Address, CartItem, CheckoutPreview, CustomerOrder, Product } from '../../types';
import { IMAGE_FALLBACK } from '../../utils/imageFallback';
import { ApiError, http } from './http';
import { storeApi } from './catalogApi';

type AddressWire = Omit<Address, 'addressId'> & { addressId: number };
type CartLine = { cartItemId: number; variantId: number; productName: string; variantName: string;
  sku: string; imageUrl: string | null; quantity: number; unitPrice: number; subtotal: number;
  discountAmount: number };
type StorePrice = { storeId: number; supplierId: number; storeName: string; subtotal: number;
  discountTotal: number; totalAmount: number; promotions: string[]; items: CartLine[] };
type CartPricing = { subtotal: number; discountTotal: number; totalAmount: number; stores: StorePrice[] };
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
    status: string; dueAt: string | null }>;
  cancellations: Array<{ id: number; status: string; reason: string }>;
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
  }
};

async function pricing(): Promise<CartPricing> {
  return (await http.post<CartPricing>('/api/cart/pricing')).data;
}

export const cartApi = {
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
        quantity: line.quantity, sugarLevel: line.variantName, variantId: String(line.variantId) };
    }));
  },
  add: async (variantId: string, quantity: number) => {
    await http.post('/api/cart/items', { variantId: Number(variantId), quantity });
  },
  update: async (itemId: string, quantity: number) => {
    await http.patch(`/api/cart/items/${orderId(itemId)}`, { quantity });
  },
  remove: async (itemId: string) => {
    await http.delete(`/api/cart/items/${orderId(itemId)}`);
  }
};

export const checkoutApi = {
  preview: async (): Promise<CheckoutPreview> => {
    const priced = await pricing();
    const groups = await Promise.all(priced.stores.map(async (store) => {
      const shop = await storeApi.get(store.storeId);
      if (shop.shippingFee === null || shop.shippingFee < 0)
        throw new Error(`Gian hàng ${shop.name} chưa cấu hình phí vận chuyển.`);
      return {
        storeId: String(store.storeId), storeName: store.storeName, supplierName: '',
        lines: store.items.map((line) => ({
          cartItemId: String(line.cartItemId), variantIdRef: String(line.variantId), sku: line.sku,
          productName: line.productName, variantName: line.variantName,
          imageUrl: line.imageUrl || IMAGE_FALLBACK, quantity: line.quantity,
          unitPrice: line.unitPrice, subtotal: line.subtotal
        })),
        appliedPromotions: [],
        subtotal: store.subtotal, discountTotal: store.discountTotal,
        shippingFee: Math.ceil(shop.shippingFee), shippingMethod: 'Phí cố định của gian hàng',
        totalAmount: store.totalAmount + Math.ceil(shop.shippingFee)
      };
    }));
    const shippingTotal = groups.reduce((sum, group) => sum + group.shippingFee, 0);
    return { groups, subtotal: priced.subtotal, discountTotal: priced.discountTotal,
      shippingTotal, grandTotal: priced.totalAmount + shippingTotal };
  },
  placeOrder: async (addressId: string, key: string): Promise<CheckoutPlaced> => {
    return (await http.post<CheckoutPlaced>('/api/checkout',
      { addressId: Number(orderId(addressId)) }, { headers: { 'Idempotency-Key': key }, timeout: 30000 })).data;
  }
};

export const orderApi = {
  get: async (id: string): Promise<CustomerOrder> => {
    const raw = (await http.get<OrderWire>(`/api/orders/${orderId(id)}`)).data;
    const sellerOrders = await Promise.all(raw.sellerOrders.map(async (seller) => {
      const finance: FinanceWire = raw.status === 'PENDING_STOCK' ? { payments: [], cancellations: [] } :
        await http.get<FinanceWire>(`/api/payments/orders/${seller.sellerOrderId}`)
          .then((response) => response.data)
          .catch((error: unknown) => {
            if (error instanceof ApiError && error.status === 404) return { payments: [], cancellations: [] };
            throw error;
          });
      const cancellation = finance.cancellations[0];
      const canRequestCancellation = finance.cancellations.length === 0 &&
        !['PENDING_STOCK', 'CANCELLED', 'DELIVERED', 'COMPLETED', 'SETTLED', 'DISPUTED'].includes(seller.status);
      return {
        ...seller, sellerOrderId: String(seller.sellerOrderId), storeIdRef: String(seller.storeIdRef),
        supplierIdRef: String(seller.supplierIdRef), discountTotal: seller.items.reduce((n, i) => n + i.discountAmount, 0),
        items: seller.items.map((item) => ({ ...item, orderItemId: String(item.orderItemId),
          variantIdRef: item.variantIdRef === null ? undefined : String(item.variantIdRef) })),
        payments: finance.payments.map((p) => ({ paymentId: String(p.paymentId), paymentType: p.paymentType,
          amount: p.amount, status: p.status, dueAt: p.dueAt ?? undefined, provider: 'PAYOS' })),
        shipments: [],
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
  storeNameSnapshot: string; status: string; totalAmount: number;
}

export const sellerOrderApi = {
  list: async (): Promise<SellerOrderSummary[]> => {
    const first = (await http.get<{ content: SellerOrderSummary[]; totalPages: number }>(
      '/api/seller-orders', { params: { size: 100 } })).data;
    const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
      http.get<{ content: SellerOrderSummary[] }>('/api/seller-orders', { params: { page: i + 1, size: 100 } })));
    return [...first.content, ...rest.flatMap((page) => page.data.content)];
  }
};
