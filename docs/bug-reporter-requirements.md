# Bug Reporter — Requirements

**Project ID:** `bug-reporter`
**Author:** Thomas (PM)
**Date:** 2026-02-12
**Status:** Scoped

## Problem Statement

When the CEO or team members encounter bugs while using TeamHQ, there's no fast way to capture and file them. The current workflow requires manually creating a work item, typing a description, and losing context (what the page looked like, what just happened). Bugs get forgotten or under-described because reporting is friction-heavy.

## One-Sentence Pitch

A floating widget on every TeamHQ page that captures a screenshot, records a voice narration, transcribes it with AI, and auto-files a bug to the task tracker — all in under 10 seconds.

## Core Concept

A persistent, unobtrusive bug button lives in the corner of every TeamHQ page. Click it, and a compact reporter panel opens. The user can:

1. **Capture a screenshot** of the current page (auto-captured on open, retake available)
2. **Record a voice note** describing the bug (push-to-talk or toggle)
3. **AI transcribes** the voice note into a text description
4. **Submit** — auto-creates a work item with type "bug", the screenshot, transcription, current page URL, and timestamp

No forms to fill out. No switching context. Speak the bug, submit, done.

## User Stories

### US-1: Open Bug Reporter

**As a** TeamHQ user
**I want to** click a floating bug button on any page
**So that** I can quickly report a bug without leaving my current context

**Acceptance Criteria:**
- A floating button is visible in the bottom-right corner of every TeamHQ page (except index.html hub)
- The button has a bug icon and is visually distinct but not distracting
- Clicking the button opens the bug reporter panel as a popover/drawer above the button
- The button has a keyboard shortcut (Cmd/Ctrl + Shift + B) for power users
- Opening the reporter auto-captures a screenshot of the page (behind the panel)

**Interaction States:**
- Loading: Screenshot capture shows a brief shimmer/placeholder while the capture completes (typically < 500ms)
- Error: If screenshot capture fails, show "Screenshot unavailable" placeholder with a "Retry" button. Do not block the rest of the flow — voice note alone is still valuable.
- Disabled: N/A — button is always available
- Empty: N/A

### US-2: Record Voice Note

**As a** TeamHQ user
**I want to** record a voice description of the bug
**So that** I can describe what happened naturally without typing

**Acceptance Criteria:**
- A record button is prominently displayed in the reporter panel
- Clicking record starts audio capture via the browser's MediaRecorder API
- A visual indicator shows recording is active (pulsing dot, waveform, or timer)
- Clicking again (or the stop button) ends the recording
- The recording duration is capped at 30 seconds (timer counts up with a visual warning at 25s); recording auto-stops at the limit
- The user can re-record (replaces previous recording)
- If the browser denies microphone permission, show a clear message explaining how to grant it

**Interaction States:**
- Loading: N/A — recording starts immediately
- Error: If MediaRecorder is unavailable, hide the voice note section entirely and show a text input fallback ("Your browser doesn't support audio recording. Type your description instead.")
- Disabled: Record button is disabled while a transcription is in progress
- Empty: Before recording, show "Click to describe the bug with your voice" prompt text
- Form State: N/A

### US-3: AI Transcription

**As a** TeamHQ user
**I want** my voice note automatically transcribed to text
**So that** the bug report has a readable description without manual typing

**Acceptance Criteria:**
- After recording stops, transcription begins automatically (no extra button press)
- A loading state shows during transcription ("Transcribing...")
- The transcribed text appears in an editable text area
- The user can edit the transcription before submitting (fix AI mistakes)
- If the user skips voice recording entirely, they can type a description manually in the same text area

**Interaction States:**
- Loading: "Transcribing..." indicator with a spinner while the AI processes the audio. The Submit button is disabled during transcription.
- Error: If transcription fails, show the error inline ("Transcription failed. You can type your description manually.") and enable the text area for manual input. Do not block submission.
- Timeout: If transcription takes longer than 15 seconds, show "Still working..." message. If it exceeds 30 seconds, show error state and fall back to manual input.
- Disabled: Submit button is disabled while transcription is in progress
- Empty: Text area shows placeholder "Bug description will appear here after recording, or type manually"

### US-4: Submit Bug Report

**As a** TeamHQ user
**I want to** submit the bug with one click
**So that** it's filed in the task tracker with full context and I can get back to work

**Acceptance Criteria:**
- Submit button creates a new work item with:
  - **type:** "bug" (new field on WorkItem schema)
  - **title:** Auto-generated from first ~60 chars of transcription, or "Bug on [page name]" as fallback
  - **description:** Full transcription text
  - **status:** "planned"
  - **priority:** "medium" (default, user doesn't choose during quick report)
  - **createdBy:** "Bug Reporter" (or current user if auth exists)
  - **metadata:** { pageUrl, screenshotPath, timestamp, userAgent }
- The bug is filed to a designated project (configurable, defaults to a "Bugs" project)
- On success: panel closes, brief toast confirmation ("Bug filed!"), and a link to the task
- Screenshot is saved server-side (local filesystem, `data/bug-screenshots/`)
- The work item description includes a reference to the screenshot file

**Interaction States:**
- Loading: Submit button shows spinner, text changes to "Filing...", button is disabled
- Error: On failure, inline error "Failed to file bug. Try again." with a retry button. User's input is preserved.
- Disabled: Submit is disabled when: (a) transcription in progress, (b) no title text (description is optional — screenshot + title alone is a valid bug report)
- Empty: N/A
- Optimistic: N/A — wait for server confirmation before closing panel
- Timeout: If submission takes longer than 10 seconds, show "Still submitting..." If it exceeds 20 seconds, show error state.

### US-5: Screenshot Preview and Annotation (v1-lite)

**As a** TeamHQ user
**I want to** see the captured screenshot before submitting
**So that** I can verify it captured the right state

**Acceptance Criteria:**
- The auto-captured screenshot is displayed as a thumbnail in the reporter panel
- Clicking the thumbnail opens a larger preview
- A "Retake" button re-captures the screenshot
- v1 does NOT include annotation tools (drawing, arrows, highlights) — deferred

**Interaction States:**
- Loading: Shimmer placeholder while screenshot captures
- Error: "Screenshot unavailable" with Retake button if capture fails
- Disabled: N/A
- Empty: N/A

## Schema Changes

### WorkItem — New `type` field

Add an optional `type` field to the WorkItemSchema:

```
type: z.enum(["task", "bug", "feature"]).default("task")
```

This is backward-compatible — existing work items default to "task". The bug reporter creates items with type "bug". This field will be useful for future filtering in the task tracker.

### WorkItem — New `metadata` field

Add an optional `metadata` field for structured context:

```
metadata: z.record(z.string()).default({})
```

Used by the bug reporter to store: pageUrl, screenshotPath, timestamp, userAgent. Generic enough for other tools to use later.

## API Changes

### POST /api/bug-reports

New endpoint that handles the full bug report submission:

**Request:** multipart/form-data
- `audio` (file, optional) — the voice recording (webm/opus)
- `description` (string, optional) — manual text description (if no audio or post-edit)
- `screenshotDataUrl` (string) — base64 screenshot from canvas
- `pageUrl` (string) — URL of the page where the bug was reported
- `projectSlug` (string) — which project to file the bug under

**Response:**
```json
{
  "workItem": { ... },
  "transcription": "..."
}
```

**Behavior:**
1. If `audio` is provided, send to AI transcription (ElevenLabs Speech-to-Text or similar)
2. Save screenshot to `data/bug-screenshots/{timestamp}-{random}.png`
3. Create work item via existing `putWorkItems` function
4. Return the created work item

### Transcription

Use the ElevenLabs Speech-to-Text MCP server already configured in TeamHQ's stack. If that's not viable for server-side use, fall back to a simpler approach (Whisper API, or even client-side Web Speech API as a v1 shortcut). Andrei decides the implementation approach.

## Technical Constraints

- **Browser support:** Modern browsers only (Chrome, Firefox, Safari, Edge — latest 2 versions). MediaRecorder API and html2canvas/Canvas API are the constraints.
- **Screenshot capture:** Client-side only. Use html2canvas or similar. No server-side rendering.
- **Audio format:** WebM with Opus codec (MediaRecorder default). Keep recordings under 30 seconds / ~500KB.
- **Screenshot storage:** Local filesystem only for v1. No cloud storage (R2) — that's a v2 concern.
- **Transcription latency:** Target < 5 seconds for a 30-second recording. Show progress indicator regardless.
- **No auth dependency:** v1 works without Clerk auth. CreatedBy is a string label, not a user ID.
- **Performance:** The floating button must not affect page load performance. Lazy-load the reporter panel and its dependencies (html2canvas, etc.) only when the button is clicked.

## File Classification

| File | Classification | Notes |
|------|---------------|-------|
| `server/src/schemas/workItem.ts` | **Modify** | Add `type` and `metadata` fields to WorkItemSchema |
| `server/src/routes/bugReports.ts` | **New** | POST endpoint for bug report submission |
| `js/bug-reporter.js` | **New** | Floating widget, screenshot capture, voice recording, transcription UI |
| `css/bug-reporter.css` | **New** | Styles for the floating button and reporter panel |
| All page HTML files (7 files) | **Modify** | Add script/link tags for bug reporter assets + the floating button element |
| `data/bug-screenshots/` | **New** | Directory for stored screenshot images |
| `server/src/index.ts` (or app.ts) | **Modify** | Register new bugReports router |

**No Restructure-classified files.** All modifications are additive (new fields with defaults, new route registration). No existing functionality is affected.

## Out of Scope for v1

- **Annotation tools** (drawing, arrows, highlights on screenshot) — deferred to v2
- **Cloud screenshot storage** (R2) — local filesystem for v1
- **Auth-aware reporter** (auto-fill user from Clerk session) — v2
- **Bug triage workflow** (assign, prioritize, status changes from reporter) — use existing task tracker
- **Duplicate detection** — v2, after we have enough bugs filed to matter
- **Mobile support** — the floating widget is desktop-only for v1. Mobile users can use the task tracker directly.
- **Video recording** — voice + screenshot is sufficient for v1
- **Custom project selection** in the reporter — v1 files to a single configured "Bugs" project. Multi-project selection is v2.
- **Notification** on bug filing (Slack, email) — v2

## Pipeline Recommendation

This project needs:

1. **Andrei (Arch) + Kai (AI)** — tech approach for screenshot capture library, audio recording, transcription service choice, file upload handling. Kai advises on the AI transcription integration.
2. **Phase 4 — parallel:**
   - **Robert (Designer)** — design spec for the floating widget, reporter panel, recording UI, states
   - **Jonah (BE)** — POST /api/bug-reports endpoint, transcription integration, screenshot storage, schema changes
   - **Priya (Marketer)** — skip. Internal tool, no marketing copy needed.
3. **Alice (FE)** — implement the floating widget, screenshot capture, voice recording, transcription UI. This is UI-heavy work.
4. **Nina + Soren + Amara** — review. This is a UI-heavy floating component with recording interactions, responsive considerations (positioning), and a11y (keyboard shortcut, screen reader support for recording states).
5. **Robert + Nina + Soren + Amara** — design review
6. **Enzo (QA) + Nadia (Writer)** — parallel. QA is the release gate. Nadia writes usage docs.

**Skip:** Suki (no market research needed), Marco (Andrei covers tech decisions), Derek (no third-party integrations beyond what Jonah handles), Milo (no infra changes), Howard (no payments), Zara/Leo (no mobile), Sam (Jonah can handle BE alone — one endpoint).

## Risks

1. **Browser microphone permission** — first-time users will see a permission prompt. UX must handle denial gracefully.
2. **html2canvas limitations** — some CSS features (backdrop-filter, complex SVGs) may not render perfectly in screenshots. Acceptable for v1 — the screenshot gives context, not pixel-perfect reproduction.
3. **Transcription cost** — ElevenLabs charges per minute of audio. 30-second cap limits this, but we should monitor usage.
4. **Screenshot file accumulation** — local filesystem will grow over time. Add a note for v2 to implement cleanup or migration to R2.
