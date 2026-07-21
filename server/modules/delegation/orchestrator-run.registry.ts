/**
 * Per-run routing for HTTP-originated delegations.
 *
 * The in-process SDK tool (Claude) closes over its run's WebSocket writer, so it
 * always knows which client to answer. An HTTP MCP request does not — it arrives
 * on the shared `/mcp` endpoint outside any orchestrator run. This registry
 * bridges the gap: each orchestrator run mints an ephemeral token, the token is
 * injected into the provider's MCP config (url path / bearer), and the HTTP
 * handler resolves `token → DelegateContext` to reach the right run (its
 * session id, cwd, and frame `send`).
 *
 * The token is the only credential the `/mcp` endpoint accepts, so it must be
 * unguessable and revoked the moment the run ends — a leaked live token would let
 * any loopback process trigger delegations against that run.
 */

import { randomBytes } from 'node:crypto';

import type { DelegateContext } from './delegate.service.js';

const runsByToken = new Map<string, DelegateContext>();

/** Registers a live orchestrator run and returns its ephemeral routing token. */
export function registerOrchestratorRun(ctx: DelegateContext): string {
  const token = randomBytes(32).toString('hex');
  runsByToken.set(token, ctx);
  return token;
}

/** Resolves a token to its run context, or null if unknown/revoked. */
export function getOrchestratorRun(token: string): DelegateContext | null {
  return runsByToken.get(token) ?? null;
}

/** Revokes a run's token; called when the orchestrator run ends. */
export function revokeOrchestratorRun(token: string): void {
  runsByToken.delete(token);
}
