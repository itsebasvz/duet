import { GitBranch, RefreshCw } from 'lucide-react';

import GitDiffViewer from '../../git-panel/view/shared/GitDiffViewer';
import { useWorkerDiff } from '../hooks/useWorkerDiff';

export default function WorkerDiffView({ sessionId, active }: { sessionId: string; active: boolean }) {
  const { data, loading, refresh } = useWorkerDiff(sessionId, active);

  function body() {
    if (loading && !data) {
      return <p className="p-4 text-sm text-muted-foreground">Loading diff…</p>;
    }
    if (!data) {
      return <p className="p-4 text-sm text-muted-foreground">No diff.</p>;
    }
    if (!data.available) {
      return <p className="p-4 text-sm text-muted-foreground">Session not found.</p>;
    }
    if (!data.isRepo) {
      return (
        <p className="p-4 text-sm text-muted-foreground">
          {data.cwd ? 'Worker directory is not a git repository.' : 'Session has no working directory.'}
        </p>
      );
    }
    if (data.error) {
      return <p className="p-4 text-sm text-warning">Diff failed: {data.error}</p>;
    }
    if (!data.diff || data.diff.trim() === '') {
      return <p className="p-4 text-sm text-muted-foreground">No uncommitted changes.</p>;
    }
    return <GitDiffViewer diff={data.diff} isMobile={false} wrapText={false} />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-[11px] text-muted-foreground">
        <GitBranch className="h-3 w-3 shrink-0" />
        <span className="truncate font-mono">{data?.cwd ?? '—'}</span>
        <button
          onClick={refresh}
          className="ml-auto shrink-0 hover:text-foreground"
          aria-label="Refresh diff"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{body()}</div>
    </div>
  );
}
