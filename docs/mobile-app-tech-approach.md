# TeamHQ Mobile App — Technical Approach

**Author:** Andrei (Technical Architect)
**Date:** 2026-02-07
**Status:** Final
**Upstream:** `docs/mobile-app-requirements.md` (Thomas), `docs/mobile-app-voxtral-research.md` (Marco), `docs/mobile-app-voice-prompt-design.md` (Kai)
**Unblocks:** Robert (design spec), Jonah (backend), Zara + Leo (mobile implementation)

---

## 1. Repo Structure Decision

**The mobile app lives inside the existing `teamhq` repo as a `mobile/` directory.** It does NOT use npm workspaces — it has its own `package.json` and `node_modules`.

### Rationale

- Shares design tokens, avatar SVGs, and API type definitions with the web app (copy or symlink — see section 3)
- Co-located docs in `docs/` follow the established pattern
- One repo = one PR when backend voice endpoints and mobile app ship together
- The mobile app is lightweight enough (one user, internal tool) that a separate repo adds overhead without benefit

### Why Not npm Workspaces

The root `package.json` already has `"workspaces": ["server"]`. Adding `mobile/` as a workspace would couple Expo's dependency resolution with the web/server deps, causing version conflicts. Expo has its own pinned dependency versions managed by `npx expo install`. Keeping it isolated avoids this entirely.

### Project File Tree

```
mobile/
├── app/                          # Expo Router file-based routes
│   ├── _layout.tsx               # Root layout (providers, fonts, splash)
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Bottom tab navigator
│   │   ├── index.tsx             # Projects tab (home)
│   │   ├── team.tsx              # Team roster tab
│   │   └── settings.tsx          # Settings tab
│   └── project/
│       └── [id].tsx              # Project detail screen
├── components/
│   ├── ui/                       # Shared primitives (Button, Card, Badge, etc.)
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── LoadingScreen.tsx
│   │   ├── ErrorScreen.tsx
│   │   └── EmptyScreen.tsx
│   ├── projects/                 # Project-specific components
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectList.tsx
│   │   └── NotesList.tsx
│   ├── team/                     # Team-specific components
│   │   ├── AgentCard.tsx
│   │   └── AgentGrid.tsx
│   └── voice/                    # Voice recording components
│       ├── VoiceRecordingOverlay.tsx
│       ├── TranscriptView.tsx
│       ├── WaveformVisualizer.tsx
│       └── MicFAB.tsx
├── hooks/
│   ├── useProjects.ts            # TanStack Query hooks for projects
│   ├── useSessions.ts            # TanStack Query hooks for sessions
│   ├── useVoiceRecording.ts      # Audio recording + WebSocket streaming
│   └── useVoiceExtraction.ts     # POST /api/voice/extract integration
├── lib/
│   ├── api.ts                    # Fetch wrapper with configurable base URL
│   ├── tokens.ts                 # Design tokens (mirrored from css/tokens.css)
│   ├── constants.ts              # App constants (team roster data, etc.)
│   ├── storage.ts                # AsyncStorage helpers
│   ├── animation.ts              # Spring presets, enter/exit configs
│   └── websocket.ts              # WebSocket client for voice streaming
├── stores/
│   └── settings.ts               # Zustand store for API URL, app settings
├── types/
│   └── api.ts                    # TypeScript types mirroring server schemas
├── assets/
│   ├── fonts/                    # Inter font files
│   ├── avatars/                  # Rasterized agent avatars (PNG, from SVG)
│   ├── icon.png                  # App icon
│   └── splash.png                # Splash screen
├── app.config.ts                 # Expo config (dynamic)
├── eas.json                      # EAS Build profiles
├── package.json
├── tsconfig.json
└── .gitignore
```

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Expo (managed workflow) | Team standard. No ejecting. |
| Routing | Expo Router v4 | File-based routing, type-safe navigation |
| Language | TypeScript (strict) | Team standard |
| Server state | TanStack Query v5 | Caching, refetch, optimistic updates — proven on web projects |
| Client state | Zustand | Lightweight, no providers, TypeScript-friendly |
| Animations | React Native Reanimated v3 | UI-thread animations, 60fps. Team standard per `skills/development/mobile-animations.md` |
| Gestures | React Native Gesture Handler | Composable gesture system. Required by Reanimated |
| Audio capture | `@mykin-ai/expo-audio-stream` | Streams PCM chunks while recording. Purpose-built for our use case. See Marco's research |
| SVG rendering | Pre-rasterized PNGs | See section 10 |
| Images | `expo-image` | Built-in caching, transitions, better than `<Image>` |
| Haptics | `expo-haptics` | Pull-to-refresh feedback, button taps |
| Secure storage | `expo-secure-store` | Not needed Phase 1 (no auth), but available for future |
| Persistent storage | `@react-native-async-storage/async-storage` | Settings persistence (API URL) |

### Explicitly NOT Using

- NativeWind / Tailwind — adds a compilation layer. `StyleSheet.create()` with tokens is sufficient for 12 screens.
- Redux — overkill. Zustand + TanStack Query covers our needs.
- Expo Go — the audio streaming library requires native modules. Dev builds only.

---

## 3. Design Tokens

Design tokens are defined in `mobile/lib/tokens.ts`, mirrored from `css/tokens.css`. This is a manual copy, not a build-time sync. The mobile token values are numeric (React Native uses numbers, not rem/px strings).

The token file in `skills/development/mobile-component-patterns.md` already defines the correct mapping. Zara/Leo should use that as-is.

If tokens drift between web and mobile, that is acceptable. The mobile app is a companion, not a pixel-perfect clone. The important thing is visual consistency in the feel (dark zinc backgrounds, indigo accents), not identical values.

---

## 4. Navigation Architecture

```
Root Stack (_layout.tsx)
└── Tab Navigator ((tabs)/_layout.tsx)
    ├── Projects Tab (index.tsx)         ← Home. FlatList + Mic FAB
    ├── Team Tab (team.tsx)              ← Agent grid
    └── Settings Tab (settings.tsx)      ← API URL config

    Stack screens (pushed from tabs):
    └── Project Detail (project/[id].tsx)  ← Full project view
```

### Tab Configuration

Three tabs: **Projects** (house icon), **Team** (users icon), **Settings** (gear icon). Active tab indicator uses `tokens.accent` (#6366f1).

The tab bar uses `@react-navigation/bottom-tabs` via Expo Router's `Tabs` component. Standard configuration:

```tsx
// app/(tabs)/_layout.tsx
<Tabs screenOptions={{
  tabBarStyle: { backgroundColor: tokens.bgPrimary, borderTopColor: tokens.border },
  tabBarActiveTintColor: tokens.accent,
  tabBarInactiveTintColor: tokens.textMuted,
  headerShown: false,
}}>
```

### Voice Recording Overlay

The voice recording flow is a **full-screen modal**, not a bottom sheet. Triggered by the Mic FAB on the Projects tab. It overlays the current screen and has three states:

1. **Recording** — pulsing mic, waveform, live transcript
2. **Review** — editable transcript, project name field, Create & Go / Save Draft buttons
3. **Creating** — brief loading spinner while API calls complete

The modal is presented via Expo Router's `<Stack.Screen presentation="modal">` or via a React Native `<Modal>` component. I recommend a regular `<Modal>` from React Native here, since the voice overlay is a transient interaction that doesn't need to be a routable screen (no deep linking needed).

---

## 5. State Management

### Server State: TanStack Query

All API data flows through TanStack Query hooks. One query client configured in the root layout.

```tsx
// app/_layout.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,         // 30 seconds before refetch
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});
```

Key hooks:

| Hook | Query Key | Endpoint |
|------|-----------|----------|
| `useProjects()` | `["projects"]` | `GET /api/projects` |
| `useProject(id)` | `["projects", id]` | `GET /api/projects/:id` |
| `useSessions(projectId)` | `["sessions", projectId]` | `GET /api/projects/:id/sessions` |
| `useCreateProject()` | mutation | `POST /api/projects` |
| `useStartSession(projectId)` | mutation | `POST /api/projects/:id/sessions` |
| `useAddNote(projectId)` | mutation | `POST /api/projects/:id/notes` |

Mutations invalidate the relevant query keys on success. `useAddNote` uses optimistic updates (append note to cache immediately, roll back on error).

### Client State: Zustand

One store for settings:

```tsx
// stores/settings.ts
interface SettingsStore {
  apiUrl: string;
  setApiUrl: (url: string) => void;
  isConnected: boolean;
  setConnectionStatus: (connected: boolean) => void;
}
```

Persisted to AsyncStorage via Zustand's `persist` middleware. The API URL is read by the `apiFetch()` helper (see section 6).

---

## 6. API Client

The mobile app talks to the existing Express API. No authentication — this is a single-user tool running on a local network.

```ts
// lib/api.ts
import { useSettingsStore } from "../stores/settings";

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = useSettingsStore.getState().apiUrl;

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body);
  }

  return res.json();
}
```

### Base URL Configuration

The API URL is configurable in Settings and persisted to AsyncStorage. Default: `http://localhost:3002`.

| Environment | URL |
|-------------|-----|
| iOS Simulator | `http://localhost:3002` |
| Android Emulator | `http://10.0.2.2:3002` |
| Physical device (same WiFi) | `http://192.168.x.x:3002` (Mac's local IP) |
| Physical device (anywhere) | `http://ceo-mac.tailnet:3002` (Tailscale hostname) |

The Settings screen provides a "Test Connection" button that calls `GET /api/projects` and shows success/failure.

---

## 7. Voice Streaming Architecture

This is the most complex part of the system. The data flow has three segments: phone to Express, Express to Voxtral, and responses flowing back.

### Data Flow

```
Phone (Expo)                    Express Server                    Mistral Voxtral API
     |                                |                                   |
     |-- [1] WS connect ------------>|                                   |
     |   ws://host:3002/api/voice/   |                                   |
     |   transcribe                  |                                   |
     |                               |-- [2] WS connect --------------->|
     |                               |   wss://api.mistral.ai/...       |
     |                               |   Bearer: MISTRAL_API_KEY        |
     |                               |<-- [2a] session_created ---------|
     |<-- [2b] { type: "ready" } ----|                                   |
     |                               |                                   |
     |-- [3] { type: "audio",   ---->|                                   |
     |        data: "<base64>" }     |-- [3a] decode base64, forward -->|
     |                               |   raw PCM bytes                  |
     |                               |<-- [3b] TextDelta: "I want" ----|
     |<-- [3c] { type: "transcript", |                                   |
     |          text: "I want",      |                                   |
     |          final: false } ------|                                   |
     |                               |                                   |
     |   ... repeat for each chunk   |                                   |
     |                               |                                   |
     |-- [4] { type: "stop" } ------>|                                   |
     |                               |-- [4a] signal end of audio ----->|
     |                               |<-- [4b] StreamDone --------------|
     |<-- [4c] { type: "done",  -----|                                   |
     |          text: "full text" }  |                                   |
     |                               |                                   |
     |-- [5] WS close ------------->|-- [5a] WS close ----------------->|
```

### Phone-to-Server WebSocket Messages

**Client sends:**

```ts
// Start signal (implicit — connection opening is the start)
// No explicit start message needed

// Audio chunk
{ type: "audio", data: string }  // base64-encoded PCM (16kHz, 16-bit, mono)

// Stop recording
{ type: "stop" }
```

**Server sends:**

```ts
// Ready to receive audio
{ type: "ready" }

// Partial transcript
{ type: "transcript", text: string, final: false }

// Final transcript (after "stop" received and Voxtral finishes)
{ type: "done", text: string }

// Error
{ type: "error", message: string }
```

### Audio Format

| Parameter | Value |
|-----------|-------|
| Encoding | PCM signed 16-bit little-endian (`pcm_s16le`) |
| Sample rate | 16,000 Hz |
| Channels | 1 (mono) |
| Chunk interval | ~480ms (configurable in `@mykin-ai/expo-audio-stream`) |
| Chunk size | ~15,360 bytes per chunk (16000 * 2 * 0.48) |

The `@mykin-ai/expo-audio-stream` library delivers chunks via an `onAudioStream` callback as base64-encoded strings. The phone sends these directly over the WebSocket. The server decodes base64 to raw bytes before forwarding to Voxtral.

### Server-to-Voxtral Connection

**Decision: Direct WebSocket implementation using `ws`, not the Mistral Python SDK.**

Marco's research noted that the TypeScript SDK may not expose the realtime WebSocket API. Rather than adding a Python sidecar or waiting for SDK updates, Jonah should implement the Voxtral WebSocket protocol directly. The protocol is straightforward:

1. Open WebSocket to Mistral's realtime endpoint
2. Send configuration message (model, audio format, transcription delay)
3. Send PCM audio chunks as binary frames
4. Receive JSON text events (`TranscriptionStreamTextDelta`, `TranscriptionStreamDone`)
5. Close when done

This keeps the entire backend in Node.js/TypeScript with no Python dependency.

**Transcription delay:** Use 480ms (the recommended sweet spot from Marco's research). This matches the offline model's accuracy.

**Language:** Explicitly set `language: "en"` to improve accuracy and reduce first-word latency.

### Reconnection Strategy

If the Voxtral WebSocket drops mid-recording:

1. Server detects disconnection, sends `{ type: "error", message: "Transcription interrupted, reconnecting..." }` to phone
2. Server opens a new Voxtral session
3. Server sends `{ type: "ready" }` when the new session is established
4. Phone continues sending audio chunks — it never stops recording
5. The partial transcript accumulated so far is preserved on the phone side

The phone does NOT need to buffer and replay audio. Losing a few hundred milliseconds of audio during reconnection is acceptable — the CEO can see and edit the transcript before creating the project.

If reconnection fails after 3 attempts (5-second total timeout), send `{ type: "error", message: "Transcription unavailable" }` and the phone falls back to manual text entry.

### useVoiceRecording Hook

```ts
// hooks/useVoiceRecording.ts — high-level API

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  transcript: string;           // Accumulated partial transcripts
  isConnected: boolean;         // WebSocket connected to server
  startRecording: () => void;   // Request mic permission, open WS, start capture
  stopRecording: () => void;    // Stop capture, wait for final transcript
  error: string | null;
}
```

This hook encapsulates the audio capture library, WebSocket connection, and transcript accumulation. Components consume a simple interface.

---

## 8. Voice Extraction Endpoint

After recording stops and the full transcript is available, the mobile app calls `POST /api/voice/extract` to get structured project data from the transcript.

### Endpoint Design

**`POST /api/voice/extract`**

```
Request:
{
  "transcript": "I want to build a landing page for our new product..."
}

Response:
{
  "name": "New Product Landing Page",
  "description": "Build a product landing page with hero section, pricing table, and signup form.",
  "brief": "Build a landing page for our new product...",
  "goals": "- Hero section\n- Pricing table\n- Signup form",
  "constraints": "- Use existing design tokens\n- Ship this week",
  "priority": "high"
}
```

### Implementation

The endpoint uses the `claude` CLI with structured JSON output, following Kai's prompt design in `docs/mobile-app-voice-prompt-design.md`. The implementation pattern matches the OST tool's `runClaude()` helper:

1. Spawn `claude -p --output-format json --json-schema <schema>` with the prompt as stdin
2. Parse the JSON output
3. Validate against a Zod schema
4. Return to the mobile app

If extraction fails (timeout, invalid JSON, validation error), return a fallback response with `name: "Untitled Project"` and the raw transcript as the `brief`.

**Model:** Start with the default Claude model. If latency exceeds 3 seconds, switch to `claude-haiku-4-5-20251001`. The JSON schema constraint keeps output quality high regardless of model.

**Timeout:** 10 seconds hard limit. The CEO shouldn't wait longer than that.

### Flow After Extraction

1. Phone displays transcript immediately (no LLM wait)
2. Phone calls `POST /api/voice/extract` in the background
3. When extraction returns, auto-populate project name field
4. CEO reviews/edits transcript and name
5. CEO taps "Create & Go"
6. Phone calls `POST /api/projects` with the extracted data
7. Phone calls `POST /api/projects/:id/sessions` to start a session
8. Phone navigates to Project Detail showing "Session Running"

Steps 6 and 7 are sequential — session creation needs the project ID. Total time budget: <5 seconds (Thomas's acceptance criteria).

---

## 9. Backend Endpoint Specifications (for Jonah)

### New Endpoints

#### 9.1 WebSocket: `/api/voice/transcribe`

**Type:** WebSocket upgrade
**Purpose:** Proxy audio stream from mobile to Voxtral Realtime, stream partial transcripts back
**Auth:** None (single-user tool on local network)

**Server-side implementation:**

1. On WebSocket connection, open a new WebSocket to Voxtral Realtime API (`wss://api.mistral.ai/v1/audio/realtime?model=voxtral-mini-transcribe-realtime-2602`)
2. Send auth and config: `{ "type": "config", "audio_format": { "encoding": "pcm_s16le", "sample_rate": 16000 }, "transcription_delay_ms": 480, "language": "en" }`
3. On receiving `{ type: "audio", data: "<base64>" }` from phone: decode base64, forward raw bytes to Voxtral
4. On receiving `TranscriptionStreamTextDelta` from Voxtral: send `{ type: "transcript", text: "...", final: false }` to phone
5. On receiving `{ type: "stop" }` from phone: signal end-of-audio to Voxtral, wait for `TranscriptionStreamDone`
6. On `TranscriptionStreamDone`: send `{ type: "done", text: "..." }` to phone, close both WebSockets
7. On error from Voxtral: attempt reconnection (3 retries, 5s total). If all fail, send `{ type: "error" }` to phone

**Dependencies:**
- `ws` npm package (already used by Express for other WebSocket support, or add it)
- `MISTRAL_API_KEY` in `.env`

**Note on the exact Voxtral WebSocket protocol:** The Python SDK abstracts this, but the raw protocol may differ from what Marco documented (which was based on the SDK's high-level API). Jonah should verify the actual WebSocket message format by connecting directly. If the raw protocol is undocumented, fall back to the batch endpoint with SSE streaming as a simpler alternative (upload audio chunks as they arrive, stream transcription back).

#### 9.2 `POST /api/voice/extract`

**Type:** REST
**Purpose:** Extract structured project data from a voice transcript using Claude
**Request body:** `{ "transcript": string }`
**Response:** `{ "name": string, "description": string, "brief": string, "goals": string, "constraints": string, "priority": "high" | "medium" | "low" }`

**Implementation:**
1. Validate transcript is non-empty string (max 50,000 characters)
2. Spawn `claude -p --output-format json --json-schema <schema>` with the prompt from Kai's design doc
3. Parse and validate output with Zod
4. Return extracted data

**Timeout:** 10 seconds. Return fallback on timeout.

**Fallback response:**
```json
{
  "name": "Untitled Project",
  "description": "",
  "brief": "<original transcript>",
  "goals": "",
  "constraints": "",
  "priority": "medium"
}
```

#### 9.3 `GET /api/voice/health`

**Type:** REST
**Purpose:** Check Voxtral API reachability (for Settings screen status indicator)
**Response:** `{ "voxtral": "ok" | "unreachable", "latencyMs": number }`

**Implementation:**
1. Attempt a WebSocket handshake to the Voxtral realtime endpoint (or an HTTP HEAD request to the batch endpoint)
2. Measure round-trip time
3. Return status and latency

This is a lightweight health check — don't actually start a transcription session.

### Changes to Existing Infrastructure

**`server/src/index.ts`** — needs WebSocket support:

The Express server currently uses `app.listen()` which returns an `http.Server`. The WebSocket endpoint needs to attach to this server:

```ts
import { WebSocketServer } from "ws";

const server = app.listen(PORT, () => { ... });
const wss = new WebSocketServer({ server, path: "/api/voice/transcribe" });
wss.on("connection", handleVoiceConnection);
```

**`.env`** — add `MISTRAL_API_KEY` (same pattern as existing API keys).

**No changes to existing REST endpoints.** The mobile app uses `POST /api/projects` and `POST /api/projects/:id/sessions` as-is.

### New Files for Jonah

```
server/src/voice/
├── transcribe.ts          # WebSocket handler for /api/voice/transcribe
├── extract.ts             # POST /api/voice/extract handler
├── health.ts              # GET /api/voice/health handler
└── voxtral-client.ts      # Voxtral WebSocket client (raw protocol)

server/src/routes/voice.ts # Route registration
```

---

## 10. SVG Avatars

**Decision: Pre-rasterize SVG avatars to PNG at build time.**

React Native SVG rendering via `react-native-svg` is possible but adds another native module dependency and can have rendering inconsistencies with complex SVGs (filters, gradients, embedded fonts). Our pixel art avatars are simple, but they're a fixed set of 12 images that never change at runtime.

**Approach:**
1. Before first build, run a one-time script that converts each SVG in `img/avatars/` to PNG at 2x and 3x resolution (for retina displays)
2. Store the PNGs in `mobile/assets/avatars/`
3. Reference them via a static map: `const avatars = { thomas: require("../assets/avatars/thomas.png"), ... }`
4. Use `<Image>` (from `expo-image`) with `contentFit="cover"` for display

This is simpler, faster to render, and avoids the `react-native-svg` dependency entirely for Phase 1.

**Script:** A simple Node.js script using `sharp` to batch-convert SVGs. Run once during project setup, commit the PNGs.

---

## 11. Dev Workflow

### First-Time Setup

```bash
cd mobile
npm install

# Convert SVG avatars to PNG (one-time)
node scripts/convert-avatars.js

# Create development build for iOS Simulator
npx eas build --profile development --platform ios

# Install the dev build on the simulator
# (EAS provides a download link or auto-installs)
```

### Daily Development

```bash
# Terminal 1: Start the Express API (from repo root)
npm run dev -w server

# Terminal 2: Start Expo dev server (from mobile/)
cd mobile
npx expo start
```

Expo's dev server connects to the development build on the simulator or physical device. Hot reload works for JS/TS changes.

**Important:** `npx expo start` will NOT work with Expo Go for this project because `@mykin-ai/expo-audio-stream` requires native modules. The team must use custom development builds via `eas build --profile development`.

### Physical Device Testing

1. Build a development build for the device: `npx eas build --profile development --platform ios`
2. Install via TestFlight (or direct install for development builds)
3. In the app's Settings, change the API URL to the Mac's local IP or Tailscale hostname
4. Start the Express API on the Mac
5. The phone connects to the Mac over WiFi or Tailscale

### Environment Configuration

```ts
// app.config.ts
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "TeamHQ",
  slug: "teamhq-mobile",
  version: "1.0.0",
  scheme: "teamhq",
  orientation: "portrait",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#09090b",  // zinc-950
  },
  ios: {
    supportsTablet: false,       // Phone-only for now
    bundleIdentifier: "com.sherlocklabs.teamhq",
    infoPlist: {
      NSMicrophoneUsageDescription: "TeamHQ uses the microphone to transcribe voice project briefs.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#09090b",
    },
    package: "com.sherlocklabs.teamhq",
    permissions: ["android.permission.RECORD_AUDIO"],
  },
  plugins: [
    "expo-router",
    "@mykin-ai/expo-audio-stream",
  ],
  extra: {
    defaultApiUrl: "http://localhost:3002",
  },
});
```

### EAS Build Profiles

```json
{
  "cli": { "version": ">= 14.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "development-device": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

Two development profiles: `development` (simulator, faster builds) and `development-device` (physical device, requires provisioning).

---

## 12. Work Split: Zara vs. Leo

Clear ownership boundaries so they can work in parallel without merge conflicts.

### Zara (Mobile Developer 1) — Data & Voice Flow

Zara owns the core data screens and the entire voice pipeline. She's the "plumber" — making data flow from the API through the UI, and audio flow from the microphone through WebSocket to the transcript.

**Directories Zara owns:**

```
mobile/app/(tabs)/index.tsx        # Projects tab
mobile/app/project/[id].tsx        # Project detail
mobile/components/projects/        # All project components
mobile/components/voice/           # All voice components
mobile/hooks/                      # All hooks (API + voice)
mobile/lib/api.ts                  # API client
mobile/lib/websocket.ts            # WebSocket client
mobile/types/api.ts                # API types
```

**Zara's deliverables:**
1. Project list screen with FlatList, pull-to-refresh, status filter
2. Project detail screen with notes, sessions, edit
3. Voice recording overlay (full modal with recording, review, creating states)
4. Live transcription display (text streaming in from WebSocket)
5. "Create & Go" flow (extract → create project → start session)
6. All TanStack Query hooks
7. `useVoiceRecording` hook (audio capture + WebSocket integration)
8. API client and TypeScript types

### Leo (Mobile Developer 2) — UI Components, Team, Settings & Polish

Leo owns the shared component library, the team roster screen, settings, and all animation/interaction polish. He's the "painter" — making everything look and feel right.

**Directories Leo owns:**

```
mobile/app/(tabs)/_layout.tsx      # Tab navigator
mobile/app/(tabs)/team.tsx         # Team tab
mobile/app/(tabs)/settings.tsx     # Settings tab
mobile/app/_layout.tsx             # Root layout (providers, fonts, splash)
mobile/components/ui/              # All shared UI components
mobile/components/team/            # Team components
mobile/lib/tokens.ts               # Design tokens
mobile/lib/constants.ts            # App constants (team roster data)
mobile/lib/animation.ts            # Animation presets
mobile/lib/storage.ts              # AsyncStorage helpers
mobile/stores/settings.ts          # Settings store
mobile/assets/                     # All assets (fonts, avatars, icons)
mobile/app.config.ts               # Expo config
mobile/eas.json                    # EAS config
mobile/package.json                # Dependencies
```

**Leo's deliverables:**
1. Root layout with QueryClientProvider, fonts, splash screen
2. Tab navigator with proper styling
3. Shared UI components (Button, Card, Badge, LoadingScreen, ErrorScreen, EmptyScreen)
4. Team roster screen with agent grid/list
5. Settings screen with API URL config and connection test
6. Design tokens file
7. Animation presets (spring configs, enter/exit)
8. Mic FAB component (animation, pulsing) — Leo builds the component, Zara wires it to the recording logic
9. Waveform visualizer animation (Leo builds the visual, Zara feeds it audio level data)
10. Project scaffolding (package.json, app.config.ts, eas.json, tsconfig)

### Shared Contract

The boundary between Zara and Leo is the component interface. Example:

```tsx
// Leo builds MicFAB with this interface:
interface MicFABProps {
  onPress: () => void;
  isRecording: boolean;
  audioLevel?: number;  // 0-1, for pulsing animation intensity
}

// Zara uses it:
<MicFAB
  onPress={startRecording}
  isRecording={isRecording}
  audioLevel={currentAudioLevel}
/>
```

Same pattern for `WaveformVisualizer`:

```tsx
// Leo builds:
interface WaveformVisualizerProps {
  audioLevel: number;  // 0-1, updated per audio chunk
  isActive: boolean;
}

// Zara passes audio data:
<WaveformVisualizer audioLevel={audioLevel} isActive={isRecording} />
```

Leo starts first (project scaffolding, tokens, shared components). Zara starts as soon as the project structure and API client are in place, which Leo delivers on day one.

---

## 13. Dependencies (Phase 1)

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-splash-screen": "~0.29.0",
    "expo-status-bar": "~2.0.0",
    "expo-font": "~13.0.0",
    "expo-image": "~2.0.0",
    "expo-haptics": "~14.0.0",
    "expo-dev-client": "~5.0.0",
    "@mykin-ai/expo-audio-stream": "^1.0.0",
    "@react-native-async-storage/async-storage": "^2.1.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^5.0.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-gesture-handler": "~2.20.0",
    "react-native-safe-area-context": "~4.12.0",
    "react-native-screens": "~4.4.0",
    "@expo/vector-icons": "^14.0.0"
  },
  "devDependencies": {
    "@types/react": "~18.3.0",
    "typescript": "~5.6.0"
  }
}
```

**Important:** All packages should be installed via `npx expo install <package>` to ensure Expo-compatible versions.

---

## 14. Risks and Mitigations

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Voxtral WebSocket protocol undocumented for raw access | Jonah can't implement the proxy without knowing the message format | Jonah should prototype the connection first. If raw WebSocket is intractable, fall back to batch endpoint with SSE streaming (upload complete audio, stream transcript). Latency increases but UX is still acceptable. |
| `@mykin-ai/expo-audio-stream` reliability | Audio streaming may have edge cases on Android or with background app state | Test early on both platforms. Have `@siteed/expo-audio-studio` as a drop-in replacement. |
| Custom dev build required (no Expo Go) | Slower iteration cycle for Zara and Leo | Build the dev client on day one. After initial build, hot reload works normally — the build is only needed when native modules change. |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebSocket through corporate WiFi/firewalls | Audio streaming may be blocked by network proxies | Tailscale bypasses this. Document WiFi fallback in Settings screen help text. |
| Audio permission denied | Can't record | Show clear explanation dialog before requesting. Offer manual text entry as fallback (always available). |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Voxtral rate limits | Single user, unlikely to hit limits | Monitor via Mistral admin dashboard. |
| Transcript accuracy in noisy environments | Poor project briefs | The review/edit step catches this. CEO can fix before submitting. |

---

## 15. Open Questions

1. **Voxtral raw WebSocket protocol:** Jonah needs to verify the exact message format for the realtime endpoint. The Python SDK abstracts this — we need the raw frames. If undocumented, test empirically or use the batch SSE fallback.

2. **Audio library chunk callback format:** Does `@mykin-ai/expo-audio-stream` deliver chunks as base64 strings directly, or do they need conversion? Zara should verify with a minimal prototype before building the full voice flow.

3. **Silence detection:** Thomas's requirements mention auto-stop after ~2 seconds of silence. The `@mykin-ai/expo-audio-stream` library provides sound level data per chunk. Zara can implement silence detection by tracking consecutive low-level chunks. Threshold and duration should be configurable. Robert should spec the visual countdown.

---

## Summary of Decisions

| Decision | Choice | Key Rationale |
|----------|--------|---------------|
| Repo structure | `mobile/` directory in teamhq repo | Shared assets, co-located docs |
| Workspace | Not an npm workspace | Avoid Expo dependency conflicts |
| Audio capture | `@mykin-ai/expo-audio-stream` | Purpose-built for streaming PCM chunks |
| Voxtral integration | Direct WebSocket in Node.js (`ws`) | No Python dependency, keep stack uniform |
| State management | TanStack Query + Zustand | Proven combo, matches team patterns |
| Navigation | Expo Router with bottom tabs + stack | File-based routing, standard pattern |
| Voice overlay | React Native `<Modal>`, not routed | Transient interaction, no deep linking needed |
| SVG avatars | Pre-rasterized to PNG | Simpler, avoids react-native-svg dependency |
| Transcription delay | 480ms | Sweet spot per Marco's research |
| Project name extraction | Claude LLM via `POST /api/voice/extract` | Handles rambling speech, filler words, edge cases |
| Dev workflow | EAS development builds (no Expo Go) | Required by native audio module |
