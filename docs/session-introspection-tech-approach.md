# Session Introspection — Technical Approach (Phase 1)

## Architecture Decision: Client-Side Parsing

**Decision:** All agent detection, event classification, and event grouping logic lives in `js/projects.js`. No changes to `server/src/session/runner.ts` or the `SessionEvent` schema.

**Rationale:**

1. **The data is already there.** The server emits `tool_use` events with full `input` objects. A `Task` tool_use already contains `input.name` (agent name) and `input.description` or `input.prompt`. A `SendMessage` tool_use contains `input.recipient`, `input.content`, and `input.type`. No server enrichment needed.

2. **Faster iteration.** Phase 1 is entirely a rendering concern — how events look, not what data they contain. Client-side parsing means Robert and Alice can iterate on presentation without server restarts or schema migrations.

3. **No event log format change.** The NDJSON event logs on disk remain unchanged. Historical sessions replay identically. If we later move parsing server-side (Phase 2), we can add optional annotation fields without breaking backward compatibility since `data: z.record(z.unknown())` already allows arbitrary fields.

4. **Simplicity.** The parsing is straightforward pattern matching on `event.data.tool` and `event.data.input`. It doesn't need server-side context or database lookups.

**When to reconsider:** If Phase 2 requires cross-event state that is expensive to reconstruct client-side (e.g., tracking which agents are alive based on spawn/shutdown sequences across thousands of events), move the state machine server-side and annotate events before emitting.

---

## Agent Name Registry

A hardcoded lookup table in `projects.js`, mirroring `.claude/agents/`:

```javascript
var AGENT_REGISTRY = {
  'pm':                { name: 'Thomas', role: 'Product Manager',        avatar: 'thomas' },
  'designer':          { name: 'Robert', role: 'Product Designer',       avatar: 'robert' },
  'arch':              { name: 'Andrei', role: 'Technical Architect',    avatar: 'andrei' },
  'fe':                { name: 'Alice',  role: 'Front-End Developer',    avatar: 'alice' },
  'be':                { name: 'Jonah',  role: 'Back-End Developer',     avatar: 'jonah' },
  'qa':                { name: 'Enzo',   role: 'QA Engineer',            avatar: 'enzo' },
  'marketer':          { name: 'Priya',  role: 'Product Marketer',       avatar: 'priya' },
  'market-researcher': { name: 'Suki',   role: 'Market Researcher',      avatar: 'suki' },
  'tech-researcher':   { name: 'Marco',  role: 'Technical Researcher',   avatar: 'marco' },
  'writer':            { name: 'Nadia',  role: 'Technical Writer',       avatar: 'nadia' },
  'analyst':           { name: 'Yuki',   role: 'Data Analyst',           avatar: 'yuki' },
  'ai-engineer':       { name: 'Kai',    role: 'AI Engineer',            avatar: 'kai' },
};
```

Avatar path pattern: `img/avatars/{avatar}.svg` — all 12 SVGs confirmed to exist.

Unknown agent names fall back to showing `input.name` as-is, with no avatar and a generic "Agent" role label.

---

## Event Classification

Every `tool_use` event gets classified as **high-signal** or **low-signal** based on the tool name. Additionally, certain tool names trigger **semantic rendering** — they render as specialized UI components instead of generic tool call rows.

### Semantic Events (special rendering)

| Tool Name | Render As | Data Extraction |
|-----------|-----------|-----------------|
| `Task` | **Agent spawn banner** | `input.name` -> agent lookup, `input.description` or `input.prompt` -> task summary (truncated to ~120 chars) |
| `SendMessage` | **Message card** | `input.type`, `input.recipient` -> agent lookup, `input.content` -> message body, `input.summary` -> preview text |
| `TeamCreate` | **Team lifecycle event** | Styled system-like event: "Team created" |
| `TeamDelete` | **Team lifecycle event** | Styled system-like event: "Team disbanded" |
| `TaskOutput` | **Waiting indicator** | `input.taskId` -> "Waiting for agent..." (resolve agent name from prior Task events if possible) |
| `TaskUpdate` | Hidden (low-signal) | Task status updates are internal bookkeeping |
| `TaskCreate` | Hidden (low-signal) | Task creation is internal bookkeeping |
| `TaskList` | Hidden (low-signal) | Task listing is internal bookkeeping |
| `TaskGet` | Hidden (low-signal) | Task reading is internal bookkeeping |

### High-Signal Events (always shown individually)

- `assistant_text` (unchanged from current rendering)
- `tool_use` where tool is: `Write`, `Edit`, `Bash`, `WebFetch`, `WebSearch`, `NotebookEdit`
- `system` events (unchanged)
- `error` events (unchanged)

### Low-Signal Events (grouped when consecutive)

- `tool_use` where tool is: `Read`, `Glob`, `Grep`
- `tool_result` for any low-signal tool (hidden inside groups)
- `tool_result` for semantic events (hidden — the semantic rendering is sufficient)

### Classification Logic

```javascript
var SEMANTIC_TOOLS = {
  'Task': true, 'SendMessage': true, 'TeamCreate': true,
  'TeamDelete': true, 'TaskOutput': true
};
var HIDDEN_TOOLS = {
  'TaskUpdate': true, 'TaskCreate': true, 'TaskList': true, 'TaskGet': true
};
var LOW_SIGNAL_TOOLS = { 'Read': true, 'Glob': true, 'Grep': true };

function classifyEvent(event) {
  if (event.type !== 'tool_use') return 'high';
  var tool = event.data.tool;
  if (SEMANTIC_TOOLS[tool]) return 'semantic';
  if (HIDDEN_TOOLS[tool]) return 'hidden';
  if (LOW_SIGNAL_TOOLS[tool]) return 'low';
  return 'high';
}
```

---

## Event Grouping Algorithm

Grouping happens incrementally in `appendSessionEvent()` as events stream in. This is the core change to the rendering pipeline.

### State

```javascript
var currentGroup = null;  // { tools: [], element: HTMLElement } or null
```

### Logic

When a new event arrives:

1. **Classify** the event.
2. If `hidden` — skip rendering entirely (do not append to DOM). Still push to `sessionEvents` array for history.
3. If `low` — check if `currentGroup` exists:
   - **Yes:** append to group, update summary text (e.g., "Read 3 files, searched 2 patterns")
   - **No:** start a new group. Don't render a group element yet — wait for a second low-signal event. Buffer the first one.
4. If `semantic` or `high` — flush any pending group (render the buffered group element), then render the event.
5. **Special case:** if only 1 low-signal event was buffered when the group flushes, render it as a normal event (no unnecessary group wrapper for a single item).

### tool_result Handling

- `tool_result` events where the preceding `tool_use` was low-signal: absorbed into the group (not rendered separately).
- `tool_result` events where the preceding `tool_use` was semantic: hidden (the semantic rendering replaces them).
- `tool_result` events for high-signal tools: rendered as collapsible results (current behavior, unchanged).

To track this, maintain `lastToolClassification` alongside the existing `lastToolName`.

### Group Summary Text

Count tool types within the group and format:

```javascript
function formatGroupSummary(tools) {
  var reads = 0, globs = 0, greps = 0;
  for (var i = 0; i < tools.length; i++) {
    if (tools[i] === 'Read') reads++;
    else if (tools[i] === 'Glob') globs++;
    else if (tools[i] === 'Grep') greps++;
  }
  var parts = [];
  if (reads > 0) parts.push('Read ' + reads + ' file' + (reads !== 1 ? 's' : ''));
  if (globs > 0) parts.push(globs + ' glob search' + (globs !== 1 ? 'es' : ''));
  if (greps > 0) parts.push(greps + ' grep search' + (greps !== 1 ? 'es' : ''));
  return parts.join(', ');
}
```

---

## Rendering Changes to `projects.js`

### New Render Functions

These are the new functions Alice will implement. They replace or augment the existing `renderSessionEvent()` dispatch.

#### 1. `renderAgentBanner(event, timeStr)`

Rendered when `tool === 'Task'` and `input.name` matches a known agent.

**HTML structure:**

```html
<div class="session-event session-event--agent-spawn" data-event-id="42">
  <span class="session-event__time">+1:23</span>
  <div class="session-event__body">
    <img class="session-event__agent-avatar" src="img/avatars/thomas.svg" alt="Thomas" width="28" height="28">
    <div class="session-event__agent-info">
      <span class="session-event__agent-name">Thomas</span>
      <span class="session-event__agent-role">Product Manager</span>
    </div>
    <span class="session-event__agent-task">Scoping requirements for session introspection...</span>
  </div>
</div>
```

**Data extraction:**
- Agent name: `event.data.input.name` -> look up in `AGENT_REGISTRY`
- Task description: `event.data.input.description || event.data.input.prompt` — truncate to 120 chars

#### 2. `renderMessageCard(event, timeStr)`

Rendered when `tool === 'SendMessage'`.

**HTML structure:**

```html
<div class="session-event session-event--message" data-event-id="87">
  <span class="session-event__time">+3:45</span>
  <div class="session-event__body">
    <div class="session-event__message-header">
      <img class="session-event__message-avatar" src="img/avatars/thomas.svg" alt="Thomas" width="20" height="20">
      <span class="session-event__message-sender">Thomas</span>
      <span class="session-event__message-arrow">-></span>
      <span class="session-event__message-recipient">Andrei</span>
    </div>
    <p class="session-event__message-content">Define the technical approach for Phase 1...</p>
  </div>
</div>
```

**Data extraction:**
- Sender: inferred from context (the agent that made the tool call — use the most recent agent spawn). For Phase 1, we can show "Team Lead" as default sender if no agent context is available.
- Recipient: `event.data.input.recipient` -> look up in `AGENT_REGISTRY`
- Content: `event.data.input.content` — truncate to 200 chars. If `input.summary` exists, use that as a shorter preview.

#### 3. `renderTeamLifecycle(event, timeStr)`

Rendered when `tool === 'TeamCreate'` or `tool === 'TeamDelete'`.

**HTML structure:**

```html
<div class="session-event session-event--lifecycle" data-event-id="2">
  <span class="session-event__time">+0:05</span>
  <div class="session-event__body">
    <span class="session-event__lifecycle-text">Team created</span>
  </div>
</div>
```

Styled similarly to `session-event--system` but with a distinct icon/color to differentiate.

#### 4. `renderWaitingIndicator(event, timeStr)`

Rendered when `tool === 'TaskOutput'`.

**HTML structure:**

```html
<div class="session-event session-event--waiting" data-event-id="95">
  <span class="session-event__time">+4:12</span>
  <div class="session-event__body">
    <span class="session-event__waiting-text">Waiting for Thomas...</span>
    <span class="session-event__waiting-spinner"></span>
  </div>
</div>
```

Agent name resolution: look at `input.taskId` and cross-reference with previous `Task` events to find the agent name. If not resolvable, show "Waiting for agent...".

#### 5. `renderEventGroup(tools, events)`

Rendered when a low-signal group is flushed.

**HTML structure:**

```html
<div class="session-event session-event--group" data-event-id="50">
  <span class="session-event__time">+2:10</span>
  <div class="session-event__body">
    <button class="session-event__group-toggle" type="button" aria-expanded="false">
      <span class="session-event__group-chevron" aria-hidden="true"></span>
      <span class="session-event__group-icon" aria-hidden="true"></span>
      <span class="session-event__group-summary">Read 5 files, 2 grep searches</span>
    </button>
    <div class="session-event__group-content" aria-hidden="true">
      <!-- Individual event rows go here when expanded -->
    </div>
  </div>
</div>
```

Expand/collapse follows the same pattern as `tool_result` toggle (click handler on delegated listener, toggle `aria-expanded`/`aria-hidden`).

### Modified `renderSessionEvent()`

The existing switch statement in `renderSessionEvent()` adds a pre-check:

```javascript
function renderSessionEvent(event) {
  var timeStr = formatRelativeSessionTime(event.timestamp);

  // Semantic tool_use events get special rendering
  if (event.type === 'tool_use') {
    var tool = event.data.tool;
    if (tool === 'Task') return renderAgentBanner(event, timeStr);
    if (tool === 'SendMessage') return renderMessageCard(event, timeStr);
    if (tool === 'TeamCreate' || tool === 'TeamDelete') return renderTeamLifecycle(event, timeStr);
    if (tool === 'TaskOutput') return renderWaitingIndicator(event, timeStr);
    if (HIDDEN_TOOLS[tool]) return '';  // Don't render
  }

  // Existing switch for standard events
  switch (event.type) { /* ... unchanged ... */ }
}
```

### Modified `appendSessionEvent()`

This function gets the grouping logic. The changes are:

1. Before appending, classify the event.
2. If low-signal, buffer into `currentGroup`.
3. If high-signal or semantic, flush group first, then append.
4. The `tool_result` handler checks `lastToolClassification` to decide whether to render or suppress.

### Modified `getToolInputSummary()`

Add cases for the new semantic tools:

```javascript
case 'Task':
  return input.name ? ('Spawning ' + (AGENT_REGISTRY[input.name]?.name || input.name)) : '';
case 'SendMessage':
  return input.summary || (input.recipient ? ('Message to ' + input.recipient) : '');
```

---

## Active Agent Tracking

To show the sender on `SendMessage` events and resolve `TaskOutput` agents, track active agents as events stream:

```javascript
var activeAgents = {};  // taskId -> agentSlug (e.g., 'pm')
var currentAgent = null;  // Most recently spawned agent slug
```

When a `Task` tool_use is detected with a known agent name:
- Set `currentAgent = input.name`
- When the corresponding `tool_result` arrives, extract the task ID if available and store: `activeAgents[taskId] = input.name`

When a `TaskOutput` tool_use is detected:
- Look up `activeAgents[input.taskId]` to resolve the agent name

This is lightweight state that resets when the session log reloads.

---

## CSS Changes

All new styles go in the existing `/* Session Events */` section of `css/styles.css`. Key additions:

### Agent Spawn Banner

```css
.session-event--agent-spawn {
  padding: var(--space-3) var(--space-4);
  background: rgba(99, 102, 241, 0.06);
  border-left: 3px solid var(--color-indigo-400);
  margin: var(--space-2) 0;
}

.session-event__agent-avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  margin-right: var(--space-3);
  flex-shrink: 0;
}

.session-event__agent-info {
  display: flex;
  flex-direction: column;
  margin-right: var(--space-3);
  flex-shrink: 0;
}

.session-event__agent-name {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-200);
}

.session-event__agent-role {
  font-size: var(--text-xs);
  color: var(--color-zinc-400);
}

.session-event__agent-task {
  font-size: var(--text-sm);
  color: var(--color-zinc-400);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### Message Card

```css
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
  border-radius: 4px;
}

.session-event__message-sender,
.session-event__message-recipient {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-300);
}

.session-event__message-arrow {
  font-size: var(--text-xs);
  color: var(--color-zinc-600);
}

.session-event__message-content {
  font-size: var(--text-sm);
  color: var(--color-zinc-400);
  line-height: var(--leading-relaxed);
  margin: 0;
  padding-left: 28px; /* align with text after avatar */
}
```

### Event Group

```css
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

.session-event__group-chevron {
  /* Same chevron pattern as tool_result */
}

.session-event__group-summary {
  font-size: var(--text-sm);
  color: var(--color-zinc-400);
}

.session-event__group-content {
  display: none;
  padding-top: var(--space-2);
}

.session-event__group-content[aria-hidden="false"] {
  display: block;
}
```

### Lifecycle and Waiting

```css
.session-event--lifecycle {
  padding: var(--space-2) var(--space-4);
}

.session-event__lifecycle-text {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-zinc-400);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

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
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## Implementation Plan for Alice

### Step 1: Add the agent registry and classification constants

Add `AGENT_REGISTRY`, `SEMANTIC_TOOLS`, `HIDDEN_TOOLS`, `LOW_SIGNAL_TOOLS`, and `classifyEvent()` to the top of the IIFE in `projects.js`.

### Step 2: Implement semantic render functions

Write `renderAgentBanner()`, `renderMessageCard()`, `renderTeamLifecycle()`, `renderWaitingIndicator()`, and `renderEventGroup()`.

### Step 3: Modify `renderSessionEvent()` dispatch

Add the semantic tool_use pre-check before the existing switch statement.

### Step 4: Modify `appendSessionEvent()` for grouping

Add `currentGroup`, `lastToolClassification`, and the buffering/flushing logic.

### Step 5: Add CSS

Add all new CSS classes to the Session Events section of `styles.css`.

### Step 6: Update delegated click handler

Add expand/collapse handler for `.session-event__group-toggle` (same pattern as the existing `.session-event__result-toggle`).

---

## Files Changed

| File | Change |
|------|--------|
| `js/projects.js` | Agent registry, event classification, 5 new render functions, modified `appendSessionEvent()` and `renderSessionEvent()`, active agent tracking |
| `css/styles.css` | New styles for agent-spawn, message, lifecycle, waiting, and group event types |

No server changes. No new files. No new dependencies.

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Event grouping breaks live streaming | Medium | Buffer carefully — never render a group until a second event confirms it. Single-event groups render normally. |
| `Task` tool_use `input` schema changes in future Claude CLI versions | Low | The extraction logic is defensive — `input.name`, `input.description`, `input.prompt` are all checked with fallbacks. Unknown tools fall through to default rendering. |
| Large sessions (thousands of events) cause group state bugs | Low | Group state resets on session reconnect. `MAX_RENDERED_EVENTS` (500) already limits DOM size; grouping reduces it further. |
| Historical sessions have different event formats | Low | Classification defaults to `high` for unknown tools — they render normally. No data is hidden unless explicitly classified. |

---

## What Robert Needs to Know

1. **Agent banner** is the highest-impact visual element. It needs to stand out from the tool_use rows but not overwhelm the log. The left border + subtle background works well with the existing dark theme.
2. **Message cards** should feel conversational — more like chat bubbles than tool calls. The sender/recipient header + content body pattern is the recommendation but Robert may want to explore alternatives.
3. **Event groups** are subtle — they're collapsible summaries that reduce noise. They should feel like a compressed version of the events, not a new UI paradigm. A count badge and summary text is probably sufficient.
4. **Color palette** should stay within existing zinc/indigo tokens. No new colors needed. The agent-spawn banner uses indigo-400 as the accent, matching tool_use highlighting.
5. **Avatar sizes**: 28px for agent banners (prominent), 20px for message cards (compact). Both use the existing SVGs, which are vector and scale cleanly.

## What Enzo Needs to Know

1. **Test with real session data** — the `data/sessions/` directory should have event logs from previous sessions. Replay them through the UI.
2. **Key scenarios to validate:**
   - Session with multiple agent spawns (verify banners appear for each)
   - Session with SendMessage events (verify message cards render correctly)
   - Session with long runs of Read/Glob/Grep (verify grouping collapses them)
   - Session with a single Read event between two high-signal events (verify it renders normally, not as a group)
   - Unknown tool names (verify they fall through to default rendering)
   - Historical session replay (verify all events render, nothing crashes)
3. **Acceptance criteria are in the requirements doc** — `docs/session-introspection-requirements.md`, Features 1.1 and 1.2.
