import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import type { AppNotification } from '../../services/api/notificationApi';
import { formatDateTime } from '../../utils/format';
import { destinationOf, relativeTime, type NotificationDestination } from './targets';
import { useNotifications } from './useNotifications';

interface NotificationBellProps {
  /** Opens the tab a clicked notification points to (see destinationOf). */
  onOpen: (destination: NotificationDestination) => void;
}

/** Navbar bell for logged-in users: unread badge and a panel of the 20 newest notifications. */
export default function NotificationBell({ onOpen }: NotificationBellProps) {
  const { unreadCount, items, loading, error, load, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const toggle = () => {
    if (!open) void load();
    setOpen((value) => !value);
  };

  const openNotification = (notification: AppNotification) => {
    void markRead(notification);
    const destination = destinationOf(notification.target);
    if (destination) {
      setOpen(false);
      onOpen(destination);
    }
  };

  const badge = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className={`p-2.5 text-gray-700 rounded-full relative transition ${open ? 'bg-primary-100' : 'hover:bg-gray-100'}`}
        title="Thông báo"
        aria-label={unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-0.5 bg-red-600 text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Thông báo"
          className="fixed inset-x-2 top-20 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white rounded-2xl border border-accent-200 shadow-2xl z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-900">
              Thông báo
              {unreadCount > 0 && <span className="ml-1.5 text-xs font-semibold text-primary-700">({unreadCount} chưa đọc)</span>}
            </p>
            <button
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0}
              className="flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-900 disabled:text-gray-300 disabled:cursor-not-allowed transition"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Đánh dấu tất cả đã đọc</span>
            </button>
          </div>

          <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto">
            {error && <p className="px-4 py-3 text-xs text-red-700 bg-red-50">{error}</p>}
            {loading && items.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-500">Đang tải thông báo…</p>}
            {!loading && !error && items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-500">Bạn chưa có thông báo nào.</p>
            )}
            <ul className="divide-y divide-gray-100">
              {items.map((notification) => (
                <li key={notification.notificationId}>
                  <button
                    onClick={() => openNotification(notification)}
                    className={`w-full text-left px-4 py-3 flex gap-3 transition hover:bg-accent-50/70 ${notification.read ? '' : 'bg-primary-50/40'}`}
                  >
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${notification.read ? 'bg-transparent' : 'bg-primary-700'}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm break-words ${notification.read ? 'text-gray-700' : 'font-bold text-gray-900'}`}>
                        {notification.title}
                        {!notification.read && <span className="sr-only"> (chưa đọc)</span>}
                      </span>
                      {notification.body && (
                        <span className="block text-xs text-gray-600 mt-0.5 line-clamp-2 break-words">{notification.body}</span>
                      )}
                      <time
                        dateTime={notification.createdAt}
                        title={formatDateTime(notification.createdAt)}
                        className="block text-[11px] text-gray-400 mt-1"
                      >
                        {relativeTime(notification.createdAt)}
                      </time>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
