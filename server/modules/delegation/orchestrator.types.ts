/**
 * The orchestrator-side abstraction that makes duet universal.
 *
 * U1/U2 gave the WORKER-facing `delegate` handler two transports (in-process SDK
 * tool + HTTP). This is the ORCHESTRATOR-facing seam: per provider, how to wire
 * that tool and the duet framing into a run before the provider is spawned.
 * Claude does it through the Agent SDK (in-process MCP + `systemPrompt` append);
 * Codex/OpenCode do it through config files + env pointing at the HTTP endpoint.
 * `IProviderOrchestrator` is the one shape every spawn path resolves, so the
 * spawn code never special-cases a provider's launch mechanics.
 */

import type { DelegationFrame } from './delegate.service.js';

/** Live-run primitives an orchestrator launch needs, transport-neutral. */
export interface OrchestratorRunContext {
  /** Orchestrator session id, resolved lazily (null until the provider announces it). */
  getSessionId: () => string | null;
  /** Absolute working directory the orchestrator run uses. */
  cwd: string;
  /** Pushes an exchange frame to the client watching this run. */
  send: (frame: DelegationFrame) => void;
}

/** A file duet writes before spawning a provider (always in a duet-managed dir). */
export interface OrchestratorManagedFile {
  /** Absolute path inside duet's managed config dir — never the user's repo. */
  path: string;
  contents: string;
}

/** How a provider reaches the duet `delegate` tool for one run. */
export type OrchestratorMcpWiring =
  | { transport: 'in-process'; server: unknown; allowedTool: string }
  | { transport: 'http'; url: string; token: string };

/** Everything needed to launch a provider as a duet orchestrator for one run. */
export interface OrchestratorLaunch {
  mcp: OrchestratorMcpWiring;
  /** duet framing text; each provider delivers it its own way (SDK append / file). */
  systemPromptAppend: string;
  /** Process env additions (empty for SDK-in-process providers like Claude). */
  env: Record<string, string>;
  /** Managed files to write pre-spawn (empty for in-process providers). */
  files: OrchestratorManagedFile[];
  /** Idempotent teardown: revoke the run token and remove managed files. */
  dispose: () => void;
}

/** Per-provider orchestrator config injector. */
export interface IProviderOrchestrator {
  /** Whether this provider can currently act as a duet orchestrator. */
  readonly canOrchestrate: boolean;
  /** Builds the per-run wiring that turns this provider into a duet orchestrator. */
  buildLaunch(ctx: OrchestratorRunContext): OrchestratorLaunch;
}
