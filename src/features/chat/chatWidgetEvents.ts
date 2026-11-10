/** App owns visibility; RFQ screens only need to dispatch the returned conversation ID. */
export const OPEN_CONVERSATION_CHAT_EVENT = 'mooncake:open-conversation-chat';

export interface OpenConversationChatDetail {
  conversationId: string | null;
}

export function openConversationChat(id?: string): void {
  window.dispatchEvent(new CustomEvent<OpenConversationChatDetail>(OPEN_CONVERSATION_CHAT_EVENT, {
    detail: { conversationId: id?.trim() || null }
  }));
}
