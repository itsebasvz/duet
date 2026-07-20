# duet

Web UI self-hosted para trabajar con **dos modelos sin quemar tokens**: un modelo caro **piensa y planea**, y tú eliges **quién ejecuta** y escribe el código. Todo supervisado en vivo desde el navegador — chat, delegación agente-a-agente, actividad de herramientas, razonamiento y diffs.

> Un modelo caro piensa. Tú eliges quién ejecuta. En un solo puerto.

## Filosofía

Apps para *orquestar* agentes hay mil. Para trabajar **eficiente con solo dos modelos**, casi ninguna.

El eje es la **economía de tokens**:

- Un LLM "pensante" (caro) hace lo que hace bien — **planear, escribir briefs, revisar entregas** — no la talacha.
- Un ejecutor (más barato, o el que prefieras) **escribe y corre el código**.
- Tú decides ambos extremos y ves todo el intercambio en vivo.

No es otro orquestador multi-agente. Es un flujo de **dos modelos** donde cada token caro se gasta en pensar, no en teclear.

## Tú eliges los dos extremos

- **Quién orquesta** — el selector de provider heredado del fork (Claude, Codex, Cursor, OpenCode) sigue vivo. Elige quién "piensa".
- **Quién ejecuta** — worker CLI ejecutor. Primero **Hermes Agent** (Nous Research); diseño agnóstico para sumar Codex, OpenCode, etc.

## Arquitectura

```
Navegador ──► duet (:8214, systemd)
               ├─ Chat: usuario ↔ orquestador elegido (Claude/Codex/Cursor/OpenCode)
               │        headless (stream-json, auth por suscripción)
               ├─ El orquestador delega LOCAL al worker ejecutor (sin SSH)
               ├─ Feed en vivo del worker (tools, reasoning) vía driver por agente
               └─ Panel de diffs del repo en vivo
```

El orquestador caro planea y delega; el worker barato ejecuta. Cada delegación es un brief 📤 y una respuesta 📥 que ves en la UI.

Ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para decisiones de arquitectura; [docs/ROADMAP.md](docs/ROADMAP.md) para el plan de desarrollo; [DESIGN.md](DESIGN.md) para el sistema de diseño visual.

## Estado

🚧 Fase de diseño / v0.1. Base: fork de [siteboon/claudecodeui](https://github.com/siteboon/claudecodeui) (AGPL-3.0), rebrandeado a duet y con tema propio.

## Licencia

[AGPL-3.0](LICENSE)
