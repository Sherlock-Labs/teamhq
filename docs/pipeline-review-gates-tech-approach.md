# Pipeline Review Gates — Technical Approach

**Author:** Andrei (Arch)
**Date:** 2026-03-17
**Status:** Final
**Depends on:** `docs/pipeline-review-gates-requirements.md`

## Overview

Review gates add configurable checkpoints to the autonomous pipeline. When the heartbeat reaches a gate, it pauses and creates a review record. The CEO approves or requests changes via a new Reviews page. On approval, the heartbeat resumes.

This is a lightweight extension to three existing systems: the project data model, the heartbeat runner, and the frontend. No new infrastructure, no new databases, no new patterns.

## Architecture Decision: JSON Files, Not a Database

Reviews follow the same pattern as meetings, heartbeats, and work items — one JSON file per review instance, stored in `data/reviews/`. This is the right call because:

- Every other data entity in TeamHQ uses this pattern. Consistency > optimization.
- Review volume is low (7 gates max per project, ~5 projects active over time = ~35 files total).
- No need for querying across reviews — the API aggregates on read.
- File-per-review avoids write conflicts when the heartbeat and the CEO act on different reviews simultaneously.

## Data Model

### 1. Project Extension: `reviewGates`

Add an optional `reviewGates` field to the project schema. This is a flat object with boolean flags — one per pipeline phase that can have a gate.

```typescript
// Addition to server/src/schemas/project.ts
const ReviewGatesSchema = z.object({
  afterResearch: z.boolean().default(false),
  afterRequirements: z.boolean().default(false),
  afterArchitecture: z.boolean().default(false),
  afterDesign: z.boolean().default(false),
  afterBackend: z.boolean().default(false),
  afterFrontend: z.boolean().default(false),
  afterQA: z.boolean().default(false),
});

// Added to ProjectSchema:
reviewGates: ReviewGatesSchema.default({
  afterResearch: false,
  afterRequirements: false,
  afterArchitecture: false,
  afterDesign: false,
  afterBackend: false,
  afterFrontend: false,
  afterQA: false,
}),
```

Also add `reviewGates` to `UpdateProjectSchema` so the CEO can toggle gates via `PATCH /api/projects/:id`.

**Why a flat object instead of an array?** Because the gates are a fixed, known set that maps 1:1 to pipeline phases. A flat object is easier to read, toggle, and validate. No need for the flexibility of an arbitrary array.

### 2. Review Records

Each review is a standalone JSON file in `data/reviews/{review-id}.json`. The review ID is a UUID.

```typescript
// New file: server/src/schemas/review.ts
import { z } from "zod";

export const ReviewStatus = z.enum([
  "pending",           // gate reached, awaiting CEO review
  "approved",          // CEO approved, pipeline continues
  "changes-requested", // CEO requested changes, agent reworking
  "not-applicable",    // gate configured but phase was skipped
]);

export const ReviewSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string(),
  projectSlug: z.string(),
  projectName: z.string(),
  gate: z.string(),               // e.g., "afterArchitecture"
  status: ReviewStatus,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),

  // What was produced
  deliverables: z.array(z.object({
    type: z.enum(["doc", "code", "qa-report"]),
    path: z.string(),             // relative path, e.g., "docs/review-gates-tech-approach.md"
    title: z.string(),
  })),
  agent: z.string(),              // who produced the deliverable (e.g., "Andrei")
  summary: z.string(),            // brief description of what was done

  // CEO feedback (populated on action)
  feedback: z.string().nullable(),
});

export type Review = z.infer<typeof ReviewSchema>;
```

**Storage:** `data/reviews/{uuid}.json` — flat directory, not nested by project. The volume is too low to need per-project subdirectories, and a flat directory makes the `GET /api/reviews` aggregation simpler (just `readdir` + filter).

### 3. Gate-to-Phase Mapping

The heartbeat runner already defines `PHASE_ORDER` with named phases. We need a clean mapping from review gate names to pipeline phase numbers, so the heartbeat knows when to check for a gate.

```typescript
// Added to heartbeatRunner.ts
const GATE_AFTER_PHASE: Record<string, number> = {
  afterResearch: 0,       // no current phase for research — future-proofing
  afterRequirements: 1,   // after requirements/scope
  afterArchitecture: 2,   // after architecture/tech approach
  afterDesign: 3,         // after design spec (parallel phase)
  afterBackend: 3,        // after backend (parallel with design)
  afterFrontend: 4,       // after frontend/UI
  afterQA: 6,             // after QA/testing
};
```

## API Design

### New Endpoints (Reviews Router)

**File:** `server/src/routes/reviews.ts`

| Method | Path | Description |
|--------|------|-------------|
| `GET /api/reviews` | List all reviews. Optional `?status=pending` filter. Returns array sorted by `createdAt` desc. |
| `GET /api/reviews/:id` | Get a single review by ID. |
| `POST /api/reviews` | Create a review (called by heartbeat when a gate is reached). Body: `{ projectId, projectSlug, projectName, gate, agent, summary, deliverables }`. |
| `PATCH /api/reviews/:id` | Update review status. Body: `{ status: "approved" | "changes-requested", feedback?: string }`. |

### Extended Existing Endpoints

| Method | Path | Change |
|--------|------|--------|
| `GET /api/projects/:id` | Now includes `reviewGates` in response (automatic — it's part of the schema). |
| `PATCH /api/projects/:id` | Now accepts `reviewGates` in body (add to `UpdateProjectSchema`). |
| `GET /api/dashboard` | Add `pendingReviews` count to the `metrics` object. |

### API Contracts

**POST /api/reviews** (created by heartbeat)
```json
{
  "projectId": "056f09cc-...",
  "projectSlug": "review-gates",
  "projectName": "Pipeline Review Gates",
  "gate": "afterArchitecture",
  "agent": "Andrei",
  "summary": "Defined data model, API design, and pipeline integration approach for review gates.",
  "deliverables": [
    {
      "type": "doc",
      "path": "docs/pipeline-review-gates-tech-approach.md",
      "title": "Tech Approach"
    }
  ]
}
```

**PATCH /api/reviews/:id** (CEO approves)
```json
{
  "status": "approved"
}
```

**PATCH /api/reviews/:id** (CEO requests changes)
```json
{
  "status": "changes-requested",
  "feedback": "The data model looks good but I want the deliverable viewer to also show file diffs, not just doc rendering. Please add that to the design spec."
}
```

**GET /api/reviews?status=pending** (dashboard widget + reviews page)
```json
{
  "reviews": [
    {
      "id": "abc-123",
      "projectId": "056f09cc-...",
      "projectSlug": "review-gates",
      "projectName": "Pipeline Review Gates",
      "gate": "afterArchitecture",
      "status": "pending",
      "createdAt": "2026-03-17T17:00:00.000Z",
      "updatedAt": "2026-03-17T17:00:00.000Z",
      "resolvedAt": null,
      "deliverables": [
        { "type": "doc", "path": "docs/pipeline-review-gates-tech-approach.md", "title": "Tech Approach" }
      ],
      "agent": "Andrei",
      "summary": "Defined data model, API design, and pipeline integration approach.",
      "feedback": null
    }
  ]
}
```

## Pipeline Integration

This is the critical piece. The heartbeat runner (`server/src/autonomy/heartbeatRunner.ts`) needs to check for review gates at two points:

### 1. After completing a task — check if a gate blocks the next phase

In `runAgentForTask`, after marking a task completed, before calling `findNextTask`:

```
if task just completed:
  1. Determine which gate (if any) fires after this phase
  2. Read the project's reviewGates config
  3. If the corresponding gate is enabled:
     a. Create a review record via the store (not the API — we're server-side)
     b. Log an event: "Review gate reached: afterArchitecture"
     c. Do NOT advance to the next task — the pipeline pauses here
  4. If no gate or gate not enabled: proceed normally
```

### 2. Before starting a new task — check if a pending review blocks progress

In `findNextTask`, add a check:

```
if any review for this project has status === "pending" or "changes-requested":
  return null  // pipeline stays paused
```

This is the simplest integration point. The heartbeat already calls `findNextTask` on every run. If a pending review exists, `findNextTask` returns null, and the heartbeat moves on to the next project. On the next heartbeat cycle (or manual trigger), it checks again. When the CEO approves the review, the next heartbeat finds no blocker and advances normally.

### 3. Handling "changes-requested"

When the CEO requests changes:
1. The review status is set to `changes-requested` with feedback text
2. On the next heartbeat, the heartbeat sees the `changes-requested` review
3. It re-runs the agent with the original task prompt + the CEO's feedback appended
4. When the agent completes, the review status is updated to `pending` again (awaiting re-review)
5. The CEO reviews again — approve or request more changes

This creates a feedback loop without any new infrastructure. The heartbeat already knows how to run agents; it just needs to know when to re-run one with feedback context.

### Phase Mapping for Gates

The tricky part is parallel phases. Design (order 3) and backend (order 3) run in parallel. If `afterDesign` is enabled but `afterBackend` is not, the gate should fire after design completes but not block backend work.

**Solution:** Gates are per-task, not per-phase-level. When a specific task completes (e.g., design spec), check if the corresponding gate is enabled. Only block the tasks that depend on that gate's phase, not parallel tasks at the same level.

Implementation: the gate check happens in the transition between completing one task and starting the next. For parallel phases, each task independently checks its own gate. Backend completing won't trigger the `afterDesign` gate, and design completing won't trigger the `afterBackend` gate.

```typescript
// Map work item titles to gate names (same regex approach as PHASE_ORDER)
const TASK_TO_GATE: Array<{ pattern: RegExp; gate: string }> = [
  { pattern: /requirement|scope/i, gate: "afterRequirements" },
  { pattern: /architect|tech approach/i, gate: "afterArchitecture" },
  { pattern: /design spec|design —/i, gate: "afterDesign" },
  { pattern: /backend|api|server/i, gate: "afterBackend" },
  { pattern: /frontend|ui|client/i, gate: "afterFrontend" },
  { pattern: /qa|test/i, gate: "afterQA" },
];
```

### Review Blocking Logic

The `findNextTask` function needs to be gate-aware. Rather than globally blocking all tasks when any review is pending, we block only tasks at a higher phase order than the pending review's gate:

```typescript
function findNextTask(workItems, projectSlug, reviewGates): WorkItem | null {
  // Check for pending/changes-requested reviews
  const pendingReviews = getPendingReviewsForProject(projectSlug);

  for (const task of planned) {
    const order = getPhaseOrder(task.title);

    // All lower-phase tasks must be completed
    const depsCompleted = workItems
      .filter(t => getPhaseOrder(t.title) < order)
      .every(t => t.status === "completed");
    if (!depsCompleted) continue;

    // Check if any pending review blocks this task
    const blocked = pendingReviews.some(review => {
      const gatePhaseOrder = GATE_AFTER_PHASE[review.gate];
      return gatePhaseOrder !== undefined && order > gatePhaseOrder;
    });
    if (blocked) continue;

    return task;
  }
  return null;
}
```

This allows parallel-phase tasks to continue even if a gate is pending at the same phase level — only downstream tasks are blocked.

## Store Layer

**New file:** `server/src/store/reviews.ts`

Follows the exact same pattern as `store/heartbeats.ts` — JSON files in a flat directory with CRUD operations.

```typescript
const DATA_DIR = join(import.meta.dirname, "../../../data/reviews");

export async function createReview(input: CreateReviewInput): Promise<Review>;
export async function getReview(id: string): Promise<Review | null>;
export async function updateReview(id: string, updates: Partial<Review>): Promise<Review>;
export async function listReviews(filter?: { status?: string; projectSlug?: string }): Promise<Review[]>;
export async function getPendingReviewsForProject(projectSlug: string): Promise<Review[]>;
```

`listReviews` reads all files, applies optional filters, and sorts by `createdAt` descending. `getPendingReviewsForProject` is a convenience wrapper that filters by project + pending/changes-requested status — called frequently by the heartbeat, so it should be efficient. At the expected volume (<50 files ever), reading all files is fine.

## Frontend

**New page:** `reviews.html` — follows the same pattern as `meetings.html`, `tasks.html`, etc.

**Key sections:**
1. **Pending reviews list** — cards showing project name, gate name, agent, summary, and action buttons
2. **Deliverable viewer** — reuses the existing doc viewer from `docs.html` (markdown rendering with syntax highlighting)
3. **Approve / Request Changes** — two buttons on each review card. Request Changes opens a textarea for feedback.

**Project settings addition:** On the project detail view, add a "Review Gates" section with 7 checkboxes (one per gate). Saves via `PATCH /api/projects/:id` with the `reviewGates` field.

**Dashboard addition:** Add a "Pending Reviews" badge/count to the dashboard metrics. If any reviews are pending, show a prominent indicator.

## File Impact Summary

| File | Change Type | Notes |
|------|-------------|-------|
| `server/src/schemas/project.ts` | **Modify** | Add `ReviewGatesSchema` and extend `ProjectSchema` + `UpdateProjectSchema` |
| `server/src/schemas/review.ts` | **New** | Review schema (Zod) |
| `server/src/store/reviews.ts` | **New** | CRUD for review JSON files |
| `server/src/routes/reviews.ts` | **New** | Reviews API endpoints |
| `server/src/routes/projects.ts` | **Extend** | No code changes needed — `reviewGates` flows through existing PATCH handler automatically once schema is updated |
| `server/src/routes/dashboard.ts` | **Extend** | Add `pendingReviews` count to metrics response |
| `server/src/index.ts` | **Extend** | Register reviews router |
| `server/src/autonomy/heartbeatRunner.ts` | **Modify** | Add gate checking after task completion, gate-aware `findNextTask`, and feedback re-run logic |
| `reviews.html` | **New** | Reviews page |
| `projects.html` | **Modify** | Add review gates toggle section to project settings |
| `dashboard.html` | **Modify** | Add pending reviews badge to metrics area |

### QA Impact Notes

- `server/src/autonomy/heartbeatRunner.ts` [Modify] — Changes to `findNextTask` and task completion flow affect all pipeline advancement. Regression test: verify that projects without review gates still advance normally. Verify parallel phases (design + backend) still start correctly. Verify the heartbeat doesn't stall when no reviews are pending.
- `server/src/schemas/project.ts` [Modify] — Adding `reviewGates` with defaults means existing project JSON files without this field will get the default (all gates off). Verify existing projects load correctly and that the API returns the new field.

## What This Approach Does NOT Do

- **No WebSocket/SSE push for review notifications.** The dashboard polls on page load. The CEO checks the reviews page when they want to. This is adequate for v1 — the CEO initiates review, not the other way around.
- **No review history or audit trail.** Reviews are updated in place. The event log captures the key moments (gate reached, approved, changes requested) which is sufficient for v1.
- **No agent chat at gates.** Deferred to v2 per requirements. The meeting system can be extended for this later.
- **No automatic deliverable detection.** The heartbeat explicitly lists deliverables when creating a review based on the task type. Not magical, but predictable.

## Implementation Order

1. **Schema + Store** — `review.ts` schema, `reviews.ts` store, extend `project.ts` with `reviewGates`
2. **API** — `routes/reviews.ts`, register in `index.ts`, extend dashboard
3. **Heartbeat integration** — gate checking in `heartbeatRunner.ts`
4. **Frontend** — `reviews.html`, project settings gates UI, dashboard badge

Backend (steps 1-3) and design spec can proceed in parallel. Frontend (step 4) needs both the API and the design spec.
