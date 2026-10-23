import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, MessageSquare } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';
import { errorMessage } from '../../services/api/http';
import { formatDateTime } from '../../utils/format';
import { lookupApi, rfqApi } from '../rfq/api';
import { ErrorBlock, LoadingRows, Pager } from '../rfq/components/ui';
import type { PageResult } from '../rfq/types';
import { Conversation, conversationApi } from './api';
import ChatPanel from './ChatPanel';

interface ConversationsViewProps {
  myUserId: string;
  myCustomerId: string | null;
  selectedId: string | null;
  onSelect: (conversationId: string | null) => void;
  onOpenRfq: (rfqId: string) => void;
}

interface Labels {
  title: string;
  counterpart: string;
}

const rfqTitles = new Map<string, Promise<string>>();
function rfqTitle(rfqId: string) {
  if (!rfqTitles.has(rfqId)) {
    rfqTitles.set(rfqId, rfqApi.get(rfqId).then((r) => r.title).catch(() => `RFQ #${rfqId}`));
  }
  return rfqTitles.get(rfqId)!;
}

export default function ConversationsView({ myUserId, myCustomerId, selectedId, onSelect, onOpenRfq }: ConversationsViewProps) {
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<PageResult<Conversation> | null>(null);
  const [error, setError] = useState('');
  const [labels, setLabels] = useState<Record<string, Labels>>({});
  const [selected, setSelected] = useState<Conversation | null>(null);

  const load = useCallback(() => {
    setError('');
    setResult(null);
    conversationApi
      .list({ page })
      .then(setResult)
      .catch((e) => setError(errorMessage(e)));
  }, [page]);

  useEffect(load, [load]);

  // Opened from an RFQ: the conversation may not be on the current page.
  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    const known = result?.items.find((c) => c.conversationId === selectedId);
    if (known) setSelected(known);
    else conversationApi.get(selectedId).then(setSelected).catch((e) => setError(errorMessage(e)));
  }, [selectedId, result]);

  useEffect(() => {
    const conversations = [...(result?.items ?? []), ...(selected ? [selected] : [])];
    conversations.forEach((c) => {
      if (labels[c.conversationId]) return;
      const buyer = c.customerId === myCustomerId;
      Promise.all([
        rfqTitle(c.rfqId),
        buyer ? lookupApi.supplierStore(c.supplierId).then((s) => s?.name ?? `Nhà cung cấp #${c.supplierId}`) : Promise.resolve('Người mua')
      ]).then(([title, counterpart]) => setLabels((prev) => ({ ...prev, [c.conversationId]: { title, counterpart } })));
    });
  }, [result, selected, myCustomerId, labels]);

  const label = (c: Conversation): Labels => labels[c.conversationId] ?? { title: `RFQ #${c.rfqId}`, counterpart: '…' };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <section className={`mss-stack ${selected ? 'hidden lg:flex' : ''}`} aria-label="Danh sách hội thoại">
        {error && <ErrorBlock message={error} onRetry={load} />}
        {!result && !error && <LoadingRows rows={4} />}
        {result && result.items.length === 0 && (
          <EmptyState title="Chưa có hội thoại" description="Mở trao đổi từ trang chi tiết RFQ hoặc báo giá." />
        )}
        {result && result.items.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {result.items.map((c) => {
              const active = c.conversationId === selected?.conversationId;
              const l = label(c);
              return (
                <li key={c.conversationId}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.conversationId)}
                    aria-current={active ? 'true' : undefined}
                    className={`mss-card w-full cursor-pointer p-4 text-left transition-colors ${
                      active ? 'border-[var(--mss-primary)] bg-[var(--mss-primary-soft)]' : 'hover:bg-[var(--mss-bg)]'
                    }`}
                  >
                    <span className="flex items-center gap-2 font-semibold text-gray-900">
                      <MessageSquare className="h-4 w-4 shrink-0 text-[var(--mss-primary)]" aria-hidden />
                      <span className="truncate">{l.counterpart}</span>
                    </span>
                    <span className="mt-1 block truncate text-sm text-gray-600">{l.title}</span>
                    <span className="mt-1 block text-xs text-gray-500">Mở lúc {formatDateTime(c.createdAt)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {result && <Pager page={result.page} totalPages={result.totalPages} onChange={setPage} />}
      </section>

      <div className={selected ? '' : 'hidden lg:block'}>
        {selected ? (
          <div className="mss-stack">
            <ChatPanel
              key={selected.conversationId}
              conversationId={selected.conversationId}
              conversationStatus={selected.status}
              title={label(selected).counterpart}
              subtitle={label(selected).title}
              myUserId={myUserId}
              onBack={() => onSelect(null)}
            />
            <button type="button" className="mss-button mss-button--secondary self-start" onClick={() => onOpenRfq(selected.rfqId)}>
              <ExternalLink className="h-4 w-4" aria-hidden />
              Xem yêu cầu báo giá
            </button>
          </div>
        ) : (
          <EmptyState title="Chọn một hội thoại" description="Tin nhắn được lưu trước khi gửi tới đối tác; mở lại sẽ tải đầy đủ lịch sử." />
        )}
      </div>
    </div>
  );
}
