import { useEffect, useRef, useState } from 'react';
import { ExternalLink, MessageSquare, RotateCw } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';
import { errorMessage } from '../../services/api/http';
import { formatDateTime } from '../../utils/format';
import { lookupApi, rfqApi } from '../rfq/api';
import { ErrorBlock, LoadingRows, Pager } from '../rfq/components/ui';
import type { PageResult } from '../rfq/types';
import { type Conversation, conversationApi } from './api';
import ChatPanel from './ChatPanel';

interface ConversationsViewProps {
  myUserId: string;
  myCustomerId: string | null;
  selectedId: string | null;
  onSelect: (conversationId: string | null) => void;
  onOpenRfq?: (rfqId: string) => void;
  compact?: boolean;
  visible?: boolean;
}

interface Labels {
  title: string;
  counterpart: string;
}

export default function ConversationsView(props: ConversationsViewProps) {
  // Scope pages, private RFQ labels, history and connections to this account.
  return <ConversationInbox key={props.myUserId} {...props} />;
}

function ConversationInbox({ myUserId, myCustomerId, selectedId, onSelect, onOpenRfq, compact = false, visible = true }: ConversationsViewProps) {
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [result, setResult] = useState<PageResult<Conversation> | null>(null);
  const [error, setError] = useState('');
  const [labels, setLabels] = useState<Record<string, Labels>>({});
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [selectionError, setSelectionError] = useState<{ id: string; message: string } | null>(null);
  const titles = useRef(new Map<string, Promise<string>>());

  useEffect(() => {
    let active = true;
    setError('');
    setResult(null);
    conversationApi.list({ page })
      .then((data) => { if (active) setResult(data); })
      .catch((e) => { if (active) setError(errorMessage(e)); });
    return () => { active = false; };
  }, [page, revision]);

  // Fetch independently of pagination: an RFQ can open a thread on any inbox page.
  useEffect(() => {
    let active = true;
    setSelected(null);
    setSelectionError(null);
    if (selectedId) {
      conversationApi.get(selectedId)
        .then((data) => { if (active) setSelected(data); })
        .catch((e) => { if (active) setSelectionError({ id: selectedId, message: errorMessage(e) }); });
    }
    return () => { active = false; };
  }, [selectedId, selectionRevision]);

  // Never render the previous thread while a new ID is loading or failing.
  const current = selected?.conversationId === selectedId ? selected : null;
  const currentError = selectionError?.id === selectedId ? selectionError.message : '';

  useEffect(() => {
    let active = true;
    const conversations = [...(result?.items ?? []), ...(current ? [current] : [])];
    const unique = [...new Map(conversations.map((c) => [c.conversationId, c])).values()];
    unique.forEach((c) => {
      if (!titles.current.has(c.rfqId)) {
        titles.current.set(c.rfqId, rfqApi.get(c.rfqId)
          .then((r) => `Yêu cầu báo giá: ${r.title}`)
          .catch(() => `Yêu cầu báo giá #${c.rfqId}`));
      }
      const buyer = c.customerId === myCustomerId;
      Promise.all([
        titles.current.get(c.rfqId)!,
        buyer
          ? lookupApi.supplierStore(c.supplierId).then((s) => s?.name ?? `Nhà cung cấp #${c.supplierId}`)
          : Promise.resolve(c.customerName || 'Người mua')
      ]).then(([title, counterpart]) => {
        if (active) setLabels((prev) => ({ ...prev, [c.conversationId]: { title, counterpart } }));
      }).catch(() => { /* IDs remain readable if a label lookup fails. */ });
    });
    return () => { active = false; };
  }, [result, current, myCustomerId]);

  const label = (c: Conversation): Labels => labels[c.conversationId] ?? {
    title: `Yêu cầu báo giá #${c.rfqId}`,
    counterpart: c.customerId === myCustomerId ? `Nhà cung cấp #${c.supplierId}` : c.customerName || 'Người mua'
  };

  return (
    <div className={compact ? 'flex h-full min-h-0 flex-col' : 'grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]'}>
      <section
        className={`mss-stack ${compact ? `min-h-0 overflow-y-auto p-3 ${selectedId ? 'hidden' : ''}` : selectedId ? 'hidden lg:flex' : ''}`}
        aria-label="Danh sách hội thoại"
      >
        <button type="button" className="mss-button mss-button--secondary mss-button--sm self-start" onClick={() => setRevision((n) => n + 1)}>
          <RotateCw className="h-4 w-4" aria-hidden /> Làm mới hội thoại
        </button>
        {error && <ErrorBlock message={error} onRetry={() => setRevision((n) => n + 1)} />}
        {!result && !error && <LoadingRows rows={4} />}
        {result && result.items.length === 0 && (
          <EmptyState title="Chưa có hội thoại" description="Mở trao đổi từ trang chi tiết RFQ hoặc báo giá." />
        )}
        {result && result.items.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {result.items.map((c) => {
              const l = label(c);
              return (
                <li key={c.conversationId}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.conversationId)}
                    aria-current={c.conversationId === selectedId ? 'true' : undefined}
                    className={`mss-card w-full cursor-pointer p-4 text-left transition-colors ${
                      c.conversationId === selectedId ? 'border-[var(--mss-primary)] bg-[var(--mss-primary-soft)]' : 'hover:bg-[var(--mss-bg)]'
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

      <div className={compact ? `min-h-0 flex-1 ${selectedId ? 'flex flex-col' : 'hidden'}` : selectedId ? '' : 'hidden lg:block'}>
        {selectedId ? (
          <div className={compact ? 'flex min-h-0 flex-1 flex-col' : 'mss-stack'}>
            {currentError ? (
              <div className="mss-stack p-3">
                <button type="button" className="mss-button mss-button--secondary self-start" onClick={() => onSelect(null)}>Quay lại danh sách hội thoại</button>
                <ErrorBlock message={currentError} onRetry={() => setSelectionRevision((n) => n + 1)} />
              </div>
            ) : current ? (
              <>
                <ChatPanel
                  key={current.conversationId}
                  compact={compact}
                  active={visible}
                  conversationId={current.conversationId}
                  conversationStatus={current.status}
                  title={label(current).counterpart}
                  subtitle={label(current).title}
                  myUserId={myUserId}
                  onBack={() => onSelect(null)}
                />
                {onOpenRfq && (
                  <button type="button" className="mss-button mss-button--secondary shrink-0 self-start" onClick={() => onOpenRfq(current.rfqId)}>
                    <ExternalLink className="h-4 w-4" aria-hidden /> Xem yêu cầu báo giá
                  </button>
                )}
              </>
            ) : (
              <div className="mss-stack p-3">
                <button type="button" className="mss-button mss-button--secondary self-start" onClick={() => onSelect(null)}>Quay lại danh sách hội thoại</button>
                <LoadingRows label="Đang tải hội thoại…" rows={2} />
              </div>
            )}
          </div>
        ) : (
          <EmptyState title="Chọn một hội thoại" description="Tin nhắn được lưu trước khi gửi tới đối tác; mở lại sẽ tải đầy đủ lịch sử." />
        )}
      </div>
    </div>
  );
}
