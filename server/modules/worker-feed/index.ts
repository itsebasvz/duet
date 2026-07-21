/**
 * Public surface of the worker-feed module.
 *
 * Cross-module consumers (e.g. the delegation orchestrator) import the worker
 * invoker and driver descriptors through this barrel; the module's internal
 * files (service, routes, poller) keep using relative imports.
 */

export { invokeWorker } from '@/modules/worker-feed/worker-invoker.service.js';
export type {
  WorkerInvokeInput,
  WorkerInvokeResult,
  WorkerInvokeStatus,
} from '@/modules/worker-feed/worker-invoker.service.js';
export { hermesDriver } from '@/modules/worker-feed/drivers/hermes.driver.js';
export type { WorkerDriver } from '@/modules/worker-feed/drivers/driver.types.js';
