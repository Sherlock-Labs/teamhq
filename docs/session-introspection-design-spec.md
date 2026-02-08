# Session Introspection — Design Spec (Phase 1)

**Author:** Robert (Product Designer)
**Inputs:** Thomas's requirements, Andrei's tech approach, existing `css/styles.css` design system

---

## Design Principles for This Feature

1. **The log is a timeline, not a dashboard.** Every new element must feel like it belongs in a vertical stream of events. No floating panels, no sidebars, no layout shifts.
2. **Signal over noise.** The whole point is to elevate what matters and compress what doesn't. Every visual decision should increase the signal-to-noise ratio.
3. **Continuity with the existing system.** New elements use the same spacing scale, type scale, color tokens, and BEM naming conventions already in `styles.css`. Nothing looks "added on."
4. **Pixel art avatars are the star.** These 16x16 SVGs are charming and distinctive. Give them enough space to read clearly but don't blow them up so large they dominate.

---

## 1. Agent Spawn Banner

**Purpose:** Mark the moment an agent enters the session. This is the highest-impact new element — it breaks up the log into legible sections by showing who is working.

### Layout

```
+-----------------------------------------------------------------------+
| +0:42  [avatar]  Thomas                Scoping requirements for...    |
|                  Product Manager                                       |
+-----------------------------------------------------------------------+
```

- Full-width row within the session log events container
- Left edge: 3px solid `--color-indigo-400` border (matches the indigo accent throughout the UI)
- Background: `rgba(99, 102, 241, 0.06)` — a barely-there indigo wash that distinguishes it from tool_use rows (which use 0.04 opacity)
- The row uses the same flex layout as all session events: time stamp on the left, body on the right

### Component Structure

The body uses a horizontal flex layout:

| Element | Size | Treatment |
|---------|------|-----------|
| Avatar | 28x28px | `border-radius: 4px` (matches `--radius-sm`). Inline `<img>` with `alt` text. No border, no shadow — the pixel art has strong enough edges. |
| Name + Role (stacked) | Auto | Name on top, role below. Stacked with `flex-direction: column`. Fixed width of roughly 140px to keep alignment clean across different name lengths. |
| Task description | Remaining space | Single line, truncated with ellipsis. This is secondary information — a glance tells you what the agent was asked to do. |

### Typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Agent name | `--font-family` (Inter) | `--text-sm` (14px) | `--font-weight-semibold` (600) | `--color-zinc-200` |
| Agent role | `--font-family` (Inter) | `--text-xs` (12px) | `--font-weight-normal` (400) | `--color-zinc-400` |
| Task description | `--font-family` (Inter) | `--text-sm` (14px) | `--font-weight-normal` (400) | `--color-zinc-400` |
| Timestamp | `--font-mono` | 11px | Normal | `--color-zinc-600` |

**Design note:** The agent name and role use the system font (Inter), not monospace. This is intentional — it signals "this is a person, not a tool call." Every other event in the log uses `--font-mono`; the agent banner breaking that pattern is what makes it stand out.

### Spacing

- Padding: `--space-3` (12px) vertical, `--space-4` (16px) horizontal
- Avatar margin-right: `--space-3` (12px)
- Name/role stack margin-right: `--space-3` (12px)
- Vertical margin: `--space-2` (8px) above and below — gives the banner breathing room from adjacent events

### States

- **Default:** As described above
- **Unknown agent:** No avatar image. Show the raw `input.name` as the name, "Agent" as the role. No indigo border — use `--color-zinc-700` border instead to signal "unrecognized."

### Accessibility

- Avatar `<img>` has `alt="{Agent Name}"`
- The banner is a non-interactive `<div>` — no focus target needed
- Color contrast: zinc-200 on zinc-950 bg passes WCAG AA (ratio ~15:1). zinc-400 on zinc-950 passes AA (ratio ~5.5:1).

---

## 2. Message Card (SendMessage Events)

**Purpose:** Show inter-agent communication as a readable message, not a raw tool call. This is the "conversation" layer of the session log.

### Layout

```
+-----------------------------------------------------------------------+
| +3:45  [avatar] Thomas -> Andrei                                      |
|                 Define the technical approach for Phase 1. Focus on... |
+-----------------------------------------------------------------------+
```

- No background fill — messages should feel lighter than agent spawns. They're frequent events that shouldn't create visual weight.
- No border-left — that's reserved for agent spawns and system events.

### Component Structure

**Header row** (flex, horizontal):

| Element | Size | Treatment |
|---------|------|-----------|
| Sender avatar | 20x20px | `border-radius: 3px`. Smaller than the spawn banner — this is a compact reference, not an introduction. |
| Sender name | Auto | Semibold, zinc-300 |
| Arrow | Auto | The literal text `->` in monospace. Simple, readable, no ambiguity. Colored `--color-zinc-600` so it recedes. |
| Recipient name | Auto | Semibold, zinc-300 |

**Content area** (below header):

- Message text, left-aligned under the sender name (indented past the avatar)
- Single paragraph, no markdown rendering — plain text only for Phase 1
- Truncated to 200 characters with ellipsis if longer. Full text is not expandable in Phase 1 — keep it simple.

### Typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Sender name | `--font-family` | `--text-xs` (12px) | `--font-weight-semibold` (600) | `--color-zinc-300` |
| Arrow (`->`) | `--font-mono` | `--text-xs` (12px) | Normal | `--color-zinc-600` |
| Recipient name | `--font-family` | `--text-xs` (12px) | `--font-weight-semibold` (600) | `--color-zinc-300` |
| Message content | `--font-family` | `--text-sm` (14px) | Normal | `--color-zinc-400` |

### Spacing

- Padding: `--space-2` (8px) vertical, `--space-4` (16px) horizontal
- Header gap between elements: `--space-2` (8px)
- Content `padding-left: 28px` — aligns text start with the position after the 20px avatar + 8px gap
- Content `margin-top`: `--space-1` (4px) — tight coupling between header and body

### Sender Resolution

- The sender is the most recently spawned agent (tracked by `currentAgent` in Andrei's approach). If no agent context exists, show "Team Lead" as the sender with no avatar.
- Recipient is resolved from `input.recipient` via the agent registry. Unknown recipients show the raw name.

### States

- **Default:** As described
- **Broadcast messages** (`input.type === 'broadcast'`): Replace the recipient name with "all" in zinc-500 italic. This distinguishes broadcasts from direct messages.

---

## 3. Event Group (Collapsed Low-Signal Events)

**Purpose:** Collapse sequences of Read/Glob/Grep calls into a single compact row. This is the noise reduction mechanism.

### Layout

```
+-----------------------------------------------------------------------+
| +2:10  > Read 5 files, 2 grep searches                               |
+-----------------------------------------------------------------------+
```

Expanded:

```
+-----------------------------------------------------------------------+
| +2:10  v Read 5 files, 2 grep searches                               |
|          Read  /docs/session-requirements.md                          |
|          Read  /css/styles.css                                        |
|          Read  /js/projects.js                                        |
|          Grep  renderSessionEvent                                     |
|          Read  /img/avatars/thomas.svg                                |
|          Read  /docs/session-tech-approach.md                         |
|          Grep  session-log                                            |
+-----------------------------------------------------------------------+
```

### Visual Treatment

- Background: `rgba(63, 63, 70, 0.15)` — a subtle zinc wash. Lighter than the indigo wash on agent spawns. This signals "compressed content" without demanding attention.
- Border-radius: `--radius-sm` (6px)
- Horizontal margin: `--space-4` (16px) on left and right — this slight inset from the normal event stream visually communicates "this is a group, not a primary event"
- No border-left accent — groups are deliberately understated

### Toggle Button

The toggle uses the same interaction pattern as the existing `tool_result` chevron:

| Element | Treatment |
|---------|-----------|
| Chevron | 8x8px, `--color-zinc-600` borders, rotates from `-45deg` (collapsed, pointing right) to `45deg` (expanded, pointing down). Transition: `transform 0.2s ease`. |
| Summary text | Monospace, `--text-sm`, `--color-zinc-400` |

The toggle is a `<button>` with `aria-expanded` and controls a content `<div>` with `aria-hidden`.

### Summary Text Format

Format is generated by counting tool types:

- "Read 5 files" (only reads)
- "3 grep searches" (only greps)
- "Read 3 files, 2 grep searches" (mixed)
- "2 glob searches, Read 1 file" (mixed)

Use natural language order: Read first, then glob, then grep. Pluralize correctly ("1 file" vs "5 files", "1 grep search" vs "3 grep searches").

### Expanded Content

When expanded, the group reveals the individual events rendered in their normal `tool_use` format — the same indigo-tinted rows with tool icon, tool name, and input summary that already exist. These are literally the same `renderToolUseEvent()` output, nested inside the group content area.

Expanded content spacing:
- `padding-top: --space-2` (8px) above the first expanded event
- No extra padding on individual events — they use their standard `session-event--tool-use` padding

### Animation

- Use the same `grid-template-rows: 0fr -> 1fr` transition that `tool_result` uses for its expand/collapse. This is already proven in the codebase (see `session-event__result-content` in styles.css).
- Chevron rotation: `transform 0.2s ease` (matches existing)

### Edge Case: Single Event

If only 1 low-signal event was buffered when the group flushes (because a high-signal event arrived right after), render it as a normal `tool_use` row — no group wrapper. Grouping a single event adds visual complexity for zero noise reduction.

---

## 4. Team Lifecycle Events (TeamCreate / TeamDelete)

**Purpose:** Mark when a team is created or disbanded. These are structural moments in the session.

### Layout

```
+-----------------------------------------------------------------------+
| +0:05        TEAM CREATED                                             |
+-----------------------------------------------------------------------+
```

```
+-----------------------------------------------------------------------+
| +12:45       TEAM DISBANDED                                           |
+-----------------------------------------------------------------------+
```

### Visual Treatment

- Same structure as system events: timestamp + body with a left border
- Left border: 2px solid `--color-indigo-400` — uses the project's accent color to distinguish from system events (which use `--color-zinc-700`)
- No background fill
- Text is uppercase, letter-spaced, monospace — matches the session log header style (`session-log__title`)

### Typography

| Element | Font | Size | Weight | Color | Other |
|---------|------|------|--------|-------|-------|
| Lifecycle text | `--font-mono` | `--text-xs` (12px) | `--font-weight-medium` (500) | `--color-indigo-400` | `text-transform: uppercase; letter-spacing: 0.05em` |

### Why Indigo Instead of Zinc

System events (`session-event--system`) use a zinc-700 border and zinc-500 text — they're intentionally muted. Team lifecycle events mark important structural boundaries (the team starting and ending work). The indigo accent gives them just enough prominence to be noticed when scanning the log, without the full visual weight of an agent spawn banner.

### TeamDelete Variant

Same treatment as TeamCreate. The text reads "Team disbanded" (not "Team deleted" — "disbanded" is more human and matches the team metaphor).

---

## 5. Waiting Indicator (TaskOutput Events)

**Purpose:** Show when the lead is waiting for an agent to complete their work. This fills the gap between an agent spawn and the next event.

### Layout

```
+-----------------------------------------------------------------------+
| +4:12        Waiting for Thomas...                                    |
+-----------------------------------------------------------------------+
```

### Visual Treatment

- Minimal: no background, no border
- An animated spinner (12x12px) sits to the right of the text, only visible during live sessions
- The text is italic — conventionally signals a transient or pending state

### Typography

| Element | Font | Size | Weight | Color | Other |
|---------|------|------|--------|-------|-------|
| Waiting text | `--font-family` (Inter) | `--text-sm` (14px) | Normal | `--color-zinc-400` | `font-style: italic` |

### Spinner

- 12x12px circle
- 2px border: `--color-zinc-600` on three sides, `--color-indigo-400` on the top (the "moving" segment)
- `animation: spin 1s linear infinite`
- For historical (completed) sessions: hide the spinner. The text alone is sufficient — showing a perpetually spinning indicator for a completed session is misleading.

### Agent Name Resolution

Andrei's approach tracks `activeAgents` (a map of taskId to agent slug). When a `TaskOutput` event arrives, look up `input.taskId` in this map, then resolve the agent name from the registry.

Fallback: If the taskId doesn't resolve to a known agent, show "Waiting for agent..." (generic).

---

## 6. Visual Hierarchy Summary

How all event types stack in the log, ordered from most prominent to least:

| Rank | Event Type | Visual Weight | Why |
|------|-----------|---------------|-----|
| 1 | Agent spawn banner | Highest — indigo border, background wash, avatar, name | Structural boundary. Answers "who is working?" |
| 2 | Team lifecycle | Medium-high — indigo border, uppercase text | Structural boundary. Answers "is the team active?" |
| 3 | Message card | Medium — avatar, sender/recipient, message text | Content. Answers "what are agents telling each other?" |
| 4 | Write/Edit/Bash (high-signal tool_use) | Medium — indigo background wash, tool icon | Action. Answers "what changed?" |
| 5 | assistant_text | Medium-low — plain monospace text | Thinking. Context for actions. |
| 6 | System events | Low — muted zinc border and text | Bookkeeping. |
| 7 | Waiting indicator | Low — italic text, small spinner | Transient state. |
| 8 | Event group (collapsed) | Lowest — subtle zinc wash, compact summary | Noise reduced to signal. |

---

## 7. Integration with Existing Log

### What Changes

- `tool_use` events for `Task`, `SendMessage`, `TeamCreate`, `TeamDelete`, `TaskOutput` render as their new semantic components instead of generic tool rows
- `tool_use` events for `TaskUpdate`, `TaskCreate`, `TaskList`, `TaskGet` are hidden entirely (internal bookkeeping, zero user value)
- Consecutive `Read`/`Glob`/`Grep` events collapse into groups
- `tool_result` events for semantic and hidden tools are suppressed
- `tool_result` events for grouped tools are absorbed into the group (shown only when expanded)

### What Stays the Same

- `assistant_text` rendering (including streaming cursor) is unchanged
- `Write`, `Edit`, `Bash`, `WebFetch`, `WebSearch` tool_use events render as they do today
- `tool_result` events for high-signal tools keep their current collapsible output treatment
- `system` and `error` events are unchanged
- The session log container, header, timer, jump-to-latest button, and auto-scroll behavior are unchanged
- The timestamp column width (48px min-width, right-aligned) is unchanged across all event types

---

## 8. Responsive Behavior

The session log is already inside an expandable project card with constrained width. No special responsive handling is needed for Phase 1. Notes for awareness:

- **Agent spawn banner:** On narrow viewports (<480px), the task description will truncate via `text-overflow: ellipsis`. The avatar + name + role should always be visible.
- **Message card:** Content truncation at 200 chars handles long messages. On very narrow viewports the sender -> recipient header wraps naturally since it's flex.
- **Event groups:** The summary text is a single line and truncates naturally.

---

## 9. Complete CSS Spec

All styles use BEM naming under the existing `.session-event` block. They go in the `/* Session Events (shared) */` section of `css/styles.css`, after the existing error event styles.

### Agent Spawn Banner

```css
/* Event: agent spawn */

.session-event--agent-spawn {
  padding: var(--space-3) var(--space-4);
  background: rgba(99, 102, 241, 0.06);
  border-left: 3px solid var(--color-indigo-400);
  margin: var(--space-2) 0;
}

.session-event--agent-spawn .session-event__body {
  display: flex;
  align-items: center;
}

.session-event__agent-avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  margin-right: var(--space-3);
  flex-shrink: 0;
  image-rendering: pixelated;
}

.session-event__agent-info {
  display: flex;
  flex-direction: column;
  margin-right: var(--space-3);
  flex-shrink: 0;
  min-width: 120px;
}

.session-event__agent-name {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-200);
  line-height: var(--leading-tight);
}

.session-event__agent-role {
  font-size: var(--text-xs);
  color: var(--color-zinc-400);
  line-height: var(--leading-tight);
}

.session-event__agent-task {
  font-size: var(--text-sm);
  color: var(--color-zinc-400);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Unknown agent fallback */
.session-event--agent-spawn.session-event--agent-unknown {
  border-left-color: var(--color-zinc-700);
}
```

**Note on `image-rendering: pixelated`:** The avatar SVGs are 16x16 pixel art rendered at 28x28px. Without `pixelated`, the browser applies bilinear filtering which blurs the pixel edges. With `pixelated`, the crisp pixel boundaries are preserved. Since these are SVGs (vector), the browser will re-rasterize at the target size — the `pixelated` hint ensures it snaps to the pixel grid rather than smoothing.

### Message Card

```css
/* Event: message (SendMessage) */

.session-event--message {
  padding: var(--space-2) var(--space-4);
  margin: var(--space-1) 0;
}

.session-event__message-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.session-event__message-avatar {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  flex-shrink: 0;
  image-rendering: pixelated;
}

.session-event__message-sender,
.session-event__message-recipient {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-300);
}

.session-event__message-arrow {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-zinc-600);
}

.session-event__message-content {
  font-size: var(--text-sm);
  color: var(--color-zinc-400);
  line-height: var(--leading-relaxed);
  margin: 0;
  padding-left: 28px;
}

/* Broadcast variant */
.session-event__message-recipient--broadcast {
  color: var(--color-zinc-500);
  font-style: italic;
  font-weight: var(--font-weight-normal);
}
```

### Event Group

```css
/* Event: grouped low-signal events */

.session-event--group {
  padding: var(--space-1) var(--space-4);
  background: rgba(63, 63, 70, 0.15);
  border-radius: var(--radius-sm);
  margin: var(--space-1) var(--space-4);
}

.session-event__group-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: inherit;
  font-family: var(--font-mono);
}

.session-event__group-toggle:hover .session-event__group-summary {
  color: var(--color-zinc-300);
}

.session-event__group-chevron {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-right: 1.5px solid var(--color-zinc-600);
  border-bottom: 1.5px solid var(--color-zinc-600);
  transform: rotate(-45deg);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.session-event__group-toggle[aria-expanded="true"] .session-event__group-chevron {
  transform: rotate(45deg);
}

.session-event__group-summary {
  font-size: var(--text-sm);
  color: var(--color-zinc-400);
  transition: color 0.15s ease;
}

.session-event__group-content {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.2s ease;
}

.session-event__group-content[aria-hidden="false"] {
  grid-template-rows: 1fr;
}

.session-event__group-content > div {
  overflow: hidden;
}
```

### Team Lifecycle

```css
/* Event: team lifecycle (TeamCreate/TeamDelete) */

.session-event--lifecycle {
  padding: var(--space-2) var(--space-4);
}

.session-event--lifecycle .session-event__body {
  border-left: 2px solid var(--color-indigo-400);
  padding-left: var(--space-3);
}

.session-event__lifecycle-text {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-indigo-400);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

### Waiting Indicator

```css
/* Event: waiting (TaskOutput) */

.session-event--waiting .session-event__body {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.session-event__waiting-text {
  font-size: var(--text-sm);
  color: var(--color-zinc-400);
  font-style: italic;
}

.session-event__waiting-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--color-zinc-600);
  border-top-color: var(--color-indigo-400);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Hide spinner for historical sessions */
.session-log[data-session-status="completed"] .session-event__waiting-spinner {
  display: none;
}
```

---

## 10. Implementation Notes for Alice

### Rendering Order in renderSessionEvent()

Before the existing `switch (event.type)`, add a pre-check for semantic tool_use events. Andrei's tech approach specifies the exact dispatch order. The key visual implication: semantic events completely replace the generic tool_use rendering — there's no "tool icon + tool name" for these events.

### Avatar Loading

Avatars are inline `<img>` tags, not CSS backgrounds. This is correct for accessibility (`alt` text) and because the SVGs are tiny (<1KB). They'll load instantly from cache after the first render. No lazy loading needed.

### Hover State on Event Groups

The group toggle button gets a hover state (summary text brightens from zinc-400 to zinc-300). This uses the same subtle approach as the existing result toggle — no background change on hover, just a text color shift.

### Click Handler Delegation

The group toggle uses the same delegated click handler pattern as the existing `.session-event__result-toggle`. Add it to the same listener on `listContainer`:

```javascript
var groupToggle = e.target.closest('.session-event__group-toggle');
if (groupToggle) {
  var isExpanded = groupToggle.getAttribute('aria-expanded') === 'true';
  groupToggle.setAttribute('aria-expanded', !isExpanded);
  var content = groupToggle.nextElementSibling;
  if (content) {
    content.setAttribute('aria-hidden', isExpanded);
  }
}
```

### No Sticky Agent Banner

Thomas's requirements mention "persists at the top of the log" as an option for the active agent indicator. For Phase 1, I recommend against a sticky banner. Reasons:

1. It adds layout complexity (sticky positioning inside the scrollable log body)
2. The inline agent spawn banners already serve as clear section dividers
3. A sticky element would cover log content as users scroll
4. Phase 2's team dashboard will provide persistent agent status

The inline banner is sufficient for Phase 1. If users want to know who's active, they scroll up to the most recent agent spawn — which is always visible in the viewport for live sessions (auto-scroll keeps the log at the bottom where new events appear).

---

## Self-Review Checklist

- [x] All interaction states specified (hover on group toggle, expanded/collapsed groups, streaming vs completed waiting spinner)
- [x] CSS values specific enough for Alice to implement without guessing (exact tokens, pixel values, opacity values)
- [x] Responsive behavior addressed (truncation handles narrow viewports)
- [x] Accessibility covered (aria-expanded, aria-hidden, alt text, color contrast ratios, keyboard-focusable toggle buttons)
- [x] Spec written to `docs/session-introspection-design-spec.md`
