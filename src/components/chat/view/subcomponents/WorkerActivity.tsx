import { useMemo } from 'react';
import { Brain, ChevronRight, FileEdit, Loader2, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useWorkerFeed } from '../../../worker-feed/hooks/useWorkerFeed';
import type { WorkerFeedMessage } from '../../../worker-feed/types';
import { BashCommandDisplay, MarkdownContent } from '../../tools/components';

/**
 * Live, in-chat view of the worker's tool-calling while a delegation runs.
 *
 * Reuses Claude's own card primitives (BashCommandDisplay, MarkdownContent) but
 * in the worker's Ochre voice (DESIGN.md §"actividad de worker"): a 2px Ochre
 * left rail marks identity, individual cards stay neutral like Claude's. Tails
 * the worker session only while running; keeps the last snapshot after the run
 * so the trace stays visible (collapsed) under the result.
 */

type TerminalResult = { output?: string; exit_code?: number; error?: string | null };
type WriteResult = { bytes_written?: number };

type Card =
  | { kind: 'text'; id: string; content: string }
  | { kind: 'reasoning'; id: string; content: string }
  | { kind: 'terminal'; id: string; command: string; result?: TerminalResult }
  | { kind: 'write'; id: string; path: string; content: string; result?: WriteResult }
  | { kind: 'tool'; id: string; name: string; args: unknown; result?: unknown };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function stringify(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** sqlite CURRENT_TIMESTAMP ('YYYY-MM-DD HH:MM:SS', UTC) → epoch seconds. */
function createdAtEpoch(createdAt: string): number {
  const iso = createdAt.includes('T') ? createdAt : `${createdAt.replace(' ', 'T')}Z`;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
}

/**
 * Folds the flat message stream into ordered cards, pairing tool calls with
 * their results. The Hermes session is reused across delegations, so a new
 * `user` message mid-stream marks the next exchange's brief — stop there so
 * each card shows only its own turn.
 */
function buildCards(messages: WorkerFeedMessage[]): Card[] {
  const cards: Card[] = [];
  const byCallId = new Map<string, number>();
  let started = false;

  for (const m of messages) {
    if (m.kind === 'meta') continue;
    if (m.kind === 'user') {
      if (started) break;
      continue;
    }
    started = true;

    if (m.content && m.content.trim()) {
      cards.push({ kind: 'text', id: `t-${m.id}`, content: m.content });
    }
    if (m.reasoning && m.reasoning.trim()) {
      cards.push({ kind: 'reasoning', id: `r-${m.id}`, content: m.reasoning });
    }

    if (m.kind === 'tool_call' && m.toolCalls) {
      for (const call of m.toolCalls) {
        const id = call.id ?? `call-${m.id}-${cards.length}`;
        const name = call.name ?? 'tool';
        const args = asRecord(call.arguments);
        let card: Card;
        if (name === 'terminal' || (args && 'command' in args)) {
          card = { kind: 'terminal', id, command: String(args?.command ?? '') };
        } else if (name === 'write_file') {
          card = { kind: 'write', id, path: String(args?.path ?? ''), content: String(args?.content ?? '') };
        } else {
          card = { kind: 'tool', id, name, args: call.arguments };
        }
        byCallId.set(id, cards.length);
        cards.push(card);
      }
    }

    if (m.kind === 'tool_result' && m.toolCallId != null) {
      const idx = byCallId.get(m.toolCallId);
      if (idx != null) {
        const card = cards[idx];
        if (card.kind === 'terminal') card.result = asRecord(m.toolResult) as TerminalResult;
        else if (card.kind === 'write') card.result = asRecord(m.toolResult) as WriteResult;
        else if (card.kind === 'tool') card.result = m.toolResult;
      }
    }
  }

  return cards;
}

function NeutralCard({
  icon,
  name,
  suffix,
  children,
}: {
  icon: React.ReactNode;
  name: string;
  suffix?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/40">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-1.5 text-[12px] outline-none">
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70 transition-transform duration-200 group-open:rotate-90" />
          <span className="flex-shrink-0 text-worker">{icon}</span>
          <span className="flex-shrink-0 font-mono text-xs text-worker">{name}</span>
          {suffix}
        </summary>
        <div className="border-t border-border/50 bg-background/50">{children}</div>
      </details>
    </div>
  );
}

function WorkerCard({ card }: { card: Card }) {
  if (card.kind === 'text') {
    return (
      <div className="text-[13px]">
        <MarkdownContent content={card.content} />
      </div>
    );
  }

  if (card.kind === 'reasoning') {
    return (
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
          <Brain className="h-3 w-3" />
          <span>Reasoning</span>
        </summary>
        <p className="mt-1 whitespace-pre-wrap border-l-2 border-border pl-3 text-[12px] italic text-muted-foreground">
          {card.content}
        </p>
      </details>
    );
  }

  if (card.kind === 'terminal') {
    const r = card.result;
    const output = r ? r.error || r.output || '' : '';
    const isError = !!r && (r.exit_code !== 0 || !!r.error);
    return (
      <BashCommandDisplay
        accent="worker"
        command={card.command}
        output={output}
        isError={isError}
        status={r ? undefined : 'running'}
      />
    );
  }

  if (card.kind === 'write') {
    const bytes = card.result?.bytes_written;
    const file = card.path.split('/').pop() || card.path;
    return (
      <NeutralCard
        icon={<FileEdit className="h-3.5 w-3.5" />}
        name="write_file"
        suffix={
          <>
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{file}</span>
            {typeof bytes === 'number' && (
              <span className="flex-shrink-0 text-[10px] tabular-nums text-muted-foreground/70">{bytes} B</span>
            )}
          </>
        }
      >
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {card.content}
        </pre>
      </NeutralCard>
    );
  }

  // generic tool
  return (
    <NeutralCard icon={<Wrench className="h-3.5 w-3.5" />} name={card.name}>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
        {stringify(card.args)}
      </pre>
      {card.result != null && (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all border-t border-border/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground">
          {stringify(card.result)}
        </pre>
      )}
    </NeutralCard>
  );
}

export default function WorkerActivity({
  workerSessionId,
  running,
  createdAt,
}: {
  workerSessionId: string | null;
  running: boolean;
  createdAt: string;
}) {
  const { t } = useTranslation('chat');
  // Load history for any session (so a finished delegation still renders its
  // trace); only live-tail while the run is active.
  const { messages } = useWorkerFeed(workerSessionId, { tail: running });

  const since = useMemo(() => createdAtEpoch(createdAt), [createdAt]);
  const cards = useMemo(() => {
    const scoped = since === 0 ? messages : messages.filter((m) => m.timestamp >= since);
    return buildCards(scoped);
  }, [messages, since]);

  if (running && cards.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-1 text-[12px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin text-worker" />
        {t('delegation.running')}
      </div>
    );
  }

  if (cards.length === 0) return null;

  const list = (
    <div className="space-y-1.5 border-l-2 border-worker/30 pl-2.5">
      {cards.map((card) => (
        <WorkerCard key={card.id} card={card} />
      ))}
    </div>
  );

  if (running) return list;

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-1 text-[11px] text-muted-foreground hover:text-foreground">
        <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
        {t('delegation.workerActivity', { count: cards.length })}
      </summary>
      <div className="mt-1.5">{list}</div>
    </details>
  );
}
