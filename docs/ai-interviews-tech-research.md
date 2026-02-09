# AI-Powered Interview Integration — Technical Research

**Researcher:** Marco (Technical Researcher)
**Date:** February 9, 2026
**Status:** Complete — ready for Thomas to scope

---

## Executive Summary

The CEO wants TeamHQ to support AI-powered video/audio interviews — real-time conversations with an AI interviewer that get recorded and transcribed, then feed into the existing meeting and project systems. After evaluating six platforms across the build-vs-buy spectrum, **Vapi.ai is the recommended platform** for the initial integration. It offers the best balance of developer experience, browser-native WebRTC support, transcript webhook delivery, knowledge base injection, and cost predictability. The minimum viable integration is surprisingly lean: embed Vapi's web SDK, configure an assistant with TeamHQ context, receive a webhook with the transcript, and write it into the existing meeting store.

---

## Platform Evaluations

### 1. Vapi.ai — Voice AI Platform

**What it is:** Developer-first voice AI platform with full API control over every aspect of the conversation. Supports web calls (browser), phone calls, and custom integrations.

**Technical evaluation:**

| Criteria | Assessment |
|----------|------------|
| API documentation quality | Excellent. Comprehensive docs at docs.vapi.ai with clear REST API reference, webhook schemas, and quickstart guides. |
| WebRTC/browser support | Native. Web SDK (`@vapi-ai/web` on npm) and React SDK (`@vapi-ai/client-sdk-react`) provide drop-in browser calls. Also has React Native SDK for mobile. |
| Webhook support | Full lifecycle webhooks — call-start, speech-start, speech-end, transcript (partial and final), call-end, function-call. Configurable server URL. |
| Transcript output format | JSON array with speaker role (customer/assistant), text, and timestamps. Partial transcripts stream in real-time; final transcript delivered via webhook. |
| Knowledge base / context injection | Supports custom knowledge bases via API — upload .txt, .pdf, .md, .json, .csv files (max 300KB each). Also supports custom KB via webhook (you serve the search results). Can inject system prompts with full context. |
| Latency | Sub-600ms end-to-end (speech-to-response). WebRTC transport. |
| Authentication | API key (private) for server-side calls. Public key for client-side SDK (safe to expose). |
| Self-hosted | Cloud-only. No self-hosted option. |

**Pricing:**
- Platform fee: $0.05/minute
- STT (Deepgram default): ~$0.01/min
- LLM (varies by model): $0.02-0.20/min
- TTS (ElevenLabs/Play.ht): ~$0.04/min
- **All-in typical cost: ~$0.12-0.30/min**
- $10 free credits to start
- Pay-as-you-go, no minimum commitment

**Strengths:** Best developer experience of any platform evaluated. React SDK means trivial frontend integration. Webhook-first architecture maps cleanly to our Express backend. Knowledge base injection means the AI interviewer can be pre-loaded with project docs, meeting history, and team context.

**Weaknesses:** Cloud-only (vendor dependency). Per-minute costs add up for long interviews. No video — audio only.

---

### 2. Retell.ai — Conversational Voice AI

**What it is:** API-first voice agent platform with strong developer tooling, visual flow builder, and WebRTC web calls.

**Technical evaluation:**

| Criteria | Assessment |
|----------|------------|
| API documentation quality | Good. Clear REST API at docs.retellai.com. WebSocket API for custom LLM integration is well-documented with Node.js examples. |
| WebRTC/browser support | Native. `retell-client-js-sdk` npm package. WebRTC upgraded infrastructure. React demo available on GitHub. |
| Webhook support | `call_ended` webhook with full transcript, timestamps, and call metadata. |
| Transcript output format | JSON array: `[{ "role": "agent"|"user", "content": "..." }]`. Clean and simple. Real-time updates via SDK `update` event (last 5 sentences to limit payload). |
| Knowledge base / context injection | Built-in knowledge base feature with per-node assignment in conversation flows. URL to KB contents available post-call. |
| Latency | ~800ms end-to-end. Slightly slower than Vapi. |
| Authentication | API key for server-side. Client SDK uses call access tokens (generated server-side per call). |
| Self-hosted | Cloud-only. |

**Pricing:**
- No platform fee (unlike Vapi's $0.05/min)
- AI Voice Agents: $0.07+/min base
- Add STT, LLM, TTS costs on top
- **All-in typical cost: ~$0.14/min** (with ElevenLabs + Claude 3.5)
- Enterprise discounts above $3,000/month

**Strengths:** No platform fee means potentially cheaper than Vapi at scale. Custom LLM WebSocket means we could route through our own Claude instance. Visual flow builder for non-developers. Clean transcript JSON format.

**Weaknesses:** Higher baseline latency than Vapi (~800ms vs ~600ms). Every change requires developer involvement — no self-serve for the CEO. React demo exists but SDK is less polished than Vapi's React SDK.

---

### 3. ElevenLabs — Conversational AI

**What it is:** Best-known for voice synthesis (TTS), now expanding into full conversational AI agents with browser embed widget.

**Technical evaluation:**

| Criteria | Assessment |
|----------|------------|
| API documentation quality | Good. Well-documented at elevenlabs.io/docs. Agent platform docs are comprehensive. |
| WebRTC/browser support | Yes. WebRTC rolled out to all Conversational AI users. Web component (`<elevenlabs-convai>`) for framework-agnostic embedding. Works in React, Vue, vanilla JS. |
| Webhook support | Three post-call webhook types: transcription (full transcript + analysis), audio (base64 MP3), call initiation failure. HMAC signature auth. |
| Transcript output format | JSON via webhook and GET API. Includes full conversation history with analysis results and metadata. |
| Knowledge base / context injection | Supports custom knowledge bases and tool calling for external data. |
| Latency | Competitive. WebRTC transport. Specific latency numbers not prominently published. |
| Authentication | Agent ID for widget embedding. API keys for server-side. |
| Self-hosted | Cloud-only. |

**Pricing:**
- Credit-based system (confusing)
- Free: 10k credits/month (~15 min conversational AI)
- Starter: $5/mo (30k credits)
- Pro: $99/mo (500k credits)
- Scale: $330/mo
- Business: $1,320/mo (~6,000 STT hours)
- **Effective cost: harder to estimate due to credit system**

**Strengths:** Best voice quality in the industry — unmatched vocal realism. Simplest embed (one HTML tag). Multimodal widget supports voice + text input. Strong brand recognition. Good for a polished user experience.

**Weaknesses:** Credit-based pricing is opaque and harder to predict costs. Less developer control than Vapi or Retell — more of a "product" than a "platform." Custom LLM integration is less flexible. The conversational AI product is newer and less battle-tested than their TTS offering.

---

### 4. Tavus.ai — Conversational Video AI

**What it is:** The only platform in this evaluation that does video. Creates AI replicas (digital humans) that can see, hear, and respond in real-time video conversations.

**Technical evaluation:**

| Criteria | Assessment |
|----------|------------|
| API documentation quality | Good. REST API at docs.tavus.io. Quick-start guide to build first conversation in 5 minutes. |
| WebRTC/browser support | Yes. React components, iframe, or Daily SDK integration. 1080p video, 24kHz audio, WebRTC transport. |
| Webhook support | `application.transcription_ready` (full chat transcript), `application.recording_ready` (video recording with S3 storage). |
| Transcript output format | JSON via callback. Full conversation history between participants and AI. |
| Knowledge base / context injection | Yes. RAG support (since August 2025). Upload documents, images, or websites. Custom LLM and TTS engine support. Function calling for external tool integration. |
| Latency | ~500ms. Competitive. |
| Authentication | API key based. |
| Self-hosted | Cloud-only. S3 for recording storage. |

**Pricing:**
- Free: 25 min conversational video, 25 stock replicas
- Starter: $39/mo + pay-as-you-go usage
- Growth: $375/mo (recording + transcripts included, 15 concurrent conversations)
- Enterprise: Custom pricing
- **Most expensive option due to video processing**

**Strengths:** The only option with video. Creates a genuinely impressive "talking to a person" experience. S3 recording storage. RAG support. Function calling. 30+ language support.

**Weaknesses:** Significantly more expensive due to video compute. Overkill for the core use case (we need transcripts, not video avatars). More complex integration. The digital human persona might feel gimmicky rather than professional for strategy/research interviews. Most vendor lock-in of any option.

---

### 5. Bland.ai — AI Phone Calls

**What it is:** Enterprise AI phone call automation platform. Optimized for outbound/inbound telephony.

**Technical evaluation:**

| Criteria | Assessment |
|----------|------------|
| API documentation quality | Good. Clean REST API. Under 10 lines of code to make a call. |
| WebRTC/browser support | **No. Telephony only.** No browser SDK. No WebRTC. |
| Webhook support | Yes. Every call event triggers webhooks. Integrates with HubSpot, Slack, Twilio. |
| Transcript output format | Available post-call via API/webhook. |
| Knowledge base / context injection | Custom tools and API integrations during calls. |
| Latency | Good for telephony. Not applicable for web. |
| Authentication | API key. |
| Self-hosted | Cloud-only. |

**Pricing:**
- Build: $299/mo
- Scale: $499/mo
- $0.09/min per call + $0.015/outbound attempt + $0.02/SMS
- Enterprise: Custom

**Verdict: Not suitable.** Bland is telephony-only with no browser/WebRTC support. TeamHQ is a web app — requiring users to pick up a phone call is a non-starter. Eliminated from consideration.

---

### 6. Daily.co + Pipecat — Build-Your-Own

**What it is:** Daily provides WebRTC infrastructure. Pipecat (by Daily) is an open-source Python framework for building real-time voice/multimodal AI agents. Together, they let you build a fully custom conversational AI from scratch.

**Technical evaluation:**

| Criteria | Assessment |
|----------|------------|
| API documentation quality | Excellent (Daily). Good (Pipecat). Both well-maintained open source. |
| WebRTC/browser support | Best-in-class. Daily literally wrote parts of the WebRTC standard. Full SDK ecosystem: JS, React, React Native, Swift, Kotlin. |
| Webhook support | Full Daily API events. Plus you control the entire pipeline, so you define your own events. |
| Transcript output format | Whatever you want — you build the pipeline. Integrate Whisper/Deepgram for STT, format output however you need. |
| Knowledge base / context injection | Complete control. You run the LLM, you control the prompt, you inject whatever context you want. |
| Latency | Sub-300ms possible with OpenAI Realtime API. Best achievable latency of any option. |
| Authentication | Daily API key + room tokens. |
| Self-hosted | Pipecat is open source (Python). Daily is cloud for WebRTC transport. Can self-host the AI pipeline. |

**Pricing:**
- Daily: Free tier available. Paid plans based on participant-minutes (more economical than subscriber-minutes).
- Pipecat: Free (open source). Pipecat Cloud available for hosted deployment.
- LLM costs: Whatever model you choose (OpenAI Realtime API, Claude, etc.)
- STT costs: Whisper (free self-hosted) or Deepgram (~$0.01/min)
- TTS costs: Your choice of provider
- **Potentially cheapest at scale, but highest upfront development cost**

**Strengths:** Maximum control and flexibility. No vendor lock-in on the AI pipeline. Best possible latency. Can use any LLM (including Claude). Open source. Can self-host everything except WebRTC transport.

**Weaknesses:** Significantly more development effort. Pipecat is Python — our backend is Express/TypeScript, so we'd need to run a separate Python service. More operational complexity. No out-of-the-box knowledge base, transcription formatting, or webhook system — you build all of it. Estimated 3-5x the development time of using an API platform.

---

## Comparison Matrix

| Feature | Vapi | Retell | ElevenLabs | Tavus | Bland | Daily+Pipecat |
|---------|------|--------|------------|-------|-------|---------------|
| Browser WebRTC | Yes | Yes | Yes | Yes | **No** | Yes |
| React SDK | Yes | Demo | Web component | React/iframe | N/A | Yes |
| React Native SDK | Yes | No | Coming | No | N/A | Yes |
| Transcript webhook | Yes | Yes | Yes | Yes | Yes | DIY |
| Transcript format | JSON | JSON | JSON | JSON | JSON | DIY |
| Knowledge base | Yes (API) | Yes (built-in) | Yes | Yes (RAG) | Limited | DIY |
| Custom LLM | Yes | Yes (WebSocket) | Limited | Yes | Yes | Full control |
| Video support | No | No | No | **Yes** | No | Yes (Daily) |
| Latency | ~600ms | ~800ms | ~600ms | ~500ms | N/A | ~300ms |
| Self-hosted | No | No | No | No | No | Partial |
| Dev effort (MVP) | Low | Low | Low | Medium | N/A | High |
| Cost/min (typical) | $0.12-0.30 | ~$0.14 | Hard to estimate | Higher (video) | $0.09 + fees | Variable |

---

## Integration Architecture

### How it connects to TeamHQ's Express backend

The existing meeting system stores meetings as JSON files in `data/meetings/` with a well-defined schema (`MeetingSchema` in `server/src/schemas/meeting.ts`). Each meeting has a transcript array of `{ speaker, role, text }` entries, plus structured fields for summary, decisions, action items, and key takeaways.

An AI interview integration would follow the same pattern:

```
                                    TeamHQ Express Server
                                   +---------------------+
                                   |                     |
    Browser (TeamHQ UI)            |  POST /interviews   |
   +------------------+            |   → create record   |
   | Vapi Web SDK     | ─WebRTC─→  |   → return session  |
   | (in-browser call)|            |                     |
   +------------------+            |  POST /webhooks/vapi|
                                   |   → receive transcript
          Vapi Cloud               |   → transform to    |
   +------------------+            |     Meeting format   |
   | STT + LLM + TTS  |──webhook─→|   → save to         |
   | (conversation)   |           |     data/meetings/   |
   +------------------+            +---------------------+
```

### Proposed flow:

1. **Schedule/Start:** User clicks "Start Interview" in TeamHQ UI. Frontend calls `POST /interviews/start` with topic, context docs, and interview type.

2. **Server creates session:** Express backend calls Vapi API to create an assistant with:
   - System prompt containing interview instructions + team context
   - Knowledge base populated with relevant project docs
   - Webhook URL pointing back to TeamHQ server

3. **Browser connects:** Server returns Vapi session config to frontend. Vapi Web SDK connects via WebRTC. User talks to the AI interviewer in the browser.

4. **Real-time updates:** Optional — listen for partial transcript events via WebSocket to show live transcription in the UI.

5. **Call ends:** Vapi sends `call-end` webhook to TeamHQ server with full transcript JSON.

6. **Post-processing:** Express backend transforms Vapi transcript into TeamHQ's `Meeting` format:
   - Map Vapi's `{ role: "customer"|"assistant", content }` to `{ speaker, role, text }`
   - Use Claude to generate summary, key takeaways, decisions, and action items from the raw transcript
   - Save as a new meeting record in `data/meetings/`

7. **Available in UI:** Interview appears in the meetings list, viewable with full transcript and structured output.

### Where recordings/transcripts are stored

- **Transcripts:** In existing `data/meetings/` as JSON files, same as current meetings. No new storage system needed.
- **Audio recordings:** Vapi can provide recording URLs. Store the URL in a new optional field on the Meeting schema (`recordingUrl: z.string().url().nullable()`). Audio files stay in Vapi's cloud storage (or can be downloaded to local/S3 if needed).

### How scheduling works

For v1, keep it simple: no calendar integration. Just a "Start Interview" button. The interview happens immediately in the browser. This is consistent with how the current meeting system works (click a button, meeting runs).

Future iterations could add:
- Scheduled interviews with email/Slack reminders
- Interview templates (user research, strategy review, retrospective, etc.)
- Calendar integration via Google Calendar API

### Feeding transcripts into the existing meeting system

This is the key insight: **interviews ARE meetings.** The existing `MeetingSchema` already supports everything we need:

- `type`: Add `"interview"` to the `MeetingType` enum
- `transcript`: Array of `{ speaker, role, text }` — maps directly
- `summary`, `keyTakeaways`, `decisions`, `actionItems`: Generated by Claude post-interview
- `participants`: The human user + AI interviewer
- `instructions`: The interview topic/brief

The only schema changes needed:
1. Add `"interview"` to the `MeetingType` enum
2. Add optional `recordingUrl` field
3. Add optional `interviewConfig` field (for Vapi session metadata)

### Minimum viable integration

The absolute simplest version:

1. Add a Vapi account and configure an interview assistant with a system prompt
2. Embed `@vapi-ai/web` in the TeamHQ frontend with a "Start Interview" button
3. Add a webhook endpoint (`POST /webhooks/vapi`) that receives the transcript
4. Transform the transcript into a Meeting record and save it
5. Interview appears in the meetings list

This is roughly **2-3 days of development work** for Alice (FE) and Jonah (BE) working in parallel, assuming Andrei has the architecture specced and Robert has the UI designed.

---

## Build vs Buy Analysis

### Option A: Full DIY (Daily.co + Pipecat + Whisper + Claude)
- **Control:** Maximum
- **Dev effort:** 2-3 weeks
- **Ongoing ops:** High (Python service, model hosting, WebRTC infra)
- **Cost at scale:** Lowest
- **Verdict:** Overkill for v1. Consider if we outgrow API platforms or need video.

### Option B: API Platform — Vapi (recommended)
- **Control:** High (custom LLM, custom prompts, webhooks)
- **Dev effort:** 2-3 days
- **Ongoing ops:** Low (managed service)
- **Cost at scale:** Moderate (~$0.15/min)
- **Verdict:** Best fit. Ships fast, integrates cleanly, enough control for our needs.

### Option C: API Platform — Retell
- **Control:** High (custom LLM WebSocket)
- **Dev effort:** 2-3 days
- **Ongoing ops:** Low
- **Cost at scale:** Slightly cheaper than Vapi
- **Verdict:** Strong alternative. Consider if Vapi pricing becomes an issue.

### Option D: Embed Widget — ElevenLabs
- **Control:** Medium
- **Dev effort:** 1 day
- **Ongoing ops:** Lowest
- **Cost at scale:** Hard to predict (credit system)
- **Verdict:** Fastest to ship but least control. Good for a prototype/demo but limits future flexibility.

### Option E: Full Product — Tavus (video)
- **Control:** Low-Medium
- **Dev effort:** 3-5 days
- **Ongoing ops:** Medium
- **Cost at scale:** Highest
- **Verdict:** Only consider if video is a hard requirement. Currently it is not.

---

## Recommendation

**Use Vapi.ai for the v1 integration.** Here is the rationale:

1. **Ships fast.** React SDK + webhook architecture means 2-3 days to MVP. This aligns with the team's "small bets, shipped fast" philosophy.

2. **Integrates cleanly.** Webhook delivers transcript JSON that maps directly to our existing Meeting schema. No new storage systems. No new databases. The interview just becomes another type of meeting.

3. **Developer experience is best-in-class.** React SDK (`@vapi-ai/client-sdk-react`), React Native SDK (for the mobile app), comprehensive docs, clear authentication model (public key for client, private key for server).

4. **Knowledge base injection.** We can feed the AI interviewer our project docs, meeting history, and team context so it asks informed questions — not generic ones.

5. **Reasonable cost.** At ~$0.15/min, a 30-minute interview costs ~$4.50. For internal strategy and research interviews, this is negligible.

6. **Upgrade path.** If we outgrow Vapi, we can migrate to Daily.co + Pipecat for full control. The transcript format and Meeting schema integration stays the same regardless of provider — only the transport layer changes.

**What Vapi lacks that we should plan for:**
- No video (audio only). Acceptable for v1. If video becomes a requirement, Tavus or Daily+Pipecat are the paths.
- Cloud-only. No self-hosting. Acceptable for our scale.
- Per-minute costs. At high volume, consider Retell (cheaper) or DIY (cheapest).

---

## Next Steps

1. **Thomas** scopes the project requirements based on this research
2. **Andrei** defines the integration architecture (webhook handling, schema changes, Vapi API flow)
3. **Robert** designs the interview UI (start button, live transcript view, completed interview view)
4. **Alice** integrates Vapi Web SDK in the frontend
5. **Jonah** builds the webhook endpoint and transcript-to-meeting transformation
6. **Enzo** tests the full flow
