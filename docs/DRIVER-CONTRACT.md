# Contrato de driver de worker (Fase 0.2)

Un **driver** describe UN worker CLI de forma declarativa para que duet lo pueda
observar — y, desde v0.3, invocar — sin cablear los detalles del CLI por todo el
código. Hermes es el driver de referencia; Codex / OpenCode / OpenClaw se añaden
después escribiendo otro descriptor con el mismo contrato.

Forma canónica del contrato = **YAML** (este documento). Forma ejecutable =
descriptor TypeScript en `server/modules/worker-feed/drivers/*.driver.ts`,
tipado contra `driver.types.ts`. No hay parser YAML en runtime: el YAML es la
especificación humana; el TS es su implementación (evita una dependencia extra;
la carga declarativa desde config llega en v0.4, roadmap línea 69).

## Las cuatro secciones

| Sección | Qué define | Consumido |
|---|---|---|
| `invoke` | cómo duet lanza el worker (comando, args, tag de origen, de dónde sale el session_id) | v0.3 |
| `session_parse` | tabla/columnas para leer una sesión almacenada → resumen | **ahora** |
| `feed_source` | de dónde salen los mensajes en vivo (store SQLite, polling, ventana de stall) | **ahora** |
| `error_signals` | cómo se manifiesta el fallo: columnas in-store + reglas de proceso (exit + stdout) | in-store **ahora**, proceso v0.3 |

## Contrato en YAML (referencia: Hermes)

```yaml
id: hermes
label: Hermes

invoke:                          # v0.3 — el supervisor spawnea contra esto
  command: hermes
  args: [chat, -q, -Q, "{brief}"]   # {brief} = prompt de delegación; array fijo, sin shell
  source_tag: { flag: --source, value: duet }  # el worker distingue duet del usuario
  brief_on_stdin: false
  session_id:                    # Hermes imprime `session_id: <id>` en stderr
    stream: stderr
    pattern: 'session_id:\s*(\S+)'

session_parse:                   # ahora
  table: sessions
  id_column: id
  ended_column: ended_at         # NULL = viva/colgada; con valor = done

feed_source:                     # ahora
  store:
    kind: sqlite
    env_var: HERMES_STATE_DB
    default_home_path: .hermes/state.db
    messages_table: messages
    cursor_column: id            # autoincrement que se tailea
    session_key_column: session_id
    timestamp_column: timestamp
  poll_interval_ms: 600
  stale_after_ms: 300000         # abierta + sin mensaje en 5 min = stalled, no working

error_signals:                   # cómo se ve el fallo
  in_store:                      # ahora — columnas que, si tienen valor, = error
    - compression_failure_error
    - handoff_error
  success_exit_code: 0
  process:                       # v0.3 — patrones sobre stdout (case-insensitive)
    - { match: "HTTP 402|credit|quota", message: "Provider del worker sin créditos" }
    - { match: "HTTP 401|auth",         message: "Auth del provider del worker falló" }
    - { match: "HTTP 429|rate.?limit",  message: "Rate limit — Hermes agotó reintentos y fallbacks" }
    - { match: "Session not found",     message: "Sesión del worker perdida" }
```

## Por qué `error_signals` tiene dos mitades

Hallazgo crítico (ver `HERMES-ERRORS.md`): **un error terminal de provider
—créditos, auth, rate-limit— NO deja rastro en `state.db`**. La sesión queda con
`ended_at = NULL` y sin mensaje de error. Por eso:

- `in_store` (columnas): errores que Hermes SÍ persiste (compresión/handoff). El
  reader los usa hoy para derivar el estado `error`.
- `process` (exit code + stdout): la única fuente de verdad para los errores de
  provider. El supervisor de proceso de v0.3 los mapea a mensaje de usuario. Aún
  no se consume — está declarado para que v0.3 construya contra un contrato fijo.

## Mapa estado ← contrato (reader actual, solo state.db)

- `error`   → alguna columna de `error_signals.in_store` tiene valor
- `done`    → `session_parse.ended_column` tiene valor
- `stalled` → viva pero sin mensaje dentro de `feed_source.stale_after_ms`
- `working` → viva y con actividad reciente

La liveness real (proceso vivo vs colgado) necesita supervisión de proceso, que
llega en v0.3 cuando duet spawnea al worker en vez de solo leer su store.

## Añadir un driver nuevo (futuro)

1. Escribir `server/modules/worker-feed/drivers/<id>.driver.ts` conforme a
   `WorkerDriver`.
2. Rellenar las cuatro secciones desde el contrato CLI del worker (validado en
   vivo, como se hizo con Hermes en `HERMES-ERRORS.md`).
3. v0.4 expone la selección de driver por config; hoy el reader referencia el
   driver Hermes directamente (`const DRIVER = hermesDriver`).
