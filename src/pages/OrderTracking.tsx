import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, MapPin, RefreshCw, Star, Store, Truck, Wallet } from 'lucide-react';
import { useStorefrontScroll } from '../utils/storefrontRoutes';
import type { CustomerOrderSummary } from '../services/api/commerceApi';
import { CustomerOrder, OrderItem, SellerOrder } from '../types';
import { orderApi } from '../services/api';
import { paymentApi } from '../features/payment-settlement/paymentApi';
import { endedPayment } from '../features/payment-settlement/paymentState';
import { openCustomerCheckout, openSellerCheckout } from '../features/payment-settlement/openCheckout';
import { formatAddress, formatDate, formatDateTime, formatVnd, parseApiDate } from '../utils/format';
import {
  CANCELLATION_STATUS,
  ORDER_SOURCE,
  ORDER_STATUS,
  PAYMENT_PROVIDER,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  SHIPMENT_STATUS,
  getStatusMeta
} from '../utils/status';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import { fulfillmentApi } from '../features/fulfillment/api/fulfillmentApi';
import { ReviewModal } from '../features/fulfillment/components/ReviewModal';
import { ShipmentLineList } from '../features/fulfillment/components/ShipmentLineList';
import { useShipmentLines } from '../features/fulfillment/useShipmentLines';
import { ApiError } from '../services/api/http';
import DisputePanel from '../features/payment-settlement/DisputePanel';

interface OrderTrackingProps {
  orderId?: string;
  setActiveTab: (tab: string) => void;
  paymentReturnOrderId: string | null;
  paymentReturnSellerPaymentId: string | null;
  onPaymentReturnHandled: () => void;
}

type FilterId = 'all' | 'active' | 'done' | 'cancelled';

const FILTERS: { id: FilterId; label: string; statuses?: string[] }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'active', label: 'Đang xử lý', statuses: ['PENDING_STOCK', 'AWAITING_PAYMENT', 'AWAITING_DEPOSIT', 'READY_FOR_FULFILLMENT', 'PAYMENT_COMPLETED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'PROCESSING', 'PREPARING', 'SHIPPING'] },
  { id: 'done', label: 'Đã giao / Hoàn tất', statuses: ['DELIVERED', 'ACCEPTED', 'SETTLED', 'COMPLETED'] },
  { id: 'cancelled', label: 'Hủy / Khiếu nại', statuses: ['CANCEL_REQUESTED', 'CANCELLED', 'DISPUTED'] }
];

function isFullyPaid(sellerOrder: SellerOrder) {
  return sellerOrder.status !== 'CANCELLED' &&
    sellerOrder.payments.length > 0 &&
    sellerOrder.payments.every((payment) => ['SUCCESS', 'PAID'].includes(payment.status));
}

function isRemainingOverdue(so: SellerOrder) {
  if (!so.remainingDueAt || so.status === 'CANCELLED') return false;
  const due = parseApiDate(so.remainingDueAt);
  const remainingPaid = so.payments.some((p) => p.paymentType === 'REMAINING' && ['SUCCESS', 'PAID'].includes(p.status));
  return !!due && due.getTime() < Date.now() && !remainingPaid;
}

export default function OrderTracking({ orderId, setActiveTab, paymentReturnOrderId, paymentReturnSellerPaymentId, onPaymentReturnHandled }: OrderTrackingProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [orders, setOrders] = useState<CustomerOrderSummary[] | null>(null);
  const [detail, setDetail] = useState<CustomerOrder | null>(null);
  const [loadedRoute, setLoadedRoute] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const currentOrderId = useRef(orderId);
  currentOrderId.current = orderId;
  const [loadError, setLoadError] = useState('');
  const [paymentNotice, setPaymentNotice] = useState<{ message: string; success: boolean; title?: string } | null>(null);
  const filterValue = new URLSearchParams(location.search).get('filter');
  const filter: FilterId = FILTERS.some(f => f.id === filterValue) ? filterValue as FilterId : 'all';
  const [reviewedItemMap, setReviewedItemMap] = useState<Record<string, { rating: number; comment?: string }>>({});
  const [reviewingItem, setReviewingItem] = useState<OrderItem | null>(null);

  useStorefrontScroll(location, navigationType, loadedRoute === (orderId ?? 'list'));
  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoadError('');
    setLoadedRoute(null);
    try {
      if (orderId) {
        const order = await orderApi.get(orderId);
        if (sequence === requestSequence.current) setDetail(order);
      } else {
        const list = await orderApi.summaries();
        if (sequence === requestSequence.current) setOrders(list);
      }
    } catch (error) {
      if (sequence === requestSequence.current) setLoadError(error instanceof ApiError && error.status === 404
        ? 'Không tìm thấy đơn hàng hoặc bạn không có quyền xem đơn này.'
        : 'Không tải được đơn hàng. Vui lòng thử lại.');
    } finally {
      if (sequence === requestSequence.current) setLoadedRoute(orderId ?? 'list');
    }
    if (!orderId || sequence !== requestSequence.current) return;
    fulfillmentApi
      .getMyReviews()
      .then((reviews: Array<{ orderItemId?: number | string; rating?: number; comment?: string }>) => {
        if (sequence === requestSequence.current && Array.isArray(reviews)) {
          const map: Record<string, { rating: number; comment?: string }> = {};
          reviews.forEach((r) => {
            if (r.orderItemId) {
              map[String(r.orderItemId)] = { rating: r.rating || 5, comment: r.comment };
            }
          });
          setReviewedItemMap(map);
        }
      })
      .catch(() => {
        // Ignored if user has no reviews or not authenticated
      });
  }, [orderId]);

  useEffect(() => { void load(); return () => { requestSequence.current++; }; }, [load]);

  useEffect(() => {
    if (!paymentReturnOrderId) return;
    let active = true;
    const orderId = Number(paymentReturnOrderId);
    paymentApi.reconcileCustomer(orderId).then(async (payment) => {
      if (!active) return;
      const success = payment.payment?.status === 'SUCCESS' &&
        payment.paidAmount >= payment.totalAmount;
      setPaymentNotice({
        success,
        message: success
          ? `Thanh toán thành công! Đơn hàng #${orderId} đã được đặt thành công.`
          : `Đã quay lại từ PayOS nhưng thanh toán đơn #${orderId} chưa được xác nhận. Vui lòng tải lại trạng thái đơn hàng sau ít phút.`
      });
      await load();
      onPaymentReturnHandled();
    }).catch((error: unknown) => {
      if (!active) return;
      setPaymentNotice({
        success: false,
        message: error instanceof Error
          ? `Không thể xác nhận thanh toán: ${error.message}`
          : 'Không thể xác nhận thanh toán. Vui lòng thử tải lại đơn hàng.'
      });
      onPaymentReturnHandled();
    });
    return () => { active = false; };
  }, [paymentReturnOrderId, load, onPaymentReturnHandled]);

  useEffect(() => {
    if (!paymentReturnSellerPaymentId) return;
    let active = true;
    const paymentId = Number(paymentReturnSellerPaymentId);
    paymentApi.reconcile(paymentId).then(async (payment) => {
      if (!active) return;
      const success = payment.status === 'SUCCESS';
      setPaymentNotice({
        success,
        message: success
          ? `${payment.paymentType === 'DEPOSIT' ? 'Đã ghi nhận tiền cọc' : 'Đã ghi nhận thanh toán'} ${formatVnd(payment.amount)} cho đơn nhà bán #${payment.sellerOrderId}.`
          : 'PayOS chưa xác nhận khoản thanh toán này. Nếu đã chuyển tiền, vui lòng đợi và bấm Tải lại; không thanh toán thêm.'
      });
      load();
      onPaymentReturnHandled();
    }).catch((error: unknown) => {
      if (!active) return;
      setPaymentNotice({
        success: false,
        message: error instanceof Error
          ? `Chưa đối soát được khoản thanh toán: ${error.message}. Nếu đã chuyển tiền, không thanh toán thêm.`
          : 'Chưa đối soát được khoản thanh toán. Nếu đã chuyển tiền, không thanh toán thêm.'
      });
      load();
      onPaymentReturnHandled();
    });
    return () => { active = false; };
  }, [paymentReturnSellerPaymentId, load, onPaymentReturnHandled]);

  const replaceOrder = (updated: CustomerOrder) => {
    if (updated.orderId === currentOrderId.current) setDetail(updated);
  };

  const activeFilter = FILTERS.find((f) => f.id === filter)!;
  const visibleOrders =
    orders?.filter(
      (o) => !activeFilter.statuses || (o.sellerOrderStatuses ?? [o.status]).some(status =>
        activeFilter.statuses!.includes(status)) || (filter === 'cancelled' && o.hasCancellation)
    ) ?? [];

  return (
    <div className="mss-container mss-page">
      <header className="mss-page-header">
        <div>
          {orderId && <button type="button" className="mss-button mss-button--secondary mss-button--sm mb-4"
            onClick={() => location.state?.ordersFrom ? navigate(-1) : navigate('/orders')}>
            <ArrowLeft className="h-4 w-4" /> Quay lại danh sách đơn hàng
          </button>}
          <h1 className="mss-page-title">{orderId ? 'Chi tiết đơn hàng' : 'Đơn hàng của tôi'}</h1>
          <p className="mss-page-description">
            Mỗi đơn hàng gồm một hoặc nhiều đơn nhà bán; thanh toán, vận chuyển và hủy được xử lý theo từng đơn nhà bán.
          </p>
        </div>
      </header>

      {paymentNotice && !paymentNotice.success && <p role="alert" className="mss-card text-amber-800">
        {paymentNotice.message}
      </p>}

      {paymentNotice?.success && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-success-title"
            aria-describedby="payment-success-message"
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-7 pb-6 pt-8 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50">
                <CheckCircle2 className="h-11 w-11 text-emerald-600" aria-hidden="true" />
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">MooncakeHub</p>
              <h2 id="payment-success-title" className="text-2xl font-bold text-gray-900">
                {paymentNotice.title ?? 'Thanh toán thành công!'}
              </h2>
              <p id="payment-success-message" className="mt-3 leading-6 text-gray-600">
                {paymentNotice.message}
              </p>
            </div>
            <div className="border-t border-gray-100 px-7 py-5">
              <button
                type="button"
                autoFocus
                className="mss-button mss-button--primary mss-button--full"
                onClick={() => setPaymentNotice(null)}
              >
                OK, xem đơn hàng
              </button>
            </div>
          </section>
        </div>
      )}

      {!orderId && <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => navigate(f.id === 'all' ? '/orders' : '/orders?filter=' + f.id, { replace: true })}
            className={`mss-button mss-button--sm whitespace-nowrap ${filter === f.id ? 'mss-button--primary' : 'mss-button--secondary'}`}
          >
            {f.label}
          </button>
        ))}
      </div>}

      {loadError ? (
        <div className="mss-alert mss-alert--danger flex flex-wrap items-center justify-between gap-3">
          <span>{loadError}</span>
          <button className="mss-button mss-button--secondary mss-button--sm" onClick={load}>
            Thử lại
          </button>
        </div>
      ) : loadedRoute !== (orderId ?? 'list') ? (
        <p className="text-sm text-gray-500">Đang tải đơn hàng…</p>
      ) : orderId && detail ? (
        <OrderCard order={detail} onUpdated={replaceOrder} reviewedItemMap={reviewedItemMap}
          onOpenReview={setReviewingItem} />
      ) : visibleOrders.length === 0 ? (
        <EmptyState
          title="Không có đơn hàng nào"
          description="Chưa có đơn hàng ở trạng thái này."
          action={
            <button onClick={() => setActiveTab('products')} className="mss-button mss-button--primary">
              Mua sắm ngay
            </button>
          }
        />
      ) : (
        <div className="mss-stack">
          {visibleOrders.map((order) => (
            <article key={order.orderId} className="mss-card flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="mss-card-title break-words">Đơn {order.orderNo}</h2>
                <p className="mss-card-meta">{formatDateTime(order.placedAt)}
                  {order.sellerOrderCount != null && <> · {order.sellerOrderCount} nhà bán · {order.itemCount} sản phẩm</>}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge map={ORDER_STATUS} status={order.status} />
                  <StatusBadge map={ORDER_SOURCE} status={order.sourceType} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-right"><p className="text-sm text-gray-500">Tổng thanh toán</p>
                  <p className="mss-price text-lg">{formatVnd(order.grandTotal)}</p></div>
                <button type="button" className="mss-button mss-button--secondary" onClick={() =>
                  navigate('/orders/' + order.orderId, { state: { ordersFrom: location.pathname + location.search } })}>
                  Xem chi tiết <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {reviewingItem && (
        <ReviewModal
          orderItem={reviewingItem}
          isOpen={Boolean(reviewingItem)}
          onClose={() => setReviewingItem(null)}
          onReviewed={(review: { orderItemId?: number | string; rating?: number; comment?: string }) => {
            if (review && review.orderItemId) {
              setReviewedItemMap((prev) => ({
                ...prev,
                [String(review.orderItemId)]: { rating: review.rating || 5, comment: review.comment }
              }));
            }
            setPaymentNotice({
              success: true,
              title: 'Đã gửi đánh giá',
              message: `Đã gửi đánh giá cho "${reviewingItem.productNameSnapshot}" thành công! Cảm ơn bạn đã phản hồi.`
            });
            setReviewingItem(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

const PAY_LABEL: Record<string, string> = {
  FULL: 'Thanh toán',
  DEPOSIT: 'Thanh toán tiền cọc',
  REMAINING: 'Thanh toán phần còn lại'
};

/** First unpaid obligation of a seller order, in the order PayOS checkout takes them (see openSellerCheckout). */
function nextDuePayment(so: SellerOrder) {
  if (so.cancellation) return undefined;
  for (const type of ['FULL', 'DEPOSIT', 'REMAINING']) {
    const rows = so.payments.filter((p) => p.paymentType === type);
    if (rows.length > 0 && !rows.some((p) => p.status === 'SUCCESS')) return rows[0];
  }
  return undefined;
}

interface OrderCardProps {
  order: CustomerOrder;
  onUpdated: (order: CustomerOrder) => void;
  reviewedItemMap: Record<string, { rating: number; comment?: string }>;
  onOpenReview: (item: OrderItem) => void;
}

function OrderCard({ order, onUpdated, reviewedItemMap, onOpenReview }: OrderCardProps) {
  const itemCount = order.sellerOrders.reduce((sum, so) => sum + so.items.length, 0);
  const canPayTogether = order.sourceType === 'RETAIL' &&
    !['CANCEL_REQUESTED', 'CANCELLED'].includes(order.status) &&
    order.sellerOrders.every(so => !so.cancellation) &&
    order.sellerOrders.some(so => so.payments.some(payment => payment.status !== 'SUCCESS'));
  // An RFQ order waits for its deposit (or full payment at 0% deposit) instead of seller confirmation.
  const unpaidStatuses = order.sourceType === 'RFQ'
    ? ['AWAITING_DEPOSIT', 'AWAITING_PAYMENT']
    : ['AWAITING_PAYMENT', 'PENDING_CONFIRMATION'];
  const canCancelUnpaid = order.status !== 'CANCELLED' &&
    order.sellerOrders.length > 0 &&
    order.sellerOrders.every((so) =>
      unpaidStatuses.includes(so.status) &&
      so.payments.every((payment) => !['SUCCESS', 'PAID'].includes(payment.status)));
  const awaitingRfqDeposit = order.sourceType === 'RFQ' && canCancelUnpaid;
  // RFQ orders are paid per seller order; surface the next due payment on the card, not only inside the details.
  const rfqDue = order.sourceType === 'RFQ' && !['CANCEL_REQUESTED', 'CANCELLED'].includes(order.status)
    ? order.sellerOrders.map((so) => ({ so, payment: nextDuePayment(so) })).find((entry) => entry.payment)
    : undefined;
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const pay = async () => {
    setPaymentBusy(true);
    setPaymentError('');
    try { await openCustomerCheckout(Number(order.orderId)); }
    catch (error) { setPaymentError(error instanceof Error ? error.message : 'Không mở được PayOS.'); }
    finally { setPaymentBusy(false); }
  };

  const payRfq = async (sellerOrderId: string) => {
    setPaymentBusy(true);
    setPaymentError('');
    try { await openSellerCheckout(Number(sellerOrderId)); }
    catch (error) { setPaymentError(error instanceof Error ? error.message : 'Không mở được PayOS.'); }
    finally { setPaymentBusy(false); }
  };

  const cancelUnpaidOrder = async () => {
    setIsCancelling(true);
    setCancelError('');
    try {
      onUpdated(await orderApi.cancelUnpaidCustomerOrder(order.orderId, 'Khách hàng hủy đơn chưa thanh toán.'));
    } catch (error) {
      setCancelError(error instanceof ApiError && error.code === 'STOCK_RESERVATION_RECONCILIATION_REQUIRED'
        ? 'Đơn cũ thiếu thông tin giữ kho. Vui lòng liên hệ quản trị để đối soát tồn kho trước khi hủy.'
        : error instanceof Error ? error.message : 'Không thể hủy đơn hàng.');
    } finally {
      setIsCancelling(false);
    }
  };
  const cancellationPending = order.sellerOrders.some(so => so.cancellation?.status === 'REQUESTED');
  const displayStatus = cancellationPending ? 'CANCEL_REQUESTED' : order.sellerOrders.length > 0 && order.sellerOrders.every(isFullyPaid)
    ? 'PAYMENT_COMPLETED'
    : order.status;

  return (
    <article className="mss-card mss-stack">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mss-card-title">Đơn {order.orderNo}</h2>
            <StatusBadge map={ORDER_STATUS} status={displayStatus} />
            <StatusBadge map={ORDER_SOURCE} status={order.sourceType} />
          </div>
          <p className="mss-card-meta">
            Đặt lúc {formatDateTime(order.placedAt)} · {order.sellerOrders.length} nhà bán · {itemCount} sản phẩm
            {order.rfqIdRef && <> · RFQ {order.rfqIdRef}</>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Tổng thanh toán</p>
          <p className="mss-price text-lg">{formatVnd(order.grandTotal)}</p>
          <div className="flex flex-wrap justify-end gap-2">
            {rfqDue?.payment && <button
              type="button"
              disabled={paymentBusy}
              className="mss-button mss-button--primary mt-2"
              onClick={() => void payRfq(rfqDue.so.sellerOrderId)}
            >
              <Wallet className="w-4 h-4" />
              {paymentBusy ? 'Đang mở PayOS…'
                : `${PAY_LABEL[rfqDue.payment.paymentType] ?? 'Thanh toán'} ${formatVnd(rfqDue.payment.amount)}`}
            </button>}
            {canCancelUnpaid && <button
              type="button"
              disabled={isCancelling}
              className="mss-button mss-button--danger mss-button--sm mt-2"
              onClick={() => void cancelUnpaidOrder()}
            >
              {isCancelling ? 'Đang hủy…' : 'Hủy ngay (chưa thanh toán)'}
            </button>}
          </div>
          {awaitingRfqDeposit && (
            <p className="m-0 mt-2 text-xs text-gray-600">Đơn từ báo giá chưa thanh toán sẽ tự hủy sau 48 giờ kể từ lúc đặt.</p>
          )}
          {canPayTogether && <button disabled={paymentBusy} className="mss-button mss-button--primary mss-button--sm mt-2" onClick={() => void pay()}>{paymentBusy ? 'Đang mở PayOS…' : 'Thanh toán tổng đơn'}</button>}
        </div>
      </div>

      {cancelError && <div role="alert" className="mss-alert mss-alert--danger">{cancelError}</div>}
      {paymentError && <div role="alert" className="mss-alert mss-alert--danger">{paymentError}</div>}

      {(
        <div className="mss-stack animate-fadeIn">
          <section className="rounded-xl bg-gray-50 p-4 flex gap-3">
            <MapPin className="w-5 h-5 text-primary-700 shrink-0 mt-1" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">Địa chỉ nhận hàng (lưu tại thời điểm đặt)</p>
              <p className="text-base text-gray-900">
                {order.deliveryAddress.recipientName} · {order.deliveryAddress.recipientPhone}
              </p>
              <p className="text-sm text-gray-600">{formatAddress(order.deliveryAddress)}</p>
            </div>
          </section>

          {order.sellerOrders.map((so) => (
            <SellerOrderSection
              key={so.sellerOrderId}
              orderId={order.orderId}
              retail={order.sourceType === 'RETAIL'}
              sellerOrder={so}
              onUpdated={onUpdated}
              immediateCancellationAvailable={canCancelUnpaid}
              reviewedItemMap={reviewedItemMap}
              onOpenReview={onOpenReview}
            />
          ))}

          <dl className="text-sm text-gray-700 flex flex-col gap-1 self-end w-full sm:max-w-sm">
            <div className="flex justify-between">
              <dt>Tạm tính</dt>
              <dd>{formatVnd(order.subtotal)}</dd>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-green-700">
                <dt>Giảm giá</dt>
                <dd>-{formatVnd(order.discountTotal)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Phí vận chuyển</dt>
              <dd>{order.shippingTotal === 0 ? 'Miễn phí' : formatVnd(order.shippingTotal)}</dd>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
              <dt>Tổng đơn hàng</dt>
              <dd className="mss-price">{formatVnd(order.grandTotal)}</dd>
            </div>
          </dl>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------

interface SellerOrderSectionProps {
  orderId: string;
  retail: boolean;
  sellerOrder: SellerOrder;
  onUpdated: (order: CustomerOrder) => void;
  immediateCancellationAvailable: boolean;
  reviewedItemMap: Record<string, { rating: number; comment?: string }>;
  onOpenReview: (item: OrderItem) => void;
}

function SellerOrderSection({
  orderId,
  retail,
  sellerOrder: so,
  onUpdated,
  immediateCancellationAvailable,
  reviewedItemMap,
  onOpenReview
}: SellerOrderSectionProps) {
  const [showCancel, setShowCancel] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(false);
  // Which items each shipment carries (reloaded whenever the shipment list or a status changes).
  const shipmentLines = useShipmentLines(so.sellerOrderId, so.shipments.map((s) => `${s.shipmentId}:${s.status}`).join(','));

  const paySeller = async () => {
    setPaymentBusy(true); setActionError(''); setPaymentMessage('');
    try { await openSellerCheckout(Number(so.sellerOrderId), orderId); }
    catch (error) {
      setActionError(error instanceof Error ? error.message : 'Không mở được PayOS.');
      try { onUpdated(await orderApi.get(orderId)); } catch { /* Keep the payment error visible. */ }
    }
    finally { setPaymentBusy(false); }
  };

  const reconcileSeller = async (paymentId?: number, cancel = false) => {
    setPaymentBusy(true); setActionError(''); setPaymentMessage('');
    try {
      const summary = await paymentApi.summary(Number(so.sellerOrderId));
      const payment = summary.payments.find(p => p.status !== 'SUCCESS' && !endedPayment(p.status) &&
        (paymentId == null ? p.checkoutUrl || p.expiresAt : p.paymentId === paymentId));
      if (!payment) {
        setPaymentMessage('Không còn link PayOS cần đối soát.');
      } else {
        const result = cancel ? await paymentApi.cancelLink(payment.paymentId) : await paymentApi.reconcile(payment.paymentId);
        setPaymentMessage(result.status === 'SUCCESS'
          ? `${result.paymentType === 'DEPOSIT' ? 'Đã ghi nhận tiền cọc' : 'Đã ghi nhận thanh toán'} ${formatVnd(result.amount)}.`
          : result.status === 'CANCELLED' ? 'Đã hủy liên kết thanh toán.'
            : 'PayOS chưa xác nhận thanh toán. Nếu đã chuyển tiền, vui lòng kiểm tra lại trạng thái trước khi thanh toán tiếp.');
      }
      onUpdated(await orderApi.get(orderId));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Chưa đối soát được PayOS.');
    } finally { setPaymentBusy(false); }
  };

  const canPayRfq = !retail && ['AWAITING_PAYMENT', 'AWAITING_DEPOSIT', 'PREPARING', 'READY_FOR_FULFILLMENT', 'CONFIRMED'].includes(so.status)
    && (!so.cancellation || so.cancellation.status === 'REJECTED') && !isRemainingOverdue(so)
    && !isFullyPaid(so) && so.payments.some(p => !['SUCCESS', 'PAID', 'REFUNDED'].includes(p.status));
  const canCancel = so.allowedActions.includes('CANCEL');
  const duePayment = nextDuePayment(so);
  const displayStatus = so.status === 'AWAITING_PAYMENT' && isFullyPaid(so) ? 'PAYMENT_COMPLETED' : so.status;

  const run = async (action: () => Promise<CustomerOrder>) => {
    setBusy(true);
    setActionError('');
    try {
      onUpdated(await action());
      setShowCancel(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Thao tác thất bại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border border-gray-200 rounded-xl p-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Store className="w-4 h-4 text-primary-700 shrink-0" /> {so.storeNameSnapshot}
          </h3>
          <p className="text-sm text-gray-500">
            Nhà cung cấp: {so.supplierNameSnapshot} · Đơn nhà bán {so.sellerOrderNo}
            {so.quotationIdRef && <> · Báo giá {so.quotationIdRef}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge map={ORDER_STATUS} status={displayStatus} />
          {canPayRfq &&
            <button type="button" disabled={paymentBusy} className="mss-button mss-button--primary mss-button--sm" onClick={() => void paySeller()}>
              <Wallet className="w-4 h-4" />
              {paymentBusy ? 'Đang mở PayOS…' : duePayment
                ? `${PAY_LABEL[duePayment.paymentType] ?? 'Thanh toán'} ${formatVnd(duePayment.amount)}`
                : 'Thanh toán PayOS'}
            </button>}
          {canPayRfq &&
            <button type="button" disabled={paymentBusy} className="mss-button mss-button--secondary mss-button--sm" onClick={() => void reconcileSeller()}>
              <RefreshCw className="w-4 h-4" />
              Đối soát PayOS
            </button>}
          {canCancel && !immediateCancellationAvailable && !showCancel &&
            <button type="button" className="mss-button mss-button--danger mss-button--sm"
              onClick={() => { setActionError(''); setCancelReason('Tôi thay đổi ý định mua hàng.'); setShowCancel(true); }}>
              Yêu cầu hủy đơn
            </button>}
        </div>
      </div>

      {showCancel && canCancel && (
        <form
          className="mss-field rounded-xl border border-red-200 bg-red-50 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => orderApi.requestCancellation(orderId, so.sellerOrderId, cancelReason.trim()));
          }}
        >
          <label className="mss-label" htmlFor={`reason-${so.sellerOrderId}`}>
            Lý do hủy đơn {so.sellerOrderNo}
          </label>
          <textarea
            id={`reason-${so.sellerOrderId}`}
            className="mss-textarea"
            required
            maxLength={500}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          {['PREPARING', 'SHIPPING'].includes(so.status) && (so.depositAmount ?? 0) > 0 && (
            <p role="alert" className="mss-alert mss-alert--danger m-0 text-sm">
              Nhà bán đã bắt đầu chuẩn bị hàng: nếu hủy, tiền cọc {formatVnd(so.depositAmount ?? 0)} thuộc về nhà bán,
              bạn chỉ được hoàn phần đã trả thêm.
            </p>
          )}
          <p className="text-sm text-gray-600">Yêu cầu sẽ được xét duyệt; đơn chưa hủy ngay khi gửi.</p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy || !cancelReason.trim()} className="mss-button mss-button--danger mss-button--sm">
              {busy ? 'Đang gửi…' : 'Gửi yêu cầu hủy'}
            </button>
            <button type="button" disabled={busy} onClick={() => setShowCancel(false)} className="mss-button mss-button--secondary mss-button--sm">
              Đóng
            </button>
          </div>
        </form>
      )}
      {actionError && <div className="mss-alert mss-alert--danger">{actionError}</div>}
      {paymentMessage && <p role="status" className="text-sm text-primary-700">{paymentMessage}</p>}

      {(so.deliveryDateSnapshot || so.shippingMethodSnapshot) && (
        <p className="text-sm text-gray-700 flex flex-wrap items-center gap-x-4 gap-y-1">
          {so.shippingMethodSnapshot && (
            <span className="flex items-center gap-1">
              <Truck className="w-4 h-4" /> {so.shippingMethodSnapshot}
            </span>
          )}
          {so.deliveryDateSnapshot && <span>Ngày giao đã chốt: {formatDate(so.deliveryDateSnapshot)}</span>}
        </p>
      )}

      {/* Items: snapshot fields only */}
      <div className="mss-table-scroll">
        <table className="mss-table">
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Đơn giá</th>
              <th>SL</th>
              <th>Giảm</th>
              <th className="text-right">Thành tiền</th>
              {['DELIVERED', 'ACCEPTED', 'SETTLED'].includes(so.status) && (
                <th className="text-center">Đánh giá</th>
              )}
            </tr>
          </thead>
          <tbody>
            {so.items.map((item) => {
              const review = reviewedItemMap[item.orderItemId];
              const canReview = ['DELIVERED', 'ACCEPTED', 'SETTLED'].includes(so.status);
              return (
                <tr key={item.orderItemId}>
                  <td>
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <img
                        src={item.imageUrlSnapshot || item.imageUrl || '/images/placeholders/custom-order.svg'}
                        onError={event => {
                          const fallback = '/images/placeholders/custom-order.svg';
                          if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback;
                        }}
                        alt={item.productNameSnapshot}
                        className="w-12 h-12 aspect-square object-cover rounded-lg border border-gray-200"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{item.productNameSnapshot}</p>
                        <p className="text-xs text-gray-500">
                          {item.variantNameSnapshot}
                          {item.skuSnapshot && !/^DEMO-/i.test(item.skuSnapshot) && <> · SKU {item.skuSnapshot}</>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap">{formatVnd(item.unitPrice)}</td>
                  <td>{item.quantity}</td>
                  <td className="whitespace-nowrap">{item.discountAmount > 0 ? `-${formatVnd(item.discountAmount)}` : '—'}</td>
                  <td className="text-right whitespace-nowrap font-semibold">{formatVnd(item.subtotal)}</td>
                  {canReview && (
                    <td className="text-center whitespace-nowrap">
                      {review ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-medium border border-green-200"
                          title={review.comment || 'Đã đánh giá'}
                        >
                          <span className="text-amber-500">{'★'.repeat(review.rating)}</span>
                          <span>Đã đánh giá</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 font-medium transition-colors"
                          onClick={() => onOpenReview(item)}
                        >
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          Đánh giá
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <dl className="text-sm text-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
        <div className="flex justify-between">
          <dt>Tạm tính</dt>
          <dd>{formatVnd(so.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Phí vận chuyển</dt>
          <dd>{so.shippingFee === 0 ? 'Miễn phí' : formatVnd(so.shippingFee)}</dd>
        </div>
        {so.discountTotal > 0 && (
          <div className="flex justify-between text-green-700">
            <dt>Khuyến mãi</dt>
            <dd>-{formatVnd(so.discountTotal)}</dd>
          </div>
        )}
        <div className="flex justify-between font-semibold text-gray-900">
          <dt>Tổng đơn nhà bán</dt>
          <dd>{formatVnd(so.totalAmount)}</dd>
        </div>
        {so.depositAmount !== undefined && (
          <>
            <div className="flex justify-between">
              <dt>Tiền cọc ({so.depositPercent}%)</dt>
              <dd>{formatVnd(so.depositAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Còn lại (hạn {formatDate(so.remainingDueAt)})</dt>
              <dd>{formatVnd(so.remainingAmount)}</dd>
            </div>
          </>
        )}
      </dl>
      {(so.depositAmount ?? 0) > 0 && so.status !== 'CANCELLED' && (
        <p className="m-0 text-xs text-gray-500">
          Quá hạn mà chưa trả phần còn lại thì đơn tự hủy và tiền cọc thuộc về nhà bán.
          Nếu bạn hủy sau khi nhà bán đã bắt đầu chuẩn bị hàng, tiền cọc cũng thuộc về nhà bán.
        </p>
      )}
      {isRemainingOverdue(so) && (
        <p role="alert" className="mss-alert mss-alert--danger m-0 text-sm">
          Đã quá hạn thanh toán phần còn lại. Đơn sẽ được hệ thống tự hủy và tiền cọc thuộc về nhà bán.
        </p>
      )}

      {/* Payments */}
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary-700" /> Thanh toán
        </h4>
        <div className="mss-table-scroll">
          <table className="mss-table">
            <thead>
              <tr>
                <th>Khoản</th>
                <th>Số tiền</th>
                <th>Hạn</th>
                <th>Phương thức</th>
                <th>Trạng thái</th>
                <th>Mã giao dịch</th>
              </tr>
            </thead>
            <tbody>
              {so.payments.map((p) => (
                <tr key={p.paymentId}>
                  <td className="whitespace-nowrap">{getStatusMeta(PAYMENT_TYPE, p.paymentType).label}</td>
                  <td className="whitespace-nowrap font-semibold">{formatVnd(p.amount)}</td>
                  <td className="whitespace-nowrap">{p.dueAt ? formatDateTime(p.dueAt) : '—'}</td>
                  <td>{p.provider ? getStatusMeta(PAYMENT_PROVIDER, p.provider).label : '—'}</td>
                  <td>
                    <StatusBadge map={PAYMENT_STATUS} status={p.status} />
                    {p.paidAt && <p className="text-xs text-gray-500 mt-1">{formatDateTime(p.paidAt)}</p>}
                  </td>
                  <td className="text-gray-600">
                    {p.transactionRef ?? '—'}
                    {!retail && p.hasPayosLink && !['SUCCESS', 'PAID', 'REFUNDED'].includes(p.status) && !endedPayment(p.status) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" className="text-primary-700 underline" disabled={paymentBusy}
                          onClick={() => void reconcileSeller(Number(p.paymentId))}>Kiểm tra trạng thái</button>
                        <button type="button" className="text-primary-700 underline" disabled={paymentBusy}
                          onClick={() => {
                            if (window.confirm('Hủy liên kết PayOS của giao dịch này?')) void reconcileSeller(Number(p.paymentId), true);
                          }}>Hủy liên kết</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shipments */}
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Truck className="w-4 h-4 text-primary-700" /> Vận chuyển
        </h4>
        {so.shipments.length === 0 ? (
          <p className="text-sm text-gray-500">Nhà bán chưa tạo vận đơn.</p>
        ) : (
          so.shipments.map((s) => (
            <div key={s.shipmentId} className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 flex flex-col gap-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-gray-900">
                  {s.provider ?? s.shippingMethod}
                  {s.trackingCode && <> · Mã vận đơn {s.trackingCode}</>}
                </span>
                <StatusBadge map={SHIPMENT_STATUS} status={s.status} />
              </div>
              <span>
                {s.shippedAt && <>Gửi hàng: {formatDateTime(s.shippedAt)} · </>}
                {s.deliveredAt
                  ? `Đã giao: ${formatDateTime(s.deliveredAt)}`
                  : `Dự kiến giao: ${formatDateTime(s.expectedDeliveryAt)}`}
              </span>
              <ShipmentLineList lines={shipmentLines[s.shipmentId]} />
            </div>
          ))
        )}
        {so.status === 'DELIVERED' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-amber-50/80 border border-amber-200 rounded-lg">
            <div className="text-sm text-amber-900">
              <span className="font-semibold">Bánh đã giao đến bạn.</span> Vui lòng kiểm tra kỹ bao bì, số lượng và chất lượng bánh trước khi bấm xác nhận.
            </div>
            <button
              type="button"
              className="mss-button mss-button--primary whitespace-nowrap shrink-0"
              disabled={busy}
              onClick={() => {
                if (!window.confirm('Xác nhận bạn đã nhận và kiểm tra hàng? Sàn chi trả cho nhà bán khi hết hạn khiếu nại và đơn đủ điều kiện.')) return;
                void run(async () => {
                  await fulfillmentApi.acceptSellerOrder(so.sellerOrderId);
                  return orderApi.get(orderId);
                });
              }}
            >
              Xác nhận đã nhận hàng
            </button>
          </div>
        )}
        {(so.status === 'ACCEPTED' || so.status === 'SETTLED') && (
          <div className="flex items-center gap-2 text-sm text-green-800 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span>Bạn đã xác nhận nhận hàng. Bạn có thể đánh giá từng món bánh ở bảng bên trên.</span>
          </div>
        )}
      </div>

      {so.cancellation && (
        <div className="mss-alert mss-alert--warning flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <strong>Yêu cầu hủy</strong>
            <StatusBadge map={CANCELLATION_STATUS} status={so.cancellation.status} />
          </span>
          <span>Lý do: {so.cancellation.reason}</span>
          <span>
            {so.cancellation.refundPercent !== undefined
              ? `Tỷ lệ hoàn tiền: ${so.cancellation.refundPercent}%`
              : 'Số tiền hoàn sẽ được hệ thống xác định theo chính sách hủy.'}
          </span>
          {so.cancellation.status === 'REQUESTED' &&
            <span>Đơn đang chờ xét duyệt. Nếu đã có link PayOS, vui lòng không tiếp tục thanh toán.</span>}
        </div>
      )}

      {so.payments.some(p => ['SUCCESS', 'PAID'].includes(p.status)) && (
        <div className="space-y-3">
          <button
            type="button"
            className="mss-button mss-button--secondary mss-button--sm"
            aria-expanded={showDispute}
            onClick={() => setShowDispute(open => !open)}
          >
            {showDispute ? 'Đóng khiếu nại' : 'Khiếu nại / Xem khiếu nại'}
          </button>
          {showDispute && <DisputePanel sellerOrderId={Number(so.sellerOrderId)} role="buyer" />}
        </div>
      )}

    </section>
  );
}
