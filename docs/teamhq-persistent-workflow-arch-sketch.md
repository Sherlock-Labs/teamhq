# TeamHQ — Persistent Workflow State: Architectural Sketch

**Author:** Andrei (Technical Architect)
**Date:** 2026-03-18
**Status:** Draft sketch — not yet implementation-ready
**Scope:** Persistent state across heartbeats to eliminate duplicate work and lost plans

---

## The Problem in One Sentence

Thomas runs every heartbeat from scratch — he sees work items and events, but not what *he* decided and started in the previous heartbeat. The result: he re-evaluates already-in-progress work, risks re-spawning agents, and has no way to build multi-heartbeat plans.

---

## 1. State Model

One file: `data/workflow-state.json`. Written by Thomas at the end of each heartbeat. Read by the heartbeat runner and injected into the next heartbeat's prompt.

```typescript
interface WorkflowState {
  version: 1;
  updatedAt: string;           // ISO timestamp
  updatedByHeartbeat: string;  // heartbeat ID (for correlation)

  // One entry per active project pipeline
  activePlans: ActivePlan[];

  // Agents Thomas has spawned — tracked until deliverable confirmed or TTL exceeded
  inFlightAgents: InFlightAgent[];

  // Things Thomas decided to do but deferred to the next heartbeat
  deferredActions: DeferredAction[];
}

interface ActivePlan {
  projectId: string;
  projectName: string;
  currentPhase: PipelinePhase;   // "requirements" | "architecture" | "design" | "backend" | "frontend" | "review" | "qa"
  nextAction: string;            // plain English: "Spawn Alice to implement the frontend"
  blockedReason?: string;        // if blocked, why
  lastAdvancedAt: string;
}

interface InFlightAgent {
  agentName: string;             // "andrei", "alice", etc.
  task: string;                  // brief description
  projectId: string;
  workItemId: string;            // ties to work-items API for status
  spawnedAt: string;
  expectedDeliverable: string;   // file path Thomas will check to confirm completion
  timeoutAt: string;             // spawnedAt + TTL (default 90 minutes)
  status: "running" | "completed" | "failed" | "timed-out";
}

interface DeferredAction {
  description: string;           // what to do
  reason: string;                // why it was deferred (e.g., "waiting for review approval")
  deferredUntil?: string;        // ISO date, or null = next heartbeat
}

type PipelinePhase = "requirements" | "architecture" | "design" | "backend" | "frontend" | "review" | "qa" | "done";
```

**What's intentionally NOT in state:**
- Project/task data — the API is authoritative, state is a pointer
- Meeting content — already stored in `data/meetings/`
- Raw agent output — stored in docs/ files and heartbeat records

---

## 2. Storage

**Choice: JSON file at `data/workflow-state.json`**

Rationale:
- Zero new infrastructure — same pattern as `data/heartbeat-config.json` and `data/ceo-inbox.json`
- Directly inspectable and debuggable
- Thomas can write it with the Write tool or via a thin API endpoint
- No concurrency issues — only one heartbeat runs at a time (`isRunning` guard already in heartbeatRunner.ts)

**Atomic writes to prevent corruption:**

```typescript
// workflowState.ts store
import { writeFile, readFile, rename } from "node:fs/promises";

const STATE_PATH = join(DATA_DIR, "workflow-state.json");
const STATE_TMP_PATH = join(DATA_DIR, "workflow-state.tmp.json");

export async function saveWorkflowState(state: WorkflowState): Promise<void> {
  await writeFile(STATE_TMP_PATH, JSON.stringify(state, null, 2));
  await rename(STATE_TMP_PATH, STATE_PATH);  // atomic on same filesystem
}

export async function loadWorkflowState(): Promise<WorkflowState | null> {
  try {
    const raw = await readFile(STATE_PATH, "utf-8");
    return JSON.parse(raw) as WorkflowState;
  } catch {
    return null;  // first run, or file corrupt — start fresh
  }
}
```

---

## 3. Heartbeat Lifecycle

### A. Load State (heartbeatRunner.ts)

```typescript
// In runHeartbeat(), before buildPrompt():
const workflowState = await loadWorkflowState();
```

### B. Inject State into Prompt

`buildPrompt()` gets a new `workflowState` parameter. A new section is appended to Thomas's prompt:

```
## Workflow State (from last heartbeat)
**Updated:** 2026-03-18T11:30:00Z | **Heartbeat:** abc-123

### Active Plans
- **Forge Visual Themes** [phase: frontend] — Next: Spawn Alice to implement themes. No blockers.
- **Persistent Workflow State** [phase: architecture] — Next: Await Andrei deliverable.

### In-Flight Agents (DO NOT re-spawn these)
- **andrei** on Persistent Workflow State — spawned 35m ago
  - Deliverable: docs/teamhq-persistent-workflow-arch-sketch.md
  - Timeout: 2026-03-18T13:00:00Z
  - Status: RUNNING → CHECK if deliverable exists before spawning again

### Deferred Actions
- Review Forge frontend with Robert — deferred: waiting for Alice to finish

### INSTRUCTIONS
1. For each in-flight agent: check if their deliverable file exists.
   - If YES → mark work item completed, advance the pipeline
   - If NO and not timed out → do not re-spawn, wait
   - If timed out → mark work item failed, consider re-spawning or flagging to CEO

2. At the end of this heartbeat, write updated workflow state to data/workflow-state.json
   using the schema in docs/teamhq-persistent-workflow-arch-sketch.md.
```

### C. Thomas Acts

Thomas's existing decision loop is mostly unchanged. The key additions:

1. **Before spawning an agent** — check `inFlightAgents` for an existing entry for that agent+project. Only spawn if none.
2. **After checking deliverables** — update in-flight agent statuses in the working state.
3. **At the end of the session** — write updated `data/workflow-state.json` with the Write tool.

### D. Workflow State Update (Thomas's last action each heartbeat)

Thomas writes the file directly — he already has the Write tool available in his Claude Code session:

```typescript
// Thomas writes this at end of session:
const newState: WorkflowState = {
  version: 1,
  updatedAt: new Date().toISOString(),
  updatedByHeartbeat: "<current heartbeat ID from prompt>",
  activePlans: [ /* current plan status for each active project */ ],
  inFlightAgents: [ /* what was spawned this session, plus still-running from last session */ ],
  deferredActions: [ /* anything Thomas couldn't act on this heartbeat */ ],
};
```

The heartbeat runner does NOT need to save state — Thomas does it himself as his final action.

---

## 4. Agent Tracking

### The Core Insight

Agents spawned via `claude --print` are fire-and-forget subprocesses. Once Thomas's session ends, there's no OS-level way to know if they're still running. But we don't need OS-level tracking.

**Agents are tracked by deliverables, not by PIDs.**

When Thomas spawns Andrei to write a tech approach, Andrei's "done" signal is the existence of `docs/{project}-tech-approach.md`. Thomas checks this file at the start of the next heartbeat. If it exists, the work is done. If it doesn't exist and the timeout hasn't passed, Thomas waits. If the timeout has passed, Thomas considers it failed.

### Timeout Policy

| Agent type | Default TTL |
|-----------|------------|
| Research agents (Suki, Marco) | 60 minutes |
| Architecture (Andrei) | 90 minutes |
| Design (Robert) | 90 minutes |
| Backend (Jonah, Sam) | 120 minutes |
| Frontend (Alice) | 120 minutes |
| QA (Enzo) | 90 minutes |
| Quick tasks (Priya, Nadia) | 60 minutes |

### Status Transitions

```
running → completed  (deliverable file found)
running → timed-out  (timeout exceeded, no deliverable)
running → failed     (work item explicitly set to "failed" by the agent)
```

Thomas makes all transitions by inspecting file system and work item API.

---

## 5. Migration Path — Changes to heartbeatRunner.ts

The changes are deliberately minimal. Existing logic is untouched.

### New file: `server/src/store/workflowState.ts`

Handles `loadWorkflowState()` and `saveWorkflowState()` with atomic write.

### Changes to `heartbeatRunner.ts`

**`buildPrompt()` signature change:**
```typescript
// Before:
function buildPrompt(stateMarkdown, ceoInboxMarkdown, lastHeartbeat): string

// After:
function buildPrompt(stateMarkdown, ceoInboxMarkdown, lastHeartbeat, workflowState): string
```

**New section added to prompt template:** The "Workflow State" block described in section 3B above.

**In `runHeartbeat()`, before `buildPrompt()`:**
```typescript
// Add these two lines:
const workflowState = await loadWorkflowState();
// workflowState may be null on first run — buildPrompt handles null gracefully
```

**In `runHeartbeat()`, pass to `buildPrompt()`:**
```typescript
const prompt = buildPrompt(stateMarkdown, ceoInboxMarkdown, lastHeartbeat, workflowState);
```

That's it on the runner side. Thomas handles the rest.

### Changes to `.claude/agents/product-manager.md`

Add a new section: **"Workflow State Management"** with instructions to:
1. At start: read and act on the workflow state from the prompt
2. Before spawning any agent: check in-flight list
3. At end: write updated `data/workflow-state.json`

Include the schema as a reference block so Thomas knows the exact format to write.

### New API endpoint (optional)

`GET /api/workflow-state` and `PUT /api/workflow-state` — thin wrappers around the store. Useful for the dashboard to display current plan. Not required for the core feature — Thomas can use the Write tool directly.

---

## 6. Failure Handling

### Scenario: Heartbeat crashes mid-session

Thomas writes workflow state as his *last* action. If he crashes before writing it, the previous heartbeat's state is preserved on disk — stale but better than nothing. The next heartbeat will re-evaluate from the stale state, which may cause some duplicate checking but not duplicate spawning (deliverable files already exist or agents are already timed out).

**Risk mitigation:** The `updatedAt` timestamp on the state file tells the next heartbeat how stale the state is. If it's more than `intervalMs * 2` old, the next Thomas should treat in-flight agents as potentially stale and check more aggressively.

### Scenario: Thomas writes corrupt JSON

The `loadWorkflowState()` catches parse errors and returns `null`. The next heartbeat runs without state — same as a fresh start. Acceptable recovery path.

### Scenario: Two heartbeats running simultaneously

Already prevented by the `isRunning` guard in `heartbeatRunner.ts`. No state concurrency issue.

### Scenario: State file gets very large

Add a `cleanupWorkflowState()` step: prune `inFlightAgents` where `status === "completed" || status === "timed-out"` older than 24 hours. Thomas runs this at the start of his state write step.

---

## 7. What This Doesn't Solve (Intentionally Out of Scope)

- **Real-time agent monitoring** — detecting if a spawned `claude` subprocess is still alive requires PID tracking across process boundaries. Deliverable-based tracking is simpler and sufficient.
- **Cross-machine state** — this is local JSON. If the server restarts, state survives (it's on disk). If the machine changes, state is lost — acceptable for v1.
- **Multi-Thomas coordination** — only one Thomas runs per heartbeat. No concurrent Thomas problem.

---

## 8. Estimated Impact

| File | Change Type | Notes |
|------|------------|-------|
| `server/src/store/workflowState.ts` | **New file** | ~60 lines, load/save with atomic write |
| `server/src/autonomy/heartbeatRunner.ts` | **Modify** | Add ~10 lines: load state, pass to buildPrompt |
| `.claude/agents/product-manager.md` | **Modify** | Add workflow state management section |
| `server/src/routes/` | **Extend** (optional) | New `/api/workflow-state` endpoints if dashboard needed |

This is a small, focused change. The heavy lifting is done by Thomas in his session — the infrastructure just loads the state and puts it in front of him.
