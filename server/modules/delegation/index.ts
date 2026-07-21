/**
 * Public surface of the delegation module (v0.3 orchestration).
 */

export {
  buildDuetMcpServer,
  runDelegation,
  DELEGATE_TOOL_NAME,
  DELEGATE_TOOL_DESCRIPTION,
  delegateInputShape,
} from '@/modules/delegation/delegate.service.js';
export type {
  DelegateContext,
  DelegationFrame,
  DelegateArgs,
  DelegateOutcome,
} from '@/modules/delegation/delegate.service.js';
export {
  registerOrchestratorRun,
  getOrchestratorRun,
  revokeOrchestratorRun,
} from '@/modules/delegation/orchestrator-run.registry.js';
export { default as delegateMcpRoutes } from '@/modules/delegation/delegate-mcp.http.js';
export { DUET_SYSTEM_PROMPT_APPEND } from '@/modules/delegation/duet-prompt.js';
