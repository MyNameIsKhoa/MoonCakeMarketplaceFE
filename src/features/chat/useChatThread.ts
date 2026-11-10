import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage, getAccessToken } from '../../services/api/http';
import { CHAT_SOCKET_URL, ChatMessage, conversationApi } from './api';
import { StompConnection } from './stompClient';

export type ConnectionState = 'connecting' | 'online' | 'reconnecting' | 'expired';

export interface PendingMessage {
  clientMessageId: string;
  content: string;
  status: 'sending' | 'failed';
}

const RETRY_DELAYS_MS = [1000, 2000, 5000, 10000];
const SEND_TIMEOUT_MS = 10000;

function byId(a: ChatMessage, b: ChatMessage) {
  return Number(a.messageId) - Number(b.messageId);
}

/** Merges by messageId: history and live broadcasts may overlap after a reconnect or a resend. */
function merge(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return current;
  const map = new Map(current.map((m) => [m.messageId, m]));
  incoming.forEach((m) => map.set(m.messageId, m));
  return [...map.values()].sort(byId);
}

export function useChatThread(conversationId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const socketRef = useRef<StompConnection | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const timersRef = useRef(new Map<string, number>());
  const generationRef = useRef(0);
  messagesRef.current = messages;

  const destination = `/app/conversations/${conversationId}/messages`;

  const settle = useCallback((clientMessageId: string | null) => {
    if (!clientMessageId) return;
    window.clearTimeout(timersRef.current.get(clientMessageId));
    timersRef.current.delete(clientMessageId);
    setPending((list) => list.filter((p) => p.clientMessageId !== clientMessageId));
  }, []);

  const reload = useCallback(async () => {
    const generation = generationRef.current;
    setLoading(true);
    setLoadError('');
    try {
      const page = await conversationApi.history(conversationId);
      if (generation !== generationRef.current) return;
      // A live message may arrive before the initial history request completes.
      setMessages((current) => merge(current, page.items));
      setHasOlder(page.hasMore);
      page.items.forEach((m) => settle(m.clientMessageId));
    } catch (error) {
      if (generation === generationRef.current) setLoadError(errorMessage(error));
    } finally {
      if (generation === generationRef.current) setLoading(false);
    }
  }, [conversationId, settle]);

  useEffect(() => {
    let disposed = false;
    let attempt = 0;
    let retryTimer = 0;
    generationRef.current += 1;
    messagesRef.current = [];
    setMessages([]);
    setPending([]);
    setLoading(true);
    setLoadError('');
    setHasOlder(false);
    setLoadingOlder(false);

    void reload();

    /** Pull every newer page after reconnecting; stop immediately on account/thread changes. */
    const catchUp = async () => {
      let after = messagesRef.current.at(-1)?.messageId;
      for (let guard = 0; guard < 20 && !disposed; guard++) {
        const page = await conversationApi.history(conversationId, after ? { afterMessageId: after } : {});
        if (disposed) return;
        setMessages((current) => merge(current, page.items));
        page.items.forEach((m) => settle(m.clientMessageId));
        if (!page.hasMore || page.items.length === 0 || !after) return;
        after = page.items.at(-1)!.messageId;
      }
    };

    const connect = () => {
      const token = getAccessToken();
      if (!token) {
        setConnection('expired');
        return;
      }
      setConnection(attempt === 0 ? 'connecting' : 'reconnecting');
      const socket = new StompConnection(CHAT_SOCKET_URL, token, {
        onConnected: () => {
          if (disposed) return;
          attempt = 0;
          socket.subscribe(`/topic/conversations/${conversationId}`);
          setConnection('online');
          catchUp().catch(() => undefined);
        },
        onMessage: (frame) => {
          if (disposed) return;
          try {
            const message = JSON.parse(frame.body) as ChatMessage;
            if (message.conversationId !== conversationId) return;
            setMessages((current) => merge(current, [message]));
            settle(message.clientMessageId);
          } catch {
            // ignore malformed frames
          }
        },
        onDisconnected: () => {
          if (disposed) return;
          socketRef.current = null;
          if (!getAccessToken()) {
            setConnection('expired');
            return;
          }
          setConnection('reconnecting');
          retryTimer = window.setTimeout(connect, RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]);
          attempt += 1;
        }
      });
      socketRef.current = socket;
    };
    connect();

    const timers = timersRef.current;
    return () => {
      disposed = true;
      generationRef.current += 1;
      window.clearTimeout(retryTimer);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      socketRef.current?.dispose();
      socketRef.current = null;
    };
  }, [conversationId, reload, settle]);

  const transmit = useCallback(
    (clientMessageId: string, content: string) => {
      const socket = socketRef.current;
      if (!socket?.isOpen || connection !== 'online') {
        setPending((list) => list.map((p) => (p.clientMessageId === clientMessageId ? { ...p, status: 'failed' } : p)));
        return;
      }
      socket.send(destination, { clientMessageId, messageType: 'TEXT', content });
      window.clearTimeout(timersRef.current.get(clientMessageId));
      timersRef.current.set(
        clientMessageId,
        window.setTimeout(() => {
          setPending((list) => list.map((p) => (p.clientMessageId === clientMessageId ? { ...p, status: 'failed' } : p)));
        }, SEND_TIMEOUT_MS)
      );
    },
    [connection, destination]
  );

  const send = useCallback(
    (content: string) => {
      const clientMessageId = crypto.randomUUID();
      setPending((list) => [...list, { clientMessageId, content, status: 'sending' }]);
      transmit(clientMessageId, content);
    },
    [transmit]
  );

  /** Same clientMessageId + content: the server returns the stored message instead of a duplicate. */
  const retry = useCallback(
    (clientMessageId: string) => {
      const item = pending.find((p) => p.clientMessageId === clientMessageId);
      if (!item) return;
      setPending((list) => list.map((p) => (p.clientMessageId === clientMessageId ? { ...p, status: 'sending' } : p)));
      transmit(clientMessageId, item.content);
    },
    [pending, transmit]
  );

  const discard = useCallback((clientMessageId: string) => settle(clientMessageId), [settle]);

  const loadOlder = useCallback(async () => {
    const generation = generationRef.current;
    const first = messagesRef.current[0]?.messageId;
    if (!first) return;
    setLoadingOlder(true);
    setLoadError('');
    try {
      const page = await conversationApi.history(conversationId, { beforeMessageId: first });
      if (generation !== generationRef.current) return;
      setMessages((current) => merge(current, page.items));
      setHasOlder(page.hasMore);
    } catch (error) {
      if (generation === generationRef.current) setLoadError(errorMessage(error));
    } finally {
      if (generation === generationRef.current) setLoadingOlder(false);
    }
  }, [conversationId]);

  return { messages, pending, connection, loading, loadError, hasOlder, loadingOlder, send, retry, discard, loadOlder, reload };
}
