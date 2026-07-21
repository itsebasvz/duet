export type WorkerSessionSummary = {
  id: string;
  source: string;
  model: string | null;
  cwd: string | null;
  gitBranch: string | null;
  startedAt: number;
  endedAt: number | null;
  endReason: string | null;
  messageCount: number;
  toolCallCount: number;
  title: string | null;
  estimatedCostUsd: number | null;
  inputTokens: number;
  outputTokens: number;
  lastMessageAt: number | null;
  status: WorkerActivityStatus;
};

export type WorkerActivityStatus = 'working' | 'stalled' | 'done' | 'error';

export type ParsedToolCall = {
  id: string | null;
  name: string | null;
  arguments: unknown;
};

export type WorkerSessionDiff = {
  available: boolean;
  cwd: string | null;
  isRepo: boolean;
  diff: string | null;
  error?: string;
};

export type WorkerFeedMessageKind = 'user' | 'assistant_text' | 'tool_call' | 'tool_result' | 'meta';

export type WorkerFeedMessage = {
  id: number;
  role: string;
  kind: WorkerFeedMessageKind;
  content: string | null;
  toolName: string | null;
  toolCallId: string | null;
  toolCalls: ParsedToolCall[] | null;
  toolResult: unknown;
  reasoning: string | null;
  finishReason: string | null;
  timestamp: number;
  active: boolean;
  compacted: boolean;
};
