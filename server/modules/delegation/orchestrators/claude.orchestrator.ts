/**
 * Claude orchestrator — the baseline implementation of `IProviderOrchestrator`.
 *
 * Claude runs on the Anthropic Agent SDK in-process, so it wires `delegate` as an
 * in-process MCP server and delivers the duet framing through the SDK
 * `systemPrompt` append — not a config file. There is no per-run token or managed
 * file: the tool executes in the same process, so nothing is routed over HTTP and
 * nothing needs cleanup. Every other provider (Codex, OpenCode) diverges from
 * this baseline only in that it delivers the same two things (MCP + framing)
 * through files/env instead.
 */

import { buildDuetMcpServer, DELEGATE_TOOL_NAME } from '@/modules/delegation/delegate.service.js';
import { DUET_SYSTEM_PROMPT_APPEND } from '@/modules/delegation/duet-prompt.js';
import type {
  IProviderOrchestrator,
  OrchestratorLaunch,
  OrchestratorRunContext,
} from '@/modules/delegation/orchestrator.types.js';

/** In-process SDK tool id: server name `duet` + tool name `delegate`. */
const DELEGATE_ALLOWED_TOOL = `mcp__duet__${DELEGATE_TOOL_NAME}`;

class ClaudeOrchestrator implements IProviderOrchestrator {
  readonly canOrchestrate = true;

  buildLaunch(ctx: OrchestratorRunContext): OrchestratorLaunch {
    const server = buildDuetMcpServer({
      provider: 'claude',
      getSessionId: ctx.getSessionId,
      defaultCwd: ctx.cwd,
      send: ctx.send,
    });
    return {
      mcp: { transport: 'in-process', server, allowedTool: DELEGATE_ALLOWED_TOOL },
      systemPromptAppend: DUET_SYSTEM_PROMPT_APPEND,
      env: {},
      files: [],
      dispose: () => {},
    };
  }
}

export const claudeOrchestrator = new ClaudeOrchestrator();
