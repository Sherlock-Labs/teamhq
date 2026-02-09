# Podcast Show Notes Tool — Competitive Scan Requirements

**Author:** Thomas (Product Manager)
**Date:** February 9, 2026
**Status:** Complete
**Priority:** High
**Owner:** Suki (Product Researcher)
**Source:** Custom Meeting #3 — Action Item for Suki

---

## 1. Context

In Custom Meeting #3 (brainstorming session), the team identified the Podcast Show Notes Generator as one of three monetizable product ideas worth pursuing. The concept: upload a podcast audio file, AI generates structured show notes (summary, timestamps, key topics, guest bios, mentioned links). Target audience is indie podcasters who hate writing show notes but need them for SEO and discoverability.

Key signals from the meeting:
- Suki noted existing tools (Castmagic, Podium) are $20+/month subscriptions targeting professional podcasters — there's a gap for simpler, cheaper, pay-per-episode pricing aimed at indie creators.
- Andrei estimated 2-3 day build time — simplest architecture of the three product ideas.
- Yuki projected strong unit economics: $2/episode pricing at 500 users = $4K/month with incredible margins.
- The team agreed per-use pricing (not subscriptions) fits this tool best for v1.

Before we commit engineering time to this product, we need Suki to validate the competitive landscape. This research informs whether we greenlight the build and how we position it.

---

## 2. Research Question

**Is there a viable gap in the podcast show notes tool market for a simple, pay-per-episode indie-focused tool — and if so, what features and pricing would win?**

---

## 3. Deliverable

A focused competitive scan document. This is research, not a build project.

**Output file:** `docs/podcast-notes-research.md`

---

## 4. What to Research

### A. Top 5 Competitors (Required)

Identify the 5 most relevant competitors in the podcast show notes / podcast AI assistant space. For each, document:

| Dimension | What to capture |
|-----------|----------------|
| **Product name & URL** | Primary website |
| **Pricing model** | Free tier? Per-episode? Monthly subscription? Annual? |
| **Price points** | Specific dollar amounts at each tier |
| **Target audience** | Indie podcasters? Studios? Enterprise? |
| **Core features** | What do they generate? (summaries, timestamps, transcripts, social clips, blog posts, etc.) |
| **Input method** | Audio upload? RSS feed? YouTube URL? Recording built-in? |
| **Output format** | Markdown? HTML? Copy-paste? CMS integrations? |
| **AI model used** | If publicly disclosed |
| **Limitations** | Episode length limits, file size caps, monthly quotas |

Present this as a comparison table, not paragraphs.

### B. Pricing Landscape (Required)

Summarize the pricing patterns across the market:
- What's the lowest price point available?
- What's the modal (most common) pricing model?
- Is anyone doing pay-per-episode? If not, why might that be?
- What does the free tier typically include (if any)?
- Where's the price sensitivity — what would make an indie podcaster switch tools?

### C. Feature Gaps (Required)

Identify 3-5 specific gaps that an indie-focused, pay-per-episode tool could exploit. Be concrete. Don't just say "cheaper pricing" — describe the specific unmet need and who has it.

Think about:
- Features that only exist in expensive tiers
- Workflows that are overengineered for indie creators
- Output formats that indie podcasters actually need vs. what tools currently produce
- Integrations or export options that are missing

### D. Go/No-Go Recommendation (Required)

Based on the research, give a clear recommendation:
- **Go:** There's a viable gap, here's why and what to build.
- **No-Go:** The market is too crowded or the gap is too small, here's why.
- **Conditional:** Worth pursuing if [specific condition], risky if [specific condition].

One paragraph, not an essay. Be opinionated.

---

## 5. What This Is NOT

- **Not an exhaustive market report.** Five competitors, not fifteen. We need enough to act on, not a landscape review.
- **Not a product spec.** Don't design the tool — just identify what the market is missing.
- **Not a revenue model.** Yuki already built one (see `docs/revenue-model-analysis.md`). Reference her numbers if relevant, don't recreate them.
- **Not a technical evaluation.** Marco handles tech feasibility. Stay in the market/competitive lane.

---

## 6. Acceptance Criteria

- [ ] Top 5 competitors identified with pricing, features, and target audience in a comparison table
- [ ] Pricing landscape summarized with clear patterns and gaps
- [ ] 3-5 specific, actionable feature gaps identified (not generic "be cheaper")
- [ ] Go/No-Go recommendation included with clear rationale
- [ ] All findings sourced with URLs and access dates
- [ ] Uncertainties and limitations flagged explicitly
- [ ] Output written to `docs/podcast-notes-research.md`
- [ ] Task file updated at `data/tasks/podcast-notes-research.json`
- [ ] Document is useful to a CEO making a build decision — no fluff, just findings and a clear recommendation

---

## 7. Reference Docs

Suki should read these before starting:
- `data/meetings/d9b62321-703f-4ff6-a7c3-6564c62a0e2b.json` — Custom Meeting #3 transcript (the brainstorm session where this idea was proposed, includes Suki's own initial observations)
- `docs/revenue-model-analysis.md` — Yuki's revenue model covering this product (for context on pricing assumptions and unit economics already modeled)
- `skills/research/competitive-analysis.md` — Competitive analysis methodology reference

---

## 8. Pipeline

This is a research project, not a software build. The pipeline is:

1. **Thomas (PM)** — Scopes requirements (this document) -- DONE
2. **Suki (Product Researcher)** — Produces the competitive scan
3. **No further pipeline steps needed** — No architecture, no design, no implementation, no QA

Suki is the sole executor. No other agents are needed unless she identifies a gap that requires input (e.g., needs Marco to validate a technical claim about a competitor).

---

## 9. Timeline

High priority. This research directly informs the CEO's decision on which product to greenlight next. Suki should complete this promptly.
