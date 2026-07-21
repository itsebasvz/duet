/**
 * Resolves the orchestrator injector for a provider.
 *
 * Only providers with a live implementation appear here; the rest return null so
 * a spawn path can treat "cannot orchestrate" uniformly (Cursor is deferred, see
 * KNOWN-ISSUES). U4/U5 register the Codex and OpenCode orchestrators alongside.
 */

import { claudeOrchestrator } from '@/modules/delegation/orchestrators/claude.orchestrator.js';
import type { IProviderOrchestrator } from '@/modules/delegation/orchestrator.types.js';

const orchestrators: Record<string, IProviderOrchestrator> = {
  claude: claudeOrchestrator,
};

/** Returns a provider's orchestrator, or null if it cannot orchestrate yet. */
export function resolveOrchestrator(provider: string): IProviderOrchestrator | null {
  const orchestrator = orchestrators[provider];
  return orchestrator?.canOrchestrate ? orchestrator : null;
}
