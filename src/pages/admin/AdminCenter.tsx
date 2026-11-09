import { useEffect, useState } from 'react';
import { LayoutDashboard, ShieldCheck, Users, ArrowLeft, RefreshCw, Store, Tags, ClipboardX, MessageSquareWarning, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { http } from '../../services/api/http';
import AdminSupplierReview from './AdminSupplierReview';
import AdminCatalog from './AdminCatalog';
import AdminCancellations from './AdminCancellations';
import AdminDisputes from './AdminDisputes';
import { SellerPaymentSettlement } from '../../features/payment-settlement/PaymentSettlement';

type Tab = 'dashboard' | 'users' | 'suppliers' | 'stores' | 'categories' | 'cancellations' | 'disputes' | 'finance';
type Page<T> = { content: T[]; totalPages: number; totalElements: number; number: number };
type User = { userId: number; email: string; status: string; emailVerified: boolean; createdAt: string | null };
type Metrics = { users: number; orders: number; rfqs: number; collectedThisMonth: number; month: string };

const items: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'users', label: 'Người dùng', icon: Users },
  { id: 'suppliers', label: 'Duyệt nhà cung cấp', icon: ShieldCheck },
  { id: 'stores', label: 'Gian hàng', icon: Store },
  { id: 'categories', label: 'Danh mục', icon: Tags },
  { id: 'cancellations', label: 'Yêu cầu hủy', icon: ClipboardX },
  { id: 'disputes', label: 'Khiếu nại', icon: MessageSquareWarning },
  { id: 'finance', label: 'Đối soát & giải ngân', icon: Wallet },
];

export default function AdminCenter({ onBackToShop }: { onBackToShop: () => void }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricError, setMetricError] = useState('');
  const [rows, setRows] = useState<Page<User> | null>(null);
  const [userError, setUserError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (tab !== 'dashboard') return;
    let current = true;
    setMetricError('');
    Promise.all([
      http.get<{ users: number }>('/api/admin/identity/metrics'),
      http.get<{ orders: number; collectedThisMonth: number; month: string }>('/api/admin/commerce/metrics'),
      http.get<{ rfqs: number }>('/api/admin/rfq/metrics'),
    ]).then(([identity, commerce, rfq]) => {
      if (current) setMetrics({ ...identity.data, ...commerce.data, ...rfq.data });
    }).catch(() => { if (current) { setMetrics(null); setMetricError('Không tải được số liệu thống kê. Vui lòng thử lại sau.'); } });
    return () => { current = false; };
  }, [tab, reload]);

  useEffect(() => {
    if (tab !== 'users') return;
    let current = true;
    setUserError('');
    http.get<Page<User>>('/api/admin/identity/users', { params: { q: query || undefined, status: status || undefined, page, size: 20 } })
      .then(({ data }) => { if (current) setRows(data); })
      .catch(() => { if (current) { setRows(null); setUserError('Không tải được danh sách người dùng.'); } });
    return () => { current = false; };
  }, [tab, query, status, page, reload]);

  const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
  return <div className="admin-center min-h-screen bg-slate-50 text-slate-900 md:flex">
    <aside className="bg-blue-950 text-white md:w-64 md:min-h-screen shrink-0 p-5 flex flex-col gap-6">
      <div><p className="text-blue-200 text-xs uppercase tracking-widest">Mooncake Marketplace</p><h1 className="text-xl font-bold mt-1">Quản trị sàn</h1></div>
      <nav aria-label="Điều hướng quản trị" className="flex md:flex-col gap-2 overflow-x-auto">
        {items.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)}
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left whitespace-nowrap ${tab === id ? 'bg-blue-600 text-white' : 'text-blue-100 hover:bg-blue-900'}`}>
          <Icon size={18} />{label}
        </button>)}
      </nav>
      <div className="md:mt-auto text-sm text-blue-100">
        <p className="truncate mb-3" title={user?.email}>{user?.email}</p>
        <button type="button" onClick={onBackToShop} className="flex items-center gap-2 rounded-xl border border-blue-500 px-4 py-2 hover:bg-blue-900"><ArrowLeft size={16} /> Về sàn mua sắm</button>
      </div>
    </aside>
    <main className="min-w-0 flex-1 p-5 md:p-8">
      {tab === 'dashboard' && <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6"><div><h2 className="text-2xl font-bold text-blue-950">Tổng quan</h2><p className="text-slate-500">Thống kê hoạt động toàn sàn</p></div><button type="button" onClick={() => setReload(n => n + 1)} aria-label="Tải lại" className="text-blue-700"><RefreshCw size={20}/></button></div>
        {metricError && <p role="alert" className="text-red-700">{metricError}</p>}
        {!metrics && !metricError && <p>Đang tải số liệu…</p>}
        {metrics && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
          ['Người dùng', metrics.users.toLocaleString('vi-VN')],
          ['Đơn hàng', metrics.orders.toLocaleString('vi-VN')],
          ['Yêu cầu báo giá', metrics.rfqs.toLocaleString('vi-VN')],
          [`Tiền thu ${metrics.month}`, money.format(metrics.collectedThisMonth)],
        ].map(([label, value]) => <div key={label} className="bg-white rounded-2xl border border-blue-100 p-6 shadow-sm"><p className="text-slate-500 text-sm">{label}</p><p className="text-2xl font-bold text-blue-900 mt-3">{value}</p></div>)}</div>}
        <p className="text-slate-500 text-sm mt-5">Tiền thu theo thời điểm ghi nhận thanh toán thành công (UTC), trước hoàn tiền và chi trả nhà bán.</p>
      </div>}
      {tab === 'users' && <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6"><div><h2 className="text-2xl font-bold text-blue-950">Người dùng</h2><p className="text-slate-500">Tra cứu tài khoản trên sàn</p></div><button type="button" onClick={() => setReload(n => n + 1)} aria-label="Tải lại" className="text-blue-700"><RefreshCw size={20}/></button></div>
        <div className="flex flex-wrap gap-3 mb-4"><input aria-label="Tìm email" placeholder="Tìm theo email" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} className="rounded-xl border border-blue-200 px-4 py-2 min-w-56"/><select aria-label="Lọc trạng thái" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }} className="rounded-xl border border-blue-200 px-4 py-2"><option value="">Mọi trạng thái</option>{['PENDING','ACTIVE','INACTIVE','SUSPENDED'].map(s => <option key={s}>{s}</option>)}</select></div>
        {userError && <p role="alert" className="text-red-700">{userError}</p>}
        {!rows && !userError && <p>Đang tải người dùng…</p>}
        {rows && <><div className="overflow-x-auto bg-white rounded-2xl border border-blue-100"><table className="w-full text-left text-sm"><thead className="bg-blue-50 text-blue-950"><tr><th className="p-4">ID</th><th className="p-4">Email</th><th className="p-4">Trạng thái</th><th className="p-4">Xác minh email</th><th className="p-4">Ngày tạo (UTC)</th></tr></thead><tbody>{rows.content.map(u => <tr key={u.userId} className="border-t border-blue-50"><td className="p-4">#{u.userId}</td><td className="p-4">{u.email}</td><td className="p-4">{u.status}</td><td className="p-4">{u.emailVerified ? 'Đã xác minh' : 'Chưa xác minh'}</td><td className="p-4">{u.createdAt ?? '—'}</td></tr>)}</tbody></table>{rows.content.length === 0 && <p className="p-5 text-slate-500">Không có người dùng phù hợp.</p>}</div><div className="flex justify-between items-center mt-4"><span className="text-slate-500">{rows.totalElements} tài khoản · trang {rows.number + 1}/{Math.max(1, rows.totalPages)}</span><div className="flex gap-2"><button disabled={page === 0} onClick={() => setPage(n => n - 1)} className="px-3 py-2 rounded-lg border disabled:opacity-40">Trước</button><button disabled={page + 1 >= rows.totalPages} onClick={() => setPage(n => n + 1)} className="px-3 py-2 rounded-lg border disabled:opacity-40">Sau</button></div></div></>}
      </div>}
      {tab === 'suppliers' && <AdminSupplierReview />}
      {tab === 'stores' && <AdminCatalog kind="stores" />}
      {tab === 'categories' && <AdminCatalog kind="categories" />}
      {tab === 'cancellations' && <AdminCancellations />}
      {tab === 'disputes' && <AdminDisputes />}
      {tab === 'finance' && <SellerPaymentSettlement />}
    </main>
  </div>;
}
