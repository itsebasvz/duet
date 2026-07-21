import { useCallback, useEffect, useRef, useState } from 'react';

import { authenticatedFetch } from '../../../utils/api';
import type { WorkerSessionDiff } from '../types';

const REFRESH_INTERVAL_MS = 5000;

/**
 * Fetches the working-tree diff of a worker session's cwd. Polls while enabled
 * (the Diff view is open) so the panel tracks the worker's edits live.
 */
export function useWorkerDiff(sessionId: string | null, enabled: boolean) {
  const [data, setData] = useState<WorkerSessionDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const loadedFor = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionId) {
      return;
    }
    if (loadedFor.current !== sessionId) {
      setLoading(true);
    }
    try {
      const res = await authenticatedFetch(
        `/api/worker-feed/sessions/${encodeURIComponent(sessionId)}/diff`,
      );
      const json = await res.json();
      if (json?.success) {
        setData(json.data as WorkerSessionDiff);
      }
    } catch (error) {
      console.error('[WorkerFeed] failed to load diff:', error);
    } finally {
      loadedFor.current = sessionId;
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!enabled || !sessionId) {
      return;
    }
    setData(null);
    loadedFor.current = null;
    refresh();
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [enabled, sessionId, refresh]);

  return { data, loading, refresh };
}
