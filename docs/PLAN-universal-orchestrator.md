# Plan — Orquestador universal

Estado: plan aprobado, previo a implementación. Fecha: 2026-07-21.
Alcance de esta fase: **Codex + OpenCode**. Cursor diferido (ver [KNOWN-ISSUES.md](KNOWN-ISSUES.md)).

## Objetivo

Hoy la delegación duet (tool `delegate` + system prompt del orquestador) solo
funciona con **Claude**, porque cuelga del Anthropic Agent SDK in-process
(`createSdkMcpServer` + `systemPrompt` preset append). Meta: que **cualquier
provider del selector** (Claude, Codex, OpenCode; Cursor después) pueda ser
**orquestador** — con el MCP `delegate` conectado y el system prompt duet
inyectado, sin importar cómo se lance ese provider.

Solo cambia el **lado orquestador**. El worker sigue siendo Hermes (su
universalización es trabajo futuro, ver final).

## Principio de diseño

Buscar siempre la vía **config-file / SDK estable**, no flags frágiles de CLI.
Un cambio en la línea de comandos de un CLI no debe romper la web. Todo lo
específico por provider se genera en un **directorio gestionado por duet**, nunca
escribiendo dentro del repo del usuario.

## Estado actual (anclas de código)

| Provider | Cómo se invoca | System prompt | MCP en runtime |
|---|---|---|---|
| **Claude** | SDK in-process — `server/claude-sdk.js:461` `queryClaudeSDK` | preset `claude_code` + `append` (`claude-sdk.js:513`) ✅ | in-process `createSdkMcpServer` (`delegate.service.ts:154`, inyectado `claude-sdk.js:508`) ✅ |
| **Codex** | SDK in-process `@openai/codex-sdk` — `server/openai-codex.js:225` `queryCodex` (`new Codex()` sin opciones, `:260`) | no configurado ❌ | no configurado ❌ |
| **OpenCode** | subprocess `opencode run` — `server/opencode-cli.js:125` `spawnOpenCode` | no configurado ❌ | no configurado ❌ |
| **Cursor** | subprocess `cursor-agent` — `server/cursor-cli.js:31` `spawnCursor` | solo archivo en cwd ❌ | solo archivo en cwd ❌ |

Ayudas que ya existen:
- Dispatch por mapa limpio: `server/index.js:113` `spawnFns` / `abortFns`.
- Registro de providers + submódulos MCP por provider: `provider.registry.ts`,
  `list/*/*-mcp.provider.ts` sobre base `shared/mcp/mcp.provider.ts`
  (leen/escriben la config MCP de cada CLI por scope).
- Delegación: `server/modules/delegation/` — `delegate.service.ts` (lógica del
  tool), `duet-prompt.ts` (prompts).

## Hallazgo clave — Codex NO necesita `codex exec`

El paquete `@openai/codex-sdk@0.144.1` **spawnea el binario `codex`** por debajo
(`child_process`, `codexPathOverride`) y su constructor `new Codex(options)`
expone (`node_modules/@openai/codex-sdk/dist/index.d.ts:216`):

- `config?: CodexConfigObject` — se aplana a `--config key=value` (dotted paths,
  literales TOML). Aquí inyectamos `mcp_servers.duet` y las instrucciones.
- `env?: Record<string,string>` — `CODEX_HOME`, `OPENAI_API_KEY`, tokens.
- `codexPathOverride?` — ruta al binario.

O sea: Codex **lee `~/.codex/config.toml` por defecto** y además acepta overrides
per-invocación **sin salir del SDK**. Es la vía estable buscada — nada de
construir la línea `codex exec` a mano.

## Arquitectura destino

### Pieza 1 — MCP `delegate` como servidor HTTP (streamable) hosteado por el backend

- Extraer la lógica del tool de dentro de `createSdkMcpServer`
  (`delegate.service.ts`) a un **handler transport-agnóstico**: recibe
  `{ brief, cwd, sessionCtx }` y hace lo mismo de hoy — graba el exchange en la
  DB, emite los frames WS (`brief`/`running`/`result`), llama `invokeWorker`.
- Montar un servidor **MCP streamable-HTTP** (`@modelcontextprotocol/sdk`) en el
  backend, p.ej. `POST /mcp` en **loopback**. Los 4 providers soportan MCP por
  `url`. Claude puede seguir in-process (su wrapper llama al mismo handler) o
  migrar a HTTP para unificar.
- **Ruteo por-run (crítico):** cada invocación de orquestador necesita que el MCP
  sepa a qué **sesión/cliente** pertenece, para grabar el exchange y emitir los
  frames al cliente correcto (in-process hoy va por closure; en HTTP no). Se
  inyecta un **token efímero por-run** en la config MCP del provider
  (header / `bearer_token_env_var`); el backend mantiene un mapa
  `token → sessionId` y lo revoca al terminar el run.
- **Seguridad:** bind loopback + token por-run. Sin token válido no se delega
  (evita que cualquier proceso local dispare delegaciones).

### Pieza 2 — Inyector de config de orquestación por provider

Antes de spawnear al orquestador, generar la config gestionada (env + archivos en
dir de duet) que: (a) registra el MCP duet (url + token), (b) entrega el system
prompt duet. Nueva abstracción en `IProvider`, p.ej.
`orchestrator-config.provider.ts` con
`buildOrchestratorLaunch(ctx) -> { env, files }`; cada provider implementa el suyo:

- **Claude:** preset `claude_code` + `append` (ya) + MCP in-process o HTTP.
- **Codex:** `new Codex({ config, env })`:
  - `config.mcp_servers.duet = { url, bearer_token_env_var: 'DUET_MCP_TOKEN' }`
  - instrucciones: `env.CODEX_HOME` → dir gestionado con `AGENTS.md` (framing
    duet) + `config.toml`. Preferido sobre `config.experimental_instructions_file`
    (marcado experimental — ver riesgos).
  - `env.DUET_MCP_TOKEN`, `env.OPENAI_API_KEY`.
- **OpenCode:** `env.OPENCODE_CONFIG` → `opencode.json` generado con
  `instructions[]` (framing duet) + `mcp.duet` (`type: http`, `url`, `headers`
  con el token). No toca el repo del usuario.

### Pieza 3 — Wire en cada spawn path

- `queryCodex` (`openai-codex.js:260`): `new Codex()` → `new Codex(opts)` cuando
  `DUET_DELEGATION` y el provider actúa de orquestador.
- `spawnOpenCode` (`opencode-cli.js`): setear `env.OPENCODE_CONFIG` + generar el
  archivo antes del spawn.
- `queryClaudeSDK`: ya funciona; opcional migrar su MCP a HTTP para unificar.

## Fases

- **U0 — Spike Codex (validación viva).** Ya verificado en el `.d.ts` que el SDK
  spawnea `codex` y acepta `config`/`env`. Falta la prueba viva: `new Codex({
  config: { mcp_servers: { … } } })` contra un MCP dummy y confirmar que el modelo
  llama al tool. Gate antes de construir.
- **U1 — Handler `delegate` transport-agnóstico.** Refactor de
  `delegate.service.ts`: separar la lógica del wrapper `createSdkMcpServer`.
  Claude sigue idéntico (su wrapper llama al handler).
- **U2 — Servidor MCP HTTP + ruteo por token.** Montar streamable-HTTP en el
  backend; registry `token → session`; auth loopback.
- **U3 — Inyector de orquestación (abstracción `IProvider`).** Interface + impl
  Claude como baseline.
- **U4 — Codex orquestador.** `buildCodexOrchestratorOptions` + wire `queryCodex`;
  test end-to-end de una delegación disparada desde Codex.
- **U5 — OpenCode orquestador.** `OPENCODE_CONFIG` generado + wire `spawnOpenCode`;
  test end-to-end. Pin de versión por los bugs de `run --format json`.
- **U6 — Cursor (diferido).** Ver KNOWN-ISSUES; requiere resolver la inyección
  no-invasiva primero.

## Riesgos

- **Codex `experimental_instructions_file`** es experimental (nombre/validación
  han cambiado entre versiones) → preferir `AGENTS.md` vía `CODEX_HOME`, que es
  estable; dejar el flag como fallback.
- **OpenCode `run --format json`** tiene bugs reportados (puede salir antes del
  `step_finish` final; requiere sesión previa en algunos casos) → pin de versión
  + fallback / retry.
- **Ruteo por-run:** si el token se filtra, otro proceso local podría delegar →
  mitigado con loopback + token efímero revocado al terminar.
- **Orden de escritura:** los CLIs leen su config al arrancar → el archivo/env
  gestionado debe existir **antes** del spawn.
- **AGENTS.md vs system prompt real:** en Codex/OpenCode el framing entra como
  mensaje user/context, no como system prompt puro (como sí lo hace el `append` de
  Claude). El contenido del framing es lo que importa; asimetría aceptada.

## Futuro (fuera de alcance)

Universalizar también el **worker**: mismos servicios base de duet + Hermes +
OpenClaw, etc. — que el usuario elija *quién ejecuta* igual que ya elige *quién
piensa*. Decisión del usuario; se planeará aparte.
