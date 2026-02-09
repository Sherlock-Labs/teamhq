# Revenue Model Analysis: Three Product Candidates

**Author:** Yuki (Data Analyst)
**Date:** February 9, 2026
**Status:** Complete
**Source:** Custom Meeting #3 action item; Thomas's requirements (`docs/revenue-model-requirements.md`)

---

## Methodology

This analysis models three product ideas from Custom Meeting #3 across identical dimensions: cost structure, pricing tiers, unit economics, and 30/60/90-day revenue projections. All models use conservative adoption assumptions appropriate for a small indie team with no marketing budget and limited existing distribution.

**Data sources:**
- Gemini 2.5 Flash API pricing from Google's published rates (ai.google.dev, Feb 2026)
- Custom Meeting #3 transcript (build estimates from Andrei, market signals from Suki, API cost estimates from Marco)
- SherlockPDF tech approach (`docs/sherlockpdf-tech-approach.md`) for infrastructure baseline
- Payments platform research (`docs/payments-platform-research.md`) for Stripe fee structure
- SherlockPDF monetization strategy (`docs/monetization-strategy-requirements.md`) for pricing philosophy context

**Limitations:**
- No validated conversion rate data exists. Adoption assumptions are estimates based on comparable indie tool launches.
- API cost estimates use published list pricing. Actual costs may vary with caching, prompt engineering, and batch mode usage.
- Competitive pricing data is from Suki's meeting comments. A full competitive analysis was not conducted for this document.

---

## Gemini 2.5 Flash API Pricing (Feb 2026)

All three products use Gemini 2.5 Flash. Published rates as of February 2026:

| Input Type | Price per 1M Tokens |
|---|---|
| Text / Image / Video input | $0.30 |
| Audio input | $1.00 |
| Output (incl. thinking) | $2.50 |
| Context caching (text/image) | $0.03 |
| Context caching (audio) | $0.10 |

Batch mode (non-interactive) offers 50% reduction: $0.15 input (text/image), $0.50 audio input, $1.25 output.

Source: [Google Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)

---

## Product 1: Audio Ad Stripper

### Use Case
Upload a podcast/audio file. Gemini 2.5 Flash identifies ad/sponsor segments semantically. ffmpeg removes them. User downloads a clean file.

**Target customer:** Podcast producers, audiobook editors, webinar repurposers (creator tool, not consumer).

### A. Cost Structure

**API cost per file (typical: 30-minute podcast episode):**

| Component | Estimate | Cost |
|---|---|---|
| Audio input (~30 min, ~480K audio tokens) | 0.48M tokens @ $1.00/1M | $0.48 |
| Text output (timestamps, segment labels, ~2K tokens) | 0.002M tokens @ $2.50/1M | $0.005 |
| **Total API cost per file** | | **~$0.49** |

Note: Marco estimated 2-3 cents in the meeting, but that appears to reference an earlier or free-tier estimate. At published audio input rates ($1.00/1M tokens), a 30-minute file costs closer to $0.49. For shorter files (10 minutes), cost drops to ~$0.16. Batch mode would halve audio input cost to $0.50/1M, reducing the 30-min cost to ~$0.25.

**Assumption:** Average file is 20 minutes. Average API cost per file: **~$0.33** (standard mode), **~$0.17** (batch mode).

I will use **$0.25** as the blended average API cost per file, assuming a mix of file lengths and potential batch mode usage.

**Infrastructure costs:**

| Item | Monthly Cost |
|---|---|
| Railway server (Express + ffmpeg processing) | $5-10/month |
| Cloudflare Pages (static frontend) | $0 (free tier) |
| Domain (subdomain of sherlocklabs.ai) | $0 (already owned) |
| **Total fixed infrastructure** | **~$10/month** |

Note: ffmpeg processing runs server-side (unlike SherlockPDF's client-side PDF ops). This means file uploads hit the server, increasing Railway compute. At low volumes ($5 Hobby plan suffices), but at scale may need $10-20/month.

**Stripe fees:** 2.9% + $0.30 per transaction.

**Cost per unit served:**

| Component | Per File |
|---|---|
| Gemini API | $0.25 |
| Stripe fee (on a $3.99 charge) | $0.42 |
| Infrastructure (amortized at 100 files/month) | $0.10 |
| **Total cost per file** | **~$0.77** |

### B. Pricing Tiers

| Tier | Price | Rationale |
|---|---|---|
| **Per-file** | $3.99 | Low barrier, impulse-buy territory. Competitive vs. manual editing time (15-30 min saved). Suki confirmed creator willingness to pay $5-10/file. |
| **5-pack bundle** | $14.99 ($3.00/file) | 25% discount incentivizes batch buying. Weekly podcasters process 4-5 episodes at a time. |
| **20-pack bundle** | $49.99 ($2.50/file) | 37% discount for power users. Monthly podcasters releasing daily or processing backlogs. |

Per-use pricing aligns with meeting consensus: no subscriptions for v1 single-purpose tools.

**Competitive context:** No direct per-file competitor exists at this price point. Podcast editing services charge $50-200/episode. AI-assisted editing tools (Descript, etc.) are $24+/month subscriptions. A $3.99 one-off for ad removal is a different category entirely.

### C. Unit Economics

| Metric | Per-File ($3.99) | 5-Pack ($14.99) | 20-Pack ($49.99) |
|---|---|---|---|
| Revenue per unit | $3.99 | $14.99 | $49.99 |
| API cost | $0.25 | $1.25 | $5.00 |
| Stripe fee | $0.42 | $0.73 | $1.75 |
| Infrastructure (amortized) | $0.10 | $0.50 | $2.00 |
| **Gross profit** | **$3.22** | **$12.51** | **$41.24** |
| **Gross margin** | **80.7%** | **83.5%** | **82.5%** |
| **Contribution margin (after Stripe)** | **88.4%** | **91.1%** | **90.3%** |

Contribution margin (before Stripe) is calculated as (Revenue - API cost - Infrastructure) / Revenue.

**Break-even volume:**
- Fixed costs: ~$10/month infrastructure
- At $3.22 gross profit per file: **4 paid files/month** to break even on fixed costs
- Practically zero break-even threshold. This product is profitable from the first sale.

### D. Revenue Projections (30/60/90 Days)

**Assumptions:**
- Mix: 60% per-file, 25% 5-packs, 15% 20-packs
- Weighted average revenue per paying user per month: ~$8.50 (assuming 1 transaction/month average)
- Weighted average cost per paying user per month: ~$1.50

| Horizon | Scenario | Paying Users | Revenue | Costs (API + Stripe + Infra) | Profit |
|---|---|---|---|---|---|
| **30 days** | Low | 5 | $42 | $18 | $25 |
| | Mid | 10 | $85 | $25 | $60 |
| | High | 15 | $128 | $33 | $95 |
| **60 days** | Low | 15 | $128 | $33 | $95 |
| | Mid | 28 | $238 | $52 | $186 |
| | High | 40 | $340 | $70 | $270 |
| **90 days** | Low | 30 | $255 | $55 | $200 |
| | Mid | 55 | $468 | $93 | $375 |
| | High | 80 | $680 | $130 | $550 |

---

## Product 2: Smart PDF Redactor

### Use Case
Upload a PDF. Gemini 2.5 Flash with vision identifies sensitive information (SSNs, emails, phone numbers, financial data, names in context). User reviews and confirms redactions. Download redacted PDF.

**Target customer:** Lawyers, HR departments, healthcare organizations, anyone handling sensitive documents.

**Key advantage:** Extends SherlockPDF. Stripe billing, file handling, deployment, and user base already exist.

### A. Cost Structure

**API cost per file (typical: 10-page document):**

| Component | Estimate | Cost |
|---|---|---|
| Image input (10 pages as images, ~2,500 tokens/page = 25K tokens) | 0.025M tokens @ $0.30/1M | $0.008 |
| Text output (bounding boxes + labels, ~3K tokens) | 0.003M tokens @ $2.50/1M | $0.008 |
| **Total API cost per file** | | **~$0.02** |

For a 50-page document: ~$0.08. For a 100-page document: ~$0.15.

**Assumption:** Average document is 15 pages. Average API cost per file: **~$0.02**.

Vision/image input is dramatically cheaper than audio input. This is the most favorable cost profile of the three products.

**Infrastructure costs:**

| Item | Monthly Cost |
|---|---|
| SherlockPDF Railway server (already running) | $0 incremental (shared with existing SherlockPDF) |
| Cloudflare Pages (already deployed) | $0 |
| Additional compute for PDF-to-image conversion | ~$2-5/month at low volume |
| **Total incremental infrastructure** | **~$3/month** |

The redactor piggybacks on SherlockPDF's existing $5/month Railway instance. Marginal infrastructure cost is near zero.

**Stripe fees:** 2.9% + $0.30 per transaction (already configured).

**Cost per unit served:**

| Component | Per File |
|---|---|
| Gemini API | $0.02 |
| Stripe fee (on a $2.99 charge) | $0.39 |
| Infrastructure (amortized, incremental) | $0.03 |
| **Total cost per file** | **~$0.44** |

### B. Pricing Tiers

| Tier | Price | Rationale |
|---|---|---|
| **Per-file** | $2.99 | Lower than Ad Stripper because API costs are lower and this is an add-on to an existing product, not standalone. Still excellent margin. Undercuts legal tech tools charging $20-30/month. |
| **10-pack bundle** | $19.99 ($2.00/file) | 33% discount. Legal professionals processing case files batch 5-15 documents. |
| **50-pack bundle** | $74.99 ($1.50/file) | 50% discount for high-volume users (HR departments, compliance teams). |

**Alternative consideration:** This could also be offered as a SherlockPDF Pro add-on (existing $9/month subscribers get N free redactions). For v1, per-file pricing keeps it simple and doesn't require modifying the existing subscription logic.

**Competitive context:** Suki noted legal redaction tools charge $20-30/month. Adobe Acrobat Pro (includes redaction) is $23/month. Our per-file model is dramatically cheaper for occasional users and competitive for regular users at the 10-pack level.

### C. Unit Economics

| Metric | Per-File ($2.99) | 10-Pack ($19.99) | 50-Pack ($74.99) |
|---|---|---|---|
| Revenue per unit | $2.99 | $19.99 | $74.99 |
| API cost | $0.02 | $0.20 | $1.00 |
| Stripe fee | $0.39 | $0.88 | $2.47 |
| Infrastructure (amortized) | $0.03 | $0.30 | $1.50 |
| **Gross profit** | **$2.55** | **$18.61** | **$70.02** |
| **Gross margin** | **85.3%** | **93.1%** | **93.4%** |
| **Contribution margin (after Stripe)** | **98.3%** | **97.5%** | **96.7%** |

The near-zero API cost makes this the highest-margin product of the three.

**Break-even volume:**
- Incremental fixed costs: ~$3/month
- At $2.55 gross profit per file: **2 paid files/month** to break even
- Essentially profitable from the first transaction.

### D. Revenue Projections (30/60/90 Days)

**Assumptions:**
- Mix: 50% per-file, 35% 10-packs, 15% 50-packs
- Weighted average revenue per paying user per month: ~$12.00 (legal/compliance users tend to buy packs)
- Weighted average cost per paying user per month: ~$1.00
- **Distribution advantage:** SherlockPDF has an existing user base. Redaction can be surfaced to current free and Pro users. This makes the 30-day adoption assumption slightly more optimistic than fully standalone products.

| Horizon | Scenario | Paying Users | Revenue | Costs (API + Stripe + Infra) | Profit |
|---|---|---|---|---|---|
| **30 days** | Low | 8 | $96 | $11 | $85 |
| | Mid | 15 | $180 | $18 | $162 |
| | High | 22 | $264 | $25 | $239 |
| **60 days** | Low | 20 | $240 | $23 | $217 |
| | Mid | 35 | $420 | $38 | $382 |
| | High | 50 | $600 | $53 | $547 |
| **90 days** | Low | 35 | $420 | $38 | $382 |
| | Mid | 60 | $720 | $63 | $657 |
| | High | 90 | $1,080 | $93 | $987 |

Note: Higher user counts vs. Ad Stripper and Show Notes reflect the SherlockPDF distribution advantage. Existing users seeing a "Redact" tool in the toolbar is a zero-cost acquisition channel.

---

## Product 3: Podcast Show Notes Generator

### Use Case
Upload a podcast episode (or paste RSS feed URL). Gemini 2.5 Flash processes audio and generates structured show notes: summary, timestamps, key topics, guest bios, mentioned links. Output is markdown the podcaster pastes into their hosting platform.

**Target customer:** Indie podcasters who release weekly/biweekly and skip show notes because they're tedious.

### A. Cost Structure

**API cost per file (typical: 45-minute podcast episode):**

| Component | Estimate | Cost |
|---|---|---|
| Audio input (~45 min, ~720K audio tokens) | 0.72M tokens @ $1.00/1M | $0.72 |
| Text output (show notes, ~4K tokens) | 0.004M tokens @ $2.50/1M | $0.01 |
| Second pass for link resolution (~1K input + 1K output) | Negligible | $0.003 |
| **Total API cost per file** | | **~$0.73** |

For a 30-minute episode: ~$0.49. For a 60-minute episode: ~$0.97. Batch mode would reduce audio input cost by 50%.

**Assumption:** Average episode is 40 minutes. Average API cost per file: **~$0.65** (standard), **~$0.35** (batch mode). Using **$0.45** as blended average.

Show Notes has the highest per-file API cost of the three products because podcast episodes tend to be longer than the audio segments processed by the Ad Stripper (which only needs to identify segments, not transcribe the full episode for content extraction).

**Infrastructure costs:**

| Item | Monthly Cost |
|---|---|
| Railway server (Express backend) | $5-10/month |
| Cloudflare Pages (static frontend) | $0 |
| Domain | $0 (subdomain) |
| **Total fixed infrastructure** | **~$8/month** |

Simpler than the Ad Stripper (no ffmpeg processing, just API calls and text output).

**Stripe fees:** 2.9% + $0.30 per transaction.

**Cost per unit served:**

| Component | Per File |
|---|---|
| Gemini API | $0.45 |
| Stripe fee (on a $2.49 charge) | $0.37 |
| Infrastructure (amortized at 100 files/month) | $0.08 |
| **Total cost per file** | **~$0.90** |

### B. Pricing Tiers

| Tier | Price | Rationale |
|---|---|---|
| **Per-episode** | $2.49 | Must be cheaper than competitors ($20+/month subs). At $2.49/episode, a weekly podcaster pays ~$10/month -- half the price of Castmagic. Impulse-buy range for indie creators. |
| **5-episode pack** | $9.99 ($2.00/ep) | 20% discount. Covers a month of weekly episodes + one bonus. |
| **20-episode pack** | $29.99 ($1.50/ep) | 40% discount. For podcasters committing to a quarter. Competitive with monthly subscriptions elsewhere. |

**Competitive context:** Suki flagged Castmagic and Podium at $20+/month. Our per-episode model is cheaper for anyone publishing fewer than ~8 episodes/month. The gap in the market is indie creators who can't justify $20/month for a tool they use 4 times.

### C. Unit Economics

| Metric | Per-Episode ($2.49) | 5-Pack ($9.99) | 20-Pack ($29.99) |
|---|---|---|---|
| Revenue per unit | $2.49 | $9.99 | $29.99 |
| API cost | $0.45 | $2.25 | $9.00 |
| Stripe fee | $0.37 | $0.59 | $1.17 |
| Infrastructure (amortized) | $0.08 | $0.40 | $1.60 |
| **Gross profit** | **$1.59** | **$6.75** | **$18.22** |
| **Gross margin** | **63.9%** | **67.6%** | **60.8%** |
| **Contribution margin (after Stripe)** | **78.7%** | **73.4%** | **66.2%** |

Margins are lower than the other two products due to higher audio API costs. Still healthy, but noticeably compressed compared to the PDF Redactor (93%) and Ad Stripper (83%).

**Break-even volume:**
- Fixed costs: ~$8/month
- At $1.59 gross profit per episode: **6 paid episodes/month** to break even
- Low threshold, but higher than the other two products.

### D. Revenue Projections (30/60/90 Days)

**Assumptions:**
- Mix: 55% per-episode, 30% 5-packs, 15% 20-packs
- Weighted average revenue per paying user per month: ~$7.00 (indie podcasters are price-sensitive)
- Weighted average cost per paying user per month: ~$2.50
- Easiest product to build (Andrei: 2-3 days), so potentially first to market

| Horizon | Scenario | Paying Users | Revenue | Costs (API + Stripe + Infra) | Profit |
|---|---|---|---|---|---|
| **30 days** | Low | 5 | $35 | $21 | $14 |
| | Mid | 10 | $70 | $33 | $37 |
| | High | 15 | $105 | $46 | $59 |
| **60 days** | Low | 15 | $105 | $46 | $59 |
| | Mid | 28 | $196 | $78 | $118 |
| | High | 40 | $280 | $108 | $172 |
| **90 days** | Low | 30 | $210 | $83 | $127 |
| | Mid | 55 | $385 | $146 | $239 |
| | High | 80 | $560 | $208 | $352 |

---

## Assumptions Register

All assumptions used in this analysis, documented explicitly per Thomas's requirements.

| # | Assumption | Basis | Risk if Wrong |
|---|---|---|---|
| 1 | Gemini 2.5 Flash audio input: $1.00/1M tokens | Google published pricing, Feb 2026 | If prices drop (common with AI APIs), margins improve. If prices rise, Ad Stripper and Show Notes margins compress. |
| 2 | Gemini 2.5 Flash image input: $0.30/1M tokens | Google published pricing, Feb 2026 | Low risk. Vision pricing is already very cheap. |
| 3 | Average podcast file: 20 min (Ad Stripper), 40 min (Show Notes) | Industry average podcast length ~35-45 min. Ad Stripper processes shorter segments. | Longer files increase API costs linearly. |
| 4 | Average PDF: 15 pages | Typical legal/business document length. | Longer documents increase cost but still negligible ($0.15 for 100 pages). |
| 5 | Stripe fees: 2.9% + $0.30 | Standard Stripe US card rate, already in use for SherlockPDF. | No risk. This is a contractual rate. |
| 6 | Railway hosting: $5-10/month | Current SherlockPDF deployment cost per Andrei's tech approach. | Low risk at low volume. May increase to $15-20 if processing is CPU-intensive. |
| 7 | 30-day paying users: 5-15 | Conservative for indie products with no paid marketing. Based on organic/social discovery. | Could be lower if product has no viral hook. Could be higher if Product Hunt or Twitter traction. |
| 8 | 60-day paying users: 15-40 | Word of mouth starting. Assumes some repeat purchases. | Dependent on product quality and retention. |
| 9 | 90-day paying users: 30-80 | Some SEO traction. Assumes product-market fit signal. | SEO timelines are unpredictable. Could take 6+ months. |
| 10 | SherlockPDF existing user base provides distribution for Redactor | Redactor is surfaced within an existing product with active users. | If SherlockPDF user base is very small, this advantage is muted. |
| 11 | Per-use pricing converts better than subscriptions for these products | Meeting consensus. Suki's input on churn risk for single-purpose subscriptions. | If users prefer flat monthly pricing, conversion could be lower. |
| 12 | No marketing budget | Team has no paid acquisition channel. All growth is organic, social, SEO. | Paid marketing (even small spend) could accelerate all projections significantly. |

---

## Comparison Table

| Dimension | Audio Ad Stripper | Smart PDF Redactor | Podcast Show Notes |
|---|---|---|---|
| **API cost per file** | ~$0.25 | ~$0.02 | ~$0.45 |
| **Gross margin (per-file tier)** | 80.7% | 85.3% | 63.9% |
| **Gross margin (bundle tier avg)** | 83.0% | 93.3% | 64.2% |
| **Break-even volume** | 4 files/month | 2 files/month | 6 files/month |
| **Build effort (Andrei est.)** | 3-4 days | 5-7 days | 2-3 days |
| **90-day revenue (mid scenario)** | $468 | $720 | $385 |
| **90-day profit (mid scenario)** | $375 | $657 | $239 |
| **Existing infrastructure** | None (new standalone) | Full (SherlockPDF stack) | None (new standalone) |
| **Time to first revenue** | Build time + launch | Build time + launch (faster: existing users) | Build time + launch |
| **Market validation** | Novel concept, no direct comp. Viral demo potential. | Established market ($20-30/mo competitors). AI angle is differentiated. | Proven demand (indie podcasters). Competitors overpriced for target segment. |
| **Technical risk** | Medium (segment boundary accuracy needs validation -- Marco's spike) | Medium (PDF-to-image-to-PDF round-trip, bounding box accuracy) | Low (straightforward audio-to-text extraction) |
| **Distribution advantage** | None | High (SherlockPDF user base, in-product upsell) | None |
| **Customer willingness to pay** | Strong for creators ($5-10/file per Suki) | Very strong for legal/compliance (cost of data leak is catastrophic) | Moderate (indie creators are price-sensitive) |
| **Recurring revenue potential** | Medium (episodic use, not habitual for most) | High (compliance is ongoing, not one-time) | High (weekly podcast cadence = repeat purchases) |

---

## Build-Order Ranking

The data points to a clear ordering. Here is the ranking with rationale:

### Rank 1: Smart PDF Redactor

**Why first:**
- Highest 90-day profit in mid scenario ($657 vs. $375 and $239)
- Highest margins (93% on bundles) due to near-zero API costs
- Lowest break-even threshold (2 files/month)
- **Existing infrastructure eliminates 40-60% of build effort.** Stripe, file handling, deployment, and a user base are already in place. The 5-7 day estimate accounts for the PDF manipulation complexity, but no time is spent on payments, hosting, or launch infrastructure.
- Built-in distribution channel through SherlockPDF's existing user base (zero acquisition cost for initial users)
- Strongest willingness-to-pay signal (legal/compliance customers pay to avoid catastrophic risk)
- Recurring need (compliance is ongoing, not a one-time use)

**Tradeoff acknowledged:** Longest raw build time (5-7 days). But effective time-to-revenue is shortest because infrastructure and distribution already exist.

### Rank 2: Audio Ad Stripper

**Why second:**
- Strong margins (80-83%), solid 90-day profit trajectory ($375 mid)
- Best viral/demo potential. "Upload a podcast, get it back without ads" is a one-sentence pitch that spreads on social media. Thomas noted this in the meeting.
- Moderate build time (3-4 days) as a standalone product
- Novel product with no direct per-file competitor at this price point
- Technical risk is manageable (Marco's spike will validate before full build)

**Tradeoff acknowledged:** Marco's Gemini audio spike is a prerequisite. If segment boundary detection is inaccurate, the product concept is at risk. This is a gating dependency.

### Rank 3: Podcast Show Notes Generator

**Why third:**
- Easiest to build (2-3 days), lowest technical risk
- Proven demand signal (indie podcasters complain about show notes regularly per Suki)
- But: lowest margins (64%), lowest 90-day profit ($239 mid), highest per-file API cost ($0.45)
- Most price-sensitive customer segment (indie creators)
- Competitors exist (Castmagic, Podium) even if overpriced. This is an incremental improvement in a known market, not a new category.

**Why not first despite being easiest to build:** The data shows that an extra 2-4 days of build time on the Redactor produces $418 more profit over 90 days (mid scenario) with significantly better margins. Speed to build is less important than speed to meaningful revenue.

---

## Summary for CEO

Three numbers that matter:

1. **PDF Redactor** generates **2.7x more profit** than Show Notes over 90 days (mid scenario) with **93% margins** and an existing user base as the acquisition funnel.
2. **Ad Stripper** has the strongest **viral potential** and healthy 80%+ margins, but depends on Marco validating the audio segment detection accuracy.
3. **Show Notes** is the **fastest to build** but the **least profitable** of the three due to higher API costs and a price-sensitive customer base.

The data supports building the Redactor first, Ad Stripper second (pending Marco's spike results), and Show Notes third. But that is the data talking, not a recommendation -- the CEO decides.
