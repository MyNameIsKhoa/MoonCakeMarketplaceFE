import { API_BASE_URL, apiRequest } from '../../services/api/http';
import type { PageResult } from '../rfq/types';

export type ConversationStatus = 'OPEN' | 'CLOSED' | 'BLOCKED';

export interface Conversation {
  conversationId: string;
  rfqId: string;
  customerId: string;
  supplierId: string;
  status: ConversationStatus;
  createdAt: string;
}

export interface ChatMessage {
  messageId: string;
  conversationId: string;
  senderUserId: string;
  messageType: 'TEXT';
  content: string;
  sentAt: string;
  clientMessageId: string | null;
}

export interface MessagePage {
  items: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const CHAT_SOCKET_URL = `${API_BASE_URL.replace(/^http/, 'ws')}/ws/chat`;
export const MAX_MESSAGE_LENGTH = 10000;

export const conversationApi = {
  /** Buyer passes the supplier to talk to; a supplier opens with its own profile (no body). 200 = existing. */
  open: (rfqId: string, supplierId?: string) =>
    apiRequest<Conversation>(`/api/rfqs/${rfqId}/conversations`, {
      method: 'POST',
      body: supplierId ? { supplierId } : {}
    }),
  list: (params: { rfqId?: string; page?: number } = {}) => {
    const search = new URLSearchParams({ size: '20', sort: 'createdAt,desc', page: String(params.page ?? 0) });
    if (params.rfqId) search.set('rfqId', params.rfqId);
    return apiRequest<PageResult<Conversation>>(`/api/conversations?${search}`);
  },
  get: (conversationId: string) => apiRequest<Conversation>(`/api/conversations/${conversationId}`),
  /** Messages from the other party after the caller's last read, across all conversations. */
  unreadCount: () => apiRequest<{ unreadCount: number }>('/api/conversations/unread-count'),
  /** Marks the conversation read up to its newest message (204). */
  markRead: (conversationId: string) =>
    apiRequest<void>(`/api/conversations/${conversationId}/read`, { method: 'POST' }),
  /** Items are ascending by messageId; cursors are exclusive and never combined. */
  history: (conversationId: string, cursor: { beforeMessageId?: string; afterMessageId?: string } = {}) => {
    const search = new URLSearchParams({ limit: '50' });
    if (cursor.beforeMessageId) search.set('beforeMessageId', cursor.beforeMessageId);
    if (cursor.afterMessageId) search.set('afterMessageId', cursor.afterMessageId);
    return apiRequest<MessagePage>(`/api/conversations/${conversationId}/messages?${search}`);
  }
};
