import { useCallback, useEffect, useRef, useState } from 'react';

import { authenticatedFetch } from '../../../utils/api';
import type { WorkerSessionSummary } from '../types';

const REFRESH_INTERVAL_MS = 5000;

/**
 * Lists worker sessions from the read-only Hermes store. Polls while the panel
 * is visible so newly spawned sessions surface without a manual refresh.
 */
export function useWorkerSessions(isVisible: boolean) {
  const [sessions, setSessions] = useState<WorkerSessionSummary[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const loadedOnce = useRef(false);

  const refresh = useCallback(async () => {
    if (!loadedOnce.current) {
      setLoading(true);
    }
    try {
      const statusRes = await authenticatedFetch('/api/worker-feed/status');
      const status = await statusRes.json();
      setAvailable(Boolean(status?.data?.available));

      const res = await authenticatedFetch('/api/worker-feed/sessions');
      const json = await res.json();
      if (json?.success) {
        setSessions(json.data ?? []);
      }
    } catch (error) {
      console.error('[WorkerFeed] failed to list sessions:', error);
    } finally {
      loadedOnce.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    refresh();
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isVisible, refresh]);

  return { sessions, available, loading, refresh };
}
