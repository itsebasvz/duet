# duet — Diseño y decisiones

Estado: brainstorm cerrado sobre base técnica, previo a desarrollo. Última actualización: 2026-07-20.

## Concepto

Sistema dual-agente para desarrollo de software. El eje **no** es orquestar por orquestar: es la **economía de tokens**. Un modelo caro piensa; uno más barato (o el que el usuario elija) ejecuta. Apps para orquestar hay mil; para trabajar eficiente con **solo dos modelos**, casi ninguna — ese es el hueco que duet llena.

- **Orquestador** (modelo "pensante", caro) — planea, escribe briefs, revisa entregas. No hace la talacha. **Elegible por el usuario** vía el selector de provider heredado del fork: Claude Code, Codex, Cursor, OpenCode. El usuario decide *quién piensa*.
- **Ejecutor (worker)**: agente CLI externo que escribe/corre el código. Primer worker: **Hermes Agent** (Nous Research). Diseño agnóstico para conectar otros a futuro (Codex, OpenCode, OpenClaw…). El usuario decide *quién ejecuta*.
- **UI web** (:8214): canal único del usuario. Chat con el orquestador + observabilidad total en vivo.

El valor no es "otro multi-agente", sino que **cada token caro se gasta en pensar, no en teclear**: el usuario controla ambos extremos y ve todo el intercambio.

## Decisiones firmes

| Tema | Decisión | Razón |
|---|---|---|
| Elección del orquestador | **Conservar el selector de provider del fork** (Claude / Codex / Cursor / OpenCode) | El usuario elige *quién piensa*; libertad en ambos extremos es el diferenciador, no atarse a un solo vendor |
| Ubicación del orquestador | En el mismo host que el worker | Elimina hop SSH; todo local |
| Integración Claude | Claude Code CLI headless: `claude -p --resume --output-format stream-json --append-system-prompt` | Streaming de eventos token a token; sesiones resumibles |
| Auth Claude | **Suscripción base vía `claude setup-token`** — nunca API key / créditos | Requisito duro: sin costos adicionales a la suscripción existente |
| Modelo orquestador (pruebas) | Haiku 4.5 o menor (`--model haiku`) | Ahorro de límites de suscripción durante desarrollo |
| Deploy | **systemd** user service (como corre Hermes) | Agentes necesitan binarios y repos del host; Docker sería infierno de mounts. Imagen Docker = empaque futuro opcional |
| Base de UI | **Fork de [siteboon/claudecodeui](https://github.com/siteboon/claudecodeui)** (12.7k★, activo) | Ya renderiza la experiencia Claude Code completa (streaming, tools, file explorer, git, terminal, móvil) y trae **abstracción multi-CLI** reutilizable para registrar workers |
| Licencia | **AGPL-3.0** (heredada del fork, aceptada conscientemente) | Proyecto self-hosted open-source; se renuncia a SaaS cerrado futuro |
| Auth UI | Password hasheado (argon2/bcrypt) + cookie de sesión, desde v1 | Suficiente para LAN; base mínima seria para open-source |
| Puerto | 8214 (verificado libre en host de referencia) | Convención del stack del autor |
| Chat embebido | Desde v1 (sin fase intermedia solo-observabilidad) | Decisión del usuario: centralizar desde el inicio |

## Diseño agnóstico de workers

- **System prompt "Duet"** base inyectado al orquestador (`--append-system-prompt`): roles, protocolo de delegación, entorno, worker activo.
- **`CLAUDE.md` por proyecto**: reglas específicas del repo en el que se trabaja.
- **Driver por worker** declarado en config:

```yaml
workers:
  hermes:
    invoke: hermes chat -q "{brief}" -Q --resume {session} --pass-session-id --source duet
    session_parse: "session_id: (\\S+)"
    feed_source: sqlite:~/.hermes/state.db
```

Cada worker nuevo = un driver: cómo invocarlo + cómo parsear su sesión + de dónde leer su actividad para el feed.

## Observabilidad (real-time)

- **Lado Claude**: eventos `stream-json` del CLI → SSE/WebSocket al navegador. Token a token.
- **Lado Hermes**: watcher sobre `~/.hermes/state.db` (SQLite WAL, polling sub-segundo). Tabla `messages`: `role`, `content`, `tool_calls`, `tool_name`, `reasoning`, `timestamp`. Nivel mensaje garantizado; nivel token bajo investigación.
- **Diffs**: `git diff` en vivo del repo del proyecto.
- Referencia de data cruda: dashboard nativo de Hermes (`hermes dashboard` :9119, Sessions → History) — muestra todo sin formato; duet lo renderiza con UX propia (diffs coloreados, output de terminal, reasoning colapsable, briefs 📤 vs respuestas 📥).

## Hallazgos validados (pruebas 2026-07-20, Hermes v0.18.2)

- Delegación headless funciona: `hermes chat -q "<brief>" -Q --resume <id> --pass-session-id` — `session_id` en primera línea de stdout, parseable.
- ⚠️ El cwd **no** se restaura al resumir sesión → los briefs deben usar rutas absolutas.
- Aprobaciones headless: sistema **"smart approval"** de Hermes auto-evalúa comandos peligrosos (flaggeó `rm -rf` y aprobó por target inofensivo). No es yolo ciego. Mitigación adicional: `HERMES_WRITE_SAFE_ROOT` + git como red de rescate.
- Compresión de contexto de Hermes activa por defecto (threshold 50%) — el worker se auto-compacta.
- `hermes mcp serve` expone solo puente de mensajería (no delegación) — descartado como canal.
- Dashboard nativo exige auth en bind no-loopback (hardening jun 2026) — acceso vía túnel SSH.

## Alternativas evaluadas y descartadas

| Alternativa | Por qué no |
|---|---|
| Frameworks (CrewAI, LangGraph, AutoGen, MetaGPT) | Poseen ellos las llamadas LLM; no manejan agentes CLI externos como workers |
| claude-flow / Anthropic Agent Teams | Solo orquestan instancias de Claude Code |
| Claude Squad / herdr | Multiplexores tmux para operador humano, sin delegación programática |
| A2A (Google) | Adopción real baja; Claude Code no lo habla |
| ACP vía `acpx` (gist "Remote Hermes ACP") | Válido pero pensado para el hop remoto; innecesario con orquestador local |
| API keys (Anthropic API + endpoint OpenAI-compatible) | Costo adicional; rompe requisito de suscripción base |
| fafawlf/claude-code-web como base (MIT) | Plan B: limpio y permisivo, pero habría que construir móvil, explorer, git panel… |
| slopus/happy (MIT, 22.7k★) | E2E encryption central pelea contra agregación server-side del feed |

## Roadmap

Ver [ROADMAP.md](ROADMAP.md) — plan de desarrollo por fases (Fase 0 auditoría → v0.1 MVP → v0.2 observabilidad → v0.3 delegación → v0.4 producción) con alcances explícitos y temas transversales.
