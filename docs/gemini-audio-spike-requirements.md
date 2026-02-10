# Gemini 2.5 Flash Audio API — Technical Spike Requirements

**Author:** Thomas (Product Manager)
**Date:** February 9, 2026
**Status:** Active
**Priority:** High
**Owner:** Marco (Technical Researcher)
**Source:** Custom Meeting #3 — Action Item for Marco

---

## 1. Context

In Custom Meeting #3 (product brainstorming session), the team identified an Audio Ad Stripper as one of three monetizable product ideas. The concept: upload a podcast MP3, use Gemini 2.5 Flash to identify ad/sponsor segments by understanding audio content semantically, then use ffmpeg to cut those segments out.

Marco flagged the core technical risk during the meeting:

> "I'd want to do a half-day spike on the Gemini audio API before we commit to the ad stripper. I'm confident it works from the docs, but I want to test segment boundary accuracy on real podcast audio with sponsor reads. If the timestamps are off by more than a second, the user experience degrades fast."

This spike de-risks the central assumption behind the Ad Stripper product: that Gemini 2.5 Flash can accurately identify and timestamp ad/sponsor segments in podcast audio.

**Important context:** Marco already evaluated the Gemini Live API for the AI Interviews feature (see `docs/ai-interviews-gemini-evaluation.md`). That evaluation covered real-time audio streaming via WebSocket. This spike is different — it focuses on **batch audio analysis** (uploading a complete audio file and asking Gemini to analyze its contents), not real-time streaming. The APIs and use cases are distinct.

---

## 2. Technical Question

**Can Gemini 2.5 Flash accurately identify ad/sponsor read segments in podcast audio, with timestamp precision within +/- 2 seconds of the actual segment boundary?**

Sub-questions:
- What output format does Gemini return for audio segment analysis? (timestamps, confidence, segment labels?)
- How consistent is the detection across different ad formats (host-read, pre-recorded, dynamically inserted)?
- What are the failure modes? (false positives on non-ad content, missed ads, split segments)
- What's the API cost per file for a typical 30-60 minute podcast episode?
- How long does processing take? (latency for user experience planning)

---

## 3. Deliverable

A technical spike report documenting real test results. Not a literature review — actual API calls against real audio.

**Output file:** `docs/gemini-audio-spike-results.md`

---

## 4. Test Methodology

### A. Test Audio (3-4 episodes required)

Select 3-4 real podcast episodes that include sponsor reads. Choose episodes that cover different ad patterns:

| Episode # | What to test | Selection criteria |
|-----------|-------------|-------------------|
| 1 | **Host-read sponsor ad** | Popular podcast where the host reads the sponsor copy in their own voice — hardest to detect because it sounds like regular content |
| 2 | **Pre-recorded/produced ad** | Episode with a clearly produced ad insert — different audio quality, music bed, different voice |
| 3 | **Multiple ad breaks** | Episode with 2-3 separate ad breaks (pre-roll, mid-roll, post-roll) — tests detection of multiple segments |
| 4 (optional) | **Dynamic ad insertion** | Episode where ads are dynamically inserted (often detectable by audio quality shift) — tests a common podcast ad delivery method |

For each episode, Marco should:
1. Listen and manually note the actual ad start/end timestamps (ground truth)
2. Run the episode through Gemini 2.5 Flash
3. Compare Gemini's detected timestamps against the ground truth

### B. Metrics to Report (Required for each episode)

| Metric | Definition |
|--------|-----------|
| **Detection accuracy** | Did Gemini correctly identify each ad segment? (true positive rate) |
| **Boundary precision** | How close are Gemini's timestamps to the actual start/end of each ad? Report in seconds of offset. |
| **False positives** | Did Gemini flag non-ad content as ads? What kind of content was misidentified? |
| **False negatives** | Did Gemini miss any ads? What type of ad was missed? |
| **Processing time** | Wall clock time from API call to response for each episode |
| **API cost** | Actual cost per episode (token count x price per token, or audio minutes x price per minute) |
| **Output format** | Exact JSON/text shape Gemini returns — include a raw example |

### C. Prompt Engineering (Explore variations)

Test at least 2 different prompt approaches:
1. **Simple direct prompt** — "Identify all advertisement and sponsor segments in this audio file. Return timestamps."
2. **Structured prompt** — More detailed instructions specifying what counts as an ad (sponsor reads, promotional segments, calls-to-action), requesting a specific output format (JSON with start_time, end_time, confidence, segment_type, description)

Document which prompt produces better results and why.

### D. Edge Cases to Investigate

- **Host-read ads that blend into content** — the host transitions seamlessly from content to sponsor read without a clear break
- **Ads at the very start or very end** of the episode (boundary detection at file edges)
- **Short ads** (< 30 seconds) vs **long sponsor reads** (> 2 minutes)
- **Non-English content** — if easily available, test one non-English episode; otherwise, note this as untested
- **Audio quality variation** — does a low-bitrate MP3 affect detection accuracy vs high quality?

---

## 5. Go/No-Go Criteria

Based on the spike results, Marco should provide a clear recommendation:

| Result | Recommendation |
|--------|---------------|
| **Go** | Boundary precision consistently within +/- 2 seconds, detection rate > 80% across test episodes, false positive rate < 10% |
| **Conditional Go** | Accuracy is workable but needs prompt tuning, or works well for some ad types but not others — specify what needs more work |
| **No-Go** | Timestamps are unreliable (> 5 second offset), detection misses most ads, or API costs are prohibitive (> $0.50 per episode) |

The +/- 2 second threshold comes from user experience: if we cut an ad and the edit sounds jarring (clipping a word, leaving a dangling "and now back to..."), the product feels broken. If we can get within 2 seconds, we can pad the cuts and use ffmpeg's silence-detection to find clean splice points.

---

## 6. What This Is NOT

- **Not a product build.** No ffmpeg integration, no UI, no API endpoints. Just Gemini API testing.
- **Not an architecture doc.** Andrei designs the system later if we greenlight the product.
- **Not a competitive analysis.** Suki handles the market research separately.
- **Not a Gemini Live API evaluation.** Marco already did that for AI Interviews. This is about batch audio analysis, not real-time streaming.

---

## 7. Acceptance Criteria

- [ ] 3-4 real podcast episodes tested with manually verified ground truth timestamps
- [ ] Detection accuracy and boundary precision reported per episode in a summary table
- [ ] At least 2 prompt approaches tested and compared
- [ ] Edge cases documented (at minimum: host-read ads, multiple ad breaks, ads at episode boundaries)
- [ ] Raw Gemini API output included for at least one episode (so the team can see the actual format)
- [ ] Processing time and API cost per episode reported
- [ ] Go/No-Go recommendation included with clear rationale tied to the criteria above
- [ ] All findings in `docs/gemini-audio-spike-results.md`
- [ ] Task file updated at `data/tasks/gemini-audio-spike.json`

---

## 8. Reference Docs

Marco should read these before starting:
- `data/meetings/d9b62321-703f-4ff6-a7c3-6564c62a0e2b.json` — Custom Meeting #3 transcript (the brainstorm where this spike was proposed, includes Marco's own comments on the risk)
- `docs/ai-interviews-gemini-evaluation.md` — Marco's earlier Gemini evaluation (for context on what's already known, though that focused on the Live API, not batch audio)
- `skills/research/technical-evaluation.md` — Technical evaluation methodology reference

---

## 9. Pipeline

This is a technical spike, not a software build. The pipeline is:

1. **Thomas (PM)** — Scopes requirements (this document) -- DONE
2. **Marco (Technical Researcher)** — Executes the spike, produces results doc
3. **No further pipeline steps needed** — No architecture, no design, no implementation, no QA

Marco is the sole executor. Results feed into the CEO's decision on whether to greenlight the Audio Ad Stripper product.

---

## 10. Timeline

Half-day spike. High priority — this research directly informs which product the team builds next.
