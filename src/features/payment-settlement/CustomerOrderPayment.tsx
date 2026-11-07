import { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, Wallet } from 'lucide-react';
import { ApiError } from '../../services/api/http';
import { formatVnd } from '../../utils/format';
import { CustomerPaymentSummary, paymentApi } from './paymentApi';
import { endedPayment, initiationKey, usableCheckout } from './paymentState';
import StatusBadge from '../../components/ui/StatusBadge';
import { PAYMENT_STATUS } from '../../utils/status';


const errors: Record<string, string> = {
  ORDER_NOT_ACCEPTED: 'Có đơn nhà bán chưa được chấp nhận. Vui lòng chờ nhà bán xác nhận.',
  PAYMENT_CONTEXT_NOT_READY: 'Đơn chưa sẵn sàng thanh toán. Vui lòng tải lại sau.',
  ACTIVE_PAYMENT_EXISTS: 'Đơn đã có link thanh toán đang hoạt động. Vui lòng đối soát link đó trước.',
  PAYMENT_BLOCKED_BY_CASE: 'Đơn đang có yêu cầu hủy, hoàn tiền hoặc tranh chấp.',
  ORDER_TOTAL_MISMATCH: 'Tổng tiền đơn và các nhà bán chưa khớp. Vui lòng liên hệ hỗ trợ.',
  PAYOS_RECONCILIATION_UNAVAILABLE: 'Chưa kết nối được payOS. Vui lòng thử đối soát lại.',
};

export default function CustomerOrderPayment({ orderId }: { orderId: number }) {
  const [data, setData] = useState<CustomerPaymentSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [unresolved, setUnresolved] = useState(false);

  async function load() {
    setBusy(true); setError('');
    try { setData(await paymentApi.customerSummary(orderId)); }
    catch (e) { setError(e instanceof ApiError ? errors[e.code] || `Không tải được thanh toán (${e.code}).` : 'Không kết nối được máy chủ.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, [orderId]);

  async function run(action: 'initiate' | 'reconcile' | 'cancel') {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (action === 'initiate') {
        const scope = `customer:${orderId}:${data?.payment?.id ?? 'initial'}`;
        const updated = await paymentApi.initiateCustomer(orderId, initiationKey(scope));
        setData(updated);
        const checkoutUrl = updated.payment && usableCheckout(updated.payment);
        if (checkoutUrl && updated.payment?.status === 'PENDING') {
          sessionStorage.setItem('financeCustomerOrderId', String(orderId));
          window.location.assign(checkoutUrl);
          return;
        }
      } else if (action === 'cancel') {
        setData(await paymentApi.cancelCustomerLink(orderId));
      } else {
        const updated = await paymentApi.reconcileCustomer(orderId);
        setData(updated);
        setUnresolved(false);
      }
    } catch (e) {
      setUnresolved(true);
      setError(e instanceof ApiError ? errors[e.code] || `Không thực hiện được (${e.code}).` : 'Chưa nhận được phản hồi. Hãy đối soát trước khi thử lại.');
    } finally { setBusy(false); }
  }

  const payment = data?.payment;
  const ended = payment && endedPayment(payment.status);
  const uncertain = unresolved || (payment && payment.status !== 'SUCCESS' && payment.status !== 'PENDING' && !ended);
  const expired = payment?.expiresAt && Date.parse(payment.expiresAt) <= Date.now();
  const checkout = payment && usableCheckout(payment);

  return <main className="mss-container mss-page mss-stack">
    <header className="mss-page-header"><div>
      <h1 className="mss-page-title flex items-center gap-3"><Wallet /> Thanh toán tổng đơn</h1>
      <p className="mt-2 text-gray-600">Một lần thanh toán PayOS cho toàn bộ đơn hàng #{orderId}.</p>
    </div></header>
    {error && <p role="alert" className="mss-card text-red-800">{error}</p>}
    <section className="mss-card mss-stack">
      <div className="flex flex-wrap justify-between gap-3">
        <div><h2 className="mss-section-title">Đơn hàng #{orderId}</h2>
          <p>{data ? `${data.allocations.length || 'Các'} nhà bán trong đơn` : 'Đang tải thanh toán…'}</p></div>
        <button className="mss-button mss-button--secondary" disabled={busy} onClick={() => void load()}><RefreshCw size={16} /> Tải lại</button>
      </div>
      {data && <>
        <p className="text-2xl font-bold">Tổng thanh toán: {formatVnd(data.totalAmount)}</p>
        <p>Đã ghi nhận: {formatVnd(data.paidAmount)}</p>
        {data.allocations.length > 0 && <ul className="border-t border-gray-200 pt-3 mss-stack">
          {data.allocations.map(item => <li className="flex justify-between gap-3" key={item.paymentId}>
            <span>{item.sellerOrderNo}</span><strong>{formatVnd(item.amount)}</strong>
          </li>)}
        </ul>}
        {payment && <p role="status">Trạng thái: <StatusBadge map={PAYMENT_STATUS} status={payment.status} /></p>}
        {expired && <p>Link đã quá thời hạn hiển thị. Cần đối soát để xác nhận trạng thái.</p>}
        {uncertain && <p className="text-amber-800">Đang xác minh với PayOS. Vui lòng đối soát trước khi tạo link mới.</p>}
        <div className="flex flex-wrap gap-2">
          {(!payment || ended) && !unresolved && data.paidAmount === 0 && <button className="mss-button mss-button--primary" disabled={busy}
            onClick={() => void run('initiate')}>{busy ? 'Đang chuyển đến PayOS…' : `Thanh toán ${formatVnd(data.totalAmount)}`}</button>}
          {payment?.status === 'PENDING' && checkout && !expired &&
            <a className="mss-button mss-button--primary" href={checkout}>Mở QR / thanh toán PayOS <ExternalLink size={16} /></a>}
          {(unresolved || (payment && payment.status !== 'SUCCESS' && !ended)) && <>
            <button className="mss-button mss-button--secondary" disabled={busy} onClick={() => void run('reconcile')}>Đối soát PayOS</button>
            {payment && <button className="mss-button mss-button--secondary" disabled={busy} onClick={() => void run('cancel')}>Hủy link chưa trả</button>}
          </>}
        </div>
      </>}
    </section>
  </main>;
}
