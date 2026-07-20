# duet — Roadmap de desarrollo

Estado: aprobado para iniciar desarrollo. Última actualización: 2026-07-20.

Norte del producto: **economía de tokens**. Un modelo caro piensa; el usuario elige quién ejecuta (y quién orquesta). No es otro multi-agente; es un flujo eficiente de **dos modelos**. Cada decisión de fase se juzga contra esto: ¿gasta el token caro en pensar, no en teclear?

Principio rector de ejecución: **base excelente antes que features**. Cada versión entrega algo usable y estable; nada de medias implementaciones arrastradas entre fases.

---

## Fase 0 — Preparación (antes de tocar código de producto)

Sin esto, el fork se modifica a ciegas.

| # | Tarea | Entregable |
|---|---|---|
| 0.1 | **Auditoría del fork** claudecodeui: mapa de módulos (server, cliente, abstracción multi-CLI, DB, auth, streaming), puntos de inyección para workers/feed/paneles | `docs/FORK-AUDIT.md` |
| 0.2 | **Investigar fallbacks y errores de Hermes**: qué pasa con créditos agotados del provider, timeouts, sesión corrupta, modelo caído — cómo se manifiestan (exit codes, stderr, state.db) | Sección de errores en `docs/FORK-AUDIT.md` o doc propio |
| 0.3 | Verificar auth por suscripción (`claude setup-token`) dentro del flujo del fork (usa Claude Agents SDK — confirmar que respeta el token) | Nota en auditoría |

## v0.1 — MVP: base duet

**Alcance: el fork convertido en duet, con chat Claude funcionando. Nada más.**

Sí entra:
- Rebrand a duet (nombre, wordmark, repo hygiene sobre el fork)
- Tema visual aplicado según `DESIGN.md` (tokens light/dark, tipografía, componentes base)
- Chat con orquestador Claude Code funcionando con **suscripción base** (requisito duro)
- **Selector de provider conservado** (Claude / Codex / Cursor / OpenCode): elegir *quién orquesta* es un activo del fork que se mantiene, no se toca
- Estructura de config de duet (archivo de config donde luego vivirán los drivers)
- Repo limpio, corriendo en dev local

No entra (aunque duela):
- ❌ Feed del worker
- ❌ Delegación
- ❌ Panel de diffs propio (se conserva lo que el fork ya traiga, sin extender)
- ❌ Auth de UI
- ❌ Deploy en server

## v0.2 — Observabilidad del worker

**Alcance: ver a Hermes en vivo desde el navegador. Solo lectura, sin delegación.**

- Watcher de `~/.hermes/state.db` (polling WAL, nivel mensaje sub-segundo) → SSE/WebSocket
- Panel de feed del worker según DESIGN.md: tool calls colapsados, reasoning, output de terminal, badges de estado
- Panel de diffs en vivo del repo (`git diff`)
- **Manejo de errores visible**: estados del worker (working / done / error / idle) derivados de state.db + exit codes; el usuario siempre sabe qué está pasando (créditos agotados, timeout, sesión caída) — según hallazgos de 0.2
- Driver de worker formalizado como contrato (schema del YAML: invoke, session_parse, feed_source, error_signals)

## v0.3 — Delegación

**Alcance: Claude delega a Hermes desde el chat; el dúo funciona.**

- System prompt "Duet" para el orquestador: dónde vive, su rol, cuándo delegar y cuándo no, formato de briefs (rutas absolutas obligatorias)
- **Protocolo de identidad**: Hermes debe distinguir tres actores — él mismo, Claude (orquestador, llega vía `--source duet`) y Sebs (usuario). Los briefs se etiquetan para que el worker sepa quién habla. Definición fina del prompt del worker se hace aquí, con los modelos ya operativos (decisión: no antes)
- Invocación del driver Hermes desde el server de duet (spawn → parse session → feed → terminate)
- Card de brief de delegación 📤 + respuesta 📥 en la UI (el "intercambio")
- **DB propia de duet** (SQLite): sesiones duet = par (sesión Claude ↔ sesión Hermes) + intercambios + metadatos de proyecto
- **Memoria de sesión**: además de la auto-compactación de cada modelo, mecanismo de compactación dinámica por sesión duet (resumen del trabajo hecho, inyectable a cualquiera de los dos al resumir)
- **Presupuesto de contexto**: medir consumo real (system prompt Hermes + system prompt Duet + conversación); probar con modelo barato (deepseek-v4-flash) antes de sesiones largas

## v0.4 — Producción

**Alcance: correr 24/7 en el server como servicio serio.**

- Auth de UI: password hasheado (argon2/bcrypt) + cookie de sesión
- Hardening mínimo: rate limit en login, CSRF, pensado para LAN/túnel (no exposición pública directa)
- systemd user service, puerto 8214, deploy en 192.168.0.200
- Config declarativa de workers (agregar un worker = agregar un driver al config)
- Docs de instalación para terceros (README serio: requisitos, setup, systemd unit)

## Futuro (sin fecha, no bloquea nada)

- Más drivers: Codex, OpenCode, OpenClaw…
- Imagen Docker como empaque alternativo
- Streaming token-level del worker (hoy: nivel mensaje)
- Múltiples workers simultáneos (resolver con tabs/nombres, nunca tercer color — ver DESIGN.md)

---

## Temas transversales (aplican a todas las fases)

| Tema | Regla |
|---|---|
| **Errores** | El usuario siempre sabe qué está pasando y de qué lado falló (Claude, Hermes, provider del worker, duet mismo). Nada de spinners eternos |
| **Testing** | Delegación y streaming se prueban con fixtures (stream-json grabado, copias de state.db) para no quemar suscripción; pruebas reales con Haiku + deepseek-v4-flash |
| **Contexto** | Todo prompt inyectado se mide antes de fijarse; el presupuesto de tokens es un recurso de diseño |
| **Diseño** | `DESIGN.md` es ley: Verdigris = orquestador, Ochre = worker, sin excepciones |
| **Upstream** | El fork intenta mantenerse mergeable con siteboon/claudecodeui donde sea razonable (tema y paneles nuevos aditivos, no reescrituras gratuitas) |
