import { useCallback, useEffect, useState } from 'react';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import { errorMessage } from '../../../services/api/http';
import { formatDateTime } from '../../../utils/format';
import { QUOTATION_STATUS } from '../../../utils/status';
import { quotationApi } from '../api';
import { formatMoney } from '../format';
import type { PageResult, QuotationStatus, QuotationSummary } from '../types';
import { storeLabel, useStoreNames } from '../useStoreNames';
import { ErrorBlock, LoadingRows, Pager } from './ui';

interface MyQuotationsProps {
  onOpen: (rfqId: string, quotationId: string) => void;
}

const FILTERS: { label: string; status?: QuotationStatus }[] = [
  { label: 'Tất cả' },
  { label: 'Đang chờ phản hồi', status: 'SUBMITTED' },
  { label: 'Hết hiệu lực', status: 'EXPIRED' },
  { label: 'Đã chấp nhận', status: 'ACCEPTED' },
  { label: 'Bị từ chối', status: 'REJECTED' },
  { label: 'Đã rút', status: 'CANCELLED' },
  { label: 'Phiên bản cũ', status: 'REVISED' }
];

export default function MyQuotations({ onOpen }: MyQuotationsProps) {
  const [status, setStatus] = useState<QuotationStatus | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<PageResult<QuotationSummary> | null>(null);
  const [error, setError] = useState('');
  const storeNames = useStoreNames((result?.items ?? []).map((q) => q.storeId));

  const load = useCallback(() => {
    setError('');
    setResult(null);
    quotationApi
      .listMine({ status, page })
      .then(setResult)
      .catch((e) => setError(errorMessage(e)));
  }, [status, page]);

  useEffect(load, [load]);

  return (
    <div className="mss-stack">
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Lọc báo giá theo trạng thái">
        {FILTERS.map((f) => (
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
        <EmptyState title="Không có báo giá" description="Mở Sàn yêu cầu báo giá để tìm nhu cầu phù hợp và gửi báo giá đầu tiên." />
      )}
      {result && result.items.length > 0 && (
        <>
          <div className="mss-table-scroll hidden rounded-[var(--mss-radius-lg)] border border-[var(--mss-border)] bg-[var(--mss-surface)] md:block">
            <table className="mss-table">
              <caption className="sr-only">Báo giá của tôi</caption>
              <thead>
                <tr>
                  <th scope="col">RFQ</th>
                  <th scope="col">Cửa hàng · Phiên bản</th>
                  <th scope="col" className="text-right">Tổng giá trị</th>
                  <th scope="col">Hiệu lực đến</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((q) => (
                  <tr key={q.quotationId}>
                    <td>#{q.rfqId}</td>
                    <td>
                      {storeLabel(storeNames, q.storeId)} · v{q.version}
                    </td>
                    <td className="text-right font-semibold tabular-nums">{formatMoney(q.totalAmount)}</td>
                    <td>{formatDateTime(q.validUntil)}</td>
                    <td>
                      <StatusBadge map={QUOTATION_STATUS} status={q.status} />
                    </td>
                    <td>
                      <button type="button" className="mss-button mss-button--secondary mss-button--sm" onClick={() => onOpen(q.rfqId, q.quotationId)}>
                        Mở
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
            {result.items.map((q) => (
              <li key={q.quotationId}>
                <button type="button" className="mss-card w-full cursor-pointer text-left" onClick={() => onOpen(q.rfqId, q.quotationId)}>
                  <span className="flex flex-wrap items-start justify-between gap-2">
                    <span className="font-semibold">
                      RFQ #{q.rfqId} · v{q.version}
                    </span>
                    <StatusBadge map={QUOTATION_STATUS} status={q.status} />
                  </span>
                  <span className="mt-1 block text-sm text-gray-600">{storeLabel(storeNames, q.storeId)}</span>
                  <span className="mt-2 block mss-price">{formatMoney(q.totalAmount)}</span>
                  <span className="mt-1 block text-sm text-gray-500">Hiệu lực đến {formatDateTime(q.validUntil)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {result && <Pager page={result.page} totalPages={result.totalPages} onChange={setPage} />}
    </div>
  );
}
