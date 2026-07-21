/**
 * Codex orchestrator — first HTTP-transport implementation of the seam.
 *
 * Unlike Claude (in-process SDK), Codex reaches `delegate` over the backend's
 * MCP streamable-HTTP endpoint. Each run mints an ephemeral token; the token
 * lives in the loopback URL path, so no bearer/env plumbing is needed and the
 * spawn path can inject it via `new Codex({ config: { mcp_servers } })` without
 * writing any file. `CODEX_HOME` is deliberately left untouched — overriding it
 * would hide the user's Codex auth — so the duet framing is delivered by the
 * spawn path prepending `systemPromptAppend` to the first turn (the accepted
 * user/context asymmetry, since Codex has no stable system-prompt file channel).
 *
 * `dispose` revokes the token so a completed run can no longer be delegated to.
 */

import { buildDelegateMcpUrl } from '@/modules/delegation/delegate-mcp.http.js';
import { DUET_SYSTEM_PROMPT_APPEND } from '@/modules/delegation/duet-prompt.js';
import { registerOrchestratorRun, revokeOrchestratorRun } from '@/modules/delegation/orchestrator-run.registry.js';
import type {
  IProviderOrchestrator,
  OrchestratorLaunch,
  OrchestratorRunContext,
} from '@/modules/delegation/orchestrator.types.js';

class CodexOrchestrator implements IProviderOrchestrator {
  readonly canOrchestrate = true;

  buildLaunch(ctx: OrchestratorRunContext): OrchestratorLaunch {
    const token = registerOrchestratorRun({
      provider: 'codex',
      getSessionId: ctx.getSessionId,
      defaultCwd: ctx.cwd,
      send: ctx.send,
    });
    return {
      mcp: { transport: 'http', url: buildDelegateMcpUrl(token), token },
      systemPromptAppend: DUET_SYSTEM_PROMPT_APPEND,
      env: {},
      files: [],
      dispose: () => revokeOrchestratorRun(token),
    };
  }
}

export const codexOrchestrator = new CodexOrchestrator();
