# Gemini Live API -- Technical Evaluation for AI-Powered Interviews

**Researcher:** Marco (Technical Researcher)
**Date:** February 9, 2026
**Status:** Complete -- ready for Thomas to scope
**Context:** Follow-up to `docs/ai-interviews-tech-research.md` (Marco) and `docs/ai-interviews-market-research.md` (Suki). Neither covered Gemini Live API. The CEO flagged it as a potential alternative to ElevenLabs and Vapi.

---

## Executive Summary

Google's Gemini Live API is a WebSocket-based real-time audio/video streaming API powered by the Gemini 2.5 Flash Native Audio model. It is now **generally available** on both the Google AI Developer API (free tier + pay-as-you-go) and Vertex AI (enterprise). The API offers built-in voice activity detection, function calling during conversations, session resumption, context window compression for long sessions, input/output transcription, and emotional understanding -- all at a dramatically lower price point than any platform evaluated in our earlier research.

**Bottom line:** At approximately **$0.75 per 30-minute session** (vs. $3.00 for ElevenLabs, $4.50 for Vapi/Retell), Gemini Live API is 4-6x cheaper than the alternatives. It also eliminates the multi-vendor dependency (no separate STT + LLM + TTS stack). The tradeoff: it requires more integration work than ElevenLabs' one-line widget embed, voice quality is good but not ElevenLabs-tier, and the voice customization options are limited. For TeamHQ's interview use case, Gemini Live API is the strongest candidate on price and capability -- and it works with our vanilla JS stack.

---

## 1. Core Capabilities

### WebSocket-Based Real-Time Audio

The Gemini Live API uses a **direct WebSocket connection** between client and server. The protocol is message-based with a `type` field indicating the content type (audio, text, config, etc.). Audio is streamed bidirectionally:

- **Input:** 16kHz, 16-bit PCM, little-endian
- **Output:** 24kHz audio (higher quality playback)
- **Token rate:** 25 tokens per second of audio (both input and output)

The browser connects directly to Google's WebSocket endpoint -- no mandatory backend proxy. This is architecturally simpler than Vapi/Retell, which route through their own cloud infrastructure. Direct connection means lower latency (one fewer hop).

### Gemini 2.5 Flash Native Audio Model

The native audio model is a single-model architecture -- it processes raw audio natively rather than using a traditional STT -> LLM -> TTS pipeline. This has significant implications:

- **Lower latency:** No separate transcription or synthesis stages
- **Emotional understanding:** The model interprets tone, emotion, and pace directly from audio waveforms, enabling affective dialogue (e.g., automatically de-escalating stress, matching empathetic tone)
- **Richer responses:** The model can generate vocal nuance (emphasis, pacing) that pipeline-based TTS cannot

This is architecturally similar to OpenAI's Realtime API -- a single model that "thinks in audio" rather than converting audio to text, reasoning, and converting back.

### Voice Activity Detection (Built-In)

Server-side VAD is built into the API and enabled by default. Configuration options:

| Parameter | Description |
|-----------|-------------|
| `prefix_padding_ms` | Captures speech onset events that might otherwise be truncated |
| `silence_duration_ms` | Threshold for detecting speech completion |
| `disabled` | Set to `true` to handle VAD client-side with manual `activityStart`/`activityEnd` events |

For interviews, the built-in VAD should work well out of the box. If we need finer control (e.g., longer pauses for CEO thinking time), we can adjust `silence_duration_ms` or disable auto-VAD entirely and manage turn-taking manually.

### Interruption Handling

When VAD detects a user interruption:

1. Ongoing generation is immediately canceled and discarded
2. Only audio already sent to the client is retained in session history
3. Server sends a `BidiGenerateContentServerContent` message reporting the interruption
4. Model resumes listening for the user's input

Interruption handling can be configured via `activity_handling` to prevent accidental barge-in -- useful for interviews where the CEO might make affirmative sounds ("mm-hmm") without intending to interrupt.

### Function Calling During Conversation

The Live API supports function calling mid-conversation, identical to standard Gemini API function calling. Two execution modes:

- **Sequential (default):** Conversation pauses while function executes. Use for data retrieval the model needs before responding.
- **Non-blocking (async):** Conversation continues while function runs in background. Use for logging, side-effects, or non-blocking data fetches.

For interviews, function calling enables:
- Pulling in project context mid-conversation ("Let me check the latest sprint data...")
- Logging key decisions or action items in real-time to TeamHQ's backend
- Triggering post-interview processing workflows

### Session Management

| Feature | Capability |
|---------|------------|
| **Base session duration** | ~15 minutes (audio-only, no compression) |
| **Connection lifetime** | ~10 minutes per WebSocket connection |
| **Session resumption** | Resume across connection resets using resumption tokens (valid 2 hours, extendable to 24 hours on Vertex AI) |
| **Context compression** | Sliding-window compression to extend sessions indefinitely -- oldest turns pruned or summarized automatically |
| **Context window** | 128k tokens |

For a 30-60 minute CEO interview, we need both context compression and session resumption:
- **Context compression** prevents the 128k token window from filling up (25 tokens/sec x 60 sec x 60 min = 90,000 tokens for a 60-min session -- tight but manageable with compression)
- **Session resumption** handles the 10-minute connection lifetime limit by transparently reconnecting

This is more complex than ElevenLabs (which handles session management invisibly), but Google provides clear primitives for building it.

### Multilingual Support

- **30 HD voices** across **24 languages**
- Live speech translation across **70+ languages** and **2,000 language pairs**
- Language can be restricted via system instructions

For TeamHQ's current use case (English CEO interviews), this is overkill but a nice-to-have for future expansion.

### Emotional Understanding / Affective Dialogue

The native audio model understands emotional cues from raw audio -- tone, stress, excitement, frustration. It can:
- Automatically adjust its tone to match the conversation's emotional register
- De-escalate when detecting stress
- Adopt empathetic tones when appropriate

This is a genuine differentiator. ElevenLabs has excellent voice quality but doesn't have native emotional understanding from the input audio. For CEO strategy interviews, this could lead to more natural, adaptive conversations.

---

## 2. Pricing

### Gemini Live API Cost Model

The Live API uses a **hybrid billing model**:

| Component | Cost |
|-----------|------|
| Base session setup | $0.005 per session |
| Active conversation time | $0.025 per minute |
| Audio input tokens | ~$1.00 per 1M tokens (25 tokens/sec = 1,500 tokens/min) |
| Audio output tokens | Included in per-minute rate |

### Real-World Cost Per Interview

| Duration | Gemini Live API | ElevenLabs | Vapi | Retell |
|----------|-----------------|------------|------|--------|
| 10 min (pulse check) | ~$0.26 | ~$1.00 | ~$1.50-3.30 | ~$1.50 |
| 30 min (strategy) | ~$0.76 | ~$3.00 | ~$4.00-10.00 | ~$4.50 |
| 60 min (deep dive) | ~$1.51 | ~$6.00 | ~$8.00-20.00 | ~$9.00 |

**Gemini is 4-6x cheaper than the next cheapest option (ElevenLabs).** At this price point, daily 30-minute CEO interviews would cost roughly **$23/month** vs. $90/month on ElevenLabs or $135-300/month on Vapi.

### Free Tier

The Google AI Developer API includes a free tier:
- Gemini 2.5 Flash: 10 RPM, 250 RPD, 250k TPM
- No Live API-specific free minutes documented, but the free tier should cover initial development and testing
- Note: Google reduced free tier quotas by 50-80% in December 2025

### Hidden Costs

- **Vertex AI pricing may differ** from Developer API pricing -- Vertex adds enterprise features but may have different rate structures
- **Context compression uses additional tokens** -- the summarization of pruned context counts against token limits
- **Function calling tokens** -- tool definitions and responses consume context window space
- **No audio recording storage** -- unlike Vapi/ElevenLabs, Gemini doesn't store recordings; you'd need to capture and store audio client-side or server-side

---

## 3. Integration with TeamHQ's Vanilla JS Stack

### Browser-Direct WebSocket (No Backend Proxy Required)

The Gemini Live API supports **direct browser-to-API WebSocket connections**. This is a key architectural advantage for TeamHQ's vanilla JS frontend:

```
Browser (vanilla JS)  ──WebSocket──>  Gemini Live API
     |                                     |
     | Audio in (16kHz PCM)               | Audio out (24kHz PCM)
     | Text (system instructions)         | Transcripts
     | Function calls                     | Function call requests
```

No intermediate server is required for the audio stream itself. The Express backend is only needed for:
1. Generating ephemeral tokens (authentication)
2. Receiving function call results (if calling TeamHQ APIs mid-interview)
3. Post-interview processing (saving transcripts to `data/meetings/`)

### Vanilla JS Demo Reference

The [gemini-2-live-api-demo](https://github.com/ViaAnthroposBenevolentia/gemini-2-live-api-demo) repository provides a complete vanilla JS implementation with:
- **Zero dependencies** -- pure vanilla JavaScript with modular OOP architecture
- **Web Audio API** for mic capture (16kHz PCM) and audio playback (24kHz)
- **WebSocket** for bidirectional streaming
- **No build tools** -- runs with any static file server
- **Optional Deepgram integration** for additional transcription

This aligns perfectly with TeamHQ's "plain HTML/CSS/vanilla JS -- no frameworks" convention. The demo can serve as a reference implementation or starting point.

### Authentication Model

| Method | When to use | Details |
|--------|-------------|---------|
| **API key** | Development/testing only | Pass directly in WebSocket URL. Simple but insecure for production (key exposed in client). |
| **Ephemeral tokens** | Production | Backend requests short-lived token from Google, sends to client. Token valid for 1 minute to initiate connection, 30 minutes for active session. System instructions can be locked server-side. |

**Recommended flow for TeamHQ:**

1. User clicks "Start Interview" in TeamHQ UI
2. Frontend calls `POST /interviews/start` on Express backend
3. Backend calls Google's ephemeral token endpoint with system instructions + interview config
4. Backend returns ephemeral token to frontend
5. Frontend opens WebSocket to Gemini using ephemeral token
6. Interview proceeds browser-to-Gemini (no proxy)
7. On completion, frontend sends transcript to Express backend for storage

This keeps the API key on the server, system instructions locked server-side, and audio streaming direct (low latency).

### Web Audio API Integration

The browser needs to:
1. **Capture audio:** `navigator.mediaDevices.getUserMedia()` -> AudioContext -> ScriptProcessorNode/AudioWorklet -> PCM at 16kHz
2. **Send audio:** Convert PCM Float32 to Int16 -> base64 encode -> send over WebSocket
3. **Receive audio:** Parse base64 PCM from WebSocket messages -> decode -> AudioContext -> speakers
4. **Handle transcripts:** Parse text content from WebSocket messages and display in UI

This is more work than ElevenLabs' `<elevenlabs-convai>` widget (one HTML tag), but it's well within Alice's skillset and the vanilla JS demo provides a working reference.

---

## 4. Transcript Extraction

### Built-In Transcription

The Gemini Live API provides **both input and output transcription** when configured in the session setup:

| Feature | Configuration | Output |
|---------|---------------|--------|
| **Output transcription** (Gemini's speech) | `output_audio_transcription` in setup config | Real-time text chunks as Gemini speaks |
| **Input transcription** (User's speech) | `input_audio_transcription` in setup config | ASR transcript via `response.server_content.input_transcription` |

Both are delivered in real-time over the WebSocket, enabling live transcript display in the UI.

### Comparison to ElevenLabs

| Feature | Gemini Live API | ElevenLabs |
|---------|-----------------|------------|
| Real-time transcription | Yes (input + output) | Yes (via events) |
| Post-call transcript | Must be assembled client-side from real-time chunks | Available via API and dashboard |
| Export formats | Raw text (you format it) | TXT, PDF, DOCX, JSON, SRT, VTT |
| Speaker separation | Input/output streams are inherently separated (user vs. model) | Yes, by role |
| Speaker diarization (multiple humans) | Not available in Live API (available in standard Gemini audio API) | Not applicable (1 human + 1 AI) |
| Conversation analysis | Not built-in (use Claude post-processing) | Built-in topic detection and analysis |

### Transcript Assembly Strategy

Since Gemini delivers transcripts as real-time chunks, we need to assemble them into a structured format compatible with TeamHQ's `MeetingSchema`:

```javascript
// Accumulate transcript entries during the session
const transcript = [];

// On input transcription event:
transcript.push({ speaker: "CEO", role: "interviewer", text: inputText });

// On output transcription event:
transcript.push({ speaker: "AI Interviewer", role: "assistant", text: outputText });

// Post-interview: save assembled transcript to data/meetings/
```

This maps directly to the existing `{ speaker, role, text }` transcript array in `MeetingSchema`. The assembly logic is straightforward -- the two streams (input and output) are inherently speaker-separated.

### Gap: No Multi-Format Export

Unlike ElevenLabs, Gemini doesn't provide PDF/DOCX/SRT export of transcripts. For TeamHQ, this is a non-issue -- we store transcripts as JSON in `data/meetings/` and render them in the UI. If multi-format export is needed later, Claude can generate formatted output from the JSON.

---

## 5. Knowledge Base / Context Injection

### System Instructions

The Live API accepts system instructions in the session setup configuration, identical to standard Gemini API. System instructions can:

- Define the AI interviewer's persona and behavior
- Set interview structure (introduction, topics, follow-ups, wrap-up)
- Inject project context, strategy documents, and meeting history
- Restrict language and response style
- Lock instructions server-side via ephemeral token configuration

### Context Injection Methods

| Method | Description | Best for |
|--------|-------------|----------|
| **System instructions** | Text instructions in setup config | Interview persona, topic guide, behavioral rules |
| **`send_client_content`** | Inject text into session context post-setup | Adding context documents, previous meeting summaries |
| **Context caching** | Pre-upload content, reference by cache ID | Large knowledge bases, reused across sessions |
| **Function calling** | Model requests data mid-conversation | Dynamic context (live sprint data, recent decisions) |

### Comparison to ElevenLabs Knowledge Base

| Feature | Gemini Live API | ElevenLabs |
|---------|-----------------|------------|
| System prompt | Yes (unlimited length, within context window) | Yes |
| File upload | Via context caching (any format Gemini supports) | Yes (PDF, TXT, MD, etc., max 5 items on non-enterprise) |
| URL ingestion | Via context caching or function calling | Yes |
| Dynamic context | Function calling mid-conversation | Tool calling |
| Context limit | 128k token context window | 5 knowledge base items (non-enterprise) |
| Context caching | Yes (reduced cost for repeated sessions) | No |

Gemini's 128k context window is substantially larger than ElevenLabs' 5-item knowledge base limit. For CEO interviews that need extensive project context (strategy docs, meeting history, sprint data), Gemini can accommodate significantly more background material.

**Context caching** is a particularly valuable feature: upload a knowledge base once, reference it across multiple interview sessions, and pay reduced token costs. This would work well for recurring interview templates (weekly strategy check-ins using the same base context).

---

## 6. Voice Quality and Latency

### Voice Options

- **30 HD voices** available with native audio model
- **8 preset voices** for the half-cascade model: Puck (default, conversational), Charon (deep, authoritative), Kore (neutral, professional), Fenrir (warm, approachable), Aoede, Leda, Orus, Zephyr
- **No custom voice cloning** -- a significant limitation vs. ElevenLabs (5,000+ voices, custom cloning)
- Voice characteristics (tone, prosody, speech rate) have limited configuration

### Voice Quality Assessment

Based on developer reports and comparative benchmarks:

| Dimension | Gemini Live API | ElevenLabs |
|-----------|-----------------|------------|
| Naturalness | Good -- clear, intelligible, natural cadence | Best-in-class -- indistinguishable from human in many cases |
| Emotional range | Strong (native audio understands and generates emotional tone) | Strong (fine-grained prosody control) |
| Voice variety | 30 preset voices, no cloning | 5,000+ voices, custom cloning, voice design |
| Customization | Limited (select a preset voice) | Extensive (tone, emotion, prosody tuning) |
| Consistency | Good | Excellent |

**Verdict:** ElevenLabs still leads on voice quality and customization. Gemini's native audio is good and improving, but the preset-only voice selection and limited tuning options are a gap. For TeamHQ's interview use case (functional conversation, not brand voice), Gemini's voice quality is sufficient.

### Latency

Reported performance metrics:

| Metric | Value |
|--------|-------|
| P50 first token | ~320ms |
| P95 first token | ~780ms |
| Target for natural conversation | < 200-300ms |
| Latency spikes (reported) | 7-15 seconds (occasionally, under load) |

**Analysis:** The p50 of 320ms is close to the natural speech threshold (200-300ms) and competitive with other platforms. The p95 of 780ms is acceptable for conversation. The reported latency spikes of 7-15 seconds are concerning -- these would break the conversational flow during an interview. This appears to be a load-related issue that may improve as the API matures past GA.

**Compared to alternatives:**
- ElevenLabs: Sub-second (comparable, but more consistent)
- Vapi: ~600ms (slightly higher, but stable)
- Retell: ~500-1000ms (similar range)
- OpenAI Realtime API via Daily+Pipecat: ~300ms (best achievable)

Gemini's median latency is competitive. The tail latency (spikes) is the concern.

---

## 7. Limitations and Risks

### Session Duration

- **15 minutes without compression** for audio-only sessions
- **Extendable indefinitely** with context window compression + session resumption
- **10-minute WebSocket connection lifetime** (must reconnect transparently)
- **Resumption tokens valid 2 hours** (24 hours on Vertex AI)

For 30-60 minute interviews, this requires implementing reconnection and compression logic. This is non-trivial but well-documented.

### Concurrency

| Tier | Concurrent Live Connections |
|------|---------------------------|
| Tier 1 (default) | 50 |
| Tier 2 | Up to 1,000 |

For TeamHQ's use case (1-5 concurrent interviews max), the Tier 1 limit of 50 is more than sufficient.

### API Stability

- **Google AI Developer API:** Live API is GA as of early 2026
- **Vertex AI:** GA with multi-region support and enterprise SLAs
- **Model versioning:** `gemini-2.5-flash-live-001` (preview with billing), stable versions available
- **SDK:** Unified Google Gen AI SDK works across both platforms

The API has graduated from preview to GA, which significantly reduces stability risk compared to my earlier evaluation (November 2024 beta). However, Google has a history of deprecating APIs -- the Gemini deprecations page should be monitored.

### Vertex AI vs. Developer API

| Feature | Developer API | Vertex AI |
|---------|--------------|-----------|
| Free tier | Yes | No (GCP billing required) |
| Ephemeral tokens | Yes | Via service accounts |
| Session resumption (24hr) | 2hr tokens | 24hr tokens |
| SLA | No formal SLA | Enterprise SLA |
| Data residency | No control | Region selection |
| Cost | Pay-as-you-go | Pay-as-you-go + GCP overhead |

**For TeamHQ v1, the Developer API is sufficient.** Vertex AI is the upgrade path if we need enterprise SLAs or data residency.

### Key Limitations

1. **No audio recording storage.** Unlike ElevenLabs/Vapi, Gemini doesn't store or provide a recording URL. We must capture audio client-side (Web Audio API recording) or accept transcript-only.

2. **No multi-format transcript export.** Raw text chunks only -- no PDF, DOCX, SRT export. Acceptable for TeamHQ (we use JSON).

3. **No custom voice cloning.** Cannot create a branded voice for the AI interviewer. Limited to 30 preset voices.

4. **Session management complexity.** The 10-minute connection lifetime and 15-minute session limit (without compression) require reconnection logic that ElevenLabs handles invisibly.

5. **Latency spikes.** Occasional 7-15 second delays reported by developers. Could disrupt interview flow.

6. **No embeddable widget.** Unlike ElevenLabs' one-line embed, Gemini requires custom WebSocket + Web Audio implementation. More code, more testing.

7. **VAD sensitivity.** Some developers report issues with short utterances ("Yes", "No") not triggering responses. May need tuning for interview conversations where brief acknowledgments are common.

8. **Google deprecation risk.** Google has a pattern of deprecating APIs. While Live API is now GA, this is a consideration for long-term investment.

---

## 8. Integration Architecture for TeamHQ

### Proposed Architecture

```
                                    TeamHQ Express Server
                                   +---------------------+
                                   |                     |
    Browser (TeamHQ UI)            |  POST /interviews   |
   +------------------+            |   → create record   |
   | Vanilla JS       |            |   → get ephemeral   |
   | WebSocket client  |           |     token from      |
   | Web Audio API     |           |     Google API      |
   +--------+---------+            |   → return token    |
            |                      |     + config        |
            | WebSocket            |                     |
            | (direct, low         |  POST /interviews   |
            |  latency)            |   /:id/complete     |
            v                      |   → receive         |
   +------------------+            |     transcript      |
   | Gemini Live API   |           |   → Claude post-    |
   | (Google Cloud)    |           |     processing      |
   | - Native Audio    |           |   → save to         |
   | - VAD             |           |     data/meetings/  |
   | - Transcription   |           +---------------------+
   | - Function calls  |
   +------------------+
```

### Key Differences from Vapi Architecture (Earlier Research)

| Aspect | Vapi Architecture | Gemini Architecture |
|--------|-------------------|---------------------|
| Audio routing | Browser -> Vapi Cloud -> (webhook) -> Express | Browser -> Gemini (direct WebSocket) |
| Transcript delivery | Webhook from Vapi to Express | Assembled client-side, sent to Express on completion |
| Authentication | Public key (client) + Private key (server) | Ephemeral token (server-generated, client-consumed) |
| Session management | Vapi handles it | We manage reconnection + compression |
| Post-processing | Claude processes Vapi webhook payload | Claude processes assembled transcript |
| Audio storage | Vapi provides recording URL | Must capture client-side or skip |

### Development Effort Estimate

| Task | Effort | Who |
|------|--------|-----|
| Ephemeral token endpoint | 0.5 day | Jonah (BE) |
| WebSocket client + Web Audio | 1-2 days | Alice (FE) |
| Transcript assembly + display | 0.5 day | Alice (FE) |
| Session management (reconnection, compression) | 1 day | Alice (FE) |
| Interview completion endpoint + storage | 0.5 day | Jonah (BE) |
| Claude post-processing (summary, action items) | 0.5 day | Jonah (BE) |
| UI design implementation | 1 day | Alice (FE) |
| **Total** | **4-5 days** | |

This is roughly 2x the effort of the Vapi integration (2-3 days) and 4-5x the effort of an ElevenLabs widget embed (1 day). The additional effort comes from WebSocket management, Web Audio API handling, session management, and client-side transcript assembly -- all things the managed platforms handle for you.

---

## 9. Comparison Summary

### Updated Platform Ranking

| Feature | Gemini Live API | ElevenLabs | Vapi | Retell |
|---------|-----------------|------------|------|--------|
| **Cost / 30 min** | **~$0.76** | ~$3.00 | ~$4.00-10.00 | ~$4.50 |
| **Voice quality** | Good | **Best** | Good (configurable) | Good |
| **Voice variety** | 30 presets | **5,000+ with cloning** | Configurable | Configurable |
| **Latency (p50)** | **~320ms** | Sub-second | ~600ms | ~500-1000ms |
| **Emotional understanding** | **Yes (native)** | Limited | No | No |
| **Built-in VAD** | **Yes (configurable)** | Yes | Yes | Yes |
| **Function calling** | **Yes (sync + async)** | Yes (tools) | Yes | Yes (custom LLM) |
| **Transcript extraction** | Real-time input + output | **Multi-format export** | JSON webhook | JSON API |
| **Knowledge base** | 128k context + caching | 5 items (non-enterprise) | API upload | Built-in + custom |
| **Session management** | Manual (compression + resumption) | **Automatic** | Automatic | Automatic |
| **Widget/embed** | None (custom WebSocket) | **One-line widget** | React SDK | React SDK |
| **Vanilla JS compat** | **Native (WebSocket + Web Audio)** | Web component | Needs adapter | Needs adapter |
| **Audio recording** | Must capture client-side | **Cloud storage** | Cloud storage | Cloud storage |
| **Dev effort (MVP)** | 4-5 days | **1 day** | 2-3 days | 2-3 days |
| **Multilingual** | **24 languages, 70+ translation** | 31 languages | Varies by provider | Limited |
| **Free tier** | **Yes** | Limited | $10 credit | Pay-as-you-go |
| **Self-hosted** | No | No | No | No |

---

## 10. Recommendation

### Should TeamHQ use Gemini Live API?

**Yes, with caveats.** Gemini Live API should be the **primary recommendation for v1**, replacing both Vapi and ElevenLabs from the earlier research. Here is the rationale:

#### Why Gemini wins:

1. **4-6x cost advantage.** At $0.76 per 30-minute session vs. $3.00-10.00 for alternatives, the economics are dramatically better. For a team that may run daily interviews, this is $23/month vs. $90-300/month.

2. **Single-model architecture.** No STT + LLM + TTS pipeline to configure, no multi-vendor billing. One API, one bill, one point of failure.

3. **Vanilla JS compatibility.** WebSocket + Web Audio API works natively with TeamHQ's no-framework frontend. The vanilla JS demo proves this works. No React SDK adapter needed.

4. **128k context window.** Substantially more context capacity than ElevenLabs' 5-item knowledge base limit. CEO interviews that need extensive project context benefit directly.

5. **Native emotional understanding.** The model interprets vocal tone and emotion from raw audio -- a genuine differentiator for natural-feeling interviews.

6. **Function calling.** Mid-conversation tool use enables dynamic context injection (pulling live project data during the interview).

7. **Built-in transcription.** Input + output transcription maps cleanly to TeamHQ's `{ speaker, role, text }` transcript schema.

8. **Free tier for development.** No cost during prototyping and testing.

#### What we give up vs. ElevenLabs:

1. **Voice quality.** ElevenLabs is still the gold standard. Gemini is good but not as natural or customizable. For functional CEO interviews (not brand-voice consumer experiences), this tradeoff is acceptable.

2. **Integration simplicity.** ElevenLabs: one HTML tag. Gemini: custom WebSocket + Web Audio + session management. Roughly 4-5 days vs. 1 day. More code to maintain.

3. **Session management.** ElevenLabs handles reconnection and session duration invisibly. Gemini requires us to implement compression, resumption, and reconnection. This is the biggest implementation complexity.

4. **Audio recording storage.** ElevenLabs stores recordings in the cloud. With Gemini, we'd need to capture audio client-side or go transcript-only for v1.

5. **Multi-format transcript export.** ElevenLabs exports PDF, DOCX, SRT, VTT. Gemini provides raw text. For TeamHQ (JSON storage), this doesn't matter.

#### What we give up vs. Vapi:

1. **React/React Native SDK.** Vapi has polished SDKs. Gemini requires custom WebSocket code. For TeamHQ's vanilla JS frontend, this is actually a wash (we'd need an adapter for Vapi's React SDK anyway).

2. **Managed infrastructure.** Vapi handles the full pipeline. With Gemini, we manage the WebSocket session ourselves. More control, more responsibility.

### Proposed Strategy

**Option A (Recommended): Gemini Live API as primary platform**
- 4-5 days development effort
- Lowest operating cost ($0.76/session)
- Most context capacity (128k tokens)
- Best vanilla JS fit
- Requires implementing session management

**Option B: ElevenLabs for fastest v1, migrate to Gemini later**
- 1 day development effort
- Higher operating cost ($3.00/session)
- Limited context capacity (5 items)
- One-line embed
- Could prototype immediately, switch to Gemini for v2

**Option C: Gemini for backend intelligence, ElevenLabs for voice**
- Use Gemini as the LLM brain (via ElevenLabs' Gemini 2.5 Flash integration)
- ElevenLabs handles voice quality, session management, transcription
- Best voice quality + Gemini's reasoning
- Middle-ground cost (~$3.00/session, may include LLM pass-through cost)

### My recommendation: **Option A.** The 4-6x cost advantage and 128k context window justify the extra 3-4 days of development over ElevenLabs. The vanilla JS demo proves the integration works without a framework. Session management is added complexity but well-documented. If voice quality becomes a real user complaint after launch, Option C provides a hybrid fallback without changing the architecture.

---

## Sources

- [Gemini Live API -- Get Started](https://ai.google.dev/gemini-api/docs/live)
- [Gemini Live API -- Capabilities Guide](https://ai.google.dev/gemini-api/docs/live-guide)
- [Gemini Live API -- WebSocket Reference](https://ai.google.dev/api/live)
- [Gemini Live API -- Session Management](https://ai.google.dev/gemini-api/docs/live-session)
- [Gemini Live API -- Tool Use](https://ai.google.dev/gemini-api/docs/live-tools)
- [Gemini Live API -- Ephemeral Tokens](https://ai.google.dev/gemini-api/docs/ephemeral-tokens)
- [Gemini Developer API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Vertex AI Pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)
- [Gemini 2.5 Flash Native Audio -- Google Blog](https://blog.google/technology/google-deepmind/gemini-2-5-native-audio/)
- [Gemini 2.5 Flash with Live API -- Vertex AI Docs](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-live-api)
- [Vanilla JS Demo -- gemini-2-live-api-demo](https://github.com/ViaAnthroposBenevolentia/gemini-2-live-api-demo)
- [Google Official React Starter -- live-api-web-console](https://github.com/google-gemini/live-api-web-console)
- [Gemini Live API Audio Transcription -- Medium](https://medium.com/google-cloud/google-multimodal-live-api-audio-transcription-368d4d4e7a7c)
- [Gemini Live API on Vertex AI -- Google Cloud Blog](https://cloud.google.com/blog/products/ai-machine-learning/gemini-live-api-available-on-vertex-ai)
- [Gemini TTS vs. ElevenLabs -- Podonos Benchmark](https://www.podonos.com/blog/gemini-vs-elevenlabs)
- [Firebase AI Logic -- Live API Limits](https://firebase.google.com/docs/ai-logic/live-api/limits-and-specs)
- [Developer Forum -- Session Duration Discussion](https://discuss.ai.google.dev/t/gemini-live-api-sessions-exceeding-15-minute-limit-without-compression/114104)
- [Developer Forum -- Latency Spikes](https://discuss.ai.google.dev/t/live-api-latency-spikes/106814)
- [Developer Forum -- Concurrency Limits](https://discuss.ai.google.dev/t/gemini-live-api-tier-2-project-still-limited-to-50-concurrent-connections-and-billed-as-tier-1/94634)
