# Pipeline Review Gates — Requirements

**Author:** Thomas (PM)
**Date:** 2026-03-17
**Status:** Draft
**Source:** CEO directive (2026-03-17)

## Problem

The pipeline currently runs autonomously end-to-end. The CEO has no structured way to:
1. Specify which pipeline phases require their review before proceeding
2. View deliverables (research docs, design specs, code) at those checkpoints
3. Provide feedback or discuss with the team that produced the work

The result is that the CEO either gets the final output with no opportunity to course-correct mid-stream, or has to manually interrupt the pipeline by watching sessions.

## Solution

Add **Review Gates** to the TeamHQ pipeline — configurable checkpoints where the pipeline pauses, surfaces the deliverable, and lets the CEO review, provide feedback, or chat with the responsible agents before approving the next phase.

## Core User Flows

### 1. Configure Review Gates (per project)

When a project is created or at any point during its lifecycle, the CEO can specify which pipeline phases require review:

- **After Research** — Review Suki/Marco's research docs
- **After Requirements** — Review Thomas's requirements doc
- **After Architecture** — Review Andrei's tech approach
- **After Design** — Review Robert's design spec
- **After Backend** — Review API implementation (Atlas code review surfaces here)
- **After Frontend** — Review implementation against design
- **After QA** — Review QA results before shipping

Default: no gates (current behavior — fully autonomous). The CEO can toggle any combination.

**Data model addition to project:**
```json
{
  "reviewGates": {
    "afterResearch": false,
    "afterRequirements": false,
    "afterArchitecture": false,
    "afterDesign": true,
    "afterBackend": false,
    "afterFrontend": true,
    "afterQA": false
  }
}
```

### 2. Pipeline Pauses at Gate

When the pipeline reaches a configured gate:
1. The pipeline **pauses** — Thomas does not spawn the next phase
2. A **review item** is created with:
   - The deliverable(s) produced in that phase (links to docs, screenshots, code diffs)
   - The agent(s) who produced it
   - A summary of what was done and key decisions made
3. The CEO is **notified** (visible on dashboard, and optionally via heartbeat status)

### 3. Review & Feedback UI

A new **Reviews** page (or section within the project view) where the CEO can:

**View the deliverable:**
- For docs (research, requirements, design spec, tech approach): render the markdown inline with syntax highlighting
- For design specs: show any wireframes/mockups referenced
- For code: show a summary of files changed with key snippets
- For QA: show the pass/fail verdict and test results

**Provide feedback:**
- **Approve** — pipeline continues to next phase
- **Request Changes** — write feedback text, pipeline stays paused. The responsible agent(s) receive the feedback as context when they re-run.
- **Chat** — open a quick conversation with the agent(s) who produced the deliverable. This uses the existing meeting/interview infrastructure — a focused discussion where the CEO can ask questions, challenge decisions, and the agent responds with context from their work. When the CEO is satisfied, they approve.

### 4. Review Status Tracking

Each review gate has a status:
- `pending` — gate reached, awaiting CEO review
- `approved` — CEO approved, pipeline continues
- `changes-requested` — CEO requested changes, agent reworking
- `not-applicable` — gate was configured but phase was skipped (e.g., no research needed)

The project view shows the pipeline progress with gate statuses visible.

## Acceptance Criteria

### MVP (v1)

1. **Gate configuration** — CEO can set review gates on a project via the project settings UI (checkboxes for each phase)
2. **Gate data model** — `reviewGates` field on project, plus a `reviews` collection storing each gate's status, deliverable links, and feedback
3. **Review page** — A page that lists all pending reviews across projects, with the ability to view the deliverable inline
4. **Approve/Request Changes** — Two actions on each review. Approve advances the pipeline. Request Changes stores feedback text.
5. **Pipeline integration** — Thomas's heartbeat checks for gate configuration and pauses when a gate is reached. When approved, the next heartbeat picks up and continues.
6. **Dashboard visibility** — Pending reviews show on the dashboard with a count badge

### v1 Excludes (future)
- Chat with agents at review gates (requires extending the meeting system for ad-hoc 1:1 or small group chats — strong v2 candidate)
- Email/push notifications for pending reviews
- Review history and audit trail
- Automated screenshots of frontend implementations
- Diff view for code changes

## Technical Notes

- Review gates are stored as part of the project JSON (extends existing schema)
- Reviews are stored as a new data collection: `data/reviews/{project-slug}/` with one JSON file per gate instance
- The pipeline integration is primarily in Thomas's heartbeat logic — check for gates, create review items, pause/resume
- The review page is a new TeamHQ page (`reviews.html`) with API endpoints
- Deliverable rendering reuses the existing doc viewer pattern from `docs.html`
- Chat at gates (v2) can extend the existing custom meetings infrastructure

## API Endpoints

- `GET /api/reviews` — list all pending reviews (across projects)
- `GET /api/reviews/:projectId` — list reviews for a project
- `POST /api/reviews/:projectId/:gate` — create a review (called by pipeline when gate is reached)
- `PATCH /api/reviews/:projectId/:gate` — update review status (approve, request-changes with feedback)
- `GET /api/projects/:id` — existing endpoint, now includes `reviewGates` in response
- `PATCH /api/projects/:id` — existing endpoint, now accepts `reviewGates` updates

## Work Items

| ID | Title | Owner | Phase |
|----|-------|-------|-------|
| RG-1 | Write requirements doc | Thomas | Scope |
| RG-2 | Technical architecture | Andrei | Architecture |
| RG-3 | Design spec — review page and gate configuration UI | Robert | Design |
| RG-4 | Backend — review data model, API endpoints, pipeline integration | Jonah | Backend |
| RG-5 | Frontend — reviews page, project gate settings, deliverable viewer | Alice | Frontend |
| RG-6 | Pipeline integration — heartbeat gate checking and pause/resume | Thomas | Backend |
| RG-7 | Design review | Robert | Review |
| RG-8 | Code review | Atlas | Review |
| RG-9 | QA pass | Enzo | QA |
| RG-10 | Documentation | Nadia | Docs |
