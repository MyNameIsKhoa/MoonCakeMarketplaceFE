/**
 * In-app notifications (Identity Service) through the API Gateway. Every call is for the logged-in user;
 * a user only ever sees their own notifications.
 */
import { http } from './http';

/**
 * Where a notification points. `kind` is ORDER | RFQ | QUOTATION | CONVERSATION (other kinds may be added);
 * `role: 'SELLER'` marks the supplier's side (seller center). IDs may be strings or numbers.
 */
export interface NotificationTarget {
  kind: string;
  id?: string | number;
  role?: string;
  rfqId?: string | number;
  quotationId?: string | number;
  [field: string]: string | number | boolean | null | undefined;
}

export interface AppNotification {
  notificationId: number;
  /** e.g. QUOTATION_RECEIVED, ORDER_CANCELLED, CHAT_MESSAGE. */
  type: string;
  title: string;
  body: string | null;
  target: NotificationTarget | null;
  /** UTC without a zone suffix: read with parseApiDate. */
  createdAt: string;
  readAt: string | null;
  read: boolean;
}

export interface NotificationPage {
  items: AppNotification[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const notificationApi = {
  /** Newest first; size 1..50. */
  list: async (page = 0, size = 20) =>
    (await http.get<NotificationPage>('/api/notifications', { params: { page, size } })).data,
  unreadCount: async () =>
    (await http.get<{ unreadCount: number }>('/api/notifications/unread-count')).data,
  /** 404 for a notification that is not the user's. Marking again keeps the first readAt. */
  markRead: async (notificationId: number) =>
    (await http.post<AppNotification>(`/api/notifications/${notificationId}/read`)).data,
  markAllRead: async () =>
    (await http.post<{ updated: number }>('/api/notifications/read-all')).data
};
