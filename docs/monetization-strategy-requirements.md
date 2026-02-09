# Monetization Strategy & First Product Requirements

**Author:** Thomas (Product Manager)
**Date:** February 2026
**Status:** Complete (Rev 2 — updated with CEO decisions)
**Inputs:** Suki's market research (`payments-platform-research.md`), Marco's tech evaluation (`payments-platform-tech-eval.md`), CEO feedback on open questions

---

## CEO Decisions (Resolved)

| Question | Decision |
|----------|----------|
| Domain | `pdf.sherlocklabs.ai` |
| Geography | Global from day one (Stripe Tax enabled) |
| Free tier limits | 25 files/day (volume-first strategy) |
| AI as differentiator | **Rethought.** Premium value comes from power features, UX, and speed --- not AI inference. See Section 3. |
| Timeline | **End of this week.** Phase 1 scope aggressively cut to match. |

---

## 1. Platform Recommendation: Stripe

**Decision: Stripe is the platform. This is not close.**

Both Suki and Marco independently converge on Stripe as the primary recommendation, and after reviewing their findings, I agree completely. Here is why:

**The case for Stripe:**
- **Best stack fit.** Marco scores Stripe 9.5/10 for our Vite+React+Express stack. First-party React components (`<PaymentElement>`, `<CheckoutProvider>`), excellent Node.js SDK, purpose-built for exactly our architecture. No other platform comes close.
- **MCP server already installed.** The Stripe MCP server is first-party and already in our dev environment. Howard, Alice, and Jonah can use AI-assisted development from day one. Only Paddle also has an official MCP server.
- **Scale trajectory.** Whether we're doing $100/month or $100K/month, Stripe handles it without a platform migration. 78% of the Forbes AI 50 use Stripe. OpenAI, Anthropic, Vercel, Notion --- they all chose Stripe.
- **Ecosystem depth.** Checkout, Billing, Tax, Radar (fraud), Connect (if we ever do marketplace), Revenue Recognition, analytics. We add capabilities without switching platforms.
- **Howard's expertise.** Our Payments Engineer specializes in Stripe, subscriptions, and webhooks. We're building on his strongest ground.
- **Global tax from day one.** Stripe Tax handles automatic tax calculation in 100+ countries ($0.50 per taxable transaction). This supports the CEO's decision to launch globally.

**What about Paddle (MoR)?**
Paddle's 5% all-inclusive fee handles tax compliance automatically, which is appealing for global launch. But: no official React components, no hosted checkout redirect option, and Marco scores it 8/10 vs Stripe's 9.5/10. With Stripe Tax, we get global tax handling without giving up Stripe's ecosystem. We can evaluate Stripe Managed Payments (full MoR) when it exits private preview later in 2026.

**Recommendation:** Stripe standard plan (2.9% + $0.30) + Stripe Tax (global) + Stripe Billing + Stripe Checkout (hosted initially, then Elements for custom UX).

---

## 2. Product Ideas

Given our team's strengths --- web app development, developer tools, design systems, existing PDF tools --- here are the realistic product opportunities:

### Tier 1: High Confidence (Team has proven capability)

**A. PDF Toolkit (SaaS)**
We already built PDF Combiner and PDF Splitter as free, client-side tools. A unified paid product adds power features: batch processing, compression, format conversion (PDF to/from images, Word, etc.), page extraction/reordering, password protection, watermarking. The free tools become the acquisition funnel. Differentiation through UX quality, speed, and privacy (client-side processing) --- not AI.

**B. Agent Workspace Platform (SaaS)**
Productize the TeamHQ orchestration model: let teams define agent roles, run multi-agent workflows, get structured output. Target: engineering teams, product teams, agencies. Complex to build --- Phase 2/3.

**C. OST Tool (SaaS)**
We built the OST tool internally. Product managers need discovery tools. Underserved market with weak tooling. Good second product.

### Tier 2: Medium Confidence (Adjacent to what we've built)

**D. Document Processing API**
Expose PDF processing as an API for developers. Usage-based pricing per operation.

**E. Developer Utility Suite**
Expand beyond PDF --- text tools, JSON formatters, image processors, code formatters. All client-side, fast, well-designed. The "Sherlock Labs Tools" brand.

---

## 3. First Product Recommendation: PDF Toolkit

**Decision: Build the PDF Toolkit as our first monetized product.**

### The CEO's Insight: Power Features, Not AI

The CEO challenged whether AI is the right paywall gate, and he's right. Here's why this is a better strategy:

**1. Zero marginal cost on premium features.**
AI inference has real per-use costs that eat into margins at low price points. Traditional PDF operations (compress, convert, merge, split, reorder, protect) are computationally cheap --- they run client-side or with minimal server resources. Every paid operation is nearly pure margin.

**2. The value is speed, UX, and "no limits."**
Look at what Smallpdf and iLovePDF actually charge for: not AI, but removing file size limits, batch processing, offline access, no ads, no waiting. Users pay to remove friction, not to add AI features. The upgrade motivation is "I hit a limit and need it gone right now."

**3. Simpler to build, faster to ship.**
No AI model integration, no prompt engineering, no token cost monitoring, no credit systems. The paywall is a feature gate: free users get core operations with limits, paid users get everything unlimited. This is dramatically simpler to implement --- critical when the deadline is end of this week.

**4. AI can come later as expansion, not foundation.**
If AI features prove valuable (summarization, extraction, OCR), we add them in Phase 2 as a premium add-on. But the core business doesn't depend on AI working well or being cost-effective. We're not betting the product on inference quality.

**5. Privacy as differentiation.**
Our existing PDF tools run entirely in the browser --- files never leave the user's machine. This is a genuine differentiator against competitors that upload files to servers. "Your files stay on your device" is a powerful trust signal, and it's incompatible with AI processing (which requires server-side). Leading with privacy keeps our architecture simple and our messaging clean.

### Why PDF Toolkit Still Wins as First Product

- **Existing funnel.** PDF Combiner and PDF Splitter already work. We consolidate them, add premium features behind a paywall, and wire up Stripe.
- **Massive market.** $3B+ market. Competitors charge $9-25/month. Validated demand.
- **Fastest to revenue.** No backend AI infrastructure needed. Client-side PDF operations + Stripe checkout = shippable this week.
- **Proves the payments stack.** The Stripe integration we build here becomes reusable for every future product.

---

## 4. Monetization Model

### Product Name: **SherlockPDF** (working title)
### Domain: `pdf.sherlocklabs.ai`

### Pricing Strategy: Freemium + Tiered Subscription (No Usage/Credits)

**Why this is simpler and better than the original AI credit model:**
- No usage metering infrastructure needed
- No credit tracking, no overage billing, no per-operation cost monitoring
- Simple feature gates: free users get X, paid users get everything
- Stripe Checkout + Billing handles this natively with zero custom metering
- Ships faster --- critical for end-of-week deadline

### Pricing Tiers

| Tier | Price | Target | Includes |
|------|-------|--------|----------|
| **Free** | $0 | Everyone, acquisition | Merge, split, basic operations. 25 files/day. Small "Powered by SherlockPDF" branding on output. Max 50MB per file. |
| **Pro** | $9/month ($7/month annual) | Individuals who hit limits | Everything unlimited. No daily file limit. No output branding. 200MB per file. Batch processing (up to 50 files at once). PDF compression. Page reordering/extraction. Password protection. |
| **Team** | $24/month ($19/month annual) | Small teams (up to 5 seats) | Everything in Pro. Shared team workspace. Priority support. API access. |

### Why These Price Points (Revised)

- **$9/month Pro** (down from $12): Without AI inference costs, we can price more aggressively. $9/month undercuts Smallpdf ($12/month) and Adobe ($20/month) while being above iLovePDF ($7/month). The lower price reduces friction to convert.
- **$24/month Team** (down from $29): Stays under the "no procurement needed" threshold for most companies.
- **No Enterprise tier for Phase 1.** We add it when there's inbound demand. No point building SSO and admin consoles for a product that launched this week.
- **25 files/day free** (CEO decision): Very generous. This is a volume play --- we want lots of free users finding value, hitting the batch/size/branding limits, and converting.

### What Gates the Paywall

Free users will naturally upgrade when they:
1. Need to process more than 25 files in a day (power users, batch workflows)
2. Want to remove the output branding (professional use)
3. Need files larger than 50MB (common with scanned documents)
4. Want batch processing (upload 50 files, process all at once)
5. Need PDF compression (reduce file size for email/upload)
6. Need password protection on PDFs

These are real friction points that drive conversion in the PDF tool market. No AI required.

---

## 5. Phased Roadmap

### Phase 1: MVP to First Payment (This Week)

**Goal:** A user can visit `pdf.sherlocklabs.ai`, use PDF tools for free, hit a limit, subscribe via Stripe, and use premium features. End of week deadline.

**Hard deadline: End of this week (Feb 14, 2026).**

**Scope --- ruthlessly cut for timeline:**

**Must Have (ships this week):**
- Unified SherlockPDF web app consolidating Combiner + Splitter
- Free tier: merge, split, 25 files/day, 50MB limit, output branding
- Pro tier ($9/month): unlimited files, no branding, 200MB limit, batch processing
- Stripe Checkout (hosted page --- fastest to implement, no custom UI needed)
- Stripe Billing for subscription management
- Stripe Tax enabled for global tax calculation
- Stripe Customer Portal link for self-service (cancel, update payment)
- Stripe webhooks for subscription lifecycle events
- Simple auth: email-based (could be as simple as Stripe customer lookup by email, no separate auth system)
- Paywall enforcement: check subscription status before allowing premium operations
- Deployed to `pdf.sherlocklabs.ai`

**Explicitly Deferred (not this week):**
- Password protection, compression, page reordering (Pro features, but can launch without them)
- Team tier with multi-seat billing
- API access
- Custom Stripe Elements checkout (use hosted Checkout first)
- User dashboard / account management UI (Stripe Customer Portal covers basics)
- SEO landing pages
- Analytics / usage tracking beyond Stripe's built-in dashboard

**What the MVP looks like:**
1. User lands on `pdf.sherlocklabs.ai` --- clean, fast tool interface
2. Can merge PDFs, split PDFs, no sign-up required (free tier)
3. After 25 files/day, or files over 50MB, or wanting no branding: paywall prompt
4. "Upgrade to Pro" button redirects to Stripe Checkout (hosted)
5. After payment, Stripe webhook fires, user is marked as Pro
6. Pro user returns, enters email, system checks Stripe for active subscription, unlocks premium
7. User can manage subscription via Stripe Customer Portal link

**Team (5 agents --- leaner for speed):**

| Agent | Deliverable | Timeline |
|-------|------------|----------|
| **Andrei** (Arch) | Tech approach --- architecture for consolidated app + Stripe integration | Day 1 |
| **Robert** (Designer) | Design spec --- unified tool UI, paywall UX, upgrade flow | Day 1-2 |
| **Howard** (Payments) | Stripe integration: products/prices, checkout session creation, webhooks, customer portal, tax config | Day 2-3 |
| **Alice** (FE) | Frontend: consolidated PDF app, paywall gates, upgrade prompts, Stripe redirect | Day 2-4 |
| **Jonah** (BE) | Backend: auth endpoint, subscription status check, webhook handler, file limit enforcement | Day 2-4 |
| **Enzo** (QA) | Test plan + pass/fail verdict: payment flows, free/paid feature gates, edge cases | Day 4-5 |

**Not needed for Phase 1:** Kai (no AI features), Priya, Nadia, Yuki, Suki, Marco, Zara, Leo, Nina, Soren, Amara.

**Execution Order:**
1. **Andrei** writes tech approach (Day 1, blocked by this doc)
2. **Robert** writes design spec (Day 1-2, can start in parallel with Andrei since the product concept is clear)
3. **Howard + Jonah** align on Stripe integration + API contract (Day 2, blocked by tech approach)
4. **Alice + Howard + Jonah** build in parallel (Days 2-4)
5. **Robert** lightweight design review (Day 4)
6. **Enzo** QA gate (Days 4-5)

### Phase 2: Power Features + Growth (Weeks 2-4)

**Goal:** Add the premium features that justify the price. Increase conversion.

**Scope:**
- PDF compression (reduce file size)
- Page reordering and extraction (drag pages, extract specific pages)
- Password protection (encrypt PDFs)
- PDF to image conversion (and vice versa)
- Team tier with multi-seat billing via Stripe
- API access for Team tier (REST endpoints for PDF operations)
- Custom Stripe Elements checkout (embedded in-app, replace hosted redirect)
- Basic usage analytics (Stripe dashboard + lightweight custom metrics)
- SEO landing pages per feature (pdf merger, pdf splitter, pdf compressor, etc.)
- Responsive layout polish (Soren)
- Micro-interactions and processing animations (Nina)

**Team additions:** Priya (marketing/SEO copy), Soren (responsive), Nina (interactions)

### Phase 3: Scale + Second Product (Weeks 5-12)

**Goal:** Grow the PDF product, start the next product.

**Scope:**
- Advanced PDF features: form filling, annotation, redaction, watermarking
- PDF Processing API as standalone developer product
- Consider AI features as premium add-on if there's demand (summarization, extraction, OCR)
- Mobile-responsive or native mobile app
- Enterprise tier if inbound demand exists
- Analytics and churn analysis (Yuki)
- Begin scoping second product (OST Tool or Agent Workspace)
- Evaluate Stripe Managed Payments for enhanced international tax compliance

---

## 6. Team Allocation

### Phase 1 Core Team (6 agents, this week)

| Agent | Role | Time |
|-------|------|------|
| **Thomas** (PM) | Requirements, acceptance criteria, unblocking | Full-time |
| **Andrei** (Arch) | Tech approach, architecture | Day 1 only |
| **Robert** (Designer) | Design spec, UX flows | Days 1-2, then review on Day 4 |
| **Howard** (Payments) | Stripe end-to-end | Days 2-4 |
| **Alice** (FE) | Frontend implementation | Days 2-4 |
| **Jonah** (BE) | Backend implementation | Days 2-4 |
| **Enzo** (QA) | Test + release gate | Days 4-5 |

### Available for Phase 2+

| Agent | When | Role |
|-------|------|------|
| Kai (AI Eng) | Phase 3 | If AI features added |
| Priya (Marketer) | Phase 2 | SEO, feature pages, conversion copy |
| Suki (Researcher) | Done | Research complete |
| Marco (Tech Researcher) | Done | Research complete |
| Nadia (Writer) | Phase 2 | API docs, help content |
| Yuki (Analyst) | Phase 3 | Conversion/churn analytics |
| Zara (Mobile 1) | Phase 3 | If mobile app built |
| Leo (Mobile 2) | Phase 3 | If mobile app built |
| Nina (Interactions) | Phase 2 | Processing animations |
| Soren (Responsive) | Phase 2 | Responsive layouts |
| Amara (A11y) | Phase 2 | Accessibility audit |

---

## 7. Success Metrics

### Phase 1 (This Week): Ship It

| Metric | Target | Why |
|--------|--------|-----|
| **Product live at pdf.sherlocklabs.ai** | Yes/No | Did we ship? |
| **Stripe integration functional** | Yes/No | Can a user pay? |
| **Free -> Pro upgrade flow works** | Yes/No | End-to-end payment works |
| **QA pass** | Yes/No | Enzo signs off. Non-negotiable. |

Phase 1 is pass/fail. Did we ship a working product with working payments by end of week?

### Phase 2 (Weeks 2-4): Early Traction

| Metric | Target | Why |
|--------|--------|-----|
| **MRR** | $200+ | Early revenue signal |
| **Free-to-paid conversion** | 3-5% | Industry benchmark for freemium tools |
| **Paid subscribers** | 20+ | People will pay for this |
| **Daily active users (free)** | 100+ | Free tier is attracting users |
| **Churn rate** | < 10% monthly | Retention = product-market fit |

### Phase 3 (Weeks 5-12): Growth

| Metric | Target | Why |
|--------|--------|-----|
| **MRR** | $1,000+ | Meaningful revenue |
| **Paid subscribers** | 100+ | Growing base |
| **API adoption** | 5+ teams | Team tier working |
| **Net Revenue Retention** | > 100% | Upgrades > churn |

### North Star Metric
**Monthly Recurring Revenue (MRR).** We're building a business.

---

## 8. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| End-of-week deadline is too tight | Medium | High | Scope is ruthlessly cut. Hosted Checkout (not custom). No auth system (Stripe email lookup). Defer all "nice to have" features. |
| Low free-to-paid conversion | Medium | High | 25 files/day is generous enough to build habit, limits on size/batch/branding create natural upgrade triggers. A/B test in Phase 2. |
| Stripe Tax complexity for global launch | Low | Medium | Stripe Tax handles calculation automatically. We enable it and let Stripe do the work. Manual filing overhead is minimal at low volume. |
| PDF market is commoditized | Medium | Medium | Differentiate on UX quality, speed, and privacy (client-side processing). Our team ships fast --- we can iterate on features faster than incumbents. |
| Competitors offer AI features we don't | Low | Low | CEO's insight: users pay for speed and no-limits, not AI. If AI demand emerges, add it in Phase 3. Don't pre-optimize for a hypothetical. |

---

## 9. Architecture Notes for Andrei

Key decisions that need to be made in the tech approach:

1. **Client-side vs server-side PDF processing.** Current tools are 100% client-side (pdf-lib, browser-only). This is great for privacy but may limit some premium features (compression quality, format conversion). Recommendation: stay client-side for Phase 1, evaluate server-side for Phase 2 power features.

2. **Auth strategy for this week.** We don't have time to build a full auth system. Options: (a) Stripe Checkout captures email, we look up subscription status by email on return visits, (b) magic link via email, (c) lean on Stripe Customer Portal for all account management. Recommend option (a) for MVP speed.

3. **Deployment.** Static site + lightweight Express API for Stripe endpoints? Or full Vite+React app? The existing tools are plain HTML --- consolidating them into a React app adds build complexity. Consider keeping it simple: plain HTML/JS for the tools, small Express server for Stripe webhook/session endpoints only.

4. **File limit enforcement.** 25 files/day for free tier. Client-side counter (localStorage) is trivially bypassable but sufficient for honest users in MVP. Server-side enforcement in Phase 2.

5. **Stripe product/price setup.** Need: one Product ("SherlockPDF Pro"), two Prices (monthly $9, annual $7/month = $84/year). Howard handles this.

---

## Next Steps

1. **Andrei** writes `docs/sherlockpdf-tech-approach.md` --- today
2. **Robert** writes `docs/sherlockpdf-design-spec.md` --- today/tomorrow
3. **Howard + Jonah** align on Stripe integration + API contract --- tomorrow
4. **Alice + Howard + Jonah** build in parallel --- days 2-4
5. **Robert** reviews implementation --- day 4
6. **Enzo** QA gate --- days 4-5
7. **Ship to `pdf.sherlocklabs.ai`** --- end of week

Clock is ticking. Let's go.
