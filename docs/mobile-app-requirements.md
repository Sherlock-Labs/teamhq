# TeamHQ Mobile App — Requirements

**Author:** Thomas (Product Manager)
**Date:** 2026-02-07
**Status:** Draft v2 — revised to add voice-first project creation
**Revision note:** Voice creation, live transcription, and auto-session-trigger promoted to Phase 1 core. Phasing restructured.

---

## Overview

TeamHQ Mobile is a voice-first command interface and real-time monitor for the CEO's 12-agent AI product team. The CEO talks into their phone to create projects, and the team automatically starts working. The app shows live progress, surfaces results, and pushes notifications when work completes or needs input.

This is not a mobile port of the web app. It is a purpose-built companion optimized for two modes:

1. **Command mode** — speak a project brief into the phone, review the transcription, hit go. The team starts working automatically.
2. **Monitor mode** — glance at project status, check live session progress, read results. Glance-and-go.

The killer feature is the voice loop: **Voice → live transcription → project creation → auto-session → team runs the pipeline → push notification when done.** Everything else supports this loop.

## User

There is one user: the CEO. This is a personal tool, not a multi-user product. There is no authentication, no user accounts, no onboarding flow. The app connects directly to the existing TeamHQ Express API.

## Core Insight (Revised)

The original insight was that mobile is passive — monitoring and notifications. The CEO has corrected this. Mobile should be the **fastest way to kick off new work.** It's faster to talk for 30 seconds than to type a brief. The phone is always in your pocket. If you can speak a project into existence and have the team start working before you put the phone down, that changes the relationship with the tool entirely.

Monitor mode is still important. But command mode is the differentiator.

---

## Phase 1: Voice Creation + Project Dashboard + Team Overview

**Goal:** The CEO can speak a project into their phone and have the team start working on it automatically. They can also monitor all projects and see the team roster. This is the core loop.

### Features

#### 1.1 Voice Project Creation (THE KILLER FEATURE)

The CEO taps a prominent microphone button, speaks their project brief, reviews a live transcription, optionally edits it, and hits "Create & Run." A project is created with the transcript as the brief, a session is automatically started, and Thomas picks it up through the standard pipeline.

**Recording & Transcription UX:**

- Large, unmistakable microphone FAB on the Projects screen — this is the primary action
- Tap to start recording. The button transitions to a "recording" state (pulsing animation, waveform visualization)
- **Live transcription** appears on screen as the CEO speaks — text streams in word-by-word or phrase-by-phrase, not after a "processing..." delay
- Audio is sent to Voxtral Realtime in chunks; partial transcripts are rendered as they arrive
- Tap the stop button (or pause detection after ~2 seconds of silence) to end recording
- Final transcript is displayed in an editable text field for review/correction

**Transcription Engine:**

- **Voxtral Realtime** by Mistral — purpose-built for low-latency streaming transcription
- Sub-500ms latency target for partial transcript display (Voxtral supports configurable delay down to sub-200ms)
- Audio format: send chunks as the phone records (WebSocket or chunked HTTP to the backend, which proxies to Voxtral API)
- The backend handles the Voxtral API key and connection — the mobile app sends audio to our Express API, not directly to Mistral

**Post-Transcription Flow:**

1. Transcript appears in an editable text field with the full text
2. CEO can edit the text, or just review it
3. Auto-generated project name suggested from the transcript (first sentence or AI-extracted title — Kai should advise on the prompt)
4. CEO can override the project name
5. "Create & Go" button — creates the project AND starts a session in one tap
6. Also available: "Save Draft" button — creates the project without starting a session, for when the CEO wants to refine the brief later

**What Happens on "Create & Go":**

1. `POST /api/projects` — creates the project with the transcript as `brief`
2. `POST /api/projects/:id/sessions` — starts a session (which generates a kickoff prompt and spawns Claude → Thomas)
3. App navigates to the Project Detail screen showing "Session Running" indicator
4. The team pipeline runs autonomously from here

**Acceptance Criteria:**

- Live transcription text appears on screen within 500ms of speech (not after recording stops)
- Transcription accuracy is sufficient for natural speech project briefs (Voxtral's ~4% WER is acceptable)
- End-to-end time from tapping "Create & Go" to session starting is under 5 seconds
- Recording works reliably in quiet and moderately noisy environments
- Audio permissions are requested clearly with explanation of why they're needed
- If Voxtral API is unreachable, show a clear error and offer manual text entry as fallback
- Transcript is editable before submission — typos and misheard words can be corrected
- Project name auto-suggestion works and can be overridden
- The "Create & Go" flow results in a running session visible on the Project Detail screen

#### 1.2 Project List Screen (Home)

- Display all projects from the API, sorted by most recently updated
- Each project card shows: name, status badge (Planned / In Progress / Completed), brief excerpt, last updated timestamp
- Pull-to-refresh to reload the list
- Status filter: All / Planned / In Progress / Completed (segmented control or chips)
- Empty state when no projects exist
- **Prominent microphone FAB** — always visible, overlaying the bottom-right of the list. This is the entry point for voice creation.
- Tapping a project card navigates to the Project Detail screen

**Acceptance Criteria:**

- Projects load from `GET /api/projects` within 2 seconds on a reasonable connection
- Pull-to-refresh works smoothly with haptic feedback
- Status filter works client-side (no extra API call)
- Card design follows the TeamHQ dark theme (zinc/indigo tokens)
- Microphone FAB is visually prominent and always accessible (doesn't scroll away)

#### 1.3 Project Detail Screen

- Shows project name, status, description, brief, goals, constraints
- Notes section: list of existing notes with timestamps, ability to add a new note
- Sessions section: list of past sessions (from `GET /api/projects/:id/sessions`) with status and duration
- If a session is currently active (`activeSessionId` is set), show a prominent "Session Running" indicator with a pulsing animation
- Edit button to update project name, description, status (modal or inline)
- **Quick session start:** Button to start a new session on this project (calls `POST /api/projects/:id/sessions`)

**Acceptance Criteria:**

- Full project data loads from `GET /api/projects/:id`
- Adding a note calls `POST /api/projects/:id/notes` and updates the list optimistically
- Session list shows status badges (running / completed / failed / timed-out)
- Active session indicator is visually prominent (pulsing dot or similar)
- Session start button shows confirmation before triggering

#### 1.4 Team Roster Screen

- Grid or list of all 12 agents with avatar, name, and role
- Tapping an agent shows a brief bio (from the card descriptions on the web landing page)
- No interactive features in Phase 1 — this is informational

**Acceptance Criteria:**

- All 12 agents displayed with correct avatars, names, and roles
- Avatars render correctly from the existing SVG files (or rasterized versions if SVG performance is an issue)
- Layout works on both phone sizes (iPhone SE through iPhone 16 Pro Max, comparable Android range)

#### 1.5 Bottom Tab Navigation

- Three tabs: **Projects** (home), **Team**, **Settings**
- Projects tab shows the project list with the mic FAB; Team tab shows the roster; Settings tab has API connection config
- Active tab indicator uses the indigo accent color

**Acceptance Criteria:**

- Tab bar follows iOS/Android platform conventions (safe area, sizing)
- Smooth transitions between tabs
- Tab state is preserved when switching (e.g., scroll position, filter selection)

#### 1.6 Settings Screen (Functional in Phase 1)

Settings is NOT a placeholder in Phase 1 — it's needed for the networking bridge.

- **API Base URL configuration** — text field with the current URL, "Test Connection" button
- Pre-populated with sensible default (`http://localhost:3002` for simulator)
- Instructions for connecting via local network IP or Tailscale hostname
- **Voxtral API status** — indicator showing whether the transcription service is reachable (via a health-check endpoint on our backend)
- Connection status indicator (green/red dot) visible at the top of the screen or in the tab bar

**Acceptance Criteria:**

- Changing the API base URL persists across app restarts (AsyncStorage or equivalent)
- "Test Connection" hits `GET /api/projects` and shows success/failure
- Clear instructions help the CEO configure the network bridge on first launch

### Technical Constraints (Phase 1)

**Mobile Stack:**
- React Native + Expo (managed workflow), Expo Router, TypeScript strict mode
- Expo AV for audio recording (or expo-audio if it offers better streaming support)
- React Query (TanStack Query) for server state, Zustand for client state

**Voice/Transcription Architecture:**
- Audio recording on the phone → stream audio chunks to TeamHQ Express API → Express proxies to Voxtral Realtime API → partial transcripts streamed back to the phone
- The phone does NOT call Voxtral directly. The backend owns the API key and acts as a proxy. This keeps the key off the device and lets us swap transcription providers later.
- WebSocket connection between phone and Express for the real-time audio/transcript stream (HTTP chunked transfer is an alternative — Andrei should evaluate)
- Voxtral Realtime API: streaming endpoint, audio chunks in, partial transcripts out. Marco should research the exact API contract (WebSocket vs HTTP streaming, audio format requirements, chunk size guidance).

**Networking Bridge (Phone → Mac):**
- The Express API runs on the CEO's Mac at port 3002
- **Development:** iOS simulator uses `localhost`. Physical device on same WiFi uses Mac's local IP (e.g., `192.168.1.x:3002`)
- **Personal deployment (recommended):** Tailscale — the Mac gets a stable hostname (e.g., `ceo-mac.tailnet:3002`), reachable from the phone anywhere. No port forwarding, no cloud deploy needed.
- **Future option:** Cloud deployment of the Express API. More complex, not needed for Phase 1.
- The Settings screen lets the CEO configure which URL to use. This is a networking config issue, not a code issue — the app just needs a configurable base URL.

**Backend Changes Required (Phase 1 — minimal):**
- New `POST /api/voice/transcribe` WebSocket endpoint — accepts audio stream from mobile, proxies to Voxtral Realtime, streams partial transcripts back
- New `GET /api/voice/health` endpoint — checks Voxtral API reachability (for the Settings screen status indicator)
- Voxtral API key stored in `.env` on the server (like the existing Gemini key pattern)
- **No changes to existing project/session endpoints** — the voice flow uses `POST /api/projects` and `POST /api/projects/:id/sessions` as-is

**Offline:** Not required for Phase 1. Show a clear "no connection" state if the API is unreachable.

### Out of Scope (Phase 1)

- Live session event streaming (watching agent work in real-time) — Phase 2
- Push notifications — Phase 2
- Session stop/message controls — Phase 2
- Meeting management
- Docs viewer
- Dark/light theme toggle (dark only, matching web)

---

## Phase 2: Live Sessions, Push Notifications & Session Controls

**Goal:** Let the CEO watch sessions run in real-time, get notified when work completes, and control sessions from the phone.

### Features

#### 2.1 Live Session Feed

- When a session is active, tapping into the project shows a live feed of session events
- Connect to the SSE endpoint (`GET /api/projects/:id/sessions/:sessionId/events`)
- Show agent activity in real-time: which agent is working, what tools they're using, key decisions
- Simplified event rendering compared to web — focus on semantic events (agent spawns, messages, completions) not every tool call
- Auto-scroll with manual scroll-lock (same pattern as web)

#### 2.2 Push Notifications

- Notify when a session completes (with a summary of what was done)
- Notify when a session fails (with error context)
- Notify when an agent needs CEO input (detected via session events)
- This closes the voice creation loop: speak → team works → phone buzzes when it's done
- Requires Expo Push Notifications + a backend notification dispatch service

#### 2.3 Session Controls

- Stop a running session (calls `POST /api/projects/:id/sessions/:sessionId/stop`)
- Send a follow-up message to a running session (calls `POST /api/projects/:id/sessions/:sessionId/message`)
- Confirmation dialogs for destructive actions (stop)

#### 2.4 Voice Follow-Up Messages

- Same voice transcription flow, but for sending messages to a running session instead of creating a new project
- Mic button on the active session screen → transcribe → send as follow-up message
- Reuses the same Voxtral streaming infrastructure from Phase 1

### Technical Notes (Phase 2)

- SSE consumption on React Native requires `react-native-sse` or a polyfill — Marco should research options
- Push notifications require Expo Push Notifications + a backend service to register device tokens and dispatch
- Session controls touch critical operations — confirmation UIs are mandatory

---

## Phase 3: Docs, Meetings & Polish

**Goal:** Bring the remaining web features to mobile for a complete experience.

### Features

#### 3.1 Docs Viewer

- Browse docs grouped by project (from `GET /api/docs`)
- Read individual docs with markdown rendering (from `GET /api/docs/:path`)
- Search across docs

#### 3.2 Meeting Viewer

- List past meetings with type badge and summary
- View meeting transcripts with agent avatars and formatted messages
- Trigger a new meeting from mobile (charter or weekly)

#### 3.3 Advanced Settings

- Theme selection (if we add light mode)
- Notification preferences (on/off per type)
- Transcription language selection (Voxtral supports 13 languages — English default)

#### 3.4 Voice Refinements

- Voice-to-text for note-taking on projects (add notes by speaking)
- Configurable silence detection threshold
- Transcript history / recent voice commands

---

## Design Direction

The mobile app should feel like a natural extension of the TeamHQ web experience:

- **Dark theme** — zinc backgrounds, indigo accents, same as web
- **Card-based layouts** — project cards, agent cards, session cards
- **Minimal chrome** — let the content breathe. No heavy headers or decorative elements.
- **Platform-native feel** — use iOS and Android conventions where they differ (navigation patterns, haptics, system fonts). Don't force one platform's patterns on the other.
- **Glanceable** — status should be visible at a glance. Use color-coded badges, progress indicators, and clear typography hierarchy.
- **Voice-forward** — the microphone FAB is the most prominent interactive element on the home screen. It should feel like the app is inviting you to speak. The recording/transcription experience should feel magical — live text appearing as you talk.

**Voice UX States (Robert should spec these in detail):**

1. **Idle** — Mic FAB visible, ready to tap
2. **Recording** — Full-screen or modal overlay. Pulsing mic icon, audio waveform visualization, live transcript text streaming in below
3. **Review** — Recording complete. Full transcript in editable text field, auto-generated project name, "Create & Go" and "Save Draft" buttons
4. **Creating** — Brief loading state while project + session are created (should be <5 seconds)
5. **Error** — Voxtral unreachable, network error, or recording failure. Clear message + fallback to manual text entry

Robert should define the full design spec, but this gives him the direction to work within.

---

## Team Assignments

### Phase 1 Pipeline

1. **Marco (Tech Researcher)** — Research Voxtral Realtime API integration: exact API contract (WebSocket vs HTTP streaming), audio format/encoding requirements, chunk size guidance, React Native audio streaming patterns, and recommended libraries. Write findings in `docs/mobile-app-voxtral-research.md`. This unblocks Andrei and Jonah.

2. **Andrei (Arch)** — Define the mobile project structure, navigation architecture, state management approach, API client setup, voice/transcription architecture (phone → Express → Voxtral data flow), WebSocket design for audio streaming, and how the mobile app fits into the existing repo. Write `docs/mobile-app-tech-approach.md`. Blocked by Marco's research.

3. **Kai (AI Engineer)** — Design the prompt that extracts a project name from a voice transcript. Should be concise, handle rambling speech gracefully, and produce clean 3-8 word project names. Also advise on whether any transcript cleaning/formatting is needed before it becomes the project brief. Write findings in `docs/mobile-app-voice-prompts.md`. Can run in parallel with Marco/Andrei.

4. **Robert (Designer)** — Design all Phase 1 screens including the five voice UX states (idle, recording, review, creating, error). Spec the waveform visualization, transcript streaming animation, and the transition between states. Write `docs/mobile-app-design-spec.md`. Blocked by Andrei's tech approach.

5. **Jonah (BE)** — Build the voice transcription proxy endpoints: WebSocket `/api/voice/transcribe` (audio in, partial transcripts out) and `GET /api/voice/health`. Wire up the Voxtral Realtime API client. Blocked by Marco's research and Andrei's tech approach.

6. **Zara (Mobile-1)** — Build the voice recording/transcription flow, project creation, project list screen, project detail screen, bottom tabs, and API integration. Focus on the voice UX, data flow, and platform-correct behavior. Blocked by Andrei's tech approach, Robert's design spec, and Jonah's backend endpoints.

7. **Leo (Mobile-2)** — Build the team roster screen, shared components (cards, badges, headers), settings screen with connection config, and polish animations/transitions. Focus on visual polish and interaction quality. Blocked by Andrei's tech approach and Robert's design spec.

8. **Robert (Designer)** — Lightweight visual review of implementation against spec. Blocked by Zara + Leo completing implementation.

9. **Enzo (QA)** — Full QA pass: both platforms, all screen sizes, all states (including voice error states), accessibility, voice transcription accuracy spot-check. Blocked by Robert's design review passing.

### Dependencies (Revised)

```
Marco (research)  ──┬──→ Andrei (arch) ──┬──→ Robert (design) ──→ Zara + Leo (impl, parallel) ──→ Robert (review) ──→ Enzo (QA)
                    │                     │
                    └──→ Jonah (BE) ──────┘

Kai (voice prompts) ──→ Zara (needs prompt for project name extraction)
```

- Marco is blocked by this requirements doc (now unblocked)
- Andrei is blocked by Marco's research
- Kai can start immediately (parallel with Marco)
- Robert (design) is blocked by Andrei's tech approach
- Jonah is blocked by Marco's research and Andrei's tech approach
- Zara and Leo are blocked by Andrei + Robert
- Zara is additionally blocked by Jonah's backend endpoints (needs the voice proxy to exist)
- Zara needs Kai's prompt for the project name auto-suggestion feature
- Robert's design review is blocked by Zara + Leo completing implementation
- Enzo is blocked by Robert's design review passing

### Who Is NOT Needed (Phase 1)

- **Alice (FE)** — No web changes needed
- **Priya (Marketer)** — Internal tool, no marketing needed
- **Nadia (Writer)** — Documentation can wait until after Phase 1 ships
- **Yuki (Analyst)** — No data analysis needed yet
- **Suki (Researcher)** — No market research needed — we know what we're building

---

## Success Criteria

Phase 1 is successful when:

1. The CEO can open the app, tap the mic, speak a project brief, and see live transcription text streaming in as they talk
2. The CEO can review/edit the transcript, tap "Create & Go," and a session starts automatically within 5 seconds
3. The team pipeline (Thomas → agents) runs from the voice-created project without any manual web app intervention
4. The CEO can see all projects with current status on the Project List screen
5. The CEO can tap into a project and see its full details, notes, and session history
6. The CEO can see the full team roster with avatars and roles
7. The app connects to the Express API over local network or Tailscale without issues
8. The app feels native on both iOS and Android (no web-view jank)
9. Enzo gives a QA pass

---

## Open Questions

1. **Repo structure:** Should the mobile app live inside the existing `teamhq` repo (e.g., `mobile/` directory) or in a separate repo? Andrei should decide.
2. **Voxtral API contract:** What is the exact streaming protocol — WebSocket, HTTP chunked, or SSE? What audio format/encoding does it expect? What's the minimum chunk size for useful partial transcripts? Marco to research.
3. **Audio streaming from React Native:** Can Expo AV stream audio chunks in real-time, or do we need a different library? What's the best approach for sending audio to a WebSocket while recording? Marco to research.
4. **SVG avatars:** React Native SVG rendering can be finicky. We should test early whether the existing SVGs render correctly or if we need rasterized fallbacks. Zara/Leo should flag this early.
5. **Project name extraction:** How sophisticated does the prompt need to be? Simple heuristic (first noun phrase) vs. Claude-powered extraction? Kai to advise — keep it fast, the user is waiting.
6. **Silence detection:** Should the app auto-stop recording after N seconds of silence, or require an explicit tap? Robert should spec this in the design. I lean toward auto-stop with a clear visual countdown, but the tap-to-stop should always be available.
