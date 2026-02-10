# Pivot AI Interviews from Gemini Live API to ElevenLabs Conversational AI -- Requirements

**Author:** Thomas (Product Manager)
**Date:** February 9, 2026
**Status:** Ready for architecture and implementation
**Project ID:** `elevenlabs-pivot`

---

## Overview

Replace the Gemini Live API integration in the AI Interviews feature with ElevenLabs Conversational AI. The existing interviews feature is fully built and shipped -- this is a **platform swap**, not a new feature. The user experience remains identical: click Interview, enter a topic, speak with an AI interviewer, get a structured meeting record.

**One-sentence summary:** Replace the broken Gemini WebSocket client with the ElevenLabs JS SDK for more reliable, higher-quality voice interviews.

---

## CEO Decision (Binding)

The CEO has decided to pivot from Gemini Live API to ElevenLabs Conversational AI. The reasons:

1. **Gemini is broken.** The ephemeral token endpoint returns 404 because Google changed model names and API versions (`v1beta` to `v1alpha`, model from `gemini-2.5-flash-live-001` to `gemini-2.5-flash-native-audio-preview-12-2025`). The API is immature and unstable.
2. **ElevenLabs is simpler.** The `@11labs/client` SDK handles audio capture, playback, WebSocket/WebRTC management, reconnection, and session lifecycle. We delete 600 lines of hand-rolled WebSocket + Web Audio code.
3. **Better voice quality.** ElevenLabs has industry-leading voice synthesis.
4. **Proven SDK.** Stable, versioned, maintained by ElevenLabs. No more chasing Google's undocumented API changes.

---

## What Exists Today (Shipped)

The interview feature is complete and works end-to-end (minus the broken Gemini connection). Everything listed below is already built:

### Frontend
- `interviews.html` -- dedicated page with nav, config panel, active interview panel, error states
- `js/interview.js` -- full lifecycle management (idle -> configuring -> connecting -> active -> processing states)
- `js/gemini-client.js` -- **REPLACE** -- Gemini WebSocket + Web Audio client (600 lines)
- `js/audio-worklet-processor.js` -- **DELETE** -- PCM capture worklet (Gemini-specific, ElevenLabs SDK handles audio)
- `css/styles.css` -- interview UI styles (keep as-is)

### Backend
- `server/src/interviews/token.ts` -- **REPLACE** -- Gemini ephemeral token generation -> ElevenLabs signed URL generation
- `server/src/interviews/prompt.ts` -- system instruction builder + post-processing prompt (adapt for ElevenLabs)
- `server/src/interviews/post-process.ts` -- Claude post-processing of transcripts (**keep as-is**)
- `server/src/routes/interviews.ts` -- Express routes for start/complete/fail (modify start route)
- `server/src/schemas/meeting.ts` -- MeetingType includes "interview", InterviewConfigSchema (**minor update**)

### Design
- Full design spec at `docs/ai-interviews-design-spec.md` -- **no design changes needed**
- All interview UI states, error handling, visualizer, cards -- **unchanged**

---

## What Changes

This pivot is purely a **plumbing swap**. The UI, the design, the user flow, the backend post-processing -- all stay the same. The changes are:

### 1. Frontend: Replace `gemini-client.js` with ElevenLabs client

**Delete:** `js/gemini-client.js` (600 lines of WebSocket + Web Audio code)
**Delete:** `js/audio-worklet-processor.js` (AudioWorklet PCM processor)
**Create:** `js/elevenlabs-client.js` -- thin wrapper around `@11labs/client` SDK

The ElevenLabs SDK (`@11labs/client`) handles:
- Microphone capture and audio playback (no AudioWorklet needed)
- WebSocket/WebRTC connection management
- Reconnection and session lifecycle
- Voice Activity Detection

Our wrapper provides the same event interface that `interview.js` already consumes:
- `stateChange` event (connecting -> active -> closed)
- `error` event (with type: micDenied, micNotFound, connection, connectionLost)
- `aiSpeaking` event (for visualizer color switching)
- `getMicAnalyser()` / `getPlaybackAnalyser()` for the audio visualizer
- `connect(opts)` and `disconnect()` methods
- `getTranscript()` to retrieve accumulated transcript

**Key decision: SDK loading approach.** Since TeamHQ is vanilla JS (no bundler), load the ElevenLabs SDK from CDN:

```html
<script src="https://unpkg.com/@elevenlabs/client@<version>/dist/index.umd.js"></script>
```

If the SDK does not ship a UMD/IIFE bundle suitable for direct `<script>` inclusion, use the `@elevenlabs/convai-widget-embed` CDN bundle and hook into the `elevenlabs-convai:conversation` event to get the Conversation instance. **Andrei should evaluate which approach is cleaner.**

Alternatively, if neither CDN approach works cleanly, we can vendor a single-file build of `@11labs/client` into `js/vendor/`. This avoids adding a build step while keeping the SDK pinned.

### 2. Frontend: Transcript handling changes

**Gemini (current):** Client-side transcript accumulation from real-time WebSocket chunks. `gemini-client.js` buffers input/output text, commits on turn boundaries, and returns transcript array on disconnect.

**ElevenLabs (new):** Two options for transcript delivery:

**Option A (recommended): Client-side accumulation via `onMessage` callback.**
The ElevenLabs SDK fires `onMessage` for each transcript event (user speech and agent speech, both tentative and final). Accumulate final transcripts client-side and send to backend on end, matching the current flow exactly. `interview.js` already handles this -- we just need the wrapper to emit the same events.

**Option B: Server-side retrieval via GET API.**
After the conversation ends, call `GET /v1/convai/conversations/{conversation_id}` from the backend to fetch the full transcript. This is simpler but adds latency (need to wait for ElevenLabs to process) and requires storing the conversation ID.

**Recommendation:** Option A. It matches the current architecture exactly. The `sendComplete` call in `interview.js` already sends the client-assembled transcript to the backend. No change to `interview.js` needed.

### 3. Backend: Replace Gemini token with ElevenLabs signed URL

**Delete:** `server/src/interviews/token.ts` (Gemini ephemeral token generation)
**Create:** `server/src/interviews/signed-url.ts` -- ElevenLabs signed URL generation

```typescript
// Generate a signed URL for a private ElevenLabs agent
export async function getSignedUrl(): Promise<string> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${process.env.ELEVENLABS_AGENT_ID}`,
    {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
    }
  );
  if (!response.ok) throw new Error(`Signed URL request failed: ${response.status}`);
  const data = await response.json();
  return data.signed_url;
}
```

### 4. Backend: Modify `POST /api/interviews/start`

Current flow:
1. Create meeting record
2. Build system instruction
3. Generate Gemini ephemeral token with locked system instruction
4. Return `{ meetingId, token, config }`

New flow:
1. Create meeting record
2. Generate ElevenLabs signed URL
3. Return `{ meetingId, signedUrl }`

The system instruction is no longer embedded in the token. Instead, it's configured on the ElevenLabs agent (via dashboard or API), and optionally overridden per-session via the `elevenlabs-convai:call` event or `overrides` in `startSession()`.

### 5. Backend: Adapt system prompt delivery

**Gemini (current):** System instruction is locked into the ephemeral token server-side. The client cannot modify it.

**ElevenLabs (new):** Two approaches:

**Option A: Agent-level prompt (simpler).**
Configure the base system prompt on the ElevenLabs agent via their dashboard. The prompt is static -- the topic and context are injected per-session via the `overrides.agent.prompt.prompt` field in `startSession()`.

**Option B: Server-side prompt via signed URL + overrides (more secure).**
The server generates the full prompt (with topic, context, project summaries, recent meetings) and passes it to the frontend, which injects it via `overrides` when starting the session.

**Recommendation:** Option A with overrides. Create the agent with a base system prompt in the ElevenLabs dashboard. Per-interview, the frontend passes the topic and context via `overrides.agent.prompt.prompt` when calling `startSession()`. The server provides the dynamic parts (topic, context, project summaries, recent meetings) in the `/start` response for the frontend to inject.

This means the start endpoint response changes to:

```json
{
  "meetingId": "uuid",
  "signedUrl": "wss://...",
  "promptOverride": "You are an AI interviewer... Topic: Q1 Strategy...",
  "firstMessage": "Hello! I'd like to discuss Q1 strategy with you today..."
}
```

### 6. Schema: Minor update to InterviewConfigSchema

Remove `geminiSessionId`. Add `elevenLabsConversationId` (optional, for cross-referencing).

```typescript
export const InterviewConfigSchema = z.object({
  topic: z.string(),
  context: z.string().optional(),
  voiceName: z.string().optional(),
  durationSeconds: z.number().optional(),
  elevenLabsConversationId: z.string().optional(),
});
```

### 7. Environment variables

**Remove:**
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_VOICE`

**Add:**
- `ELEVENLABS_API_KEY` -- ElevenLabs API key (server-side only)
- `ELEVENLABS_AGENT_ID` -- The pre-configured ElevenLabs agent ID

---

## What Does NOT Change

Everything listed here stays as-is:

- **`interviews.html`** -- HTML structure, panels, buttons, accessibility markup
- **`js/interview.js`** -- State machine, UI rendering, timer, visualizer, error states, toast, lifecycle. The only change is swapping `new window.GeminiLiveClient()` for the new ElevenLabs wrapper. The event interface stays identical.
- **`css/styles.css`** -- All interview CSS (config panel, connecting state, active state, processing state, error states, visualizer, badges, cards)
- **`server/src/interviews/post-process.ts`** -- Claude post-processing (identical input/output)
- **`server/src/interviews/prompt.ts`** -- The `buildPostProcessPrompt()` function stays. The `buildInterviewSystemInstruction()` function is adapted to work with ElevenLabs overrides.
- **`server/src/routes/interviews.ts`** -- The `complete` and `fail` endpoints stay identical. Only the `start` endpoint changes (signed URL instead of ephemeral token).
- **`server/src/schemas/meeting.ts`** -- MeetingType, TranscriptEntrySchema, CompleteInterviewSchema, FailInterviewSchema all stay identical.
- **Meeting card rendering** -- Interview cards, badges, expanded detail views
- **Design** -- No visual changes whatsoever

---

## Audio Visualizer Compatibility

The current visualizer uses `AnalyserNode` from Web Audio API, fed by both mic and playback `AudioContext` instances created in `gemini-client.js`.

The ElevenLabs SDK manages its own audio pipeline. We need to verify whether the SDK exposes `AnalyserNode` access or raw audio data. The `onAudio` callback provides raw audio data, which could be fed to an AnalyserNode.

**Fallback if AnalyserNode access is unavailable:** Use `onVadScore` (Voice Activity Detection scores) from the SDK to drive a simplified visualizer. Instead of per-frequency bar heights, use the VAD score as a single amplitude value applied to all bars with slight random variation. This would look slightly different but still provides visual feedback for speaking/listening states.

**Fallback 2:** Use `onModeChange` (listening/speaking) to toggle between idle animation and a simple "active" animation, without real audio data. Less rich but functional.

Andrei should evaluate the best approach given SDK capabilities.

---

## ElevenLabs Agent Setup (One-Time)

Before implementation, create an ElevenLabs agent via their dashboard:

1. **Name:** "Sherlock Labs Interviewer"
2. **Voice:** Choose a professional, neutral voice (evaluate during setup -- ElevenLabs has best-in-class options)
3. **Base system prompt:** The interviewer personality and rules (from `buildInterviewSystemInstruction()` in `prompt.ts`). The topic/context are injected per-session via overrides.
4. **LLM:** Use their default (GPT-4 class or whatever they route to)
5. **First message:** Configurable per-session via overrides
6. **Privacy:** Set as private agent (requires signed URL authentication)

Store the agent ID as `ELEVENLABS_AGENT_ID` in `.env`.

---

## Acceptance Criteria

All existing acceptance criteria from the original requirements doc remain in force. The pivot is invisible to the user. Specifically:

### AC1: Start an Interview (unchanged)
- [ ] "Interview" button on interviews.html
- [ ] Configuration panel with topic (required) and context (optional)
- [ ] Clicking "Start Interview" initiates the ElevenLabs conversation
- [ ] Browser requests microphone permission
- [ ] User speaks with AI interviewer in real time
- [ ] Other meeting buttons disabled during interview

### AC2: AI Interviewer Behavior (unchanged)
- [ ] AI asks relevant questions based on topic
- [ ] AI follows up on responses naturally
- [ ] Conversation feels natural

### AC3: Transcript Capture (mechanism changes, outcome identical)
- [ ] After call ends, transcript is assembled from ElevenLabs SDK events
- [ ] Transcript is sent to backend via `POST /api/interviews/:id/complete`
- [ ] Claude post-processing generates summary, takeaways, decisions, action items, mood

### AC4: Meeting Record (unchanged)
- [ ] Interview saved as JSON in `data/meetings/`
- [ ] Appears in meetings list with "Interview" badge
- [ ] Card shows topic, "CEO + AI Interviewer" participants
- [ ] Expanded view shows full detail (takeaways, decisions, action items, transcript)

### AC5: Error Handling (mechanism changes, UX identical)
- [ ] Microphone denied: clear error with guidance
- [ ] Connection failed: error with retry
- [ ] Connection lost mid-interview: transcript saved, warning shown
- [ ] Backend failure: transcript preserved without summary

### AC6: Guards (unchanged)
- [ ] Cannot start interview while another meeting running
- [ ] Cannot start meeting while interview in progress

### AC7: Pivot-Specific
- [ ] `gemini-client.js` and `audio-worklet-processor.js` are deleted
- [ ] No Gemini API calls remain in the codebase
- [ ] ElevenLabs SDK loaded and functional
- [ ] Signed URL authentication works (API key never reaches client)
- [ ] Audio visualizer responds to audio activity (real analyser data or VAD-based fallback)

---

## Implementation Order

This is a focused swap. The pipeline is shorter than a new feature:

### Phase 1: Architecture (Andrei)
- Evaluate ElevenLabs SDK loading for vanilla JS (CDN vs vendor)
- Determine audio visualizer approach (AnalyserNode access, onAudio, or VAD fallback)
- Write `docs/elevenlabs-pivot-tech-approach.md`
- Deliverable: clear answers on SDK loading, prompt delivery, visualizer, and transcript handling

### Phase 2: Backend Changes (Jonah)
- Replace `token.ts` with `signed-url.ts`
- Modify `POST /api/interviews/start` to return signed URL + prompt override
- Update `InterviewConfigSchema` (remove geminiSessionId, add elevenLabsConversationId)
- Update `.env` with ElevenLabs credentials
- Test signed URL generation with curl

### Phase 3: Frontend Changes (Alice)
- Delete `gemini-client.js` and `audio-worklet-processor.js`
- Create `elevenlabs-client.js` wrapper with same event interface
- Update `interviews.html` script tags (replace gemini-client with elevenlabs SDK + wrapper)
- Update `interview.js` to use new client (should be minimal -- swap constructor name)
- Verify audio visualizer works with chosen approach
- End-to-end test: start interview -> speak -> end -> transcript saved

### Phase 4: Design Review (Robert)
- Lightweight check that the UI looks and behaves identically to before
- Audio visualizer behaves correctly during conversation

### Phase 5: QA (Enzo) -- Release Gate
- Full test pass against acceptance criteria
- Verify Gemini code is fully removed
- Verify no regressions in interview flow

---

## Cost Estimate

| Plan | Cost per Minute | 30-Min Session | Monthly (5x/week) |
|------|----------------|----------------|-------------------|
| Creator ($22/mo) | $0.10/min | $3.00 | ~$65 |
| Pro ($99/mo) | ~$0.05/min | $1.50 | ~$35 |
| Business | $0.08/min | $2.40 | ~$52 |

At 3-5 interviews per week, expected cost: $30-65/month depending on plan. This is higher than Gemini's $0.76/session but the tradeoff is reliability, voice quality, and zero maintenance overhead.

Note: ElevenLabs currently absorbs LLM costs in the per-minute rate.

---

## Environment Setup

### Required Credentials
- `ELEVENLABS_API_KEY` -- ElevenLabs API key (get from elevenlabs.io dashboard)
- `ELEVENLABS_AGENT_ID` -- Agent ID created in ElevenLabs dashboard

### ElevenLabs Account
- Creator plan ($22/mo) is sufficient for development and regular usage
- Free tier available for initial testing

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SDK doesn't support vanilla JS (no UMD bundle) | Medium | Medium | Use widget embed CDN, or vendor a built copy |
| AnalyserNode not accessible for visualizer | Medium | Low | VAD-based fallback or mode-based animation |
| ElevenLabs raises prices | Low | Medium | At our volume ($30-65/mo), even 2x is acceptable |
| SDK version breaking changes | Low | Medium | Pin SDK version, test before upgrading |
| Transcript timing differs from Gemini | Low | Low | `onMessage` events provide the same data, just different transport |

---

## Open Questions for Architecture

1. **SDK loading:** Does `@11labs/client` ship a UMD/IIFE bundle usable via `<script>` tag? If not, what's the cleanest approach for vanilla JS?
2. **Audio pipeline access:** Can we get `AnalyserNode` instances from the SDK's audio pipeline for the visualizer? If not, what's the best fallback?
3. **Prompt override security:** When using `overrides.agent.prompt.prompt` in `startSession()`, can the client-side code modify the prompt maliciously? Is this a concern given this is a single-user internal tool?
4. **Session duration limits:** Does ElevenLabs have session duration limits like Gemini's 10-minute WebSocket? If so, does the SDK handle reconnection transparently?
