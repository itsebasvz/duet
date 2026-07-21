/**
 * Delegation worker-messages repository.
 *
 * Durable snapshot of a worker's transcript for one delegation exchange, taken
 * when the exchange completes. Rows mirror the driver-agnostic
 * `WorkerFeedMessage` shape so the same table serves any worker CLI; complex
 * fields (`tool_calls`, `tool_result`) are JSON-encoded and round-tripped back
 * to their structured form on read. `seq` is the worker's own message id, which
 * preserves order and keeps snapshot keys aligned with live websocket frames.
 */

import { getConnection } from '@/modules/database/connection.js';
import type { WorkerFeedMessage } from '@/modules/worker-feed/index.js';

type DelegationWorkerMessageRow = {
  seq: number;
  role: string;
  kind: string;
  content: string | null;
  tool_name: string | null;
  tool_call_id: string | null;
  tool_calls: string | null;
  tool_result: string | null;
  reasoning: string | null;
  finish_reason: string | null;
  timestamp: number;
  active: number;
  compacted: number;
};

const READ_COLUMNS =
  'seq, role, kind, content, tool_name, tool_call_id, tool_calls, tool_result, reasoning, finish_reason, timestamp, active, compacted';

function rowToMessage(row: DelegationWorkerMessageRow): WorkerFeedMessage {
  return {
    id: row.seq,
    role: row.role,
    kind: row.kind as WorkerFeedMessage['kind'],
    content: row.content,
    toolName: row.tool_name,
    toolCallId: row.tool_call_id,
    toolCalls: row.tool_calls ? (JSON.parse(row.tool_calls) as WorkerFeedMessage['toolCalls']) : null,
    toolResult: row.tool_result == null ? null : JSON.parse(row.tool_result),
    reasoning: row.reasoning,
    finishReason: row.finish_reason,
    timestamp: row.timestamp,
    active: row.active !== 0,
    compacted: row.compacted !== 0,
  };
}

export const delegationWorkerMessagesDb = {
  /**
   * Replaces the stored snapshot for an exchange with `messages` in one
   * transaction (idempotent — a re-snapshot overwrites rather than duplicates).
   */
  replaceForExchange(exchangeId: string, messages: WorkerFeedMessage[]): void {
    const db = getConnection();
    const insert = db.prepare(
      `INSERT INTO delegation_worker_messages
         (exchange_id, seq, role, kind, content, tool_name, tool_call_id,
          tool_calls, tool_result, reasoning, finish_reason, timestamp, active, compacted)
       VALUES (@exchange_id, @seq, @role, @kind, @content, @tool_name, @tool_call_id,
          @tool_calls, @tool_result, @reasoning, @finish_reason, @timestamp, @active, @compacted)`
    );
    const run = db.transaction((rows: WorkerFeedMessage[]) => {
      db.prepare('DELETE FROM delegation_worker_messages WHERE exchange_id = ?').run(exchangeId);
      for (const m of rows) {
        insert.run({
          exchange_id: exchangeId,
          seq: m.id,
          role: m.role,
          kind: m.kind,
          content: m.content,
          tool_name: m.toolName,
          tool_call_id: m.toolCallId,
          tool_calls: m.toolCalls ? JSON.stringify(m.toolCalls) : null,
          tool_result: m.toolResult == null ? null : JSON.stringify(m.toolResult),
          reasoning: m.reasoning,
          finish_reason: m.finishReason,
          timestamp: m.timestamp,
          active: m.active ? 1 : 0,
          compacted: m.compacted ? 1 : 0,
        });
      }
    });
    run(messages);
  },

  /** Snapshot for one exchange, in worker order. */
  listByExchange(exchangeId: string): WorkerFeedMessage[] {
    const db = getConnection();
    const rows = db
      .prepare(
        `SELECT ${READ_COLUMNS} FROM delegation_worker_messages
         WHERE exchange_id = ? ORDER BY seq ASC`
      )
      .all(exchangeId) as DelegationWorkerMessageRow[];
    return rows.map(rowToMessage);
  },

  /**
   * Snapshots for many exchanges at once, grouped by exchange id. Used to embed
   * worker traces when listing a session's exchanges without an N+1 query.
   */
  byExchangeIds(exchangeIds: string[]): Map<string, WorkerFeedMessage[]> {
    const grouped = new Map<string, WorkerFeedMessage[]>();
    if (exchangeIds.length === 0) {
      return grouped;
    }
    const db = getConnection();
    const placeholders = exchangeIds.map(() => '?').join(', ');
    const rows = db
      .prepare(
        `SELECT exchange_id, ${READ_COLUMNS} FROM delegation_worker_messages
         WHERE exchange_id IN (${placeholders}) ORDER BY seq ASC`
      )
      .all(...exchangeIds) as (DelegationWorkerMessageRow & { exchange_id: string })[];
    for (const row of rows) {
      const list = grouped.get(row.exchange_id) ?? [];
      list.push(rowToMessage(row));
      grouped.set(row.exchange_id, list);
    }
    return grouped;
  },
};
