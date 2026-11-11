import { type FormEvent, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { ApiError, errorMessage } from '../../services/api/http';
import type { SellerPayoutRow } from '../../services/api/sellerPayoutApi';
import StatusBadge from '../../components/ui/StatusBadge';
import { ORDER_STATUS, PAYOUT_STATUS } from '../../utils/status';
import { formatDateTime, formatVnd } from '../../utils/format';
import { paymentApi, type AdminPayoutPage } from './paymentApi';

const PAGE_SIZE = 20;

/**
 * Admin finance list: every seller order with money collected, net payout and payout state, newest first.
 * `refresh` reloads the current page (e.g. after returning from an order); `onOpen` opens one order.
 */
export default function AdminPayoutList({ refresh, blockingReasons, onOpen }: {
  refresh: number; blockingReasons: Record<string, string>; onOpen: (row: SellerPayoutRow) => void;
}) {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: AdminPayoutPage; error?: string } | null>(null);
  const key = `${query}:${page}:${refresh}`;

  useEffect(() => {
    let current = true;
    paymentApi.adminPayouts(query, page, PAGE_SIZE)
      .then(data => { if (current) setResult({ key, data }); })
      .catch((e: unknown) => {
        if (current) setResult({ key, error: e instanceof ApiError && e.status === 403
          ? 'Bạn không có quyền xử lý tài chính.' : errorMessage(e) });
      });
    return () => { current = false; };
  }, [query, page, key]);

  function search(event: FormEvent) {
    event.preventDefault();
    setQuery(input.trim());
    setPage(0);
  }

  const loaded = result?.key === key ? result : null;
  const data = loaded?.data;

  return <>
    <form onSubmit={search} className='mss-card flex flex-wrap items-end gap-3' role='search'>
      <label className='mss-field flex-1'>Tìm theo mã đơn
        <input className='mss-input' value={input} onChange={e => setInput(e.target.value)}
          maxLength={100} placeholder='Mã đơn nhà bán hoặc mã đơn tổng' />
      </label>
      <button className='mss-button mss-button--primary'><Search size={16} aria-hidden /> Tìm</button>
      {query && <button type='button' className='mss-button mss-button--secondary'
        onClick={() => { setInput(''); setQuery(''); setPage(0); }}>Xóa lọc</button>}
    </form>
    {!loaded && <p role='status'>Đang tải danh sách đơn…</p>}
    {loaded?.error && <p role='alert' className='mss-card text-red-800'>{loaded.error}</p>}
    {data && <section className='mss-card mss-stack' aria-label='Danh sách đơn nhà bán'>
      <p className='text-sm text-gray-600'>{data.totalElements} đơn nhà bán{query && ` khớp “${query}”`}</p>
      {data.content.length === 0 ? <p>{query ? 'Không có đơn phù hợp.' : 'Chưa có đơn nhà bán nào.'}</p>
        : <div className='mss-table-scroll'><table className='mss-table'>
          <thead><tr>
            <th>Đơn nhà bán</th><th>Gian hàng</th><th>Trạng thái đơn</th>
            <th className='text-right'>Đã thu</th><th className='text-right'>Thực nhận</th><th>Giải ngân</th><th />
          </tr></thead>
          <tbody>{data.content.map(row => <tr key={row.sellerOrderId}>
            <td>
              <span className='font-semibold text-gray-900'>{row.sellerOrderNo}</span>
              <p className='m-0 text-xs text-gray-500'>Đơn {row.orderNo}</p>
              {row.placedAt && <p className='m-0 text-xs text-gray-500'>{formatDateTime(row.placedAt)}</p>}
            </td>
            <td>{row.storeName}</td>
            <td><StatusBadge map={ORDER_STATUS} status={row.orderStatus} /></td>
            <td className='text-right whitespace-nowrap'>{formatVnd(row.grossCollected)}</td>
            <td className='text-right whitespace-nowrap'>{formatVnd(row.netPayout)}
              {row.feeEstimated && row.netPayout !== null && row.netPayout > 0 &&
                <p className='m-0 text-xs text-gray-500'>tạm tính</p>}</td>
            <td>
              <StatusBadge map={PAYOUT_STATUS} status={row.payoutStatus} />
              {row.payoutStatus === 'BLOCKED' && row.blockingReasons.length > 0 &&
                <ul className='m-0 mt-1 pl-4 list-disc text-xs text-gray-500'>
                  {row.blockingReasons.map(code => <li key={code}>{blockingReasons[code] ?? code}</li>)}
                </ul>}
            </td>
            <td><button type='button' className='mss-button mss-button--secondary mss-button--sm whitespace-nowrap'
              onClick={() => onOpen(row)}>Xử lý</button></td>
          </tr>)}</tbody>
        </table></div>}
      {data.totalPages > 1 && <nav className='flex items-center justify-end gap-2 text-sm' aria-label='Phân trang đơn nhà bán'>
        <button type='button' className='mss-button mss-button--secondary mss-button--sm'
          disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
          <ChevronLeft className='w-4 h-4' aria-hidden /> Trước
        </button>
        <span className='text-gray-600'>Trang {data.page + 1} / {data.totalPages}</span>
        <button type='button' className='mss-button mss-button--secondary mss-button--sm'
          disabled={page + 1 >= data.totalPages} onClick={() => setPage(p => p + 1)}>
          Sau <ChevronRight className='w-4 h-4' aria-hidden />
        </button>
      </nav>}
    </section>}
  </>;
}
