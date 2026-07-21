/**
 * The `delegate` tool — the heart of duet orchestration.
 *
 * Exposed to the orchestrator (Claude) as an in-process SDK MCP tool
 * (`mcp__duet__delegate`). When Claude calls it, the handler records the
 * exchange, spawns the worker CLI against its driver contract, supervises the
 * process, and returns the worker's output as the tool result — so the whole
 * hand-off happens inside the same orchestrator turn.
 *
 * Transport-agnostic on purpose: the caller passes a `send(frame)` callback, so
 * this module never imports the WebSocket/normalized-message layer. claude-sdk
 * wraps each frame for the client (the 📤/📥 exchange cards).
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

import { delegationExchangesDb, delegationWorkerMessagesDb } from '@/modules/database/index.js';
import type { DelegationExchangeRow } from '@/modules/database/index.js';
import { getMessages, hermesDriver, invokeWorker } from '@/modules/worker-feed/index.js';

import { WORKER_BRIEF_PREAMBLE } from './duet-prompt.js';

/** A live delegation event pushed to the client for a single exchange. */
export type DelegationFrame = {
  kind: 'delegation';
  provider: 'claude';
  /** Orchestrator session this exchange belongs to. */
  sessionId: string;
  /** Lifecycle stage: brief sent → worker running → final result. */
  event: 'brief' | 'running' | 'result';
  exchange: DelegationExchangeRow;
};

/** Everything the tool needs from the live orchestrator run. */
export type DelegateContext = {
  /** The orchestrator session id, resolved lazily (set once Claude announces it). */
  getSessionId: () => string | null;
  /** Working directory used when the brief omits `cwd`. */
  defaultCwd?: string;
  /** Pushes an exchange frame to the client. */
  send: (frame: DelegationFrame) => void;
};

function textResult(text: string, isError = false) {
  return { content: [{ type: 'text' as const, text }], isError };
}

/**
 * Persists the worker's transcript for a completed exchange so its thinking +
 * tool calls survive a reload (the live feed and the worker's own store are both
 * ephemeral). Best-effort: a failure here must never fail the delegation, since
 * the worker already produced its result. Taken only on success — the process
 * has exited, so the worker store's rows for this session are final.
 */
function snapshotWorkerTrace(exchangeId: string, workerSessionId: string | null): void {
  if (!workerSessionId) {
    return;
  }
  try {
    const messages = getMessages(workerSessionId);
    if (messages.length > 0) {
      delegationWorkerMessagesDb.replaceForExchange(exchangeId, messages);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[Delegate] worker-trace snapshot failed:', message);
  }
}

/**
 * Builds the in-process `duet` MCP server exposing the `delegate` tool, bound to
 * one orchestrator run via `ctx`.
 */
export function buildDuetMcpServer(ctx: DelegateContext) {
  const delegate = tool(
    'delegate',
    'Hand a self-contained task to the worker CLI, which executes it in its own ' +
      'process and returns the result. The worker does NOT see this conversation, ' +
      'so the brief must be fully self-contained (goal, paths, constraints, ' +
      'definition of done). Use for hands-on execution; keep planning and review ' +
      'to yourself.',
    {
      brief: z
        .string()
        .min(1)
        .describe('Self-contained task for the worker: goal, relevant paths, constraints, what "done" means.'),
      cwd: z
        .string()
        .optional()
        .describe('Absolute working directory the worker runs in. Defaults to the orchestrator cwd.'),
    },
    async (args) => {
      const claudeSessionId = ctx.getSessionId();
      if (!claudeSessionId) {
        return textResult('La sesión del orquestador aún no está lista; reintenta la delegación.', true);
      }

      const cwd = args.cwd ?? ctx.defaultCwd ?? process.cwd();
      // Continue this orchestrator's existing worker thread when one exists, so
      // the worker keeps its context (no re-exploring) and the reloaded prefix
      // hits the prompt cache. The stored `brief` stays the raw text Claude sent
      // (clean cards); only the FIRST brief of a thread carries the identity
      // preamble — on resume the worker already has it.
      const resumeSessionId = delegationExchangesDb.latestWorkerSessionId(claudeSessionId);
      const workerBrief = resumeSessionId ? args.brief : `${WORKER_BRIEF_PREAMBLE}\n${args.brief}`;

      const id = delegationExchangesDb.create({
        claudeSessionId,
        workerDriverId: hermesDriver.id,
        brief: args.brief,
        cwd,
      });

      const emit = (event: DelegationFrame['event']) => {
        const exchange = delegationExchangesDb.getById(id);
        if (exchange) {
          ctx.send({ kind: 'delegation', provider: 'claude', sessionId: claudeSessionId, event, exchange });
        }
      };

      emit('brief');

      let workerSessionId: string | null = null;
      const result = await invokeWorker({
        brief: workerBrief,
        cwd,
        driver: hermesDriver,
        resumeSessionId,
        onSessionId: (sessionId) => {
          workerSessionId = sessionId;
          delegationExchangesDb.markRunning(id, sessionId);
          emit('running');
        },
      });

      if (result.status === 'done') {
        delegationExchangesDb.markDone(id, {
          resultText: result.resultText,
          exitCode: result.exitCode,
        });
        snapshotWorkerTrace(id, workerSessionId);
        emit('result');
        return textResult(result.resultText || '(el worker terminó sin producir salida)');
      }

      const errorMessage = result.errorMessage ?? 'El worker falló sin un mensaje de error.';
      delegationExchangesDb.markError(id, { errorMessage, exitCode: result.exitCode });
      emit('result');
      return textResult(`El worker falló: ${errorMessage}`, true);
    },
  );

  return createSdkMcpServer({ name: 'duet', version: '0.3.0', tools: [delegate] });
}
