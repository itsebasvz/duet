# duet — Design System
> Dos voces sobre la misma pizarra — tinta crema sobre gris cálido exacto de Claude, coral y teal como los dos alientos cromáticos.

Base heredada: [docs/CLAUDE-DESIGN.md](docs/CLAUDE-DESIGN.md) (sistema editorial warm-gray de Claude). duet adopta la **gama exacta del dark mode de Claude.ai** — gris cálido casi neutro (`#262624`), tinta crema (`#f0eee6`), coral `#d97757` como firma — con dos giros propios: **el modo oscuro es el tema primario** (la experiencia por defecto de una herramienta dev que corre de noche) y donde Claude respira un solo acento (Coral), duet respira **dos**, porque duet es un dúo. El orquestador ES Claude, así que lleva el Coral de Claude; el worker lleva Teal (la rampa teal del propio sistema de Claude) como voz complementaria. La pizarra es compartida.

**Temas:** dark (primario, default) + light (secundario, pergamino Pampas `#f4f3ee`)

## Filosofía

1. **Gris cálido exacto de Claude, no void.** El canvas es el gris cálido de Claude dark (`#262624`), nunca negro puro ni gris azulado de SaaS. Todo neutro lleva calidez apenas insinuada (matiz ~46-60°, saturación ≤6%). La tinta es crema suave (`#f0eee6`), nunca blanco puro. Son los hexes literales de Claude.ai, no un charcoal aproximado.
2. **Pizarra compartida, dos tintas.** El orquestador (Claude) habla en Coral `#d97757` — la firma de Claude, porque el orquestador literalmente ES Claude; el worker (Hermes, Codex…) habla en Teal `#5dcaa5`. Todo lo demás es monocromo cálido. El usuario distingue *quién actúa* por color sin leer etiquetas. Coral ↔ Teal es par cálido/frío: máxima distinción, ambos sacados de la misma familia de rampas de Claude.
3. **Editorial, no dashboard.** duet muestra procesos de agentes como una conversación impresa, no como un panel de métricas. Serif para títulos, generoso whitespace, superficies planas.
4. **El color es semántica, nunca decoración.** Coral/Teal marcan identidad de agente; los funcionales (diff, error, éxito, warning) existen porque una herramienta dev los necesita — tomados de las rampas Green/Red/Amber de Claude, nunca colores alarma crudos.
5. **Elevación por luz, no por sombra.** En oscuro las sombras no existen: la jerarquía de superficies se construye aclarando (canvas → card → nested), y el sunken (terminal) es lo único más oscuro. El modo claro sí susurra su sombra suave heredada.

## Tokens — Colores

### Neutros (escala de gris cálido Claude, hexes exactos)

| Name | Dark (default) | Light | Token | Role |
|------|------|-------|-------|------|
| Canvas | `#262624` | `#f4f3ee` | `--surface-canvas` | Fondo de página |
| Card | `#30302e` | `#ffffff` | `--surface-card` | Superficies de contenido elevadas |
| Nested | `#383733` | `#eceae4` | `--surface-nested` | Sub-superficies, bandas alternas, código inline |
| Sunken | `#1a1917` | `#eceae4` | `--surface-sunken` | Terminal, pozos de output — lo único más oscuro que el canvas |
| Ink | `#f0eee6` | `#191919` | `--text-primary` | Texto primario, headings, iconos |
| Cloudy | `#b1ada1` | `#45443f` | `--text-secondary` | Texto secundario, botones, nav |
| Ashen | `#8f8d83` | `#73716b` | `--text-muted` | Texto auxiliar, captions, timestamps |
| Pebble | `#706e66` | `#9c9a92` | `--text-tertiary` | Labels de mínima prioridad |
| Hairline | `#3e3e3b` | `#e4e2da` | `--border-hairline` | Bordes de 1px, divisores |
| Mist | `#55534b` | `#cac8be` | `--border-strong` | Bordes de inputs, divisores marcados |

Escala de elevación dark: Sunken `#1a1917` → Canvas `#262624` → Card `#30302e` → Nested `#383733`. Cuatro pasos, mismo matiz cálido casi neutro, sin sombras. Estos son los tonos que Claude.ai usa en su propio dark mode — así se lee "Claude", no "charcoal SaaS".

### Acentos de agente (la identidad duet)

| Name | Dark (default) | Light | Token | Role |
|------|------|-------|-------|------|
| **Coral** | `#d97757` | `#c15f3c` | `--accent-orchestrator` | Voz del orquestador (Claude): borde de sus mensajes, su badge, marca de duet, focus rings, links activos, avatar |
| **Teal** | `#5dcaa5` | `#2e8b6f` | `--accent-worker` | Voz del worker: borde de sus mensajes/feed, su badge, actividad de sus tools |
| Coral Wash | `#3a2620` | `#f6e3da` | `--accent-orchestrator-wash` | Fondo tenue de bloques del orquestador |
| Teal Wash | `#1c342c` | `#dfeee8` | `--accent-worker-wash` | Fondo tenue de bloques del worker |

Armonía sobre gris cálido: Coral (`#d97757`, matiz 15°) es el acento firma de Claude; Teal (`#5dcaa5`, matiz 160°) sale de la rampa teal del mismo sistema de Claude. Cálido vs frío = separación instantánea sin que ninguno grite. Los washes viven un paso sobre Card con el matiz del agente apenas insinuado: se *siente* la identidad antes de leerse.

Reglas: los acentos marcan **identidad**, no acción. Nunca rellenan botones primarios (las acciones siguen siendo light-on-dark / dark-on-light, como Claude). Se usan en: bordes izquierdos de 2-3px en mensajes, badges, dots de estado, iconos de agente, tabs activos del panel correspondiente.

### Funcionales (rampas Green / Red / Amber de Claude)

| Name | Dark (default) | Light | Token | Role |
|------|------|-------|-------|------|
| Green | `#97c459` | `#5a9a3a` | `--fn-success` | Éxito, tests en verde, exit code 0 |
| Red | `#f09595` | `#b3564d` | `--fn-error` | Errores, exit code ≠ 0, denials |
| Amber | `#ef9f27` | `#c47f1a` | `--fn-warning` | Warnings — rampa amber de Claude, desacoplada de todo acento de identidad |
| Diff Add BG | `#1e3311` | `#e5f0d9` | `--diff-add-bg` | Fondo de líneas agregadas |
| Diff Add Text | `#a6cd70` | `#3d6b1f` | `--diff-add-text` | Texto/signo de líneas agregadas |
| Diff Del BG | `#3a1a1a` | `#f5dedb` | `--diff-del-bg` | Fondo de líneas eliminadas |
| Diff Del Text | `#e88e87` | `#8f4740` | `--diff-del-text` | Texto/signo de líneas eliminadas |

Green/Red/Amber son las rampas semánticas del propio Claude, no colores alarma genéricos: en dark viven claros y algo desaturados; en light bajan luminosidad para contraste. Red (error) y Coral (orquestador) se separan por matiz (0° vs 15°) y contexto — Red solo aparece en marcos de error/exit. Amber es funcional puro (warning). Prohibido: azules/verdes saturados SaaS, rojos alarma puros, cualquier color fuera de estas rampas.

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
Card `--surface-card`, radio 16px, borde izquierdo 3px Coral, padding 16-24px. Nombre de agente en caption 11px weight 500 Coral + timestamp Ashen. Cuerpo en sans 14px Ink. Markdown renderizado; código en Mono sobre `--surface-nested`.

### Mensaje / actividad de worker
Igual pero borde y badge Teal. En feed de actividad, tool calls colapsados por defecto: fila de 1 línea — icono de tool, nombre en Mono 12.5px, resumen Ashen, chevron. Expandido: card anidada `--surface-nested` con input/output.

### Brief de delegación (📤 orquestador → worker)
El artefacto estrella de duet. Card elevada radio 24px, fondo Coral Wash, borde hairline. Header: "brief → hermes" en Mono caption + badges de ambos agentes (dot Coral → dot Teal). Cuerpo del brief en sans 14px. La respuesta del worker se ancla debajo. El **Worker result** vive en un recuadro `--surface-sunken` neutro (lee como output de terminal, no como bloque de acento): header en Ashen mayúsculas, solo el icono conserva un tinte Teal de identidad. Juntos forman el "intercambio" — unidad visual del dúo.

### Diff card
Header con path en Mono 12.5px Cloudy + stats (+n −m en Green/Red). Cuerpo mono 12.5px con fondos `--diff-add-bg`/`--diff-del-bg` por línea. Radio 16px, borde hairline, sin sombra. Botones approve/reject como filled-light y ghost — nunca verdes/rojos rellenos.

### Terminal output
Bloque `--surface-sunken`, Mono 12.5px, radio 8px. Exit code como badge: dot Green o Red + código en Mono caption. Sin colorines de terminal retro.

### Razonamiento (thinking)
Colapsable, texto Ashen en sans 13px italic, icono ⌄. Sin fondo propio — es un susurro, no un bloque.

### Badges de estado
Radio 8px, 11px weight 500, tinte de superficie + texto del tono correspondiente: `working` (Teal wash + Teal), `done` (Green suave), `error` (Red suave), `idle` (nested + Ashen). Dot de 6px a la izquierda.

### Botones
Primario = filled light en dark (fill `#f0eee6`, texto `#262624`); en light: filled dark (fill `#191919`, texto `#f4f3ee`). Radio 8px, 15px weight 500. Secundario = ghost con texto Cloudy. Destructivo = ghost con texto Red (nunca fill rojo).

### Layout del workspace
Tres zonas: **chat con orquestador** (centro, protagonista), **feed del worker** (panel lateral derecho, colapsable), **diffs/archivos** (panel o tab). Nav superior mínima: wordmark "duet" (serif, con dot Coral + dot Teal como marca), proyecto activo, selector de worker, estado de sesión. Móvil: paneles como tabs inferiores (heredar responsive del fork).

## Do / Don't

### Do
- Gris cálido exacto de Claude siempre — nunca negro puro, nunca gris azulado. Light = Pampas pergamino, nunca blanco frío.
- Coral = orquestador (Claude), Teal = worker, en TODA la app, sin excepciones — el usuario aprende el código de color una vez.
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

> Nota histórica: versiones previas de duet prohibían el coral `#d97757` por respeto a la identidad de Claude/Anthropic. Al adoptar la gama exacta de Claude.ai, esa regla se invierte: Coral ES la voz del orquestador **porque el orquestador es Claude**. Sigue prohibido un tercer acento de marca.

## Quick Start — CSS Custom Properties

```css
/* Dark es el default — :root ES el tema oscuro (hexes exactos de Claude) */
:root {
  /* Surfaces */
  --surface-canvas: #262624;
  --surface-card: #30302e;
  --surface-nested: #383733;
  --surface-sunken: #1a1917;

  /* Text */
  --text-primary: #f0eee6;
  --text-secondary: #b1ada1;
  --text-muted: #8f8d83;
  --text-tertiary: #706e66;

  /* Borders */
  --border-hairline: #3e3e3b;
  --border-strong: #55534b;

  /* Agent accents */
  --accent-orchestrator: #d97757;      /* Coral — voz de Claude */
  --accent-orchestrator-wash: #3a2620;
  --accent-worker: #5dcaa5;            /* Teal — voz del worker */
  --accent-worker-wash: #1c342c;

  /* Functional (rampas Claude) */
  --fn-success: #97c459;
  --fn-error: #f09595;
  --fn-warning: #ef9f27;
  --diff-add-bg: #1e3311;
  --diff-add-text: #a6cd70;
  --diff-del-bg: #3a1a1a;
  --diff-del-text: #e88e87;

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
  --surface-canvas: #f4f3ee;
  --surface-card: #ffffff;
  --surface-nested: #eceae4;
  --surface-sunken: #eceae4;
  --text-primary: #191919;
  --text-secondary: #45443f;
  --text-muted: #73716b;
  --text-tertiary: #9c9a92;
  --border-hairline: #e4e2da;
  --border-strong: #cac8be;
  --accent-orchestrator: #c15f3c;      /* Crail — Coral en light */
  --accent-orchestrator-wash: #f6e3da;
  --accent-worker: #2e8b6f;            /* Teal en light */
  --accent-worker-wash: #dfeee8;
  --fn-success: #5a9a3a;
  --fn-error: #b3564d;
  --fn-warning: #c47f1a;
  --diff-add-bg: #e5f0d9;
  --diff-add-text: #3d6b1f;
  --diff-del-bg: #f5dedb;
  --diff-del-text: #8f4740;
  --shadow-soft: rgba(0, 0, 0, 0.04) 0px 4px 20px 0px;
}
```

Nota de implementación (fork claudecodeui): las vars del fork van en tripletas HSL consumidas por Tailwind (`hsl(var(--primary))`) y el tema oscuro se activa con clase `.dark`. Al portar: convertir estos hex a tripletas HSL, hacer dark el default del ThemeContext, y mapear tokens duet → vars del fork (`--surface-canvas`→`--background`, `--text-primary`→`--foreground`, etc.). Ver docs/FORK-AUDIT.md §7.
