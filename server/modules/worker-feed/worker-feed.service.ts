import { execFile } from 'node:child_process';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import Database from 'better-sqlite3';

import { connectedClients, WS_OPEN_STATE } from '@/modules/websocket/index.js';

/**
 * Read-only observability of the worker CLI (Hermes) session store.
 *
 * Hermes writes its transcript to a SQLite file (`~/.hermes/state.db`, WAL
 * mode). Duet never mutates it — it tails the `messages` table by autoincrement
 * id and streams new rows to the web UI. Terminal provider errors do NOT land
 * here (a failed run leaves only the user message with ended_at NULL), so error
 * detection stays the job of the process supervisor, not this feed.
 */

const POLL_INTERVAL_MS = 600;
const DEFAULT_SESSION_LIMIT = 40;

// Hermes never writes ended_at when its process is killed/crashes, so an "open"
// row (ended_at NULL) cannot be trusted to mean "still working". We treat an
// open session with no new message in this window as stalled rather than
// running. True liveness detection needs process supervision (v0.3, when duet
// spawns the worker itself).
const STALE_AFTER_MS = 5 * 60 * 1000;

type SessionRow = {
  id: string;
  source: string;
  model: string | null;
  cwd: string | null;
  git_branch: string | null;
  started_at: number;
  ended_at: number | null;
  end_reason: string | null;
  message_count: number;
  tool_call_count: number;
  title: string | null;
  estimated_cost_usd: number | null;
  input_tokens: number;
  output_tokens: number;
  compression_failure_error: string | null;
  handoff_error: string | null;
  last_message_at: number | null;
};

type MessageRow = {
  id: number;
  role: string;
  content: string | null;
  tool_call_id: string | null;
  tool_calls: string | null;
  tool_name: string | null;
  timestamp: number;
  finish_reason: string | null;
  reasoning: string | null;
  reasoning_content: string | null;
  active: number;
  compacted: number;
};

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

/**
 * Derived from state.db alone (read-only, external Hermes runs):
 *  - working: open + a message within STALE_AFTER_MS
 *  - stalled: open + no recent activity (process likely dead/hung — Hermes
 *    leaves ended_at NULL on crash/kill)
 *  - done:    ended_at set (end_reason: agent_close / cli_close / session_reset)
 *  - error:   a compression/handoff error recorded on the row
 * Provider-level errors (credits, auth, rate-limit) never reach state.db and
 * surface via process supervision later (v0.3).
 */
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

export type WorkerFeedMessage = {
  id: number;
  role: 'user' | 'assistant' | 'tool' | 'session_meta' | string;
  kind: 'user' | 'assistant_text' | 'tool_call' | 'tool_result' | 'meta';
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

type TailState = {
  db: Database.Database;
  timer: ReturnType<typeof setInterval>;
  lastId: number;
  refCount: number;
  ended: boolean;
};

const tails = new Map<string, TailState>();

export function getStateDbPath(): string {
  return process.env.HERMES_STATE_DB || path.join(os.homedir(), '.hermes', 'state.db');
}

export function stateDbExists(): boolean {
  return fsSync.existsSync(getStateDbPath());
}

function openDb(): Database.Database {
  return new Database(getStateDbPath(), { readonly: true, fileMustExist: true });
}

function tryParseJson(value: string | null): unknown {
  if (value == null) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseToolCalls(raw: string | null): ParsedToolCall[] | null {
  if (!raw) {
    return null;
  }
  const parsed = tryParseJson(raw);
  if (!Array.isArray(parsed)) {
    return null;
  }
  return parsed.map((call): ParsedToolCall => {
    const fn = (call?.function ?? {}) as { name?: string; arguments?: string };
    return {
      id: call?.id ?? call?.call_id ?? null,
      name: fn.name ?? null,
      arguments: typeof fn.arguments === 'string' ? tryParseJson(fn.arguments) : (fn.arguments ?? null),
    };
  });
}

function deriveKind(row: MessageRow): WorkerFeedMessage['kind'] {
  if (row.role === 'user') return 'user';
  if (row.role === 'tool') return 'tool_result';
  if (row.role === 'session_meta') return 'meta';
  // assistant
  if (row.tool_calls) return 'tool_call';
  return 'assistant_text';
}

function mapMessage(row: MessageRow): WorkerFeedMessage {
  return {
    id: row.id,
    role: row.role,
    kind: deriveKind(row),
    content: row.content,
    toolName: row.tool_name,
    toolCallId: row.tool_call_id,
    toolCalls: parseToolCalls(row.tool_calls),
    toolResult: row.role === 'tool' ? tryParseJson(row.content) : null,
    reasoning: row.reasoning ?? row.reasoning_content ?? null,
    finishReason: row.finish_reason,
    timestamp: row.timestamp,
    active: row.active !== 0,
    compacted: row.compacted !== 0,
  };
}

function deriveStatus(row: SessionRow): WorkerActivityStatus {
  if (row.compression_failure_error || row.handoff_error) {
    return 'error';
  }
  if (row.ended_at != null) {
    return 'done';
  }
  const lastActivity = row.last_message_at ?? row.started_at;
  if (Date.now() - lastActivity * 1000 > STALE_AFTER_MS) {
    return 'stalled';
  }
  return 'working';
}

function mapSession(row: SessionRow): WorkerSessionSummary {
  return {
    id: row.id,
    source: row.source,
    model: row.model,
    cwd: row.cwd,
    gitBranch: row.git_branch,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    endReason: row.end_reason,
    messageCount: row.message_count,
    toolCallCount: row.tool_call_count,
    title: row.title,
    estimatedCostUsd: row.estimated_cost_usd,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    lastMessageAt: row.last_message_at,
    status: deriveStatus(row),
  };
}

const SESSION_COLUMNS = `
  id, source, model, cwd, git_branch, started_at, ended_at, end_reason,
  message_count, tool_call_count, title, estimated_cost_usd,
  input_tokens, output_tokens, compression_failure_error, handoff_error,
  (SELECT MAX(timestamp) FROM messages WHERE messages.session_id = sessions.id) AS last_message_at
`;

/**
 * Lists recent worker sessions, newest first. Returns [] when the store is
 * absent (e.g. local dev without Hermes installed).
 */
export function listSessions(limit = DEFAULT_SESSION_LIMIT): WorkerSessionSummary[] {
  if (!stateDbExists()) {
    return [];
  }
  const db = openDb();
  try {
    const rows = db
      .prepare(`SELECT ${SESSION_COLUMNS} FROM sessions ORDER BY started_at DESC LIMIT ?`)
      .all(limit) as SessionRow[];
    return rows.map(mapSession);
  } catch (error) {
    warn('listSessions', error);
    return [];
  } finally {
    db.close();
  }
}

export function getSession(sessionId: string): WorkerSessionSummary | null {
  if (!stateDbExists()) {
    return null;
  }
  const db = openDb();
  try {
    const row = db
      .prepare(`SELECT ${SESSION_COLUMNS} FROM sessions WHERE id = ?`)
      .get(sessionId) as SessionRow | undefined;
    return row ? mapSession(row) : null;
  } catch (error) {
    warn('getSession', error);
    return null;
  } finally {
    db.close();
  }
}

const MESSAGE_COLUMNS = `
  id, role, content, tool_call_id, tool_calls, tool_name, timestamp,
  finish_reason, reasoning, reasoning_content, active, compacted
`;

/**
 * Snapshot of a session's messages (history) mapped to feed shape. Live rows
 * arrive later over the websocket via the tail poller.
 */
export function getMessages(sessionId: string): WorkerFeedMessage[] {
  if (!stateDbExists()) {
    return [];
  }
  const db = openDb();
  try {
    const rows = readMessagesAfter(db, sessionId, 0);
    return rows.map(mapMessage);
  } catch (error) {
    warn('getMessages', error);
    return [];
  } finally {
    db.close();
  }
}

const execFileAsync = promisify(execFile);
const GIT_MAX_BUFFER = 12 * 1024 * 1024;

async function runGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd, maxBuffer: GIT_MAX_BUFFER });
  return stdout;
}

/**
 * Working-tree diff for a worker session's cwd. The path is read from state.db
 * (never client input) and git runs with a fixed argument list and no shell, so
 * there is no injection surface. Untracked files are excluded — this is the
 * tracked-changes view (`git diff HEAD`). Non-repo or missing cwd resolves to
 * isRepo:false rather than an error.
 */
export async function getSessionDiff(sessionId: string): Promise<WorkerSessionDiff> {
  const session = getSession(sessionId);
  if (!session) {
    return { available: false, cwd: null, isRepo: false, diff: null };
  }
  const cwd = session.cwd;
  if (!cwd) {
    return { available: true, cwd: null, isRepo: false, diff: null };
  }
  try {
    await runGit(cwd, ['rev-parse', '--is-inside-work-tree']);
  } catch {
    return { available: true, cwd, isRepo: false, diff: null };
  }
  try {
    let args = ['diff'];
    try {
      await runGit(cwd, ['rev-parse', '--verify', 'HEAD']);
      args = ['diff', 'HEAD'];
    } catch {
      // Repo with no commits yet — diff the index/worktree instead.
    }
    return { available: true, cwd, isRepo: true, diff: await runGit(cwd, args) };
  } catch (error) {
    warn('getSessionDiff', error);
    const message = error instanceof Error ? error.message : String(error);
    return { available: true, cwd, isRepo: true, diff: null, error: message };
  }
}

function readMessagesAfter(db: Database.Database, sessionId: string, afterId: number): MessageRow[] {
  return db
    .prepare(
      `SELECT ${MESSAGE_COLUMNS} FROM messages
       WHERE session_id = ? AND id > ?
       ORDER BY id ASC`,
    )
    .all(sessionId, afterId) as MessageRow[];
}

function currentMaxMessageId(db: Database.Database, sessionId: string): number {
  const row = db
    .prepare('SELECT COALESCE(MAX(id), 0) AS maxId FROM messages WHERE session_id = ?')
    .get(sessionId) as { maxId: number };
  return row.maxId;
}

function broadcast(payload: Record<string, unknown>): void {
  const frame = JSON.stringify({ kind: 'worker_feed', ...payload });
  connectedClients.forEach((client) => {
    if (client.readyState === WS_OPEN_STATE) {
      client.send(frame);
    }
  });
}

function warn(scope: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[WorkerFeed] ${scope} failed:`, message);
}

/**
 * Starts (or ref-counts) a live tail for a session. New messages committed by
 * Hermes are streamed over the websocket as `{ kind: 'worker_feed', ... }`.
 * Returns false when the store is unavailable.
 */
export function startTail(sessionId: string): boolean {
  if (!stateDbExists()) {
    return false;
  }

  const existing = tails.get(sessionId);
  if (existing) {
    existing.refCount += 1;
    return true;
  }

  let db: Database.Database;
  try {
    db = openDb();
  } catch (error) {
    warn('startTail.open', error);
    return false;
  }

  const state: TailState = {
    db,
    timer: setInterval(() => pollTail(sessionId), POLL_INTERVAL_MS),
    lastId: currentMaxMessageId(db, sessionId),
    refCount: 1,
    ended: false,
  };
  tails.set(sessionId, state);
  return true;
}

/**
 * Releases one tail subscription. The poller and db handle are torn down once
 * the last subscriber leaves.
 */
export function stopTail(sessionId: string): void {
  const state = tails.get(sessionId);
  if (!state) {
    return;
  }
  state.refCount -= 1;
  if (state.refCount > 0) {
    return;
  }
  clearInterval(state.timer);
  try {
    state.db.close();
  } catch {
    /* already closed */
  }
  tails.delete(sessionId);
}

function pollTail(sessionId: string): void {
  const state = tails.get(sessionId);
  if (!state) {
    return;
  }
  try {
    const rows = readMessagesAfter(state.db, sessionId, state.lastId);
    if (rows.length > 0) {
      state.lastId = rows[rows.length - 1].id;
      for (const row of rows) {
        broadcast({ sessionId, type: 'message', message: mapMessage(row) });
      }
    }

    if (!state.ended) {
      const session = getSession(sessionId);
      if (session && session.endedAt != null) {
        state.ended = true;
        broadcast({ sessionId, type: 'session_state', session });
      }
    }
  } catch (error) {
    warn('pollTail', error);
  }
}
