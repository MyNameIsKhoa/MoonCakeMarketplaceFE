import { Award } from 'lucide-react';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import { formatDate, formatDateTime } from '../../../utils/format';
import { QUOTATION_STATUS } from '../../../utils/status';
import { formatMoney, formatPercent } from '../format';
import type { QuotationSummary } from '../types';
import { storeLabel } from '../useStoreNames';

interface QuotationCompareProps {
  quotations: QuotationSummary[];
  storeNames: Record<string, string>;
  selectedId: string | null;
  showHistory: boolean;
  onToggleHistory: (value: boolean) => void;
  onSelect: (quotationId: string) => void;
}

export default function QuotationCompare({ quotations, storeNames, selectedId, showHistory, onToggleHistory, onSelect }: QuotationCompareProps) {
  const visible = showHistory ? quotations : quotations.filter((q) => q.status !== 'REVISED');
  const acceptable = visible.filter((q) => q.status === 'SUBMITTED');
  // Comparing backend totals only to label the cheapest offer; the value itself is never recomputed.
  const bestId = acceptable.length > 1 ? acceptable.reduce((a, b) => (Number(b.totalAmount) < Number(a.totalAmount) ? b : a)).quotationId : null;

  if (quotations.length === 0) {
    return <EmptyState title="Chưa có báo giá" description="Nhà cung cấp đã xác minh sẽ gửi báo giá tại đây. Bạn có thể mở trao đổi với họ sau khi nhận báo giá." />;
  }

  return (
    <div className="mss-stack">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={showHistory} onChange={(e) => onToggleHistory(e.target.checked)} />
        Hiện cả các phiên bản cũ
      </label>

      {/* Desktop: side-by-side comparison table */}
      <div className="mss-table-scroll hidden rounded-[var(--mss-radius-lg)] border border-[var(--mss-border)] bg-[var(--mss-surface)] md:block">
        <table className="mss-table">
          <caption className="sr-only">So sánh báo giá</caption>
          <thead>
            <tr>
              <th scope="col">Nhà cung cấp</th>
              <th scope="col" className="text-right">Tổng giá trị</th>
              <th scope="col" className="text-right">Cọc</th>
              <th scope="col" className="text-right">Vận chuyển</th>
              <th scope="col">Ngày giao</th>
              <th scope="col">Hiệu lực đến</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((q) => (
              <tr key={q.quotationId} className={q.quotationId === selectedId ? 'bg-[var(--mss-primary-soft)]' : undefined}>
                <td>
                  <span className="font-semibold">{storeLabel(storeNames, q.storeId)}</span>
                  <span className="block text-gray-500">Phiên bản {q.version}</span>
                  {q.quotationId === bestId && (
                    <span className="mss-badge mss-badge--success mt-1">
                      <Award className="h-3 w-3" aria-hidden /> Giá tốt nhất
                    </span>
                  )}
                </td>
                <td className="text-right font-semibold tabular-nums">{formatMoney(q.totalAmount)}</td>
                <td className="text-right tabular-nums">{formatPercent(q.depositPercent)}</td>
                <td className="text-right tabular-nums">{formatMoney(q.shippingFee)}</td>
                <td>{formatDate(q.proposedDeliveryDate)}</td>
                <td>{formatDateTime(q.validUntil)}</td>
                <td>
                  <StatusBadge map={QUOTATION_STATUS} status={q.status} />
                </td>
                <td>
                  <button
                    type="button"
                    className="mss-button mss-button--secondary mss-button--sm whitespace-nowrap"
                    aria-pressed={q.quotationId === selectedId}
                    onClick={() => onSelect(q.quotationId)}
                  >
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per quotation */}
      <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
        {visible.map((q) => (
          <li key={q.quotationId}>
            <button
              type="button"
              onClick={() => onSelect(q.quotationId)}
              aria-pressed={q.quotationId === selectedId}
              className={`mss-card w-full cursor-pointer text-left ${q.quotationId === selectedId ? 'border-[var(--mss-primary)]' : ''}`}
            >
              <span className="flex flex-wrap items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block font-semibold">{storeLabel(storeNames, q.storeId)}</span>
                  <span className="block text-sm text-gray-500">Phiên bản {q.version}</span>
                </span>
                <StatusBadge map={QUOTATION_STATUS} status={q.status} />
              </span>
              <span className="mt-2 block mss-price text-lg">{formatMoney(q.totalAmount)}</span>
              {q.quotationId === bestId && (
                <span className="mss-badge mss-badge--success mt-1">
                  <Award className="h-3 w-3" aria-hidden /> Giá tốt nhất
                </span>
              )}
              <span className="mt-2 block text-sm text-gray-600">
                Cọc {formatPercent(q.depositPercent)} · Giao {formatDate(q.proposedDeliveryDate)} · Hiệu lực đến {formatDateTime(q.validUntil)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
