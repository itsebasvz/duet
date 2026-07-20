# duet — Design System
> Dos voces sobre la misma pizarra — tinta clara sobre carbón cálido, verdigris y ocre como los dos alientos cromáticos.

Base heredada: [docs/CLAUDE-DESIGN.md](docs/CLAUDE-DESIGN.md) (sistema editorial warm-paper de Claude). duet conserva la filosofía completa — calidez, tipografía como jerarquía, superficies planas — con dos giros propios: **el modo oscuro es el tema primario** (la experiencia por defecto de una herramienta dev que corre de noche) y donde Claude respira un solo acento (Clay), duet respira **dos**, porque duet es un dúo. Cada agente tiene su tono; la pizarra es compartida.

**Temas:** dark (primario, default) + light (secundario, pergamino)

## Filosofía

1. **Carbón cálido, no void.** El canvas es pizarra caliente (`#1b1a17`), nunca negro puro ni gris azulado de SaaS. Todo neutro lleva calidez (matiz ~40-48°). La tinta es clara y suave (`#eceae4`), nunca blanco puro.
2. **Pizarra compartida, dos tintas.** El orquestador (Claude) habla en Verdigris; el worker (Hermes, Codex…) habla en Ochre. Todo lo demás es monocromo cálido. El usuario distingue *quién actúa* por color sin leer etiquetas.
3. **Editorial, no dashboard.** duet muestra procesos de agentes como una conversación impresa, no como un panel de métricas. Serif para títulos, generoso whitespace, superficies planas.
4. **El color es semántica, nunca decoración.** Verdigris/Ochre marcan identidad de agente; los funcionales (diff, error, éxito) existen porque una herramienta dev los necesita — siempre en versión apagada, terrosa, integrada a la paleta.
5. **Elevación por luz, no por sombra.** En oscuro las sombras no existen: la jerarquía de superficies se construye aclarando (canvas → card → nested). El modo claro sí susurra su sombra suave heredada.

## Tokens — Colores

### Neutros (escala de carbón)

| Name | Dark (default) | Light | Token | Role |
|------|------|-------|-------|------|
| Canvas | `#1b1a17` | `#f8f8f6` | `--surface-canvas` | Fondo de página |
| Card | `#232220` | `#ffffff` | `--surface-card` | Superficies de contenido elevadas |
| Nested | `#2b2a26` | `#efeeeb` | `--surface-nested` | Sub-superficies, bandas alternas, código inline |
| Sunken | `#161512` | `#efeeeb` | `--surface-sunken` | Terminal, pozos de output — lo único más oscuro que el canvas |
| Ink | `#eceae4` | `#121212` | `--text-primary` | Texto primario, headings, iconos |
| Graphite | `#b8b5ac` | `#373734` | `--text-secondary` | Texto secundario, botones, nav |
| Ashen | `#8a877e` | `#7b7974` | `--text-muted` | Texto auxiliar, captions, timestamps |
| Pebble | `#6b6960` | `#9c9a92` | `--text-tertiary` | Labels de mínima prioridad |
| Hairline | `#3a3833` | `#e7e6e1` | `--border-hairline` | Bordes de 1px, divisores |
| Mist | `#4a4843` | `#b7b7b5` | `--border-strong` | Bordes de inputs, divisores marcados |

Escala de elevación dark: Sunken `#161512` → Canvas `#1b1a17` → Card `#232220` → Nested `#2b2a26`. Cuatro pasos, mismo matiz cálido, sin sombras.

### Acentos de agente (la identidad duet)

| Name | Dark (default) | Light | Token | Role |
|------|------|-------|-------|------|
| **Verdigris** | `#8fb3a6` | `#6d9182` | `--accent-orchestrator` | Voz del orquestador: borde de sus mensajes, su badge, marca de duet, focus rings, links activos |
| **Ochre** | `#cfa96f` | `#b08954` | `--accent-worker` | Voz del worker: borde de sus mensajes/feed, su badge, actividad de sus tools |
| Verdigris Wash | `#26332e` | `#eaf0ed` | `--accent-orchestrator-wash` | Fondo tenue de bloques del orquestador |
| Ochre Wash | `#332c20` | `#f3ece1` | `--accent-worker-wash` | Fondo tenue de bloques del worker |

Armonía sobre carbón: ambos acentos comparten luminosidad (~63%) y saturación contenida (Verdigris 19%, Ochre 50%) — pesan lo mismo en pantalla; ninguno grita sobre el otro. Los washes viven un paso sobre Card con el matiz del agente apenas insinuado: se *siente* la identidad antes de leerse.

Reglas: los acentos marcan **identidad**, no acción. Nunca rellenan botones primarios (las acciones siguen siendo light-on-dark / dark-on-light, como Claude). Se usan en: bordes izquierdos de 2-3px en mensajes, badges, dots de estado, iconos de agente, tabs activos del panel correspondiente.

### Funcionales (solo donde la herramienta lo exige)

| Name | Dark (default) | Light | Token | Role |
|------|------|-------|-------|------|
| Moss | `#8fb08f` | `#6a8f6b` | `--fn-success` | Éxito, tests en verde, exit code 0 |
| Brick | `#cf7a70` | `#b3564d` | `--fn-error` | Errores, exit code ≠ 0, denials |
| Amber | `#cfa96f` | `#b08954` | `--fn-warning` | Warnings (comparte hex con Ochre a propósito: el worker es lo que vigilas) |
| Diff Add BG | `#25301f` | `#e8efe4` | `--diff-add-bg` | Fondo de líneas agregadas |
| Diff Add Text | `#a3c293` | `#4a6b4a` | `--diff-add-text` | Texto/signo de líneas agregadas |
| Diff Del BG | `#33221f` | `#f3e3e0` | `--diff-del-bg` | Fondo de líneas eliminadas |
| Diff Del Text | `#cf8a80` | `#8f4a42` | `--diff-del-text` | Texto/signo de líneas eliminadas |

Moss y Brick comparten la luminosidad de los acentos de agente (~63% en dark): toda la voz de color de duet vive en la misma banda tonal. Prohibido: azules/verdes saturados SaaS, rojos alarma puros, cualquier color a >60% de saturación.

## Tokens — Tipografía

Heredada de Claude con una adición obligatoria para herramienta dev:

| Familia | Token | Uso | Sustitutos |
|---|---|---|---|
| Serif editorial | `--font-serif` | Títulos de sección, nombre de proyecto, headings de paneles (24/30px, weight 400) | Source Serif 4, Georgia |
| Sans | `--font-sans` | Todo el UI: 11-16px, weights 400-580 (nunca 600+, nunca bold gritón) | Inter, system-ui |
| **Mono** | `--font-mono` | Código, diffs, output de terminal, paths, session IDs, briefs técnicos — 12-13px | JetBrains Mono, ui-monospace, Menlo |

Type scale: caption 11px · body 14px · code 12.5px · heading-sm 24px · heading 30px. Line-height 1.5 body, 1.6 código.

En oscuro la tinta clara "florece" (blooming): compensar con weights un punto más ligeros donde el sans pase de 15px (nunca subir de 580 en ningún caso).

## Tokens — Espaciado y formas

Idénticos a Claude: base 8px; radios — botones/inputs/nav 8px, cards 16px, cards elevadas 24px; padding de card 32px (paneles densos de feed: 16-24px); max-width de layout 1200px para vistas de documento — el workspace de tres paneles puede ser fluid.

Sombras: **ninguna en dark** (elevación por superficies, ver filosofía 5). En light: solo `rgba(0,0,0,0.04) 0 4px 20px` o nada.

## Componentes duet

### Mensaje de orquestador
Card `--surface-card`, radio 16px, borde izquierdo 3px Verdigris, padding 16-24px. Nombre de agente en caption 11px weight 500 Verdigris + timestamp Ashen. Cuerpo en sans 14px Ink. Markdown renderizado; código en Mono sobre `--surface-nested`.

### Mensaje / actividad de worker
Igual pero borde y badge Ochre. En feed de actividad, tool calls colapsados por defecto: fila de 1 línea — icono de tool, nombre en Mono 12.5px, resumen Ashen, chevron. Expandido: card anidada `--surface-nested` con input/output.

### Brief de delegación (📤 orquestador → worker)
El artefacto estrella de duet. Card elevada radio 24px, fondo Verdigris Wash, borde hairline. Header: "brief → hermes" en Mono caption + badges de ambos agentes (dot Verdigris → dot Ochre). Cuerpo del brief en sans 14px. La respuesta del worker se ancla debajo con Ochre Wash. Juntos forman el "intercambio" — unidad visual del dúo.

### Diff card
Header con path en Mono 12.5px Graphite + stats (+n −m en Moss/Brick). Cuerpo mono 12.5px con fondos `--diff-add-bg`/`--diff-del-bg` por línea. Radio 16px, borde hairline, sin sombra. Botones approve/reject como filled-light y ghost — nunca verdes/rojos rellenos.

### Terminal output
Bloque `--surface-sunken`, Mono 12.5px, radio 8px. Exit code como badge: dot Moss o Brick + código en Mono caption. Sin colorines de terminal retro.

### Razonamiento (thinking)
Colapsable, texto Ashen en sans 13px italic, icono ⌄. Sin fondo propio — es un susurro, no un bloque.

### Badges de estado
Radio 8px, 11px weight 500, tinte de superficie + texto del tono correspondiente: `working` (Ochre wash + Ochre), `done` (Moss suave), `error` (Brick suave), `idle` (nested + Ashen). Dot de 6px a la izquierda.

### Botones
Primario = filled light en dark (fill `#eceae4`, texto `#1b1a17`); en light: filled dark (fill `#121212`, texto `#f8f8f6`). Radio 8px, 15px weight 500. Secundario = ghost con texto Graphite. Destructivo = ghost con texto Brick (nunca fill rojo).

### Layout del workspace
Tres zonas: **chat con orquestador** (centro, protagonista), **feed del worker** (panel lateral derecho, colapsable), **diffs/archivos** (panel o tab). Nav superior mínima: wordmark "duet" (serif, con dot Verdigris + dot Ochre como marca), proyecto activo, selector de worker, estado de sesión. Móvil: paneles como tabs inferiores (heredar responsive del fork).

## Do / Don't

### Do
- Carbón cálido siempre — nunca negro puro, nunca gris azulado. Light = pergamino, nunca blanco frío.
- Verdigris = orquestador, Ochre = worker, en TODA la app, sin excepciones — el usuario aprende el código de color una vez.
- Mono para todo lo que un dev copiaría: paths, IDs, comandos, código.
- Jerarquía por tamaño/peso (max 580) y por elevación de superficie, no por color ni bold.
- Tool calls colapsados por defecto; el detalle a un click.

### Don't
- No rellenar botones con acentos ni funcionales — acciones = light/dark fill, siempre.
- No usar Clay `#d97757` — es la firma de Claude/Anthropic, no de duet (respeto de identidad; solo puede aparecer si algún día se tematiza "voz por vendor").
- No introducir un tercer acento de identidad — si llega un tercer agente simultáneo, se resuelve con tabs/nombres, no con más colores (o se define entonces, no antes).
- No gradientes, no glow, no glassmorphism — pizarra plana. (El fork upstream trae glassmorphism en la nav: se neutraliza.)
- No sombras en dark; en light solo la sombra susurrada heredada.
- No grises fríos: todo neutro lleva calidez (comparar contra tokens antes de inventar hexes).

## Quick Start — CSS Custom Properties

```css
/* Dark es el default — :root ES el tema oscuro */
:root {
  /* Surfaces */
  --surface-canvas: #1b1a17;
  --surface-card: #232220;
  --surface-nested: #2b2a26;
  --surface-sunken: #161512;

  /* Text */
  --text-primary: #eceae4;
  --text-secondary: #b8b5ac;
  --text-muted: #8a877e;
  --text-tertiary: #6b6960;

  /* Borders */
  --border-hairline: #3a3833;
  --border-strong: #4a4843;

  /* Agent accents */
  --accent-orchestrator: #8fb3a6;
  --accent-orchestrator-wash: #26332e;
  --accent-worker: #cfa96f;
  --accent-worker-wash: #332c20;

  /* Functional */
  --fn-success: #8fb08f;
  --fn-error: #cf7a70;
  --fn-warning: #cfa96f;
  --diff-add-bg: #25301f;
  --diff-add-text: #a3c293;
  --diff-del-bg: #33221f;
  --diff-del-text: #cf8a80;

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
  --shadow-soft: none; /* dark: elevación por superficie, sin sombras */

  /* Spacing (base 8) */
  --spacing-unit: 8px;
}

[data-theme="light"] {
  --surface-canvas: #f8f8f6;
  --surface-card: #ffffff;
  --surface-nested: #efeeeb;
  --surface-sunken: #efeeeb;
  --text-primary: #121212;
  --text-secondary: #373734;
  --text-muted: #7b7974;
  --text-tertiary: #9c9a92;
  --border-hairline: #e7e6e1;
  --border-strong: #b7b7b5;
  --accent-orchestrator: #6d9182;
  --accent-orchestrator-wash: #eaf0ed;
  --accent-worker: #b08954;
  --accent-worker-wash: #f3ece1;
  --fn-success: #6a8f6b;
  --fn-error: #b3564d;
  --fn-warning: #b08954;
  --diff-add-bg: #e8efe4;
  --diff-add-text: #4a6b4a;
  --diff-del-bg: #f3e3e0;
  --diff-del-text: #8f4a42;
  --shadow-soft: rgba(0, 0, 0, 0.04) 0px 4px 20px 0px;
}
```

Nota de implementación (fork claudecodeui): las vars del fork van en tripletas HSL consumidas por Tailwind (`hsl(var(--primary))`) y el tema oscuro se activa con clase `.dark`. Al portar: convertir estos hex a tripletas HSL, hacer dark el default del ThemeContext, y mapear tokens duet → vars del fork (`--surface-canvas`→`--background`, `--text-primary`→`--foreground`, etc.). Ver docs/FORK-AUDIT.md §7.
