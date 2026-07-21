# duet — Design System
> Dos voces sobre la misma pizarra — tinta clara sobre gris cálido de Claude, clay y verdigris como los dos alientos cromáticos.

Base heredada: [docs/CLAUDE-DESIGN.md](docs/CLAUDE-DESIGN.md) (sistema editorial warm-gray de Claude). duet adopta la **gama exacta de Claude.ai** — gris cálido casi neutro, tinta crema, un solo clay coral como firma — con dos giros propios: **el modo oscuro es el tema primario** (la experiencia por defecto de una herramienta dev que corre de noche) y donde Claude respira un solo acento (Clay), duet respira **dos**, porque duet es un dúo. El orquestador ES Claude, así que lleva el Clay de Claude; el worker lleva Verdigris como voz complementaria. La pizarra es compartida.

**Temas:** dark (primario, default) + light (secundario, pergamino)

## Filosofía

1. **Gris cálido de Claude, no void.** El canvas es el gris cálido de Claude (`#262523`), nunca negro puro ni gris azulado de SaaS. Todo neutro lleva calidez apenas insinuada (matiz ~45-60°, saturación ≤6%). La tinta es crema suave (`#efece3`), nunca blanco puro. Más claro y más neutro que el antiguo carbón: es la paleta de Claude.ai, no un charcoal genérico.
2. **Pizarra compartida, dos tintas.** El orquestador (Claude) habla en Clay coral — la firma de Claude, porque el orquestador literalmente ES Claude; el worker (Hermes, Codex…) habla en Verdigris. Todo lo demás es monocromo cálido. El usuario distingue *quién actúa* por color sin leer etiquetas. Clay ↔ Verdigris es par complementario: máxima distinción, ambos apagados y terrosos.
3. **Editorial, no dashboard.** duet muestra procesos de agentes como una conversación impresa, no como un panel de métricas. Serif para títulos, generoso whitespace, superficies planas.
4. **El color es semántica, nunca decoración.** Clay/Verdigris marcan identidad de agente; los funcionales (diff, error, éxito, warning) existen porque una herramienta dev los necesita — siempre en versión apagada, terrosa, integrada a la paleta.
5. **Elevación por luz, no por sombra.** En oscuro las sombras no existen: la jerarquía de superficies se construye aclarando (canvas → card → nested), y el sunken (terminal) es lo único más oscuro. El modo claro sí susurra su sombra suave heredada.

## Tokens — Colores

### Neutros (escala de gris cálido Claude)

| Name | Dark (default) | Light | Token | Role |
|------|------|-------|-------|------|
| Canvas | `#262523` | `#f8f8f6` | `--surface-canvas` | Fondo de página |
| Card | `#2f2e2b` | `#ffffff` | `--surface-card` | Superficies de contenido elevadas |
| Nested | `#35342e` | `#efeeeb` | `--surface-nested` | Sub-superficies, bandas alternas, código inline |
| Sunken | `#1a1917` | `#efeeeb` | `--surface-sunken` | Terminal, pozos de output — lo único más oscuro que el canvas |
| Ink | `#efece3` | `#121212` | `--text-primary` | Texto primario, headings, iconos |
| Graphite | `#c2bfb6` | `#373734` | `--text-secondary` | Texto secundario, botones, nav |
| Ashen | `#8f8d83` | `#7b7974` | `--text-muted` | Texto auxiliar, captions, timestamps |
| Pebble | `#6e6c63` | `#9c9a92` | `--text-tertiary` | Labels de mínima prioridad |
| Hairline | `#3f3e39` | `#e7e6e1` | `--border-hairline` | Bordes de 1px, divisores |
| Mist | `#52514b` | `#b7b7b5` | `--border-strong` | Bordes de inputs, divisores marcados |

Escala de elevación dark: Sunken `#1a1917` → Canvas `#262523` → Card `#2f2e2b` → Nested `#35342e`. Cuatro pasos, mismo matiz cálido casi neutro, sin sombras. La banda es más clara y más gris que el antiguo carbón — así se lee "Claude", no "charcoal SaaS".

### Acentos de agente (la identidad duet)

| Name | Dark (default) | Light | Token | Role |
|------|------|-------|-------|------|
| **Clay** | `#d97757` | `#bd5d3a` | `--accent-orchestrator` | Voz del orquestador (Claude): borde de sus mensajes, su badge, marca de duet, focus rings, links activos, avatar |
| **Verdigris** | `#8fb3a6` | `#6d9182` | `--accent-worker` | Voz del worker: borde de sus mensajes/feed, su badge, actividad de sus tools |
| Clay Wash | `#38271f` | `#f6e7e0` | `--accent-orchestrator-wash` | Fondo tenue de bloques del orquestador |
| Verdigris Wash | `#26332e` | `#eaf0ed` | `--accent-worker-wash` | Fondo tenue de bloques del worker |

Armonía sobre gris cálido: Clay (`#d97757`, matiz 15°, sat 63%) y Verdigris (`#8fb3a6`, matiz 158°, sat 19%) comparten luminosidad (~60-63%) y son complementarios — pesan parecido en pantalla y ninguno grita sobre el otro; el ojo los separa al instante. Los washes viven un paso sobre Card con el matiz del agente apenas insinuado: se *siente* la identidad antes de leerse.

Reglas: los acentos marcan **identidad**, no acción. Nunca rellenan botones primarios (las acciones siguen siendo light-on-dark / dark-on-light, como Claude). Se usan en: bordes izquierdos de 2-3px en mensajes, badges, dots de estado, iconos de agente, tabs activos del panel correspondiente.

### Funcionales (solo donde la herramienta lo exige)

| Name | Dark (default) | Light | Token | Role |
|------|------|-------|-------|------|
| Moss | `#8fb08f` | `#6a8f6b` | `--fn-success` | Éxito, tests en verde, exit code 0 |
| Brick | `#cf7a70` | `#b3564d` | `--fn-error` | Errores, exit code ≠ 0, denials |
| Amber | `#cfa96f` | `#b08954` | `--fn-warning` | Warnings — dorado propio, ya no comparte hex con ningún acento de identidad |
| Diff Add BG | `#25301f` | `#e8efe4` | `--diff-add-bg` | Fondo de líneas agregadas |
| Diff Add Text | `#a3c293` | `#4a6b4a` | `--diff-add-text` | Texto/signo de líneas agregadas |
| Diff Del BG | `#33221f` | `#f3e3e0` | `--diff-del-bg` | Fondo de líneas eliminadas |
| Diff Del Text | `#cf8a80` | `#8f4a42` | `--diff-del-text` | Texto/signo de líneas eliminadas |

Brick (error) y Clay (orquestador) comparten familia cálida pero se separan por matiz (6° vs 15°) y contexto: Brick solo aparece en marcos de error/exit. Amber es ahora funcional puro (warning), desacoplado de la identidad del worker. Prohibido: azules/verdes saturados SaaS, rojos alarma puros, cualquier color a >65% de saturación.

## Tokens — Tipografía

Heredada de Claude con una adición obligatoria para herramienta dev:

| Familia | Token | Uso | Sustitutos |
|---|---|---|---|
| Serif editorial | `--font-serif` | Títulos de sección, nombre de proyecto, headings de paneles (24/30px, weight 400) | Source Serif 4, Georgia |
| Sans | `--font-sans` | Todo el UI: 11-16px, weights 400-580 (nunca 600+, nunca bold gritón) | Inter, system-ui |
| **Mono** | `--font-mono` | Código, diffs, output de terminal, paths, session IDs, briefs técnicos — 12-13px | JetBrains Mono, ui-monospace, Menlo |

Type scale: caption 11px · body 14px · code 12.5px · heading-sm 24px · heading 30px. Line-height 1.5 body, 1.6 código.

En oscuro la tinta crema "florece" (blooming): compensar con weights un punto más ligeros donde el sans pase de 15px (nunca subir de 580 en ningún caso).

## Tokens — Espaciado y formas

Idénticos a Claude: base 8px; radios — botones/inputs/nav 8px, cards 16px, cards elevadas 24px; padding de card 32px (paneles densos de feed: 16-24px); max-width de layout 1200px para vistas de documento — el workspace de tres paneles puede ser fluid.

Sombras: **ninguna en dark** (elevación por superficies, ver filosofía 5). En light: solo `rgba(0,0,0,0.04) 0 4px 20px` o nada.

## Componentes duet

### Mensaje de orquestador
Card `--surface-card`, radio 16px, borde izquierdo 3px Clay, padding 16-24px. Nombre de agente en caption 11px weight 500 Clay + timestamp Ashen. Cuerpo en sans 14px Ink. Markdown renderizado; código en Mono sobre `--surface-nested`.

### Mensaje / actividad de worker
Igual pero borde y badge Verdigris. En feed de actividad, tool calls colapsados por defecto: fila de 1 línea — icono de tool, nombre en Mono 12.5px, resumen Ashen, chevron. Expandido: card anidada `--surface-nested` con input/output.

### Brief de delegación (📤 orquestador → worker)
El artefacto estrella de duet. Card elevada radio 24px, fondo Clay Wash, borde hairline. Header: "brief → hermes" en Mono caption + badges de ambos agentes (dot Clay → dot Verdigris). Cuerpo del brief en sans 14px. La respuesta del worker se ancla debajo. El **Worker result** vive en un recuadro `--surface-sunken` neutro (lee como output de terminal, no como bloque de acento): header en Ashen mayúsculas, solo el icono conserva un tinte Verdigris de identidad. Juntos forman el "intercambio" — unidad visual del dúo.

### Diff card
Header con path en Mono 12.5px Graphite + stats (+n −m en Moss/Brick). Cuerpo mono 12.5px con fondos `--diff-add-bg`/`--diff-del-bg` por línea. Radio 16px, borde hairline, sin sombra. Botones approve/reject como filled-light y ghost — nunca verdes/rojos rellenos.

### Terminal output
Bloque `--surface-sunken`, Mono 12.5px, radio 8px. Exit code como badge: dot Moss o Brick + código en Mono caption. Sin colorines de terminal retro.

### Razonamiento (thinking)
Colapsable, texto Ashen en sans 13px italic, icono ⌄. Sin fondo propio — es un susurro, no un bloque.

### Badges de estado
Radio 8px, 11px weight 500, tinte de superficie + texto del tono correspondiente: `working` (Verdigris wash + Verdigris), `done` (Moss suave), `error` (Brick suave), `idle` (nested + Ashen). Dot de 6px a la izquierda.

### Botones
Primario = filled light en dark (fill `#efece3`, texto `#262523`); en light: filled dark (fill `#121212`, texto `#f8f8f6`). Radio 8px, 15px weight 500. Secundario = ghost con texto Graphite. Destructivo = ghost con texto Brick (nunca fill rojo).

### Layout del workspace
Tres zonas: **chat con orquestador** (centro, protagonista), **feed del worker** (panel lateral derecho, colapsable), **diffs/archivos** (panel o tab). Nav superior mínima: wordmark "duet" (serif, con dot Clay + dot Verdigris como marca), proyecto activo, selector de worker, estado de sesión. Móvil: paneles como tabs inferiores (heredar responsive del fork).

## Do / Don't

### Do
- Gris cálido de Claude siempre — nunca negro puro, nunca gris azulado. Light = pergamino, nunca blanco frío.
- Clay = orquestador (Claude), Verdigris = worker, en TODA la app, sin excepciones — el usuario aprende el código de color una vez.
- Mono para todo lo que un dev copiaría: paths, IDs, comandos, código.
- Jerarquía por tamaño/peso (max 580) y por elevación de superficie, no por color ni bold.
- Tool calls colapsados por defecto; el detalle a un click.

### Don't
- No rellenar botones con acentos ni funcionales — acciones = light/dark fill, siempre.
- No introducir un tercer acento de identidad — si llega un tercer agente simultáneo, se resuelve con tabs/nombres, no con más colores (o se define entonces, no antes).
- No gradientes, no glow, no glassmorphism — pizarra plana. (El fork upstream trae glassmorphism en la nav: se neutraliza.)
- No sombras en dark; en light solo la sombra susurrada heredada.
- No grises fríos: todo neutro lleva calidez (comparar contra tokens antes de inventar hexes).
- No colores de paleta SaaS crudos (`blue-500`, `green-900`, `purple-900`…): mapear siempre a tokens duet.

> Nota histórica: versiones previas de duet prohibían Clay `#d97757` por respeto a la identidad de Claude/Anthropic. Al adoptar la gama de Claude.ai, esa regla se invierte: Clay ES la voz del orquestador **porque el orquestador es Claude**. Sigue prohibido un tercer acento de marca.

## Quick Start — CSS Custom Properties

```css
/* Dark es el default — :root ES el tema oscuro */
:root {
  /* Surfaces */
  --surface-canvas: #262523;
  --surface-card: #2f2e2b;
  --surface-nested: #35342e;
  --surface-sunken: #1a1917;

  /* Text */
  --text-primary: #efece3;
  --text-secondary: #c2bfb6;
  --text-muted: #8f8d83;
  --text-tertiary: #6e6c63;

  /* Borders */
  --border-hairline: #3f3e39;
  --border-strong: #52514b;

  /* Agent accents */
  --accent-orchestrator: #d97757;      /* Clay — voz de Claude */
  --accent-orchestrator-wash: #38271f;
  --accent-worker: #8fb3a6;            /* Verdigris — voz del worker */
  --accent-worker-wash: #26332e;

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
  --accent-orchestrator: #bd5d3a;      /* Clay */
  --accent-orchestrator-wash: #f6e7e0;
  --accent-worker: #6d9182;            /* Verdigris */
  --accent-worker-wash: #eaf0ed;
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
