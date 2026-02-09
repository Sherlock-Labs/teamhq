# AI-Powered Audio Interviews -- Requirements

**Author:** Thomas (Product Manager)
**Date:** February 9, 2026
**Status:** Ready for architecture and design
**Project ID:** `ai-interviews`

---

## Overview

Add AI-powered audio interviews to TeamHQ. The CEO can start a real-time voice conversation with an AI interviewer directly from the TeamHQ meetings section. The AI asks questions, follows up, and captures the full transcript. Completed interviews appear in the meetings list alongside existing charter, weekly, and custom meetings.

**One-sentence summary:** Click a button in TeamHQ, talk to an AI interviewer, and get a structured transcript stored as a meeting record.

---

## CEO Decisions (Binding)

These decisions were made by the CEO and are not open for debate:

1. **Audio-only.** No video. No avatar. Voice conversation only.
2. **Widget embed approach.** The AI conversation runs via an embedded widget in the TeamHQ page, not a custom-built WebRTC UI.
3. **Research phase is complete.** No further platform evaluation needed.

---

## Platform Choice: ElevenLabs Conversational AI

**Recommendation: ElevenLabs.** The CEO's widget embed requirement strongly favors ElevenLabs over Vapi.

### Rationale

Suki and Marco evaluated the landscape and disagree on platform. Here is why ElevenLabs wins given the constraints:

| Factor | ElevenLabs | Vapi (Marco's pick) |
|--------|-----------|---------------------|
| **Widget embed** | Single-line `<elevenlabs-convai>` HTML tag. Works in vanilla JS -- no framework required. | Requires React SDK (`@vapi-ai/client-sdk-react`). TeamHQ frontend is vanilla HTML/CSS/JS. |
| **Cost per minute** | $0.10/min (LLM costs currently absorbed) | $0.12-0.30/min (platform + STT + LLM + TTS billed separately) |
| **Cost per 30-min session** | ~$3.00 | ~$4.50-9.00 |
| **Voice quality** | Industry-best. Conversations feel human. | Good, but depends on TTS provider choice. |
| **Transcript export** | Multi-format: TXT, PDF, DOCX, JSON, SRT, VTT | JSON only |
| **Knowledge base** | Built-in. Upload files/URLs/text. Agent references them during conversation. | Supported, but requires more setup. |
| **Dev effort for MVP** | ~1 day (widget embed + webhook endpoint) | ~2-3 days (React SDK integration in vanilla JS app) |
| **Pricing model** | Simple flat rate per minute | Complex multi-provider billing, up to 5 invoices |

**The deciding factor is the widget embed.** TeamHQ is vanilla HTML/CSS/JS. ElevenLabs provides a web component (`<elevenlabs-convai>`) that works without React. Vapi's SDK requires React, which means either adding React as a dependency for one feature or building a custom WebRTC integration from scratch -- both violate the "small bets, shipped fast" principle.

**Marco's concerns addressed:**
- Marco rated ElevenLabs as "least control" and "credit-based pricing is opaque." Suki's research corrected this: ElevenLabs pricing is a flat $0.10/min (not credit-based for conversational AI specifically), and the post-call webhook provides JSON transcript data that gives us everything we need for the Meeting schema integration.
- Marco valued Vapi's React Native SDK for future mobile support. This is a valid consideration for later, but v1 is web-only and should not optimize for mobile at the cost of frontend complexity.

**Risk:** ElevenLabs currently absorbs LLM costs in the per-minute rate. If they stop doing this, costs could increase. At our low volume (a few interviews per week), even a 2-3x price increase remains cheaper than Vapi's current rates.

---

## Integration with Existing Meeting System

### Core Principle: Interviews ARE Meetings

An interview is a new type of meeting. It reuses the existing `data/meetings/` storage, appears in the meetings list, and follows the same data shape. This avoids building a parallel system.

### Schema Changes

**Add `"interview"` to the `MeetingType` enum:**
```typescript
// Current: z.enum(["charter", "weekly", "custom"])
// New:     z.enum(["charter", "weekly", "custom", "interview"])
```

**Add optional fields to `MeetingSchema`:**
```typescript
// New optional fields on the Meeting object:
recordingUrl: z.string().url().nullable().default(null),    // ElevenLabs audio recording URL
interviewConfig: z.object({
  agentId: z.string(),                                      // ElevenLabs agent ID used
  topic: z.string(),                                        // Interview topic/title
  systemPrompt: z.string().optional(),                       // The prompt that was used
  knowledgeBaseIds: z.array(z.string()).optional(),           // KB items referenced
  durationSeconds: z.number().optional(),                    // Call duration from ElevenLabs
  elevenLabsConversationId: z.string().optional(),           // For cross-referencing in ElevenLabs dashboard
}).nullable().default(null),
```

**Transcript mapping:**
ElevenLabs webhook delivers transcript as an array of speaker turns. Map to existing `TranscriptEntrySchema`:
- ElevenLabs `role: "agent"` maps to `{ speaker: "AI Interviewer", role: "Interviewer", text: "..." }`
- ElevenLabs `role: "user"` maps to `{ speaker: "CEO", role: "CEO", text: "..." }`

**Participants field:**
Set to `["ceo", "ai-interviewer"]` for interview meetings. This distinguishes interviews from agent-to-agent meetings in the UI.

### What Does NOT Change

- Storage location (`data/meetings/` JSON files)
- List endpoint (`GET /api/meetings`)
- Detail endpoint (`GET /api/meetings/:id`)
- Meeting number sequence (interviews get the next number in sequence)
- Frontend meeting list rendering (interviews appear alongside other meetings, just with an "Interview" badge)

---

## User Interface

### Where the Interview Widget Lives

The interview widget appears **inline in the meetings section**, inside a collapsible panel -- similar to how the custom meeting creation form currently works. It does not open a modal or navigate to a new page.

### User Flow

1. **Start:** User clicks an "Interview" button in the meetings toolbar (alongside the existing Charter, Weekly, and New Meeting buttons).
2. **Configure:** A panel slides open with:
   - **Topic field** (required): Short text input describing what the interview is about (e.g., "Q1 strategy review", "Product roadmap priorities", "Post-launch retrospective").
   - **Context field** (optional): Textarea for additional context, notes, or specific questions the AI should cover.
   - A "Start Interview" button.
3. **Active Interview:** When "Start Interview" is clicked:
   - The configuration panel collapses.
   - The ElevenLabs widget appears inline (the `<elevenlabs-convai>` web component).
   - A "recording in progress" indicator shows the interview is active.
   - The user speaks naturally with the AI interviewer through their browser microphone.
4. **End Interview:** The user ends the conversation via the widget's built-in end-call control. Alternatively, the AI may wrap up after covering all topics.
5. **Processing:** After the call ends:
   - ElevenLabs sends a webhook to the TeamHQ backend with the full transcript.
   - The backend transforms the transcript into Meeting format and runs Claude to generate summary, key takeaways, decisions, and action items.
   - The interview record is saved to `data/meetings/`.
6. **Complete:** The interview appears in the meetings list with an "Interview" badge. Clicking it expands to show the full transcript, summary, decisions, and action items -- identical to how other meeting types display.

### UI Requirements

- The "Interview" button should be visually distinct from Charter/Weekly/Custom (different accent color or icon to signal it is a live audio experience, not a simulated meeting).
- During an active interview, the other meeting buttons (Charter, Weekly, Custom) should be disabled (same pattern as the current "meeting in progress" guard).
- The inline widget area should have enough vertical space for the ElevenLabs widget controls and a visual indicator that audio is active.
- Microphone permission prompt handling: if the browser blocks mic access, show a clear error message explaining how to enable it.

---

## Interview Configuration

### ElevenLabs Agent Setup

Create a single ElevenLabs Conversational AI agent configured for CEO interviews. This agent is created once via the ElevenLabs dashboard or API and reused for all interviews.

**System prompt structure:**
```
You are an AI interviewer for Sherlock Labs, a software product team. You are conducting a one-on-one interview with the CEO.

Your role:
- Ask thoughtful, open-ended questions about the given topic
- Listen carefully and ask follow-up questions based on responses
- Cover all key areas the CEO wants to discuss
- Summarize key points before moving to the next topic
- Wrap up by confirming the main takeaways

Interview topic: {topic}
Additional context: {context}

Guidelines:
- Be conversational and natural, not robotic or scripted
- Don't rush -- give the CEO time to think and elaborate
- If the CEO goes off-topic, gently guide back but don't cut them off
- Aim for a 15-30 minute conversation unless the CEO wants to go longer
- End by asking if there's anything else they'd like to add
```

The `{topic}` and `{context}` fields are populated dynamically per interview from the configuration panel.

### Knowledge Base

For v1, knowledge base configuration is handled in the ElevenLabs dashboard, not dynamically per interview. Upload a small set of standing context documents:

- Company strategy/vision doc
- Current project list
- Recent meeting summaries

This gives the AI interviewer baseline context about the team and its work. Dynamic per-interview knowledge base loading is out of scope for v1.

---

## Transcript Capture and Storage

### Webhook Flow

1. **ElevenLabs webhook fires** after call ends: `POST /api/webhooks/elevenlabs`
2. **Verify webhook signature** using HMAC authentication (ElevenLabs provides a signing secret)
3. **Extract transcript** from webhook payload
4. **Transform to Meeting format:**
   - Map speaker turns to `TranscriptEntrySchema` format
   - Set `type: "interview"`, `status: "completed"`
   - Set `participants: ["ceo", "ai-interviewer"]`
   - Populate `interviewConfig` with agent ID, topic, and conversation ID
5. **Run Claude post-processing** on the raw transcript to generate:
   - `summary`: 2-3 sentence summary of the interview
   - `keyTakeaways`: 3-5 bullet points
   - `decisions`: Any decisions the CEO articulated
   - `actionItems`: Any action items the CEO mentioned or committed to
   - `mood`: Overall tone of the conversation
6. **Save** the completed interview as a JSON file in `data/meetings/`

### Matching Webhook to Interview

When the user starts an interview, the backend creates a meeting record in "running" state and stores the ElevenLabs conversation ID. When the webhook arrives, match on conversation ID to update the correct meeting record.

**Flow:**
1. Frontend calls `POST /api/interviews/start` with `{ topic, context }`
2. Backend creates meeting record (status: "running"), stores a mapping of `elevenLabsConversationId -> meetingId`
3. Backend returns the ElevenLabs agent configuration to the frontend
4. Frontend initializes the widget
5. Webhook arrives with `conversationId` -> backend looks up the meeting ID -> updates the record

### Post-Processing Prompt

The Claude post-processing step uses a prompt similar to the existing meeting output format:

```
Analyze this interview transcript between the CEO and an AI interviewer.
Topic: {topic}

Generate a structured summary including:
- A 2-3 sentence summary
- 3-5 key takeaways
- Any decisions the CEO articulated (with rationale)
- Action items the CEO mentioned or committed to (with priority)
- The overall mood/tone in 1-3 words

Transcript:
{transcript}
```

This reuses the existing `MeetingOutputJsonSchema` for structured output, ensuring interviews produce the same shape of data as other meetings.

---

## Display in Meetings List

### Interview Cards

Interview cards in the meetings list follow the same layout as other meeting cards with these differences:

- **Badge:** Shows "Interview" instead of "Charter" / "Weekly" / "Custom" (with a distinct badge color)
- **Participants:** Shows "CEO + AI Interviewer" instead of agent avatars
- **Topic:** The interview topic appears as a subtitle on the card
- **Expanded view:** Same sections as other meetings: Key Takeaways, Decisions, Action Items, Transcript, Next Meeting Topics

### Badge Styling

Add an `interview` variant to the meeting card badge CSS, using a color that distinguishes it from the existing badge types (charter = green, weekly = blue, custom = purple). Suggested: a warm accent (amber/orange) to signal it is a different kind of interaction.

### Sorting

Interviews sort by `startedAt` alongside all other meetings. No separate list or filter for v1.

---

## API Endpoints

### New Endpoints

**`POST /api/interviews/start`**
- Body: `{ topic: string, context?: string }`
- Creates a meeting record in "running" state with `type: "interview"`
- Returns `{ meetingId, agentConfig }` where `agentConfig` contains the ElevenLabs agent ID and any dynamic configuration needed by the widget
- Validates: no other meeting currently running (same guard as existing meetings)

**`POST /api/webhooks/elevenlabs`**
- Receives the post-call webhook from ElevenLabs
- Verifies HMAC signature
- Matches conversation ID to meeting record
- Transforms transcript, runs Claude post-processing, updates meeting record
- Returns 200 OK

### Modified Endpoints

**`GET /api/meetings`** -- no changes needed, interviews appear automatically (they are meetings)

**`GET /api/meetings/:id`** -- no changes needed, interview detail loads the same way

---

## Out of Scope for v1

The following are explicitly deferred to future iterations:

1. **Scheduled interviews.** v1 is start-now only. No calendar integration, no reminders, no scheduling UI.
2. **Interview templates.** v1 has a single interview flow. No saved templates for "strategy review" vs. "pulse check" vs. "retrospective."
3. **Dynamic knowledge base per interview.** v1 uses a static knowledge base configured in the ElevenLabs dashboard. Per-interview document upload comes later.
4. **Live transcription display.** v1 does not show real-time transcript during the interview. The transcript appears only after the call ends. (ElevenLabs may support this, but it adds frontend complexity.)
5. **Audio playback.** v1 stores the recording URL but does not build an audio player in the UI. The URL is available in the data for future use.
6. **Interview analytics.** No dashboards, no trend analysis, no topic frequency tracking.
7. **Multiple interview agents.** v1 uses a single ElevenLabs agent. No per-interview agent customization beyond topic and context.
8. **Mobile support.** v1 is web-only. The ElevenLabs web component may work in mobile browsers, but we are not explicitly testing or optimizing for mobile.
9. **Multi-participant interviews.** v1 is 1:1 (CEO + AI). No group interview support.
10. **Custom voice selection.** v1 uses a single voice chosen during agent setup. Voice picker UI comes later.
11. **Filtering/search in meetings list.** Interviews mix in with all meetings. No type filter for v1.
12. **Video.** Explicitly ruled out by CEO decision.

---

## Acceptance Criteria

### AC1: Start an Interview
- [ ] An "Interview" button appears in the meetings toolbar
- [ ] Clicking it opens a configuration panel with topic (required) and context (optional) fields
- [ ] Clicking "Start Interview" initiates the ElevenLabs widget inline
- [ ] Browser requests microphone permission
- [ ] The user can speak with the AI interviewer in real time
- [ ] Other meeting buttons are disabled while an interview is in progress

### AC2: AI Interviewer Behavior
- [ ] The AI interviewer asks relevant questions based on the provided topic
- [ ] The AI follows up on responses naturally
- [ ] The AI references knowledge base context when relevant
- [ ] The conversation feels natural, not robotic

### AC3: Transcript Capture
- [ ] After the call ends, ElevenLabs webhook delivers the transcript
- [ ] The webhook is verified via HMAC signature
- [ ] The transcript is transformed into Meeting `TranscriptEntrySchema` format
- [ ] Claude post-processing generates summary, key takeaways, decisions, action items, and mood

### AC4: Meeting Record
- [ ] The completed interview is saved as a JSON file in `data/meetings/`
- [ ] The interview has `type: "interview"` and appears in the meetings list
- [ ] The meeting card shows an "Interview" badge with distinct styling
- [ ] Expanding the card shows the same detail view as other meetings (takeaways, decisions, action items, transcript)
- [ ] The interview topic appears on the card

### AC5: Error Handling
- [ ] If microphone access is denied, a clear error message is shown
- [ ] If the ElevenLabs widget fails to load, a fallback message appears
- [ ] If the webhook fails, the meeting record is updated to "failed" status with an error message
- [ ] If Claude post-processing fails, the raw transcript is still saved (without summary/takeaways)

### AC6: Guards
- [ ] Cannot start an interview while another meeting (any type) is running
- [ ] Cannot start another meeting while an interview is in progress

---

## Implementation Order

This follows the team's proven pipeline:

### Phase 1: Architecture + Design (Parallel)
- **Andrei (Architect):** Define the integration architecture -- ElevenLabs API setup, webhook handling, schema changes, server-side flow. Specify the ElevenLabs agent configuration. Write `docs/ai-interviews-tech-approach.md`.
- **Robert (Designer):** Design the interview UI -- button placement, configuration panel, active interview state, completion state, interview badge in meeting cards. Write `docs/ai-interviews-design-spec.md`.
- **Kai (AI Engineer):** Draft the system prompt for the ElevenLabs agent and the Claude post-processing prompt. These go into the tech approach doc.

### Phase 2: API Contract Alignment
- **Alice + Jonah:** Agree on the API shape for `POST /api/interviews/start` and `POST /api/webhooks/elevenlabs` before building independently.

### Phase 3: Implementation (Parallel)
- **Jonah (Backend):**
  - Add `"interview"` to MeetingType enum
  - Add `recordingUrl` and `interviewConfig` optional fields to MeetingSchema
  - Build `POST /api/interviews/start` endpoint
  - Build `POST /api/webhooks/elevenlabs` endpoint with HMAC verification
  - Build transcript transformation (ElevenLabs format to Meeting format)
  - Build Claude post-processing step (reuse existing `runClaude` infrastructure)
  - Store ElevenLabs conversation ID to meeting ID mapping

- **Alice (Frontend):**
  - Add "Interview" button to meetings toolbar
  - Build configuration panel (topic + context fields)
  - Embed `<elevenlabs-convai>` web component
  - Handle widget lifecycle (start, active state, end)
  - Handle microphone permission errors
  - Add "Interview" badge variant to meeting cards
  - Show interview topic on card
  - Update "meeting in progress" guards to include interview state

### Phase 4: Design Review
- **Robert:** Lightweight visual review of implementation against design spec.

### Phase 5: QA (Release Gate)
- **Enzo:** Full test pass against acceptance criteria. Pass/fail verdict required before shipping.

### Phase 6: Post-Ship
- **Priya:** Write product messaging for the interview feature.
- **Nadia:** Document how to use interviews.
- **Yuki:** Post-project retrospective.

---

## Environment Setup

### Required Credentials
- **ElevenLabs API key:** Stored as `ELEVENLABS_API_KEY` environment variable on the server
- **ElevenLabs Agent ID:** Stored as `ELEVENLABS_AGENT_ID` environment variable (created once via dashboard/API)
- **ElevenLabs Webhook Secret:** Stored as `ELEVENLABS_WEBHOOK_SECRET` for HMAC verification

### ElevenLabs Account
- Starter plan ($5/mo) is sufficient for development and low-volume usage
- At $0.10/min, a $5 plan provides meaningful testing budget
- Upgrade to Pro ($83/mo) if usage exceeds starter limits

---

## Cost Estimate

| Interview Type | Duration | Cost per Session |
|---------------|----------|-----------------|
| Quick pulse check | 5-10 min | $0.50-1.00 |
| Standard interview | 15-30 min | $1.50-3.00 |
| Deep strategy session | 30-60 min | $3.00-6.00 |

At 3-5 interviews per week, estimated monthly cost: $20-80. This is well within the Starter/Creator plan range.

---

## Dependencies

- ElevenLabs Conversational AI account (Starter plan or above)
- ElevenLabs agent created and configured with system prompt and knowledge base
- Browser with microphone access (Chrome, Firefox, Safari, Edge -- all modern browsers support WebRTC)
- Existing TeamHQ Express server running (for webhook endpoint)
- Claude CLI available on server (for post-processing -- already used by meeting runner)

---

## Open Questions for Architecture

1. **Widget initialization:** Does the ElevenLabs web component need any server-side token generation per session, or can it authenticate purely with the agent ID? This affects whether `POST /api/interviews/start` needs to call the ElevenLabs API or just creates a local meeting record.
2. **Webhook reliability:** What happens if the webhook fails to deliver? Does ElevenLabs retry? Do we need a fallback polling mechanism to fetch transcripts?
3. **Conversation ID timing:** When does the ElevenLabs conversation ID become available -- at widget initialization or only after the call starts? This affects when we can store the ID-to-meeting mapping.
