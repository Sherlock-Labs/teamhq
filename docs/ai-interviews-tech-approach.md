# AI-Powered Audio Interviews -- Technical Approach

**Author:** Andrei (Technical Architect)
**Date:** February 9, 2026
**Status:** Ready for design and implementation
**Project ID:** `ai-interviews`
**Dependencies:** `docs/ai-interviews-requirements.md` (Thomas), `docs/ai-interviews-gemini-evaluation.md` (Marco), `docs/ai-interviews-tech-research.md` (Marco), `docs/ai-interviews-market-research.md` (Suki)

---

## 1. Platform Decision: Gemini Live API

### Choice

**Gemini Live API** (Google AI Developer API, Gemini 2.5 Flash Native Audio model) as the sole voice AI platform for v1.

### Rationale

The CEO directed audio-only with Gemini Live API as the leading candidate. After reviewing Marco's evaluation against the requirements Thomas scoped and the existing codebase, Gemini is the clear winner for TeamHQ:

| Factor | Gemini Live API | ElevenLabs (Thomas's original pick) |
|--------|-----------------|-------------------------------------|
| **Cost per 30-min session** | ~$0.76 | ~$3.00 |
| **Cost per month (5x/week)** | ~$23 | ~$90 |
| **Context capacity** | 128k tokens | 5 knowledge base items |
| **Vanilla JS compatibility** | Native (WebSocket + Web Audio) | Web component (one-line embed) |
| **Authentication** | Ephemeral tokens (secure) | Agent ID (simple) |
| **Session management** | Manual (compression + resumption) | Automatic |
| **Dev effort** | 4-5 days | 1 day |
| **Voice quality** | Good (30 HD voices) | Best-in-class |
| **Transcript delivery** | Real-time over WebSocket | Post-call webhook |
| **Emotional understanding** | Native (from raw audio) | Limited |

### Why not ElevenLabs

Thomas's requirements were written assuming ElevenLabs. The CEO has since directed us to Gemini based on Marco's evaluation. The key tradeoffs:

1. **We lose the one-line widget embed.** ElevenLabs' `<elevenlabs-convai>` web component is the simplest possible integration. With Gemini, we build a custom WebSocket + Web Audio client. This is 4-5 days instead of 1 day. The tradeoff is justified by the 4x cost savings and 25x context capacity.

2. **We lose automatic session management.** ElevenLabs handles reconnection and duration limits invisibly. Gemini requires us to implement context compression and session resumption. This is the single biggest complexity addition. The architecture below addresses it.

3. **We lose post-call webhook delivery.** ElevenLabs sends a webhook with the complete transcript after the call. Gemini delivers transcripts as real-time chunks over WebSocket -- we assemble them client-side and send to the backend on completion. This actually simplifies the backend (no webhook endpoint, no HMAC verification) at the cost of frontend responsibility.

4. **We lose audio recording storage.** ElevenLabs stores recordings in the cloud. Gemini does not. For v1, we go transcript-only -- the requirements explicitly deferred audio playback (out of scope item #5). Audio capture can be added client-side later if needed.

### What we gain

1. **4x lower operating costs** -- $0.76/session vs $3.00/session.
2. **128k token context window** -- inject full project docs, meeting history, strategy briefs. ElevenLabs caps at 5 items.
3. **Native emotional understanding** -- the model interprets tone, stress, and pace from raw audio. Better for natural CEO interviews.
4. **Function calling mid-conversation** -- pull live project data during the interview. ElevenLabs supports this too, but Gemini's 128k context makes it more useful.
5. **Real-time transcription** -- both input and output transcription delivered as the conversation happens. Enables live transcript display (out of scope for v1, but the data is there for v2).
6. **Free tier for development** -- no cost during prototyping and testing.

### Architectural impact on Thomas's requirements

Thomas's requirements are platform-agnostic in structure. The key changes from ElevenLabs to Gemini:

| Requirement Area | ElevenLabs Approach | Gemini Approach |
|-----------------|---------------------|-----------------|
| Frontend widget | `<elevenlabs-convai>` web component | Custom WebSocket client + Web Audio API |
| Transcript delivery | `POST /api/webhooks/elevenlabs` (webhook) | Client-side assembly, `POST /api/interviews/:id/complete` |
| Authentication | Agent ID in widget attribute | Ephemeral token from backend |
| Interview start | Backend creates record, returns agent config | Backend creates record, returns ephemeral token |
| Post-processing | Triggered by webhook | Triggered by frontend completion call |
| Session duration | Unlimited (managed by ElevenLabs) | 15 min base, extended via compression + resumption |
| Recording URL | From ElevenLabs cloud | None for v1 (transcript-only) |

All acceptance criteria from the requirements remain achievable. The user experience is identical -- click a button, talk to an AI, get a transcript saved as a meeting. The plumbing changes, the product does not.

---

## 2. Authentication Strategy

### Production: Ephemeral Tokens

The Gemini API key never touches the browser. The Express backend generates short-lived ephemeral tokens that the frontend uses to open the WebSocket connection.

**Flow:**

```
Browser                         Express Backend                  Google API
  |                                   |                              |
  |  POST /api/interviews/start       |                              |
  |  { topic, context }               |                              |
  |---------------------------------->|                              |
  |                                   |  POST /ephemeral-token       |
  |                                   |  (system instructions locked)|
  |                                   |----------------------------->|
  |                                   |  { token, expires_in: 60s }  |
  |                                   |<-----------------------------|
  |  { meetingId, token, config }     |                              |
  |<----------------------------------|                              |
  |                                                                  |
  |  WebSocket: wss://generativelanguage.googleapis.com/...          |
  |  (using ephemeral token)                                         |
  |----------------------------------------------------------------->|
```

**Token properties:**
- Valid for 1 minute to initiate the WebSocket connection
- Session remains active for up to 30 minutes after connection
- System instructions are locked server-side in the token -- the client cannot modify them
- Token is single-use (one WebSocket connection per token)

**Why ephemeral tokens (not API key):**
- API key in the browser is a security risk -- anyone can inspect DevTools and extract it
- Ephemeral tokens expire quickly and are locked to specific system instructions
- The backend controls what the AI interviewer says and does -- the client just streams audio

### Development: API Key (optional)

For local development, the backend can optionally pass the API key directly in the WebSocket URL. This simplifies debugging but should never be used in production. Controlled by an environment variable flag.

### Environment Variables

```
GEMINI_API_KEY=<Google AI Developer API key>
GEMINI_MODEL=gemini-2.5-flash-live-001
```

No additional secrets needed. Unlike ElevenLabs (which needed `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, and `ELEVENLABS_WEBHOOK_SECRET`), Gemini needs only one API key. The model version is configurable for easy upgrades.

---

## 3. WebSocket Architecture

### Connection Topology

```
Browser (vanilla JS)  ----WebSocket---->  Gemini Live API
     |                                         |
     | Audio in (16kHz PCM Int16, base64)      | Audio out (24kHz PCM, base64)
     | Setup config (JSON)                     | Transcripts (JSON text)
     | Activity signals                        | Function call requests (JSON)
     |                                         | Session control messages
```

The browser connects **directly** to Google's WebSocket endpoint. No backend proxy for the audio stream. This is the lowest-latency architecture -- one hop from browser to Gemini.

The Express backend is involved only at two points:
1. **Before the interview:** Generate ephemeral token, create meeting record
2. **After the interview:** Receive assembled transcript, run Claude post-processing, save meeting

### WebSocket Message Protocol

The Gemini Live API uses a JSON message protocol over WebSocket. Key message types:

**Client -> Server:**
- `BidiGenerateContentSetup` -- session configuration (model, system instructions, tools, audio config)
- `BidiGenerateContentRealtimeInput` -- audio data chunks (base64-encoded PCM)
- `BidiGenerateContentClientContent` -- inject text context mid-session
- `BidiGenerateContentToolResponse` -- function call results

**Server -> Client:**
- `BidiGenerateContentSetupComplete` -- session ready
- `BidiGenerateContentServerContent` -- audio response chunks + transcription text
- `BidiGenerateContentToolCall` -- function call requests
- Session management messages (interruption, turn completion)

### Connection Lifecycle

```
1. Frontend calls POST /api/interviews/start
2. Backend creates meeting record (status: "running"), gets ephemeral token
3. Backend returns { meetingId, token, wsUrl, config }
4. Frontend opens WebSocket to Gemini using token
5. Frontend sends BidiGenerateContentSetup with audio config + system instructions
6. Gemini responds with SetupComplete
7. Frontend starts mic capture, streams audio chunks to WebSocket
8. Gemini processes audio, sends back audio responses + transcription
9. Frontend plays audio, accumulates transcript entries
10. [Session management: reconnect at ~9 min, compress at ~13 min]
11. User or AI ends the conversation
12. Frontend sends assembled transcript to POST /api/interviews/:id/complete
13. Backend runs Claude post-processing, updates meeting record
```

---

## 4. Audio Handling

### Microphone Capture

```javascript
// Request mic access
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
});

// Create AudioContext at 16kHz
const audioContext = new AudioContext({ sampleRate: 16000 });
const source = audioContext.createMediaStreamSource(stream);

// Use AudioWorkletNode for processing (ScriptProcessorNode is deprecated)
await audioContext.audioWorklet.addModule('js/audio-worklet-processor.js');
const processor = new AudioWorkletNode(audioContext, 'pcm-processor');

source.connect(processor);
processor.port.onmessage = (event) => {
  const pcmData = event.data; // Float32Array
  const int16Data = float32ToInt16(pcmData);
  const base64Audio = arrayBufferToBase64(int16Data.buffer);
  // Send over WebSocket
  ws.send(JSON.stringify({
    realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: base64Audio }] }
  }));
};
```

**Why AudioWorklet over ScriptProcessorNode:**
- ScriptProcessorNode is deprecated and runs on the main thread (causes jank)
- AudioWorklet runs on a dedicated audio rendering thread
- Consistent, low-latency buffer processing
- Required for modern browsers -- ScriptProcessorNode may be removed in future Chrome versions

### Audio Playback

```javascript
// Playback context at 24kHz (Gemini outputs higher quality than input)
const playbackContext = new AudioContext({ sampleRate: 24000 });
const audioQueue = []; // Buffer for incoming audio chunks

function handleAudioResponse(base64Audio) {
  const pcmData = base64ToInt16Array(base64Audio);
  const float32Data = int16ToFloat32(pcmData);
  const buffer = playbackContext.createBuffer(1, float32Data.length, 24000);
  buffer.getChannelData(0).set(float32Data);
  audioQueue.push(buffer);
  playNextInQueue();
}

// Sequential playback to prevent overlap
let isPlaying = false;
function playNextInQueue() {
  if (isPlaying || audioQueue.length === 0) return;
  isPlaying = true;
  const buffer = audioQueue.shift();
  const source = playbackContext.createBufferSource();
  source.buffer = buffer;
  source.connect(playbackContext.destination);
  source.onended = () => { isPlaying = false; playNextInQueue(); };
  source.start();
}
```

### Audio Format Summary

| Direction | Format | Sample Rate | Encoding | Transport |
|-----------|--------|-------------|----------|-----------|
| Mic -> Gemini | PCM Int16 LE | 16kHz | Base64 | WebSocket JSON |
| Gemini -> Speaker | PCM Int16 LE | 24kHz | Base64 | WebSocket JSON |

### Echo Cancellation

Browser's built-in `echoCancellation: true` on `getUserMedia` handles echo from the AI's audio playing through speakers. No additional echo cancellation needed for v1. If users report echo issues (common with external speakers), we can add a software-based AEC in the AudioWorklet as a v2 improvement.

---

## 5. Schema Changes

### MeetingType Enum

```typescript
// server/src/schemas/meeting.ts
// Before:
export const MeetingType = z.enum(["charter", "weekly", "custom"]);
// After:
export const MeetingType = z.enum(["charter", "weekly", "custom", "interview"]);
```

### New Optional Fields on MeetingSchema

```typescript
// Add to MeetingSchema.object({...}):
interviewConfig: z.object({
  topic: z.string(),
  context: z.string().optional(),
  voiceName: z.string().optional(),
  durationSeconds: z.number().optional(),
  geminiSessionId: z.string().optional(),
}).nullable().default(null),
```

**Design decisions:**
- `interviewConfig` is nullable and defaults to null. Non-interview meetings (charter, weekly, custom) never set it. This keeps the schema backward-compatible -- all existing meeting JSON files remain valid.
- No `recordingUrl` field for v1. Thomas's requirements included this for ElevenLabs, but Gemini does not provide cloud recording storage. We skip it entirely rather than adding a nullable field that is always null. If we add client-side recording later, we add the field then.
- No `agentId` field. ElevenLabs had a reusable agent ID. Gemini sessions are ephemeral -- there is no persistent "agent" object. The system instructions are generated per-interview.
- `geminiSessionId` is optional for debugging/cross-referencing. Not critical for v1 but useful if we need to troubleshoot sessions.
- `voiceName` stores which Gemini voice preset was used (e.g., "Kore", "Puck"). Defaults to whatever we pick as the standard voice.

### Transcript Mapping

Gemini delivers two transcript streams:
- **Input transcription** (CEO's speech): `response.server_content.input_transcription`
- **Output transcription** (AI's speech): delivered as text content in `BidiGenerateContentServerContent`

Map to existing `TranscriptEntrySchema`:

```typescript
// Input (CEO speaking):
{ speaker: "CEO", role: "Interviewee", text: inputTranscriptionText }

// Output (AI speaking):
{ speaker: "AI Interviewer", role: "Interviewer", text: outputTranscriptionText }
```

This uses the existing `{ speaker, role, text }` shape with no schema changes to `TranscriptEntrySchema`.

### Participants

Interview meetings set `participants: ["ceo", "ai-interviewer"]`. This is a string array matching the existing pattern. The frontend already handles rendering participants -- it will need a minor addition to display "CEO" and "AI Interviewer" labels instead of agent avatars.

### RunMeetingSchema

The existing `RunMeetingSchema` validates `POST /meetings/run` requests. Interviews do not use this endpoint -- they have their own `POST /api/interviews/start`. No changes needed to `RunMeetingSchema`.

---

## 6. Backend Routes

### New Route File: `server/src/routes/interviews.ts`

Separate from the meetings routes to keep concerns clean. Interviews have a different lifecycle (real-time audio session vs. Claude-simulated meeting).

#### `POST /api/interviews/start`

**Purpose:** Create interview meeting record, generate ephemeral token, return configuration to frontend.

**Request:**
```json
{
  "topic": "Q1 strategy review",
  "context": "Focus on mobile app launch timeline and hiring plan"
}
```

**Validation:**
- `topic` is required, non-empty string
- `context` is optional string
- No other meeting currently running (same guard as existing `POST /meetings/run`)

**Logic:**
1. Check no meeting is currently running (reuse `listMeetings()` + status check)
2. Generate ephemeral token from Google API with locked system instructions
3. Create meeting record via `createMeeting("interview", ["ceo", "ai-interviewer"], topic)`
4. Set `interviewConfig` on the record with topic, context, voice name
5. Return response

**Response:**
```json
{
  "meetingId": "uuid-here",
  "token": "ephemeral-token-here",
  "config": {
    "model": "gemini-2.5-flash-live-001",
    "voiceName": "Kore",
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": {
        "voiceConfig": { "prebuiltVoiceConfig": { "voiceName": "Kore" } }
      }
    },
    "inputAudioTranscription": {},
    "outputAudioTranscription": {}
  }
}
```

The frontend uses the token to open the WebSocket and the config to set up the audio session.

#### `POST /api/interviews/:id/complete`

**Purpose:** Receive assembled transcript from frontend, run Claude post-processing, update meeting record.

**Request:**
```json
{
  "transcript": [
    { "speaker": "AI Interviewer", "role": "Interviewer", "text": "Let's start by discussing..." },
    { "speaker": "CEO", "role": "Interviewee", "text": "Sure, the main priority is..." }
  ],
  "durationSeconds": 1823
}
```

**Validation:**
- Meeting ID must exist and have status "running"
- Meeting must be type "interview"
- Transcript must be a non-empty array of `{ speaker, role, text }` objects

**Logic:**
1. Validate meeting exists and is a running interview
2. Save raw transcript immediately (in case Claude post-processing fails)
3. Run Claude post-processing on the transcript (see section 9 for the prompt)
4. Update meeting record with transcript, summary, keyTakeaways, decisions, actionItems, mood, nextMeetingTopics
5. Set status to "completed", set `completedAt` and `durationMs`

**Error handling:**
- If Claude post-processing fails, save the raw transcript with `summary: null` and `status: "completed"`. The transcript is the primary artifact -- structured output is nice-to-have. Log the error but don't fail the request.
- If the meeting doesn't exist or isn't running, return 404/409.

**Response:**
```json
{
  "meetingId": "uuid-here",
  "status": "completed"
}
```

#### `POST /api/interviews/:id/fail`

**Purpose:** Mark an interview as failed if the WebSocket connection dies unrecoverably or the user's browser closes.

**Request:**
```json
{
  "error": "WebSocket connection lost after 3 reconnection attempts",
  "partialTranscript": [...]
}
```

**Logic:**
1. Update meeting status to "failed"
2. Save partial transcript if provided
3. Set error message

This is a safety net. Without it, a crashed interview would stay in "running" state forever, blocking future meetings.

### Ephemeral Token Generation

```typescript
// server/src/interviews/token.ts

export async function generateEphemeralToken(
  systemInstruction: string
): Promise<{ token: string; expiresIn: number }> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateEphemeralToken`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        contents: [],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" },
            },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Ephemeral token request failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    token: data.token,
    expiresIn: data.expiresIn || 60,
  };
}
```

### Claude Post-Processing

Reuse the existing `runClaude` function from `server/src/meetings/claude-runner.ts` and `MeetingOutputJsonSchema` from `server/src/schemas/meeting.ts`.

```typescript
// server/src/interviews/post-process.ts

import { runClaude } from "../meetings/claude-runner.js";
import { MeetingOutputJsonSchema } from "../schemas/meeting.js";

export async function postProcessInterview(
  topic: string,
  context: string | undefined,
  transcript: Array<{ speaker: string; role: string; text: string }>
): Promise<MeetingOutput> {
  const transcriptText = transcript
    .map((t) => `${t.speaker} (${t.role}): ${t.text}`)
    .join("\n");

  const prompt = buildInterviewPostProcessPrompt(topic, context, transcriptText);

  return (await runClaude(prompt, {
    jsonSchema: MeetingOutputJsonSchema,
    timeoutMs: 120_000,
  })) as MeetingOutput;
}
```

The post-processing prompt is defined in section 9.

---

## 7. Frontend Architecture

### Where the Interview UI Lives

The interview UI lives inline in the meetings section, following the same pattern as the custom meeting creation form. It slides open below the toolbar buttons when the user clicks "Interview."

```
+--------------------------------------------------+
| Team Meetings                                      |
| [Run Charter] [Run Weekly] [New Meeting] [Interview] |
+--------------------------------------------------+
| Interview Configuration Panel (slides open)        |
| +----------------------------------------------+  |
| | Topic: [___________________________]         |  |
| | Context: [___________________________]       |  |
| |                      [Start Interview]       |  |
| +----------------------------------------------+  |
+--------------------------------------------------+
```

When the interview is active, the configuration panel is replaced by the active interview UI:

```
+--------------------------------------------------+
| Team Meetings                                      |
| [Run Charter] [Run Weekly] [New Meeting] [Interview] |
|  (all disabled)                                    |
+--------------------------------------------------+
| Active Interview                                   |
| +----------------------------------------------+  |
| | [recording indicator]  Topic: Q1 Strategy    |  |
| |                                              |  |
| | [visual audio indicator / waveform]          |  |
| |                                              |  |
| |               [End Interview]                |  |
| +----------------------------------------------+  |
+--------------------------------------------------+
```

### UI States

The interview feature has five distinct states:

1. **Idle** -- "Interview" button visible in toolbar. No panel open.
2. **Configuring** -- Configuration panel open with topic/context fields and "Start Interview" button.
3. **Connecting** -- "Start Interview" clicked. Requesting mic permission, generating token, opening WebSocket. Show a "Connecting..." state.
4. **Active** -- Interview in progress. Audio is streaming. Show recording indicator, topic, and "End Interview" button. All other meeting buttons disabled.
5. **Processing** -- Interview ended. Transcript being sent to backend and post-processed. Show "Processing interview..." indicator. Transition to idle when complete, with the new interview appearing in the meeting list.

### Key Frontend Components

All vanilla JS, no framework. The interview module follows the same IIFE pattern as `js/meetings.js`.

**`js/interview.js`** -- Main interview module:
- Interview button click handler
- Configuration panel toggle
- Start/end interview flow
- State management (idle/configuring/connecting/active/processing)
- Communication with backend (`/api/interviews/start`, `/api/interviews/:id/complete`)

**`js/gemini-client.js`** -- WebSocket + Audio client:
- WebSocket connection management
- Audio capture (mic) via AudioWorklet
- Audio playback (speaker) via AudioContext
- Transcript accumulation from real-time chunks
- Session management (reconnection, compression)
- Event emitter pattern for UI updates (onTranscript, onStateChange, onError)

**`js/audio-worklet-processor.js`** -- AudioWorklet for PCM processing:
- Runs on audio rendering thread
- Converts Float32 to Int16 PCM
- Buffers and sends chunks at consistent intervals

### Integration with Existing meetings.js

The interview module does not modify `js/meetings.js`. Instead:
- `js/interview.js` dispatches a `CustomEvent` when an interview completes, which `js/meetings.js` listens for to refresh the meeting list.
- Both modules share the "meeting in progress" guard -- `js/interview.js` checks for running meetings before starting, and sets a flag that `js/meetings.js` checks before allowing charter/weekly/custom meetings.
- The guard uses a shared variable on `window` or a simple DOM attribute on the meetings section element.

### Meeting Card Rendering

Add an "Interview" badge variant in `js/meetings.js`:

```javascript
// In renderCard():
var typeBadge = 'Charter';
if (meeting.type === 'weekly') typeBadge = 'Weekly';
else if (meeting.type === 'custom') typeBadge = 'Custom';
else if (meeting.type === 'interview') typeBadge = 'Interview';
```

Interview cards show:
- "Interview" badge with distinct color (amber/orange -- per Thomas's requirements)
- Topic as subtitle (from `interviewConfig.topic`)
- "CEO + AI Interviewer" as participants (instead of agent avatars)
- Same expanded detail view as other meetings (takeaways, decisions, action items, transcript)

---

## 8. Session Management

This is the most complex part of the Gemini integration. The API has two hard limits:

1. **10-minute WebSocket connection lifetime** -- the connection drops after ~10 minutes
2. **15-minute session context limit** -- without compression, the 128k context window fills up after ~15 minutes of audio (25 tokens/sec x 60 sec x 15 min = 22,500 tokens for audio alone, plus system instructions and transcript)

For 30-60 minute CEO interviews, we need to handle both.

### Session Resumption (Connection Lifetime)

When the WebSocket disconnects (either from the 10-minute limit or a network hiccup), the client reconnects transparently using a resumption token.

**Flow:**
1. On each server message, extract the resumption token from `sessionResumptionUpdate.token`
2. Store the latest resumption token in memory
3. When the WebSocket closes:
   a. If the close was intentional (user clicked "End Interview"), do nothing
   b. If the close was unexpected, wait 1 second, then reconnect
   c. On reconnect, include the resumption token in the setup config
4. Gemini resumes the session from where it left off -- no context loss

**Resumption token properties:**
- Valid for 2 hours (Google AI Developer API)
- Each new token supersedes the previous one
- Token is opaque -- treat it as a string

**Implementation:**
```javascript
// In gemini-client.js
class GeminiLiveClient {
  constructor() {
    this.resumptionToken = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.intentionalClose = false;
  }

  onWebSocketClose() {
    if (this.intentionalClose) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', 'Connection lost after 3 attempts');
      return;
    }
    this.reconnectAttempts++;
    setTimeout(() => this.connect({ resumeToken: this.resumptionToken }), 1000);
  }

  onServerMessage(msg) {
    if (msg.sessionResumptionUpdate?.token) {
      this.resumptionToken = msg.sessionResumptionUpdate.token;
    }
    // ... handle audio, transcript, etc.
  }
}
```

### Context Window Compression (Session Duration)

For sessions longer than ~15 minutes, enable context window compression to prevent the context from filling up.

**Configuration:**
```json
{
  "sessionResumption": {
    "transparentResumption": true
  },
  "contextWindowCompression": {
    "triggerTokens": 100000,
    "slidingWindow": {
      "targetTokens": 50000
    }
  }
}
```

This tells Gemini: when the context reaches 100k tokens, compress it down to 50k tokens by summarizing older turns. The compression happens server-side -- the client just keeps streaming.

**Behavior:**
- At ~100k tokens (~66 minutes of pure audio), compression kicks in
- Oldest conversation turns are summarized or pruned
- The AI retains the most recent context and a summary of earlier content
- This effectively allows unlimited session duration

**For v1, configure compression from the start.** Even for 15-minute interviews, the overhead is negligible and it provides a safety net. Better to have compression active and never hit it than to have a session crash at 16 minutes.

### Proactive Reconnection Strategy

Rather than waiting for the 10-minute disconnect, reconnect proactively at the 9-minute mark:

```javascript
const RECONNECT_INTERVAL_MS = 9 * 60 * 1000; // 9 minutes

startReconnectTimer() {
  this.reconnectTimer = setTimeout(() => {
    this.reconnectAttempts = 0; // Reset counter for proactive reconnect
    this.ws.close(); // This triggers onWebSocketClose -> reconnect with token
  }, RECONNECT_INTERVAL_MS);
}
```

This avoids the edge case where the connection drops mid-sentence. By reconnecting proactively during a natural pause (after Gemini finishes a response), the transition is seamless.

### 15-Minute Soft Limit

For v1, set a soft time limit of 15 minutes. After 15 minutes:
1. Show a subtle "15 minutes elapsed" indicator in the UI
2. The AI interviewer's system instructions include guidance to start wrapping up around 15 minutes
3. The user can continue beyond 15 minutes -- the technical infrastructure supports it via compression and resumption

This keeps v1 sessions manageable while the infrastructure supports longer sessions if the CEO wants them.

---

## 9. Context Injection and System Prompt

### System Instruction (Locked Server-Side)

The system instruction is embedded in the ephemeral token and cannot be modified by the client. It is assembled server-side from the interview topic, optional context, and standing team knowledge.

```typescript
// server/src/interviews/prompt.ts

export function buildInterviewSystemInstruction(
  topic: string,
  context?: string,
  projectSummaries?: string,
  recentMeetingSummaries?: string,
): string {
  const sections: string[] = [];

  sections.push(`You are an AI interviewer for Sherlock Labs, a software product team led by its CEO. You are conducting a one-on-one audio interview with the CEO.

Your name is "Interviewer" -- do not make up a human name for yourself. You are a professional, thoughtful AI interviewer.

## Interview Topic
${topic}
${context ? `\n## Additional Context\n${context}` : ""}

## Your Role
- Ask thoughtful, open-ended questions about the given topic
- Listen carefully and ask follow-up questions based on what the CEO says
- Cover all key areas related to the topic
- Periodically summarize what you have heard before moving to a new area
- Wrap up by confirming the main takeaways and asking if there is anything else

## Conversation Style
- Be conversational and natural, not robotic or scripted
- Give the CEO time to think -- do not rush to fill silences
- If the CEO goes off-topic, gently guide back but do not cut them off
- Use brief verbal acknowledgments ("I see", "That makes sense") to show you are listening
- Do not be sycophantic -- ask genuine follow-up questions, including challenging ones

## Timing
- Aim for a 10-15 minute conversation unless the CEO wants to go longer
- After about 12 minutes, begin steering toward wrap-up
- End by summarizing the key points you heard and asking if there is anything else to add

## Important Rules
- Never fabricate information about Sherlock Labs or its products
- If you do not know something, ask the CEO rather than guessing
- Focus on capturing the CEO's thinking, not providing your own opinions
- This is an interview, not a debate -- your job is to draw out information`);

  if (projectSummaries) {
    sections.push(`## Current Projects at Sherlock Labs
${projectSummaries}`);
  }

  if (recentMeetingSummaries) {
    sections.push(`## Recent Meeting Context
${recentMeetingSummaries}`);
  }

  return sections.join("\n\n");
}
```

### Context Injection via `send_client_content`

For context that is too large for the system instruction (e.g., full project docs), use `send_client_content` to inject text into the session context after setup:

```javascript
// After WebSocket setup is complete, inject additional context
ws.send(JSON.stringify({
  clientContent: {
    turns: [{
      role: "user",
      parts: [{ text: "Here is additional context for this interview:\n\n" + additionalContext }]
    }],
    turnComplete: true,
  }
}));
```

For v1, system instructions alone should be sufficient. The 128k context window can hold substantial system instructions. Reserve `send_client_content` for future per-interview document injection (v2).

### Context Sources

The backend gathers context from the same sources as existing meetings:

1. **Projects:** `listProjects()` from `server/src/store/projects.ts` -- current project names and statuses
2. **Recent meetings:** `getRecentMeetings(3)` from `server/src/store/meetings.ts` -- summaries and decisions from the last 3 meetings
3. **Interview topic + context:** User-provided from the configuration panel

This reuses the exact infrastructure that `server/src/meetings/context.ts` already provides. No new context sources for v1.

### Claude Post-Processing Prompt

```typescript
// server/src/interviews/prompt.ts

export function buildPostProcessPrompt(
  topic: string,
  context: string | undefined,
  transcriptText: string,
): string {
  return `Analyze this interview transcript between the CEO of Sherlock Labs and an AI interviewer.

## Interview Topic
${topic}
${context ? `\nAdditional context: ${context}` : ""}

## Instructions
Generate a structured summary of this interview. Focus on what the CEO said -- their decisions, priorities, concerns, and action items.

- **summary**: A 2-3 sentence summary of the interview capturing the main thrust of the CEO's thinking.
- **keyTakeaways**: 3-5 key takeaways -- the most important things the CEO communicated.
- **decisions**: Any decisions the CEO articulated during the interview. Include the rationale if stated. Set participants to ["CEO"].
- **actionItems**: Any action items the CEO mentioned or committed to. Assign owner as the person the CEO named (or "CEO" if self-assigned). Assess priority based on the CEO's emphasis.
- **mood**: The overall tone of the interview in 1-3 words (e.g., "Focused and energized", "Reflective", "Urgently strategic").
- **nextMeetingTopics**: Topics the CEO flagged for follow-up or deeper discussion later.
- **transcript**: Return the transcript as-is (do not modify it). Each entry should have speaker, role, and text fields.

## Transcript
${transcriptText}`;
}
```

This uses the existing `MeetingOutputJsonSchema` to produce the same structured output shape as other meetings. The post-processing prompt is interview-specific but the output schema is shared.

---

## 10. Transcript Extraction and Storage

### Real-Time Accumulation (Client-Side)

The Gemini Live API delivers transcriptions as they happen:

```javascript
class TranscriptAccumulator {
  constructor() {
    this.entries = [];
    this.currentInputBuffer = "";
    this.currentOutputBuffer = "";
  }

  // Called when input transcription arrives (CEO's speech)
  onInputTranscript(text) {
    // Input transcriptions may arrive as partial chunks
    // Accumulate until a natural pause, then commit as one entry
    this.currentInputBuffer += text;
  }

  onInputTurnComplete() {
    if (this.currentInputBuffer.trim()) {
      this.entries.push({
        speaker: "CEO",
        role: "Interviewee",
        text: this.currentInputBuffer.trim(),
      });
      this.currentInputBuffer = "";
    }
  }

  // Called when output transcription arrives (AI's speech)
  onOutputTranscript(text) {
    this.currentOutputBuffer += text;
  }

  onOutputTurnComplete() {
    if (this.currentOutputBuffer.trim()) {
      this.entries.push({
        speaker: "AI Interviewer",
        role: "Interviewer",
        text: this.currentOutputBuffer.trim(),
      });
      this.currentOutputBuffer = "";
    }
  }

  getTranscript() {
    // Flush any remaining buffers
    this.onInputTurnComplete();
    this.onOutputTurnComplete();
    return [...this.entries];
  }
}
```

**Turn boundary detection:**
- The Gemini API sends `serverContent.turnComplete: true` when the AI finishes speaking and expects user input
- Use this signal to commit the current output buffer as a transcript entry
- For input (CEO speech), commit when VAD detects end of speech (signaled by the API starting its response)

### Delivery to Backend

When the interview ends, the frontend sends the complete transcript to the backend:

```javascript
async function completeInterview(meetingId, transcript, durationSeconds) {
  const response = await fetch(`/api/interviews/${meetingId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, durationSeconds }),
  });
  if (!response.ok) throw new Error("Failed to save interview");
  return response.json();
}
```

### Storage

The backend saves the interview as a JSON file in `data/meetings/` -- the exact same location and format as charter, weekly, and custom meetings. No new storage system. The existing `listMeetings()`, `getMeeting()`, and `updateMeeting()` functions work without modification because the schema changes are additive (nullable `interviewConfig` field).

### Transcript Resilience

Risk: If the browser crashes or closes during an interview, the transcript in memory is lost.

**Mitigation for v1:** Periodically save transcript snapshots to `localStorage`:

```javascript
// Every 30 seconds, save current transcript to localStorage
setInterval(() => {
  if (this.entries.length > 0) {
    localStorage.setItem(
      `interview-transcript-${meetingId}`,
      JSON.stringify(this.entries)
    );
  }
}, 30000);
```

On page load, check for orphaned transcripts and offer to recover them. This is a best-effort safety net, not a guarantee.

---

## 11. Error Handling

### Connection Errors

| Error | Detection | User-Facing Message | Recovery |
|-------|-----------|---------------------|----------|
| WebSocket fails to open | `ws.onerror` on initial connect | "Unable to connect to the interview service. Check your internet connection and try again." | Retry button |
| WebSocket drops mid-interview | `ws.onclose` with unexpected code | (Silent reconnect attempt) | Automatic reconnect via resumption token (3 attempts) |
| All reconnect attempts fail | Counter exceeds 3 | "Connection lost. Your transcript has been saved up to the point of disconnection." | Save partial transcript via `POST /api/interviews/:id/fail` |
| Ephemeral token generation fails | HTTP error from Google API | "Unable to start the interview. Please try again in a moment." | Retry button |

### Microphone Errors

| Error | Detection | User-Facing Message | Recovery |
|-------|-----------|---------------------|----------|
| Permission denied | `getUserMedia` throws `NotAllowedError` | "Microphone access is required for interviews. Please allow microphone access in your browser settings and try again." | Show browser-specific instructions for enabling mic |
| No mic found | `getUserMedia` throws `NotFoundError` | "No microphone detected. Please connect a microphone and try again." | Retry button |
| Mic in use by another app | `getUserMedia` throws `NotReadableError` | "Your microphone is being used by another application. Please close other apps using the mic and try again." | Retry button |

### Backend Errors

| Error | Detection | User-Facing Message | Recovery |
|-------|-----------|---------------------|----------|
| `POST /api/interviews/start` fails | HTTP 500 | "Unable to start the interview. Please try again." | Retry button |
| Meeting already running | HTTP 409 | "Another meeting is in progress. Please wait for it to complete." | Disable interview button |
| `POST /api/interviews/:id/complete` fails | HTTP 500 | "Interview complete but failed to save. Retrying..." | Auto-retry 3 times with exponential backoff. If all fail, save transcript to localStorage and show manual retry option. |
| Claude post-processing fails | Caught in backend | (Not shown to user -- transcript saved without summary) | Backend logs error, saves raw transcript. Summary fields remain null. |

### Timeout Handling

- **15-minute soft limit:** UI shows elapsed time indicator. System instruction tells AI to wrap up. No hard cutoff.
- **60-minute hard limit:** After 60 minutes, the frontend automatically ends the interview with a warning toast: "Interview automatically ended after 60 minutes." Saves transcript. This prevents runaway sessions.
- **Backend token timeout:** Ephemeral tokens expire after 30 minutes of active session. For sessions longer than 30 minutes, the proactive reconnection strategy (section 8) generates a fresh token through the backend on reconnect.

### Graceful Degradation

The core principle: **always save the transcript.** If any post-processing step fails, the raw transcript is still saved as a meeting record. The user gets the full conversation text even if the summary, takeaways, and action items fail to generate. These can be regenerated later by manually triggering Claude post-processing.

---

## 12. File Structure

### New Files

```
js/interview.js                            # Interview UI module (state, buttons, panels)
js/gemini-client.js                        # WebSocket + audio streaming client
js/audio-worklet-processor.js              # AudioWorklet for PCM capture
server/src/routes/interviews.ts            # Interview API routes
server/src/interviews/token.ts             # Ephemeral token generation
server/src/interviews/post-process.ts      # Claude post-processing for interviews
server/src/interviews/prompt.ts            # System instruction + post-processing prompts
```

### Modified Files

```
server/src/schemas/meeting.ts              # Add "interview" to MeetingType, add interviewConfig
server/src/routes/meetings.ts              # Import interview routes (or register in server entry)
server/src/store/meetings.ts               # No changes needed (additive schema)
index.html                                 # Add Interview button, config panel, active interview UI
js/meetings.js                             # Add "Interview" badge, interview card rendering, guard integration
css/styles.css                             # Interview panel styles, badge color, recording indicator
```

### Files NOT Changed

```
server/src/meetings/runner.ts              # Only used for simulated meetings, not interviews
server/src/meetings/context.ts             # Reused but not modified (interview routes import directly)
server/src/meetings/prompt.ts              # Only used for simulated meetings
server/src/meetings/claude-runner.ts       # Reused but not modified
```

### Server Entry Point

Register the new interview routes in the Express server entry point (same file where meeting routes are registered):

```typescript
import interviewRoutes from "./routes/interviews.js";
app.use("/api", interviewRoutes);
```

---

## 13. Implementation Order

### Phase 1: Schema + Backend Foundation (Jonah, ~1 day)

1. Add `"interview"` to `MeetingType` enum in `server/src/schemas/meeting.ts`
2. Add `interviewConfig` nullable field to `MeetingSchema`
3. Create `server/src/interviews/token.ts` -- ephemeral token generation
4. Create `server/src/interviews/prompt.ts` -- system instruction builder + post-processing prompt
5. Create `server/src/interviews/post-process.ts` -- Claude post-processing
6. Create `server/src/routes/interviews.ts` -- three endpoints (`start`, `complete`, `fail`)
7. Register interview routes in server entry point
8. Test endpoints with curl / Postman

### Phase 2: WebSocket + Audio Client (Alice, ~2 days)

1. Create `js/audio-worklet-processor.js` -- PCM capture worklet
2. Create `js/gemini-client.js` -- WebSocket client with:
   - Connection management (open, close, reconnect)
   - Audio capture pipeline (mic -> worklet -> base64 -> WebSocket)
   - Audio playback pipeline (WebSocket -> base64 -> AudioContext -> speakers)
   - Transcript accumulation
   - Session resumption (token storage, reconnect on close)
   - Context compression config
   - Event emitter (onTranscript, onStateChange, onAudioLevel, onError)
3. Test standalone (console-based) with a simple HTML test page before integrating into TeamHQ

### Phase 3: Interview UI (Alice, ~1.5 days)

1. Add "Interview" button to meetings toolbar in `index.html`
2. Add interview configuration panel HTML (topic, context, start button)
3. Add active interview panel HTML (recording indicator, timer, end button)
4. Create `js/interview.js` -- UI state management:
   - Button click handlers
   - Configuration panel toggle
   - Start interview flow (validate -> call backend -> init Gemini client -> stream)
   - Active interview state (recording indicator, elapsed timer)
   - End interview flow (stop audio -> send transcript -> show processing state)
   - Error state rendering (mic errors, connection errors)
5. Add "Interview" badge to meeting cards in `js/meetings.js`
6. Add interview card rendering (topic subtitle, "CEO + AI Interviewer" participants)
7. Add CSS for interview panel, badge, recording indicator, audio visualizer
8. Wire up "meeting in progress" guard integration between `interview.js` and `meetings.js`

### Phase 4: Integration Testing (Alice + Jonah, ~0.5 day)

1. End-to-end flow: start interview -> speak -> end -> transcript saved -> appears in list
2. Reconnection test: kill WebSocket mid-interview, verify transparent reconnect
3. Error scenarios: deny mic, kill backend, close browser mid-interview
4. Guard tests: try starting a meeting while interview is running (and vice versa)
5. Verify interview cards render correctly in meeting list alongside other meeting types

### Phase 5: Design Review (Robert)

Lightweight visual review of the interview UI against the design spec. Focus on:
- Button placement and styling consistency
- Interview panel layout and spacing
- Recording indicator visibility
- Badge color and differentiation
- Interview card in the meeting list

### Phase 6: QA (Enzo) -- Release Gate

Full test pass against all acceptance criteria from Thomas's requirements. Pass/fail verdict required before shipping.

### Total Estimated Effort: 5 days

| Phase | Owner | Days |
|-------|-------|------|
| Schema + Backend | Jonah | 1 |
| WebSocket + Audio | Alice | 2 |
| Interview UI | Alice | 1.5 |
| Integration Testing | Alice + Jonah | 0.5 |
| Design Review | Robert | 0.25 |
| QA | Enzo | 0.5 |

Alice and Jonah can work in parallel after agreeing on the API contract (Phase 1 defines the contract, Phase 2-3 run in parallel).

---

## 14. Voice Selection

For v1, use a single voice preset configured server-side.

**Recommended voice: Kore** -- neutral, professional tone. Suitable for an interviewer role. Other strong candidates from Gemini's HD voices:
- **Puck** -- conversational, friendly (default). May be too casual for CEO interviews.
- **Charon** -- deep, authoritative. May feel too dominant for an interviewer (should be a listener, not a lecturer).
- **Fenrir** -- warm, approachable. Good alternative to Kore.

The voice is set in the ephemeral token configuration. To change it, update the `voiceName` constant in `server/src/interviews/token.ts`. No UI for voice selection in v1 (explicitly out of scope per Thomas's requirements item #10).

---

## 15. VAD Configuration

Gemini's built-in Voice Activity Detection is enabled by default. For CEO interviews, adjust the default silence threshold to accommodate thinking pauses:

```json
{
  "realtimeInputConfig": {
    "automaticActivityDetection": {
      "disabled": false,
      "startOfSpeechSensitivity": "START_SENSITIVITY_MEDIUM",
      "endOfSpeechSensitivity": "END_SENSITIVITY_LOW",
      "prefixPaddingMs": 300,
      "silenceDurationMs": 2000
    }
  }
}
```

**Rationale:**
- `silenceDurationMs: 2000` (2 seconds) -- CEO strategy interviews involve thinking pauses. The default (~1 second) would cause the AI to jump in too quickly. Two seconds gives the CEO room to think before the AI interprets silence as end-of-turn.
- `endOfSpeechSensitivity: "END_SENSITIVITY_LOW"` -- reduces false end-of-speech triggers from brief pauses, "um"s, and short acknowledgments.
- `prefixPaddingMs: 300` -- captures the onset of speech that might otherwise be clipped.

These can be tuned after real testing. If the AI still interrupts too eagerly, increase `silenceDurationMs` to 3000. If the AI is too slow to respond, decrease to 1500.

---

## 16. Security Considerations

1. **API key never in browser.** The `GEMINI_API_KEY` stays on the Express server. Only ephemeral tokens reach the client.
2. **System instructions locked.** Ephemeral tokens lock the system instruction server-side. The client cannot inject adversarial instructions.
3. **Input validation.** All backend endpoints validate input with Zod schemas. Transcript entries are validated before storage.
4. **No PII in transit to Gemini.** The interview topic and context are provided by the CEO. The system instruction includes project names and meeting summaries but no credentials, API keys, or personal data.
5. **CORS.** Interview API endpoints follow the same CORS policy as existing meeting endpoints.
6. **Rate limiting.** Not needed for v1 (single user). If TeamHQ becomes multi-user, add rate limiting to `POST /api/interviews/start`.

---

## 17. Open Questions Resolved

Thomas raised three open questions in the requirements. Here are the answers for the Gemini architecture:

**Q1: Widget initialization -- does it need server-side token generation per session?**
A: Yes. Each interview requires a fresh ephemeral token generated by the backend. The token embeds the system instruction and audio configuration. This is handled by `POST /api/interviews/start`.

**Q2: Webhook reliability -- what happens if the webhook fails?**
A: Not applicable. Gemini does not use webhooks. Transcripts are assembled client-side and sent to the backend via `POST /api/interviews/:id/complete`. If this call fails, the client retries with exponential backoff. If all retries fail, the transcript is saved to `localStorage` for manual recovery.

**Q3: Conversation ID timing -- when does it become available?**
A: The Gemini session does not have a persistent "conversation ID" like ElevenLabs. The meeting ID is generated by our backend before the WebSocket opens. The association between the meeting record and the Gemini session is maintained client-side (the frontend holds both the `meetingId` and the WebSocket connection). No external ID matching needed.

---

## 18. Future Upgrade Paths

These are not in v1 scope but are architecturally supported:

1. **Live transcription display.** The `gemini-client.js` already accumulates transcripts in real-time. Exposing them in the UI is a frontend-only change (no backend work).

2. **Audio recording.** Add a `MediaRecorder` alongside the AudioWorklet to capture raw audio as a Blob. Upload to the server on completion. Add `recordingUrl` field to schema.

3. **Voice selection.** Add a voice picker dropdown in the configuration panel. Pass selected voice name to `POST /api/interviews/start`. Backend includes it in the ephemeral token config.

4. **Interview templates.** Store template configs (topic presets, context snippets, voice preferences) as JSON in `data/interview-templates/`. Frontend loads templates for quick start.

5. **Function calling mid-interview.** Define Gemini tools that call TeamHQ's backend during the conversation (e.g., "What's the status of the SherlockPDF project?"). The `gemini-client.js` handles tool call messages; the backend provides a tool execution endpoint.

6. **Migration to ElevenLabs voice.** If voice quality becomes a real complaint, Gemini can be replaced as the LLM brain while routing TTS through ElevenLabs. This is a significant architecture change but the transcript format and backend post-processing remain identical.

---

## Appendix: API Contract Summary

For Alice and Jonah to align on before parallel implementation.

### `POST /api/interviews/start`

**Request:**
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
  token: string;        // Ephemeral token for WebSocket auth
  config: {
    model: string;
    voiceName: string;
    generationConfig: object;
    inputAudioTranscription: object;
    outputAudioTranscription: object;
  };
}
```

**Errors:**
- 400: Missing topic
- 409: Meeting already running

### `POST /api/interviews/:id/complete`

**Request:**
```typescript
{
  transcript: Array<{
    speaker: string;
    role: string;
    text: string;
  }>;
  durationSeconds: number;
}
```

**Response (200):**
```typescript
{
  meetingId: string;
  status: "completed";
}
```

**Errors:**
- 404: Meeting not found
- 409: Meeting is not in "running" state or not type "interview"

### `POST /api/interviews/:id/fail`

**Request:**
```typescript
{
  error: string;
  partialTranscript?: Array<{
    speaker: string;
    role: string;
    text: string;
  }>;
}
```

**Response (200):**
```typescript
{
  meetingId: string;
  status: "failed";
}
```

**Errors:**
- 404: Meeting not found
