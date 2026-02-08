# Voxtral Transcription API -- Technical Research Brief

**Researcher:** Marco (Technical Researcher)
**Date:** 2026-02-07
**Status:** Complete
**Unblocks:** Andrei (tech approach), Jonah (backend implementation)

---

## Executive Summary

Mistral offers two Voxtral transcription paths relevant to our mobile app:

1. **Voxtral Realtime** (`voxtral-mini-transcribe-realtime-2602`) -- WebSocket-based live streaming transcription via the Mistral hosted API. Purpose-built for the "text appears as you speak" UX we want. $0.006/min.
2. **Voxtral Batch + SSE Streaming** (`voxtral-mini-latest` / `voxtral-mini-2602`) -- HTTP POST to `/v1/audio/transcriptions` with `stream: true` returns Server-Sent Events. Better for transcribing complete recordings. $0.003/min.

**Recommendation:** Use the **Realtime WebSocket API** for live transcription during recording, with the batch endpoint available as a fallback for retry/re-transcription of saved audio.

---

## 1. API Contract Details

### 1a. Realtime Transcription (WebSocket) -- Recommended for Live UX

**Model ID:** `voxtral-mini-transcribe-realtime-2602`
**Protocol:** WebSocket (via Mistral Python SDK `mistralai[realtime]`)
**Pricing:** $0.006/minute
**Auth:** Bearer token (`MISTRAL_API_KEY`)

#### Audio Format Requirements

| Parameter | Value |
|-----------|-------|
| Encoding | `pcm_s16le` (16-bit signed integer, little-endian) |
| Sample rate | 16,000 Hz |
| Channels | 1 (mono) |
| Chunk duration | ~480ms recommended |
| Chunk size | 16000 samples/sec x 2 bytes x 0.48s = ~15,360 bytes per chunk |

#### SDK Usage (Python -- for our Express backend)

```python
from mistralai import Mistral
from mistralai.models import (
    AudioFormat,
    RealtimeTranscriptionSessionCreated,
    TranscriptionStreamTextDelta,
    TranscriptionStreamDone,
    RealtimeTranscriptionError,
)

client = Mistral(api_key="YOUR_KEY")
audio_format = AudioFormat(encoding="pcm_s16le", sample_rate=16000)

async for event in client.audio.realtime.transcribe_stream(
    audio_stream=audio_chunks_iterator,  # AsyncIterator[bytes]
    model="voxtral-mini-transcribe-realtime-2602",
    audio_format=audio_format,
):
    if isinstance(event, RealtimeTranscriptionSessionCreated):
        # Session established
        pass
    elif isinstance(event, TranscriptionStreamTextDelta):
        # Partial transcript: event.text
        send_to_client(event.text)
    elif isinstance(event, TranscriptionStreamDone):
        # Transcription complete
        pass
    elif isinstance(event, RealtimeTranscriptionError):
        # Error occurred: event contains details
        handle_error(event)
```

#### Event Types

| Event | Description |
|-------|-------------|
| `RealtimeTranscriptionSessionCreated` | WebSocket session established with Mistral |
| `TranscriptionStreamTextDelta` | Incremental transcript text (`.text` property) |
| `TranscriptionStreamDone` | Server signals transcription is complete |
| `RealtimeTranscriptionError` | Error information from the server |
| `UnknownRealtimeEvent` | Catch-all for unrecognized events |

#### Latency Configuration

The `transcription_delay_ms` parameter controls the tradeoff between latency and accuracy:

| Delay | Use Case |
|-------|----------|
| 80ms | Lowest latency, slightly lower accuracy |
| 240ms | Low latency |
| **480ms** | **Recommended sweet spot** -- matches offline model accuracy |
| 960ms | Higher accuracy, noticeable delay |
| 2400ms | Maximum accuracy, significant delay |

At 480ms delay, Voxtral Realtime matches the word error rate of the offline batch model (~4% WER on FLEURS benchmark).

### 1b. Batch Transcription with SSE Streaming (Fallback)

**Endpoint:** `POST https://api.mistral.ai/v1/audio/transcriptions`
**Model ID:** `voxtral-mini-latest` (points to `voxtral-mini-2602`)
**Pricing:** $0.003/minute
**Auth:** `Authorization: Bearer YOUR_KEY`

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | Model ID |
| `file` | File | No* | Audio file (multipart form) |
| `file_url` | string | No* | URL of audio file |
| `file_id` | string | No* | Previously uploaded file ID |
| `language` | string | No | Language code (e.g., `en`) |
| `stream` | boolean | No | Enable SSE streaming (default: false) |
| `diarize` | boolean | No | Speaker diarization (default: false) |
| `context_bias` | string[] | No | Up to 100 domain-specific words/phrases |
| `timestamp_granularities` | string[] | No | `["segment"]` or `["word"]` |
| `temperature` | number | No | Sampling temperature |

*One of `file`, `file_url`, or `file_id` is required.

#### Supported Audio Formats

`.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg` -- max 1GB each, up to 3 hours.

#### Non-Streaming Response

```json
{
  "model": "voxtral-mini-2602",
  "text": "Full transcription text...",
  "language": "en",
  "segments": [
    { "text": "segment text", "start": 0.0, "end": 2.5, "type": "speech" }
  ],
  "usage": {
    "prompt_audio_seconds": 45,
    "prompt_tokens": 10,
    "completion_tokens": 67,
    "total_tokens": 452
  }
}
```

#### SSE Streaming Response

When `stream: true`, the endpoint returns Server-Sent Events of type `TranscriptionStreamEvents`. The TypeScript SDK exposes this as:

```typescript
const result = await mistral.audio.transcriptions.stream({
  model: "voxtral-mini-latest",
  file: audioBuffer,
  stream: true,
});

for await (const event of result) {
  // Process streaming transcription events
  console.log(event);
}
```

#### Important Incompatibilities

- `timestamp_granularities` and `language` are mutually exclusive
- `diarize` is incompatible with realtime transcription
- Realtime model does not support diarization

---

## 2. React Native Audio Capture -- Library Evaluation

### Criteria

For our use case, the audio capture library must:
1. Stream PCM chunks while recording (not record-then-upload)
2. Support 16kHz sample rate, 16-bit mono PCM (`pcm_s16le`)
3. Work with Expo managed workflow (or be compatible via config plugin)
4. Deliver base64 or raw buffer chunks at configurable intervals (~480ms)
5. Support iOS and Android

### Candidates

#### A. `@mykin-ai/expo-audio-stream`

| Criteria | Rating |
|----------|--------|
| Streaming chunks while recording | Yes -- `onAudioStream` callback with base64 chunks |
| 16kHz PCM support | Yes -- dual-stream output includes 16kHz version natively |
| Expo compatibility | Yes -- built as Expo module |
| Configurable chunk interval | Yes -- configurable during recording init |
| iOS + Android | Yes |

**Pros:**
- Purpose-built for exactly our use case (streaming audio to external services)
- Dual-stream output: original quality + 16kHz downsampled version (ideal for Voxtral)
- Base64-encoded chunks delivered via event callback
- Chunk metadata includes position, size, sound level
- MIT licensed

**Cons:**
- Smaller community (newer library)
- Less documentation than alternatives

#### B. `@siteed/expo-audio-studio` (formerly `@siteed/expo-audio-stream`)

| Criteria | Rating |
|----------|--------|
| Streaming chunks while recording | Yes -- event subscription model |
| 16kHz PCM support | Yes -- configurable sample rates including 16000 |
| Expo compatibility | Yes -- Expo module |
| Configurable chunk interval | Yes -- configurable intervals (e.g., 250ms) |
| iOS + Android + Web | Yes |

**Pros:**
- More mature (734 commits, 269 stars)
- Broader feature set: recording, analysis, visualization, VAD
- Consistent WAV PCM format across all platforms
- iOS voice isolation modes and echo cancellation
- Adaptive jitter-buffer system for playback
- Active development and maintenance

**Cons:**
- Heavier dependency (monorepo with multiple packages)
- More complex API surface than needed for our use case

#### C. `react-native-live-audio-stream`

| Criteria | Rating |
|----------|--------|
| Streaming chunks while recording | Yes -- `on('data')` event with base64 chunks |
| 16kHz PCM support | Yes -- configurable `sampleRate` |
| Expo compatibility | No -- bare React Native only (requires ejecting) |
| Configurable chunk interval | Indirect -- via `bufferSize` parameter |
| iOS + Android | Yes |

**Pros:**
- Simple, focused API
- Lightweight (no extra dependencies)
- Configurable: sampleRate, channels, bitsPerSample, bufferSize

**Cons:**
- **Not compatible with Expo managed workflow** -- requires native linking
- Less actively maintained
- Requires `buffer` package for base64 decoding

#### D. `expo-av` (Official Expo Audio)

| Criteria | Rating |
|----------|--------|
| Streaming chunks while recording | No -- record-then-access model |
| 16kHz PCM support | Yes -- configurable |
| Expo compatibility | Yes -- first-party |
| Configurable chunk interval | No -- no streaming callback |
| iOS + Android | Yes |

**Cons:** Does not support streaming chunks during recording. Only suitable for record-then-upload workflows, which breaks our live transcription UX.

### Recommendation

**Primary: `@mykin-ai/expo-audio-stream`** -- Best fit for our exact requirements. Its dual-stream 16kHz output is tailor-made for speech recognition pipelines, and it has the simplest API for our streaming-to-server use case.

**Fallback: `@siteed/expo-audio-studio`** -- More mature and feature-rich. If we need VAD (voice activity detection), visualization, or the primary library has issues, this is the backup. Slightly heavier.

---

## 3. Streaming Architecture Recommendation

### Data Flow

```
Phone (RN/Expo)                    Express Server                    Mistral API
     |                                  |                                 |
     |-- [1] WebSocket connect -------->|                                 |
     |                                  |-- [2] Open Mistral WS -------->|
     |                                  |<-- [2a] SessionCreated --------|
     |<-- [2b] "ready" ----------------|                                 |
     |                                  |                                 |
     |-- [3] audio chunk (base64) ----->|                                 |
     |                                  |-- [3a] decode + forward ------->|
     |                                  |<-- [3b] TextDelta -------------|
     |<-- [3c] partial transcript ------|                                 |
     |                                  |                                 |
     |-- [3] audio chunk (base64) ----->|                                 |
     |                                  |-- [3a] decode + forward ------->|
     |                                  |<-- [3b] TextDelta -------------|
     |<-- [3c] partial transcript ------|                                 |
     |                                  |                                 |
     |-- [4] "stop" ------------------>|                                 |
     |                                  |-- [4a] close audio stream ---->|
     |                                  |<-- [4b] StreamDone ------------|
     |<-- [4c] final transcript -------|                                 |
     |                                  |                                 |
```

### Phone to Server: WebSocket

The phone opens a WebSocket to our Express server. Audio chunks are sent as binary messages (base64-encoded PCM from the audio library). The server decodes and forwards to Mistral.

**Why WebSocket (not HTTP):** Audio chunks arrive continuously at ~480ms intervals for the duration of a recording. HTTP requests per chunk would add latency and overhead. WebSocket gives us a persistent bidirectional channel.

### Server to Mistral: Mistral SDK WebSocket

The Express server uses the `mistralai` Python SDK (or equivalent Node.js approach) to open a realtime transcription session. Audio chunks from the phone are fed into the `audio_stream` async iterator. Transcript events flow back.

**Important architectural note:** The Mistral realtime SDK is Python-first (`pip install mistralai[realtime]`). The TypeScript SDK (`@mistralai/mistralai`) supports SSE streaming for batch transcription but realtime WebSocket support may need verification. Options:

1. **Use the TypeScript SDK's SSE streaming** -- Works for the batch endpoint with `stream: true`, but requires uploading the complete audio file first. Not true live transcription.
2. **Run a small Python sidecar** -- A lightweight Python process that handles the Mistral WebSocket, with the Express server communicating to it via local WebSocket or IPC.
3. **Implement the WebSocket protocol directly in Node.js** -- The Mistral realtime API uses standard WebSockets. We can connect directly using `ws` and send PCM chunks without the Python SDK.
4. **Use the TypeScript SDK if it adds realtime support** -- The `@mistralai/mistralai` npm package is actively developed; realtime WebSocket support may land soon.

**Recommendation for Andrei:** Option 3 (direct WebSocket in Node.js) or Option 4 (TypeScript SDK) is cleanest. Avoids Python dependency in our Express stack. The WebSocket protocol is straightforward: connect, send PCM chunks, receive text events.

### Server to Phone: WebSocket

Partial transcripts stream back to the phone over the same WebSocket. The RN client appends text as it arrives, giving the live-typing effect.

---

## 4. Latency Assessment

### Is Live Transcription Feasible?

**Yes.** The end-to-end latency budget:

| Stage | Estimated Latency |
|-------|-------------------|
| Audio capture + chunk buffering | ~480ms (one chunk duration) |
| Phone to server (WebSocket) | ~50-100ms (cellular/wifi) |
| Server to Mistral (WebSocket) | ~20-50ms (server-to-server) |
| Mistral processing delay | ~480ms (configurable) |
| Mistral to server (WebSocket) | ~20-50ms |
| Server to phone (WebSocket) | ~50-100ms |
| **Total** | **~1.1-1.3 seconds** |

A ~1 second delay between speaking and seeing text is acceptable for a "text appears as you speak" UX. Users will see words appearing slightly behind their speech, similar to live captioning on TV broadcasts.

### Tuning Options

- **Lower the transcription delay** to 240ms for faster feedback (slight accuracy tradeoff)
- **Smaller chunk duration** (e.g., 240ms) reduces the initial buffering delay but increases WebSocket message frequency
- At 480ms chunk + 480ms transcription delay, the theoretical minimum latency is ~1s

### Comparison

- OpenAI Whisper Realtime: ~500ms-1s latency (similar)
- Google Cloud Speech-to-Text Streaming: ~300-500ms latency (faster)
- Deepgram Nova-2: ~200-400ms latency (faster)
- Voxtral Realtime at 480ms is competitive and significantly cheaper

---

## 5. Risks and Gotchas

### High Risk

1. **TypeScript SDK realtime support is uncertain.** The Python SDK has first-class realtime WebSocket support (`client.audio.realtime.transcribe_stream`). The TypeScript SDK supports SSE streaming for batch but may not yet expose the realtime WebSocket API. Andrei/Jonah need to verify this or plan to use the raw WebSocket protocol.

2. **Connection drops during transcription.** If the WebSocket to Mistral drops mid-recording, the SDK does not document a resume/reconnect mechanism. The server must:
   - Detect disconnection
   - Open a new session
   - Resume streaming from the current audio position
   - The phone should buffer a few seconds of audio locally for replay on reconnect

3. **Expo managed workflow constraints.** Both recommended audio libraries (`@mykin-ai/expo-audio-stream`, `@siteed/expo-audio-studio`) require Expo config plugins (native modules). They work with Expo's development builds (`expo-dev-client`) but **not** with Expo Go. The team must use custom development builds.

### Medium Risk

4. **Rate limits are tier-based and opaque.** Mistral rate limits are set per workspace and tier. The free tier has restrictive limits. The exact requests/minute for realtime transcription is not publicly documented -- check the admin dashboard at `admin.mistral.ai/plateforme/limits`. For a CEO-only app, this is unlikely to be an issue.

5. **Audio quality on mobile.** Background noise, varying microphone quality, and acoustic environments affect transcription accuracy. Voxtral claims "noise robustness" but real-world testing is needed. Consider:
   - Using the iOS voice isolation mode (supported by `@siteed/expo-audio-studio`)
   - Adding a noise gate or VAD to avoid sending silence

6. **No diarization in realtime mode.** Voxtral Realtime does not support speaker diarization. For single-speaker project creation, this is fine. If multi-speaker support is ever needed, it requires the batch endpoint.

### Low Risk

7. **Cost is negligible.** At $0.006/min, a 2-minute voice recording costs $0.012. Even 100 recordings/day = $1.20/day. Not a concern.

8. **Language detection is automatic** but can be overridden with the `language` parameter. For an English-first app, explicitly setting `language: "en"` will improve accuracy and reduce first-word latency.

---

## 6. Library Recommendations Summary

### For the Phone (React Native + Expo)

| Library | Recommendation | Notes |
|---------|---------------|-------|
| **`@mykin-ai/expo-audio-stream`** | Primary | Dual 16kHz stream, simplest API for our use case |
| `@siteed/expo-audio-studio` | Fallback | More mature, broader features, heavier |
| `react-native-live-audio-stream` | Avoid | Not Expo-compatible |
| `expo-av` | Avoid | No streaming chunks while recording |

### For the Server (Express/Node.js)

| Library | Recommendation | Notes |
|---------|---------------|-------|
| **`@mistralai/mistralai`** (npm) | Primary if realtime WS is supported | SSE streaming confirmed; verify realtime WS |
| **`ws`** (npm) | Fallback | Implement Mistral WebSocket protocol directly |
| `mistralai[realtime]` (pip) | Avoid | Python dependency in Node.js stack |

### For the WebSocket Layer

| Library | Recommendation | Notes |
|---------|---------------|-------|
| **`ws`** (npm, server-side) | Yes | Standard WebSocket server for Express |
| Built-in `WebSocket` (React Native) | Yes | RN includes WebSocket support natively |

---

## 7. Key Decisions for Andrei

1. **Realtime WebSocket vs. batch SSE?** Realtime for live UX, batch as fallback. Both are needed.
2. **TypeScript SDK vs. raw WebSocket for Mistral?** Check if `@mistralai/mistralai` exposes `audio.realtime.transcribe_stream` in Node.js. If not, use `ws` directly.
3. **Audio library:** `@mykin-ai/expo-audio-stream` is the best fit. Requires Expo dev builds (not Expo Go).
4. **Transcription delay:** Start with 480ms (recommended default). Can tune later.
5. **Reconnection strategy:** Server must handle Mistral WebSocket drops gracefully. Buffer audio on phone for replay.
6. **Context biasing:** The `context_bias` parameter (up to 100 words) can improve accuracy for project management terms. Consider pre-loading common terms.

---

## Sources

- [Voxtral Transcribe 2 Announcement](https://mistral.ai/news/voxtral-transcribe-2)
- [Mistral Audio & Transcription Docs](https://docs.mistral.ai/capabilities/audio_transcription)
- [Mistral API -- Audio Transcriptions Endpoint](https://docs.mistral.ai/api/endpoint/audio/transcriptions)
- [Voxtral Mini Transcribe Realtime Model Card](https://docs.mistral.ai/models/voxtral-mini-transcribe-realtime-26-02)
- [Voxtral-Mini-4B-Realtime-2602 on Hugging Face](https://huggingface.co/mistralai/Voxtral-Mini-4B-Realtime-2602)
- [Mistral Python SDK](https://github.com/mistralai/client-python)
- [Mistral TypeScript SDK](https://github.com/mistralai/client-js)
- [@mykin-ai/expo-audio-stream](https://github.com/mykin-ai/expo-audio-stream)
- [@siteed/expo-audio-studio](https://github.com/deeeed/expo-audio-stream)
- [react-native-live-audio-stream](https://github.com/xiqi/react-native-live-audio-stream)
- [Mistral Rate Limits](https://docs.mistral.ai/deployment/ai-studio/tier)
