import { FormEvent, KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, Loader2, RotateCw, Send, Wifi, WifiOff, X } from 'lucide-react';
import { formatDateTime } from '../../utils/format';
import { CONVERSATION_STATUS } from '../../utils/status';
import StatusBadge from '../../components/ui/StatusBadge';
import { ErrorBlock } from '../rfq/components/ui';
import { ConversationStatus, MAX_MESSAGE_LENGTH } from './api';
import { ConnectionState, useChatThread } from './useChatThread';

interface ChatPanelProps {
  conversationId: string;
  conversationStatus: ConversationStatus;
  title: string;
  subtitle?: string;
  myUserId: string;
  onBack?: () => void;
}

const CONNECTION_LABEL: Record<ConnectionState, string> = {
  connecting: 'Đang kết nối…',
  online: 'Trực tuyến',
  reconnecting: 'Mất kết nối — đang thử lại…',
  expired: 'Phiên đăng nhập hết hạn — hãy đăng nhập lại'
};

export default function ChatPanel({ conversationId, conversationStatus, title, subtitle, myUserId, onBack }: ChatPanelProps) {
  const thread = useChatThread(conversationId);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const lastId = thread.messages.at(-1)?.messageId;
  const canSend = conversationStatus === 'OPEN' && thread.connection === 'online';

  // Follow new messages (not older pages being prepended).
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId, thread.pending.length]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || !canSend || content.length > MAX_MESSAGE_LENGTH) return;
    thread.send(content);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const online = thread.connection === 'online';

  return (
    <section className="mss-card flex min-w-0 flex-col gap-0 p-0" aria-label={`Hội thoại: ${title}`}>
      <header className="flex items-center gap-3 border-b border-[var(--mss-border)] p-4">
        {onBack && (
          <button type="button" className="mss-button mss-button--secondary mss-button--sm" onClick={onBack} aria-label="Quay lại danh sách hội thoại">
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="mss-card-title truncate">{title}</h2>
          {subtitle && <p className="mss-card-meta truncate">{subtitle}</p>}
        </div>
        <StatusBadge map={CONVERSATION_STATUS} status={conversationStatus} />
      </header>

      <p
        className={`flex items-center gap-2 px-4 py-2 text-sm ${online ? 'text-[var(--mss-success)]' : 'text-[var(--mss-warning)]'}`}
        role="status"
        aria-live="polite"
      >
        {online ? <Wifi className="h-4 w-4" aria-hidden /> : <WifiOff className="h-4 w-4" aria-hidden />}
        {CONNECTION_LABEL[thread.connection]}
      </p>

      <div ref={scrollRef} className="flex h-[min(60dvh,560px)] flex-col gap-3 overflow-y-auto bg-[var(--mss-bg)] px-4 py-4">
        {thread.hasOlder && (
          <button
            type="button"
            className="mss-button mss-button--secondary mss-button--sm self-center"
            onClick={thread.loadOlder}
            disabled={thread.loadingOlder}
          >
            {thread.loadingOlder && <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden />}
            Tải tin nhắn cũ hơn
          </button>
        )}
        {thread.loadError && <ErrorBlock message={thread.loadError} />}
        {thread.loading && <p className="text-center text-sm text-gray-500">Đang tải lịch sử…</p>}
        {!thread.loading && thread.messages.length === 0 && thread.pending.length === 0 && (
          <p className="my-auto text-center text-sm text-gray-500">Chưa có tin nhắn. Hãy bắt đầu trao đổi về yêu cầu này.</p>
        )}

        <ol className="m-0 flex list-none flex-col gap-3 p-0" aria-label="Tin nhắn">
          {thread.messages.map((m) => {
            const mine = m.senderUserId === myUserId;
            return (
              <li key={m.messageId} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 sm:max-w-[70%] ${
                    mine
                      ? 'rounded-br-sm bg-[var(--mss-primary)] text-white'
                      : 'rounded-bl-sm border border-[var(--mss-border)] bg-[var(--mss-surface)] text-[var(--mss-text)]'
                  }`}
                >
                  {m.content}
                </div>
                <span className="mt-1 px-1 text-xs text-gray-500">
                  {mine ? 'Bạn' : 'Đối tác'} · {formatDateTime(m.sentAt)}
                </span>
              </li>
            );
          })}
          {thread.pending.map((p) => (
            <li key={p.clientMessageId} className="flex flex-col items-end">
              <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-[var(--mss-primary-soft)] px-4 py-2 text-[var(--mss-text)] sm:max-w-[70%]">
                {p.content}
              </div>
              {p.status === 'sending' ? (
                <span className="mt-1 flex items-center gap-1 px-1 text-xs text-gray-500">
                  <Loader2 className="h-3 w-3 motion-safe:animate-spin" aria-hidden /> Đang gửi…
                </span>
              ) : (
                <span className="mt-1 flex items-center gap-2 px-1 text-xs text-[var(--mss-danger)]" role="alert">
                  Chưa gửi được.
                  <button type="button" className="inline-flex items-center gap-1 font-semibold underline" onClick={() => thread.retry(p.clientMessageId)}>
                    <RotateCw className="h-3 w-3" aria-hidden /> Gửi lại
                  </button>
                  <button type="button" className="inline-flex items-center gap-1 font-semibold underline" onClick={() => thread.discard(p.clientMessageId)}>
                    <X className="h-3 w-3" aria-hidden /> Bỏ
                  </button>
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2 border-t border-[var(--mss-border)] p-4">
        {conversationStatus !== 'OPEN' ? (
          <p className="mss-alert m-0">Hội thoại này đã đóng, không thể gửi tin nhắn mới.</p>
        ) : (
          <>
            <label htmlFor={inputId} className="sr-only">
              Nội dung tin nhắn
            </label>
            <div className="flex items-end gap-2">
              <textarea
                id={inputId}
                className="mss-textarea min-h-[44px] flex-1"
                rows={2}
                value={draft}
                maxLength={MAX_MESSAGE_LENGTH}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)"
              />
              <button type="submit" className="mss-button mss-button--primary" disabled={!canSend || !draft.trim()}>
                <Send className="h-4 w-4" aria-hidden />
                Gửi
              </button>
            </div>
            {draft.length > MAX_MESSAGE_LENGTH - 500 && (
              <p className="m-0 text-right text-xs text-gray-500">
                {draft.length}/{MAX_MESSAGE_LENGTH} ký tự
              </p>
            )}
          </>
        )}
      </form>
    </section>
  );
}
