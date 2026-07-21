import { AlertTriangle, FolderGit2, Inbox, Loader2, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { DelegationExchange } from '../../../../stores/useSessionStore';
import WorkerActivity from './WorkerActivity';
import WorkerResult from './WorkerResult';

function StatusBadge({ status }: { status: DelegationExchange['status'] }) {
  const { t } = useTranslation('chat');
  if (status === 'pending' || status === 'running') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-worker">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-worker" />
        {t(`delegation.status_${status}`)}
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-warning">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" />
        {t('delegation.status_error')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      {t('delegation.status_done')}
    </span>
  );
}

export default function DelegationCard({ exchange }: { exchange: DelegationExchange }) {
  const { t } = useTranslation('chat');
  const { status } = exchange;
  const isRunning = status === 'pending' || status === 'running';

  return (
    <div className="w-full space-y-2">
      {/* Brief the orchestrator sent to the worker */}
      <div className="rounded-lg border border-orchestrator/30 bg-orchestrator-wash px-3 py-2 text-sm">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-orchestrator">
            <Send className="h-3 w-3" />
            {t('delegation.toWorker')}
          </span>
          <StatusBadge status={status} />
        </div>
        <p className="whitespace-pre-wrap break-words text-foreground">{exchange.brief}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          {exchange.cwd && (
            <span className="inline-flex items-center gap-1 font-mono">
              <FolderGit2 className="h-3 w-3" />
              {exchange.cwd}
            </span>
          )}
          {exchange.worker_session_id && (
            <span className="font-mono">
              {t('delegation.workerSession')}: {exchange.worker_session_id}
            </span>
          )}
        </div>
      </div>

      {/* Brief sent, worker not yet spawned (no session id to tail) */}
      {isRunning && !exchange.worker_session_id && (
        <div className="flex items-center gap-1.5 px-1 text-[12px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin text-worker" />
          {t('delegation.running')}
        </div>
      )}

      {/* Live worker tool-calling (tails while running, collapsed trace after) */}
      {exchange.worker_session_id && (
        <WorkerActivity
          workerSessionId={exchange.worker_session_id}
          running={isRunning}
          createdAt={exchange.created_at}
        />
      )}

      {/* Worker result */}
      {status === 'done' && (
        <div className="rounded-lg border border-worker/30 bg-worker-wash px-3 py-2 text-sm">
          <div className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-worker">
            <Inbox className="h-3 w-3" />
            {t('delegation.result')}
          </div>
          <WorkerResult text={exchange.result_text} emptyLabel={t('delegation.emptyResult')} />
        </div>
      )}

      {/* Worker failure */}
      {status === 'error' && (
        <div className="rounded-lg border border-warning/40 bg-sunken px-3 py-2 text-sm">
          <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-warning">
            <AlertTriangle className="h-3 w-3" />
            {t('delegation.status_error')}
            {typeof exchange.exit_code === 'number' && (
              <span className="font-mono">{t('delegation.exit', { code: exchange.exit_code })}</span>
            )}
          </div>
          <p className="whitespace-pre-wrap break-words text-foreground">
            {exchange.error_message || t('delegation.status_error')}
          </p>
        </div>
      )}
    </div>
  );
}
