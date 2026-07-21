/**
 * The `delegate` tool exposed over MCP streamable-HTTP.
 *
 * This is the transport that makes duet orchestration universal: any provider
 * whose MCP client speaks streamable-HTTP (Codex, OpenCode, and Claude if we
 * unify) can reach `delegate` by pointing at `POST /mcp/:token`. The in-process
 * SDK tool (`buildDuetMcpServer`) and this router are two faces of the same
 * `runDelegation` handler — nothing here re-implements delegation logic.
 *
 * Routing: the path token identifies the orchestrator run (see
 * `orchestrator-run.registry`). Without a live token the endpoint refuses to
 * delegate, and requests are accepted only from loopback — the two together are
 * the whole security model for a backend-local MCP server.
 *
 * Sessions are stateful per the MCP spec: an `initialize` POST mints a session
 * id, later requests carry it in `Mcp-Session-Id`, and the transport is torn
 * down on close. Each session is bound to the run context its token resolved to.
 */

import { randomUUID } from 'node:crypto';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';

import {
  DELEGATE_TOOL_NAME,
  DELEGATE_TOOL_DESCRIPTION,
  delegateInputShape,
  runDelegation,
} from './delegate.service.js';
import type { DelegateArgs, DelegateContext } from './delegate.service.js';
import { getOrchestratorRun } from './orchestrator-run.registry.js';

/** Live transports keyed by MCP session id; entries are removed on close. */
const transportsBySession = new Map<string, StreamableHTTPServerTransport>();

function isLoopback(req: express.Request): boolean {
  const address = req.socket.remoteAddress ?? '';
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

/** Builds a fresh MCP server bound to one run's context for a new session. */
function buildMcpServer(ctx: DelegateContext): McpServer {
  const server = new McpServer({ name: 'duet', version: '0.3.0' });
  server.registerTool(
    DELEGATE_TOOL_NAME,
    { description: DELEGATE_TOOL_DESCRIPTION, inputSchema: delegateInputShape },
    async (args) => {
      try {
        const outcome = await runDelegation(args as DelegateArgs, ctx);
        return { content: [{ type: 'text' as const, text: outcome.text }], isError: outcome.isError };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: `Delegation failed: ${message}` }], isError: true };
      }
    },
  );
  return server;
}

function jsonRpcError(res: express.Response, status: number, message: string): void {
  res.status(status).json({
    jsonrpc: '2.0',
    error: { code: -32000, message },
    id: null,
  });
}

const router = express.Router();

// The path token is the only credential; combined with loopback-only access it
// is the endpoint's whole security model. Reject anything else before touching
// the MCP machinery.
router.use('/:token', (req, res, next) => {
  if (!isLoopback(req)) {
    jsonRpcError(res, 403, 'duet MCP is loopback-only.');
    return;
  }
  next();
});

router.post('/:token', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  const existingId = typeof sessionId === 'string' ? sessionId : undefined;

  let transport: StreamableHTTPServerTransport | undefined = existingId
    ? transportsBySession.get(existingId)
    : undefined;

  if (!transport) {
    if (existingId || !isInitializeRequest(req.body)) {
      jsonRpcError(res, 400, 'Bad Request: no valid session id for a non-initialize request.');
      return;
    }
    const ctx = getOrchestratorRun(req.params.token);
    if (!ctx) {
      jsonRpcError(res, 401, 'Unknown or revoked delegation token.');
      return;
    }
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transportsBySession.set(id, transport as StreamableHTTPServerTransport);
      },
    });
    transport.onclose = () => {
      if (transport?.sessionId) {
        transportsBySession.delete(transport.sessionId);
      }
    };
    await buildMcpServer(ctx).connect(transport);
  }

  await transport.handleRequest(req, res, req.body);
});

// GET (server->client SSE) and DELETE (session teardown) reuse the session's
// existing transport; they never open a new one.
async function handleSessionRequest(req: express.Request, res: express.Response): Promise<void> {
  const sessionId = req.headers['mcp-session-id'];
  const transport = typeof sessionId === 'string' ? transportsBySession.get(sessionId) : undefined;
  if (!transport) {
    jsonRpcError(res, 400, 'Bad Request: unknown session id.');
    return;
  }
  await transport.handleRequest(req, res);
}

router.get('/:token', handleSessionRequest);
router.delete('/:token', handleSessionRequest);

export default router;
