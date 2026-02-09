# AI Video/Audio Interview & Conversation Tools -- Market Research

**Researcher:** Suki (Product Researcher)
**Date:** 2026-02-09
**Scope:** Evaluate the landscape of AI-powered video and audio conversation tools for use in scheduled CEO interviews, strategy sessions, pulse checks, and user research conversations. Identify the top options, compare capabilities, and recommend a path forward.

---

## Executive Summary

The market for real-time AI conversation tools has matured rapidly. Two distinct categories have emerged: **conversational video AI** (Tavus, HeyGen, Synthesia) where a visual avatar participates in the call, and **conversational voice AI** (ElevenLabs, Retell, Vapi, Bland) where the interaction is audio-only. A third, more niche category -- **AI-moderated research platforms** (Outset, Strella, Maze) -- focuses specifically on conducting user interviews at scale.

For TeamHQ's use case (scheduled conversations with the CEO for strategy input, pulse checks, and retrospectives), the key requirements are: (1) real-time interactive conversation, (2) custom interview scripts/context, (3) clean transcript output, (4) reasonable cost per session, and (5) embeddable in a web app.

**Top-3 recommendation:** ElevenLabs (best voice quality + simplest pricing), Tavus (best video experience if visual presence matters), Retell (best developer ergonomics for custom interview flows).

---

## The Landscape

### Category 1: Conversational Video AI

These tools show a real-time video avatar that sees, hears, and responds to the user. The avatar has a visual face with lip-sync, gestures, and expressions.

---

#### 1. Tavus

**What it is:** The leading conversational video AI (CVI) platform. A lifelike AI replica appears on-screen via WebRTC, listens to you, and responds in real time with natural lip-sync and gestures. The replica can also "see" you via its Perception model (detecting facial expressions, body language, environment).

**Core capability:** Real-time interactive video conversation. The AI has a visual face, voice, and (optionally) vision.

**API & developer experience:** Strong. REST API for persona creation and conversation management, WebRTC-based streaming, React SDK for embedding. Well-documented with starter kits for specific use cases including an explicit "AI Interviewer" template. GitHub examples repo maintained by Tavus Engineering.

**Customization:** Excellent. The Persona API accepts a `system_prompt` (behavioral instructions) and `context` (domain knowledge / interview scripts). You can define the interview structure -- introduction, topic areas, follow-up rules, wrap-up -- entirely through the persona configuration. Supports custom LLMs via full pipeline mode (STT + LLM + TTS). Perception model (raven-0) can monitor participant behavior for cues like distraction.

**Pricing:**
| Plan | Monthly | Included CVI Minutes | Overage Rate |
|------|---------|---------------------|--------------|
| Free | $0 | 25 min | $0.37/min |
| Starter | $59 | 100 min | $0.37/min |
| Growth | $397 | 1,250 min | $0.32/min |
| Enterprise | Custom | Custom | Custom |

**Cost per 30-min interview:** ~$11.10 on Starter (overage), ~$9.60 on Growth (overage), or included in plan minutes. A 60-min CEO strategy session costs ~$19-22 on overage rates.

**Transcript/recording:** Available on paid tiers. Conversation transcripts and video recordings accessible via API. Supports compliance and review workflows.

**Scheduling:** No native scheduling UI. You create a conversation via API and share the join URL. Scheduling would be built on your side (calendar integration + API call to create conversation at the right time).

**Latency:** ~600ms utterance-to-utterance (sub-1 second), powered by Cartesia's Sonic TTS model. Sparrow turn-detection handles interruptions and pauses naturally. This is fast enough that conversations feel natural.

**Strengths:** Purpose-built for interactive interviews. Starter kit for AI interviewer exists. Visual presence adds engagement. Perception model is unique -- no other platform can "see" the participant. Sub-1s latency makes it feel real.

**Weaknesses:** Most expensive option per minute. Video adds complexity (WebRTC, bandwidth requirements). Requires creating a custom "replica" (visual avatar) which adds setup friction. Overkill if the CEO just wants to talk, not look at an avatar face.

---

#### 2. HeyGen (LiveAvatar)

**What it is:** Primarily an AI video generation platform (script-to-video) that added real-time interactive avatars via "LiveAvatar." The avatar speaks, listens, and responds in real time via WebRTC.

**Core capability:** Real-time interactive video avatar + pre-recorded video generation. LiveAvatar is the interactive product; standard HeyGen is async video creation.

**API & developer experience:** Decent. Streaming Avatar SDK for embedding interactive avatars. Separate API credit system from the main HeyGen product, which creates confusion. Documentation exists but is split across the main product and LiveAvatar.

**Customization:** You can configure avatar behavior via prompts and connect to custom backends. Less documented for structured interview flows compared to Tavus. More oriented toward sales/support use cases than research interviews.

**Pricing:**
| Plan | Monthly | API Credits | Cost per Credit |
|------|---------|------------|-----------------|
| Free | $0 | 10 credits | - |
| Pro | $99 | 100 credits | $0.99 |
| Scale | $330 | 660 credits | $0.50 |
| Enterprise | Custom | Custom | Custom |

API streaming: ~1 credit per 1-5 minutes depending on integration method. Per-minute cost approximately $0.20-0.33/min.

**Cost per 30-min interview:** ~$6-10 depending on tier and credit consumption rate. Cheaper than Tavus but pricing is opaque due to credit system.

**Transcript/recording:** Limited native transcript support for LiveAvatar sessions. You would likely need to add your own transcription layer.

**Scheduling:** No native scheduling. Same as Tavus -- build your own.

**Latency:** Not as explicitly documented as Tavus. Reports suggest slightly higher latency than Tavus for interactive sessions.

**Strengths:** Large avatar library (100+ stock avatars). Strong video generation product if you also need async video content. Lower per-minute cost than Tavus.

**Weaknesses:** LiveAvatar feels like an add-on to the core product, not the core product itself. Credit system is confusing. Less purpose-built for interview/conversation use cases. Transcript support for live sessions is weak. Separate billing from main HeyGen plans creates friction.

---

#### 3. Synthesia

**What it is:** The largest AI video generation platform (enterprise-focused, $4B+ valuation). Historically async-only (script-to-video), but launched "Video Agents" in late 2025 / early 2026 -- interactive, real-time avatars that can converse, capture data, and take actions.

**Core capability:** Primarily async AI video generation. Video Agents (real-time interactive) are new and enterprise-only.

**API & developer experience:** Enterprise-tier API only. Not developer-friendly for small teams. Built for large-scale enterprise deployments (onboarding, training, compliance). Overkill for a small team's interview tool.

**Customization:** Video Agents can be configured with business knowledge and custom instructions. But access requires enterprise contract.

**Pricing:**
| Plan | Monthly | Focus |
|------|---------|-------|
| Free | $0 | Limited async video |
| Starter | $18-29 | Async video, no interactive |
| Creator | $64-89 | Async video, more features |
| Enterprise | Custom | Video Agents (interactive), API, custom avatars |

Interactive Video Agents are enterprise-only. No self-serve pricing for the real-time conversation feature.

**Transcript/recording:** Available for enterprise Video Agent sessions.

**Scheduling:** Enterprise-level workflow automation.

**Verdict:** Not viable for TeamHQ. Interactive features are enterprise-gated with no self-serve option. The platform is designed for large organizations with dedicated contracts. The async video product is excellent but irrelevant to the interview use case.

---

### Category 2: Conversational Voice AI

These tools provide audio-only AI conversations -- no visual avatar. The AI listens and responds via voice with natural-sounding speech. Typically lower latency, lower cost, and simpler to integrate than video.

---

#### 4. ElevenLabs (Conversational AI / ElevenAgents)

**What it is:** The industry leader in AI voice quality, now with a full conversational AI agent platform. Known for the most natural-sounding TTS in the market. Their Conversational AI product lets you build voice agents that can hold real-time spoken conversations.

**Core capability:** Real-time voice conversation. Audio-only. Industry-best voice quality with emotional tone, pacing, and expressiveness.

**API & developer experience:** Excellent. Well-documented API and SDKs (React, Next.js, Python). Embeddable web widget with a single HTML snippet. WebSocket-based real-time communication. Active open-source examples repo on GitHub. Quickstart gets you to a working agent in minutes.

**Customization:** Strong. System prompt for agent behavior. Knowledge base (files, URLs, text) for domain-specific context -- agents can reference uploaded documents during conversation. Custom function calling for real-time data retrieval. Up to 5 knowledge base items on non-enterprise plans, unlimited on enterprise.

**Pricing:**
| Plan | Monthly | Conv. AI Rate | Notes |
|------|---------|--------------|-------|
| Free | $0 | - | Limited testing |
| Starter | $5 | $0.10/min | LLM costs currently absorbed |
| Creator | $11 | $0.10/min | More credits |
| Pro | $83 | $0.10/min | Higher limits |
| Business | $165 (annual) | $0.08/min | Higher limits |
| Enterprise | Custom | < $0.08/min | Volume discounts |

As of January 2026, ElevenLabs cut conversational AI pricing by ~50%. LLM costs are currently absorbed by ElevenLabs (not passed through), though they may eventually be billed separately.

**Cost per 30-min interview:** ~$3.00 on Starter/Creator/Pro plans. ~$2.40 on Business. A 60-min CEO strategy session costs ~$6.00. This is by far the cheapest option per minute.

**Transcript/recording:** Conversation transcripts available in the Call History dashboard. Transcripts downloadable in TXT, PDF, DOCX, JSON, SRT, or VTT formats. Full conversation analysis including topic detection.

**Scheduling:** No native scheduling. You initiate conversations via API or widget. Scheduling would be built on your side.

**Latency:** Competitive with voice-only platforms. Streaming architecture with STT + LLM + TTS parallelism. Sub-second response times achievable.

**Strengths:** Best voice quality in the market -- conversations feel genuinely human. Simplest pricing model (flat per-minute). Lowest cost per interview. Excellent developer experience with embeddable widget. Knowledge base lets you upload interview guides, company strategy docs, and product briefs that the agent references during conversation. Multi-format transcript export is exactly what the team needs. 31 languages supported.

**Weaknesses:** Audio-only (no visual avatar). Knowledge base limited to 5 items on non-enterprise plans. LLM cost absorption may not last forever (potential future price increase). Newer to the conversational AI space than voice-focused competitors.

---

#### 5. Retell AI

**What it is:** A developer-focused voice AI platform built for phone agents and conversational automation. Strong emphasis on structured conversation flows, custom LLM integration, and call analytics.

**Core capability:** Real-time voice conversation via phone or web. Designed for building production-grade voice agents with complex conversation logic.

**API & developer experience:** Best-in-class for developers. REST API + WebSocket for real-time communication. Custom LLM integration via WebSocket (bring your own LLM). Conversation Flow builder for structured pathways. React Web SDK for browser-based calls. Comprehensive call analytics dashboard. Open-source demo repos on GitHub.

**Customization:** The strongest of any platform for structured interviews. Two approaches: (1) Prompt-based -- give the agent a system prompt and let it freestyle, or (2) Conversation Flow -- define explicit pathways, branching logic, and structured question sequences. Custom Function calling for real-time data retrieval. PII detection and removal from transcripts.

**Pricing:**
| Component | Cost |
|-----------|------|
| Voice engine | $0.07-0.08/min |
| LLM (basic) | $0.006/min |
| LLM (advanced, e.g. Claude) | $0.06/min |
| Total (typical) | $0.13-0.31/min |
| Enterprise (volume) | ~$0.05/min |

Pay-as-you-go with no monthly subscription required. Phone numbers $2-100/month. Extra concurrent call slots $8/month.

**Cost per 30-min interview:** ~$4.00-9.30 depending on LLM choice. With Claude as the LLM: ~$4.50-5.00. A 60-min CEO strategy session costs ~$8-10.

**Transcript/recording:** Full transcripts with tool call invocations woven in. PII auto-redaction available. Recording URLs accessible via API. Live transcription available on web calls. JSON-structured transcript data via Get Call API.

**Scheduling:** Batch Call Window feature for defining when calls run (specific hours/days). Function calling enables calendar integration (Google Calendar, etc.). No built-in scheduling UI but strong primitives to build one.

**Latency:** Competitive. Streaming architecture. Reported latency in the 500-1000ms range depending on LLM choice.

**Strengths:** Best developer platform for building structured interview agents. Conversation Flow builder is perfect for semi-structured CEO interviews with branching topics. Custom LLM support means you can use Claude for the interview logic. PII redaction is valuable for sensitive strategy conversations. Web call SDK means no phone number needed -- runs in the browser. Transparent, predictable pricing.

**Weaknesses:** Audio-only. Pricing is more complex than ElevenLabs (multiple components to track). Voice quality good but not ElevenLabs-tier. More enterprise/sales-oriented positioning -- interview use case requires some adaptation. No embeddable widget (need to build your own UI with the SDK).

---

#### 6. Vapi

**What it is:** A modular, developer-centric voice AI platform. Lets you mix and match STT, LLM, and TTS providers for maximum flexibility. Popular with agencies and technical teams.

**Core capability:** Real-time voice conversation. Highly configurable -- choose your own transcription, language model, and voice providers independently.

**API & developer experience:** Very flexible but complex. REST API, WebSocket, React SDK. Custom knowledge base with bring-your-own retrieval server option. The flexibility is powerful but can overwhelm non-technical teams.

**Customization:** System prompt + knowledge base (PDFs, text documents). Custom knowledge base server for full control. Structured outputs. Tool/function calling.

**Pricing:**
| Component | Cost |
|-----------|------|
| Vapi platform | $0.05/min |
| STT | ~$0.01/min |
| LLM | ~$0.02-0.20/min |
| TTS | ~$0.04/min |
| Total (typical) | $0.13-0.33/min |

Monthly plans: Agency $500/mo, Startup $1,000/mo. Free trial: ~$10 credit (~150-200 minutes).

**Cost per 30-min interview:** ~$4.00-10.00 depending on model choices. Similar to Retell.

**Transcript/recording:** Full transcripts and recordings via artifact plan system. Transcripts accessible via API.

**Scheduling:** No native scheduling. API-driven conversation initiation.

**Latency:** Variable depending on provider choices. Can be optimized but requires tuning.

**Strengths:** Maximum flexibility in provider selection. Can optimize for cost vs. quality by swapping components. Good for teams that want fine-grained control.

**Weaknesses:** Pricing is confusing -- up to 5 separate invoices per month from different providers. True costs significantly higher than the advertised $0.05/min. Overwhelming for non-technical users. Monthly plans start at $500, which is expensive for low-volume use. More suited to high-volume call center use cases than occasional interviews.

**Verdict:** Not recommended for TeamHQ. The flexibility adds complexity without clear benefit for the interview use case. Pricing is opaque and expensive for low-volume usage. Retell and ElevenLabs are simpler, cheaper, and better-documented for this use case.

---

#### 7. Bland.ai

**What it is:** An AI phone call automation platform. Makes and receives phone calls using AI agents. Designed for sales, customer service, and appointment scheduling at scale.

**Core capability:** Outbound and inbound AI phone calls over traditional telephony networks. Not browser-based.

**API & developer experience:** REST API for initiating calls. Conversational Pathways (no-code flow builder) or prompt-based configuration. Webhook support for call events.

**Customization:** System prompt or visual Conversational Pathways. Custom data via metadata fields. Real-time data fetching via webhooks during calls.

**Pricing:**
| Plan | Monthly | Per Minute | Concurrency |
|------|---------|-----------|-------------|
| Start | Free | $0.09/min | Limited |
| Build | $299 | $0.09/min | 50 concurrent |
| Scale | $499 | $0.11/min | 100 concurrent |
| Enterprise | Custom | Custom | Unlimited |

Additional: $0.015 per outbound attempt under 10 seconds. SMS: $0.02/message.

**Cost per 30-min interview:** ~$2.70 on per-minute rate alone.

**Transcript/recording:** Full transcript retrieval via API. Call recordings accessible via `recording_url`. SOC 2, HIPAA, GDPR compliant.

**Scheduling:** Batch scheduling, reminder calls, appointment booking via function calling.

**Strengths:** Cheap per-minute rate. Good compliance posture. Strong for high-volume outbound call automation.

**Weaknesses:** Phone-only -- requires actual phone numbers, no browser/web call option. Built for call center automation, not interactive interviews. The CEO would need to answer a phone call from an AI, which is a poor UX for scheduled strategy conversations. No web embed capability. Not designed for the "sit down and have a thoughtful conversation" use case.

**Verdict:** Not recommended. Phone-only architecture is a poor fit. The CEO should be able to click a link in TeamHQ and start talking, not pick up a ringing phone.

---

### Category 3: AI-Moderated Research Platforms

These are purpose-built for conducting user research interviews at scale. They handle the full workflow: study design, participant recruitment, AI moderation, transcription, and analysis.

---

#### 8. Outset

**What it is:** An AI-moderated research platform that conducts hundreds of interviews simultaneously via video, voice, or text. The AI interviewer engages participants in dialogue and probes deeper based on responses.

**Core capability:** AI-moderated qualitative research at scale. Video, voice, or text modalities. Dynamic follow-up questions. Automatic analysis and synthesis.

**API & developer experience:** Platform-oriented, not API-first. Designed for research teams using the Outset dashboard, not for embedding in custom applications.

**Customization:** Study design tools, custom interview guides, AI-generated guides, multilingual support (40+ languages).

**Pricing:** Custom/enterprise. Estimated starting at ~$200/month for basic access. Research Plus plan adds expert support.

**Transcript/recording:** Full transcripts with automatic thematic analysis and synthesis. Built-in analysis tools.

**Scheduling:** Built-in participant scheduling and recruitment (including their own panel).

**Strengths:** Purpose-built for the research interview use case. Automatic analysis saves time. Can recruit participants through the platform. Scales to hundreds of simultaneous interviews.

**Weaknesses:** Not embeddable in TeamHQ. Designed as a standalone SaaS platform, not a building block. Enterprise pricing. Overkill for CEO strategy interviews where the "participant" is already known. More suited to external user research than internal team conversations.

**Verdict:** Worth noting for the user research use case (external participants), but not the right tool for CEO strategy interviews. If TeamHQ later wants to conduct AI-moderated user research interviews, Outset is the leader in that category.

---

## Key Questions Answered

### What's the best option for real-time interactive interviews (not pre-recorded)?

**For voice-only:** ElevenLabs. Best voice quality, simplest pricing, lowest cost, excellent developer experience. The conversation feels human because the voice is the best in the industry.

**For video:** Tavus. Purpose-built for conversational video with an explicit AI Interviewer starter kit. Sub-1s latency makes the interaction feel natural. Perception model adds unique value (detecting participant engagement).

### Which tools let you provide custom interview scripts/topics?

All of them support system prompts for behavioral instructions. But for **structured interview flows** with branching logic and topic management:

1. **Retell** -- Conversation Flow builder with explicit pathways and branching. Best for semi-structured interviews.
2. **Tavus** -- Persona API with `system_prompt` + `context` fields. Dedicated AI Interviewer template.
3. **ElevenLabs** -- System prompt + knowledge base (upload interview guides, strategy docs). Simple but effective.

### Which produce clean, structured transcripts automatically?

1. **ElevenLabs** -- Transcripts downloadable in TXT, PDF, DOCX, JSON, SRT, or VTT. Best format flexibility.
2. **Retell** -- JSON-structured transcripts via API with tool call invocations woven in. PII auto-redaction.
3. **Tavus** -- Transcripts and video recordings on paid tiers. Less format flexibility.

### What's the realistic cost per interview?

| Tool | 30-min Session | 60-min Session |
|------|---------------|----------------|
| ElevenLabs | ~$3.00 | ~$6.00 |
| Bland.ai | ~$2.70 | ~$5.40 |
| Retell (w/ Claude) | ~$4.50 | ~$9.00 |
| Vapi | ~$4.00-10.00 | ~$8.00-20.00 |
| Tavus (Growth) | ~$9.60 | ~$19.20 |
| HeyGen | ~$6.00-10.00 | ~$12.00-20.00 |

ElevenLabs is the clear cost leader among viable options (Bland.ai is cheaper but phone-only).

### Video vs. audio-only -- what's the tradeoff?

| Dimension | Video (Tavus/HeyGen) | Audio-Only (ElevenLabs/Retell) |
|-----------|---------------------|-------------------------------|
| **Cost** | 2-4x more expensive per minute | Cheapest option |
| **Complexity** | WebRTC, bandwidth requirements, avatar setup | Simple WebSocket or widget embed |
| **Latency** | ~600ms-1s (good, not perfect) | ~300-800ms (closer to natural) |
| **User experience** | More engaging/novel, but "uncanny valley" risk | Feels like a phone call -- familiar and low-friction |
| **Setup effort** | Need to create/select avatar, configure visual persona | Just configure voice and prompt |
| **Bandwidth** | Requires good internet connection | Works on any connection |
| **Integration** | More complex embedding (WebRTC) | Widget embed or simple SDK |

**Bottom line:** Video adds visual engagement but at significant cost, complexity, and uncanny-valley risk. For internal CEO strategy interviews where the priority is capturing high-quality input efficiently, audio-only is the pragmatic choice. Video becomes compelling for external-facing use cases (customer interviews, sales demos) where visual presence matters for credibility and engagement.

---

## Use Case Mapping

### CEO Strategy Interviews (30-60 min, open-ended)

**Best fit:** ElevenLabs or Retell with Claude as the LLM.

The agent needs a detailed system prompt covering the interview's strategic topics, uploaded context documents (company strategy, recent decisions, market data), and freedom to follow the CEO's train of thought while ensuring all key topics get covered. ElevenLabs' knowledge base is ideal for this -- upload the strategy brief, and the agent references it naturally during conversation.

**Estimated cost:** $3-9 per session.

### Quick Pulse Checks (5-10 min, specific questions)

**Best fit:** ElevenLabs (widget embed in TeamHQ).

Short, focused conversations with a tight question set. The embeddable widget means the CEO can click a button in TeamHQ and start talking immediately. At $0.10/min, a 10-minute pulse check costs $1.

**Estimated cost:** $0.50-1.00 per session.

### User Research Interviews (external participants)

**Best fit:** Outset (purpose-built platform) or Tavus (video AI with interviewer template).

External participants benefit from a visual presence (Tavus) or a fully managed research workflow (Outset). For scale, Outset handles recruitment, scheduling, and analysis. For branded, high-touch interviews, Tavus's video presence creates a more professional experience.

**Estimated cost:** Outset: enterprise pricing. Tavus: $10-20 per 30-min session.

### Team Retrospectives via Conversation

**Best fit:** ElevenLabs or Retell.

Similar to pulse checks but with multiple team members. The agent conducts individual retro conversations with each team member, then transcripts are compiled for analysis. ElevenLabs' multi-format transcript export (especially JSON) makes post-processing straightforward.

**Estimated cost:** $3-6 per team member (30-min sessions).

---

## Competitive Comparison Matrix

| Capability | Tavus | HeyGen | Synthesia | ElevenLabs | Retell | Vapi | Bland |
|---|---|---|---|---|---|---|---|
| **Modality** | Video + Audio | Video + Audio | Video + Audio | Audio only | Audio only | Audio only | Audio (phone) |
| **Real-time interactive** | Yes | Yes (LiveAvatar) | Enterprise only | Yes | Yes | Yes | Yes |
| **API quality** | Good | Decent | Enterprise only | Excellent | Excellent | Good (complex) | Good |
| **Custom prompts** | Yes (Persona API) | Yes | Enterprise | Yes | Yes | Yes | Yes |
| **Knowledge base** | Context field | Limited | Enterprise | Yes (files, URLs) | Custom LLM | Yes (docs) | Webhooks |
| **Structured flows** | Template-based | Limited | Unknown | Prompt-based | Flow builder | Prompt-based | Pathways |
| **Transcript output** | Yes (paid) | Limited | Enterprise | Multi-format | JSON + text | Yes | Yes |
| **Web embed** | React SDK | Streaming SDK | Enterprise | Widget (1 line) | React SDK | React SDK | No (phone only) |
| **Scheduling** | Build your own | Build your own | Enterprise | Build your own | Batch windows | Build your own | Batch + reminders |
| **Latency** | ~600ms | Higher | Unknown | Sub-second | 500-1000ms | Variable | N/A (phone) |
| **Cost / 30 min** | ~$9.60 | ~$6-10 | Enterprise | ~$3.00 | ~$4.50 | ~$4-10 | ~$2.70 |
| **Self-serve** | Yes | Yes | No (interactive) | Yes | Yes | Yes | Yes |
| **Interview template** | Yes (starter kit) | No | No | No | No | No | No |

---

## Top-3 Recommendation

### 1. ElevenLabs -- Best Overall for TeamHQ

**Why:** Lowest cost ($0.10/min), best voice quality, simplest integration (single-line widget embed), multi-format transcript export, and knowledge base for uploading interview context. The January 2026 pricing cut made this the clear value leader. For a team that wants to ship fast and iterate, ElevenLabs gets you from zero to working prototype in hours, not days.

**Best for:** CEO pulse checks, strategy interviews, team retros. Any internal conversation where audio quality and transcript output matter more than visual presence.

**Risk:** LLM costs currently absorbed may eventually be passed through, increasing per-minute rates. Knowledge base limited to 5 items on non-enterprise plans.

**Path to v1:** Embed the ElevenLabs widget in TeamHQ. Create an agent with a system prompt for each interview type (strategy, pulse check, retro). Upload relevant context documents to the knowledge base. Build a simple scheduling layer that creates conversations on a calendar. Pull transcripts via API after each session.

### 2. Tavus -- Best for Visual Presence

**Why:** The only platform with a mature, low-latency conversational video product and an explicit AI Interviewer starter kit. If the CEO (or external participants) want to "see" who they're talking to, Tavus is the clear leader. The Perception model (detecting participant engagement/distraction) is a unique differentiator for interview quality.

**Best for:** External user research interviews, high-stakes strategy sessions where visual engagement matters, situations where the "wow factor" of talking to a video AI adds value.

**Risk:** 3x the cost of ElevenLabs. More complex integration (WebRTC vs. widget embed). Avatar creation adds setup friction. Uncanny valley risk -- some people find video AI avatars unsettling rather than engaging.

**Path to v1:** Use the AI Interviewer starter kit persona as a base. Customize the system prompt and context for CEO strategy interviews. Embed via React SDK in TeamHQ. Build scheduling layer. Pull transcripts and recordings via API.

### 3. Retell -- Best for Structured Interview Flows

**Why:** The Conversation Flow builder is the most powerful tool for designing semi-structured interviews with branching logic, explicit topic coverage, and structured data capture. If the interviews need to follow a specific protocol (e.g., always cover these 5 strategy topics, branch into follow-ups based on responses, capture decisions explicitly), Retell gives you the most control.

**Best for:** Structured strategy interviews with required topic coverage, data-heavy conversations where you need structured extraction, interviews where the flow must be reproducible and consistent across sessions.

**Risk:** No embeddable widget (need to build custom UI with React SDK). Voice quality good but not ElevenLabs-tier. More complex pricing with multiple cost components.

**Path to v1:** Design interview flows using the Conversation Flow builder. Connect Claude as the custom LLM for nuanced conversation. Build a React-based interview UI in TeamHQ using their Web SDK. Pull structured JSON transcripts via API.

---

## Recommendation for TeamHQ

**Start with ElevenLabs.** It is the fastest path to a working prototype, the cheapest to operate, has the best voice quality, and the widget embed means Alice can integrate it into TeamHQ in a single sprint. The knowledge base feature covers the "give the AI context for the interview" requirement. Multi-format transcript export gives the team exactly what they need to act on interview outputs.

**Consider adding Tavus later** if external-facing interviews or visual presence becomes important. The two tools serve different use cases well and could coexist in TeamHQ.

**Skip** Synthesia (enterprise-gated), Bland.ai (phone-only), Vapi (complex and expensive for low volume), and HeyGen (video add-on feels secondary, weak transcript support).

**For external user research at scale**, evaluate Outset separately -- it is a different product category (managed research platform) rather than a building block to embed in TeamHQ.
