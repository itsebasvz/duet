import { Activity, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useWorkerFeed } from '../hooks/useWorkerFeed';
import { useWorkerSessions } from '../hooks/useWorkerSessions';
import type { WorkerSessionSummary } from '../types';

import WorkerFeedMessageItem from './WorkerFeedMessageItem';

function relativeTime(epochSeconds: number): string {
  const diffMs = Date.now() - epochSeconds * 1000;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function StatusBadge({ session }: { session: WorkerSessionSummary }) {
  if (session.status === 'open') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-worker">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-worker" />
        running
      </span>
    );
  }
  return (
    <span className="text-[11px] text-muted-foreground">
      {session.endReason ?? 'ended'}
    </span>
  );
}

function SessionRow({
  session,
  active,
  onSelect,
}: {
  session: WorkerSessionSummary;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex w-full flex-col gap-1 border-l-2 px-3 py-2 text-left transition-colors ${
        active ? 'border-worker bg-worker-wash' : 'border-transparent hover:bg-sunken'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-foreground">
          {session.title || session.id}
        </span>
        <StatusBadge session={session} />
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="rounded bg-sunken px-1.5 py-0.5 font-mono">{session.source}</span>
        {session.model && <span className="truncate">{session.model}</span>}
        <span className="ml-auto shrink-0">{relativeTime(session.startedAt)}</span>
      </div>
    </button>
  );
}

function Feed({ sessionId }: { sessionId: string }) {
  const { messages, session, loading } = useWorkerFeed(sessionId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex h-full flex-col">
      {session && (
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">{session.title || session.id}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {session.model} · {session.cwd}
            </div>
          </div>
          <div className="ml-auto shrink-0">
            <StatusBadge session={session} />
          </div>
        </div>
      )}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {loading && messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages in this session.</p>
        ) : (
          messages.map((m) => <WorkerFeedMessageItem key={m.id} message={m} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default function WorkerFeedPanel({ isVisible }: { isVisible: boolean }) {
  const { sessions, available, loading, refresh } = useWorkerSessions(isVisible);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && sessions.length > 0) {
      setSelectedId(sessions[0].id);
    }
  }, [sessions, selectedId]);

  if (available === false) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <Activity className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Worker store not found</p>
        <p className="max-w-md text-xs text-muted-foreground">
          No worker <code className="font-mono">state.db</code> at the configured path.
          Set <code className="font-mono">HERMES_STATE_DB</code> if Hermes lives elsewhere.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sessions</span>
          <button onClick={refresh} className="text-muted-foreground hover:text-foreground" aria-label="Refresh">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">No sessions yet.</p>
          ) : (
            sessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                active={s.id === selectedId}
                onSelect={() => setSelectedId(s.id)}
              />
            ))
          )}
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        {selectedId ? (
          <Feed sessionId={selectedId} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a session to view worker activity.
          </div>
        )}
      </div>
    </div>
  );
}
