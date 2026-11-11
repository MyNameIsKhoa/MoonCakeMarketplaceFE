import { useEffect, useState } from 'react';
import { http } from '../../services/api/http';
import type { FinanceSummary } from '../../features/payment-settlement/paymentApi';
import DisputePanel from '../../features/payment-settlement/DisputePanel';

type Row = { sellerOrderId: number; summary: FinanceSummary };
export default function AdminDisputes() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let mounted = true;
    http.get<{ content: Row[]; hasMore: boolean }>('/api/admin/commerce/disputes', { params: { page, size: 20 } })
      .then(({ data }) => { if (mounted) { setRows(data.content); setHasMore(data.hasMore); } })
      .catch(() => { if (mounted) setError('Không tải được hàng đợi khiếu nại từ Commerce.'); });
    return () => { mounted = false; };
  }, [version, page]);
  return <div className="max-w-5xl mx-auto space-y-4">
    <div className="flex justify-between"><div><h2 className="text-2xl font-bold text-blue-950">Khiếu nại đơn hàng</h2>
      <p className="text-slate-500">Phân xử, ghi lý do và theo dõi khoản hoàn thủ công.</p></div>
      <button type="button" className="mss-button mss-button--secondary mss-button--sm" onClick={() => { setRows(null); setError(''); setVersion(v => v + 1); }}>Tải lại</button></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!rows && !error && <p>Đang tải…</p>}
    {rows?.length === 0 && <p>Không có khiếu nại đang xử lý.</p>}
    {rows?.map(row => <DisputePanel key={row.sellerOrderId} sellerOrderId={row.sellerOrderId} role="admin" initialSummary={row.summary} />)}
    {rows && <div className="flex gap-3 items-center"><button disabled={page === 0} className="px-3 py-2 rounded-lg border disabled:opacity-40" onClick={() => setPage(p => p - 1)}>Trước</button>
      <span>Trang {page + 1}</span><button disabled={!hasMore} className="px-3 py-2 rounded-lg border disabled:opacity-40" onClick={() => setPage(p => p + 1)}>Sau</button></div>}
  </div>;
}
