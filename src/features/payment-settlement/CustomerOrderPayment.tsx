import { useEffect, useRef, useState } from 'react';
import { ExternalLink, RefreshCw, Wallet } from 'lucide-react';
import { ApiError } from '../../services/api/http';
import { formatVnd } from '../../utils/format';
import { CustomerPaymentSummary, paymentApi } from './paymentApi';

function safeUrl(value: string | null) {
  try { const url = new URL(value || ''); return url.protocol === 'https:' ? url.href : undefined; } catch { return undefined; }
}

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
  const key = useRef<string | null>(null);

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
        key.current ||= crypto.randomUUID();
        const updated = await paymentApi.initiateCustomer(orderId, key.current);
        key.current = null;
        setData(updated);
        const checkoutUrl = safeUrl(updated.payment?.checkoutUrl || null);
        if (checkoutUrl && updated.payment?.status === 'PENDING') {
          window.location.assign(checkoutUrl);
          return;
        }
      } else if (action === 'cancel') {
        setData(await paymentApi.cancelCustomerLink(orderId));
      } else {
        setData(await paymentApi.reconcileCustomer(orderId));
      }
    } catch (e) {
      setError(e instanceof ApiError ? errors[e.code] || `Không thực hiện được (${e.code}).` : 'Chưa nhận được phản hồi. Hãy đối soát trước khi thử lại.');
    } finally { setBusy(false); }
  }

  const payment = data?.payment;
  const ended = payment && ['CANCELLED', 'EXPIRED', 'FAILED'].includes(payment.status);
  const uncertain = payment && ['CREATING', 'RECONCILING', 'CANCELLING'].includes(payment.status);
  const expired = payment && Date.parse(payment.expiresAt) <= Date.now();
  const checkout = safeUrl(payment?.checkoutUrl || null);

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
        {payment && <p role="status">Trạng thái: <strong>{payment.status === 'SUCCESS' ? 'Đã thanh toán' :
          payment.status === 'PENDING' ? 'Chờ thanh toán' : ended ? 'Link đã kết thúc' : 'Đang đối soát'}</strong></p>}
        {uncertain && <p className="text-amber-800">Đang xác minh với PayOS. Vui lòng đối soát trước khi tạo link mới.</p>}
        <div className="flex flex-wrap gap-2">
          {(!payment || ended) && data.paidAmount === 0 && <button className="mss-button mss-button--primary" disabled={busy}
            onClick={() => void run('initiate')}>{busy ? 'Đang chuyển đến PayOS…' : `Thanh toán ${formatVnd(data.totalAmount)}`}</button>}
          {payment?.status === 'PENDING' && checkout && !expired &&
            <a className="mss-button mss-button--primary" href={checkout}>Mở QR / thanh toán PayOS <ExternalLink size={16} /></a>}
          {payment && payment.status !== 'SUCCESS' && !ended && <>
            <button className="mss-button mss-button--secondary" disabled={busy} onClick={() => void run('reconcile')}>Đối soát PayOS</button>
            <button className="mss-button mss-button--secondary" disabled={busy} onClick={() => void run('cancel')}>Hủy link chưa trả</button>
          </>}
        </div>
      </>}
    </section>
  </main>;
}
