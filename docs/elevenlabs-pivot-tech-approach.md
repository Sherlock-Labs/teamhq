# ElevenLabs Pivot -- Technical Approach

**Author:** Andrei (Technical Architect)
**Date:** February 9, 2026
**Status:** Ready for implementation
**Project ID:** `elevenlabs-pivot`
**Dependencies:** `docs/elevenlabs-pivot-requirements.md` (Thomas)

---

## 1. Platform Decision: ElevenLabs Conversational AI

### Choice

Replace the Gemini Live API integration with the **ElevenLabs Conversational AI SDK** (`@11labs/client`). This is a platform swap, not a rebuild. The user experience, UI, post-processing pipeline, and meeting record format remain identical.

### Rationale

The CEO directed this pivot because:

1. **Gemini is broken.** Google changed model names and API versions without notice. The ephemeral token endpoint returns 404. The API is immature and unstable.
2. **ElevenLabs SDK handles the hard parts.** Microphone capture, audio playback, WebSocket/WebRTC management, reconnection, and VAD are all handled by the SDK. We delete ~630 lines of hand-rolled WebSocket + Web Audio code (`gemini-client.js` + `audio-worklet-processor.js`).
3. **Better voice quality.** ElevenLabs has industry-leading voice synthesis.
4. **Stable, versioned SDK.** Maintained by ElevenLabs with semantic versioning. No more chasing undocumented API changes.

### Cost Impact

| | Gemini (broken) | ElevenLabs |
|--|---------|------------|
| Per 30-min session | ~$0.76 | ~$3.00 |
| Monthly (5x/week) | ~$23 | ~$65 |

Higher cost, but the tradeoff is reliability and zero maintenance. At this volume the difference is $40/month.

---

## 2. SDK Loading Strategy (Key Decision #1)

### Decision: ESM import via jsDelivr CDN

TeamHQ is vanilla JS with no bundler. The `@11labs/client` package does **not** ship a UMD/IIFE bundle. It ships ESM only.

**Approach:** Use a `<script type="module">` that imports the SDK from jsDelivr's ESM CDN.

```html
<!-- interviews.html: replace gemini-client.js script tag -->
<script type="module" src="js/elevenlabs-client.js"></script>
<script type="module" src="js/interview.js"></script>
```

Inside `elevenlabs-client.js`:

```javascript
import { Conversation } from 'https://cdn.jsdelivr.net/npm/@11labs/client@0.2.0/+esm';

// ... wrapper class that exposes same event interface as GeminiLiveClient
window.ElevenLabsClient = ElevenLabsClient;
```

And `interview.js` must also become a `<script type="module">` or access the client via `window.ElevenLabsClient` (the latter is simpler since `interview.js` already uses the `window.GeminiLiveClient` pattern).

**Why this approach:**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **ESM via jsDelivr** | Zero build step, pinned version, browser-native | Requires `type="module"` on script tags | **Winner** |
| Vendored build | Offline, no CDN dependency | Need to build/bundle manually, maintenance burden | Overkill for a CDN-hosted app |
| Widget embed (`elevenlabs-convai`) | One-line integration | Less control over audio pipeline, can't get frequency data for visualizer | Doesn't meet requirements |

**Version pinning:** Pin to `@0.2.0` (current latest) in the import URL. Update explicitly when needed.

**Module compatibility note:** The `interview.js` IIFE currently runs in classic script context. Switching its `<script>` tag to `type="module"` is safe because it only accesses the DOM (which modules can do) and attaches no globals that other scripts depend on. The one change is that `interview.js` must access the client via `window.ElevenLabsClient` since ESM modules have their own scope. This matches the existing pattern where it accesses `window.GeminiLiveClient`.

---

## 3. Audio Visualizer (Key Decision #2)

### Decision: Use SDK's `getInputByteFrequencyData()` + `getOutputVolume()`

The ElevenLabs SDK exposes audio analysis methods directly on the `Conversation` instance:

- **`getInputByteFrequencyData()`** -- returns a `Uint8Array` of frequency data for the mic input, identical to `AnalyserNode.getByteFrequencyData()`.
- **`getOutputVolume()`** -- returns the current output volume level (0.0 - 1.0).
- **`getInputVolume()`** -- returns the current input volume level (0.0 - 1.0).

The current visualizer in `interview.js` (lines 383-454) uses `AnalyserNode.getByteFrequencyData()` for both mic and playback. The ElevenLabs SDK gives us the same data shape for input.

**For mic visualization:** Use `getInputByteFrequencyData()` directly -- same `Uint8Array` format, same rendering code. Drop-in replacement.

**For playback (AI speaking) visualization:** The SDK does not expose `getOutputByteFrequencyData()`. Instead, use `getOutputVolume()` to drive a volume-based animation:

```javascript
// When AI is speaking, use output volume to drive bar heights
var volume = conversation.getOutputVolume(); // 0.0 - 1.0
for (var i = 0; i < bars.length; i++) {
  // Distribute volume across bars with slight variation
  var variation = 0.7 + Math.random() * 0.3;
  var height = Math.max(4, Math.min(32, volume * 32 * variation));
  bars[i].style.height = height + 'px';
}
```

This produces a visually similar effect to the current frequency-based approach. The bars move with the AI's voice volume, with random variation preventing them from being a flat row.

**Mode detection:** The SDK provides an `onModeChange` callback with `{ mode: 'listening' | 'speaking' }`. Use this to switch between mic visualization (listening) and output volume visualization (speaking). This replaces the current `aiSpeaking` event from `gemini-client.js`.

### Visualizer migration summary

| Current (Gemini) | New (ElevenLabs) |
|---|---|
| `client.getMicAnalyser()` -> `AnalyserNode.getByteFrequencyData()` | `conversation.getInputByteFrequencyData()` |
| `client.getPlaybackAnalyser()` -> `AnalyserNode.getByteFrequencyData()` | `conversation.getOutputVolume()` + variation |
| `client.on('aiSpeaking', fn)` | `onModeChange({ mode })` |

---

## 4. Prompt and System Instruction Delivery (Key Decision #3)

### Decision: Server-side prompt assembly, client-side override injection

**How ElevenLabs receives the system prompt:** The agent has a base system prompt configured in the ElevenLabs dashboard. Per-session, the frontend passes the dynamic prompt (with topic, context, project summaries, recent meetings) via `overrides.agent.prompt.prompt` when calling `Conversation.startSession()`.

**Flow:**

```
Browser                         Express Backend              ElevenLabs
  |                                   |                          |
  |  POST /api/interviews/start       |                          |
  |  { topic, context }               |                          |
  |---------------------------------->|                          |
  |                                   |  GET signed URL           |
  |                                   |  (ELEVENLABS_AGENT_ID)    |
  |                                   |------------------------->|
  |                                   |  { signed_url }           |
  |                                   |<-------------------------|
  |  { meetingId, signedUrl,          |                          |
  |    promptOverride, firstMessage } |                          |
  |<----------------------------------|                          |
  |                                                              |
  |  Conversation.startSession({                                 |
  |    signedUrl,                                                |
  |    overrides: { agent: { prompt: { prompt }, firstMessage }} |
  |  })                                                          |
  |------------------------------------------------------------->|
```

**What changes in the start endpoint response:**

Before (Gemini):
```json
{ "meetingId": "uuid", "token": "ephemeral-token", "config": { ... } }
```

After (ElevenLabs):
```json
{
  "meetingId": "uuid",
  "signedUrl": "wss://...",
  "promptOverride": "You are an AI interviewer... Topic: ...",
  "firstMessage": "Hello! I'd like to discuss..."
}
```

**Prompt security:** The prompt override is sent from the frontend to ElevenLabs. Unlike Gemini's ephemeral tokens (which locked the prompt server-side), ElevenLabs overrides are client-side injectable. This is acceptable because:

1. This is a single-user internal tool (the CEO is both the operator and the user).
2. The signed URL still requires server-side API key authentication.
3. The worst case of client-side prompt manipulation is the CEO modifying their own interview instructions, which has no security impact.

**`prompt.ts` changes:** The `buildInterviewSystemInstruction()` function stays as-is. The start route calls it, includes the result in the response as `promptOverride`, and the frontend passes it as `overrides.agent.prompt.prompt`. The `buildPostProcessPrompt()` and formatting functions are unchanged.

**`firstMessage` generation:** Add a small helper function that generates a contextual first message from the topic:

```typescript
export function buildFirstMessage(topic: string): string {
  return `Hello! I'd like to discuss ${topic} with you today. To start off, could you give me a high-level overview of where things stand?`;
}
```

This is injected via `overrides.agent.firstMessage` so the agent greets the CEO with a topic-specific opener.

---

## 5. Session Duration and Reconnection (Key Decision #4)

### ElevenLabs session characteristics

- **No hard WebSocket timeout.** ElevenLabs does not have Gemini's 10-minute WebSocket limit. Sessions can run as long as needed.
- **Turn-level timeouts:** Configurable silence detection (1-30 seconds). The SDK's VAD handles this.
- **Reconnection:** The SDK handles connection management internally. If a network hiccup occurs, the SDK reconnects automatically.

### What we remove

The Gemini architecture required significant complexity to work around session limits:

- **Proactive 9-minute reconnection timer** -- DELETE. Not needed.
- **Session resumption token storage** -- DELETE. Not needed.
- **Context window compression config** -- DELETE. Not needed.
- **`MAX_RECONNECT_ATTEMPTS` retry logic** -- SIMPLIFY. The SDK handles reconnection. We only need to handle the `onError` and `onDisconnect` callbacks for terminal failures.

### What we keep

- **60-minute hard limit** in `interview.js` (line 13) -- KEEP. This is a product-level guard against runaway sessions, independent of platform.
- **15-minute soft warning** (line 14) -- KEEP. Same reason.
- **localStorage transcript backup** -- KEEP. The SDK doesn't provide this. We implement it in the wrapper by periodically calling our backup function.

### Simplification impact

The Gemini session management was the most complex part of the original architecture (section 8 of the old tech approach, ~120 lines of reconnection logic). ElevenLabs eliminates all of it. This is a significant reduction in code complexity and failure modes.

---

## 6. Transcript Handling

### Decision: Client-side accumulation via `onMessage` callback (Option A from requirements)

The ElevenLabs SDK fires `onMessage` for each transcript event. The wrapper accumulates transcript entries and provides a `getTranscript()` method, matching the current interface exactly.

```javascript
// ElevenLabs onMessage handler
onMessage: function(message) {
  // message has: source ('user' | 'ai'), message (text)
  if (message.source === 'user') {
    transcriptEntries.push({
      speaker: 'CEO',
      role: 'Interviewee',
      text: message.message,
    });
  } else if (message.source === 'ai') {
    transcriptEntries.push({
      speaker: 'AI Interviewer',
      role: 'Interviewer',
      text: message.message,
    });
  }
}
```

**Key difference from Gemini:** Gemini delivered partial transcript chunks that needed buffering and turn-boundary detection (`_currentInputBuffer`, `_currentOutputBuffer`, `_flushTranscriptBuffers`). ElevenLabs delivers complete messages. This eliminates ~50 lines of buffer management code.

**Transcript format:** Identical output shape. The `sendComplete()` function in `interview.js` sends the same `{ transcript, durationSeconds }` payload to the same `POST /api/interviews/:id/complete` endpoint. Zero changes to `interview.js` transcript handling.

---

## 7. Complete File Change List

### DELETE (2 files, ~630 lines)

| File | Lines | Reason |
|------|-------|--------|
| `js/gemini-client.js` | 604 | Replaced by `elevenlabs-client.js` |
| `js/audio-worklet-processor.js` | 31 | ElevenLabs SDK handles audio capture |

### CREATE (2 files, ~150 lines)

| File | Est. Lines | Purpose |
|------|-----------|---------|
| `js/elevenlabs-client.js` | ~120 | Thin wrapper around `@11labs/client` SDK. Same event interface as `GeminiLiveClient`: `stateChange`, `error`, `aiSpeaking` events + `connect()`, `disconnect()`, `getTranscript()`, `getInputByteFrequencyData()`, `getOutputVolume()` |
| `server/src/interviews/signed-url.ts` | ~30 | Generate signed URL from ElevenLabs API |

### MODIFY (5 files)

| File | Change | Scope |
|------|--------|-------|
| `interviews.html` | Replace `<script src="js/gemini-client.js">` with `<script type="module" src="js/elevenlabs-client.js">`, change `interview.js` to `type="module"` | 2 lines |
| `js/interview.js` | Change `new window.GeminiLiveClient()` to `new window.ElevenLabsClient()`. Update visualizer to use `getInputByteFrequencyData()` + `getOutputVolume()` instead of `getMicAnalyser()` + `getPlaybackAnalyser()`. Update `connect()` call shape. | ~30 lines changed |
| `server/src/interviews/token.ts` | DELETE entirely, replaced by `signed-url.ts` | Full file replacement |
| `server/src/routes/interviews.ts` | Import `getSignedUrl` instead of `generateEphemeralToken`/`getSessionConfig`. Change start endpoint to return `{ meetingId, signedUrl, promptOverride, firstMessage }` instead of `{ meetingId, token, config }`. Add `buildFirstMessage` call. | ~20 lines |
| `server/src/schemas/meeting.ts` | Remove `geminiSessionId` from `InterviewConfigSchema`, add `elevenLabsConversationId` (optional). | 2 lines |

### UNCHANGED (kept as-is)

| File | Reason |
|------|--------|
| `server/src/interviews/prompt.ts` | System instruction builder + post-process prompt. Functions reused directly. |
| `server/src/interviews/post-process.ts` | Claude post-processing. Identical pipeline. |
| `server/src/store/meetings.ts` | Schema changes are additive. |
| `css/styles.css` | No visual changes. |

---

## 8. Backend Changes Detail

### New: `server/src/interviews/signed-url.ts`

```typescript
/**
 * Generates a signed URL for ElevenLabs Conversational AI.
 * The signed URL authenticates the browser's WebSocket connection
 * without exposing the API key to the client.
 */
export async function getSignedUrl(): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
  if (!agentId) throw new Error("ELEVENLABS_AGENT_ID is not set");

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
    { headers: { "xi-api-key": apiKey } },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`Signed URL request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.signed_url;
}
```

### Modified: `POST /api/interviews/start` response

The start endpoint changes from returning a Gemini ephemeral token + config to returning an ElevenLabs signed URL + prompt override + first message.

```typescript
// Before:
const { token } = await generateEphemeralToken(systemInstruction);
const config = getSessionConfig();
res.json({ meetingId: meeting.id, token, config });

// After:
const signedUrl = await getSignedUrl();
const promptOverride = buildInterviewSystemInstruction(
  parsed.topic, parsed.context, projectSummaries, meetingSummaries,
);
const firstMessage = buildFirstMessage(parsed.topic);
res.json({ meetingId: meeting.id, signedUrl, promptOverride, firstMessage });
```

### Modified: `InterviewConfigSchema`

```typescript
// Before:
geminiSessionId: z.string().optional(),

// After:
elevenLabsConversationId: z.string().optional(),
```

### Environment Variables

**Remove:**
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_VOICE`

**Add:**
- `ELEVENLABS_API_KEY` -- ElevenLabs API key (server-side only, never reaches client)
- `ELEVENLABS_AGENT_ID` -- Pre-configured ElevenLabs agent ID

---

## 9. Frontend Changes Detail

### New: `js/elevenlabs-client.js` (Wrapper)

A thin wrapper (~120 lines) around the ElevenLabs `Conversation` class that provides the same event interface that `interview.js` consumes.

```javascript
import { Conversation } from 'https://cdn.jsdelivr.net/npm/@11labs/client@0.2.0/+esm';

var ElevenLabsClient = (function () {
  'use strict';

  var BACKUP_INTERVAL_MS = 30000;

  function Client() {
    this._listeners = {};
    this._conversation = null;
    this._transcript = [];
    this._meetingId = null;
    this._backupTimer = null;
    this._state = 'idle';
    this._mode = 'listening'; // 'listening' | 'speaking'
  }

  // Event emitter (same as GeminiLiveClient)
  Client.prototype.on = function (event, fn) { /* identical */ };
  Client.prototype.off = function (event, fn) { /* identical */ };
  Client.prototype._emit = function (event, data) { /* identical */ };

  /**
   * Connect to ElevenLabs Conversational AI.
   * @param {Object} opts - { signedUrl, promptOverride, firstMessage, meetingId }
   */
  Client.prototype.connect = function (opts) {
    var self = this;
    this._meetingId = opts.meetingId;
    this._transcript = [];
    this._setState('connecting');

    Conversation.startSession({
      signedUrl: opts.signedUrl,
      overrides: {
        agent: {
          prompt: { prompt: opts.promptOverride },
          firstMessage: opts.firstMessage,
        },
      },
      onConnect: function () {
        self._setState('active');
        self._startBackupTimer();
      },
      onDisconnect: function () {
        if (self._state === 'active') {
          self._emit('error', { type: 'connectionLost', message: 'Connection lost.' });
        }
        self._setState('closed');
      },
      onError: function (error) {
        self._emit('error', { type: 'connection', message: error.message || 'Connection error' });
      },
      onMessage: function (message) {
        // Accumulate transcript entries
        if (message.source === 'user') {
          self._transcript.push({
            speaker: 'CEO', role: 'Interviewee', text: message.message,
          });
        } else if (message.source === 'ai') {
          self._transcript.push({
            speaker: 'AI Interviewer', role: 'Interviewer', text: message.message,
          });
        }
        self._emit('transcriptUpdated', self._transcript);
      },
      onModeChange: function (data) {
        self._mode = data.mode;
        self._emit('aiSpeaking', data.mode === 'speaking');
      },
    }).then(function (conversation) {
      self._conversation = conversation;
    }).catch(function (err) {
      self._handleInitError(err);
    });
  };

  Client.prototype.disconnect = function () {
    this._clearBackupTimer();
    if (this._conversation) {
      this._conversation.endSession();
      this._conversation = null;
    }
    this._setState('closed');
    return this.getTranscript();
  };

  Client.prototype.getTranscript = function () {
    return this._transcript.slice();
  };

  /**
   * Get mic frequency data for visualizer.
   * Returns Uint8Array matching AnalyserNode.getByteFrequencyData() format.
   */
  Client.prototype.getInputByteFrequencyData = function () {
    if (!this._conversation) return null;
    return this._conversation.getInputByteFrequencyData();
  };

  /**
   * Get output volume for visualizer (0.0 - 1.0).
   */
  Client.prototype.getOutputVolume = function () {
    if (!this._conversation) return 0;
    return this._conversation.getOutputVolume();
  };

  /**
   * Get current mode: 'listening' or 'speaking'
   */
  Client.prototype.getMode = function () {
    return this._mode;
  };

  // ... _setState, _handleInitError, backup timer, clearBackup
  // (same patterns as GeminiLiveClient, minus reconnection logic)

  return Client;
})();

window.ElevenLabsClient = ElevenLabsClient;
```

**Key simplifications vs `gemini-client.js`:**
- No WebSocket management (SDK handles it)
- No AudioContext/AudioWorklet (SDK handles mic capture and playback)
- No PCM encoding/decoding (SDK handles audio format)
- No reconnection timer / session resumption / context compression
- No audio queue / playback sequencing
- Transcript messages arrive complete (no buffering/flushing)

### Modified: `js/interview.js`

Minimal changes:

1. **Client constructor** (line 498): `new window.GeminiLiveClient()` -> `new window.ElevenLabsClient()`
2. **Connect call** (lines 534-538): Change from `{ token, config, meetingId }` to `{ signedUrl: data.signedUrl, promptOverride: data.promptOverride, firstMessage: data.firstMessage, meetingId: data.meetingId }`
3. **Visualizer** (lines 383-454): Update `startVisualizer()` to use:
   - `client.getInputByteFrequencyData()` instead of `micAnalyser.getByteFrequencyData(micData)`
   - `client.getOutputVolume()` instead of `playbackAnalyser.getByteFrequencyData(playbackData)`
   - `client.getMode()` instead of the `aiSpeaking` flag (or keep the flag, set by the `aiSpeaking` event)

### Modified: `interviews.html`

```html
<!-- Before: -->
<script src="js/gemini-client.js" defer></script>
<script src="js/interview.js" defer></script>

<!-- After: -->
<script type="module" src="js/elevenlabs-client.js"></script>
<script type="module" src="js/interview.js"></script>
```

---

## 10. ElevenLabs Agent Setup (One-Time, Pre-Implementation)

Before the implementation pipeline runs, create an agent via the ElevenLabs dashboard:

1. **Name:** "Sherlock Labs Interviewer"
2. **Voice:** Choose a professional, neutral voice (evaluate during setup -- ElevenLabs has best-in-class options)
3. **Base system prompt:** A minimal placeholder (e.g., "You are an AI interviewer.") -- the real prompt is injected per-session via overrides.
4. **LLM:** Use ElevenLabs' default model routing
5. **First message:** Placeholder (overridden per-session)
6. **Privacy:** Set as **private agent** (requires signed URL authentication)
7. **Turn timeout:** Set to 3 seconds (accommodate CEO thinking pauses, similar to Gemini's `silenceDurationMs: 2000` but slightly more generous since we no longer have end-of-speech sensitivity tuning)

Store the agent ID as `ELEVENLABS_AGENT_ID` in `.env`.

---

## 11. Error Handling Changes

The error handling UX stays identical. Only the detection mechanism changes.

| Error | Gemini Detection | ElevenLabs Detection |
|-------|-----------------|---------------------|
| Connection failed | `ws.onerror` on initial connect | `onError` callback from `startSession` |
| Connection lost mid-interview | `ws.onclose` + 3 reconnect attempts fail | `onDisconnect` callback (SDK handles reconnection internally first) |
| Mic permission denied | `getUserMedia` throws `NotAllowedError` | SDK throws during `startSession` -- catch and check error type |
| No mic found | `getUserMedia` throws `NotFoundError` | SDK throws during `startSession` |
| Mic in use | `getUserMedia` throws `NotReadableError` | SDK throws during `startSession` |

**Key difference:** The ElevenLabs SDK requests microphone access internally during `startSession()`. Mic errors surface as rejected promises from `startSession()` rather than from our own `getUserMedia` call. The wrapper catches these and maps them to the same error types (`micDenied`, `micNotFound`, `micInUse`, `connection`).

---

## 12. Security Considerations

1. **API key never in browser.** The `ELEVENLABS_API_KEY` stays on the Express server. Only the signed URL reaches the client.
2. **Signed URL authentication.** The agent is private, requiring a signed URL. The URL is short-lived and single-use.
3. **Prompt override is client-injectable.** Unlike Gemini's locked ephemeral tokens, ElevenLabs overrides are set client-side. This is acceptable for a single-user internal tool (see section 4).
4. **No changes to CORS, input validation, or transcript handling security.**

---

## 13. Implementation Order

This is a focused swap. The pipeline is shorter than a new feature.

### Phase 1: Backend (Jonah, ~0.5 day)

1. Create `server/src/interviews/signed-url.ts`
2. Delete `server/src/interviews/token.ts`
3. Modify `POST /api/interviews/start` to return `{ meetingId, signedUrl, promptOverride, firstMessage }`
4. Add `buildFirstMessage()` to `server/src/interviews/prompt.ts`
5. Update `InterviewConfigSchema` (swap `geminiSessionId` for `elevenLabsConversationId`)
6. Update `.env` with ElevenLabs credentials
7. Test signed URL generation with curl

### Phase 2: Frontend (Alice, ~1 day)

1. Delete `js/gemini-client.js` and `js/audio-worklet-processor.js`
2. Create `js/elevenlabs-client.js` wrapper
3. Update `interviews.html` script tags
4. Update `js/interview.js` client swap + visualizer changes
5. End-to-end test: start interview -> speak -> end -> transcript saved

### Phase 3: Design Review (Robert)

- Lightweight check that the UI looks and behaves identically
- Verify audio visualizer responds during conversation

### Phase 4: QA (Enzo) -- Release Gate

- Full test pass against acceptance criteria
- Verify Gemini code is fully removed
- Verify no regressions in interview flow

### Total Estimated Effort: ~2 days

| Phase | Owner | Days |
|-------|-------|------|
| Backend | Jonah | 0.5 |
| Frontend | Alice | 1 |
| Design Review | Robert | 0.25 |
| QA | Enzo | 0.25 |

This is 3 days faster than the original Gemini implementation because the SDK handles the hard parts (audio pipeline, WebSocket, reconnection, VAD).

---

## 14. Migration Checklist

Before the pivot is considered complete:

- [ ] `gemini-client.js` deleted
- [ ] `audio-worklet-processor.js` deleted
- [ ] `server/src/interviews/token.ts` deleted
- [ ] No references to `GEMINI_API_KEY`, `GEMINI_MODEL`, or `GEMINI_VOICE` anywhere in codebase
- [ ] No references to `GeminiLiveClient` anywhere in codebase
- [ ] `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` in `.env`
- [ ] ElevenLabs agent created and configured in dashboard
- [ ] Signed URL generation works (curl test)
- [ ] Interview start -> speak -> end -> transcript saved works end-to-end
- [ ] Audio visualizer responds to voice activity
- [ ] All error states still work (mic denied, connection failed, connection lost)
- [ ] 60-minute hard limit still works
- [ ] localStorage transcript backup still works

---

## Appendix: Updated API Contract

For Alice and Jonah to align on before parallel implementation.

### `POST /api/interviews/start`

**Request:** (unchanged)
```typescript
{
  topic: string;        // Required, non-empty
  context?: string;     // Optional
}
```

**Response (200):**
```typescript
{
  meetingId: string;
  signedUrl: string;        // ElevenLabs WebSocket signed URL
  promptOverride: string;   // Full system instruction for override injection
  firstMessage: string;     // Topic-specific greeting message
}
```

**Errors:** (unchanged)
- 400: Missing topic
- 409: Meeting already running

### `POST /api/interviews/:id/complete` (unchanged)

### `POST /api/interviews/:id/fail` (unchanged)
