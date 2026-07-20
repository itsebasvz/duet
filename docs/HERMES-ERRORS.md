# Hermes — Errores, fallbacks y contrato CLI (Fase 0.2)

Investigado 2026-07-20 sobre Hermes Agent v0.18.2 (fuente: código en `~/.hermes/hermes-agent` + pruebas en vivo en el server). Base para el manejo de errores de duet (transversal, roadmap).

## Lo que Hermes maneja SOLO (auto-recovery interna)

Clasificador central: `agent/error_classifier.py` — taxonomía `FailoverReason` que decide la recuperación por cada fallo de API. Categorías relevantes:

| Categoría | Significado | Recuperación interna |
|---|---|---|
| `auth` (401/403) | Auth transitoria | Refresh/rotación de credencial |
| `auth_permanent` | Auth falló tras refresh | **Aborta** |
| `billing` (402) | **Créditos agotados** | Rotación inmediata de credencial |
| `rate_limit` (429) | Throttling por cuota | Backoff + rotación |
| `upstream_rate_limit` | 429 del agregador | Fallback a otro modelo (key sana) |
| `overloaded` (503/529) | Provider saturado | Backoff |
| `server_error` (500/502) | Error interno provider | Retry |
| `timeout` | Timeout conexión/lectura | Rebuild client + retry |
| `context_overflow` | Contexto excedido | **Compresión**, no failover |
| `model_not_found` (404) | Modelo inválido | Fallback a otro modelo |
| `content_policy_blocked` | Filtro de seguridad | No reintenta |
| `unknown` | Inclasificable | Retry con backoff |

- Retries: `agent.api_max_retries` en config.yaml (default **3**).
- **Cadena de fallback de providers** (`agent/agent_init.py:1140`): lista ordenada `fallback_providers` (o legacy `fallback_model`) en config — se recorre cuando el primario se agota (rate-limit, overload, conexión). *No configurada hoy en el server.*
- Compresión de contexto automática (threshold 50%).

Conclusión: duet **no** implementa retries hacia el provider — Hermes ya lo hace. Duet solo detecta el fallo terminal y lo comunica.

## Contrato CLI `hermes chat -q -Q` (validado en vivo)

| Canal | Contenido |
|---|---|
| **stdout** | Respuesta final del agente — o texto de error terminal (ej. `HTTP 401: Model X is not supported`) |
| **stderr** | `session_id: <id>` (por diseño: "Session ID goes to stderr so piped stdout is clean", cli.py:16215) |
| **exit 0** | Éxito |
| **exit 1** | Run falló (`result.failed`) o init falló (credenciales/agente) |
| **exit 130** | SIGINT |
| **exit 75** (EX_TEMPFAIL) | Solo con `HERMES_KANBAN_TASK` y `failure_reason` ∈ {rate_limit, billing} — no aplica a duet |

⚠️ Correcciones a hallazgos previos:
- `session_id` sale por **stderr**, no stdout (hallazgo anterior venía de capturas con `2>&1`). El driver debe parsear stderr.
- `failure_reason` granular ("rate_limit", "billing"…) existe internamente pero **no se expone**: no hay `--json` ni flag de output estructurado. Duet distingue el tipo de error parseando el texto de stdout (patrones: `HTTP 401`, `HTTP 402`, `429`, `timeout`, `overloaded`, `context`).
- Candidato a PR upstream: modo `--json` para salida estructurada (respuesta, session_id, failed, failure_reason).

## state.db y errores — hallazgo crítico

**Un error terminal de provider NO deja rastro en `state.db`**: la sesión queda con el mensaje `user` solamente, `ended_at = NULL`, `end_reason = NULL`, sin mensaje de error.

→ **El watcher de state.db sirve para el feed de actividad, no para detección de errores.** La fuente de verdad de errores es el proceso mismo: exit code + stdout/stderr. Duet debe supervisar el proceso spawneado siempre.

Columnas útiles de `sessions` para la UI: `end_reason` (valores observados: `cli_close`, `agent_close`, `session_reset`, `NULL` = viva/colgada), `input_tokens`/`output_tokens`/`cache_*` (presupuesto de contexto), `estimated_cost_usd`, `cwd`, `model`, `message_count`, `tool_call_count`, `compression_failure_error`, `handoff_error`.

## Otros contratos validados

- **Sesión inexistente en `--resume`**: exit 1, mensaje claro `Session not found: <id>`.
- **cwd NO se restaura** al resumir en modo `-q` (probado: sesión creada en `/tmp/hermes-test`, resumida desde `~`, `pwd` → `/home/sebs`). El flag `--no-restore-cwd` aplica al modo interactivo. → El driver de duet fija el `cwd` del spawn al directorio del proyecto (mejor que depender de rutas absolutas en briefs, aunque estas siguen siendo buena práctica).
- **Sesión "colgada"**: `ended_at`/`end_reason` en NULL no distingue viva de muerta — duet la detecta por su propio supervisor de proceso (timeout configurable por brief).

## Mapa de estados para la UI de duet

| Señal | Estado UI | Mensaje al usuario |
|---|---|---|
| Proceso vivo + mensajes fluyendo en state.db | `working` | Feed en vivo |
| exit 0 | `done` | Respuesta del worker |
| exit 1 + stdout con `HTTP 402`/`credit`/`quota` | `error` | "Créditos del provider agotados" |
| exit 1 + stdout con `HTTP 401`/`auth` | `error` | "Auth del provider falló" |
| exit 1 + stdout con `429`/`rate limit` | `error` | "Rate limit — Hermes agotó sus reintentos/fallbacks" |
| exit 1 + `Session not found` | `error` | "Sesión del worker perdida" (ofrecer nueva) |
| exit 1 otro | `error` | Texto crudo de stdout |
| Proceso vivo sin actividad > timeout | `stalled` | "Worker sin actividad hace N min" + acción kill |
| exit 130 / kill | `cancelled` | Cancelado |
