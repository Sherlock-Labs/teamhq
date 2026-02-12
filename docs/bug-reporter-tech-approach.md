# Bug Reporter -- Technical Approach

**Project ID:** `bug-reporter`
**Author:** Andrei (Arch)
**Date:** 2026-02-12
**Status:** Defined

---

## Overview

The Bug Reporter is a floating widget that lives on every TeamHQ page (except index.html). It captures a screenshot, records a voice note, transcribes it via AI, and auto-files a bug work item -- all without leaving the current page. This document defines the technical approach for both the client-side widget and the server-side endpoint.

## Architecture Summary

```
Client (browser)                         Server (Express, port 3002)
-----------------                        ---------------------------
bug-reporter.js                          GET /api/scribe-token
  - html2canvas screenshot capture         - Returns single-use ElevenLabs token
  - MediaRecorder + WebSocket streaming
  - ElevenLabs Scribe v2 Realtime        POST /api/bug-reports
    (live transcription via WebSocket)     - Screenshot saved to filesystem
  - Panel UI (popover)                     - Work item created via putWorkItems
  - JSON form submission                   - Returns created work item
```

The widget is a self-contained vanilla JS module loaded on every page. It lazy-loads its dependencies (html2canvas) only when the user opens the panel. Transcription happens client-side in real-time via a WebSocket connection to ElevenLabs Scribe v2 Realtime — words appear as the user speaks. The server generates single-use tokens for the WebSocket connection and handles bug report submission (screenshot saving + work item creation) via a simple JSON POST.

## Key Decisions

### Decision 1: Client-side live transcription via ElevenLabs Scribe v2 Realtime

**Choice:** ElevenLabs Scribe v2 Realtime — client-side WebSocket streaming transcription

**How it works:** The client connects to `wss://api.elevenlabs.io/v1/speech-to-text/realtime` with a single-use token. As the user speaks, audio chunks are streamed to ElevenLabs and partial transcripts appear in real-time (~150ms latency). When the user stops recording, the final transcript is already complete — no waiting.

**Alternatives considered:**
- **ElevenLabs Scribe v2 batch REST API** -- Server-side, simpler code path. Rejected: the user would have to wait for transcription after finishing their recording. Realtime gives a dramatically better UX — words appear as you speak.
- **Client-side Web Speech API** -- Free and instant, but inconsistent across browsers and not available in Firefox. Rejected: too unreliable.
- **OpenAI Whisper API** -- New API key needed when we already have ELEVENLABS_API_KEY. Rejected.

**Rationale:** The realtime model gives the best possible UX. The user sees their words appear live as they speak, and by the time they stop recording, the transcription is done. No loading spinner, no "Transcribing..." wait. The API key is already configured — we just need a server endpoint to generate single-use tokens (API key never exposed to browser).

**Authentication flow:**
```
1. Client clicks Record
2. Client fetches GET /api/scribe-token (server generates single-use token)
3. Client opens WebSocket to ElevenLabs with token
4. Client streams audio chunks via WebSocket
5. ElevenLabs sends partial/committed transcripts back via WebSocket
6. Text appears in the description field in real-time
```

**Server-side token generation:**
```typescript
// GET /api/scribe-token
router.get("/scribe-token", async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const response = await fetch("https://api.elevenlabs.io/v1/tokens/single-use", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ scope: "realtime_scribe" }),
  });
  const token = await response.json();
  res.json(token);
});
```

**Client-side WebSocket connection:**
```javascript
// Connect to ElevenLabs Scribe Realtime
const ws = new WebSocket(
  `wss://api.elevenlabs.io/v1/speech-to-text/realtime?token=${token}&model_id=scribe_v2_realtime`
);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "partial_transcript") {
    // Update text area with interim text (grey/italic)
    this.descriptionEl.value = this.committedText + data.text;
  } else if (data.type === "committed_transcript") {
    // Finalize this segment
    this.committedText += data.text + " ";
    this.descriptionEl.value = this.committedText;
  }
};

// Send audio chunks from MediaRecorder
mediaRecorder.ondataavailable = async (event) => {
  const arrayBuffer = await event.data.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  ws.send(JSON.stringify({ audio_base64: base64 }));
};
```

**Token security:** Single-use tokens expire after 15 minutes and are scoped to `realtime_scribe` only. The ELEVENLABS_API_KEY never leaves the server.

**Cost note:** ElevenLabs charges per minute of audio. With the 30-second cap per recording, costs are minimal. No billing surprises.

### Decision 2: html2canvas for screenshot capture

**Choice:** html2canvas (CDN, lazy-loaded)

**Alternatives considered:**
- **Native Screen Capture API (getDisplayMedia)** -- Requires user to grant screen sharing permission via a system dialog. Too much friction for a quick bug report. Rejected.
- **dom-to-image / dom-to-image-more** -- Similar capability to html2canvas but less maintained and documented. Rejected: html2canvas is the boring standard.
- **Canvas-based manual rendering** -- Too much work for v1. Rejected.

**Rationale:** html2canvas is the de facto standard for client-side page screenshots. It has been around since 2013, has 31k+ GitHub stars, and is well-documented. It renders the DOM to a canvas element -- not pixel-perfect for every CSS feature (backdrop-filter, complex SVGs), but good enough to capture the visual context of a bug. Thomas's requirements explicitly accept this limitation.

**Loading strategy:** Do NOT include html2canvas in the initial page load. Load it dynamically when the user first opens the bug reporter panel:
```javascript
async function loadHtml2Canvas() {
  if (window.html2canvas) return window.html2canvas;
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
  document.head.appendChild(script);
  return new Promise((resolve) => {
    script.onload = () => resolve(window.html2canvas);
  });
}
```

### Decision 3: JSON request body (no multer needed)

**Choice:** Standard `express.json()` with an increased size limit for the screenshot data URL.

**Rationale:** With transcription happening client-side via WebSocket, the server no longer receives audio files. The POST /api/bug-reports payload is all strings: description text, screenshot data URL (base64), page URL, and project slug. This fits naturally in a JSON body — no multipart form, no multer, no new npm dependencies.

**Size limit:** A 1920x1080 screenshot at 1x scale produces a ~500KB-1MB base64 data URL. Set `express.json({ limit: "5mb" })` on the bug-reports route to accommodate this comfortably.

### Decision 4: Vanilla JS class pattern for the widget

**Choice:** Single-class widget (`BugReporter`) in `js/bug-reporter.js`, matching the existing pattern used by `ThqSpreadsheet` in `js/spreadsheet.js`.

**Rationale:** TeamHQ's front-end is plain HTML/CSS/vanilla JS -- no frameworks. The bug reporter follows the same pattern: a self-contained JS class that manages its own DOM, state, and event listeners. This is consistent with the codebase and avoids introducing any new client-side dependencies beyond html2canvas.

### Decision 5: Screenshot storage on local filesystem

**Choice:** Save screenshots as PNG files in `data/bug-screenshots/` with timestamped filenames.

**Rationale:** Per Thomas's requirements, local filesystem storage is the v1 approach. No R2 integration needed. The server creates the directory if it does not exist (same pattern used by `data/work-items/`). Screenshots are served as static files via Express's existing `express.static(projectRoot)` middleware -- no new route needed.

**Filename format:** `{timestamp}-{random-8-chars}.png` (e.g., `1739404800000-a1b2c3d4.png`)

**Cleanup:** Not in scope for v1. Thomas noted this as a v2 concern. File accumulation is manageable for an internal tool.

### Decision 6: Client-side transcription, server-side submission

**Choice:** Transcription is fully client-side (WebSocket to ElevenLabs). Submission is a simple JSON POST to the server (text + screenshot + metadata).

**Rationale:** Clean separation of concerns. The client handles the interactive, real-time part (recording + live transcription). The server handles the durable part (saving screenshot, creating work item). The API key never leaves the server — single-use tokens handle client auth. If ElevenLabs Realtime is down, the user can still type a description manually and submit.

---

## API Contract

### GET /api/scribe-token

Generates a single-use token for the ElevenLabs Scribe v2 Realtime WebSocket connection. Called by the client when the user starts recording.

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error responses:**
- `500` -- ELEVENLABS_API_KEY not configured or ElevenLabs API error

**Security:** The token is scoped to `realtime_scribe` and expires after 15 minutes. The ELEVENLABS_API_KEY never leaves the server.

### POST /api/bug-reports

Receives the completed bug report (transcription already done client-side) and creates the work item.

**Content-Type:** `application/json`

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | No | Transcribed or manually typed bug description |
| `screenshotDataUrl` | string | No | Base64 data URL of the screenshot (PNG) |
| `pageUrl` | string | Yes | URL of the page where the bug was reported |
| `projectSlug` | string | Yes | Which project to file the bug under |

**At least `description` or `screenshotDataUrl` must be provided.** A title-only submission (generated from description) is valid.

**Response (200):**
```json
{
  "workItem": {
    "id": "BR-6",
    "title": "Button click does not open modal on projects page",
    "description": "When I click the create project button, nothing happens. The modal doesn't open. I'm on the projects page.",
    "status": "planned",
    "phase": "v1",
    "owner": "",
    "priority": "medium",
    "type": "bug",
    "metadata": {
      "pageUrl": "http://localhost:3002/projects.html",
      "screenshotPath": "data/bug-screenshots/1739404800000-a1b2c3d4.png",
      "timestamp": "2026-02-12T18:00:00.000Z",
      "userAgent": "Mozilla/5.0 ..."
    },
    "createdBy": "Bug Reporter"
  }
}
```

**Error responses:**
- `400` -- Missing required fields or no description/screenshot provided
- `500` -- Server error (screenshot save failure is non-blocking; work item creation failure returns 500)

**Server-side flow:**
1. Parse JSON body (express.json with 5MB limit for screenshot data URLs)
2. Generate title: first ~60 characters of description, or "Bug on [page name]" as fallback
3. If `screenshotDataUrl` is provided, decode base64, save as PNG to `data/bug-screenshots/`
4. Create work item via existing `putWorkItems()` function with type "bug" and metadata
5. Return the created work item

### Title Generation

The title is auto-generated from the description. Simple string truncation -- no AI needed:

```typescript
function generateBugTitle(description: string, pageUrl: string): string {
  if (description && description.trim().length > 0) {
    const trimmed = description.trim();
    if (trimmed.length <= 60) return trimmed;
    // Cut at last word boundary before 60 chars
    const cut = trimmed.substring(0, 60);
    const lastSpace = cut.lastIndexOf(" ");
    return (lastSpace > 20 ? cut.substring(0, lastSpace) : cut) + "...";
  }
  // Fallback: extract page name from URL
  try {
    const path = new URL(pageUrl).pathname;
    const page = path.split("/").pop()?.replace(".html", "") || "unknown";
    return `Bug on ${page} page`;
  } catch {
    return "Bug report";
  }
}
```

---

## Schema Changes

### WorkItem Schema (`server/src/schemas/workItem.ts`)

Add two optional fields with backward-compatible defaults:

```typescript
// Add to WorkItemSchema
type: z.enum(["task", "bug", "feature"]).default("task"),
metadata: z.record(z.string()).default({}),
```

These fields are additive. Existing work items will parse correctly with the defaults. No migration needed.

---

## File-by-File Plan

### New Files

| File | Purpose |
|------|---------|
| `server/src/routes/bugReports.ts` | **[New]** Express router with GET /api/scribe-token and POST /api/bug-reports. Token generation, screenshot saving, work item creation. |
| `js/bug-reporter.js` | **[New]** Client-side widget class (BugReporter). Manages the floating button, panel UI, screenshot capture, voice recording, and form submission. |
| `css/bug-reporter.css` | **[New]** Styles for the floating button, reporter panel, recording states, screenshot preview, and toast notification. |
| `data/bug-screenshots/` | **[New]** Directory for stored screenshot PNGs. Created automatically by the server on first save. Add `.gitkeep` so git tracks the directory. |

### Modified Files

| File | Classification | Change Description |
|------|---------------|-------------------|
| `server/src/schemas/workItem.ts` | **Modify** | Add `type` (enum, default "task") and `metadata` (Record<string,string>, default {}) fields to WorkItemSchema. Two new lines in the schema object. |
| `server/src/index.ts` | **Extend** | Import and register bugReports router: `import bugReportRoutes from "./routes/bugReports.js"` and `app.use("/api", bugReportRoutes)`. Two lines added. |
| `projects.html` | **Extend** | Add `<link rel="stylesheet" href="css/bug-reporter.css">` in head and `<script src="js/bug-reporter.js" defer></script>` before closing body. Add `<div id="bug-reporter-root"></div>` before closing body. |
| `tools.html` | **Extend** | Same three additions as projects.html. |
| `meetings.html` | **Extend** | Same three additions as projects.html. |
| `interviews.html` | **Extend** | Same three additions as projects.html. |
| `docs.html` | **Extend** | Same three additions as projects.html. |
| `spreadsheets.html` | **Extend** | Same three additions as projects.html. |
| `team.html` | **Extend** | Same three additions as projects.html. |
| `tasks.html` | **Extend** | Same three additions as projects.html. |

**No Restructure-classified files.** All modifications are additive. No early QA notification needed.

---

## Client-Side Architecture

### BugReporter Class

```
js/bug-reporter.js
├── class BugReporter
│   ├── constructor()          -- Create DOM, attach event listeners
│   ├── open()                 -- Show panel, trigger screenshot capture
│   ├── close()                -- Hide panel, reset state
│   ├── captureScreenshot()    -- Lazy-load html2canvas, render to canvas, store data URL
│   ├── startRecording()       -- Request mic, create MediaRecorder, start capture
│   ├── stopRecording()        -- Stop MediaRecorder, store blob
│   ├── submit()               -- Build FormData, POST to /api/bug-reports, show toast
│   ├── showToast(message, link) -- Brief success/error toast
│   └── destroy()              -- Cleanup (if ever needed)
│
└── Auto-init: new BugReporter() on DOMContentLoaded
```

### State Machine

The widget has a simple state machine:

```
CLOSED  →  OPEN (screenshot capturing)
        →  READY (screenshot done, waiting for input)
        →  RECORDING (voice capture + live transcription appearing in real-time)
        →  READY (recording stopped, transcription already complete — user can edit)
        →  SUBMITTING (JSON POST to server)
        →  SUCCESS (toast shown, auto-close)
        →  CLOSED
```

**Key difference from batch transcription:** There is no TRANSCRIBING state. Transcription happens live during RECORDING via the ElevenLabs WebSocket. By the time the user stops recording, the text is already there. This eliminates the biggest UX wait.

Error states return to READY with an inline error message. The user can always type manually, re-record, or retry.

### Keyboard Shortcut

`Cmd+Shift+B` (Mac) / `Ctrl+Shift+B` (Windows/Linux) toggles the panel. Registered via a global `keydown` listener in the constructor. Uses `event.metaKey || event.ctrlKey` for cross-platform support.

**Important:** `Ctrl+Shift+B` is the Chrome bookmarks shortcut on Windows. This is acceptable for an internal tool (the CEO uses Mac), but Alice should add a note in the code for awareness.

### Lazy Loading

The html2canvas library (~50KB gzipped) is loaded only when the panel opens for the first time. The bug reporter button itself is pure CSS/HTML -- zero JS overhead on page load. The `bug-reporter.js` file registers the button and keyboard shortcut, but defers all heavy work until first interaction.

### Recording + Live Transcription

Recording and transcription happen simultaneously via two parallel connections:

1. **MediaRecorder** captures audio from the microphone
2. **WebSocket** streams audio chunks to ElevenLabs Scribe v2 Realtime
3. **Partial transcripts** update the description field in real-time (~150ms latency)
4. **Committed transcripts** finalize segments as the user pauses

**Flow:**
1. User clicks Record → fetch single-use token from `GET /api/scribe-token`
2. Request microphone via `getUserMedia({ audio: true })`
3. Open WebSocket to `wss://api.elevenlabs.io/v1/speech-to-text/realtime?token=...&model_id=scribe_v2_realtime`
4. Create MediaRecorder with `mimeType: "audio/webm;codecs=opus"` and `timeslice: 250` (send chunks every 250ms)
5. `ondataavailable` → convert chunk to base64 → send via WebSocket
6. `ws.onmessage` → update description field with partial/committed text
7. 30-second hard cap via `setTimeout` that calls `recorder.stop()` + `ws.close()`
8. Visual timer counts up; warning state at 25 seconds (CSS class change, e.g., text turns orange)

**Graceful degradation:** If the WebSocket connection fails (network issue, token expired), the recording still works — the user just won't see live text. They can type their description manually after stopping.

### Screenshot Capture

```javascript
async captureScreenshot() {
  const html2canvas = await this.loadHtml2Canvas();
  // Hide the bug reporter panel before capturing
  this.panelEl.style.visibility = "hidden";
  const canvas = await html2canvas(document.body, {
    useCORS: true,
    scale: 1,          // 1x is sufficient for bug context
    logging: false,
    windowWidth: document.documentElement.scrollWidth,
    windowHeight: document.documentElement.scrollHeight,
  });
  this.panelEl.style.visibility = "visible";
  this.screenshotDataUrl = canvas.toDataURL("image/png");
}
```

The panel is hidden during capture so it does not appear in the screenshot. `scale: 1` keeps file sizes reasonable (a 1920x1080 page produces roughly a 500KB-1MB PNG).

---

## Server-Side Architecture

### New Route: `server/src/routes/bugReports.ts`

Two endpoints: token generation and bug report submission.

```typescript
import { Router, json } from "express";
import { getWorkItems, putWorkItems } from "../store/workItems.js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const router = Router();
const jsonParser = json({ limit: "5mb" }); // Large limit for screenshot data URLs

const SCREENSHOTS_DIR = join(import.meta.dirname, "../../../data/bug-screenshots");

// Generate single-use token for ElevenLabs Scribe Realtime
router.get("/scribe-token", async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ELEVENLABS_API_KEY not configured" });

  const response = await fetch("https://api.elevenlabs.io/v1/tokens/single-use", {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ scope: "realtime_scribe" }),
  });
  if (!response.ok) return res.status(500).json({ error: "Failed to generate token" });

  const token = await response.json();
  res.json(token);
});

// Submit bug report (transcription already done client-side)
router.post("/bug-reports", jsonParser, async (req, res) => {
  // 1. Validate required fields (pageUrl, projectSlug, at least description or screenshot)
  // 2. Save screenshot if provided
  // 3. Generate title from description
  // 4. Create work item via putWorkItems
  // 5. Return created work item
});
```

**No transcription module needed.** Transcription is handled entirely client-side via the ElevenLabs WebSocket. The server's only AI-related responsibility is generating the single-use token.

### Screenshot Saving

```typescript
async function saveScreenshot(dataUrl: string): Promise<string> {
  await mkdir(SCREENSHOTS_DIR, { recursive: true });

  // Strip data URL prefix: "data:image/png;base64,..."
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  const timestamp = Date.now();
  const random = randomBytes(4).toString("hex");
  const filename = `${timestamp}-${random}.png`;

  await writeFile(join(SCREENSHOTS_DIR, filename), buffer);
  return `data/bug-screenshots/${filename}`;
}
```

The returned path is relative to the project root, which means it can be served directly via Express's static file middleware. No new route needed to view screenshots.

---

## Error Handling Strategy

| Failure | Impact | Handling |
|---------|--------|----------|
| Screenshot capture fails (html2canvas error) | Non-blocking | Show "Screenshot unavailable" placeholder. User can retry or submit without screenshot. |
| Microphone permission denied | Non-blocking | Show message explaining how to grant permission. Fall back to text input. |
| MediaRecorder not supported | Non-blocking | Hide recording UI entirely. Show text input only. |
| ElevenLabs WebSocket fails | Non-blocking | Client falls back to manual text input. Recording still works (user just won't see live text). |
| Token generation fails | Non-blocking | Client skips live transcription, enables manual text input. Recording can still proceed without transcription. |
| Screenshot save fails (filesystem error) | Non-blocking | Log error, skip screenshot. Work item is created without screenshotPath in metadata. |
| Work item creation fails | Blocking | Return 500 error. Client shows "Failed to file bug. Try again." with retry button. User input is preserved. |
| Network error (client cannot reach server) | Blocking | Client shows error with retry button. Input preserved. |

**Design principle:** Only work item creation failure blocks submission. Everything else degrades gracefully. A bug report with just a typed title and no screenshot or transcription is still valuable.

---

## Dependencies

### New npm packages

**None.** With transcription handled client-side via WebSocket and the submission using JSON (not multipart), no new server dependencies are needed. The server uses Node.js built-in `fetch` for the token endpoint.

### CDN dependencies (client, lazy-loaded)

| Library | Version | CDN URL | Purpose |
|---------|---------|---------|---------|
| html2canvas | 1.4.1 | `https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js` | Client-side screenshot capture |

The server uses Node.js built-in `fetch` (available in Node 18+). The client uses browser-native MediaRecorder, WebSocket, and FormData APIs — no additional client-side libraries beyond html2canvas.

---

## Performance Considerations

1. **Zero page load impact.** The floating button is a lightweight CSS-only element. `bug-reporter.js` registers event listeners but does not initialize any heavy objects. html2canvas is lazy-loaded on first panel open.

2. **Screenshot capture is async.** The panel opens immediately with a shimmer placeholder. The screenshot renders in the background (~200-500ms for a typical TeamHQ page).

3. **Audio files stay small.** WebM/Opus at default quality produces ~16KB/second. A 30-second recording is ~500KB -- well within comfortable upload size.

4. **Live transcription eliminates post-recording wait.** With batch transcription, users wait 3-5 seconds after recording. With Scribe v2 Realtime, text appears live during recording (~150ms latency). By the time the user stops, the transcription is already complete.

---

## Testing Considerations for Enzo

Key areas to test:
- **Happy path:** Open panel, screenshot captures, record audio, live transcription appears as user speaks, edit text, submit, toast shows, work item created
- **No audio path:** Open panel, skip recording, type description manually, submit
- **Screenshot failure:** Simulate html2canvas failure (e.g., corrupt DOM), verify graceful fallback
- **Mic denied:** Deny microphone permission, verify text fallback appears
- **WebSocket failure:** Simulate token endpoint failure or WebSocket disconnect, verify manual input still works
- **30-second recording cap:** Record for 30 seconds, verify auto-stop and WebSocket close
- **Keyboard shortcut:** Cmd/Ctrl+Shift+B opens and closes the panel
- **Multiple pages:** Verify the widget loads and works on all 8 HTML pages
- **Schema backward compatibility:** Verify existing work items (without type/metadata fields) still load correctly
- **Screenshot file creation:** Verify PNG files appear in `data/bug-screenshots/`

---

## What This Approach Does NOT Include (v2 concerns)

- Annotation tools on screenshots
- Cloud storage (R2) for screenshots
- Auth-aware reporting (Clerk user ID)
- Duplicate detection
- Mobile-responsive widget
- Video recording
- Multi-project selection
- Notification on bug filing (Slack/email)
- Screenshot cleanup/rotation
