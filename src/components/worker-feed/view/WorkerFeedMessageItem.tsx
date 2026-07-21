import { Brain, ChevronRight, Terminal, User, Wrench } from 'lucide-react';

import type { WorkerFeedMessage } from '../types';

function stringifyArgs(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

type TerminalResult = { output?: string; exit_code?: number; error?: string | null };

function asTerminalResult(value: unknown): TerminalResult | null {
  if (value && typeof value === 'object' && ('output' in value || 'exit_code' in value)) {
    return value as TerminalResult;
  }
  return null;
}

function ReasoningBlock({ reasoning }: { reasoning: string }) {
  return (
    <details className="group mt-1.5">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
        <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
        <Brain className="h-3 w-3" />
        <span>Reasoning</span>
      </summary>
      <p className="mt-1 whitespace-pre-wrap border-l-2 border-border pl-3 text-[12px] italic text-muted-foreground">
        {reasoning}
      </p>
    </details>
  );
}

export default function WorkerFeedMessageItem({ message }: { message: WorkerFeedMessage }) {
  const dimmed = !message.active || message.compacted;
  const baseClass = `rounded-lg border px-3 py-2 text-sm ${dimmed ? 'opacity-50' : ''}`;

  if (message.kind === 'user') {
    return (
      <div className={`${baseClass} border-orchestrator/30 bg-orchestrator-wash`}>
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-orchestrator">
          <User className="h-3 w-3" />
          Prompt
        </div>
        <p className="whitespace-pre-wrap text-foreground">{message.content}</p>
      </div>
    );
  }

  if (message.kind === 'tool_call') {
    return (
      <div className={`${baseClass} border-worker/30 bg-worker-wash`}>
        {message.toolCalls?.map((call, idx) => (
          <details key={call.id ?? idx} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12px] font-medium text-worker">
              <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
              <Wrench className="h-3 w-3" />
              <span className="font-mono">{call.name ?? 'tool'}</span>
            </summary>
            <pre className="mt-1.5 overflow-x-auto rounded bg-sunken p-2 text-[11px] text-muted-foreground">
              {stringifyArgs(call.arguments)}
            </pre>
          </details>
        ))}
        {message.reasoning && <ReasoningBlock reasoning={message.reasoning} />}
      </div>
    );
  }

  if (message.kind === 'tool_result') {
    const term = asTerminalResult(message.toolResult);
    return (
      <div className={`${baseClass} border-border bg-sunken`}>
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <Terminal className="h-3 w-3" />
          <span className="font-mono">{message.toolName ?? 'result'}</span>
          {term && typeof term.exit_code === 'number' && (
            <span className={term.exit_code === 0 ? 'text-success' : 'text-warning'}>exit {term.exit_code}</span>
          )}
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap text-[12px] text-foreground">
          {term ? (term.error || term.output || '') : stringifyArgs(message.toolResult ?? message.content)}
        </pre>
      </div>
    );
  }

  if (message.kind === 'meta') {
    return <div className="px-1 text-center text-[11px] italic text-muted-foreground">{message.content}</div>;
  }

  // assistant_text
  return (
    <div className={`${baseClass} border-border bg-card`}>
      {message.content && <p className="whitespace-pre-wrap text-foreground">{message.content}</p>}
      {message.reasoning && <ReasoningBlock reasoning={message.reasoning} />}
    </div>
  );
}
