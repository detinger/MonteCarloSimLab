# Monte Carlo Simulation Lab — Design & Interaction Specification

> **Agent-ready `STYLE.md` · Version 2.0 · 18 November 2026**  
> Companion to [`PLAN.md`](./PLAN.md). The PLAN defines numerical semantics, feature preservation, exact 12/12/12 manifest, architecture, export and deployments. This STYLE governs user experience, visual tokens, canvas interactions, chart literacy, responsive behavior and accessible states. Neither repository code nor runtime screenshots were inspected during authoring: the text describes the **target**, not an existing implementation.

## Source authority and adaptation rules

- **Current baseline:** the provided `README(3).md` describes the existing seven Monte Carlo labs, dark-mode-oriented vanilla CSS, Canvas and Recharts charts, KaTeX explanations, Prism export snippets and React/Vite/Lucide stack.
- **Design authority:** the provided `STYLE(8).md` is the Markov/BPMN Studio-derived visual reference. Its Sections 1–11 are adapted below to preserve exact base palette, typography, shell dimensions, component hierarchy, chart recipe and motion. `--model-*` names are new Monte Carlo aliases for the reference diagram-specific values; all hexadecimal values remain the same.
- **Product adaptation:** the additional sections below adapt the design to a question-driven **Simulation Builder**, seven existing labs, five new labs, 12 lessons, 12 challenges and Colab/Python/R exports. **No BPMN or Markov UI dependencies** should be installed merely for visual consistency.
- **Conflict resolution:** mathematical validity and sample counts in `PLAN.md` override artistic choices. A visualization may not conceal uncertainty, change an input silently, or imply causation/prediction. Document any accessibility-motivated alteration to the reference palette.
- **Vocabulary:** blue = primary action/selection, orange = active sampling/experimentation, neutral = explanation, semantic error/warning/success = justified actual status. **Never** use color alone to represent a statistical conclusion.

**Design intention:** calm academic modeling software: clear structure, clean surfaces, high information density, comfortable form editing, legible equations and charts, restrained motion and seamless light/dark themes. Avoid glassmorphism, decorative full-page gradients, gimmicky pseudo-3D nodes, neon glow, massive marketing headers and endless ungrouped cards.

---

## 1. Character and principles

The interface is a calm, compact workspace for learning and analytical work. Cool gray backgrounds, bordered white or dark slate surfaces, blue actions, small outline icons, and restrained orange highlights give it its identity.

- **Keep the work prominent.** Diagrams, explanations, forms, and results occupy most of the screen. Navigation and controls provide a quiet frame.
- **Use density with structure.** Compact controls sit in clearly grouped toolbars; larger gaps separate sections. Borders and spacing establish hierarchy before shadows do.
- **Give color a job.** Blue identifies actions and selection; orange highlights special activity or milestones; semantic colors explain outcomes.
- **Explain alongside action.** Place hints, validation, empty states, and next steps near the relevant task.
- **Treat both themes as complete designs.** Surfaces, controls, charts, and embedded workspaces all change together.

To retain this character, avoid oversized marketing headings, decorative gradients, glass effects, heavy shadows on every surface, or pill-shaped primary controls. Pills belong to badges, filters, and step indicators.

## 2. Color tokens

Use semantic CSS variables throughout components. Keep palette values in a central theme layer. A token's role stays the same when its value changes between themes.

### Surfaces and text

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--bg` | `#f4f6f9` | `#0f141b` | Application background |
| `--bg-elevated` | `#ffffff` | `#171e27` | Navigation, cards, controls, dialogs |
| `--bg-subtle` | `#eef1f5` | `#1c2430` | Quiet grouping, table headers, neutral fills |
| `--bg-sunken` | `#e6eaf0` | `#121821` | Recessed tracks, such as progress bars |
| `--bg-hover` | `#e9eef5` | `#233042` | Hovered rows and controls |
| `--border` | `#d6dce5` | `#2b3645` | Default 1px dividers and outlines |
| `--border-strong` | `#b7c1cf` | `#3b4a5e` | Stronger outlines and hover borders |
| `--text` | `#17202c` | `#e6ebf1` | Main content and headings |
| `--text-muted` | `#4b5867` | `#b2bdcb` | Descriptions, labels, inactive navigation |
| `--text-subtle` | `#6b7787` | `#8a97a8` | Metadata, hints, secondary annotations |
| `--text-on-primary` | `#ffffff` | `#0b1520` | Text and icons on solid primary fills |

### Brand and interaction

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--primary` | `#1f5f8b` | `#5aa7d8` | Main actions, links, focus borders, selection |
| `--primary-hover` | `#184d72` | `#7ab9e3` | Solid primary button hover |
| `--primary-soft` | `#e3eef7` | `#16314a` | Selected navigation, controls, explanatory panels |
| `--primary-strong` | `#123b59` | `#a8d3ef` | Emphasized text within primary-tinted content |
| `--accent` | `#d9822b` | `#f0a457` | Special actions, active simulation, achievements |
| `--accent-soft` | `#fbeedd` | `#3a2a17` | Soft accent badges |

Solid accent buttons and simulation banners use dark text `#1d1205` in both themes. Do not assume every saturated background takes white text.

### Semantic feedback

| Role | Foreground light / dark | Soft background light / dark | Use |
| --- | --- | --- | --- |
| Error | `#c0392b` / `#f2776a` | `#fbe9e7` / `#3b1d1a` | Failure, invalid input, destructive action |
| Warning | `#b7791f` / `#e8b45a` | `#fdf3dc` / `#3a2d14` | Caution, incomplete state, potential problem |
| Recommendation | `#2b6cb0` / `#79b2ec` | `#e6f0fa` / `#172a40` | Advice, explanation, suggested improvement |
| Info | `#5a6779` / `#a3afbf` | `#eef1f5` / `#1f2833` | Neutral information and metadata |
| Success | `#2f855a` / `#6fcf97` | `#e3f4ea` / `#16301f` | Completion, correct answers, improved outcomes |

Tokens follow `--error` / `--error-soft`, `--warning` / `--warning-soft`, and the same pattern for the other roles. Informational **callouts** deliberately use the blue recommendation palette; neutral information **badges** use the gray info palette.

Pair semantic colors with readable labels or recognizable icons. Improvement and deterioration depend on the metric: a lower duration may be good, while a lower completion count may be bad.

## 3. Typography

```css
--font-sans: 'Inter', 'IBM Plex Sans', system-ui, -apple-system,
  'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace,
  SFMono-Regular, Menlo, monospace;
```

The app declares these stacks without loading custom sans or monospace font files. The displayed font therefore depends on local availability. **Transfer recommendation:** self-host Inter and the desired monospace font if matching typography across machines is important; include the weights used below.

| Element | Size | Weight | Other properties |
| --- | --- | --- | --- |
| Body | 14px | 400 | Line height 1.5 |
| Home hero heading | 32px | 650 | Tracking `-0.02em` |
| Page heading / h1 | 26px | 650 | Tracking `-0.01em` |
| Section heading / h2 | 20px | 650 | Tracking `-0.01em` |
| Card heading / h3 | 16px | 650 | Tracking `-0.01em` |
| Subheading / h4 | 14px | 650 | Tracking `-0.01em` |
| Dialog heading | 17px | 650 | No bottom margin |
| Hero description | 15px | 400 | Muted text |
| Compact content / table body | 13px | 400 | Also used in side panels |
| Field label / table heading | 12px | 600 | Muted text |
| Hint | 12px | 400 | Subtle text |
| Small metadata / badge | 11px | 400 / 650 | Keep secondary |
| KPI value | 22px | 700 | Tracking `-0.02em`, tabular numerals |
| Eyebrow | 12px | 600 | Uppercase, tracking `0.08em`, primary color |
| Navigation group label | 11px | 400 | Uppercase, tracking `0.06em` |

Headings use line height 1.25 and bottom margin `0.5em`. Paragraphs use bottom margin `0.75em`. Body text remains sentence case; uppercase is reserved for short group labels and eyebrows.

Use monospace for code, identifiers, traces, and keyboard shortcuts. Inline `code` and `kbd` are `0.92em`. Use `font-variant-numeric: tabular-nums` for metrics, numeric table columns, zoom values, and comparisons. Explanatory prose is limited to `76ch`; page-header descriptions to `72ch`.

## 4. Spacing, shape, and elevation

Spacing is currently expressed as literal CSS values, not a named spacing-token system. These recurring values form the practical scale:

| Spacing | Typical use |
| --- | --- |
| 2–4px | Tight internal grouping, badge gaps, adjacent toolbar controls |
| 6px | Icon-to-label gaps, compact list gaps |
| 8px | Standard row gaps, small control padding |
| 10–12px | Form grids, compact surface padding, field separation |
| 14–16px | Panel padding, standard stacks and card-grid gaps |
| 18px | Default card and dialog-body padding |
| 20–24px | Page-header separation, larger layout gaps |
| 28–32px | Desktop page inset and hero spacing |
| 40–48px | Page bottom breathing room |

**Transfer recommendation:** expose these values as spacing tokens in the receiving system while keeping the original proportions. Do not force every dimension onto a new scale if visual fidelity is the goal.

| Token / shape | Value | Use |
| --- | --- | --- |
| `--radius-sm` | 6px | Buttons, inputs, tabs' surrounding surfaces, callouts, menus |
| `--radius` | 10px | Cards, KPI tiles, grouped content |
| `--radius-lg` | 14px | Dialogs |
| Small local radius | 4px | Keyboard keys, focus outline shape, chart bar ends |
| Pill radius | 999px | Badges, chips, progress tracks, lesson steps |

| Token | Light | Dark |
| --- | --- | --- |
| `--shadow-sm` | `0 1px 2px rgba(16, 24, 40, 0.06)` | Same as light |
| `--shadow` | `0 2px 8px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.06)` | `0 2px 10px rgba(0, 0, 0, 0.45)` |
| `--shadow-lg` | `0 12px 32px rgba(16, 24, 40, 0.16)` | `0 16px 40px rgba(0, 0, 0, 0.6)` |
| `--focus-ring` | `0 0 0 3px rgba(31, 95, 139, 0.35)` | `0 0 0 3px rgba(90, 167, 216, 0.45)` |

Use a 1px border for most surface separation. Cards have the smallest shadow; hovered linked cards and toasts use the medium shadow; menus and dialogs use the large shadow.

## 5. Layout and responsive behavior

### Application shell

- Full-height shell with a left navigation column and a flexible main region.
- Expanded navigation is `232px`; collapsed navigation is `64px`.
- Brand row and workspace toolbar share a `56px` height token. The toolbar can grow when controls wrap.
- Navigation uses an elevated background and a right border. Group headings organize related tasks; utility actions sit at the bottom.
- Navigation links use `8px 10px` padding, a `10px` icon gap, and a `6px` radius. Selection uses primary text on a primary-soft background.
- Standard pages scroll inside the main region, with `28px 32px 48px` padding. Narrow pages are centered with a maximum width of `1080px`.
- Page headers place a title and description on the left and actions on the right, with wrapping and a `16px` gap.

### Page compositions

| Composition | Structure |
| --- | --- |
| Overview | Header → action or workflow cards → recent work / progress |
| Card collection | Auto-fill columns, minimum `260px`, `16px` gaps |
| Editor | Toolbar → flexible canvas + `420px` inspector |
| Configuration and results | `380px` configuration column + flexible results, `20px` gap |
| Reference content | `280px` sticky index + flexible article, `24px` gap |
| Dashboard | KPI grid → chart cards → detailed tables |

Use `minmax(0, 1fr)`, `min-width: 0`, and `min-height: 0` in flexible workspaces so wide content and nested scrolling do not force the shell to expand.

### Existing breakpoints

| Maximum viewport width | Adaptation |
| --- | --- |
| 1100px | Inspector narrows to `340px`; configuration/results layout becomes one column |
| 960px | Two-column home hero becomes one column |
| 900px | Two- and three-column utility grids become one column; reference index moves above content |
| 820px | Sidebar becomes a horizontal, scrollable navigation row; labels and group headings are hidden; page padding becomes `18px 16px 40px`; inspector moves below the canvas |

At the smallest editor breakpoint, canvas and inspector rows are defined as `minmax(320px, 1fr)` and `minmax(280px, 45vh)`. This is a dense workspace layout. **Transfer recommendation:** check the receiving app's smallest supported screen and scrolling behavior instead of assuming these minimum heights fit every phone.

## 6. Component recipes

### Buttons and inputs

| Component | Geometry and treatment |
| --- | --- |
| Default button | `34px` high, `0 12px` padding, `6px` gap and radius, 1px border, elevated fill, weight 550 |
| Small button | `28px` high, `0 8px` padding, 13px text |
| Icon button | Square `34px`; small version `28px` |
| Primary button | Primary fill and border, text-on-primary foreground |
| Secondary button | Default bordered button; hover uses bg-hover and border-strong |
| Ghost button | Transparent fill and border; bg-hover on hover |
| Danger button | Error-colored text with the base button treatment |
| Selected button | Primary-soft fill, primary text and border |
| Input / select | `34px` high, `0 10px` padding, 6px radius, elevated fill, 1px border |
| Small input / select | `28px` high, `0 6px` padding, 13px text |
| Textarea | Auto height, `8px 10px` padding, vertical resize |

Disabled buttons use 50% opacity and a not-allowed cursor. Focused inputs use a primary border and the focus-ring shadow. Form fields stack label, control, and hint with a `4px` gap and `12px` separation between fields. Responsive field rows have `10px` gaps and minimum `120px` columns.

**Transfer recommendation:** give each task group one visually dominant action. Use labels with concrete verbs, such as “Run simulation,” “Import file,” or “Save changes.” Give accent and danger variants explicit hover styles if using them in the receiving app; the current stylesheet lets them inherit the base button hover.

### Cards, lists, and selection

- Standard card: elevated background, 1px border, 10px radius, 18px padding, smallest shadow.
- Card title row: aligned title and utility action, 8px gap, 12px bottom spacing.
- Linked card hover: primary border and medium shadow. No actual translation or scaling is applied.
- Compact rows: small outline icon, label, optional metadata or trailing action; bg-hover signals interaction.
- Selected rows and options: primary-soft background with a primary outline where appropriate.
- Collection preview cards: `140px` preview region separated by a bottom border, followed by `12px 14px` body padding.

### Tabs, chips, and badges

- Tabs sit above a 1px bottom divider. Each tab has `9px 12px` padding, a `6px` icon gap, and weight 550. Selection uses primary text and a 2px bottom border.
- Tab strips scroll horizontally when needed. Inspector tabs are denser: 13px text and `10px 8px` padding.
- Filter chips use `3px 9px` padding, 12px text, a pill radius, and a 1px border. Selection adds primary-soft fill, primary border, and primary text.
- Status badges are `20px` high with `0 7px` padding, 11px text, weight 650, and a pill radius. Semantic variants use matching foreground/soft pairs and transparent borders.

### Feedback and progress

- Callouts use `10px 12px` padding, a 6px radius, an 18px leading icon, and a `10px` content gap. Semantic borders mix the role color with transparency: 30% for informational callouts and 35% for warning, error, and success.
- Validation rows use a 3px inset severity stripe, a severity icon, a short title, and expandable explanatory content. Explanations connect the problem to its consequence and a possible fix.
- Empty states are centered with `36px 16px` padding, a muted icon, a short heading, and helpful next-step content.
- Progress tracks are `8px` high, pill-shaped, and sunken; fills use primary color.
- Toasts stack at the bottom right, `16px` from the edges, with an `8px` gap. Each has `10px 14px` padding, 6px radius, medium shadow, and a 4px primary or semantic left border. Current widths are `260–420px`.

### Tables and metrics

- Wrap tables in a horizontally scrollable container with a 1px border and 6px radius.
- Body text is 13px; sticky header text is 12px, weight 600, muted, on bg-subtle.
- Cells use `7px 10px` padding and horizontal separators. Hover highlights the entire row.
- Right-align numeric columns and use tabular numerals. Keep units visible and number formatting consistent.
- KPI grids use minimum `170px` columns and `12px` gaps. Tiles use `12px 14px` padding, 10px radius, and a 1px border.
- KPI hierarchy: 12px muted label → 22px bold value → 11px subtle supporting detail. Outcome deltas use semantic colors and weight 650.

### Dialogs and menus

- Dialog backdrop: `rgba(10, 16, 24, 0.5)`, centered layout, `24px` viewport padding.
- Dialog: elevated fill, 1px border, 14px radius, large shadow, width `min(960px, 100%)`, maximum height `calc(100vh - 48px)`.
- Header: `14px 18px` padding and bottom divider. Body: 18px padding and vertical scrolling. Footer: `12px 18px` padding, top divider, actions aligned right with an 8px gap.
- Menus: minimum `230px` width, 6px radius, large shadow, 4px outer padding, 4px below their trigger. Items use `7px 10px` padding.
- Existing layer order: watermark 10, canvas controls 15, canvas overlay 20, menus 30, dialogs 50, toasts 60, skip link 100.

## 7. Icons and brand treatment

Use Lucide outline icons for application actions and navigation. Common sizes are 16px in buttons, 18px in navigation and callouts, and 13–14px in small inline actions. Keep icons aligned to text and usually inherit the surrounding foreground color.

The navigation brand uses a `30px` primary-colored square with an `8px` radius, containing a `20px` monochrome mark. The wordmark is 15px and its supporting line is 11px. The source BPMN mark used simple connected geometric forms with 2px strokes. The Monte Carlo product must instead use a unique visual mark: a small branching node graph and sample dots.

When transferring the language, retain the compact mark/wordmark proportions and outline-icon treatment while replacing the BPMN symbol with a mark appropriate to the new product. Domain notation icons belong inside domain content, separate from navigation icons.

## 8. Data visualization

Charts have a separate categorical palette. Do not use category colors to imply success, warning, or failure.

| Token | Light | Dark |
| --- | --- | --- |
| `--chart-1` | `#2a78d6` | `#3987e5` |
| `--chart-2` | `#eb6834` | `#d95926` |
| `--chart-3` | `#1baf7a` | `#199e70` |
| `--chart-grid` | `#e1e0d9` | `#2c2c2a` |
| `--chart-axis` | `#c3c2b7` | `#383835` |
| `--chart-muted` | `#898781` | `#898781` |
| `--chart-surface` | `#ffffff` | `#171e27` |

Additional status-scale tokens stay the same in both themes: `--status-good: #0ca30c`, `--status-warning: #fab219`, `--status-serious: #ec835a`, and `--status-critical: #d03b3b`.

- Place charts in bordered cards with a title, concise subtitle including units, and a legend for multiple series.
- Use one value axis per chart, light grid lines, no tick marks, and 11px axis text; categorical labels commonly use 12px.
- Use horizontal bars for named categories. Bars generally have a maximum thickness of 24px; paired bars use 18px. Round exposed ends by 4px.
- Use 2px lines. Area fills use 10% opacity. Step curves represent discrete changes; continuous trends may use smooth lines.
- Tooltips match the card palette with a 6px radius, `8px 10px` padding, 12px text, and medium shadow.
- Present a table view alongside chart-based analysis. Labels, units, legends, and numeric values carry meaning as well as color.
- Resolve chart colors from theme tokens and refresh them when the theme changes. Keep a series' identity consistent across related views.

## 9. Simulation Builder canvas surfaces

These values originate in the reference diagram workspace and are adapted here for the **Simulation Builder** canvas:

| Token | Light | Dark |
| --- | --- | --- |
| `--canvas-bg` | `#ffffff` | `#141a22` |
| `--model-stroke` | `#22242a` | `#d7dee8` |
| `--model-fill` | `#ffffff` | `#1b232d` |
| `--model-label` | `#22242a` | `#e6ebf1` |

Keep the canvas visually quiet and place dense explanations in the adjacent inspector. Use orange outlines to draw attention to a selected explanation or issue location. Compact embedded viewers have a 1px border, 6px radius, and a typical height of 260px, or 360px for the tall variant.

The original BPMN Studio theme system defaulted diagram colors while preserving user-assigned colors; apply that principle to Monte Carlo Builder nodes without introducing any BPMN renderer. Its third-party controls receive matching surface, text, border, and focus values. Transfer this principle to embedded tools instead of recoloring every element indiscriminately. The BPMN-specific selectors and renderer color sentinels are implementation details, not required parts of the general design language.

## 10. Theme, motion, and accessibility

The theme model supports `light`, `dark`, and `system`. The resolved theme is applied as `data-theme="light"` or `data-theme="dark"` on the root element. CSS also supplies a system-dark fallback when an explicit light theme is absent. The visible toggle switches between light and dark; the theme layer stores the preference and observes system changes.

Motion is brief and functional:

| Interaction | Existing timing |
| --- | --- |
| Button background and border | 120ms |
| Linked-card border and shadow | 120ms |
| Toast appearance | 180ms ease-out, fading in from 8px below |
| Progress width | 250ms |
| Loading spinner | 1s linear, repeating |

The app includes a visible keyboard focus treatment, a skip-to-content link, semantic navigation, labeled dialog and progress primitives, and selected-state attributes on tabs. Dialogs focus themselves when opened, close on Escape, and restore previous focus when closed.

**Transfer recommendations:** preserve these foundations and complete interaction behavior in the receiving app. The existing shared dialog does not implement focus trapping, tabs do not implement arrow-key navigation, and the styles do not include a reduced-motion override. Add those behaviors where applicable. Give every icon-only control an accessible name, including when responsive styles hide its text. Review text contrast, touch hit areas, toast widths, zoom/reflow, and both themes in the destination layout; this guide is a visual specification, not an accessibility certification.

## 11. Content and voice

Use direct, instructional language. Prefer a clear action and an explanation of what happens next. Keep headings short, descriptions informative, and implementation terminology out of ordinary task flows.

- Actions: “Open the modeler,” “Continue learning,” “Run simulation.”
- Empty states: state what is missing, then give a useful next step.
- Errors: identify the problem, explain the consequence, and offer a fix.
- Results: show the value, its unit, and relevant context or uncertainty.
- Learning feedback: make progress and correctness understandable through words and icons as well as color.

Transfer the tone and hierarchy while replacing BPMN-specific labels with the receiving product's vocabulary.


## 12. Exact inherited CSS tokens and Monte Carlo aliases

### 12.1 Full base theme (copy as `src/styles/tokens.css`)

The values below transfer the user-provided source theme (including intentionally warm chart grid colors). Original diagram-specific tokens are renamed to the destination aliases `--model-stroke`, `--model-fill`, `--model-label`. **This rename is a new mapping, not a claim about the original stylesheet.** The light/dark/system preference is applied to the document root *before paint*. Avoid simultaneous contradictory selectors; the explicit theme takes precedence.

```css
:root, :root[data-theme="light"] {
  color-scheme: light;
  --bg: #f4f6f9;
  --bg-elevated: #ffffff;
  --bg-subtle: #eef1f5;
  --bg-sunken: #e6eaf0;
  --bg-hover: #e9eef5;
  --border: #d6dce5;
  --border-strong: #b7c1cf;
  --text: #17202c;
  --text-muted: #4b5867;
  --text-subtle: #6b7787;
  --text-on-primary: #ffffff;
  --primary: #1f5f8b;
  --primary-hover: #184d72;
  --primary-soft: #e3eef7;
  --primary-strong: #123b59;
  --accent: #d9822b;
  --accent-soft: #fbeedd;
  --shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.06);
  --shadow: 0 2px 8px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.06);
  --shadow-lg: 0 12px 32px rgba(16, 24, 40, 0.16);
  --focus-ring: 0 0 0 3px rgba(31, 95, 139, 0.35);
  --chart-1: #2a78d6;
  --chart-2: #eb6834;
  --chart-3: #1baf7a;
  --chart-grid: #e1e0d9;
  --chart-axis: #c3c2b7;
  --chart-muted: #898781;
  --chart-surface: #ffffff;
  --canvas-bg: #ffffff;
  --model-stroke: #22242a;
  --model-fill: #ffffff;
  --model-label: #22242a;
  --error: #c0392b;
  --error-soft: #fbe9e7;
  --warning: #b7791f;
  --warning-soft: #fdf3dc;
  --recommendation: #2b6cb0;
  --recommendation-soft: #e6f0fa;
  --info: #5a6779;
  --info-soft: #eef1f5;
  --success: #2f855a;
  --success-soft: #e3f4ea;
  --font-sans: 'Inter', 'IBM Plex Sans', system-ui, -apple-system,
    'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace,
    SFMono-Regular, Menlo, monospace;
  --radius-sm: 6px;
  --radius: 10px;
  --radius-lg: 14px;
  --status-good: #0ca30c;
  --status-warning: #fab219;
  --status-serious: #ec835a;
  --status-critical: #d03b3b;
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #0f141b;
  --bg-elevated: #171e27;
  --bg-subtle: #1c2430;
  --bg-sunken: #121821;
  --bg-hover: #233042;
  --border: #2b3645;
  --border-strong: #3b4a5e;
  --text: #e6ebf1;
  --text-muted: #b2bdcb;
  --text-subtle: #8a97a8;
  --text-on-primary: #0b1520;
  --primary: #5aa7d8;
  --primary-hover: #7ab9e3;
  --primary-soft: #16314a;
  --primary-strong: #a8d3ef;
  --accent: #f0a457;
  --accent-soft: #3a2a17;
  --shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.06);
  --shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
  --shadow-lg: 0 16px 40px rgba(0, 0, 0, 0.6);
  --focus-ring: 0 0 0 3px rgba(90, 167, 216, 0.45);
  --chart-1: #3987e5;
  --chart-2: #d95926;
  --chart-3: #199e70;
  --chart-grid: #2c2c2a;
  --chart-axis: #383835;
  --chart-muted: #898781;
  --chart-surface: #171e27;
  --canvas-bg: #141a22;
  --model-stroke: #d7dee8;
  --model-fill: #1b232d;
  --model-label: #e6ebf1;
  --error: #f2776a;
  --error-soft: #3b1d1a;
  --warning: #e8b45a;
  --warning-soft: #3a2d14;
  --recommendation: #79b2ec;
  --recommendation-soft: #172a40;
  --info: #a3afbf;
  --info-soft: #1f2833;
  --success: #6fcf97;
  --success-soft: #16301f;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --bg: #0f141b;
    --bg-elevated: #171e27;
    --bg-subtle: #1c2430;
    --bg-sunken: #121821;
    --bg-hover: #233042;
    --border: #2b3645;
    --border-strong: #3b4a5e;
    --text: #e6ebf1;
    --text-muted: #b2bdcb;
    --text-subtle: #8a97a8;
    --text-on-primary: #0b1520;
    --primary: #5aa7d8;
    --primary-hover: #7ab9e3;
    --primary-soft: #16314a;
    --primary-strong: #a8d3ef;
    --accent: #f0a457;
    --accent-soft: #3a2a17;
    --shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.06);
    --shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
    --shadow-lg: 0 16px 40px rgba(0, 0, 0, 0.6);
    --focus-ring: 0 0 0 3px rgba(90, 167, 216, 0.45);
    --chart-1: #3987e5;
    --chart-2: #d95926;
    --chart-3: #199e70;
    --chart-grid: #2c2c2a;
    --chart-axis: #383835;
    --chart-muted: #898781;
    --chart-surface: #171e27;
    --canvas-bg: #141a22;
    --model-stroke: #d7dee8;
    --model-fill: #1b232d;
    --model-label: #e6ebf1;
    --error: #f2776a;
    --error-soft: #3b1d1a;
    --warning: #e8b45a;
    --warning-soft: #3a2d14;
    --recommendation: #79b2ec;
    --recommendation-soft: #172a40;
    --info: #a3afbf;
    --info-soft: #1f2833;
    --success: #6fcf97;
    --success-soft: #16301f;
  }
}
```

### 12.2 Monte Carlo-specific variables (new additions)

```css
:root {
  --mc-node-random: var(--primary);
  --mc-node-random-soft: var(--primary-soft);
  --mc-node-constant: var(--info);
  --mc-node-formula: var(--accent);
  --mc-node-output: var(--recommendation);
  --mc-node-decision: var(--recommendation);
  --mc-node-error: var(--error);
  --mc-node-selected: var(--primary);
  --mc-node-running: var(--accent);
  --mc-focus: var(--primary);
  --mc-accent-foreground: #1d1205;

  /* New names preserving the reference geometry. */
  --nav-width: 232px;
  --nav-width-collapsed: 64px;
  --toolbar-height: 56px;
  --inspector-width: 420px;
  --config-width: 380px;
  --reference-index-width: 280px;
  --content-max-width: 1080px;
  --control-height: 34px;
  --control-height-sm: 28px;
  --radius-local: 4px;
  --radius-pill: 999px;
  --grid-step: 16px;
  --canvas-dot-size: 1px;
  --layer-watermark: 10;
  --layer-canvas-controls: 15;
  --layer-canvas-overlay: 20;
  --layer-menu: 30;
  --layer-dialog: 50;
  --layer-toast: 60;
  --layer-skip-link: 100;
}
@media (max-width: 1100px) { :root { --inspector-width: 340px; } }
```

Source spacing is `2–4, 6, 8, 10–12, 14–16, 18, 20–24, 28–32, 40–48px`; use named destination tokens if convenient but keep proportions. Inherited radii are **6 / 10 / 14px**, not all pill-shaped. Use `font-variant-numeric: tabular-nums` for every scientific number, time, probability, unit or financial metric. Dark theme must theme node palettes, React Flow controls, inspector, tooltips, tables, charts, KaTeX formulas and code preview consistently—not just page background.

### 12.3 Extended chart series palette

Source `--chart-1/2/3` covers three series. For more than three visible distributions, provide clearly labeled extensions with the same identities in both themes; choose accessible, tested distinguishable swatches for at least 8 categories (avoid status colors for statistical identity). Exact additional swatches are an implementation design decision recorded in `docs/design/chart-palette.md`, not source values. Pair color with dash style/marker shape, text legend and table. For more than eight variables, use scrollable legend, series filter, facet/small-multiple or aggregation with explicit methodology—not overlapping rainbow lines.

## 13. Product shell, navigation and key user journeys

### 13.1 App shell

The app's central entry point is **Simulation Builder**, alongside **Simulation Lab**. The navigation layout is consistent in all routes:

| Group | Items | Key affordance |
| --- | --- | --- |
| Workspace | Overview, **Simulation Builder**, Simulation Lab, Distribution Studio, Experiments, Analysis, Compare | Builder opens blank/new or last model without losing edits |
| Learn | **Examples (12)**, **Lessons (12)**, **Challenges (12)**, Theory | Clear learning progress and crosslinks |
| Projects | Saved models, imports, recent runs | Local first and visible save status |
| Utility | Settings, Help, Export, Theme | Theme mode, units, uncertainty methods and data portability |

Sidebar stays 232px expanded or 64px icon-only. On tablet/phone <=820px use source mobile row navigation with accessible labels on focus/expanded menu. Keep toolbar 56px high and title/actions separated. Navigation changes must not cancel an experiment or discard a draft. A new unsaved question should be recoverable.

### 13.2 Three paths to simulation

1. **Start from a question** — wizard translates a *user-authored* question into a specified goal; the user manually defines uncertainty and dependencies. Do not deceptively imply arbitrary questions automatically produce a correct model.
2. **Start from an example** — open one of 12 existing/preset labs with visual controls; optionally choose **Open in Builder** only if semantic conversion is supported. For domain-specific dynamic simulators, embed as encapsulated model node rather than pretending it is a simple formula DAG.
3. **Start from blank** — advanced canvas with node palette, variable form and drag/drop/keyboard tools.

### 13.3 Overview hierarchy

A productive Overview, not marketing landing page: compact header + **New simulation** / **Open Builder** / **Explore 12 examples**, followed by recent projects, last experiment, suggested lesson and challenges. One or two carefully chosen cards may present a basic “How Monte Carlo works” visual. Do not occupy most of first screen with a title illustration. Under each recent project show the real saved question, last run seed/date, and status (draft/valid/needs attention).

## 14. Simulation Builder — detailed visual and interaction design

### 14.1 Desktop workspace structure

```text
┌────────────────┬──────────────────────────────────────────────────────────────────────────┐
│  NAV 232px     │  Project title / question         Save · Validate · Run · Compare · Export │
│                ├───────────────┬────────────────────────────────┬─────────────────────────┤
│  Overview      │ Node palette  │  GRIDDED MODEL CANVAS          │ Inspector 420px         │
│  Builder ★     │  Inputs       │                                │ Configure               │
│  Simulation Lab│  Operations   │  [Demand ~ N] ─┐               │ Validate                │
│  Distribution  │  Outcomes     │                ├─> [Profit] ─>  │ Explain                 │
│  Experiments   │  Decision     │  [Price fixed] ┘    [P(loss)]   │ Data / provenance       │
│  Analysis      │               │                                │                         │
│  Compare       │               │  Zoom · Fit · Grid · Map        │ Selected node context   │
│  Examples 12   ├───────────────┴────────────────────────────────┴─────────────────────────┤
│  Lessons 12    │ Results drawer: Overview | Distribution | CDF | Sensitivity | Samples    │
│  Challenges 12 │ KPIs, uncertainty, plots, tables, run log                              │
└────────────────┴──────────────────────────────────────────────────────────────────────────┘
```

Palette may overlay as compact 240px drawer to avoid cramping the model. Adapt the source editor composition: flexible canvas with `420px` inspector at wide viewport; inspector `340px` below 1100px; inspector stacks below canvas below 820px. The bottom results drawer is resizable with minimum 220px and clear expand/fullscreen control. User can collapse inspector and drawer to focus on modeling. Never hardcode absolute panel widths that make the center unusable.

### 14.2 Header and workflow controls

- Header: project title and question in normal text, below a compact line of `Saved 14:32` / `Unsaved changes` / `Draft — 2 validation errors` / `Results from prior model` as appropriate.
- Standard controls: **Save**, **Validate**, **Run simulation** (primary), **Duplicate/Compare**, **Export** menu. Run disabled for invalid model with nearby explanation, not silent gray. Keyboard shortcut hints in tooltips.
- Samples and seed are visible grouped controls; `Run 10,000 samples` conveys exact number. Advanced users can configure `n`, sampling strategy and trace capture in a popover.
- Progress status distinguishes `Preparing`, `Running · 28,000/100,000`, `Cancelling`, `Partial · 28,000 completed`, `Completed`. Animation speed controls must never change RNG or sample count.
- On formula/model revision show prior cards visually muted with explicit **Old model revision** label. Never conceal prior results or quietly relabel them current.

### 14.3 Node geometry and visual vocabulary

Nodes should look like clean analytical blocks, not cartoon circuits. Reference sizing: minimum width `160px`, common width `190–240px`; height `72–112px` depending on summary. Border 1px, 10px radius, subdued shadow and 14px padding; hover strengthens border, selected node uses 2px primary outline; focus shows independent offset ring. Port handles aligned to semantic input/output rows; handles remain discoverable without hover for new learners. Labels never clipped without tooltip accessible on focus.

| Node type | Header and border | Content/controls | Special semantics |
| --- | --- | --- | --- |
| Random variable | Blue thin top bar, small distribution icon | `Cost · EUR`; `Triangular(80,100,140)`; preview sparkline | One value sampled **once** per replication |
| Constant | Neutral header/bar | `Budget · €200,000` | No RNG use |
| Formula | Orange *subtle* identifier | `Profit = revenue − cost`; units; AST valid | Derives output without sampling another draw |
| Condition | Indigo/primary-soft marker | `Total > Budget` | Outputs Boolean event |
| Decision | Distinct circle/choice icon and label | `Vendor A`; editable alternatives | Assumption/control, not optimized automatically |
| Output | Neutral/primary role marker | `Total cost (EUR)` | Prefer neutral/output role swatch; green success reserved for real success |
| Metric | Thickened side rule (not bright fill) | `P(Over budget)`, `Mean cost` | Across-run statistic, not sampled input |
| Annotation | Quiet border, no handles | Assumption text | Never evaluated |

**Color rule:** regular output nodes use an informational/recommendation swatch; reserve `--success` for a genuine validated action or achieved goal. A high chance of loss must never be drawn as a green good result. Distinguish categories with icons, text and shapes beyond color.

Node connections: 1.5–2px muted blue/gray lines, smoothly curved and routed to avoid labels, arrowhead optionally for direction, no busy pulsing animations. Selected path highlighted using primary color, invalid connector/port with red border + readable issue text; active variable path may be accented orange briefly, not sustained flashing. Dangling connections are drafts, not committed mathematical edges. DAG cycle detection is immediate and points to offending connectors. Performance overlays can hide unrelated links visually without changing computation.

### 14.4 Grid, alignment and selection

- Grid: subtle 16px dot or square positions with low contrast; optional toggle. Snap-to-grid defaults on with toggle/Alt to temporarily bypass if supported. `Align left`, `Align centers`, `Distribute horizontally/vertically`, `Tidy layout`, `Fit to content` actions are undoable where they affect layout.
- Keep node identity (stable IDs) separate from canvas position and display label. Moving a node does not invalidate results or consume draws.
- Multi-select displays count and alignment toolbar. Zoom/pan support trackpad + mouse + keyboard; prevent browser page scroll only during intentional canvas interaction.
- Provide **Add variable**, **Add formula**, **Connect inputs**, **Edit formula**, **Delete node** actions in a keyboard-usable form/table interface. Graph gesture must never be the only route.
- Inspector selection follows click on node or table row; selection is preserved when switching Configure/Validate/Explain/Data tabs. Search node by name or ID and jump to it.
- Accessible explanatory list: all nodes and edges represented as `<table>` or labeled list with meaningful source/destination relationships, not only an inaccessible canvas.

### 14.5 Right inspector specifics

Four stable tabs: **Configure**, **Validate**, **Explain**, **Data**. Configuration uses labeled 34px inputs, unit selector, family dropdown and safe param-specific fields. Show complete precision on focus, standard abbreviated display only when not editing; do not round stored values. Validator shows severity, issue code, affected port/node, why invalid, and actionable fix. Explain tab displays a plain-language definition, accessible KaTeX formula, one deterministic worked evaluation and a link to relevant lesson. Data tab shows data provenance and tiny sample preview with caution label. For a threshold/event show `P(Profit < 0)` as a first-class target, including zero-vs-one direction and whether strict comparison matters.

### 14.6 Question wizard and scenario template cards

Wizard steps use 4 compact step indicators along top, clear Back/Next, escape/cancel without losing existing project. Step 1 captures a literal question and selected metric; avoid fabricated AI “understanding” of text. Step 2 shows one variable form card per uncertain input; Step 3 maps relationships and formulas; Step 4 reviews validation and run configuration with transparency. Use real examples: *“Will total cost exceed the budget?”*, *“What is the chance production misses demand?”*, *“What reorder point reduces shortage?”* Prebuilt template cards show **Question / Uncertainties / Output / Assumptions** with a miniature model preview. Project budget and revenue risk can be builder templates but do not increase the 12-example catalog count.

## 15. Distribution Studio and probability editor

Use a shared distribution picker in all seven original labs, five new examples and Builder random nodes. Family selection in searchable compact combo, parameter inputs with units, domain constraints, and a live preview that is explicitly a **visual preview** rather than scientific run. A two-up mini panel combines theoretical density/PMF plus CDF, with slider for probability threshold and accessible table. Discrete distribution uses bars and labeled categories; continuous uses smooth theoretical curve only when warranted. A histogram of finite samples uses a declared density scaling before overlaying with PDF. Print theoretical vs empirical labels.

For truncated normal show the actual renormalized density; do not depict clamped normals as truncation. All inputs have tooltips explaining support, parameterization (variance vs SD, rate vs scale), whether assumption is empirical or guessed. Invalid parameters show inline diagnosis but allow draft editing. Separate **Reset distribution**, **Preview samples**, **Apply to model** actions; preview must not silently mutate model assumptions.

## 16. Results, statistics and scientific chart grammar

### 16.1 Common results hierarchy

Every run follows: `question/goal` → `estimate + uncertainty` → `sample size and method` → `distribution of outcomes` → `risk/threshold` → `sensitivity/comparison` → `explanation/export`. KPI cards retain reference: muted 12px label, 22px bold tabular value, 11px metadata. An example probability card reads **“P(cost > €200k) · 31.4%”**, then **“95% Wilson CI 30.5–32.3% · n=10,000 · sampled”**. Such numeric figures are *illustrative design copy*, not scientifically verified results for a specific model. Do not show an unsupported “confidence” band or an interval around arbitrary P10/P90 values without valid quantile uncertainty computation.

### 16.2 Chart catalog

| Question | Chart | Notes |
| --- | --- | --- |
| What outcomes are likely? | Histogram with density/frequency switch, optional theoretical overlay | Clear bin labels and source; truncate marker for extreme values only with explicit warning |
| What fraction is below threshold? | Empirical CDF + interactive reference line | Units, threshold inequality and sample proportion explicit |
| Does estimator stabilize? | Replication-index convergence line + optional valid CI band | No smoothing that invents data; separate theoretical reference |
| Which inputs matter? | Scenario-based tornado / sensitivity bars | Declare parameter shift and independence assumptions; descriptive ≠ causal |
| How do two alternatives differ? | Matched-axis overlays, small multiples, difference bars | Difference in percentage points vs currency/time; same domains |
| What changes over time? | Percentile fan chart, sampled spaghetti paths (bounded), linked table | Ensemble P10–P90 ≠ CI for mean; temporal paths have individual identity |
| How many cases per category? | Discrete ordered bars and comparison table | No continuous interpolated line between unordered outcomes |
| How does one variable relate to another? | Scatter/hexbin on bounded sample | Correlation is not causation; annotate if observations correlated |

Use source chart design: title/subtitle/legend, 11px axis text, 2px lines, muted grid, 4px bar ends, consistent three base categorical colors and extended palette for extras. Tooltips match theme with formatted values, units, sample n, method and relevant interval. Always include accessible full result table and CSV export; Canvas/diagram-only scientific evidence is not acceptable. Overlaid analytic curve is a different line style from stochastic estimate.

### 16.3 Domain-specific scenes — all 12 examples

| Example | Primary scene | Secondary analysis |
| --- | --- | --- |
| EX01 Estimating Pi | Geometric quarter-circle dart scatter with sampled hits/misses | π convergence line, hit count/interval |
| EX02 Integration | Function curve and signed shaded regions, sampled x positions | Running integral estimator, signed contribution table |
| EX03 Monty Hall | Three doors, host reveal, step-by-step correct rule | Side-by-side stay/switch win probabilities + analytic lines |
| EX04 Random Walk | 2D paths with origin marker and bounded opacity | MSD vs steps, endpoint distribution scatter |
| EX05 GBM | Bounded actual sample price paths with terminal fan quantiles | Terminal histogram, probability threshold, analytic moment overlay |
| EX06 Project schedule | Compact task/DAG dependency timeline or critical-path highlight | Completion date histogram, deadline CDF, major drivers |
| EX07 Manufacturing | Compact factory-flow schematic with downtime/yield events | Throughput distribution, target yield/availability, time series |
| EX08 Coin & Dice | Clear coin toss/dice face categorical tally | Frequency convergence, expectation |
| EX09 Birthday Paradox | Group count/duplicate-day highlighting without individual private identities | Collision probability vs group size, exact reference curve |
| EX10 Reliability | Series/parallel component schematic with status labels | Reliability probability with analytic reference |
| EX11 Queueing | Timeline/server + queue-length step curve, not faux people animations | Wait-time histogram, utilization, sampled vs analytical diagnostic where applicable |
| EX12 Inventory | Inventory-on-hand step function with lead-time and order markers | Stockout/service-level table, cost distribution, policy comparison |

Scenes support Pause/Step if meaningful, show speed affects visualization only, and never let an animation represent more mathematical samples than actually computed. For the original EX04 use “2D Random Walk” label; any Brownian interpretation must explicitly be a separate continuous-time extension. For EX05 subtitle “Illustrative GBM scenarios, not reliable stock-price forecasts.” For EX11, distinguish queue transient trajectory from stationary summary; no steady-state language without model conditions.

### 16.4 Result provenance and error states

Every chart/card can reveal a compact `Method / Seed / n / Model version / Assumptions / Engine version` details section. Invalid model results are not re-run; stale prior results are muted and labeled. Uncertain or non-finite metrics display `Not defined`, `Not computed`, `Unsupported` or `Numerical failure` with explanation, never just “—” or “0”. Worker partial/cancelled states show completed sample count and explicit condition for whether an interval is safe to interpret. Export button indicates whether data are full, summary only or partial.

## 17. Learning system — 12 examples, 12 lessons, 12 challenges

All learning cards use stable `EX01–EX12`, `L01–L12`, and `C01–C12` IDs. Catalog has fixed sections **12 Examples**, **12 Lessons**, **12 Challenges** with total/progress accurately calculated. Dynamic Builder templates have separate labels and must not inflate those published counts. Filters for level, domain, method, related lesson; search text and keyboard navigation. Example card contains a small domain visual + question + type + expected outcome; opening does not destroy active Builder project.

**Lesson layout** follows theory → interactive demonstration → worked calculation → common mistake → reflection → check, with stepper and accessible KaTeX. Main article width `76ch`, headings 20px, body 14px. Explain difference among an exact mathematical value, a simulated estimate, a model-output percentile and an estimate's confidence interval repeatedly; these are conceptual goals, not merely visual badges.

**Challenge layout**: task, provided fixture, available controls, target metric, **Check my model**, explainable feedback, progressive hints 1–3, rubric and reset. Challenges grade mathematical correctness or validated model structure rather than a screenshot or one lucky sample. Preserve working model when opening a hint. Success color appears only after actual validated achievement. A “try again” prompt must say what to fix, not merely mark wrong.

A one-click **Open relevant example** and **Apply in Builder** action may be offered where semantically supported. Do not fabricate a conversion of DES queues to a static DAG. Ensure each lesson and challenge is reachable from its example; completed-progress states persist across page navigation and theme changes.

## 18. Export center: Python, R, Colab, data bundles

Export affordance should appear in both global toolbar and each result's action menu. Export dialog is a simple two-column layout (format choices on left, file contents / prerequisites on right) at desktop, stacked on mobile. Use recognizable file extensions and descriptions, not platform logos as the sole text. Required options:

| Format | UI copy | What user receives |
| --- | --- | --- |
| `.ipynb` | **Google Colab / Jupyter notebook** | Executable notebook with parameter cells, theory, model, simulation, charts, results and provenance |
| `.py` | Python script | Reproducible runnable model with dependency notes |
| `.R` | R script | R implementation with listed packages and seed policy |
| `.json` | Project JSON | Versioned editable model and assumptions |
| `.csv` | Results CSV | Numeric tables with units, n, statistical method, condition |
| `.zip` | Reproducibility bundle | Project, run, manifest, chosen code and approved data |
| `.png/.svg` | Chart image | The visible plot with title/axes/legend/units |

**Colab notebook modal**: title `Export Google Colab notebook`; choices `Include explanations`, `Include run results as reference`, `Include approved data` (off by default), `Generate with current model/seed`. Show estimated file size/known limitations and dependency list. Main button **Download .ipynb**, secondary **Copy Colab upload instructions**. For arbitrary codegen failures show offending unsupported node, not a fake success toast. Once exported, give concise guidance: `Open Google Colab → File → Upload notebook → Runtime → Run all`. One-click launch in a hosted URL is not guaranteed without a public notebook or Drive integration.

Notebook code should be syntax highlighted and copyable as a **preview** only if it mirrors the actual exporter IR; do not use a decorative script that's different from the downloaded notebook. Label cross-runtime RNG differences: `same experiment assumptions; paths may differ between browser RNG and Python unless matching RNG is explicitly verified`. Display both **Saved project** and **Downloaded export** messages accurately, never claim a file has been stored in Drive without integration.

## 19. States, responsive design and keyboard accessibility

### 19.1 Responsive composition

| Viewport | Builder layout | Reader/analysis layout |
| --- | --- | --- |
| >1100px | Palette drawer + canvas and 420px inspector; resizable results | 380px controls + results; card collections auto-fill min 260px |
| 821–1100px | Inspector 340px, palette collapsible; center min width 0 | Configuration/results stacked as needed |
| <=820px | Horizontal/mobile nav, canvas then inspector then results; no forced desktop side-by-side | 18px/16px page insets; tables internally scroll |
| 320px content/400% zoom | Canvas remains contained with accessible form/table fallback, no page-level horizontal overflow | Dialog/reflow, usable full-width buttons and internal scrolling for true graphs |

Min touch hit target goal 44×44px on coarse pointer without changing dense 34/28px visual control geometry; use larger invisible hit zone if safe. Source breakpoints at 1100/960/900/820 apply, with documented accessibility exceptions. Horizontal chart tables/queue timelines may scroll *within labeled regions*. Save/Run/Export never disappear without a discoverable menu alternative.

### 19.2 State matrix

| UI component | Required states |
| --- | --- |
| Project | New, draft, valid, saved, unsaved, save-failed, conflict, outdated version |
| Model node | Normal, hover, selected, focus, editing, invalid, warning, running-sampled, disabled, stale |
| Formula editor | Valid AST, incomplete entry, parse error, unit mismatch, runtime domain error |
| Run | Ready, preparing, running, paused visual, cancel-requested, partial, complete, failed |
| Chart | Loading, empty, zero events, reference available, reference missing, filtered, truncated |
| Learning | Not started, in progress, completed, challenged, checking, feedback, hint open |
| Export | Ready, generating, download ready, unsupported node, data-not-included, error |
| Deployment | Local, Netlify, Railway; functional parity for visual UI and download |

**Visual severity:** actual mathematical invalidity uses `--error`; untested model assumption or sampling limitation uses `--warning`; informative structural note uses neutral; an outcome's directional preference is user-dependent. Do not paint a negative profit histogram red without explaining the chosen event threshold and decision objective.

### 19.3 Accessibility requirements

- Full semantic landmarks with skip link, page h1, clear aria labels on icon-only controls, dialogs named and focus-trapped, Escape and focus restoration.
- Builder node list/table provides full keyboard alternatives: add, edit, connect, disconnect, reorder, delete and validate. React Flow keyboard affordances follow actual API; do not build ARIA canvas semantics that screen readers cannot meaningfully use.
- Tabs use correct roles, selected state and arrow/Home/End keyboard handling. Dropdown/menus have focus and Escape semantics. Shortcuts cannot delete nodes while typing in fields.
- Errors associated with source field and described via `aria-describedby` and `aria-invalid`. Live region announces `Simulation complete · 10,000 replications`, not every iteration/sample.
- Reduced-motion setting affects both CSS and Canvas/JS animation; progress remains textual. Never signal likelihood using flashing colors or a permanently moving canvas.
- Charts have accessible summary/caption and table equivalent. Formula rendering has accessible text/MathML support, not image-only. Headings and labels visible at 200% text zoom.
- Contrast tested in both themes: 4.5:1 ordinary text, 3:1 large text/control outlines where applicable. Reference chart/grid colors and semantic palette are **not certified** by their inclusion; test actual rendered combinations.

Recommended focus style and motion override:

```css
:where(button,a,input,select,textarea,[tabindex]):focus-visible {
  outline: 2px solid var(--mc-focus);
  outline-offset: 2px;
  box-shadow: var(--focus-ring);
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

JS/Canvas animation must also honor media preference; CSS alone is insufficient.

## 20. Writing, interpretation and error-message vocabulary

Use concise professional educational language, simple verbs and consistent terminology. Keep the key question visible in Builder and results. Prefer **uncertain input**, **distribution**, **replication**, **sample count**, **outcome**, **estimate**, **sampling error**, **confidence interval**, **assumption**, **threshold**, **scenario**, **decision**, **model**. `Risk` does not always mean bad; user-defined desirable/undesirable events control direction.

| Situation | Suggested message |
| --- | --- |
| Empty Builder | “Start with a question, then add uncertain inputs and connect them to an output.” |
| Empty model threshold | “Select an outcome and a condition before estimating a probability.” |
| Invalid distribution | “The standard deviation must be greater than zero for this normal sampler. Change this parameter or choose a constant.” |
| Invalid units | “This formula adds EUR and days. Use compatible quantities or revise the equation.” |
| Cycle in DAG | “These calculations depend on each other in a loop. Remove a connection or use a supported time-series model.” |
| Unverified assumptions | “These distributions are illustrative assumptions. Results describe this model, not measured reality.” |
| Small sample | “Only 10 replications completed. Uncertainty about the probability estimate is substantial.” |
| Zero observed event | “No losses observed in 100 trials. That does not establish zero loss probability.” |
| Stale result | “Inputs changed after this run. Re-run to estimate the updated model.” |
| Notebook warning | “This imported dataset is not included. Attach the data in Colab or choose a bundled export.” |
| Colab difference | “Python uses a documented RNG implementation; the same seed may produce different draws from the browser.” |
| Export failure | “This model uses an unsupported function. Replace it or export the project JSON.” |
| Save failure | “This device could not save your latest changes. Download a project file to keep them.” |
| Railway/Netlify | “The calculation runs in your browser; hosting platform does not change its statistical method.” |

Never write “100% safe” based on no sampled failures, “guaranteed forecast,” “exact Monte Carlo prediction,” “confidence = probability the fixed true value lies in this computed interval” as a frequentist definition, or “independent” for data where shared random variables or explicit correlation exist.

## 21. Visual QA checklist and agent handoff

### 21.1 Source fidelity

- [ ] All inherited light/dark token values (surfaces, text, shadows, primary, accents, semantic feedback, charts, canvas and focus) match §12.1; new Monte Carlo aliases are clearly separate.
- [ ] Reference typography `14px body`, `26px page h1`, `20px h2`, `16px h3`, `22px KPI`, `12px field`, `11px metadata`, max `76ch` text implemented.
- [ ] Reference 232/64px nav, 56px toolbar, 420→340px inspector, 380px configs, 280px reference index, 1080px max content, source breakpoints and 6/10/14px radii implemented or accessibility exceptions documented.
- [ ] Source table, cards, 34/28px inputs/buttons, 8px progress tracks, 20px status badges, 1px borders and motion timing are consistent.
- [ ] No glassmorphism, heavy shadows everywhere or decorative gradients; light and dark both fully designed.

### 21.2 Builder and statistical literacy

- [ ] Empty→question wizard→DAG→validation→run→results→compare→export is visually self-explanatory.
- [ ] Selected/invalid/run state coexist without ambiguous color use; `EUR+days` clearly invalid; cycle and missing port issues actionable.
- [ ] Canvas 16px snap, alignment/distribute, undo/redo, zoom/pan/fit, table editor alternative and 420px inspector all work.
- [ ] Charts distinguish sampled outcome ranges from confidence intervals for estimates, with labeled n/method/units and full accessible tables.
- [ ] Every one of the 12 examples has a fitting domain visualization, not an identical generic histogram.
- [ ] Exactly 12 examples, 12 lessons and 12 challenges are visible, discoverable, complete and reachable without broken links.
- [ ] Export dialog can download valid parameter-accurate `.ipynb` notebooks for all 12 examples and Builder; `.py`, `.R`, `.json`, `.csv` and bundles are discoverable.

### 21.3 End-to-end cross-platform acceptance

- [ ] Desktop and small phone responsive test at 1440, 1100, 820, 390, 320px; 200% text zoom and 400% page zoom.
- [ ] Keyboard-only wizard, model table/connection actions, Save, Run, compare, export; screen-reader navigation, dialog focus and error announcements.
- [ ] Reduced-motion still shows all outcomes without spinning/animated-only meaning.
- [ ] Same visual state and chart content on local Vite, Netlify production URL and Railway production URL; nested route refresh and Canvas/Web Worker assets work.
- [ ] No runtime font/CDN dependence required for core features; exported notebook need not use browser network.
- [ ] Visual regression screenshots light/dark for Builder, all 12 simulations, a lesson, a challenge, invalid model, incomplete run, export modal and 3 viewport classes.

## 22. Recommended implementation order and design ownership

1. Audit existing UI screenshots and CSS. Extract components and identify current route/Canvas layout before moving code.
2. Add exact central tokens and theme resolution-before-first-paint. Build shared 34px controls, cards, tables, dialogs, tabs, KPI and chart framing.
3. Design **Builder vertical slice**: question header, three stochastic nodes, one formula and threshold, inspector, validation, worker results. Confirm graphic and form editing parity.
4. Apply existing domain scenes and results components to all seven original labs, preserving their unique interactive controls; add five new examples following §16.3.
5. Implement 12 lesson + 12 challenge view templates and content styling from one schema, not 24 inconsistent bespoke pages.
6. Implement Export center with `.ipynb` preview/validation/download, Python/R and data bundles; avoid dummy links.
7. Finish responsive behavior, complete keyboard semantics, reduced motion and contrast; screenshot regression with light and dark across all modules.
8. Verify Netlify and Railway production behavior, deep-link route, workers, local persistence and file downloads. Record exact test evidence.

**Closing instruction for agents:** Treat this file as a visual contract. Do not mark an acceptance item complete until the actual UI and automated/manual evidence substantiate it. Coordinate with `PLAN.md` for scientific meaning and engine-version reproducibility. Never trade correct statistics for a more beautiful chart.
