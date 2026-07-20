# duet — Design System
> Dos voces sobre el mismo papel — tinta sobre pergamino, verdigris y ocre como los dos alientos cromáticos.

Base heredada: [docs/CLAUDE-DESIGN.md](docs/CLAUDE-DESIGN.md) (sistema editorial warm-paper de Claude). duet conserva la filosofía completa — papel cálido, tipografía como jerarquía, superficies planas, sombras susurradas — y reemplaza la voz cromática: donde Claude respira un solo acento (Clay), duet respira **dos**, porque duet es un dúo. Cada agente tiene su tono; el papel es compartido.

**Temas:** light (primario) + dark (carbón cálido)

## Filosofía

1. **Papel compartido, dos tintas.** El orquestador (Claude) habla en Verdigris; el worker (Hermes, Codex…) habla en Ochre. Todo lo demás es monocromo cálido. El usuario distingue *quién actúa* por color sin leer etiquetas.
2. **Editorial, no dashboard.** duet muestra procesos de agentes como una conversación impresa, no como un panel de métricas. Serif para títulos, generoso whitespace, superficies planas.
3. **El color es semántica, nunca decoración expandida.** Verdigris/Ochre marcan identidad de agente; los funcionales (diff, error, éxito) existen porque una herramienta dev los necesita — siempre en versión apagada, terrosa, integrada a la paleta.
4. **Oscuro = carbón cálido, no void.** El modo oscuro invierte la metáfora: tinta clara sobre pizarra caliente. Nunca grises azulados de SaaS.

## Tokens — Colores

### Neutros (heredados de Claude, intactos)

| Name | Light | Dark | Token | Role |
|------|-------|------|-------|------|
| Canvas | `#f8f8f6` | `#1b1a17` | `--surface-canvas` | Fondo de página |
| Card | `#ffffff` | `#232220` | `--surface-card` | Superficies de contenido elevadas |
| Nested | `#efeeeb` | `#2b2a26` | `--surface-nested` | Sub-superficies, bandas alternas, código inline |
| Ink | `#121212` | `#eceae4` | `--text-primary` | Texto primario, headings, iconos |
| Graphite | `#373734` | `#b8b5ac` | `--text-secondary` | Texto secundario, botones, nav |
| Ashen | `#7b7974` | `#8a877e` | `--text-muted` | Texto auxiliar, captions, timestamps |
| Pebble | `#9c9a92` | `#6b6960` | `--text-tertiary` | Labels de mínima prioridad |
| Hairline | `#e7e6e1` | `#3a3833` | `--border-hairline` | Bordes de 1px, divisores |
| Mist | `#b7b7b5` | `#4a4843` | `--border-strong` | Bordes de inputs, divisores marcados |

### Acentos de agente (la identidad duet)

| Name | Light | Dark | Token | Role |
|------|-------|------|-------|------|
| **Verdigris** | `#6d9182` | `#8fb3a6` | `--accent-orchestrator` | Voz del orquestador: borde de sus mensajes, su badge, marca de duet, focus rings, links activos |
| **Ochre** | `#b08954` | `#cfa96f` | `--accent-worker` | Voz del worker: borde de sus mensajes/feed, su badge, actividad de sus tools |
| Verdigris Wash | `#eaf0ed` | `#26332e` | `--accent-orchestrator-wash` | Fondo tenue de bloques del orquestador |
| Ochre Wash | `#f3ece1` | `#332c20` | `--accent-worker-wash` | Fondo tenue de bloques del worker |

Reglas: los acentos marcan **identidad**, no acción. Nunca rellenan botones primarios (las acciones siguen siendo dark-on-light / light-on-dark, como Claude). Se usan en: bordes izquierdos de 2-3px en mensajes, badges, dots de estado, iconos de agente, tabs activos del panel correspondiente.

### Funcionales (solo donde la herramienta lo exige)

| Name | Light | Dark | Token | Role |
|------|-------|------|-------|------|
| Moss | `#6a8f6b` | `#8fb08f` | `--fn-success` | Éxito, tests en verde, exit code 0 |
| Brick | `#b3564d` | `#cf7a70` | `--fn-error` | Errores, exit code ≠ 0, denials |
| Amber | `#b08954` | `#cfa96f` | `--fn-warning` | Warnings (comparte hex con Ochre a propósito: el worker es lo que vigilas) |
| Diff Add BG | `#e8efe4` | `#25301f` | `--diff-add-bg` | Fondo de líneas agregadas |
| Diff Add Text | `#4a6b4a` | `#a3c293` | `--diff-add-text` | Texto/signo de líneas agregadas |
| Diff Del BG | `#f3e3e0` | `#33221f` | `--diff-del-bg` | Fondo de líneas eliminadas |
| Diff Del Text | `#8f4a42` | `#cf8a80` | `--diff-del-text` | Texto/signo de líneas eliminadas |

Prohibido: azules/verdes saturados SaaS, rojos alarma puros, cualquier color a >60% de saturación.

## Tokens — Tipografía

Heredada de Claude con una adición obligatoria para herramienta dev:

| Familia | Token | Uso | Sustitutos |
|---|---|---|---|
| Serif editorial | `--font-serif` | Títulos de sección, nombre de proyecto, headings de paneles (24/30px, weight 400) | Source Serif 4, Georgia |
| Sans | `--font-sans` | Todo el UI: 11-16px, weights 400-580 (nunca 600+, nunca bold gritón) | Inter, system-ui |
| **Mono** | `--font-mono` | Código, diffs, output de terminal, paths, session IDs, briefs técnicos — 12-13px | JetBrains Mono, ui-monospace, Menlo |

Type scale: caption 11px · body 14px · code 12.5px · heading-sm 24px · heading 30px. Line-height 1.5 body, 1.6 código.

## Tokens — Espaciado y formas

Idénticos a Claude: base 8px; radios — botones/inputs/nav 8px, cards 16px, cards elevadas 24px; sombras solo `rgba(0,0,0,0.04) 0 4px 20px` o nada; padding de card 32px (paneles densos de feed: 16-24px); max-width de layout 1200px para vistas de documento — el workspace de tres paneles puede ser fluid.

## Componentes duet

### Mensaje de orquestador
Card `--surface-card`, radio 16px, borde izquierdo 3px Verdigris, padding 16-24px. Nombre de agente en caption 11px weight 500 Verdigris + timestamp Ashen. Cuerpo en sans 14px Ink. Markdown renderizado; código en Mono sobre `--surface-nested`.

### Mensaje / actividad de worker
Igual pero borde y badge Ochre. En feed de actividad, tool calls colapsados por defecto: fila de 1 línea — icono de tool, nombre en Mono 12.5px, resumen Ashen, chevron. Expandido: card anidada `--surface-nested` con input/output.

### Brief de delegación (📤 orquestador → worker)
El artefacto estrella de duet. Card elevada radio 24px, fondo Verdigris Wash, borde hairline. Header: "brief → hermes" en Mono caption + badges de ambos agentes (dot Verdigris → dot Ochre). Cuerpo del brief en sans 14px. La respuesta del worker se ancla debajo con Ochre Wash. Juntos forman el "intercambio" — unidad visual del dúo.

### Diff card
Header con path en Mono 12.5px Graphite + stats (+n −m en Moss/Brick). Cuerpo mono 12.5px con fondos `--diff-add-bg`/`--diff-del-bg` por línea. Radio 16px, borde hairline, sin sombra. Botones approve/reject como filled-dark y ghost — nunca verdes/rojos rellenos.

### Terminal output
Bloque `--surface-nested` (light) / `#161512` (dark), Mono 12.5px, radio 8px. Exit code como badge: dot Moss o Brick + código en Mono caption. Sin colorines de terminal retro.

### Razonamiento (thinking)
Colapsable, texto Ashen en sans 13px italic, icono ⌄. Sin fondo propio — es un susurro, no un bloque.

### Badges de estado
Radio 8px, 11px weight 500, tinte de superficie + texto del tono correspondiente: `working` (Ochre wash + Ochre), `done` (Moss suave), `error` (Brick suave), `idle` (nested + Ashen). Dot de 6px a la izquierda.

### Botones
Heredados: primario = filled dark (`#121212` fill, `#f8f8f6` texto; en dark: fill `#eceae4`, texto `#1b1a17`), radio 8px, 15px weight 500. Secundario = ghost con texto Graphite. Destructivo = ghost con texto Brick (nunca fill rojo).

### Layout del workspace
Tres zonas: **chat con orquestador** (centro, protagonista), **feed del worker** (panel lateral derecho, colapsable), **diffs/archivos** (panel o tab). Nav superior mínima: wordmark "duet" (serif, con dot Verdigris + dot Ochre como marca), proyecto activo, selector de worker, estado de sesión. Móvil: paneles como tabs inferiores (heredar responsive del fork).

## Do / Don't

### Do
- Canvas parchment/carbón cálido siempre — nunca blanco puro ni negro azulado de fondo.
- Verdigris = orquestador, Ochre = worker, en TODA la app, sin excepciones — el usuario aprende el código de color una vez.
- Mono para todo lo que un dev copiaría: paths, IDs, comandos, código.
- Jerarquía por tamaño/peso (max 580), no por color ni bold.
- Tool calls colapsados por defecto; el detalle a un click.

### Don't
- No rellenar botones con acentos ni funcionales — acciones = dark/light fill, siempre.
- No usar Clay `#d97757` — es la firma de Claude/Anthropic, no de duet (respeto de identidad; solo puede aparecer si algún día se tematiza "voz por vendor").
- No introducir un tercer acento de identidad — si llega un tercer agente simultáneo, se resuelve con tabs/nombres, no con más colores (o se define entonces, no antes).
- No gradientes, no glow, no glassmorphism — papel plano.
- No grises fríos: todo neutro lleva calidez (comparar contra tokens antes de inventar hexes).

## Quick Start — CSS Custom Properties

```css
:root {
  /* Surfaces */
  --surface-canvas: #f8f8f6;
  --surface-card: #ffffff;
  --surface-nested: #efeeeb;

  /* Text */
  --text-primary: #121212;
  --text-secondary: #373734;
  --text-muted: #7b7974;
  --text-tertiary: #9c9a92;

  /* Borders */
  --border-hairline: #e7e6e1;
  --border-strong: #b7b7b5;

  /* Agent accents */
  --accent-orchestrator: #6d9182;
  --accent-orchestrator-wash: #eaf0ed;
  --accent-worker: #b08954;
  --accent-worker-wash: #f3ece1;

  /* Functional */
  --fn-success: #6a8f6b;
  --fn-error: #b3564d;
  --fn-warning: #b08954;
  --diff-add-bg: #e8efe4;
  --diff-add-text: #4a6b4a;
  --diff-del-bg: #f3e3e0;
  --diff-del-text: #8f4a42;

  /* Typography */
  --font-serif: 'Source Serif 4', ui-serif, Georgia, serif;
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;

  /* Scale */
  --text-caption: 11px;
  --text-body: 14px;
  --text-code: 12.5px;
  --text-heading-sm: 24px;
  --text-heading: 30px;

  /* Shape */
  --radius-control: 8px;
  --radius-card: 16px;
  --radius-elevated: 24px;
  --shadow-soft: rgba(0, 0, 0, 0.04) 0px 4px 20px 0px;

  /* Spacing (base 8) */
  --spacing-unit: 8px;
}

[data-theme="dark"] {
  --surface-canvas: #1b1a17;
  --surface-card: #232220;
  --surface-nested: #2b2a26;
  --text-primary: #eceae4;
  --text-secondary: #b8b5ac;
  --text-muted: #8a877e;
  --text-tertiary: #6b6960;
  --border-hairline: #3a3833;
  --border-strong: #4a4843;
  --accent-orchestrator: #8fb3a6;
  --accent-orchestrator-wash: #26332e;
  --accent-worker: #cfa96f;
  --accent-worker-wash: #332c20;
  --fn-success: #8fb08f;
  --fn-error: #cf7a70;
  --fn-warning: #cfa96f;
  --diff-add-bg: #25301f;
  --diff-add-text: #a3c293;
  --diff-del-bg: #33221f;
  --diff-del-text: #cf8a80;
}
```
