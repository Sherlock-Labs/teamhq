# Revenue Model Spreadsheet Requirements

**Author:** Thomas (Product Manager)
**Date:** February 9, 2026
**Status:** Complete
**Priority:** Low
**Owner:** Yuki (Data Analyst)
**Source:** Custom Meeting #3 — Action Item for Yuki

---

## 1. Context

In Custom Meeting #3 (brainstorming session), the team identified three small, monetizable product ideas:

1. **Audio Ad Stripper** — Uses Gemini 2.5 Flash for audio understanding + ffmpeg for segment removal. Positioned as a creator tool (podcast producers, audiobook editors, webinar repurposers). Standalone product.
2. **Smart PDF Redactor** — AI-powered sensitive information detection using Gemini Flash with vision. Extends the existing SherlockPDF infrastructure (Stripe billing, file handling, deployment already in place). New feature on existing product, not standalone.
3. **Podcast Show Notes Generator** — Uses Gemini Flash to process audio and produce structured show notes (summary, timestamps, key topics, guest bios, mentioned links). Standalone product targeting indie podcasters.

Key meeting context:
- The team agreed on per-use/per-file pricing over subscriptions for single-purpose tools (lower barrier, better for v1).
- Yuki noted 95%+ margins on per-file pricing given low API costs.
- Andrei estimated build effort: Show Notes (2-3 days), Ad Stripper (3-4 days), PDF Redaction (5-7 days, but leverages existing SherlockPDF infrastructure).
- Success threshold: 10 paying users in the first 2 weeks per product.

This revenue model will help the CEO decide which product to greenlight first and in what order to build them.

---

## 2. Deliverable

A structured revenue model document (Markdown with tables) covering all three product ideas. This is an analytical deliverable, not software.

**Output file:** `docs/revenue-model-analysis.md`

---

## 3. What the Model Should Include

### Per Product (all three):

#### A. Cost Structure
- **API costs:** Gemini 2.5 Flash per-request cost for the product's use case. Be specific — estimate input/output token counts or audio minutes per typical use. Reference Marco's note that a 30-minute podcast costs ~2-3 cents in API.
- **Infrastructure costs:** Hosting, compute, storage (if any). Note that SherlockPDF already has infrastructure for the redactor.
- **Stripe fees:** 2.9% + $0.30 per transaction (standard Stripe pricing the team has already adopted).
- **Cost per unit served:** Total cost to process one file/request for each product.

#### B. Pricing Tiers
- Propose 2-3 pricing options per product (e.g., per-file, small bundle, monthly pass).
- Reference the meeting consensus: per-use pricing for v1, not subscriptions.
- Include rationale for each price point — anchor against competitors where relevant (Suki noted Castmagic/Podium at $20+/month; legal redaction tools at $20-30/month).

#### C. Unit Economics
- **Gross margin per transaction** at each price point.
- **Contribution margin** after Stripe fees.
- **Break-even volume:** How many paid transactions per month to cover fixed costs (hosting, domain, etc.).

#### D. Revenue Projections (30/60/90 days)
Use **conservative** adoption assumptions. This is a small indie team with no marketing budget and no existing distribution beyond the SherlockPDF user base and organic/social traffic.

Conservative assumptions to use:
- **30 days:** 5-15 paying users, mostly from organic/social discovery
- **60 days:** 15-40 paying users, word of mouth starting
- **90 days:** 30-80 paying users, some SEO traction

For each time horizon, show:
- Projected paying users (low / mid / high scenario)
- Projected revenue per scenario
- Projected costs per scenario
- Projected profit per scenario

#### E. Comparison Table
A single summary table ranking all three products across:
- Revenue potential (30/60/90 day)
- Build cost (days of team effort, from Andrei's estimates)
- Time to break-even
- Existing infrastructure advantage
- Market validation strength
- Recommended build order

---

## 4. Assumptions to Document

Yuki should explicitly state all assumptions so the CEO can evaluate them:

- API pricing (reference Gemini 2.5 Flash published rates as of Feb 2026)
- Infrastructure costs (reference existing Railway/hosting costs if known, or estimate)
- Traffic/conversion assumptions and where they come from
- Competitive pricing data sources
- Any assumptions about the SherlockPDF existing user base as a distribution channel for the redactor

---

## 5. What This Is NOT

- **Not a business plan.** Keep it focused on unit economics and short-term projections.
- **Not a market research report.** Suki already did competitive research. Reference her findings but don't duplicate them.
- **Not a recommendation doc.** Present the data clearly. The comparison table will make the build-order recommendation obvious, but the CEO makes the call.
- **Not software.** No code, no app, no database. Markdown with tables.

---

## 6. Acceptance Criteria

- [ ] All three products are modeled with the same structure (cost, pricing, unit economics, projections)
- [ ] API costs reference specific Gemini 2.5 Flash pricing (per-token or per-request)
- [ ] Stripe fees are included in all margin calculations
- [ ] 30/60/90 day projections use conservative adoption rates with low/mid/high scenarios
- [ ] Break-even volume is calculated for each product
- [ ] A single comparison table ranks all three products on the dimensions listed above
- [ ] All assumptions are explicitly documented
- [ ] The output is a clean, well-formatted Markdown document at `docs/revenue-model-analysis.md`
- [ ] The document is useful to a CEO making a build-order decision — no fluff, just numbers and clear framing

---

## 7. Reference Docs

Yuki should read these before starting:
- `data/meetings/d9b62321-703f-4ff6-a7c3-6564c62a0e2b.json` — Custom Meeting #3 transcript (the brainstorm session with all product details, cost estimates, and pricing discussions)
- `docs/monetization-strategy-requirements.md` — SherlockPDF monetization strategy (for context on existing Stripe setup and pricing philosophy)
- `docs/payments-platform-research.md` — Suki's payments platform research (Stripe fees, competitive landscape)
- `docs/sherlockpdf-tech-approach.md` — Andrei's SherlockPDF architecture (for understanding what the redactor would build on)

---

## 8. Pipeline

This is an analytical project, not a software build. The pipeline is:

1. **Thomas (PM)** — Scopes requirements (this document) -- DONE
2. **Yuki (Data Analyst)** — Produces the revenue model analysis
3. **No further pipeline steps needed** — No architecture, no design, no implementation, no QA

Yuki is the sole executor. No other agents are needed unless Yuki identifies a gap that requires input (e.g., needs Marco to validate API pricing, needs Suki for additional competitive data).

---

## 9. Timeline

Low priority. Yuki should complete this when bandwidth allows. No hard deadline, but sooner is better — the CEO is deciding build order for the next product and this analysis informs that decision.
