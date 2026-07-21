# Known issues

## Orquestador Cursor: sin canal no-invasivo para system prompt + MCP

**Status:** deferred — apartado a favor de Codex + OpenCode
(ver [PLAN-universal-orchestrator.md](PLAN-universal-orchestrator.md)).

**Problema.** Para que Cursor (`cursor-agent`, `server/cursor-cli.js:31`) sea
orquestador duet hay que inyectarle dos cosas por-run: el system prompt duet y el
MCP `delegate`. Cursor no ofrece canal limpio para ninguna:

- **System prompt:** sin flag. Solo por archivo leído del cwd — `AGENTS.md`,
  `CLAUDE.md` o `.cursor/rules/*.md`.
- **MCP:** sin flag per-invocación. Solo por archivo — `.cursor/mcp.json` (en el
  cwd) o `~/.cursor/mcp.json` (global, persistente).

Ambas vías obligan a **escribir dentro del repo del usuario** (invasivo: deja
basura, colisiona con reglas reales del proyecto) o a **mutar la config global**
(siempre-on, se filtra a usos de Cursor ajenos a duet).

**Fricciones extra.** Sin flags per-invocación para MCP; reportes de `-p`/print
colgándose; `--resume` cuyo id hay que validar empíricamente contra el
`session_id` emitido; en headless exige `--trust` y `--approve-mcps` para no
bloquear.

**Alternativas a explorar.**
- cwd gestionado (espejo/symlink del repo real) donde sí es seguro escribir
  `AGENTS.md` + `.cursor/mcp.json`, en vez del repo del usuario.
- config global toggled por env con cleanup determinista post-run.
- esperar soporte de flags per-invocación (system prompt / MCP) en el CLI.

**Decisión 2026-07-21.** Apartar Cursor como orquestador; enfocar Codex +
OpenCode (que sí tienen inyección por config-file no-invasiva). Reevaluar cuando
el CLI de Cursor ofrezca inyección per-invocación.

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

## Orquestador Codex: `delegate` MCP solo funciona bajo `danger-full-access`

**Status:** worked around — delegación Codex atada a Bypass Permissions.

**Problema.** Un run de Codex no-interactivo (SDK `runStreamed`, que envuelve
`codex exec`) **auto-cancela toda llamada a herramienta MCP** con
`user cancelled MCP tool call` salvo cuando el sandbox es `danger-full-access`.
Verificado contra codex 0.144.1, transporte HTTP y stdio, con:
`sandbox_mode=read-only|workspace-write` × `approval_policy=untrusted|on-request|
on-failure|never` × `mcp_servers.<x>.default_tools_approval_mode=auto` ×
`sandbox_workspace_write.network_access=true`. **Todas cancelan** menos
`danger-full-access`. Bajo workspace-write la sesión MCP *sí* se abre (el server
acuña session id), pero la *llamada* a la tool se deniega en el gate de aprobación.

**Por qué no hay término medio.** El SDK (`ThreadOptions`/`TurnOptions`) no expone
callback de aprobación per-call — `approvalPolicy` es solo un flag. No hay forma de
auto-aprobar únicamente `delegate` dejando el bash de Codex sandboxeado.

**Decisión 2026-07-21.** Activar la delegación Codex solo en modo **Bypass
Permissions** (que ya mapea a `danger-full-access`). En default/acceptEdits el run
queda sandboxeado y la delegación off — en vez de ampliar en silencio el sandbox
elegido por el usuario (que dejaba a Codex corriendo bash sin restricción).

**Canal del framing duet.** Va por `config.developer_instructions` (rol developer),
no prepend al turno del usuario — si no, se persiste en el rollout de la sesión y la
UI lo renderiza como mensaje del propio usuario.
