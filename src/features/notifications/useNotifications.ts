import { useCallback, useEffect, useState } from 'react';
import { notificationApi, type AppNotification } from '../../services/api/notificationApi';
import { errorMessage } from '../../services/api/http';

const POLL_MS = 30000;
const PAGE_SIZE = 20;

/**
 * Notifications of the logged-in user (Identity). The unread count is polled every 30 s while the page
 * is visible and on window focus; the list is loaded when the panel opens (`load`).
 */
export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCount = useCallback(() => {
    notificationApi.unreadCount()
      .then((result) => setUnreadCount(result.unreadCount))
      .catch(() => { /* keep the last count; the panel shows errors when opened */ });
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      notificationApi.unreadCount()
        .then((result) => { if (active) setUnreadCount(result.unreadCount); })
        .catch(() => { /* keep the last count */ });
    };
    refresh();
    const timer = window.setInterval(refresh, POLL_MS);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await notificationApi.list(0, PAGE_SIZE);
      setItems(page.items);
      refreshCount();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setLoading(false);
    }
  }, [refreshCount]);

  const markRead = useCallback(async (notification: AppNotification) => {
    if (notification.read) return;
    const now = new Date().toISOString();
    setItems((list) => list.map((item) => item.notificationId === notification.notificationId
      ? { ...item, read: true, readAt: item.readAt ?? now } : item));
    setUnreadCount((count) => Math.max(0, count - 1));
    try {
      await notificationApi.markRead(notification.notificationId);
    } catch {
      refreshCount();
    }
  }, [refreshCount]);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setItems((list) => list.map((item) => (item.read ? item : { ...item, read: true, readAt: now })));
    setUnreadCount(0);
    try {
      await notificationApi.markAllRead();
    } catch (failure) {
      setError(errorMessage(failure));
      refreshCount();
    }
  }, [refreshCount]);

  return { unreadCount, items, loading, error, load, markRead, markAllRead };
}
