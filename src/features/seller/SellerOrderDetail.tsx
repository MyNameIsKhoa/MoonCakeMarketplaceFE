import { ReactNode, useEffect, useState } from 'react';
import { CreditCard, MapPin } from 'lucide-react';
import { ApiError, sellerOrderApi } from '../../services/api';
import type { SellerOrderDetailResponse } from '../../services/api/commerceApi';
import { errorMessage } from '../../services/api/http';
import { formatVnd } from '../../utils/format';
import { ORDER_SOURCE, ORDER_STATUS } from '../../utils/status';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatPlainDate, formatUtcDateTime } from './displayFormat';

interface SellerOrderDetailProps {
  sellerOrderId: number;
}

const CARD = 'bg-white rounded-2xl shadow-sm border border-gray-100 p-6';

/** Sums of backend amounts (2-decimal money) without floating point noise. */
const money = (value: number) => Math.round(value * 100) / 100;

function Row({ label, children, strong }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`m-0 text-right ${strong ? 'font-bold text-gray-900' : 'text-gray-800'}`}>{children}</dd>
    </div>
  );
}

/** Seller Center "Đơn hàng" tab: one seller order as the supplier sees it (GET /api/seller-orders/{id}). */
export default function SellerOrderDetail({ sellerOrderId }: SellerOrderDetailProps) {
  const [result, setResult] = useState<{ id: number; order?: SellerOrderDetailResponse; error?: string } | null>(null);

  useEffect(() => {
    let current = true;
    sellerOrderApi.get(sellerOrderId)
      .then((order) => current && setResult({ id: sellerOrderId, order }))
      .catch((err: unknown) => current && setResult({
        id: sellerOrderId,
        error: err instanceof ApiError && err.status === 404
          ? 'Không tìm thấy đơn hàng này hoặc đơn không thuộc gian hàng của bạn.'
          : errorMessage(err)
      }));
    return () => {
      current = false;
    };
  }, [sellerOrderId]);

  const loaded = result?.id === sellerOrderId ? result : null;
  if (!loaded) return <p className="text-sm text-gray-500">Đang tải chi tiết đơn hàng…</p>;
  if (!loaded.order) return <p role="alert" className="mss-alert mss-alert--danger m-0">{loaded.error}</p>;

  const order = loaded.order;
  // Derived from the lines because `subtotal` means "before discount" for retail orders but
  // "after discount" for RFQ orders; totalAmount always comes from the backend as is.
  const lineGross = (item: SellerOrderDetailResponse['items'][number]) => money(item.unitPrice * item.quantity);
  const goodsTotal = money(order.items.reduce((sum, item) => sum + lineGross(item), 0));
  const discountTotal = money(order.items.reduce((sum, item) => sum + item.discountAmount, 0));
  const address = order.deliveryAddress;
  const hasDelivery = !!address || !!order.deliveryDateSnapshot || !!order.shippingMethodSnapshot;

  return (
    <div className="space-y-6">
      <div className={`${CARD} flex flex-wrap items-start justify-between gap-3`}>
        <div className="min-w-0">
          <p className="text-sm text-gray-500 m-0">Đơn hàng của gian hàng {order.storeNameSnapshot}</p>
          <h2 className="text-xl font-bold text-gray-900 font-mono break-all mt-1 mb-0">{order.sellerOrderNo}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge map={ORDER_SOURCE} status={order.quotationIdRef === null ? 'RETAIL' : 'RFQ'} />
          <StatusBadge map={ORDER_STATUS} status={order.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className={`${CARD} space-y-3`}>
          <h3 className="font-bold text-gray-900 text-base m-0 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary-700" /> Giao hàng
          </h3>
          {!hasDelivery && <p className="text-sm text-gray-500 m-0">Đơn chưa có thông tin giao hàng.</p>}
          {address && (
            <div className="text-sm">
              <p className="font-semibold text-gray-900 m-0">{address.recipientName} · {address.recipientPhone}</p>
              <p className="text-gray-700 mt-1 mb-0">
                {[address.addressLine, address.ward, address.district, address.city].filter(Boolean).join(', ')}
              </p>
            </div>
          )}
          {(order.deliveryDateSnapshot || order.shippingMethodSnapshot) && (
            <dl className="m-0 space-y-2 text-sm">
              {order.deliveryDateSnapshot && <Row label="Ngày giao hẹn">{formatPlainDate(order.deliveryDateSnapshot)}</Row>}
              {order.shippingMethodSnapshot && <Row label="Phương thức giao">{order.shippingMethodSnapshot}</Row>}
            </dl>
          )}
        </section>

        <section className={`${CARD} space-y-3`}>
          <h3 className="font-bold text-gray-900 text-base m-0 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary-700" /> Thanh toán
          </h3>
          {order.depositAmount !== null ? (
            <dl className="m-0 space-y-2 text-sm">
              <Row label={order.depositPercent !== null
                ? `Đặt cọc (${order.depositPercent.toLocaleString('vi-VN')}%)` : 'Đặt cọc'}>
                {formatVnd(order.depositAmount)}
              </Row>
              <Row label="Phần còn lại">{formatVnd(order.remainingAmount)}</Row>
              <Row label="Hạn thanh toán phần còn lại">{formatUtcDateTime(order.remainingDueAt)}</Row>
            </dl>
          ) : (
            <p className="text-sm text-gray-700 m-0">Khách thanh toán toàn bộ giá trị đơn, không đặt cọc.</p>
          )}
          {order.paymentTermsSnapshot && (
            <div className="text-sm">
              <p className="text-gray-500 m-0">Điều khoản thanh toán</p>
              <p className="text-gray-800 mt-1 mb-0 whitespace-pre-wrap">{order.paymentTermsSnapshot}</p>
            </div>
          )}
        </section>
      </div>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <h3 className="font-bold text-gray-900 text-sm m-0 p-4 border-b border-gray-100">Sản phẩm ({order.items.length})</h3>
        {order.items.length === 0 && <p className="p-4 m-0 text-sm text-gray-500">Đơn hàng không có dòng sản phẩm.</p>}
        {order.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase">
                  <th className="py-3 px-4 font-semibold">Sản phẩm</th>
                  <th className="py-3 px-4 font-semibold">SKU</th>
                  <th className="py-3 px-4 font-semibold text-right">SL</th>
                  <th className="py-3 px-4 font-semibold text-right">Đơn giá</th>
                  <th className="py-3 px-4 font-semibold text-right">Giảm giá</th>
                  <th className="py-3 px-4 font-semibold text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <tr key={item.orderItemId}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {item.imageUrlSnapshot
                          ? <img src={item.imageUrlSnapshot} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          : <span className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" aria-hidden="true" />}
                        <span className="font-semibold text-gray-900">
                          {item.productNameSnapshot}
                          {item.variantNameSnapshot && (
                            <span className="block text-xs text-gray-500 font-normal">{item.variantNameSnapshot}</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-700">{item.skuSnapshot ?? '—'}</td>
                    <td className="py-3 px-4 text-right">{item.quantity.toLocaleString('vi-VN')}</td>
                    <td className="py-3 px-4 text-right">{formatVnd(item.unitPrice)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {item.discountAmount > 0 ? `−${formatVnd(item.discountAmount)}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">
                      {formatVnd(money(lineGross(item) - item.discountAmount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <dl className="m-0 p-4 border-t border-gray-100 space-y-2 text-sm sm:max-w-sm sm:ml-auto">
          <Row label="Tiền hàng">{formatVnd(goodsTotal)}</Row>
          <Row label="Giảm giá">{discountTotal > 0 ? `−${formatVnd(discountTotal)}` : formatVnd(0)}</Row>
          <Row label="Phí vận chuyển">{formatVnd(order.shippingFee)}</Row>
          <div className="border-t border-gray-100 pt-2">
            <Row label="Tổng cộng" strong>
              <span className="text-primary-700 text-base">{formatVnd(order.totalAmount)}</span>
            </Row>
          </div>
        </dl>
      </section>
    </div>
  );
}
