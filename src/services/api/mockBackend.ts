/**
 * MOCK BACKEND — stands in for the API Gateway until the real Commerce/Identity
 * services are wired up. Everything here (pricing, promotion evaluation, status
 * codes, payment types) imitates what the backend is expected to do and must be
 * replaced by real endpoints. Do not import this file from components; go
 * through `services/api/index.ts`.
 */
import { BRANDS, PRODUCTS, PROMOTIONS } from '../../data/mockData';
import {
  Address,
  CartItem,
  CheckoutPreview,
  CheckoutPreviewGroup,
  CustomerOrder,
  PaymentProvider,
  SellerOrder
} from '../../types';

const LATENCY_MS = 300;
const FREE_SHIPPING_THRESHOLD = 500000;
const STANDARD_SHIPPING_FEE = 30000;
const STANDARD_SHIPPING_METHOD = 'Giao tiêu chuẩn (xe bảo ôn)';

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), LATENCY_MS));

const nowIso = () => new Date().toISOString().slice(0, 19);

let sequence = 2;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(sequence++).toString(36)}`;

// ---------------------------------------------------------------------------
// Catalog helpers (variant = product + sugar level option)
// ---------------------------------------------------------------------------

const SUGAR_CODES: Record<string, string> = {
  'Ít ngọt (Giảm 30%)': 'LS',
  'Tiêu chuẩn': 'STD',
  'Không đường (Dành cho người ăn kiêng)': 'SF'
};

function variantOf(item: CartItem) {
  const brand = BRANDS.find((b) => b.id === item.product.brandId);
  const sugarCode = SUGAR_CODES[item.sugarLevel] ?? 'STD';
  const productCode = item.product.id.toUpperCase();
  return {
    variantId: `${item.product.id}:${sugarCode}`,
    productCode,
    sku: `${brand?.storeCode ?? 'STORE'}-${productCode}-${sugarCode}`,
    variantName: item.sugarLevel
  };
}

// ---------------------------------------------------------------------------
// Identity: address book
// ---------------------------------------------------------------------------

let addresses: Address[] = [
  {
    addressId: 'addr-1',
    recipientName: 'Nguyễn Hữu Đạt',
    recipientPhone: '0901234567',
    addressLine: '12 Nguyễn Văn Bảo',
    ward: 'Phường 4',
    district: 'Quận Gò Vấp',
    city: 'TP. Hồ Chí Minh',
    isDefault: true
  },
  {
    addressId: 'addr-2',
    recipientName: 'Nguyễn Hữu Đạt (Văn phòng MoonCorp)',
    recipientPhone: '0908123456',
    addressLine: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ',
    ward: 'Phường 22',
    district: 'Quận Bình Thạnh',
    city: 'TP. Hồ Chí Minh',
    isDefault: false
  }
];

export function listAddresses() {
  return delay(addresses);
}

export function createAddress(input: Omit<Address, 'addressId'>) {
  const created: Address = { ...input, addressId: nextId('addr') };
  addresses = created.isDefault
    ? [...addresses.map((a) => ({ ...a, isDefault: false })), created]
    : [...addresses, created];
  return delay(created);
}

export function setDefaultAddress(addressId: string) {
  addresses = addresses.map((a) => ({ ...a, isDefault: a.addressId === addressId }));
  return delay(addresses);
}

// ---------------------------------------------------------------------------
// Commerce: checkout preview (server-side pricing)
// ---------------------------------------------------------------------------

function buildPreview(items: CartItem[]): CheckoutPreview {
  const byStore = new Map<string, CartItem[]>();
  for (const item of items) {
    const list = byStore.get(item.product.brandId) ?? [];
    list.push(item);
    byStore.set(item.product.brandId, list);
  }

  const groups: CheckoutPreviewGroup[] = [...byStore.entries()].map(([storeId, storeItems]) => {
    const brand = BRANDS.find((b) => b.id === storeId);
    const lines = storeItems.map((item) => {
      const variant = variantOf(item);
      return {
        cartItemId: item.id,
        variantIdRef: variant.variantId,
        sku: variant.sku,
        productName: item.product.name,
        variantName: variant.variantName,
        imageUrl: item.product.image,
        quantity: item.quantity,
        unitPrice: item.product.price,
        subtotal: item.product.price * item.quantity
      };
    });

    const subtotal = lines.reduce((sum, l) => sum + l.subtotal, 0);
    const quantity = lines.reduce((sum, l) => sum + l.quantity, 0);

    const appliedPromotions = PROMOTIONS.filter((p) => p.storeId === storeId && p.status === 'ACTIVE').flatMap((promo) =>
      promo.rules
        .filter((rule) => quantity >= (rule.minQuantity ?? 1))
        .map((rule) => {
          let discountAmount = 0;
          if (rule.ruleType === 'PERCENT_DISCOUNT') discountAmount = Math.round((subtotal * (rule.discountPercent ?? 0)) / 100);
          if (rule.ruleType === 'FIXED_DISCOUNT') discountAmount = rule.discountAmount ?? 0;
          return { promotionId: promo.promotionId, name: promo.name, discountAmount: Math.min(discountAmount, subtotal) };
        })
        .filter((p) => p.discountAmount > 0)
    );

    const discountTotal = Math.min(subtotal, appliedPromotions.reduce((sum, p) => sum + p.discountAmount, 0));
    const shippingFee = subtotal - discountTotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;

    return {
      storeId,
      storeName: brand?.name ?? storeId,
      supplierName: brand?.supplierName ?? '—',
      lines,
      appliedPromotions,
      subtotal,
      discountTotal,
      shippingFee,
      shippingMethod: STANDARD_SHIPPING_METHOD,
      totalAmount: subtotal - discountTotal + shippingFee
    };
  });

  const subtotal = groups.reduce((s, g) => s + g.subtotal, 0);
  const discountTotal = groups.reduce((s, g) => s + g.discountTotal, 0);
  const shippingTotal = groups.reduce((s, g) => s + g.shippingFee, 0);
  return { groups, subtotal, discountTotal, shippingTotal, grandTotal: subtotal - discountTotal + shippingTotal };
}

export function previewCheckout(items: CartItem[]) {
  return delay(buildPreview(items));
}

// ---------------------------------------------------------------------------
// Commerce: orders
// ---------------------------------------------------------------------------

function deriveCustomerStatus(sellerOrders: SellerOrder[]): string {
  const statuses = new Set(sellerOrders.map((s) => s.status));
  return statuses.size === 1 ? [...statuses][0] : 'PROCESSING';
}

const PRODUCT_2 = PRODUCTS.find((p) => p.id === 'prod-2')!;
const PRODUCT_5 = PRODUCTS.find((p) => p.id === 'prod-5')!;
const PRODUCT_1 = PRODUCTS.find((p) => p.id === 'prod-1')!;

let orders: CustomerOrder[] = [
  {
    orderId: 'ord-1001',
    orderNo: 'MSS-20261010-1001',
    sourceType: 'RETAIL',
    subtotal: 515000,
    discountTotal: 0,
    shippingTotal: 30000,
    grandTotal: 545000,
    status: 'PROCESSING',
    placedAt: '2026-10-10T09:15:00',
    deliveryAddress: {
      sourceAddressIdRef: 'addr-1',
      recipientName: 'Nguyễn Hữu Đạt',
      recipientPhone: '0901234567',
      addressLine: '12 Nguyễn Văn Bảo',
      ward: 'Phường 4',
      district: 'Quận Gò Vấp',
      city: 'TP. Hồ Chí Minh'
    },
    sellerOrders: [
      {
        sellerOrderId: 'so-1001-1',
        sellerOrderNo: 'SO-NL-1001',
        storeIdRef: 'nhu-lan',
        supplierIdRef: 'sup-02',
        storeNameSnapshot: 'Đặc Sản Như Lan',
        supplierNameSnapshot: 'Công ty TNHH Thực Phẩm Như Lan',
        subtotal: 370000,
        discountTotal: 0,
        shippingFee: 0,
        totalAmount: 370000,
        shippingMethodSnapshot: STANDARD_SHIPPING_METHOD,
        deliveryDateSnapshot: '2026-10-15',
        status: 'SHIPPING',
        items: [
          {
            orderItemId: 'oi-1',
            variantIdRef: 'prod-2:STD',
            productCodeSnapshot: 'PROD-2',
            productNameSnapshot: 'Bánh Nướng Thập Cẩm Gà Quay (2 Trứng) - Như Lan',
            skuSnapshot: 'STORE-NL-PROD-2-STD',
            variantNameSnapshot: 'Tiêu chuẩn',
            imageUrlSnapshot: PRODUCT_2.image,
            quantity: 2,
            unitPrice: 185000,
            discountAmount: 0,
            subtotal: 370000
          }
        ],
        payments: [
          {
            paymentId: 'pay-1',
            paymentType: 'FULL',
            amount: 370000,
            provider: 'VNPAY',
            transactionRef: 'VNP14512398',
            status: 'PAID',
            paidAt: '2026-10-10T09:16:00'
          }
        ],
        shipments: [
          {
            shipmentId: 'shp-1',
            shippingMethod: STANDARD_SHIPPING_METHOD,
            provider: 'Giao Hàng Nhanh',
            trackingCode: 'GHN8812345VN',
            shippedAt: '2026-10-12T14:00:00',
            expectedDeliveryAt: '2026-10-15T17:00:00',
            shippingFee: 0,
            status: 'IN_TRANSIT'
          }
        ],
        allowedActions: []
      },
      {
        sellerOrderId: 'so-1001-2',
        sellerOrderNo: 'SO-GV-1001',
        storeIdRef: 'givral',
        supplierIdRef: 'sup-05',
        storeNameSnapshot: 'Givral Bakery',
        supplierNameSnapshot: 'Công ty CP Givral',
        subtotal: 145000,
        discountTotal: 0,
        shippingFee: 30000,
        totalAmount: 175000,
        shippingMethodSnapshot: STANDARD_SHIPPING_METHOD,
        deliveryDateSnapshot: '2026-10-12',
        status: 'DELIVERED',
        items: [
          {
            orderItemId: 'oi-2',
            variantIdRef: 'prod-5:SF',
            productCodeSnapshot: 'PROD-5',
            productNameSnapshot: 'Bánh Dẻo Hạt Sen Hạt Chia (Không Đường) - Givral',
            skuSnapshot: 'STORE-GV-PROD-5-SF',
            variantNameSnapshot: 'Không đường (Dành cho người ăn kiêng)',
            imageUrlSnapshot: PRODUCT_5.image,
            quantity: 1,
            unitPrice: 145000,
            discountAmount: 0,
            subtotal: 145000
          }
        ],
        payments: [
          {
            paymentId: 'pay-2',
            paymentType: 'FULL',
            amount: 175000,
            provider: 'VNPAY',
            transactionRef: 'VNP14512399',
            status: 'PAID',
            paidAt: '2026-10-10T09:16:00'
          }
        ],
        shipments: [
          {
            shipmentId: 'shp-2',
            shippingMethod: STANDARD_SHIPPING_METHOD,
            provider: 'Giao Hàng Tiết Kiệm',
            trackingCode: 'GHTK55120',
            shippedAt: '2026-10-11T08:00:00',
            deliveredAt: '2026-10-12T10:30:00',
            shippingFee: 30000,
            status: 'DELIVERED'
          }
        ],
        allowedActions: []
      }
    ]
  },
  {
    orderId: 'ord-0088',
    orderNo: 'MSS-20261002-0088',
    sourceType: 'RFQ',
    rfqIdRef: 'RFQ2026-0088',
    subtotal: 142500000,
    discountTotal: 0,
    shippingTotal: 0,
    grandTotal: 142500000,
    status: 'PREPARING',
    placedAt: '2026-10-02T14:30:00',
    deliveryAddress: {
      sourceAddressIdRef: 'addr-2',
      recipientName: 'Nguyễn Hữu Đạt (Văn phòng MoonCorp)',
      recipientPhone: '0908123456',
      addressLine: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ',
      ward: 'Phường 22',
      district: 'Quận Bình Thạnh',
      city: 'TP. Hồ Chí Minh'
    },
    sellerOrders: [
      {
        sellerOrderId: 'so-0088-1',
        sellerOrderNo: 'SO-KD-88391',
        storeIdRef: 'kinh-do',
        supplierIdRef: 'sup-01',
        quotationIdRef: 'QT-0088-V2',
        storeNameSnapshot: 'Kinh Đô - Mondelez',
        supplierNameSnapshot: 'Công ty CP Mondelez Kinh Đô Việt Nam',
        subtotal: 142500000,
        discountTotal: 0,
        shippingFee: 0,
        totalAmount: 142500000,
        depositPercent: 30,
        depositAmount: 42750000,
        remainingAmount: 99750000,
        remainingDueAt: '2026-10-21T23:59:00',
        deliveryDateSnapshot: '2026-10-24',
        shippingMethodSnapshot: 'Xe lạnh 18°C – 22°C, giao tận nơi',
        status: 'PREPARING',
        items: [
          {
            orderItemId: 'oi-3',
            variantIdRef: 'prod-1:LS',
            productCodeSnapshot: 'PROD-1',
            productNameSnapshot: 'Hộp Quà Trăng Vàng Hoàng Kim VIP – in logo MoonCorp',
            skuSnapshot: 'STORE-KD-PROD-1-LS',
            variantNameSnapshot: 'Ít ngọt (Giảm 30%)',
            imageUrlSnapshot: PRODUCT_1.image,
            quantity: 500,
            unitPrice: 285000,
            discountAmount: 0,
            subtotal: 142500000
          }
        ],
        payments: [
          {
            paymentId: 'pay-3',
            paymentType: 'DEPOSIT',
            amount: 42750000,
            dueAt: '2026-10-03T23:59:00',
            provider: 'BANK_TRANSFER',
            transactionRef: 'VCB-0088-DEP',
            status: 'PAID',
            paidAt: '2026-10-02T16:05:00'
          },
          {
            paymentId: 'pay-4',
            paymentType: 'REMAINING',
            amount: 99750000,
            dueAt: '2026-10-21T23:59:00',
            status: 'PENDING'
          }
        ],
        shipments: [],
        allowedActions: ['PAY']
      }
    ]
  }
];

export function listOrders() {
  return delay([...orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt)));
}

export interface PlaceOrderInput {
  items: CartItem[];
  addressId: string;
  provider: PaymentProvider;
}

export function placeOrder({ items, addressId, provider }: PlaceOrderInput): Promise<CustomerOrder> {
  if (items.length === 0) return Promise.reject(new Error('Giỏ hàng trống.'));
  const address = addresses.find((a) => a.addressId === addressId);
  if (!address) return Promise.reject(new Error('Địa chỉ giao hàng không hợp lệ.'));

  const preview = buildPreview(items);
  const placedAt = nowIso();
  const orderSeq = Math.floor(1000 + Math.random() * 9000);
  const paidOnline = provider !== 'COD';

  const sellerOrders: SellerOrder[] = preview.groups.map((group, index) => {
    const brand = BRANDS.find((b) => b.id === group.storeId);
    const sellerOrderId = nextId('so');
    return {
      sellerOrderId,
      sellerOrderNo: `SO-${(brand?.storeCode ?? 'STORE').replace('STORE-', '')}-${orderSeq}${index + 1}`,
      storeIdRef: group.storeId,
      supplierIdRef: brand?.supplierId ?? '',
      storeNameSnapshot: group.storeName,
      supplierNameSnapshot: group.supplierName,
      subtotal: group.subtotal,
      discountTotal: group.discountTotal,
      shippingFee: group.shippingFee,
      totalAmount: group.totalAmount,
      shippingMethodSnapshot: group.shippingMethod,
      status: 'PENDING_CONFIRMATION',
      items: group.lines.map((line) => {
        // Spread the store-level promotion over lines proportionally (backend rule).
        const share = group.subtotal > 0 ? Math.round((group.discountTotal * line.subtotal) / group.subtotal) : 0;
        return {
          orderItemId: nextId('oi'),
          variantIdRef: line.variantIdRef,
          productCodeSnapshot: line.variantIdRef.split(':')[0].toUpperCase(),
          productNameSnapshot: line.productName,
          skuSnapshot: line.sku,
          variantNameSnapshot: line.variantName,
          imageUrlSnapshot: line.imageUrl,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountAmount: share,
          subtotal: line.subtotal - share
        };
      }),
      payments: [
        {
          paymentId: nextId('pay'),
          paymentType: 'FULL',
          amount: group.totalAmount,
          provider,
          transactionRef: paidOnline ? `${provider}-${orderSeq}${index + 1}` : undefined,
          status: paidOnline ? 'PAID' : 'PENDING',
          paidAt: paidOnline ? placedAt : undefined
        }
      ],
      shipments: [],
      allowedActions: ['CANCEL']
    };
  });

  const order: CustomerOrder = {
    orderId: nextId('ord'),
    orderNo: `MSS-${placedAt.slice(0, 10).replace(/-/g, '')}-${orderSeq}`,
    sourceType: 'RETAIL',
    subtotal: preview.subtotal,
    discountTotal: preview.discountTotal,
    shippingTotal: preview.shippingTotal,
    grandTotal: preview.grandTotal,
    status: deriveCustomerStatus(sellerOrders),
    placedAt,
    deliveryAddress: {
      sourceAddressIdRef: address.addressId,
      recipientName: address.recipientName,
      recipientPhone: address.recipientPhone,
      addressLine: address.addressLine,
      ward: address.ward,
      district: address.district,
      city: address.city
    },
    sellerOrders
  };

  orders = [order, ...orders];
  return delay(order);
}

function updateSellerOrder(orderId: string, sellerOrderId: string, update: (so: SellerOrder) => SellerOrder) {
  const order = orders.find((o) => o.orderId === orderId);
  const sellerOrder = order?.sellerOrders.find((s) => s.sellerOrderId === sellerOrderId);
  if (!order || !sellerOrder) return Promise.reject(new Error('Không tìm thấy đơn hàng.'));

  const sellerOrders = order.sellerOrders.map((s) => (s.sellerOrderId === sellerOrderId ? update(s) : s));
  const updated: CustomerOrder = { ...order, sellerOrders, status: deriveCustomerStatus(sellerOrders) };
  orders = orders.map((o) => (o.orderId === orderId ? updated : o));
  return delay(updated);
}

export function requestCancellation(orderId: string, sellerOrderId: string, reason: string) {
  return updateSellerOrder(orderId, sellerOrderId, (so) => {
    if (!so.allowedActions.includes('CANCEL')) throw new Error('Đơn này không còn được phép hủy.');
    // Refund percent is decided by the backend policy later — not computed here.
    return {
      ...so,
      status: 'CANCEL_REQUESTED',
      allowedActions: [],
      cancellation: { cancellationId: nextId('cxl'), actorType: 'CUSTOMER', reason, status: 'REQUESTED' }
    };
  });
}

export function payObligation(orderId: string, sellerOrderId: string, paymentId: string, provider: PaymentProvider) {
  return updateSellerOrder(orderId, sellerOrderId, (so) => {
    if (!so.allowedActions.includes('PAY')) throw new Error('Khoản này chưa được phép thanh toán.');
    const payments = so.payments.map((p) =>
      p.paymentId === paymentId
        ? { ...p, provider, status: 'PAID', paidAt: nowIso(), transactionRef: `${provider}-${Date.now().toString(36).toUpperCase()}` }
        : p
    );
    const stillPending = payments.some((p) => p.status === 'PENDING');
    return { ...so, payments, allowedActions: stillPending ? so.allowedActions : so.allowedActions.filter((a) => a !== 'PAY') };
  });
}
