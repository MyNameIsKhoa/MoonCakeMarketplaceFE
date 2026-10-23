import { FormEvent, useCallback, useEffect, useState } from 'react';
import { CalendarClock, Package, Plus, Search, Wallet } from 'lucide-react';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import { errorMessage } from '../../../services/api/http';
import { formatDate, formatDateTime } from '../../../utils/format';
import { RFQ_STATUS } from '../../../utils/status';
import { rfqApi } from '../api';
import { formatMoney } from '../format';
import type { PageResult, Rfq, RfqStatus } from '../types';
import { ErrorBlock, LoadingRows, Pager } from './ui';

interface RfqListProps {
  mine: boolean;
  onOpen: (rfqId: string) => void;
  onCreate?: () => void;
}

const FEED_FILTERS: { label: string; status?: RfqStatus }[] = [
  { label: 'Tất cả' },
  { label: 'Đang nhận báo giá', status: 'OPEN' },
  { label: 'Ngừng nhận báo giá', status: 'CLOSED' }
];
const MINE_FILTERS: { label: string; status?: RfqStatus }[] = [...FEED_FILTERS, { label: 'Đã hủy', status: 'CANCELLED' }];

export function isIntakeExpired(rfq: Rfq): boolean {
  return rfq.status === 'OPEN' && !!rfq.expiresAt && new Date(rfq.expiresAt).getTime() <= Date.now();
}

export default function RfqList({ mine, onOpen, onCreate }: RfqListProps) {
  const filters = mine ? MINE_FILTERS : FEED_FILTERS;
  const [status, setStatus] = useState<RfqStatus | undefined>(undefined);
  const [draftQuery, setDraftQuery] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<PageResult<Rfq> | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    setResult(null);
    rfqApi
      .list({ q: q || undefined, mine, status, page })
      .then(setResult)
      .catch((e) => setError(errorMessage(e)));
  }, [q, mine, status, page]);

  useEffect(load, [load]);

  const search = (event: FormEvent) => {
    event.preventDefault();
    setPage(0);
    setQ(draftQuery.trim());
  };

  return (
    <div className="mss-stack">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <form onSubmit={search} className="flex w-full gap-2 md:max-w-md" role="search">
          <label htmlFor={`rfq-search-${mine}`} className="sr-only">
            Tìm yêu cầu báo giá
          </label>
          <input
            id={`rfq-search-${mine}`}
            className="mss-input"
            type="search"
            value={draftQuery}
            maxLength={255}
            onChange={(e) => setDraftQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề hoặc mô tả…"
          />
          <button type="submit" className="mss-button mss-button--secondary">
            <Search className="h-4 w-4" aria-hidden />
            Tìm
          </button>
        </form>
        {onCreate && (
          <button type="button" className="mss-button mss-button--primary" onClick={onCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Tạo yêu cầu báo giá
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Lọc theo trạng thái">
        {filters.map((f) => (
          <button
            key={f.label}
            type="button"
            aria-pressed={status === f.status}
            onClick={() => {
              setStatus(f.status);
              setPage(0);
            }}
            className={`mss-button mss-button--sm whitespace-nowrap ${status === f.status ? 'mss-button--primary' : 'mss-button--secondary'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <ErrorBlock message={error} onRetry={load} />}
      {!result && !error && <LoadingRows />}
      {result && result.items.length === 0 && (
        <EmptyState
          title={mine ? 'Bạn chưa có yêu cầu báo giá nào' : 'Chưa có yêu cầu báo giá phù hợp'}
          description={
            mine
              ? 'Tạo yêu cầu để các nhà cung cấp đã xác minh gửi báo giá cho bạn.'
              : 'Thử từ khóa khác hoặc bỏ bộ lọc trạng thái.'
          }
          action={
            onCreate && (
              <button type="button" className="mss-button mss-button--primary" onClick={onCreate}>
                Tạo yêu cầu báo giá
              </button>
            )
          }
        />
      )}

      {result && result.items.length > 0 && (
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
          {result.items.map((rfq) => (
            <li key={rfq.rfqId} className="mss-card flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="mss-card-title break-words">{rfq.title}</h3>
                  <p className="mss-card-meta">
                    {rfq.rfqCode} · Đăng {formatDateTime(rfq.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <StatusBadge map={RFQ_STATUS} status={rfq.status} />
                  {isIntakeExpired(rfq) && <span className="mss-badge mss-badge--warning">Hết hạn nhận báo giá</span>}
                </div>
              </div>
              {rfq.description && <p className="m-0 line-clamp-2 text-sm text-gray-600">{rfq.description}</p>}
              <dl className="m-0 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                  <dt className="sr-only">Số lượng</dt>
                  <dd className="m-0">{rfq.quantity.toLocaleString('vi-VN')} sản phẩm</dd>
                </div>
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                  <dt className="sr-only">Ngân sách</dt>
                  <dd className="m-0">{rfq.budgetAmount ? formatMoney(rfq.budgetAmount) : 'Ngân sách thỏa thuận'}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                  <dt className="sr-only">Giao trước</dt>
                  <dd className="m-0">
                    {rfq.requestedDeliveryDate ? `Giao trước ${formatDate(rfq.requestedDeliveryDate)}` : 'Chưa chốt ngày giao'}
                  </dd>
                </div>
              </dl>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-gray-500">
                  {rfq.expiresAt ? `Nhận báo giá đến ${formatDateTime(rfq.expiresAt)}` : 'Không giới hạn thời gian'}
                </span>
                <button type="button" className="mss-button mss-button--secondary mss-button--sm" onClick={() => onOpen(rfq.rfqId)}>
                  Xem chi tiết
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {result && <Pager page={result.page} totalPages={result.totalPages} onChange={setPage} />}
    </div>
  );
}
