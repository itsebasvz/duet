# Known issues

## Worker: `HTTP 400 Upstream request failed` (Kimi via Console Go)

**Status:** open — worked around by preferring Minimax as the worker model.

**Symptom.** A delegated worker run dies with
`HTTP 400: Error from provider (Console Go): Upstream request failed`.
The task itself often *completes* (file written, correct output, report printed)
before the process exits non-zero, so it is a late-turn failure in the agent loop,
not a bad request from the brief.

**Reproduction / frequency.** Not transient. Fails roughly **1 in 3 runs**, and
**only with Kimi models** (`kimi-k2.7-code`) routed through the Console Go gateway
(`opencode.ai/zen/go`). The same brief, cwd, tool-use, and reasoning settings run
on **Minimax** (`minimax-m3`) do **not** fail. Confirmed 2026-07-21 by running the
identical valsurprise brief repeatedly against each model.

**Where it surfaces in duet.** The worker process exits non-zero, so
`invokeWorker` reports `status: 'error'` and the whole delegation is marked failed —
even when the file work landed. The orchestrator then re-does the task (deletes the
artifact, re-delegates), wasting tokens.

**Mitigations in place.**
- `hermes.driver.ts` `errorSignals.process` now classifies `HTTP 400 / upstream
  request failed` into a clear message instead of dumping the stdout tail.
- Operationally: run the worker on Minimax until the gateway/Kimi path stabilizes.

**Still open (design).** A non-zero exit after the deliverable already landed still
discards good work. Surfacing partial worker output on failure is deferred.

**Suspected root cause.** Upstream (Console Go → Kimi) intermittently rejects a
multi-turn payload (tool_use/tool_result + reasoning) with 400. Needs gateway-side
logs to confirm; not a duet or Hermes-logic bug.
