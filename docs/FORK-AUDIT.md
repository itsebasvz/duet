# Auditoría del fork — claudecodeui v1.36.3 (Fase 0.1 + 0.3)

Auditado 2026-07-20 sobre clon local (`~/Documents/GitHub/claudecodeui-upstream`, "CloudCLI"). Define dónde inyecta duet cada pieza.

## 1. Stack

- **Frontend**: React 18.2 + Vite 7 + TypeScript 5.9 + Tailwind 3.4; xterm 5.5, CodeMirror 6, react-markdown, i18next, lucide-react
- **Backend**: Express 4.18 + TS, `@anthropic-ai/claude-agent-sdk` **0.3.165**, better-sqlite3, ws 8.14, cross-spawn, bcrypt, jsonwebtoken, node-pty
- Empaque Electron opcional (no nos aplica)

## 2. Mapa del backend (`server/`)

- `index.js` — entry point; Express + HTTP + WebSocket. **Maps `spawnFns`/`abortFns` por provider en líneas ~113-122** (punto de registro de Hermes)
- `claude-sdk.js` (833 líneas) — integración Claude vía Agent SDK, `queryClaudeSDK()` línea 460, mapeo de opciones `mapCliOptionsToSDK()` línea 160
- `cursor-cli.js` / `openai-codex.js` / `opencode-cli.js` — spawners standalone por CLI (350-500 líneas c/u): args + parseo stream-json línea a línea + WebSocket. **Plantilla directa para `hermes-cli.js`**
- `routes/` — auth (JWT), git, agent, settings, commands…
- `modules/providers/` — abstracción multi-CLI (ver §3)
- `modules/websocket/services/` — `chat-websocket.service.ts` (dispatch de chat → `spawnFn[provider]`), `chat-session-writer.service.ts` (frames JSON al navegador)
- `modules/database/` — SQLite en `~/.cloudcli/auth.db`, schema + repositorios

## 3. Abstracción multi-CLI — cómo se registra Hermes

Registry central: `server/modules/providers/provider.registry.ts` — `{ claude, codex, cursor, opencode }`, cada uno `extends AbstractProvider` con contrato:

`IProviderModels · IProviderAuth · IProviderSessions · IProviderSessionSynchronizer · IProviderMcp · IProviderSkills`

Alta de Hermes (todo aditivo, sin tocar providers existentes):

1. `server/modules/providers/list/hermes/` — `hermes.provider.ts` + auth/models/sessions/synchronizer (synchronizer lee `~/.hermes/state.db` en vez de escanear JSONL)
2. `server/hermes-cli.js` — `spawnHermes(command, options, writer)` + `abortHermesSession()`; spawn de `hermes chat -q -Q --pass-session-id --source duet`, **session_id parseado de stderr, respuesta/errores de stdout, cwd fijado al proyecto** (ver HERMES-ERRORS.md)
3. Registrar en `provider.registry.ts` + maps `spawnFns`/`abortFns` de `index.js`

⚠️ Deuda del upstream: spawners duplican ~200 líneas c/u (permisos, imágenes, parseo, notifs) sin base class. Para duet: copiar patrón, NO refactorizar upstream (mergeabilidad).

## 4. Auth hacia Claude — veredicto 0.3 ✅

- El SDK **spawnea el binario `claude`** (`sdkOptions.pathToClaudeCodeExecutable`, claude-sdk.js:171) y le hereda `process.env` completo (`sdkOptions.env = { ...process.env }`, línea ~166)
- → auth = la que tenga el CLI: login de suscripción (`~/.claude`) o token de `claude setup-token` vía env `CLAUDE_CODE_OAUTH_TOKEN`
- `ANTHROPIC_API_KEY` es solo una opción más que chequea `claude-auth.provider.ts:90` — **no requerida**
- Validado en la práctica: el fork corrió local con suscripción de Sebs sin API key
- **Deploy server**: basta `CLAUDE_CODE_OAUTH_TOKEN` en el environment del systemd unit de duet

## 5. System prompt del orquestador — punto de inyección

`claude-sdk.js:222`:

```js
sdkOptions.systemPrompt = { type: 'preset', preset: 'claude_code' };
```

Hardcodeado a preset. El Agent SDK soporta `{ type: 'preset', preset: 'claude_code', append: '...' }` → **cambio de duet: agregar `append` con el system prompt Duet** (v0.3). Modificación de ~3 líneas en `mapCliOptionsToSDK()`, riesgo de merge bajo.

## 6. Streaming al navegador

- WebSocket paths: `/ws` (chat), `/shell` (terminal), `/desktop-notifications`
- Frames JSON con `kind` + `sessionId` + `provider`: `message`, `text`, `tool_use`, `output`, `permission_request`, `chat_subscribed`, `session_upserted`, `loading_progress`, `complete`, `protocol_error`
- Frontend: `src/contexts/WebSocketContext.tsx` — API `subscribe(listener)` síncrona por frame (no lossy)
- **Feed de Hermes reutiliza este canal**: el watcher de state.db emite frames con kinds nuevos (`worker_message`, `worker_tool`, `worker_status`…) por `/ws`; parsing defensivo en frontend (log de kinds desconocidos)

## 7. Frontend y theming

- Componentes por carpeta (`src/components/`): chat, git-panel, file-tree, shell, sidebar, settings… — paneles = tabs standalone registrados en `app/AppContent.tsx`
- **Panel de feed worker = componente nuevo `src/components/worker-feed/` + registro de tab. Sin tocar paneles existentes**
- Theming actual: CSS custom properties HSL en `src/index.css` (1017 líneas, `:root` + `.dark`) consumidas por `tailwind.config.js` (`hsl(var(--primary))`); `ThemeContext.jsx` togglea clase `dark`
- **Aplicar DESIGN.md = re-mapear valores de las vars existentes** (`--background`, `--card`, `--primary`…) a los tokens duet + agregar vars nuevas (`--accent-orchestrator`, `--accent-worker`, washes, diff) en el mismo archivo. ⚠️ Los tokens duet están en hex; las vars del fork en tripletas HSL — convertir al portar
- ⚠️ El fork trae glassmorphism en nav (`--nav-glass-*`) — DESIGN.md lo prohíbe; neutralizar en el tema

## 8. DB propia del fork

`~/.cloudcli/auth.db` (better-sqlite3, singleton en `modules/database/connection.ts`, ruta via env `DATABASE_PATH`). Tablas: `users`, `sessions` (session_id, provider, provider_session_id, project_path…), `projects`, `api_keys`, `user_credentials`, `app_config` (KV, jwt_secret), `push_subscriptions`, `scan_state`.

**DB duet (v0.3)**: extender este mismo schema — tabla `duet_exchanges` (par sesión Claude ↔ sesión worker, briefs, respuestas, estado) vía migration en `modules/database/schema.ts` + repositorio nuevo. No una segunda DB.

## 9. Auth de UI — ya resuelta por el fork ✅

Login single-user completo: bcrypt (12 rounds) + JWT 7 días (auto-refresh al 50%), `routes/auth.js` + `middleware/auth.js` + `AuthContext`/`LoginForm`/`ProtectedRoute`. **El requisito de v0.4 "password hasheado + cookie" ya viene cumplido** (token en localStorage + query param para WS, no cookie — aceptable, revisar en v0.4). Falta solo: rate limit en login.

## 10. Git/diffs — ya resuelto por el fork ✅

`routes/git.js`: status/diff/commit/pull/push/branch/log/stash vía cross-spawn con validadores de input (path traversal, refs). Diffs por HTTP request-response (truncados a 500KB), UI en `git-panel/`. Para el "diff en vivo" de v0.2 basta refrescar al recibir eventos de tools del worker.

## 11. Estrategia de mergeabilidad con upstream

Seguro (aditivo): provider nuevo, spawner nuevo, componentes/tabs nuevos, endpoints nuevos, migrations de DB, cambios de theming en index.css.

Evitar: refactorizar spawners existentes, cambiar contrato del registry, tocar dispatch WebSocket, renombrar rutas.

Puntos de fricción esperables: maps `spawnFns` en index.js (conflicto chico y localizado), bump del Agent SDK (lock de versión), cambios de enum `kind` (parsing defensivo).

Documentar divergencia en `docs/DUET-CHANGES.md` a partir de v0.1.

## Resumen — inyecciones duet

| Pieza duet | Dónde | Tamaño |
|---|---|---|
| Tema visual (v0.1) | `src/index.css` re-map de vars + `tailwind.config.js` | Mediano, aislado |
| Rebrand (v0.1) | Strings/wordmark/i18n | Chico |
| Feed worker (v0.2) | Watcher state.db (módulo server nuevo) → frames `/ws` kinds nuevos → tab `worker-feed/` | Mediano, aditivo |
| Driver Hermes (v0.2-0.3) | `server/hermes-cli.js` + `providers/list/hermes/` + registro en registry/maps | Mediano, aditivo |
| System prompt Duet (v0.3) | `claude-sdk.js:222` — campo `append` | ~3 líneas |
| DB duet (v0.3) | Migration + repo en `modules/database/` | Chico |
| Auth UI (v0.4) | Ya existe; solo rate limit | Chico |
