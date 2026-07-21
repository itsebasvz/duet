import { useEffect, useState } from 'react';

import { useWebSocket, type ServerEvent } from '../../../contexts/WebSocketContext';
import { authenticatedFetch } from '../../../utils/api';
import type { WorkerFeedMessage, WorkerSessionSummary } from '../types';

function tailUrl(sessionId: string): string {
  return `/api/worker-feed/sessions/${encodeURIComponent(sessionId)}/tail`;
}

/**
 * Loads a session's message history, then keeps it live by subscribing to the
 * `worker_feed` websocket frames the server emits while tailing state.db.
 * Starts the server-side tail on mount and releases it on unmount.
 */
export function useWorkerFeed(sessionId: string | null) {
  const { subscribe } = useWebSocket();
  const [messages, setMessages] = useState<WorkerFeedMessage[]>([]);
  const [session, setSession] = useState<WorkerSessionSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setSession(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const [msgRes, sesRes] = await Promise.all([
          authenticatedFetch(`/api/worker-feed/sessions/${encodeURIComponent(sessionId)}/messages`),
          authenticatedFetch(`/api/worker-feed/sessions/${encodeURIComponent(sessionId)}`),
        ]);
        const msgJson = await msgRes.json();
        const sesJson = await sesRes.json();
        if (cancelled) {
          return;
        }
        setMessages(Array.isArray(msgJson?.data) ? msgJson.data : []);
        setSession(sesJson?.data ?? null);
        authenticatedFetch(tailUrl(sessionId), { method: 'POST' }).catch(() => {});
      } catch (error) {
        console.error('[WorkerFeed] failed to load session:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      authenticatedFetch(tailUrl(sessionId), { method: 'DELETE' }).catch(() => {});
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    return subscribe((event: ServerEvent) => {
      if (event.kind !== 'worker_feed' || event.sessionId !== sessionId) {
        return;
      }
      if (event.type === 'message' && event.message) {
        const incoming = event.message as WorkerFeedMessage;
        setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
      } else if (event.type === 'session_state' && event.session) {
        setSession(event.session as WorkerSessionSummary);
      }
    });
  }, [sessionId, subscribe]);

  return { messages, session, loading };
}
