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
 *
 * History always loads for any `sessionId` (so a finished delegation can still
 * render its trace). The server-side tail — the live poller that streams new
 * rows — is opt-in via `tail` (default true): pass `tail: false` for a
 * completed session so we don't churn a poller on a run that already ended.
 */
export function useWorkerFeed(sessionId: string | null, opts?: { tail?: boolean }) {
  const tail = opts?.tail ?? true;
  const { subscribe } = useWebSocket();
  const [messages, setMessages] = useState<WorkerFeedMessage[]>([]);
  const [session, setSession] = useState<WorkerSessionSummary | null>(null);
  const [loading, setLoading] = useState(false);

  // History: (re)load whenever the session changes. Independent of tailing so a
  // done exchange still shows its full trace.
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
    };
  }, [sessionId]);

  // Live tail: only while requested (i.e. the run is active). Starting a tail on
  // a shared session that another mounted card is already tailing is fine; the
  // server ref-counts, and releasing here won't stop a still-running tail.
  useEffect(() => {
    if (!sessionId || !tail) {
      return;
    }
    authenticatedFetch(tailUrl(sessionId), { method: 'POST' }).catch(() => {});
    return () => {
      authenticatedFetch(tailUrl(sessionId), { method: 'DELETE' }).catch(() => {});
    };
  }, [sessionId, tail]);

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
