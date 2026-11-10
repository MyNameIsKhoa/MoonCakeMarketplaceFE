import { useEffect, useId, useRef, useState } from 'react';
import { MessageCircle, Minus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ConversationsView from './ConversationsView';
import { OPEN_CONVERSATION_CHAT_EVENT, type OpenConversationChatDetail } from './chatWidgetEvents';
import { useUnreadMessages } from './useUnreadMessages';

export interface FloatingChatWidgetProps {
  open: boolean;
  onClose: () => void;
  conversationId?: string | null;
  onSelectConversation?: (conversationId: string | null) => void;
  onOpenRfq?: (rfqId: string) => void;
}

/** Mount once inside AuthProvider. App listens to chatWidgetEvents to open this controlled widget. */
export default function FloatingChatWidget(props: FloatingChatWidgetProps) {
  const { isAuthenticated, user } = useAuth();
  const accountId = isAuthenticated && user ? String(user.userId) : null;
  const previousAccount = useRef(accountId);
  const accountChanged = previousAccount.current !== accountId;

  useEffect(() => {
    const hadAccount = previousAccount.current !== null;
    previousAccount.current = accountId;
    if (accountChanged && hadAccount) {
      props.onSelectConversation?.(null);
      props.onClose();
    }
  }, [accountId, accountChanged, props.onClose, props.onSelectConversation]);

  if (!user || !accountId || !props.open || (accountChanged && previousAccount.current !== null)) return null;
  return (
    <ChatSession
      key={accountId}
      {...props}
      myUserId={accountId}
      myCustomerId={user.customerId == null ? null : String(user.customerId)}
    />
  );
}

function ChatSession({ conversationId = null, onClose, onSelectConversation, onOpenRfq, myUserId, myCustomerId }:
  FloatingChatWidgetProps & { myUserId: string; myCustomerId: string | null }) {
  const [selectedId, setSelectedId] = useState(conversationId);
  const [minimized, setMinimized] = useState(false);
  const unread = useUnreadMessages(true, myUserId);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedId(conversationId);
    setMinimized(false);
  }, [conversationId]);

  useEffect(() => {
    const restore = (event: Event) => {
      const detail = (event as CustomEvent<OpenConversationChatDetail>).detail;
      setSelectedId(detail?.conversationId ?? null);
      setMinimized(false);
    };
    window.addEventListener(OPEN_CONVERSATION_CHAT_EVENT, restore);
    return () => window.removeEventListener(OPEN_CONVERSATION_CHAT_EVENT, restore);
  }, []);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, [minimized]);

  const select = (id: string | null) => {
    setSelectedId(id);
    onSelectConversation?.(id);
  };
  const close = () => {
    select(null);
    onClose();
  };
  const badge = unread > 0 && (
    <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white" aria-label={`${unread} tin nhắn chưa đọc`}>
      {unread > 99 ? '99+' : unread}
    </span>
  );

  return (
    <div
      ref={panelRef}
      role={minimized ? 'region' : 'dialog'}
      aria-modal={minimized ? undefined : false}
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          close();
        }
      }}
      className={`fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-[var(--mss-border)] bg-[var(--mss-surface)] text-[var(--mss-text)] shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--mss-primary)] sm:right-6 ${
        minimized ? 'w-auto' : 'h-[min(42rem,calc(100dvh-2rem))] w-[400px]'
      }`}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--mss-border)] p-3">
        {minimized ? (
          <button type="button" className="mss-button mss-button--secondary min-h-11" onClick={() => setMinimized(false)} aria-label="Mở lại tin nhắn với đối tác">
            <MessageCircle className="h-5 w-5" aria-hidden />
            <span id={titleId}>Tin nhắn đối tác</span>
            {badge}
          </button>
        ) : (
          <>
            <MessageCircle className="h-5 w-5 shrink-0 text-[var(--mss-primary)]" aria-hidden />
            <h2 id={titleId} className="min-w-0 flex-1 text-base font-semibold">Tin nhắn đối tác</h2>
            {badge}
            <button type="button" className="mss-button mss-button--secondary min-h-11 min-w-11 p-2" onClick={() => setMinimized(true)} aria-label="Thu nhỏ tin nhắn">
              <Minus className="h-4 w-4" aria-hidden />
            </button>
          </>
        )}
        <button type="button" className="mss-button mss-button--secondary min-h-11 min-w-11 p-2" onClick={close} aria-label="Đóng tin nhắn">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </header>
      <div hidden={minimized} className={minimized ? 'hidden' : 'min-h-0 flex-1'}>
        <ConversationsView
          compact
          visible={!minimized}
          myUserId={myUserId}
          myCustomerId={myCustomerId}
          selectedId={selectedId}
          onSelect={select}
          onOpenRfq={onOpenRfq}
        />
      </div>
    </div>
  );
}
