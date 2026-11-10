import { ORDER_SOURCE } from '../../utils/status';
import { formatDateTime } from '../../utils/format';
import { useEffect, useState } from 'react';
import { http } from '../../services/api/http';

type Case = { cancellationId: number; sellerOrderId: number; sellerOrderNo: string;
  customerOrderNo: string; sourceType: string; paidAmount: number; activePaymentId: number | null;
  reason: string; requestedAt: string | null };

export default function AdminCancellations() {
  const [cases, setCases] = useState<Case[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current = true;
    setError('');
    http.get<Case[]>('/api/admin/commerce/cancellations')
      .then(({ data }) => { if (current) setCases(data); })
      .catch(() => { if (current) setError('Không tải được yêu cầu hủy.'); });
    return () => { current = false; };
  }, [reload]);

  const decide = async (item: Case, approve: boolean) => {
    const reason = window.prompt(`${approve ? 'Lý do chấp nhận' : 'Lý do từ chối'} hủy đơn ${item.sellerOrderNo}:`);
    if (!reason?.trim()) return;
    setBusy(true); setError('');
    try {
      await http.post(`/api/payments/orders/${item.sellerOrderId}/cancellations/${item.cancellationId}/decision`,
        { approve, reason: reason.trim() }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      setReload(n => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không xử lý được yêu cầu.'); }
    finally { setBusy(false); }
  };

  const cancelLink = async (item: Case) => {
    if (!item.activePaymentId || !window.confirm(`Hủy link PayOS của đơn ${item.sellerOrderNo}?`)) return;
    setBusy(true); setError('');
    try { await http.post(`/api/payments/${item.activePaymentId}/cancel-link`); setReload(n => n + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'Chưa đối soát được link PayOS.'); }
    finally { setBusy(false); }
  };

  return <div className="max-w-6xl mx-auto">
    <h2 className="text-2xl font-bold text-blue-950">Yêu cầu hủy đơn</h2>
    <p className="text-slate-500 mb-5">Yêu cầu đang chờ xử lý từ các đơn nhà bán.</p>
    <p className="bg-blue-50 text-blue-900 rounded-xl p-4 mb-5 text-sm">Có thể chấp nhận hủy đơn RFQ chưa thu tiền sau khi link PayOS đã hủy. Đơn đã thu tiền cần xử lý hoàn tiền; đơn mua lẻ cần hoàn kho.</p>
    {error && <p role="alert" className="text-red-700 mb-4">{error}</p>}
    {!cases && !error && <p>Đang tải…</p>}
    {cases?.length === 0 && <p>Không có yêu cầu đang chờ.</p>}
    {cases && cases.length > 0 && <div className="overflow-x-auto bg-white rounded-2xl border border-blue-100"><table className="w-full text-left text-sm"><thead className="bg-blue-50 text-blue-950"><tr><th className="p-4">Đơn</th><th className="p-4">Đơn nhà bán</th><th className="p-4">Lý do khách</th><th className="p-4">Gửi lúc</th><th className="p-4">Thao tác</th></tr></thead><tbody>{cases.map(item => <tr key={item.cancellationId} className="border-t border-blue-50"><td className="p-4">{item.customerOrderNo}</td><td className="p-4">{item.sellerOrderNo}<span className="block text-slate-500">{ORDER_SOURCE[item.sourceType]?.label ?? "Chưa xác định"} · đã thu {item.paidAmount.toLocaleString('vi-VN')} đ</span></td><td className="p-4">{item.reason}</td><td className="p-4">{formatDateTime(item.requestedAt ?? undefined)}</td><td className="p-4"><div className="flex flex-wrap gap-2">{item.activePaymentId && <button disabled={busy} onClick={() => void cancelLink(item)} className="text-blue-700 border border-blue-200 rounded-lg px-3 py-1 disabled:opacity-40">Hủy link PayOS</button>}{item.sourceType === 'RFQ' && item.paidAmount === 0 && !item.activePaymentId && <button disabled={busy} onClick={() => void decide(item, true)} className="text-white bg-blue-700 rounded-lg px-3 py-1 disabled:opacity-40">Chấp nhận hủy</button>}<button disabled={busy} onClick={() => void decide(item, false)} className="text-red-700 border border-red-200 rounded-lg px-3 py-1 disabled:opacity-40">Từ chối</button></div></td></tr>)}</tbody></table></div>}
  </div>;
}
