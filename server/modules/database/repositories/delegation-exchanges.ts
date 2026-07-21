/**
 * Delegation exchanges repository.
 *
 * One row per brief the orchestrator (Claude) delegated to a worker CLI, plus
 * the worker's response. The row is the "duo" for that turn: it pairs the
 * orchestrator session (`claude_session_id`) with the worker's own session
 * (`worker_session_id`, filled once the worker announces it). Lifecycle:
 *   create() → pending
 *   markRunning() → running   (worker spawned, session id known)
 *   markDone() / markError() → terminal
 */

import crypto from 'crypto';

import { getConnection } from '@/modules/database/connection.js';

export type DelegationStatus = 'pending' | 'running' | 'done' | 'error';

export type DelegationExchangeRow = {
  id: string;
  claude_session_id: string;
  worker_driver_id: string;
  worker_session_id: string | null;
  cwd: string | null;
  brief: string;
  status: DelegationStatus;
  result_text: string | null;
  error_message: string | null;
  exit_code: number | null;
  cost_usd: number | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS =
  'id, claude_session_id, worker_driver_id, worker_session_id, cwd, brief, status, result_text, error_message, exit_code, cost_usd, created_at, updated_at';

export const delegationExchangesDb = {
  /** Records a new pending delegation and returns its generated id. */
  create(input: {
    claudeSessionId: string;
    workerDriverId: string;
    brief: string;
    cwd?: string | null;
  }): string {
    const db = getConnection();
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO delegation_exchanges (id, claude_session_id, worker_driver_id, cwd, brief, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`
    ).run(id, input.claudeSessionId, input.workerDriverId, input.cwd ?? null, input.brief);
    return id;
  },

  /** Marks the exchange running once the worker process is spawned. */
  markRunning(id: string, workerSessionId: string | null): void {
    const db = getConnection();
    db.prepare(
      `UPDATE delegation_exchanges
         SET status = 'running', worker_session_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(workerSessionId, id);
  },

  /** Marks the exchange done with the worker's final output. */
  markDone(id: string, input: { resultText: string; exitCode?: number | null; costUsd?: number | null }): void {
    const db = getConnection();
    db.prepare(
      `UPDATE delegation_exchanges
         SET status = 'done', result_text = ?, exit_code = ?, cost_usd = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(input.resultText, input.exitCode ?? null, input.costUsd ?? null, id);
  },

  /** Marks the exchange failed with a user-facing message. */
  markError(id: string, input: { errorMessage: string; exitCode?: number | null }): void {
    const db = getConnection();
    db.prepare(
      `UPDATE delegation_exchanges
         SET status = 'error', error_message = ?, exit_code = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(input.errorMessage, input.exitCode ?? null, id);
  },

  getById(id: string): DelegationExchangeRow | null {
    const db = getConnection();
    const row = db
      .prepare(`SELECT ${COLUMNS} FROM delegation_exchanges WHERE id = ?`)
      .get(id) as DelegationExchangeRow | undefined;
    return row ?? null;
  },

  /** Exchanges for one orchestrator session, oldest first (chat order). */
  listBySession(claudeSessionId: string): DelegationExchangeRow[] {
    const db = getConnection();
    return db
      .prepare(
        `SELECT ${COLUMNS} FROM delegation_exchanges
         WHERE claude_session_id = ? ORDER BY created_at ASC`
      )
      .all(claudeSessionId) as DelegationExchangeRow[];
  },
};
