import { useEffect, useState } from 'react';
import { conversationApi } from './api';

/** Fired after an open chat marks its conversation read, so the navbar badge refreshes at once. */
export const CHAT_READ_EVENT = 'mooncake:chat-read';
const POLL_MS = 10000;

/** Unread chat messages of the logged-in user (RFQ service), polled while the page is visible. */
export function useUnreadMessages(enabled: boolean): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    let active = true;
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      conversationApi.unreadCount()
        .then((result) => { if (active) setCount(result.unreadCount); })
        .catch(() => { /* keep the last count; chat errors are shown in the chat view */ });
    };
    refresh();
    const timer = window.setInterval(refresh, POLL_MS);
    window.addEventListener('focus', refresh);
    window.addEventListener(CHAT_READ_EVENT, refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener(CHAT_READ_EVENT, refresh);
    };
  }, [enabled]);

  return count;
}
