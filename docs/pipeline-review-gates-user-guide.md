# Pipeline Review Gates -- User Guide

**What it is:** Configurable checkpoints in the TeamHQ pipeline where work pauses for your review. When a gate fires, you see the deliverable, read it inline, and either approve (pipeline continues) or request changes (agent reworks with your feedback).

**Default behavior:** All gates are off. The pipeline runs fully autonomously unless you enable gates on a project.

---

## Quick Start

1. Go to **Projects** and select a project.
2. In the **Review Gates** section, toggle on the checkpoints where you want to pause the pipeline (e.g., "After Architecture", "After Design").
3. When the pipeline reaches a gate, a review appears on the **Reviews** page. The sidebar badge shows how many are pending.
4. Open the review, read the deliverable inline, and click **Approve** or **Request Changes**.

That is the full flow. The rest of this guide covers each step in detail.

---

## What Are Review Gates

Review gates are optional pause points in the pipeline. There are seven, one after each major phase:

| Gate | What You Review | Who Produced It |
|------|----------------|-----------------|
| After Research | Market/technical research docs | Suki, Marco |
| After Requirements | Requirements and acceptance criteria | Thomas |
| After Architecture | Technical approach and data model | Andrei |
| After Design | Design spec and UI flows | Robert |
| After Backend | API implementation and code review | Jonah, Sam |
| After Frontend | UI implementation against design | Alice |
| After QA | QA pass/fail verdict and test results | Enzo |

When the pipeline completes a phase and a gate is enabled for that phase, it pauses. The next phase does not start until you approve the review. Parallel phases (like design and backend, which run simultaneously) are handled independently -- enabling "After Design" does not block backend work, only the phases that depend on design (like frontend).

---

## Configuring Gates

Gates are configured per project on the **Projects** page.

1. Go to **Projects** and click a project to open its detail view.
2. Scroll to the **Review Gates** section (below project info, above work items).
3. Each gate has a toggle switch. Click a toggle to enable or disable that gate.

Toggles save immediately -- there is no save button. A brief "Saved" indicator flashes next to the section header to confirm.

You can change gate settings at any time, including while the pipeline is running. If you enable a gate for a phase that has already completed, it has no effect on that run. If you disable a gate that has a pending review, the review remains but the pipeline will not create new reviews for that gate on future runs.

**Tip:** For most projects, enabling "After Architecture" and "After Design" gives you the two highest-leverage review points -- you can course-correct the technical direction and the UI before implementation begins.

---

## Reviewing Deliverables

When the pipeline reaches an enabled gate, a review record is created and appears on the **Reviews** page. You can get there from the sidebar (look for the red badge showing the pending count) or from the dashboard's "Pending Reviews" metric card.

### The Reviews Page

The page has two panels:

- **Left panel** -- a list of reviews, filtered by status. The default filter is "Pending."
- **Right panel** -- the detail view for the selected review.

Click a review in the list to see its detail. The detail panel shows:

1. **Summary** -- a brief description of what the agent did and key decisions made.
2. **Deliverable viewer** -- the actual document rendered inline. For markdown files (research docs, requirements, tech approach, design spec), the full document is rendered with headings, code blocks, and tables. For code deliverables, a list of changed files is shown. For QA reports, the pass/fail verdict is shown prominently.
3. **Actions** -- Approve or Request Changes buttons (see next section).

If a review has multiple deliverables (e.g., a research phase that produced two docs), tabs appear above the viewer so you can switch between them.

### Filtering

Use the filter tabs in the header bar to view reviews by status:

- **Pending** -- reviews waiting for your action (default)
- **Approved** -- reviews you have already approved
- **Changes Requested** -- reviews where you requested changes and the agent is reworking
- **All** -- every review regardless of status

---

## Approving or Requesting Changes

### Approving a Review

1. Select the review and read the deliverable.
2. Click **Approve** (or press `A`).
3. A confirmation prompt appears: "Press A again to confirm" (or click Approve a second time). This prevents accidental approvals.
4. On the second click/press, the review is approved. The status pill turns green, and the pipeline resumes on the next heartbeat cycle.

After approval, if you are viewing the "Pending" filter, the approved review is removed from the list and the next pending review auto-selects.

### Requesting Changes

1. Select the review and read the deliverable.
2. Click **Request Changes** (or press `R`).
3. A feedback textarea expands below the buttons.
4. Write your feedback -- describe what needs to change. Be specific; the agent receives this text as context when it re-runs.
5. Click **Submit Feedback**.
6. The review status changes to "Changes Requested" (red pill). Your feedback is displayed in an amber panel above the action buttons.

What happens next: on the next heartbeat cycle, the pipeline re-runs the responsible agent with your feedback appended to the original task. When the agent finishes, the review resets to "Pending" for you to re-review. You can approve or request further changes.

### Canceling Feedback

If you opened the feedback textarea but decide not to submit, click **Cancel** or press `Escape`. The textarea collapses and nothing is saved.

---

## Keyboard Shortcuts

These shortcuts work on the Reviews page when you are not typing in the feedback textarea.

| Key | Action |
|-----|--------|
| `A` | Approve the selected review (press twice to confirm) |
| `R` | Open the Request Changes feedback area |
| `Escape` | Close the feedback textarea without submitting |
| `Arrow Up` / `Arrow Down` | Navigate the reviews list (when a list item is focused) |
| `Enter` or `Space` | Select the focused review |

---

## How Gates Interact with the Pipeline

### When a gate fires

1. The agent completes its phase (e.g., Andrei finishes the tech approach).
2. The heartbeat runner checks whether the project has a gate enabled for that phase.
3. If yes, a review record is created with the deliverable(s), agent name, and summary.
4. The pipeline pauses -- Thomas does not spawn the next phase.
5. The pending review count increments on the dashboard and sidebar badge.

### When you approve

1. The review status changes to "approved."
2. On the next heartbeat cycle, the runner sees no pending reviews blocking progress and advances to the next phase.
3. There is no instant resume -- the pipeline picks up on the next heartbeat, which typically runs within a few minutes.

### When you request changes

1. The review status changes to "changes-requested" with your feedback stored.
2. On the next heartbeat, the runner re-runs the responsible agent with the original task plus your feedback.
3. When the agent finishes, the review resets to "pending" for your re-review.
4. This cycle repeats until you approve.

### Parallel phases

Design and backend run in parallel (both start after architecture). If you enable "After Design" but not "After Backend," the design gate pauses only the phases that depend on design (frontend). Backend work proceeds unblocked. The reverse is also true.

### Projects without gates

If no gates are enabled (the default), the pipeline runs fully autonomously, exactly as it did before this feature existed. Existing projects are unaffected.

---

## Dashboard

The dashboard (`dashboard.html`) includes a **Pending Reviews** metric card. It shows the count of reviews with status "pending" across all projects. If the count is greater than zero, the card gets a subtle red border to draw attention. Click "View reviews" to go directly to the Reviews page.

---

## API Reference

These endpoints are available for agents and automation. All request and response bodies are JSON.

| Method | Path | Description |
|--------|------|-------------|
| `GET /api/reviews` | List all reviews. Supports `?status=pending` and `?projectSlug=review-gates` query filters. Returns `{ reviews: [...] }` sorted by creation date (newest first). |
| `GET /api/reviews/:id` | Get a single review by UUID. |
| `POST /api/reviews` | Create a review. Body: `{ projectId, projectSlug, projectName, gate, agent, summary, deliverables }`. Called by the heartbeat when a gate is reached. |
| `PATCH /api/reviews/:id` | Update review status. Body: `{ status: "approved" }` or `{ status: "changes-requested", feedback: "..." }`. Returns 409 if the review is already in a terminal state (approved, not-applicable). |
| `GET /api/projects/:id` | Returns project data including the `reviewGates` object (7 boolean fields). |
| `PATCH /api/projects/:id` | Update project. Accepts partial `reviewGates` in the body to toggle individual gates without overwriting others. |

### Review Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Gate reached, awaiting CEO review |
| `approved` | CEO approved, pipeline continues |
| `changes-requested` | CEO requested changes, agent reworking |
| `not-applicable` | Gate was configured but the phase was skipped |

### Gate Names

The `gate` field uses these values: `afterResearch`, `afterRequirements`, `afterArchitecture`, `afterDesign`, `afterBackend`, `afterFrontend`, `afterQA`.

---

## Known Limitations (v1)

These are intentionally deferred to a future version:

- **No agent chat at gates.** You cannot have a back-and-forth conversation with the agent at a review point. You can only approve or write feedback. Chat at gates is a strong v2 candidate.
- **No push notifications.** There is no email, Slack message, or browser notification when a review is pending. Check the Reviews page or dashboard when you want to review.
- **No review history or audit trail.** Reviews are updated in place. The event log captures key moments (gate reached, approved, changes requested) but there is no dedicated history view.
- **No code diff view.** Code deliverables show a list of changed files, not inline diffs.
- **No automatic screenshots.** Frontend deliverables do not include screenshots of the implementation.
