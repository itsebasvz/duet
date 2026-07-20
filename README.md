# duet

Self-hosted web UI donde un **Claude Code orquestador** dirige a **agentes CLI ejecutores** (Hermes Agent primero), con supervisión total del proceso en vivo desde el navegador: chat, delegación agente-a-agente, actividad de herramientas, razonamiento y diffs de código.

> Orquestador que piensa + worker que ejecuta + tú viendo todo. En un solo puerto.

## ¿Por qué?

No existe (2026) herramienta mantenida que combine:

- Un LLM "pensante" (Claude Code) como orquestador/planner
- Un agente CLI de **otro vendor** como ejecutor (Hermes, y a futuro Codex, OpenCode, etc.)
- Observabilidad web en vivo de **ambos** agentes: briefs, respuestas, tool calls, razonamiento, ediciones de código

Los orquestadores existentes (claude-flow, Agent Teams) solo coordinan instancias de Claude Code entre sí; los frameworks (CrewAI, LangGraph, AutoGen) asumen que ellos poseen las llamadas al LLM. duet llena ese hueco.

## Arquitectura

```
Navegador ──► duet (:8214, systemd)
               ├─ Chat: usuario ↔ Claude Code headless (stream-json, auth por suscripción)
               ├─ Orquestador delega LOCAL a workers CLI (sin SSH)
               ├─ Feed en vivo del worker (tools, reasoning) vía driver por agente
               └─ Panel de diffs del repo en vivo
```

Ver [docs/DESIGN.md](docs/DESIGN.md) para decisiones completas de diseño.

## Estado

🚧 Fase de diseño. Base: fork de [siteboon/claudecodeui](https://github.com/siteboon/claudecodeui) (AGPL-3.0).

## Licencia

[AGPL-3.0](LICENSE)
