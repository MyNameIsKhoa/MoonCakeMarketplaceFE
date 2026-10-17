import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, MapPin, Store, Truck } from 'lucide-react';
import { Address, CartItem, CheckoutPreview, CustomerOrder, PaymentProvider } from '../types';
import { addressApi, checkoutApi } from '../services/api';
import { formatAddress, formatVnd } from '../utils/format';
import { PAYMENT_PROVIDER, getStatusMeta } from '../utils/status';
import EmptyState from '../components/ui/EmptyState';

interface CheckoutProps {
  items: CartItem[];
  onOrderPlaced: (order: CustomerOrder) => void;
  setActiveTab: (tab: string) => void;
}

const PROVIDERS: { id: PaymentProvider; description: string }[] = [
  { id: 'VNPAY', description: 'Quét mã QR qua ứng dụng ngân hàng' },
  { id: 'MOMO', description: 'Thanh toán qua ví MoMo' },
  { id: 'BANK_TRANSFER', description: 'Chuyển khoản vào tài khoản sàn (giữ tiền đến khi nghiệm thu)' },
  { id: 'COD', description: 'Trả tiền mặt cho đơn vị vận chuyển khi nhận hàng' }
];

export default function Checkout({ items, onOrderPlaced, setActiveTab }: CheckoutProps) {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [addressId, setAddressId] = useState('');
  const [provider, setProvider] = useState<PaymentProvider>('VNPAY');

  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [placedOrder, setPlacedOrder] = useState<CustomerOrder | null>(null);

  useEffect(() => {
    addressApi.list().then((list) => {
      setAddresses(list);
      setAddressId((list.find((a) => a.isDefault) ?? list[0])?.addressId ?? '');
    });
  }, []);

  const loadPreview = useCallback(() => {
    if (items.length === 0) return;
    setIsPreviewLoading(true);
    setPreviewError('');
    checkoutApi
      .preview(items)
      .then(setPreview)
      .catch(() => setPreviewError('Không thể tính giá đơn hàng. Vui lòng thử lại.'))
      .finally(() => setIsPreviewLoading(false));
  }, [items]);

  useEffect(loadPreview, [loadPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressId) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const order = await checkoutApi.placeOrder({ items, addressId, provider });
      setPlacedOrder(order);
      onOrderPlaced(order);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Đặt hàng thất bại. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (placedOrder) {
    return (
      <div className="mss-container mss-page max-w-3xl">
        <div className="mss-card flex flex-col items-center text-center gap-4">
          <CheckCircle2 className="w-12 h-12 text-green-700" />
          <h1 className="mss-page-title">Đặt hàng thành công</h1>
          <p className="text-base text-gray-700">
            Mã đơn hàng <strong>{placedOrder.orderNo}</strong> đã được tạo, gồm {placedOrder.sellerOrders.length} đơn nhà bán:
          </p>
          <ul className="text-sm text-gray-700 flex flex-col gap-1">
            {placedOrder.sellerOrders.map((so) => (
              <li key={so.sellerOrderId}>
                {so.sellerOrderNo} — {so.storeNameSnapshot} ({formatVnd(so.totalAmount)})
              </li>
            ))}
          </ul>
          <p className="text-base">
            Tổng thanh toán: <span className="mss-price">{formatVnd(placedOrder.grandTotal)}</span>
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={() => setActiveTab('orders')} className="mss-button mss-button--primary">
              Xem đơn hàng của tôi
            </button>
            <button onClick={() => setActiveTab('home')} className="mss-button mss-button--secondary">
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mss-container mss-page">
        <EmptyState
          title="Giỏ hàng đang trống"
          description="Hãy thêm sản phẩm vào giỏ trước khi thanh toán."
          action={
            <button onClick={() => setActiveTab('products')} className="mss-button mss-button--primary">
              Khám phá sản phẩm
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mss-container mss-page">
      <header className="mss-page-header">
        <div>
          <h1 className="mss-page-title">Thanh toán</h1>
          <p className="mss-page-description">Chọn địa chỉ nhận hàng, phương thức thanh toán và kiểm tra đơn theo từng nhà bán.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mss-two-column">
        <div className="mss-stack">
          {/* Delivery address (snapshot is taken by the backend at order time) */}
          <section className="mss-card mss-stack">
            <h2 className="mss-card-title flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-700" /> Địa chỉ nhận hàng
            </h2>
            {addresses === null ? (
              <p className="text-sm text-gray-500">Đang tải sổ địa chỉ…</p>
            ) : addresses.length === 0 ? (
              <div className="mss-alert mss-alert--warning">
                Bạn chưa có địa chỉ nào.{' '}
                <button type="button" className="underline font-semibold" onClick={() => setActiveTab('profile')}>
                  Thêm địa chỉ trong tài khoản
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {addresses.map((addr) => (
                  <label
                    key={addr.addressId}
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${
                      addressId === addr.addressId ? 'border-primary-700 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={addressId === addr.addressId}
                      onChange={() => setAddressId(addr.addressId)}
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">
                        {addr.recipientName} · {addr.recipientPhone}
                        {addr.isDefault && <span className="mss-badge mss-badge--info ml-2">Mặc định</span>}
                      </p>
                      <p className="text-sm text-gray-600">{formatAddress(addr)}</p>
                    </div>
                  </label>
                ))}
                <button type="button" className="self-start text-sm font-semibold text-primary-700 hover:underline" onClick={() => setActiveTab('profile')}>
                  Quản lý sổ địa chỉ
                </button>
              </div>
            )}
          </section>

          {/* Payment provider */}
          <section className="mss-card mss-stack">
            <h2 className="mss-card-title flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary-700" /> Phương thức thanh toán
            </h2>
            <div className="flex flex-col gap-3">
              {PROVIDERS.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${
                    provider === p.id ? 'border-primary-700 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input type="radio" name="provider" checked={provider === p.id} onChange={() => setProvider(p.id)} className="mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900">{getStatusMeta(PAYMENT_PROVIDER, p.id).label}</p>
                    <p className="text-sm text-gray-500">{p.description}</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              Mỗi nhà bán tạo một khoản thanh toán riêng. Tiền được sàn giữ đến khi đơn đủ điều kiện quyết toán.
            </p>
          </section>

          {/* Seller order groups from the backend preview */}
          <section className="mss-stack">
            <h2 className="mss-section-title">Đơn theo nhà bán</h2>
            {isPreviewLoading && !preview && <p className="text-sm text-gray-500">Đang tính giá đơn hàng…</p>}
            {previewError && (
              <div className="mss-alert mss-alert--danger flex flex-wrap items-center justify-between gap-3">
                <span>{previewError}</span>
                <button type="button" className="mss-button mss-button--secondary mss-button--sm" onClick={loadPreview}>
                  Thử lại
                </button>
              </div>
            )}
            {preview?.groups.map((group) => (
              <article key={group.storeId} className="mss-card mss-stack">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="mss-card-title flex items-center gap-2">
                      <Store className="w-5 h-5 text-primary-700 shrink-0" /> {group.storeName}
                    </h3>
                    <p className="mss-card-meta">Nhà cung cấp: {group.supplierName}</p>
                  </div>
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <Truck className="w-4 h-4" /> {group.shippingMethod}
                  </span>
                </div>

                <ul className="flex flex-col gap-3">
                  {group.lines.map((line) => (
                    <li key={line.cartItemId} className="flex items-center gap-3">
                      <img src={line.imageUrl} alt={line.productName} className="w-14 h-14 aspect-square object-cover rounded-lg border border-gray-200" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{line.productName}</p>
                        <p className="text-sm text-gray-500">
                          {line.variantName} · SKU {line.sku} · {formatVnd(line.unitPrice)} × {line.quantity}
                        </p>
                      </div>
                      <span className="font-semibold text-gray-900 whitespace-nowrap">{formatVnd(line.subtotal)}</span>
                    </li>
                  ))}
                </ul>

                <hr className="mss-divider" />
                <dl className="text-sm text-gray-700 flex flex-col gap-1">
                  <div className="flex justify-between">
                    <dt>Tạm tính</dt>
                    <dd>{formatVnd(group.subtotal)}</dd>
                  </div>
                  {group.appliedPromotions.map((promo) => (
                    <div key={promo.promotionId} className="flex justify-between gap-3 text-green-700">
                      <dt>Khuyến mãi: {promo.name}</dt>
                      <dd className="whitespace-nowrap">-{formatVnd(promo.discountAmount)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <dt>Phí vận chuyển</dt>
                    <dd>{group.shippingFee === 0 ? 'Miễn phí' : formatVnd(group.shippingFee)}</dd>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900">
                    <dt>Tổng đơn nhà bán</dt>
                    <dd>{formatVnd(group.totalAmount)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </section>
        </div>

        {/* Order summary */}
        <aside className="mss-card mss-stack lg:sticky lg:top-40">
          <h2 className="mss-card-title">Tóm tắt đơn hàng</h2>
          {preview ? (
            <dl className="text-sm text-gray-700 flex flex-col gap-2">
              <div className="flex justify-between">
                <dt>Tạm tính ({preview.groups.length} nhà bán)</dt>
                <dd>{formatVnd(preview.subtotal)}</dd>
              </div>
              {preview.discountTotal > 0 && (
                <div className="flex justify-between text-green-700">
                  <dt>Tổng giảm giá</dt>
                  <dd>-{formatVnd(preview.discountTotal)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt>Tổng phí vận chuyển</dt>
                <dd>{preview.shippingTotal === 0 ? 'Miễn phí' : formatVnd(preview.shippingTotal)}</dd>
              </div>
              <hr className="mss-divider" />
              <div className="flex justify-between items-baseline text-base font-bold text-gray-900">
                <dt>Tổng thanh toán</dt>
                <dd className="mss-price text-xl">{formatVnd(preview.grandTotal)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-500">{previewError ? 'Chưa có giá.' : 'Đang tính…'}</p>
          )}

          {submitError && <div className="mss-alert mss-alert--danger">{submitError}</div>}

          <button
            type="submit"
            disabled={!preview || !addressId || isSubmitting || isPreviewLoading}
            className="mss-button mss-button--primary mss-button--full"
          >
            {isSubmitting ? 'Đang đặt hàng…' : 'Xác nhận đặt hàng'}
          </button>
          <p className="text-sm text-gray-500">Giá cuối cùng do hệ thống xác nhận tại thời điểm đặt hàng.</p>
        </aside>
      </form>
    </div>
  );
}
