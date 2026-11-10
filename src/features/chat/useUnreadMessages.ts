import { useEffect, useState } from 'react';
import { conversationApi } from './api';

/** Fired after an open chat marks its conversation read, so the navbar badge refreshes at once. */
export const CHAT_READ_EVENT = 'mooncake:chat-read';
const POLL_MS = 10000;

/** Unread chat messages of the logged-in user (RFQ service), polled while the page is visible. */
export function useUnreadMessages(enabled: boolean, accountId?: string): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    if (!enabled) return;
    let active = true;
    let request = 0;
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      const current = ++request;
      conversationApi.unreadCount()
        .then((result) => { if (active && current === request) setCount(result.unreadCount); })
        .catch(() => { /* keep the last count; chat errors are shown in the chat view */ });
    };
    refresh();
    const timer = window.setInterval(refresh, POLL_MS);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener(CHAT_READ_EVENT, refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener(CHAT_READ_EVENT, refresh);
    };
  }, [enabled, accountId]);

  return enabled ? count : 0;
}
