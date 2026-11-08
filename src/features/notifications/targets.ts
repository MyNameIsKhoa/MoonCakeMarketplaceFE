import type { NotificationTarget } from '../../services/api/notificationApi';
import { formatDateTime, parseApiDate } from '../../utils/format';

/** App tabs a notification can open; 'messages' is the B2B chat (Navbar's onOpenMessages). */
export type NotificationDestination = 'orders' | 'b2b' | 'seller-center' | 'messages';

/**
 * Where clicking a notification goes. Only the tab is opened; the specific order/RFQ is not preselected.
 * - CONVERSATION            → B2B messages
 * - role SELLER (any kind)  → seller center (invites, quotation decisions, seller orders)
 * - ORDER                   → buyer's orders
 * - RFQ / QUOTATION         → B2B portal
 * - no target / unknown     → nothing (the notification is only marked read)
 */
export function destinationOf(target: NotificationTarget | null): NotificationDestination | null {
  if (!target) return null;
  if (target.kind === 'CONVERSATION') return 'messages';
  if (target.role === 'SELLER') return 'seller-center';
  if (target.kind === 'ORDER') return 'orders';
  if (target.kind === 'RFQ' || target.kind === 'QUOTATION') return 'b2b';
  return null;
}

/** "Vừa xong", "5 phút trước", ... up to a week, then the absolute date-time. */
export function relativeTime(value: string, now = Date.now()): string {
  const date = parseApiDate(value);
  if (!date) return '—';
  const minutes = Math.floor((now - date.getTime()) / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return formatDateTime(value);
}
