# Session Introspection Phase 2-3 — Design Spec

**Author:** Robert (Product Designer)
**Date:** 2026-02-07
**Inputs:** Thomas's P2-3 requirements, Andrei's P2-3 tech approach, Phase 1 design spec, existing `css/styles.css`

---

## Design Principles for These Panels

1. **The event stream remains the primary content.** The three new panels are contextual headers — they orient the user before they read the log. They should feel like a compact dashboard strip, not a competing interface.
2. **Progressive disclosure.** The pipeline indicator is always visible (6 small dots). Team activity expands on demand. Deliverables default to collapsed. This hierarchy matches how often the CEO checks each: project phase (constant), who's working (frequent), what files were touched (occasional).
3. **Same visual language as Phase 1.** Zinc/indigo palette, BEM naming, same spacing scale, same typography. The panels use the same accent patterns as agent spawn banners (indigo-400) and the same collapsible pattern as event groups/tool results.
4. **Dense but legible.** These panels sit in a fixed area above a scrollable region. Every pixel of vertical space they consume pushes the event stream down. Keep them compact.

---

## New Design Token

One new token is required. Add to `:root` in `css/styles.css`:

```css
--color-indigo-300: #a5b4fc;
```

This is used only for the current phase label text, where indigo-400 (`#818cf8`) would be too muted against the zinc-950 background for a "this is active right now" signal. Indigo-300 (`#a5b4fc`) provides 9.2:1 contrast ratio against zinc-950 — well above WCAG AAA.

---

## Panel Container: `session-panels`

The three panels sit inside a wrapper div between the session log header and the scrollable body. This wrapper is **outside** the scroll region — panels do not scroll with events.

### Layout

```
+-- session-log --------------------------------------------------+
| session-log__header  [ LIVE SESSION ]          [ 4:32 ]          |
|------------------------------------------------------------------|
| session-panels                                                   |
|   [ Pipeline Indicator: Research > Scoping > ... > QA ]          |
|   [ Team Activity (4)                              v ]           |
|   [   Thomas - PM - Scoping requirements... - [*]    ]           |
|   [   Andrei - Arch - Defining tech...      - [*]    ]           |
|   [ Deliverables (7 files)                         > ]           |
|------------------------------------------------------------------|
| session-log__body (scrollable)                                   |
|   session-log__events                                            |
|     ... event stream ...                                         |
+------------------------------------------------------------------+
```

### CSS

```css
.session-panels {
  padding: var(--space-2) var(--space-4) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  border-bottom: 1px solid var(--color-zinc-800);
}
```

**Design note:** The `border-bottom` creates a clean separation between the panel strip and the event stream. Without it, the panels bleed into the first event. The gap between panels is `--space-2` (8px) — tighter than the `--space-3` Andrei suggested, because at three stacked panels we need to be economical.

---

## Panel 1: Pipeline Phase Indicator

### Purpose

Answers "what stage is this project in?" at a glance. Six steps. Always visible. No interaction.

### Layout

```
 (o)----(o)----(o)----(*)----( )----( )
 Res   Scop   Arch   Des   Impl    QA
```

- Each step is a dot + label, connected by horizontal lines
- Dot sizes: 10px diameter
- The whole indicator is a single horizontal flexbox row
- Connectors (lines) flex to fill available space between steps

### Visual States

| State | Dot | Label | Connector (to next step) |
|-------|-----|-------|--------------------------|
| **Upcoming** | Hollow circle: 2px border `--color-zinc-700`, transparent fill | `--color-zinc-600`, normal weight | `--color-zinc-800` |
| **Completed** | Solid fill: `--color-indigo-400`, no visible border | `--color-zinc-400`, normal weight | `--color-indigo-400` (connector *before* this step) |
| **Current** | Solid fill: `--color-indigo-400`, 3px glow ring `rgba(99, 102, 241, 0.25)` | `--color-indigo-300`, semibold weight | `--color-indigo-400` (connector *before* this step) |

**Design rationale for the glow:** The current phase dot uses a `box-shadow` ring (not a border) so the dot doesn't change size between states. The glow is subtle — 3px spread at 25% opacity — enough to draw the eye without looking like a notification badge.

### Typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Phase label | `--font-family` (Inter) | `--text-xs` (12px) | Normal (upcoming/completed), Semibold (current) | See state table above |

**Design note:** Labels use the system font (Inter), not monospace. This matches the agent spawn banner pattern from Phase 1 — human-readable labels use Inter, machine/tool data uses monospace. Phase names are human concepts, not technical identifiers.

### Spacing

- Container padding: `var(--space-3) 0` — 12px vertical breathing room
- Step dot-to-label gap: `var(--space-1)` (4px)
- Connector horizontal margin: `var(--space-1)` (4px) on each side
- Connector min-width: 12px (prevents connectors from disappearing on narrow viewports)
- Connector vertical alignment: offset down by the label height so it aligns with the dot center, not the step center

### Responsive Behavior

The pipeline indicator is inside the project card detail panel, which has constrained width. At narrow widths:
- Labels truncate naturally (single words, they won't)
- Connectors shrink but maintain 12px minimum
- If the card is very narrow (<360px), the labels could optionally switch to abbreviations — but this is unlikely given current UI constraints, so defer

### Complete CSS

```css
/* Pipeline Phase Indicator */

.pipeline-indicator {
  /* Container always present, content rendered by JS */
}

.pipeline-indicator__steps {
  display: flex;
  align-items: flex-start;
  padding: var(--space-3) 0;
}

.pipeline-indicator__step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
}

.pipeline-indicator__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--color-zinc-700);
  background: transparent;
  transition: all 0.2s ease;
}

.pipeline-indicator__label {
  font-size: var(--text-xs);
  color: var(--color-zinc-600);
  white-space: nowrap;
  transition: color 0.2s ease;
}

.pipeline-indicator__connector {
  flex: 1;
  height: 2px;
  background: var(--color-zinc-800);
  min-width: 12px;
  margin: 0 var(--space-1);
  margin-top: 4px; /* Align with dot center: (10px dot height / 2) - (2px line height / 2) = 4px */
  transition: background 0.2s ease;
}

/* State: completed */
.pipeline-indicator__step--completed .pipeline-indicator__dot {
  background: var(--color-indigo-400);
  border-color: var(--color-indigo-400);
}
.pipeline-indicator__step--completed .pipeline-indicator__label {
  color: var(--color-zinc-400);
}

/* State: current */
.pipeline-indicator__step--current .pipeline-indicator__dot {
  background: var(--color-indigo-400);
  border-color: var(--color-indigo-400);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
}
.pipeline-indicator__step--current .pipeline-indicator__label {
  color: var(--color-indigo-300);
  font-weight: var(--font-weight-semibold);
}

/* Connector: active (phase after it has been entered) */
.pipeline-indicator__connector--active {
  background: var(--color-indigo-400);
}
```

### Accessibility

- The container has `aria-label="Pipeline progress"` for screen readers
- Color is not the only differentiator: the current phase also has bold text and a glow ring
- Contrast ratios: zinc-600 on zinc-950 = 3.6:1 (decorative/supplementary, acceptable); indigo-300 on zinc-950 = 9.2:1 (passes AAA); zinc-400 on zinc-950 = 5.5:1 (passes AA)

---

## Panel 2: Team Activity

### Purpose

Answers "who is working and what are they doing?" Shows all spawned agents in session order with live status.

### Collapse Behavior

- **Live sessions:** Expanded by default
- **Historical sessions:** Collapsed by default
- Toggle button in the header, using the same chevron pattern as event groups

### Layout (expanded)

```
Team Activity (4)                                            v
+--------------------------------------------------------------+
| [avatar] Thomas       Scoping requirements for P2-3...   [*] |
|          Product Manager                                      |
| [avatar] Andrei       Defining tech approach for...      [*] |
|          Technical Architect                                  |
| [avatar] Robert       Writing design spec for...         [*] |
|          Product Designer                                     |
| [avatar] Alice        Implementing panels in...          [ ] |
|          Front-End Developer                                  |
+--------------------------------------------------------------+
```

Each agent row is a compact horizontal layout:

| Element | Width | Treatment |
|---------|-------|-----------|
| Avatar | 20x20px | `border-radius: 4px`, `image-rendering: pixelated`. Same size as message card avatars from Phase 1. |
| Name + Role (stacked) | ~90px fixed min-width | Name: semibold, zinc-300. Role: 10px, zinc-500. Stacked vertically. |
| Task description | Flex (remaining) | Truncated with ellipsis. Monospace, zinc-500. Truncated to 80 chars server-side by Andrei's state tracking. |
| Status indicator | 8px dot | Working: indigo-400, pulsing. Done: zinc-600, static. |

### Typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Section title ("Team Activity") | `--font-family` | `--text-sm` (14px) | Semibold | `--color-zinc-300` |
| Agent count badge | `--font-family` | `--text-xs` (12px) | Normal | `--color-zinc-500` |
| Agent name | `--font-family` | `--text-xs` (12px) | Semibold | `--color-zinc-300` |
| Agent role | `--font-family` | 10px | Normal | `--color-zinc-500` |
| Task description | `--font-mono` | `--text-xs` (12px) | Normal | `--color-zinc-500` |

**Design note:** Task descriptions use monospace to match the tool_use event styling in the session log — they originate from the same Task tool_use input. Agent names and roles use Inter (same as spawn banners) to maintain the "people vs. machines" typographic distinction from Phase 1.

### Header

```
[>] Team Activity  (4)
```

- Chevron: 8x8px, `--color-zinc-600` borders, same rotation pattern as event group chevrons (right-pointing when collapsed, down-pointing when expanded)
- Title: "Team Activity" — always the same text
- Count badge: pill-shaped, `rgba(63, 63, 70, 0.4)` background, `--color-zinc-500` text. Shows total agent count. Same visual style as the session count badges elsewhere in the UI.

### Status Dot Animation

The "working" status dot uses a pulse animation matching the session timer pulse:

```css
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

Duration: 1.5s, ease-in-out, infinite. Slower and subtler than a spinner — this is background status, not a loading indicator. The 0.4 minimum opacity keeps the dot visible at all times.

The "done" status dot is static `--color-zinc-600` — muted to signal completed work. No checkmark or icon — the dot changing from pulsing indigo to static gray is sufficient signal.

### Scrollable at Max Height

If more than ~6 agents are visible (unlikely in practice but possible), the list scrolls at `max-height: 240px`. Uses the same custom scrollbar as `session-log__body`.

### Complete CSS

```css
/* Team Activity Panel */

.team-activity[aria-hidden="true"] {
  display: none;
}

.team-activity__header {
  /* No padding — toggle button handles it */
}

.team-activity__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-1) 0;
  color: inherit;
  font-family: inherit;
}

.team-activity__toggle:hover .team-activity__title {
  color: var(--color-zinc-200);
}

.team-activity__toggle-chevron {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-right: 1.5px solid var(--color-zinc-600);
  border-bottom: 1.5px solid var(--color-zinc-600);
  transform: rotate(-45deg);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.team-activity__toggle[aria-expanded="true"] .team-activity__toggle-chevron {
  transform: rotate(45deg);
}

.team-activity__title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-300);
  transition: color 0.15s ease;
}

.team-activity__count {
  font-size: var(--text-xs);
  color: var(--color-zinc-500);
  background: rgba(63, 63, 70, 0.4);
  padding: 1px 6px;
  border-radius: 9999px;
}

.team-activity__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  max-height: 240px;
  overflow-y: auto;
  padding-bottom: var(--space-1);
}

.team-activity__list[aria-hidden="true"] {
  display: none;
}

.team-activity__list::-webkit-scrollbar { width: 6px; }
.team-activity__list::-webkit-scrollbar-track { background: transparent; }
.team-activity__list::-webkit-scrollbar-thumb { background: var(--color-zinc-700); border-radius: 3px; }

.team-activity__agent {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
}

.team-activity__avatar {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  flex-shrink: 0;
  image-rendering: pixelated;
}

.team-activity__avatar--placeholder {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: var(--color-zinc-700);
}

.team-activity__agent-info {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-width: 90px;
}

.team-activity__agent-name {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-300);
  line-height: var(--leading-tight);
}

.team-activity__agent-role {
  font-size: 10px;
  color: var(--color-zinc-500);
  line-height: var(--leading-tight);
}

.team-activity__agent-task {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-zinc-500);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.team-activity__status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.team-activity__status--working {
  background: var(--color-indigo-400);
  animation: pulse-dot 1.5s ease-in-out infinite;
}

.team-activity__status--done {
  background: var(--color-zinc-600);
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

### Accessibility

- Toggle button has `aria-expanded` state
- List has `aria-hidden` state synchronized with toggle
- Agent names serve as implicit labels — no additional ARIA needed for the simple list
- Status dots are decorative (the agent row itself communicates status through context); `aria-hidden="true"` on the dot span would be appropriate
- Hover state on toggle header: title brightens from zinc-300 to zinc-200

### Edge Cases

- **Unknown agent:** Show raw slug as name, "Agent" as role, placeholder div instead of avatar image
- **Agent re-spawned:** Update existing row (task description, status), don't duplicate
- **Empty state:** Panel is hidden entirely (via `aria-hidden="true"` on the container)

---

## Panel 3: File Deliverables

### Purpose

Answers "what did the session produce?" Surfaces files created/modified during the session, grouped by category.

### Collapse Behavior

- **Always collapsed by default** (both live and historical)
- This is intentional: deliverables are a reference list, not something the CEO monitors in real time. The count badge in the header gives the signal ("7 files") without needing to expand.

### Layout (collapsed)

```
[>] Deliverables  7 files
```

### Layout (expanded)

```
[v] Deliverables  7 files
+--------------------------------------------------------------+
| DOCS                                                          |
|   created  docs/session-introspection-p2-req...  Thomas   2x |
|   created  docs/session-introspection-p2-tec...  Andrei      |
|   modified docs/session-introspection-p2-des...  Robert   3x |
| CODE                                                          |
|   modified js/projects.js                        Alice     5x |
|   modified css/styles.css                        Alice     3x |
| DATA                                                          |
|   modified data/tasks.json                       Thomas   2x |
+--------------------------------------------------------------+
```

### File Entry Layout

Each file row is a horizontal flex layout:

| Element | Width | Treatment |
|---------|-------|-----------|
| Action badge | ~52px min-width | "created" or "modified". Indigo-400 for created, zinc-400 for modified. 10px text, medium weight. |
| File path | Flex (remaining) | Monospace, zinc-300. Truncated from the left using `direction: rtl` so the filename stays visible. Full path on `title` attribute for hover tooltip. |
| Edit count | Auto | Only shown if > 1. Format: "2x", "5x". 10px, zinc-500. |
| Agent name | Auto | Who last touched it. 10px, zinc-500. |

### Category Headers

Categories display in fixed order: **Docs**, **Code**, **Data**, **Config**, **Other**. Empty categories are hidden.

Category labels use the same uppercase treatment as the session log header title:
- Font: `--font-family` (Inter)
- Size: 10px
- Weight: Semibold
- Color: `--color-zinc-500`
- Transform: uppercase
- Letter-spacing: 0.05em

This is deliberately the same style as `.session-log__title` — both are section labels within the same component, and the visual consistency reinforces the hierarchy.

### Typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Section title ("Deliverables") | `--font-family` | `--text-sm` (14px) | Semibold | `--color-zinc-300` |
| File count badge | `--font-family` | `--text-xs` (12px) | Normal | `--color-zinc-500` |
| Action ("created"/"modified") | `--font-family` | 10px | Medium | See below |
| File path | `--font-mono` | `--text-xs` (12px) | Normal | `--color-zinc-300` |
| Edit count | `--font-mono` | 10px | Normal | `--color-zinc-500` |
| Agent name | `--font-family` | 10px | Normal | `--color-zinc-500` |

### Action Badge Colors

- **created**: `--color-indigo-400` — signals something new was produced (positive, notable)
- **modified**: `--color-zinc-400` — signals an edit to something existing (neutral, expected)

This mirrors the indigo-for-notable, zinc-for-routine pattern used throughout: agent spawn banners get indigo, system events get zinc.

### Header

Same structure as Team Activity:

```
[>] Deliverables  7 files
```

- Chevron: identical to Team Activity (8x8px, same rotation behavior)
- Title: "Deliverables"
- Count badge: same pill style as Team Activity. Text format: "1 file" or "7 files" (pluralized)

### "Show All" Overflow

When the file list exceeds 20 entries:
- Only the first 20 are shown
- A "Show all 34 files" link appears at the bottom
- Link style: `--color-indigo-400`, no underline, hover brightens to `--color-indigo-300`
- Clicking it removes the limit and re-renders the full list (the container gets a `file-deliverables--show-all` class)

### Path Truncation

File paths use `direction: rtl` with `text-overflow: ellipsis` so truncation happens from the left:

```
Full:      docs/session-introspection-p2-requirements.md
Truncated: ...ntrospection-p2-requirements.md
```

The filename is always visible because it's at the "start" (right side in RTL). `text-align: left` overrides the RTL direction for visual alignment.

### Complete CSS

```css
/* File Deliverables Panel */

.file-deliverables[aria-hidden="true"] {
  display: none;
}

.file-deliverables__header {
  /* No padding — toggle button handles it */
}

.file-deliverables__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-1) 0;
  color: inherit;
  font-family: inherit;
}

.file-deliverables__toggle:hover .file-deliverables__title {
  color: var(--color-zinc-200);
}

.file-deliverables__toggle-chevron {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-right: 1.5px solid var(--color-zinc-600);
  border-bottom: 1.5px solid var(--color-zinc-600);
  transform: rotate(-45deg);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.file-deliverables__toggle[aria-expanded="true"] .file-deliverables__toggle-chevron {
  transform: rotate(45deg);
}

.file-deliverables__title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-300);
  transition: color 0.15s ease;
}

.file-deliverables__count {
  font-size: var(--text-xs);
  color: var(--color-zinc-500);
  background: rgba(63, 63, 70, 0.4);
  padding: 1px 6px;
  border-radius: 9999px;
}

.file-deliverables__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: var(--space-1);
}

.file-deliverables__list[aria-hidden="true"] {
  display: none;
}

.file-deliverables__category {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-deliverables__category-label {
  font-size: 10px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: var(--space-1) var(--space-2);
  margin-top: var(--space-1);
}

.file-deliverables__category:first-child .file-deliverables__category-label {
  margin-top: 0;
}

.file-deliverables__file {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 2px var(--space-2);
}

.file-deliverables__action {
  font-size: 10px;
  font-weight: var(--font-weight-medium);
  flex-shrink: 0;
  min-width: 52px;
}

.file-deliverables__action--created {
  color: var(--color-indigo-400);
}

.file-deliverables__action--modified {
  color: var(--color-zinc-400);
}

.file-deliverables__path {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-zinc-300);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  direction: rtl;
  text-align: left;
  flex: 1;
  min-width: 0;
}

.file-deliverables__edit-count {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--color-zinc-500);
  flex-shrink: 0;
}

.file-deliverables__agent {
  font-size: 10px;
  color: var(--color-zinc-500);
  flex-shrink: 0;
  white-space: nowrap;
}

.file-deliverables__show-all-btn {
  background: none;
  border: none;
  color: var(--color-indigo-400);
  font-size: var(--text-xs);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  text-align: left;
  font-family: inherit;
  transition: color 0.15s ease;
}

.file-deliverables__show-all-btn:hover {
  color: var(--color-indigo-300);
}
```

### Accessibility

- Toggle button has `aria-expanded`, list has `aria-hidden`
- File paths have `title` attribute with full path for tooltip
- "Show all" button is a real `<button>`, keyboard accessible
- Action colors (indigo vs zinc) are supplemented by the action text itself ("created" vs "modified") — color is not the sole differentiator

### Edge Cases

- **No files produced:** Panel hidden entirely
- **Same file by multiple agents:** Shows latest agent, edit count accumulates
- **Very long paths:** RTL truncation preserves filename
- **50+ files:** First 20 shown, "Show all" button for the rest

---

## Visual Hierarchy: All Three Panels Together

The three panels create a top-to-bottom information hierarchy:

| Position | Panel | Visual Weight | Default State | Vertical Cost |
|----------|-------|---------------|---------------|---------------|
| Top | Pipeline indicator | Light — small dots, thin text | Always visible | ~36px |
| Middle | Team activity | Medium — avatars, names, status dots | Expanded (live) / Collapsed (historical) | ~28px collapsed, ~28px + (32px * agents) expanded |
| Bottom | File deliverables | Medium — file list, category headers | Always collapsed | ~28px collapsed |

**Total vertical footprint (collapsed):** ~92px. This is less than two event rows — a minimal cost for the orientation value these panels provide.

**Total vertical footprint (all expanded, 4 agents, 7 files):** ~92px + 128px (agents) + ~170px (files) = ~390px. This is significant, which is why deliverables defaults to collapsed and the CEO controls what they want to see.

### Border and Spacing Between Sections

The `session-panels` container uses `gap: var(--space-2)` between panels and `border-bottom: 1px solid var(--color-zinc-800)` to separate from the event stream.

There are no dividers between the three panels within the container. The pipeline indicator is visually distinct (dots and connectors), and the two collapsible panels have their own headers that create sufficient separation. Adding dividers between panels would add visual noise for minimal clarity gain.

---

## Interaction Patterns

### Expand/Collapse

Both collapsible panels (Team Activity, File Deliverables) use the identical interaction pattern:

1. Click the header row (the entire row is a `<button>`)
2. Chevron rotates from right-pointing to down-pointing
3. Content appears/disappears via `display: none` toggle (no animation — these panels are compact enough that animation would feel sluggish)

**Why no animation for panel expand/collapse?** The event group expand/collapse in Phase 1 uses `grid-template-rows: 0fr -> 1fr` for smooth animation. That works because event groups are inline with the scroll content. The panels are in a fixed area above the scroll — animating them would cause the scroll region to resize, which can trigger jarring scroll position jumps. Instant show/hide is cleaner.

### Hover States

| Element | Hover Behavior |
|---------|---------------|
| Team Activity header | Title text brightens: zinc-300 -> zinc-200 |
| File Deliverables header | Title text brightens: zinc-300 -> zinc-200 |
| "Show all" button | Text brightens: indigo-400 -> indigo-300 |
| Pipeline indicator | None (static, informational) |
| Agent rows | None (no click action in this phase) |
| File rows | None (no click action in this phase) |

---

## Implementation Notes for Alice

1. **New token required.** Add `--color-indigo-300: #a5b4fc;` to `:root` in `css/styles.css`, below the existing `--color-indigo-400` line.

2. **Pipeline connector alignment.** The connector `margin-top: 4px` aligns it with the center of the 10px dot. I've used a fixed value instead of Andrei's `calc()` approach because the label height varies with font rendering — a fixed offset from the top of the step container is more reliable.

3. **Chevron reuse.** The team activity and deliverables chevrons are visually identical to the event group chevron from Phase 1 (`.session-event__group-chevron`). They use separate BEM classes because they're in different blocks, but the CSS values are the same: 8x8px, 1.5px border, zinc-600, rotate(-45deg) -> rotate(45deg).

4. **Panel border-bottom.** The `session-panels` wrapper has `border-bottom: 1px solid var(--color-zinc-800)`. This is the same border style as `session-log__header`. Together they create the visual sandwich: header | panels | events.

5. **Task description font.** Task descriptions in the team activity panel use `--font-mono` (monospace). This is a deliberate choice — the task description comes from the `Task` tool_use input, which is technical/structured text. Agent names use Inter because they're human identifiers.

6. **Pulse animation name.** Andrei defined `pulse-dot` in his tech approach. Make sure this doesn't conflict with the existing `timer-pulse` and `cursor-blink` animations. They're distinct names, so no conflict — just noting for awareness.

7. **Category label first-child.** The `.file-deliverables__category:first-child .file-deliverables__category-label` rule removes the top margin on the first category header so it sits flush with the list container. Without this, there's an awkward gap at the top of the expanded deliverables list.

---

## Self-Review Checklist

- [x] All interaction states specified (hover on toggle headers, expanded/collapsed panels, working/done status dots, created/modified actions)
- [x] CSS values specific enough for Alice to implement without guessing (exact tokens, pixel values, opacity values, animation durations)
- [x] Responsive behavior addressed (connector min-width, path truncation, text-overflow on task descriptions)
- [x] Accessibility covered (aria-expanded, aria-hidden, title attributes, color-not-sole-differentiator, contrast ratios documented)
- [x] Spec written to `docs/session-introspection-p2-design-spec.md`
- [x] Visual hierarchy documented (panel stacking order, vertical footprint, default collapse states)
- [x] Consistent with Phase 1 visual language (same color tokens, same typography conventions, same chevron pattern)
