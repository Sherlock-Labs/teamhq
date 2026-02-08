# Session Introspection Phase 2-3 — Technical Approach

**Author:** Andrei (Technical Architect)
**Date:** 2026-02-07
**Depends on:** Phase 1 tech approach (`docs/session-introspection-tech-approach.md`) — shipped
**Scope:** Pipeline phase indicator, team activity panel, file deliverables panel

---

## Architecture Decision: Incremental Panels Above the Event Stream

**Decision:** All three panels (phase indicator, team activity, deliverables) are rendered as static DOM sections inside `renderSessionLog()`, positioned above the `session-log__events` container. State is tracked incrementally in `appendSessionEvent()` using the same pattern as the existing `activeAgents` and `currentAgent` variables. No backend changes.

**Rationale:**

1. **Rendering once, updating incrementally.** The panel DOM shells are created when `renderSessionLog()` runs (on session connect). As events stream in, `appendSessionEvent()` updates panel state variables and calls lightweight update functions that mutate specific DOM elements — never re-rendering the entire panel.

2. **Same state lifecycle as existing tracking.** `activeAgents`, `currentAgent`, and `currentGroup` already reset in `disconnectSession()`. The new state variables follow the same pattern: initialize on connect, update on events, reset on disconnect. No new lifecycle to manage.

3. **No layout thrashing from auto-scroll.** The panels sit above the scrollable `session-log__body` div. They have fixed or bounded height and don't participate in the scroll region. When a panel element updates (e.g., a new agent row appears), the event stream below is not reflowed — the panels are outside the scroll container.

---

## State Model Extensions

### New State Variables

Add these alongside the existing agent tracking state (line ~112 in `projects.js`):

```javascript
// Pipeline phase tracking
var pipelinePhase = null;  // Current phase slug: 'research'|'scoping'|'architecture'|'design'|'implementation'|'qa'|null
var completedPhases = {};  // { 'research': true, 'scoping': true, ... } — phases that have been entered

// Team activity tracking
var teamAgents = [];  // Ordered list of { slug, status, taskDescription, spawnTime }
var teamAgentIndex = {};  // slug -> index in teamAgents (for dedup and status updates)

// File deliverables tracking
var deliverableFiles = {};  // filePath -> { path, displayPath, action, agent, agentName, time, editCount, category }
var deliverableOrder = [];  // filePaths in order of first appearance (for stable ordering within categories)
```

### Phase Mapping

```javascript
var PHASE_DEFINITIONS = [
  { id: 'research',       label: 'Research',       agents: ['market-researcher', 'tech-researcher'] },
  { id: 'scoping',        label: 'Scoping',        agents: ['pm'] },
  { id: 'architecture',   label: 'Architecture',   agents: ['arch', 'ai-engineer'] },
  { id: 'design',         label: 'Design',         agents: ['designer'] },
  { id: 'implementation', label: 'Implementation', agents: ['fe', 'be'] },
  { id: 'qa',             label: 'QA',             agents: ['qa'] },
];

// Reverse lookup: agent slug -> phase id
var AGENT_TO_PHASE = {};
// Built at init time from PHASE_DEFINITIONS:
// { 'market-researcher': 'research', 'tech-researcher': 'research', 'pm': 'scoping', ... }
```

Build the reverse lookup once at initialization:

```javascript
(function () {
  for (var i = 0; i < PHASE_DEFINITIONS.length; i++) {
    var phase = PHASE_DEFINITIONS[i];
    for (var j = 0; j < phase.agents.length; j++) {
      AGENT_TO_PHASE[phase.agents[j]] = phase.id;
    }
  }
})();
```

### State Reset

In `disconnectSession()`, add resets for the new state:

```javascript
// In disconnectSession(), after the existing resets:
pipelinePhase = null;
completedPhases = {};
teamAgents = [];
teamAgentIndex = {};
deliverableFiles = {};
deliverableOrder = [];
```

---

## Event-to-State Mapping

All state updates happen inside `appendSessionEvent()`, after the existing agent tracking code (lines ~875-893). The order matters: update state first, then update DOM.

### 1. Pipeline Phase Updates

Triggered by: `Task` tool_use with a known agent name.

```javascript
// Inside appendSessionEvent(), after the existing currentAgent tracking:
if (event.type === 'tool_use' && event.data.tool === 'Task') {
  var agentName = event.data.input && event.data.input.name;
  if (agentName && AGENT_TO_PHASE[agentName]) {
    var newPhase = AGENT_TO_PHASE[agentName];
    // Mark current phase as completed before advancing
    if (pipelinePhase && pipelinePhase !== newPhase) {
      completedPhases[pipelinePhase] = true;
    }
    completedPhases[newPhase] = true;  // Current phase is also "entered"
    pipelinePhase = newPhase;
    updatePipelineIndicator(projectId);
  }
}
```

**Non-linear spawn order handling:** The `pipelinePhase` always tracks the most recently spawned phase. `completedPhases` accumulates all phases that have been entered. A phase shows as "completed" if it's in `completedPhases` but is not the current phase. Phases not in `completedPhases` show as "upcoming." This means if QA spawns before Design, Research/Scoping/Architecture/Design stay "upcoming" and QA is "current" — the data is the source of truth, as the requirements specify.

### 2. Team Activity Updates

Triggered by:
- `Task` tool_use with known agent -> agent **spawned** (status: `working`)
- `tool_result` for a `Task` -> no status change (agent was just assigned)
- `tool_result` for a `TaskOutput` -> agent **done** (their output was received)

```javascript
// Inside appendSessionEvent():

// Agent spawned
if (event.type === 'tool_use' && event.data.tool === 'Task') {
  var agentSlug = event.data.input && event.data.input.name;
  if (agentSlug) {
    var taskDesc = event.data.input.description || event.data.input.prompt || '';
    if (taskDesc.length > 80) taskDesc = taskDesc.substring(0, 80) + '...';

    if (teamAgentIndex.hasOwnProperty(agentSlug)) {
      // Agent re-spawned — update existing entry
      var idx = teamAgentIndex[agentSlug];
      teamAgents[idx].status = 'working';
      teamAgents[idx].taskDescription = taskDesc;
    } else {
      // New agent
      teamAgentIndex[agentSlug] = teamAgents.length;
      teamAgents.push({
        slug: agentSlug,
        status: 'working',
        taskDescription: taskDesc,
        spawnTime: event.timestamp
      });
    }
    updateTeamActivityPanel(projectId);
  }
}

// Agent work received (TaskOutput result means agent is done)
if (event.type === 'tool_result' && event.data.tool === 'TaskOutput') {
  // The TaskOutput was awaiting an agent — mark that agent as done
  // We need to know which agent this TaskOutput was for.
  // The preceding TaskOutput tool_use had input.taskId.
  // We mapped taskId -> agentSlug in activeAgents.
  // But we may not always have the mapping. Use a fallback:
  // Track the last TaskOutput's taskId so we can resolve it on tool_result.
  if (lastTaskOutputAgent && teamAgentIndex.hasOwnProperty(lastTaskOutputAgent)) {
    var idx = teamAgentIndex[lastTaskOutputAgent];
    teamAgents[idx].status = 'done';
    updateTeamActivityPanel(projectId);
  }
  lastTaskOutputAgent = null;
}
```

We need one more tracking variable:

```javascript
var lastTaskOutputAgent = null;  // Agent slug from the most recent TaskOutput tool_use
```

And in the `TaskOutput` tool_use handler:

```javascript
if (event.type === 'tool_use' && event.data.tool === 'TaskOutput') {
  var taskId = event.data.input && event.data.input.taskId;
  if (taskId && activeAgents[taskId]) {
    lastTaskOutputAgent = activeAgents[taskId];
  }
}
```

Reset `lastTaskOutputAgent = null` in `disconnectSession()`.

### 3. File Deliverables Updates

Triggered by: `Write` or `Edit` tool_use events.

```javascript
// Inside appendSessionEvent():
if (event.type === 'tool_use' && (event.data.tool === 'Write' || event.data.tool === 'Edit')) {
  var filePath = event.data.input && event.data.input.file_path;
  if (filePath) {
    var displayPath = formatDeliverablePath(filePath);
    var category = categorizeFile(filePath);
    var agentSlug = currentAgent;
    var agentInfo = agentSlug ? AGENT_REGISTRY[agentSlug] : null;
    var agentName = agentInfo ? agentInfo.name : 'Team Lead';

    if (deliverableFiles[filePath]) {
      // File touched again — update metadata
      deliverableFiles[filePath].editCount++;
      deliverableFiles[filePath].agent = agentSlug;
      deliverableFiles[filePath].agentName = agentName;
      deliverableFiles[filePath].time = event.timestamp;
      if (deliverableFiles[filePath].action === 'created' && event.data.tool === 'Edit') {
        deliverableFiles[filePath].action = 'modified';
      }
    } else {
      // New file
      deliverableFiles[filePath] = {
        path: filePath,
        displayPath: displayPath,
        action: event.data.tool === 'Write' ? 'created' : 'modified',
        agent: agentSlug,
        agentName: agentName,
        time: event.timestamp,
        editCount: 1,
        category: category
      };
      deliverableOrder.push(filePath);
    }
    updateDeliverablesPanel(projectId);
  }
}
```

### Helper: Path Display

```javascript
function formatDeliverablePath(fullPath) {
  // Try to make path relative to project root
  // The project root is typically /Users/.../teamhq/
  // Look for common root patterns
  var markers = ['/teamhq/', '/Projects/'];
  for (var i = 0; i < markers.length; i++) {
    var idx = fullPath.lastIndexOf(markers[i]);
    if (idx !== -1) {
      return fullPath.substring(idx + markers[i].length);
    }
  }
  // Fallback: truncate from left if too long
  if (fullPath.length > 60) {
    return '...' + fullPath.substring(fullPath.length - 57);
  }
  return fullPath;
}
```

### Helper: File Categorization

```javascript
function categorizeFile(filePath) {
  var lower = filePath.toLowerCase();
  // Docs
  if (lower.indexOf('/docs/') !== -1 || (lower.endsWith('.md') && lower.indexOf('/data/') === -1)) return 'docs';
  // Data
  if (lower.indexOf('/data/') !== -1) return 'data';
  // Config
  if (lower.endsWith('package.json') || lower.endsWith('tsconfig.json') ||
      lower.endsWith('.config.js') || lower.endsWith('.config.ts') ||
      lower.endsWith('vite.config.ts')) return 'config';
  // Code
  if (lower.endsWith('.js') || lower.endsWith('.ts') || lower.endsWith('.tsx') ||
      lower.endsWith('.jsx') || lower.endsWith('.css') || lower.endsWith('.html') ||
      lower.endsWith('.svg')) return 'code';
  return 'other';
}
```

Category display order: `['docs', 'code', 'data', 'config', 'other']`.

Category labels: `{ docs: 'Docs', code: 'Code', data: 'Data', config: 'Config', other: 'Other' }`.

---

## DOM Structure and Rendering

### Panel Injection in `renderSessionLog()`

The three panels render inside the `session-log` div, between the header and the scrollable body. This is the key architectural choice: panels are **outside** `session-log__body` (the scroll container), so they don't scroll with events and don't interfere with auto-scroll.

Modified `renderSessionLog()`:

```javascript
function renderSessionLog(sessionMeta, isLive) {
  var titleText = isLive ? 'Live Session' : 'Session Log';
  var timerClass = isLive ? ' session-log__timer--live' : '';
  var timerText = isLive ? '0:00' : (sessionMeta && sessionMeta.durationMs ? formatDurationShort(sessionMeta.durationMs) : '');
  var sessionId = sessionMeta ? sessionMeta.id : '';

  return (
    '<div class="session-log" data-session-id="' + escapeAttr(sessionId) + '">' +
      '<div class="session-log__header">' +
        '<span class="session-log__title">' + titleText + '</span>' +
        '<span class="session-log__timer' + timerClass + '">' + timerText + '</span>' +
      '</div>' +

      // --- Phase 2-3 panels (inserted here) ---
      '<div class="session-panels">' +
        '<div class="pipeline-indicator" aria-label="Pipeline progress"></div>' +
        '<div class="team-activity" aria-hidden="true"></div>' +
        '<div class="file-deliverables" aria-hidden="true"></div>' +
      '</div>' +

      '<div class="session-log__body" role="log" aria-live="polite">' +
        '<div class="session-log__events"></div>' +
        '<div class="session-log__jump" aria-hidden="true">' +
          '<button class="session-log__jump-btn" type="button">Jump to latest</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}
```

The `session-panels` wrapper is always present. Individual panels hide themselves via `aria-hidden="true"` when they have no content. This avoids layout shifts.

### Panel 1: Pipeline Phase Indicator

**Initial render:** Called immediately after `renderSessionLog()` sets up the DOM. Renders all 6 steps in "upcoming" state.

```javascript
function renderPipelineIndicator(projectId) {
  var container = getPipelineContainer(projectId);
  if (!container) return;

  var html = '<div class="pipeline-indicator__steps">';
  for (var i = 0; i < PHASE_DEFINITIONS.length; i++) {
    var phase = PHASE_DEFINITIONS[i];
    var stateClass = 'pipeline-indicator__step--upcoming';
    // State will be updated by updatePipelineIndicator()
    html +=
      '<div class="pipeline-indicator__step ' + stateClass + '" data-phase="' + phase.id + '">' +
        '<span class="pipeline-indicator__dot"></span>' +
        '<span class="pipeline-indicator__label">' + escapeHTML(phase.label) + '</span>' +
      '</div>';
    if (i < PHASE_DEFINITIONS.length - 1) {
      html += '<span class="pipeline-indicator__connector"></span>';
    }
  }
  html += '</div>';
  container.innerHTML = html;
}
```

**Incremental update:** Called from `appendSessionEvent()` when `pipelinePhase` changes.

```javascript
function updatePipelineIndicator(projectId) {
  var container = getPipelineContainer(projectId);
  if (!container) return;

  var steps = container.querySelectorAll('.pipeline-indicator__step');
  for (var i = 0; i < steps.length; i++) {
    var phaseId = steps[i].getAttribute('data-phase');
    steps[i].classList.remove(
      'pipeline-indicator__step--upcoming',
      'pipeline-indicator__step--current',
      'pipeline-indicator__step--completed'
    );
    if (phaseId === pipelinePhase) {
      steps[i].classList.add('pipeline-indicator__step--current');
    } else if (completedPhases[phaseId]) {
      steps[i].classList.add('pipeline-indicator__step--completed');
    } else {
      steps[i].classList.add('pipeline-indicator__step--upcoming');
    }
  }

  // Also update connectors: a connector is "active" if the phase after it has been entered
  var connectors = container.querySelectorAll('.pipeline-indicator__connector');
  for (var i = 0; i < connectors.length; i++) {
    var nextPhase = PHASE_DEFINITIONS[i + 1];
    if (nextPhase && completedPhases[nextPhase.id]) {
      connectors[i].classList.add('pipeline-indicator__connector--active');
    } else {
      connectors[i].classList.remove('pipeline-indicator__connector--active');
    }
  }
}
```

**DOM helper:**

```javascript
function getPipelineContainer(projectId) {
  var logContainer = getLogContainer(projectId);
  if (!logContainer) return null;
  return logContainer.querySelector('.pipeline-indicator');
}
```

### Panel 2: Team Activity

**Initial render:** Empty, hidden via `aria-hidden="true"`. Becomes visible when the first agent is spawned.

**Incremental update:**

```javascript
function updateTeamActivityPanel(projectId) {
  var container = getTeamActivityContainer(projectId);
  if (!container) return;

  if (teamAgents.length === 0) {
    container.setAttribute('aria-hidden', 'true');
    container.innerHTML = '';
    return;
  }

  container.setAttribute('aria-hidden', 'false');

  // Check if the panel shell exists; if not, create it
  var list = container.querySelector('.team-activity__list');
  if (!list) {
    container.innerHTML =
      '<div class="team-activity__header">' +
        '<button class="team-activity__toggle" type="button" aria-expanded="true">' +
          '<span class="team-activity__toggle-chevron" aria-hidden="true"></span>' +
          '<span class="team-activity__title">Team Activity</span>' +
          '<span class="team-activity__count">' + teamAgents.length + '</span>' +
        '</button>' +
      '</div>' +
      '<div class="team-activity__list" aria-hidden="false"></div>';
    list = container.querySelector('.team-activity__list');
  }

  // Update count badge
  var countEl = container.querySelector('.team-activity__count');
  if (countEl) countEl.textContent = teamAgents.length;

  // Rebuild agent rows
  // For a max of ~12 agents, full re-render is fine (no perf concern)
  var html = '';
  for (var i = 0; i < teamAgents.length; i++) {
    var ta = teamAgents[i];
    var agent = AGENT_REGISTRY[ta.slug];
    var name = agent ? agent.name : ta.slug;
    var role = agent ? agent.role : 'Agent';
    var avatarHtml = agent
      ? '<img class="team-activity__avatar" src="img/avatars/' + escapeAttr(agent.avatar) + '.svg" alt="' + escapeAttr(name) + '" width="20" height="20">'
      : '<span class="team-activity__avatar team-activity__avatar--placeholder"></span>';
    var statusClass = ta.status === 'done' ? 'team-activity__status--done' : 'team-activity__status--working';

    html +=
      '<div class="team-activity__agent" data-agent="' + escapeAttr(ta.slug) + '">' +
        avatarHtml +
        '<div class="team-activity__agent-info">' +
          '<span class="team-activity__agent-name">' + escapeHTML(name) + '</span>' +
          '<span class="team-activity__agent-role">' + escapeHTML(role) + '</span>' +
        '</div>' +
        '<span class="team-activity__agent-task">' + escapeHTML(ta.taskDescription) + '</span>' +
        '<span class="team-activity__status ' + statusClass + '"></span>' +
      '</div>';
  }
  list.innerHTML = html;
}
```

**Collapse behavior:** The toggle button uses the same expand/collapse pattern as event groups. Default state: expanded for live sessions. A click handler on `.team-activity__toggle` toggles `aria-expanded` and `aria-hidden` on the list.

**DOM helper:**

```javascript
function getTeamActivityContainer(projectId) {
  var logContainer = getLogContainer(projectId);
  if (!logContainer) return null;
  return logContainer.querySelector('.team-activity');
}
```

### Panel 3: File Deliverables

**Initial render:** Empty, hidden. Becomes visible on the first Write/Edit event.

**Incremental update:**

```javascript
var CATEGORY_ORDER = ['docs', 'code', 'data', 'config', 'other'];
var CATEGORY_LABELS = { docs: 'Docs', code: 'Code', data: 'Data', config: 'Config', other: 'Other' };

function updateDeliverablesPanel(projectId) {
  var container = getDeliverablesContainer(projectId);
  if (!container) return;

  var fileCount = deliverableOrder.length;
  if (fileCount === 0) {
    container.setAttribute('aria-hidden', 'true');
    container.innerHTML = '';
    return;
  }

  container.setAttribute('aria-hidden', 'false');

  // Group files by category
  var byCategory = {};
  for (var i = 0; i < CATEGORY_ORDER.length; i++) {
    byCategory[CATEGORY_ORDER[i]] = [];
  }
  for (var i = 0; i < deliverableOrder.length; i++) {
    var file = deliverableFiles[deliverableOrder[i]];
    if (!byCategory[file.category]) byCategory[file.category] = [];
    byCategory[file.category].push(file);
  }

  // Sort within each category: most recently touched first
  for (var cat in byCategory) {
    byCategory[cat].sort(function (a, b) {
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });
  }

  // Check if panel shell exists
  var list = container.querySelector('.file-deliverables__list');
  if (!list) {
    container.innerHTML =
      '<div class="file-deliverables__header">' +
        '<button class="file-deliverables__toggle" type="button" aria-expanded="false">' +
          '<span class="file-deliverables__toggle-chevron" aria-hidden="true"></span>' +
          '<span class="file-deliverables__title">Deliverables</span>' +
          '<span class="file-deliverables__count">' + fileCount + ' file' + (fileCount !== 1 ? 's' : '') + '</span>' +
        '</button>' +
      '</div>' +
      '<div class="file-deliverables__list" aria-hidden="true"></div>';
    list = container.querySelector('.file-deliverables__list');
  }

  // Update count badge
  var countEl = container.querySelector('.file-deliverables__count');
  if (countEl) countEl.textContent = fileCount + ' file' + (fileCount !== 1 ? 's' : '');

  // Render file list by category
  var html = '';
  var rendered = 0;
  var MAX_SHOWN = 20;
  var hasMore = fileCount > MAX_SHOWN;

  for (var ci = 0; ci < CATEGORY_ORDER.length; ci++) {
    var cat = CATEGORY_ORDER[ci];
    var files = byCategory[cat];
    if (files.length === 0) continue;

    html += '<div class="file-deliverables__category">';
    html += '<span class="file-deliverables__category-label">' + CATEGORY_LABELS[cat] + '</span>';

    for (var fi = 0; fi < files.length; fi++) {
      if (rendered >= MAX_SHOWN && !container.classList.contains('file-deliverables--show-all')) break;
      var f = files[fi];
      var actionClass = f.action === 'created' ? 'file-deliverables__action--created' : 'file-deliverables__action--modified';
      var editBadge = f.editCount > 1 ? '<span class="file-deliverables__edit-count">' + f.editCount + 'x</span>' : '';

      html +=
        '<div class="file-deliverables__file">' +
          '<span class="file-deliverables__action ' + actionClass + '">' + f.action + '</span>' +
          '<span class="file-deliverables__path" title="' + escapeAttr(f.path) + '">' + escapeHTML(f.displayPath) + '</span>' +
          editBadge +
          '<span class="file-deliverables__agent">' + escapeHTML(f.agentName) + '</span>' +
        '</div>';
      rendered++;
    }

    html += '</div>';
  }

  if (hasMore && !container.classList.contains('file-deliverables--show-all')) {
    html += '<button class="file-deliverables__show-all-btn" type="button">Show all ' + fileCount + ' files</button>';
  }

  list.innerHTML = html;
}
```

**DOM helper:**

```javascript
function getDeliverablesContainer(projectId) {
  var logContainer = getLogContainer(projectId);
  if (!logContainer) return null;
  return logContainer.querySelector('.file-deliverables');
}
```

---

## Integration Points with Existing Code

### 1. `appendSessionEvent()` — Event Processing Order

The new state tracking inserts into the existing function after the current agent tracking block. Here is the full flow:

```
appendSessionEvent(projectId, event)
  1. Push to sessionEvents array                    [existing]
  2. Set sessionStartTime from first event          [existing]
  3. Get eventsContainer                            [existing]
  4. Track agent state (currentAgent, activeAgents) [existing]
  5. >> Update pipeline phase state <<              [NEW]
  6. >> Update team activity state <<               [NEW]
  7. >> Update file deliverables state <<           [NEW]
  8. Classify event                                 [existing]
  9. Handle streaming/grouping/rendering            [existing]
```

Steps 5-7 happen before any DOM rendering decisions. This ensures the panels are up to date before the event itself renders in the stream.

### 2. `connectToSession()` — Panel Initialization

After `renderSessionLog()` creates the DOM, initialize the pipeline indicator:

```javascript
// In connectToSession(), after logContainer.innerHTML = renderSessionLog(null, isLive):
renderPipelineIndicator(projectId);
```

The team activity and deliverables panels start hidden and self-initialize on their first update.

### 3. `disconnectSession()` — State Cleanup

Add the new state resets (already specified above in the State Reset section).

### 4. Click Handlers — New Toggle Buttons

Add to the delegated click handler in `listContainer.addEventListener('click', ...)`:

```javascript
// Team activity toggle
var teamToggle = e.target.closest('.team-activity__toggle');
if (teamToggle) {
  var isExpanded = teamToggle.getAttribute('aria-expanded') === 'true';
  teamToggle.setAttribute('aria-expanded', !isExpanded);
  var list = teamToggle.closest('.team-activity').querySelector('.team-activity__list');
  if (list) list.setAttribute('aria-hidden', isExpanded ? 'true' : 'false');
  return;
}

// File deliverables toggle
var deliverablesToggle = e.target.closest('.file-deliverables__toggle');
if (deliverablesToggle) {
  var isExpanded = deliverablesToggle.getAttribute('aria-expanded') === 'true';
  deliverablesToggle.setAttribute('aria-expanded', !isExpanded);
  var list = deliverablesToggle.closest('.file-deliverables').querySelector('.file-deliverables__list');
  if (list) list.setAttribute('aria-hidden', isExpanded ? 'true' : 'false');
  return;
}

// Show all deliverables
var showAllBtn = e.target.closest('.file-deliverables__show-all-btn');
if (showAllBtn) {
  var delContainer = showAllBtn.closest('.file-deliverables');
  if (delContainer) {
    delContainer.classList.add('file-deliverables--show-all');
    var card = delContainer.closest('.project-card');
    var projectId = card ? card.getAttribute('data-project-id') : activeSessionProjectId;
    updateDeliverablesPanel(projectId);
  }
  return;
}
```

---

## CSS Architecture

All new styles go in `css/styles.css` in a new `/* Session Panels — Phase 2-3 */` section, after the existing `/* Session Events */` section.

### Panel Container

```css
.session-panels {
  padding: 0 var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  /* No border-bottom — the panels visually transition into the event stream */
}
```

### Pipeline Indicator

Structure: horizontal flexbox of step items connected by line segments.

```css
.pipeline-indicator__steps {
  display: flex;
  align-items: center;
  gap: 0;
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
  border: 2px solid var(--color-zinc-600);
  background: transparent;
  transition: all 0.2s ease;
}

.pipeline-indicator__label {
  font-size: var(--text-xs);
  color: var(--color-zinc-500);
  white-space: nowrap;
  transition: color 0.2s ease;
}

.pipeline-indicator__connector {
  flex: 1;
  height: 2px;
  background: var(--color-zinc-700);
  min-width: 12px;
  margin: 0 var(--space-1);
  /* Offset to align with dot center */
  margin-bottom: calc(var(--text-xs) + var(--space-1));
  transition: background 0.2s ease;
}

/* States */
.pipeline-indicator__step--completed .pipeline-indicator__dot {
  background: var(--color-indigo-400);
  border-color: var(--color-indigo-400);
}
.pipeline-indicator__step--completed .pipeline-indicator__label {
  color: var(--color-zinc-400);
}

.pipeline-indicator__step--current .pipeline-indicator__dot {
  background: var(--color-indigo-400);
  border-color: var(--color-indigo-400);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}
.pipeline-indicator__step--current .pipeline-indicator__label {
  color: var(--color-indigo-300);
  font-weight: var(--font-weight-semibold);
}

.pipeline-indicator__connector--active {
  background: var(--color-indigo-400);
}
```

### Team Activity Panel

```css
.team-activity__header {
  /* No padding — the toggle button handles it */
}

.team-activity__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-2) 0;
  color: inherit;
}

.team-activity__toggle-chevron {
  /* Reuse the same chevron approach as event groups */
  width: 12px;
  height: 12px;
  transition: transform 0.15s ease;
}
.team-activity__toggle[aria-expanded="true"] .team-activity__toggle-chevron {
  transform: rotate(90deg);
}

.team-activity__title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-300);
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
}
.team-activity__list[aria-hidden="true"] {
  display: none;
}

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
}
.team-activity__avatar--placeholder {
  background: var(--color-zinc-700);
}

.team-activity__agent-info {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-width: 80px;
}

.team-activity__agent-name {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-300);
}

.team-activity__agent-role {
  font-size: 10px;
  color: var(--color-zinc-500);
}

.team-activity__agent-task {
  font-size: var(--text-xs);
  color: var(--color-zinc-500);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
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
  background: var(--color-zinc-500);
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

### File Deliverables Panel

```css
.file-deliverables__header {
  /* Same pattern as team-activity */
}

.file-deliverables__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-2) 0;
  color: inherit;
}

.file-deliverables__toggle-chevron {
  width: 12px;
  height: 12px;
  transition: transform 0.15s ease;
}
.file-deliverables__toggle[aria-expanded="true"] .file-deliverables__toggle-chevron {
  transform: rotate(90deg);
}

.file-deliverables__title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-300);
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
  gap: var(--space-1);
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
}

.file-deliverables__file {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 2px var(--space-2);
  font-size: var(--text-xs);
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
  direction: rtl;  /* Truncate from left — filename stays visible */
  text-align: left;
  flex: 1;
}

.file-deliverables__edit-count {
  font-size: 10px;
  color: var(--color-zinc-500);
  flex-shrink: 0;
}

.file-deliverables__agent {
  font-size: 10px;
  color: var(--color-zinc-500);
  flex-shrink: 0;
}

.file-deliverables__show-all-btn {
  background: none;
  border: none;
  color: var(--color-indigo-400);
  font-size: var(--text-xs);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  text-align: left;
}
.file-deliverables__show-all-btn:hover {
  color: var(--color-indigo-300);
}
```

---

## Performance Considerations

1. **Panel updates are O(n) where n = panel items, not events.** The pipeline indicator updates 6 DOM elements. The team activity panel re-renders at most 12 agent rows. The deliverables panel re-renders at most 20-50 file rows. These are all trivially fast even on every event.

2. **No full re-scan of events.** All three panels maintain running state in variables. When an event arrives, we check if it's relevant (is it a Task? Is it a Write/Edit?), update the state variable, and call the update function. We never iterate over `sessionEvents[]` to rebuild state.

3. **Deliverables sort is bounded.** We sort within categories, and each category will typically have <20 items. The sort runs on every Write/Edit event, but that's infrequent compared to the total event volume.

4. **Team activity full re-render is acceptable.** With a max of 12 agents, regenerating `innerHTML` for the list on each update is simpler and more reliable than incremental DOM patching. No virtual DOM needed for 12 rows.

---

## Historical Session Replay

All three panels work identically for historical sessions. The event stream replays through `appendSessionEvent()`, which updates state and panels the same way as live events. The only difference:

- **Team activity default collapse state:** The requirements say "collapsed for historical sessions." After `renderSessionLog()`, check `isLive` and set the team activity toggle to `aria-expanded="false"` for historical sessions.

The pipeline indicator always shows (no collapse). The deliverables panel always defaults to collapsed (both live and historical).

---

## Files Changed

| File | Change |
|------|--------|
| `js/projects.js` | New state variables, `PHASE_DEFINITIONS`, `AGENT_TO_PHASE`, 3 panel render/update functions, 3 DOM helpers, `formatDeliverablePath()`, `categorizeFile()`, modified `renderSessionLog()`, modified `appendSessionEvent()`, modified `disconnectSession()`, new click handlers for toggles |
| `css/styles.css` | New `/* Session Panels */` section with pipeline indicator, team activity, and file deliverables styles |

No new files. No server changes. No new dependencies.

---

## What Robert Needs to Know

1. **Three panels stack vertically** above the event stream, inside `session-panels`. The pipeline indicator is compact (one row). Team activity and deliverables are collapsible sections.

2. **Visual hierarchy:** Pipeline indicator is always visible (subtle, informational). Team activity is prominent when expanded (active work). Deliverables is secondary (collapsed by default).

3. **Pipeline indicator** is a horizontal step bar with dots, labels, and connectors. Three visual states: upcoming (muted), current (indigo glow), completed (solid indigo). Connectors between steps fill in as phases are entered.

4. **Team activity** entries should feel like a compact roster — avatar, name, role, task description, status dot. The status dot pulses when working and goes static when done.

5. **Deliverables** entries are dense — action badge, monospace file path, edit count, agent name. Category headers separate the groups. The path truncates from the left (CSS `direction: rtl`) so the filename is always visible.

6. **Chevrons** on the collapsible toggles should match the existing `session-event__result-chevron` and `session-event__group-chevron` patterns for consistency.

7. **Color palette** stays within zinc/indigo. No new colors. The indigo accents (dots, "created" labels, connectors) match the existing agent banner border.

## What Alice Needs to Know

1. **Start with the state variables and constants** (`PHASE_DEFINITIONS`, `AGENT_TO_PHASE`, the state variables). Add them near the existing agent tracking state at the top of the IIFE.

2. **Modify `renderSessionLog()`** to include the `session-panels` wrapper with the three empty panel containers.

3. **Add the three update functions** (`updatePipelineIndicator`, `updateTeamActivityPanel`, `updateDeliverablesPanel`) and their DOM helpers.

4. **Modify `appendSessionEvent()`** to call state updates and panel updates after the existing agent tracking code. The new code inserts between the agent tracking block and the `classifyEvent()` call.

5. **Modify `disconnectSession()`** to reset the new state variables.

6. **Call `renderPipelineIndicator()`** in `connectToSession()` after the session log is rendered.

7. **Add the three click handlers** (team activity toggle, deliverables toggle, show-all button) to the delegated click listener.

8. **For historical sessions**, after `renderSessionLog()`, set team activity toggle to collapsed.

## What Enzo Needs to Know

1. **Test pipeline indicator** with sessions that have agents spawned in standard order (Research -> Scoping -> ... -> QA) and non-standard order (e.g., Implementation before Design). Verify that the current phase tracks the most recent spawn and skipped phases stay "upcoming."

2. **Test team activity** by spawning multiple agents. Verify each appears once with correct name/role/avatar. Verify status changes from "working" to "done" when agent output is received. Verify re-spawning an agent updates the existing entry (no duplicate).

3. **Test deliverables** by running a session where agents Write and Edit files. Verify deduplication (same file touched twice shows once with editCount=2). Verify categorization (docs/*.md goes to Docs, js/*.js goes to Code, etc.). Verify long paths truncate with filename visible.

4. **Test panel reset** by switching between sessions in the history. Verify all three panels reset and rebuild from the new session's events.

5. **Test collapse/expand** on team activity and deliverables toggles. Verify team activity defaults to expanded (live) / collapsed (historical). Verify deliverables defaults to collapsed always.

6. **Test edge case: no agents spawned.** Pipeline indicator shows all "upcoming." Team activity panel is hidden. Deliverables panel is hidden.
