import { useEffect, useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { http } from '../../services/api/http';
import { getStatusMeta, ORDER_STATUS, QUOTATION_STATUS, RFQ_STATUS, SUPPLIER_VERIFICATION } from '../../utils/status';
import { BarList, fmtCount, fmtMoney, SegmentedBar, SERIES, TimeChart, type KeyCount } from './adminCharts';

type Daily = { date: string; count: number };
type CommerceMetrics = {
  orders: number; collectedThisMonth: number; month: string;
  ordersByStatus: KeyCount[]; daily: { date: string; collected: number; retailOrders: number; rfqOrders: number }[];
};
type IdentityMetrics = { users: number; usersByRole: KeyCount[]; suppliersByVerification: KeyCount[]; daily: Daily[] };
type RfqMetrics = { rfqs: number; rfqsByStatus: KeyCount[]; quotationsByStatus: KeyCount[]; daily: Daily[] };
type Metrics = { commerce: CommerceMetrics; identity: IdentityMetrics; rfq: RfqMetrics };

const RANGES = [7, 30, 90] as const;
const ROLES = [
  { key: 'CUSTOMER', label: 'Khách hàng', color: SERIES.blue },
  { key: 'SUPPLIER', label: 'Nhà cung cấp', color: SERIES.orange },
  { key: 'OTHER', label: 'Khác', color: SERIES.gray },
];
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

function Card({ title, subtitle, className = '', children }: { title: string; subtitle?: ReactNode; className?: string; children: ReactNode }) {
  return <section className={`bg-white rounded-2xl border border-blue-100 p-5 shadow-sm min-w-0 ${className}`}>
    <h4 className="font-semibold text-blue-950">{title}</h4>
    {subtitle && <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>}
    <div className="mt-4">{children}</div>
  </section>;
}

export default function AdminDashboard() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    const params = { days };
    Promise.all([
      http.get<CommerceMetrics>('/api/admin/commerce/metrics', { params }),
      http.get<IdentityMetrics>('/api/admin/identity/metrics', { params }),
      http.get<RfqMetrics>('/api/admin/rfq/metrics', { params }),
    ]).then(([commerce, identity, rfq]) => {
      if (!current) return;
      // A service still running an older build returns only the totals; say so instead of crashing the app.
      const complete = [commerce.data.ordersByStatus, commerce.data.daily, identity.data.usersByRole,
        identity.data.suppliersByVerification, identity.data.daily, rfq.data.rfqsByStatus, rfq.data.quotationsByStatus, rfq.data.daily]
        .every(Array.isArray);
      if (complete) setData({ commerce: commerce.data, identity: identity.data, rfq: rfq.data });
      else { setData(null); setError('Số liệu thống kê chưa đầy đủ: một dịch vụ máy chủ đang chạy phiên bản cũ. Vui lòng thử lại sau.'); }
    }).catch(() => {
      if (current) { setData(null); setError('Không tải được số liệu thống kê. Vui lòng thử lại sau.'); }
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [days, reload]);

  const c = data?.commerce, u = data?.identity, r = data?.rfq;
  const roleCount = (key: string) => u?.usersByRole.find(x => x.key === key)?.count ?? 0;

  return <div className="max-w-6xl mx-auto">
    <div className="flex justify-between items-center mb-6">
      <div><h2 className="text-2xl font-bold text-blue-950">Tổng quan</h2><p className="text-slate-500">Thống kê hoạt động toàn sàn</p></div>
      <button type="button" onClick={() => setReload(n => n + 1)} aria-label="Tải lại" className="text-blue-700"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
    </div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!data && !error && <p>Đang tải số liệu…</p>}
    {c && u && r && <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
        ['Người dùng', fmtCount(u.users)],
        ['Đơn hàng', fmtCount(c.orders)],
        ['Yêu cầu báo giá', fmtCount(r.rfqs)],
        [`Tiền thu ${c.month}`, fmtMoney(c.collectedThisMonth)],
      ].map(([label, value]) => <div key={label} className="bg-white rounded-2xl border border-blue-100 p-6 shadow-sm"><p className="text-slate-500 text-sm">{label}</p><p className="text-2xl font-bold text-blue-900 mt-3">{value}</p></div>)}</div>
      <p className="text-slate-500 text-sm mt-5">Tiền thu theo thời điểm ghi nhận thanh toán thành công (UTC), trước hoàn tiền và chi trả nhà bán.</p>

      <h3 className="text-lg font-semibold text-blue-950 mt-8">Hiện trạng</h3>
      <p className="text-slate-500 text-sm mb-4">Toàn bộ dữ liệu, theo trạng thái hiện tại</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Đơn hàng theo trạng thái" subtitle={`${fmtCount(c.orders)} đơn`}>
          <BarList rows={c.ordersByStatus} order={Object.keys(ORDER_STATUS)} labelOf={k => getStatusMeta(ORDER_STATUS, k).label} />
        </Card>
        <Card title="Người dùng theo vai trò" subtitle="Nhà cung cấp: tài khoản có hồ sơ nhà cung cấp">
          <SegmentedBar parts={ROLES.map(role => ({ ...role, count: roleCount(role.key) }))} />
          <p className="text-sm font-medium text-slate-700 mt-5 mb-3">Hồ sơ nhà cung cấp theo trạng thái duyệt</p>
          <BarList rows={u.suppliersByVerification} order={Object.keys(SUPPLIER_VERIFICATION)} labelOf={k => getStatusMeta(SUPPLIER_VERIFICATION, k).label} />
        </Card>
        <Card title="Yêu cầu báo giá theo trạng thái" subtitle={`${fmtCount(r.rfqs)} yêu cầu`}>
          <BarList rows={r.rfqsByStatus} order={Object.keys(RFQ_STATUS)} labelOf={k => getStatusMeta(RFQ_STATUS, k).label} />
        </Card>
        <Card title="Báo giá theo trạng thái" subtitle="Mỗi báo giá tính theo phiên bản mới nhất">
          <BarList rows={r.quotationsByStatus} order={Object.keys(QUOTATION_STATUS)} labelOf={k => getStatusMeta(QUOTATION_STATUS, k).label} />
        </Card>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 mt-8 mb-4">
        <div><h3 className="text-lg font-semibold text-blue-950">Xu hướng</h3><p className="text-slate-500 text-sm">Theo ngày (UTC), {days} ngày gần nhất</p></div>
        <div role="group" aria-label="Khoảng thời gian" className="inline-flex rounded-xl border border-blue-200 bg-white p-1">
          {RANGES.map(n => <button key={n} type="button" aria-pressed={days === n} onClick={() => setDays(n)}
            className={`rounded-lg px-3 py-1.5 text-sm ${days === n ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-blue-50'}`}>{n} ngày</button>)}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2" title="Tiền thu theo ngày" subtitle={`Tổng ${days} ngày: ${fmtMoney(sum(c.daily.map(d => d.collected)))}`}>
          <TimeChart label="Tiền thu theo ngày" kind="area" integer={false} format={fmtMoney} dates={c.daily.map(d => d.date)}
            series={[{ key: 'collected', label: 'Tiền thu', color: SERIES.blue, values: c.daily.map(d => d.collected) }]} />
        </Card>
        <Card className="lg:col-span-2" title="Đơn hàng mới theo ngày" subtitle={`Tổng ${days} ngày: ${fmtCount(sum(c.daily.map(d => d.retailOrders + d.rfqOrders)))} đơn`}>
          <TimeChart label="Đơn hàng mới theo ngày" kind="columns" format={fmtCount} dates={c.daily.map(d => d.date)} series={[
            { key: 'retail', label: 'Mua lẻ', color: SERIES.blue, values: c.daily.map(d => d.retailOrders) },
            { key: 'rfq', label: 'Từ báo giá (RFQ)', color: SERIES.orange, values: c.daily.map(d => d.rfqOrders) },
          ]} />
        </Card>
        <Card title="Người dùng mới theo ngày" subtitle={`Tổng ${days} ngày: ${fmtCount(sum(u.daily.map(d => d.count)))} tài khoản`}>
          <TimeChart label="Người dùng mới theo ngày" kind="columns" format={fmtCount} dates={u.daily.map(d => d.date)}
            series={[{ key: 'users', label: 'Người dùng mới', color: SERIES.blue, values: u.daily.map(d => d.count) }]} />
        </Card>
        <Card title="Yêu cầu báo giá mới theo ngày" subtitle={`Tổng ${days} ngày: ${fmtCount(sum(r.daily.map(d => d.count)))} yêu cầu`}>
          <TimeChart label="Yêu cầu báo giá mới theo ngày" kind="columns" format={fmtCount} dates={r.daily.map(d => d.date)}
            series={[{ key: 'rfqs', label: 'Yêu cầu báo giá mới', color: SERIES.blue, values: r.daily.map(d => d.count) }]} />
        </Card>
      </div>
    </div>}
  </div>;
}
