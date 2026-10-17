import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, MapPin, Store, Truck, Wallet } from 'lucide-react';
import { CustomerOrder, PaymentProvider, SellerOrder } from '../types';
import { orderApi } from '../services/api';
import { formatAddress, formatDate, formatDateTime, formatVnd } from '../utils/format';
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

interface OrderTrackingProps {
  setActiveTab: (tab: string) => void;
}

type FilterId = 'all' | 'active' | 'done' | 'cancelled';

const FILTERS: { id: FilterId; label: string; statuses?: string[] }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'active', label: 'Đang xử lý', statuses: ['AWAITING_PAYMENT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'PROCESSING', 'PREPARING', 'SHIPPING'] },
  { id: 'done', label: 'Đã giao / Hoàn tất', statuses: ['DELIVERED', 'COMPLETED'] },
  { id: 'cancelled', label: 'Hủy / Khiếu nại', statuses: ['CANCEL_REQUESTED', 'CANCELLED', 'DISPUTED'] }
];

export default function OrderTracking({ setActiveTab }: OrderTrackingProps) {
  const [orders, setOrders] = useState<CustomerOrder[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError('');
    setOrders(null);
    orderApi
      .list()
      .then((list) => {
        setOrders(list);
        setExpandedId((current) => current ?? list[0]?.orderId ?? null);
      })
      .catch(() => setLoadError('Không tải được danh sách đơn hàng.'));
  }, []);

  useEffect(load, [load]);

  const replaceOrder = (updated: CustomerOrder) =>
    setOrders((prev) => prev?.map((o) => (o.orderId === updated.orderId ? updated : o)) ?? prev);

  const activeFilter = FILTERS.find((f) => f.id === filter)!;
  const visibleOrders =
    orders?.filter(
      (o) => !activeFilter.statuses || o.sellerOrders.some((so) => activeFilter.statuses!.includes(so.status))
    ) ?? [];

  return (
    <div className="mss-container mss-page">
      <header className="mss-page-header">
        <div>
          <h1 className="mss-page-title">Đơn hàng của tôi</h1>
          <p className="mss-page-description">
            Mỗi đơn hàng gồm một hoặc nhiều đơn nhà bán; thanh toán, vận chuyển và hủy được xử lý theo từng đơn nhà bán.
          </p>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`mss-button mss-button--sm whitespace-nowrap ${filter === f.id ? 'mss-button--primary' : 'mss-button--secondary'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loadError ? (
        <div className="mss-alert mss-alert--danger flex flex-wrap items-center justify-between gap-3">
          <span>{loadError}</span>
          <button className="mss-button mss-button--secondary mss-button--sm" onClick={load}>
            Thử lại
          </button>
        </div>
      ) : orders === null ? (
        <p className="text-sm text-gray-500">Đang tải đơn hàng…</p>
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
            <OrderCard
              key={order.orderId}
              order={order}
              expanded={expandedId === order.orderId}
              onToggle={() => setExpandedId(expandedId === order.orderId ? null : order.orderId)}
              onUpdated={replaceOrder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

interface OrderCardProps {
  order: CustomerOrder;
  expanded: boolean;
  onToggle: () => void;
  onUpdated: (order: CustomerOrder) => void;
}

function OrderCard({ order, expanded, onToggle, onUpdated }: OrderCardProps) {
  const itemCount = order.sellerOrders.reduce((sum, so) => sum + so.items.length, 0);

  return (
    <article className="mss-card mss-stack">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mss-card-title">Đơn {order.orderNo}</h2>
            <StatusBadge map={ORDER_STATUS} status={order.status} />
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
        </div>
      </div>

      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="mss-button mss-button--secondary mss-button--sm self-start"
      >
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {expanded ? 'Thu gọn' : 'Xem thông tin đơn hàng'}
      </button>

      {expanded && (
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
            <SellerOrderSection key={so.sellerOrderId} orderId={order.orderId} sellerOrder={so} onUpdated={onUpdated} />
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
  sellerOrder: SellerOrder;
  onUpdated: (order: CustomerOrder) => void;
}

function SellerOrderSection({ orderId, sellerOrder: so, onUpdated }: SellerOrderSectionProps) {
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [payProvider, setPayProvider] = useState<PaymentProvider>('VNPAY');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const canCancel = so.allowedActions.includes('CANCEL');
  const canPay = so.allowedActions.includes('PAY');

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
        <StatusBadge map={ORDER_STATUS} status={so.status} />
      </div>

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
            </tr>
          </thead>
          <tbody>
            {so.items.map((item) => (
              <tr key={item.orderItemId}>
                <td>
                  <div className="flex items-center gap-3 min-w-[220px]">
                    <img
                      src={item.imageUrlSnapshot}
                      alt={item.productNameSnapshot}
                      className="w-12 h-12 aspect-square object-cover rounded-lg border border-gray-200"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{item.productNameSnapshot}</p>
                      <p className="text-xs text-gray-500">
                        {item.variantNameSnapshot}
                        {item.skuSnapshot && <> · SKU {item.skuSnapshot}</>}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap">{formatVnd(item.unitPrice)}</td>
                <td>{item.quantity}</td>
                <td className="whitespace-nowrap">{item.discountAmount > 0 ? `-${formatVnd(item.discountAmount)}` : '—'}</td>
                <td className="text-right whitespace-nowrap font-semibold">{formatVnd(item.subtotal)}</td>
              </tr>
            ))}
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
                    {canPay && p.status === 'PENDING' && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <select
                          className="min-h-9 px-2 border border-gray-300 rounded-lg bg-white text-sm"
                          value={payProvider}
                          onChange={(e) => setPayProvider(e.target.value as PaymentProvider)}
                          aria-label="Phương thức thanh toán"
                        >
                          {(['VNPAY', 'MOMO', 'BANK_TRANSFER'] as PaymentProvider[]).map((id) => (
                            <option key={id} value={id}>
                              {getStatusMeta(PAYMENT_PROVIDER, id).label}
                            </option>
                          ))}
                        </select>
                        <button
                          disabled={busy}
                          onClick={() => run(() => orderApi.pay(orderId, so.sellerOrderId, p.paymentId, payProvider))}
                          className="mss-button mss-button--primary mss-button--sm"
                        >
                          Thanh toán
                        </button>
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
            </div>
          ))
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
        </div>
      )}

      {actionError && <div className="mss-alert mss-alert--danger">{actionError}</div>}

      {canCancel &&
        (showCancel ? (
          <form
            className="mss-field"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => orderApi.requestCancellation(orderId, so.sellerOrderId, cancelReason.trim()));
            }}
          >
            <label className="mss-label" htmlFor={`reason-${so.sellerOrderId}`}>
              Lý do hủy đơn {so.sellerOrderNo}
            </label>
            <textarea
              id={`reason-${so.sellerOrderId}`}
              className="mss-textarea"
              required
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ví dụ: Đặt nhầm số lượng"
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy || !cancelReason.trim()} className="mss-button mss-button--danger mss-button--sm">
                Gửi yêu cầu hủy
              </button>
              <button type="button" onClick={() => setShowCancel(false)} className="mss-button mss-button--secondary mss-button--sm">
                Đóng
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowCancel(true)} className="mss-button mss-button--danger mss-button--sm self-start">
            Yêu cầu hủy đơn nhà bán này
          </button>
        ))}
    </section>
  );
}
