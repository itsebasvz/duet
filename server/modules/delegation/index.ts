/**
 * Public surface of the delegation module (v0.3 orchestration).
 */

export { buildDuetMcpServer } from '@/modules/delegation/delegate.service.js';
export type { DelegateContext, DelegationFrame } from '@/modules/delegation/delegate.service.js';
export { DUET_SYSTEM_PROMPT_APPEND } from '@/modules/delegation/duet-prompt.js';
