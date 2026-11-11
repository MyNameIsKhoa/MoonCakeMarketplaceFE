import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, CreditCard, MapPin, Store, Truck } from 'lucide-react';
import { Address, CheckoutPreview } from '../types';
import { addressApi, checkoutApi, type CheckoutPlaced } from '../services/api';
import type { CheckoutSelection } from '../services/api/commerceApi';
import { ApiError } from '../services/api/http';
import { checkoutAttemptExpired, loadCheckoutAttempt, saveCheckoutAttempt, type CheckoutAttempt } from '../services/api/checkoutAttempt';
import { openCustomerCheckout } from '../features/payment-settlement/openCheckout';
import { formatAddress, formatVnd } from '../utils/format';
import EmptyState from '../components/ui/EmptyState';

interface CheckoutProps {
  userId: string;
  selection: CheckoutSelection | null;
  onOrderPlaced: () => void;
  setActiveTab: (tab: string) => void;
}

export default function Checkout({ userId, selection, onOrderPlaced, setActiveTab }: CheckoutProps) {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [addressId, setAddressId] = useState('');
  const [recovery, setRecovery] = useState(() => loadCheckoutAttempt(userId));
  const submitting = useRef(false);
  const [addressError, setAddressError] = useState('');

  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [placedOrder, setPlacedOrder] = useState<CheckoutPlaced | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const payPlacedOrder = async () => {
    if (!placedOrder) return;
    setPaymentBusy(true); setPaymentError('');
    try { await openCustomerCheckout(placedOrder.orderId); }
    catch (error) { setPaymentError(error instanceof Error ? error.message : 'Không mở được PayOS.'); }
    finally { setPaymentBusy(false); }
  };

  useEffect(() => {
    addressApi.list().then((list) => {
      setAddresses(list);
      setAddressId((list.find((a) => a.isDefault) ?? list[0])?.addressId ?? '');
    }).catch((error: unknown) => setAddressError(error instanceof Error ? error.message : 'Không tải được địa chỉ.'));
  }, []);

  const loadPreview = useCallback((signal?: AbortSignal) => {
    if (!selection) return;
    setIsPreviewLoading(true);
    setPreviewError("");
    setPreview(null);
    checkoutApi.preview(selection, signal)
      .then(result => { if (!signal?.aborted) setPreview(result); })
      .catch((err: unknown) => {
        if (!signal?.aborted) setPreviewError(err instanceof Error ? err.message : "Không thể tính giá đơn hàng.");
      })
      .finally(() => { if (!signal?.aborted) setIsPreviewLoading(false); });
  }, [selection]);

  useEffect(() => {
    const controller = new AbortController();
    if (!recovery && !placedOrder) loadPreview(controller.signal);
    return () => controller.abort();
  }, [loadPreview, recovery, placedOrder]);
  const place = async (attempt: CheckoutAttempt) => {
    if (submitting.current || checkoutAttemptExpired(attempt)) return;
    submitting.current = true;
    setIsSubmitting(true);
    setSubmitError("");
    saveCheckoutAttempt(userId, attempt);
    try {
      const order = await checkoutApi.placeOrder(attempt.addressId, attempt.key, attempt.selection, attempt.quote);
      saveCheckoutAttempt(userId, null);
      setRecovery(null);
      setPlacedOrder(order);
      onOrderPlaced();
    } catch (err) {
      const uncertain = !(err instanceof ApiError) || err.status === 0 || err.status === 401 || err.status >= 500;
      setSubmitError(err instanceof Error ? err.message : "Chưa nhận được kết quả đặt hàng.");
      if (uncertain) {
        setRecovery(attempt);
      } else {
        saveCheckoutAttempt(userId, null);
        setRecovery(null);
        if (["CHECKOUT_QUOTE_CHANGED", "CHECKOUT_CART_CHANGED", "INSUFFICIENT_STOCK", "UNAVAILABLE"].includes(err.code)) loadPreview();
      }
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!addressId || !selection || !preview) return;
    void place({ addressId, selection, quote: preview.quote, key: crypto.randomUUID(), startedAt: Date.now() });
  };

  if (recovery) {
    const expired = checkoutAttemptExpired(recovery);
    return <div className="mss-container mss-page max-w-3xl">
      <section className="mss-card mss-stack">
        <h1 className="mss-page-title">Kiểm tra đơn vừa đặt</h1>
        <p>{expired ? "Đã hết thời gian gửi lại yêu cầu. Kiểm tra Đơn hàng để xem đơn đã được tạo chưa."
          : "Chưa xác nhận được kết quả đặt hàng. Bạn có thể gửi lại yêu cầu cũ để lấy kết quả."}</p>
        {submitError && <p role="alert" className="mss-alert mss-alert--warning">{submitError}</p>}
        <div className="flex flex-wrap gap-2">
          {!expired && <button type="button" disabled={isSubmitting} className="mss-button mss-button--primary"
            onClick={() => void place(recovery)}>{isSubmitting ? "Đang kiểm tra…" : "Kiểm tra lại đơn vừa đặt"}</button>}
          <button type="button" className="mss-button mss-button--secondary" onClick={() => {
            if (expired) saveCheckoutAttempt(userId, null);
            setActiveTab("orders");
          }}>Xem đơn hàng</button>
        </div>
      </section>
    </div>;
  }
  if (placedOrder) {
    return (
      <div className="mss-container mss-page max-w-3xl">
        <div className="mss-card flex flex-col items-center text-center gap-4">
          <CheckCircle2 className="w-12 h-12 text-green-700" />
          <h1 className="mss-page-title">Đã tạo đơn hàng</h1>
          <p className="text-base text-gray-700">
            Mã đơn hàng <strong>{placedOrder.orderNo}</strong> đã được tạo, gồm {placedOrder.sellerOrders.length} đơn nhà bán:
          </p>
          <ul className="text-sm text-gray-700 flex flex-col gap-1">
            {placedOrder.sellerOrders.map((so) => (
              <li key={so.sellerOrderId}>
                {so.sellerOrderNo} ({formatVnd(so.totalAmount)})
              </li>
            ))}
          </ul>
          <p className="text-base">
            Tổng thanh toán: <span className="mss-price">{formatVnd(placedOrder.grandTotal)}</span>
          </p>
          <p className="text-sm text-amber-800">Đơn đang chờ thanh toán PayOS; chưa có khoản nào được ghi nhận là đã trả.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button disabled={paymentBusy} onClick={() => void payPlacedOrder()} className="mss-button mss-button--primary">{paymentBusy ? 'Đang mở PayOS…' : 'Thanh toán tổng đơn'}</button>
            <button onClick={() => setActiveTab('orders')} className="mss-button mss-button--primary">
              Xem đơn hàng của tôi
            </button>
            <button onClick={() => setActiveTab('home')} className="mss-button mss-button--secondary">
              Về trang chủ
            </button>
          </div>
          {paymentError && <p role="alert" className="mss-alert mss-alert--danger">{paymentError}</p>}
        </div>
      </div>
    );
  }

  if (!selection) {
    return (
      <div className="mss-container mss-page">
        <EmptyState
          title="Chưa chọn sản phẩm để đặt hàng"
          description="Mở giỏ hàng và chọn những sản phẩm bạn muốn mua."
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
              <p className="text-sm text-gray-500">{addressError || 'Đang tải sổ địa chỉ…'}</p>
            ) : addresses.length === 0 ? (
              <div className="mss-alert mss-alert--warning">
                Bạn chưa có địa chỉ nào.{' '}
                <button type="button" className="mss-button mss-button--secondary mss-button--sm ml-2" onClick={() => setActiveTab('profile')}>
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
                      disabled={isSubmitting}
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
                <button type="button" className="mss-button mss-button--secondary mss-button--sm self-start" onClick={() => setActiveTab('profile')}>
                  Quản lý sổ địa chỉ
                </button>
              </div>
            )}
          </section>

          {/* TV5 creates a PayOS FULL obligation after stock is confirmed. */}
          <section className="mss-card mss-stack">
            <h2 className="mss-card-title flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary-700" /> Phương thức thanh toán
            </h2>
            <p className="text-sm text-gray-700">PayOS. Mỗi đơn nhà bán có một khoản thanh toán riêng sau khi giữ kho thành công.</p>
          </section>

          {/* Seller order groups from the backend preview */}
          <section className="mss-stack">
            <h2 className="mss-section-title">Đơn theo nhà bán</h2>
            {isPreviewLoading && !preview && <p className="text-sm text-gray-500">Đang tính giá đơn hàng…</p>}
            {previewError && (
              <div className="mss-alert mss-alert--danger flex flex-wrap items-center justify-between gap-3">
                <span>{previewError}</span>
                <button type="button" className="mss-button mss-button--secondary mss-button--sm" onClick={() => loadPreview()}>
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
                    {group.supplierName && <p className="mss-card-meta">Nhà cung cấp: {group.supplierName}</p>}
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
                          {line.variantName} · {formatVnd(line.unitPrice)} × {line.quantity}
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
                  {group.discountTotal > 0 && group.appliedPromotions.length === 0 && (
                    <div className="flex justify-between text-green-700"><dt>Giảm giá</dt><dd>-{formatVnd(group.discountTotal)}</dd></div>
                  )}
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
