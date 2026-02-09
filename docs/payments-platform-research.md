# Payment & Commerce Platform Research

**Prepared by:** Suki (Market/Competitive Researcher)
**Date:** February 2026
**Purpose:** Evaluate payment/commerce platforms for building monetizable products at Sherlock Labs

---

## Executive Summary

The payment platform landscape has shifted significantly in 2025-2026. Stripe's acquisition of Lemon Squeezy (July 2024) and subsequent launch of Stripe Managed Payments has consolidated the market around a few key players. The Merchant of Record (MoR) model---where the platform handles tax compliance, fraud, disputes, and regulatory burden---has become the clear winner for small teams shipping digital products and SaaS.

**Bottom line:** For a small AI product team building consumer and B2B products, the choice comes down to two realistic options: **Stripe** (with or without Managed Payments) for maximum control and ecosystem depth, or **Paddle** for maximum compliance offloading with strong developer tools. The other platforms serve narrower niches.

---

## Platform Comparison

### 1. Stripe

**What it is:** Payment processor (not a traditional MoR). The industry standard for developer-first payments. Now also offers Stripe Managed Payments (MoR) in private preview.

**Best for:** Technical teams that want full control over the payment experience, companies that will scale significantly, and anyone already in the Stripe ecosystem.

**Pricing/Fees:**
- 2.9% + $0.30 per US card transaction (standard)
- 3.4% + $0.30 for international cards
- +1% for currency conversion
- No monthly fees on standard plan
- Stripe Managed Payments (MoR): additional ~3-7% revenue share on top of standard fees
- Custom/volume pricing available

**Tax handling:**
- Stripe Tax: automatic tax calculation in 102 countries ($0.50 per transaction where tax is calculated)
- Standard Stripe: you handle tax compliance yourself
- Stripe Managed Payments: Stripe handles tax collection and remittance as MoR

**Subscription support:** Full-featured via Stripe Billing---trials, metered/usage-based billing, upgrades, downgrades, proration, dunning, smart retries, customer portal. Best-in-class for complex billing models including hybrid subscription + usage.

**Developer experience:** Gold standard. RESTful API, SDKs in every major language (Node.js, Python, Ruby, Go, PHP, Java, .NET), Stripe Elements for embedded UI components, pre-built Checkout pages, extensive webhooks, CLI tools, test mode, detailed docs with interactive examples. AI-powered Dashboard assistant for natural language queries.

**Checkout experience:**
- Stripe Checkout: hosted page (high conversion, low effort)
- Stripe Elements: embeddable UI components (full customization)
- Payment Links: no-code shareable URLs
- AI-optimized checkout uses 100+ signals to personalize payment method display

**Ecosystem:** Largest in the industry. 125+ payment methods, Connect for marketplaces, Atlas for incorporation, Radar for fraud, Sigma for analytics, Revenue Recognition, Data Pipeline to warehouses. 78% of Forbes AI 50 and 50% of Fortune 100 use Stripe.

**Drawbacks:**
- Without Managed Payments, you own tax compliance, disputes, and fraud---significant operational overhead
- Managed Payments still in private preview (public access expected soon in 2026), limited to hosted Checkout
- Customer support is weak---limited phone support, slow response times for non-enterprise accounts
- Complexity: the sheer breadth of Stripe's product surface means longer integration time for full-featured setups
- Managed Payments pricing (standard fees + 3-7% MoR fee) makes it more expensive than standalone MoR platforms

**Notable customers:** Shopify, Instacart, Lyft, Amazon, Figma, Notion, OpenAI, Anthropic. 1.35M+ live websites.

---

### 2. Paddle

**What it is:** Merchant of Record platform built for SaaS and digital products. Handles payments, tax, compliance, fraud, chargebacks, and customer billing support.

**Best for:** SaaS companies selling globally that want to offload all compliance burden. Strong fit for subscription-based AI products.

**Pricing/Fees:**
- 5% + $0.50 per transaction (all-inclusive, no extra for international)
- No monthly fees on standard plan
- Enterprise/custom pricing available for high volume
- No hidden fees---the 5% covers MoR services, tax handling, fraud protection

**Tax handling:** Fully handled. Paddle collects and remits sales tax, VAT, and GST in every jurisdiction. They are the legal seller of record, so tax audits are their problem, not yours.

**Subscription support:** Full lifecycle management---trials, upgrades, downgrades, proration, pause/resume, dunning with smart retries, cancellation flows. Subscription-specific analytics dashboards for MRR, churn, LTV tracking.

**Developer experience:** Strong and improving. Official SDKs for Node.js, Python, Go, PHP. Paddle.js for frontend (React wrapper available with TypeScript). RESTful API. Next.js starter kit available. Overlay checkout requires minimal frontend code. Webhooks for all events.

**Checkout experience:**
- Overlay checkout: slides in on top of your app (recommended, minimal code)
- Inline checkout: embedded in your page
- Localized automatically (currency, language, payment methods)
- No hosted page option---checkout is always embedded in your domain

**Ecosystem:** Integrations with common tools (Segment, Zapier, accounting software). ProfitWell Metrics (acquired) for subscription analytics. Smaller ecosystem than Stripe but covers the essentials for SaaS.

**Drawbacks:**
- 5% fee is significantly higher than Stripe's base rate (but includes tax/compliance)
- Account approval process can be slow (weeks, not days)
- Limited to digital products and SaaS---not suitable for physical goods
- Smaller ecosystem and fewer payment methods than Stripe
- Less flexibility for custom payment flows or marketplace models
- No transaction-level MoR control (unlike Stripe Managed Payments)

**Notable customers:** n8n, Letterboxd, AdGuard, 1Password, Framer. 3,000+ companies, predominantly 0-9 employee size.

---

### 3. Lemon Squeezy

**What it is:** Merchant of Record platform, acquired by Stripe in July 2024. Popular with indie developers for its simplicity. Currently transitioning users toward Stripe Managed Payments.

**Best for:** Solo developers and small teams who want the fastest path to accepting payments with zero compliance overhead. However, its future is uncertain.

**Pricing/Fees:**
- 5% + $0.50 per transaction
- +1.5% for international (non-US) transactions
- +5% for abandoned cart recovery emails
- No monthly fees
- Payout fees recently reduced post-Stripe acquisition

**Tax handling:** Fully handled as MoR. Collects and remits in 135+ countries. Automatic tax calculation and compliance.

**Subscription support:** Trials, plan changes, pause/resume, dunning, license key management. Less sophisticated than Paddle for complex subscription analytics.

**Developer experience:** Simple and fast to integrate. Official SDKs available. Lemon.js (2.3kB) for overlay checkout. REST API with webhooks. Good docs. Webhook simulation in test mode. Less mature than Stripe or Paddle APIs.

**Checkout experience:**
- Hosted checkout pages
- Overlay checkout via Lemon.js (minimal code)
- Customizable but less flexible than Stripe Elements

**Ecosystem:** Smaller. License key management is a standout feature for software. Affiliate program support. Basic analytics.

**Drawbacks:**
- **Future is uncertain.** Stripe is building Managed Payments to replace Lemon Squeezy's core offering. Migration path is being built, but the brand's long-term independence is questionable.
- Since acquisition, users report degraded reliability, slower customer service, and payout delays
- International fee surcharge (+1.5%) adds up for global sales
- Less sophisticated subscription analytics than Paddle
- Not recommended for new projects given the transition uncertainty

**Notable customers:** Popular among indie hackers and micro-SaaS builders. Specific notable customers not widely publicized.

---

### 4. Polar

**What it is:** Open-source billing infrastructure platform designed specifically for developers monetizing software. Newer entrant, gaining traction in the developer community.

**Best for:** Developer tools, open-source monetization, indie hackers who want low fees and developer-first workflows.

**Pricing/Fees:**
- 4% + $0.40 per transaction (lowest MoR-like fees in this comparison)
- No monthly fees
- Pay only when you make a sale

**Tax handling:** Handles VAT, GST, and sales tax automatically in all jurisdictions. Proper B2B reverse charge and B2C tax collection.

**Subscription support:** Recurring subscriptions, one-time payments, usage-based billing with event ingestion and metering. License keys, file downloads, private GitHub repo access, and Discord invites as subscription benefits.

**Developer experience:** Excellent for its target audience. TypeScript SDK (type-safe), rich API with webhooks, Organization Access Tokens, Customer Portal API for safe client-side use. Better Auth plugin for authentication integration. Open-source codebase. Official GitHub funding option.

**Checkout experience:** Checkout sessions with status tracking (open, confirmed, succeeded, expired). Less polished than Stripe or Paddle's checkout UIs, but functional.

**Ecosystem:** GitHub integration (official funding option), Discord integration, Better Auth plugin. Growing but still small. Community-driven.

**Drawbacks:**
- Still relatively new/beta---less battle-tested at scale
- Smaller team and community than Stripe/Paddle
- Checkout UI less polished
- Limited payment method coverage compared to Stripe
- Not yet proven for high-volume or enterprise use cases
- Primarily developer/open-source focused---may not fit B2C consumer products well

**Notable customers:** Primarily open-source developers and indie hackers. Trusted by "thousands of developers" per their site.

---

### 5. Gumroad

**What it is:** Simple digital product sales platform. Marketplace + storefront for creators selling digital goods.

**Best for:** Individual creators selling ebooks, courses, templates, art. Not suitable for SaaS or subscription-heavy products.

**Pricing/Fees:**
- 10% flat fee per sale (via direct links/profile)
- 30% fee for sales through Gumroad Discover marketplace
- No monthly fees
- Highest fees in this comparison

**Tax handling:** Since January 2025, Gumroad handles all tax obligations---sales tax collection and remittance worldwide.

**Subscription support:** Basic membership/subscription support. No sophisticated dunning, usage-based billing, or plan management.

**Developer experience:** Minimal. No real API for building custom integrations. Designed as a no-code platform.

**Checkout experience:** Gumroad-hosted pages. Limited customization. Gumroad branding visible.

**Ecosystem:** Gumroad Discover marketplace for organic traffic. Basic analytics. Affiliate support.

**Drawbacks:**
- 10% fee is extremely high---punishes growth
- 30% Discover fee is predatory
- No real developer tools or API
- Limited to simple digital product sales
- Not suitable for SaaS, subscriptions, or complex billing
- Platform stagnation---minimal innovation in recent years

**Notable customers:** Popular with individual creators, not tech companies. Sahil Lavingia's platform.

---

### 6. Whop

**What it is:** Commerce platform for creators and communities. Combines product sales with community features (Discord, Telegram, courses).

**Best for:** Community-driven products, courses, memberships, digital downloads with social/community components.

**Pricing/Fees:**
- 3% commission on sales with automations (Discord, Telegram, TradingView)
- 2.7% + $0.30 processing fee (domestic cards)
- +1.5% international, +1% currency conversion
- 10% on Discover marketplace (30% with Discover visibility)
- No monthly fees

**Tax handling:** Not clearly documented as MoR. Less comprehensive than Paddle/Lemon Squeezy.

**Subscription support:** Subscriptions, one-time sales, courses, memberships. Integrated community management.

**Developer experience:** Minimal developer tooling. More of a no-code/low-code storefront builder. API exists but not the focus.

**Checkout experience:** Integrated checkout pages and storefront builder. White-labeled storefronts.

**Ecosystem:** Strong community features---Discord/Telegram/Slack integration, affiliate tools, analytics dashboards, customer support portal. One of the fastest-growing creator commerce platforms in 2026.

**Drawbacks:**
- Not developer-focused---limited API and customization
- Fee structure is complex with multiple layers
- Discover marketplace fees are high
- Better for creator economy than SaaS/tech products
- Tax handling is less robust than MoR platforms
- Community-centric model may not fit all product types

---

### 7. FastSpring

**What it is:** Enterprise-grade Merchant of Record for SaaS, software, and gaming. Handles everything but targets larger businesses.

**Best for:** Established software companies with significant transaction volume. Not ideal for small teams or early-stage products.

**Pricing/Fees:**
- Revenue-sharing model, ~6% per transaction (varies)
- Reportedly $3,000-$4,000+/month minimum for mid-range volumes
- Custom pricing requires sales conversation
- No public pricing page with clear rates

**Tax handling:** Full MoR---handles tax in all jurisdictions, manages audits, ensures compliance.

**Subscription support:** Full lifecycle subscription management. 100+ payment methods and multiple currencies.

**Developer experience:** Adequate but not cutting-edge. Less developer-focused than Stripe or Paddle.

**Checkout experience:** Customizable but less modern than competitors. Popup and embedded options.

**Ecosystem:** Strong back-office tools, decent integrations.

**Drawbacks:**
- Pricing is opaque and expensive---requires sales call
- Minimum spend makes it impractical for early-stage products
- Less modern developer experience
- Overkill for small teams

---

### 8. Dodo Payments (Emerging)

**What it is:** Newer Merchant of Record platform targeting indie hackers and solopreneurs. Gaining traction as a Lemon Squeezy alternative.

**Best for:** Solo founders and micro-SaaS businesses looking for the lowest MoR fees.

**Pricing/Fees:**
- 4% + $0.40 per transaction (matches Polar for lowest fees)
- No hidden fees, no monthly charges
- Enterprise pricing available

**Tax handling:** Full MoR---handles international taxes in every region automatically.

**Subscription support:** Subscription management, license keys, API management.

**Developer experience:** Still maturing. Less established SDK ecosystem than Stripe/Paddle.

**Checkout experience:** Functional but less polished than market leaders.

**Ecosystem:** 10,000+ businesses reportedly. Growing but still establishing itself.

**Drawbacks:**
- Very new---less battle-tested
- Smaller team, potential reliability concerns
- SDK/developer tooling still maturing
- Limited track record at scale

---

## Head-to-Head Comparison Table

| Feature | Stripe | Paddle | Lemon Squeezy | Polar | Gumroad | Whop |
|---------|--------|--------|---------------|-------|---------|------|
| **Type** | Processor (+ MoR beta) | MoR | MoR | MoR-like | Marketplace | Creator platform |
| **Base Fee** | 2.9% + $0.30 | 5% + $0.50 | 5% + $0.50 | 4% + $0.40 | 10% | 3% + processing |
| **MoR Fee** | +3-7% (Managed) | Included | Included | Included | N/A | Partial |
| **Tax Handling** | Add-on / Managed | Full | Full | Full | Full (2025+) | Unclear |
| **Subscriptions** | Best-in-class | Strong | Good | Good | Basic | Basic |
| **Usage Billing** | Yes (metered) | Limited | No | Yes (metered) | No | No |
| **Developer XP** | Gold standard | Strong | Good | Excellent | Minimal | Minimal |
| **Checkout** | Hosted/Embedded/Links | Overlay/Inline | Hosted/Overlay | Sessions | Hosted | Integrated |
| **Ecosystem** | Massive | Medium | Small (shrinking) | Small (growing) | Small | Medium |
| **Approval Speed** | Fast | Slow (weeks) | Fast | Fast | Fast | Fast |
| **Physical Goods** | Yes | No | No | No | No | No |
| **Best For** | Any scale, full control | SaaS, global | Indie (uncertain future) | Dev tools, OSS | Creators | Communities |

---

## AI Product Monetization Landscape

### How AI Products Are Being Monetized in 2025-2026

The AI SaaS market is shifting toward **hybrid pricing models** that combine subscriptions with usage-based billing:

- **59% of software companies** expect usage-based approaches to grow as a share of revenue in 2025
- **77% of the largest software companies** now incorporate consumption-based pricing
- **Hybrid models** (subscription + usage) deliver ~21% median revenue growth vs ~13% for pure subscription
- **Token/API-call billing** is the standard for AI APIs and infrastructure products
- **Outcome-based pricing** (paying for results, not inputs) is emerging for enterprise AI

### What This Means for Platform Choice

AI products need a payment platform that supports:
1. **Subscription billing** --- for base plans and seat-based pricing
2. **Usage-based/metered billing** --- for token consumption, API calls, compute time
3. **Hybrid models** --- combining both (e.g., $20/mo base + $0.01 per API call)
4. **Flexible plan tiers** --- free/trial to enterprise with smooth upgrade paths
5. **Webhooks and real-time events** --- to gate access based on usage and payment status

**Stripe** and **Polar** are the only platforms with strong native metered/usage-based billing. **Paddle** supports it to a degree but is weaker here. **Lemon Squeezy**, **Gumroad**, and **Whop** don't support it meaningfully.

---

## Trend Analysis: What's Moving Up vs. Down

### Trending Up
- **Stripe** --- dominant and expanding. Managed Payments entering the MoR space. 78% of Forbes AI 50 already on Stripe. Inevitable gravity.
- **Paddle** --- steady growth as the independent MoR leader. Strong positioning for SaaS. 3,000+ companies.
- **Polar** --- fastest-growing among developer-focused alternatives. Open source, lowest fees, strong dev tools. Small but momentum is real.
- **Dodo Payments** --- emerging as the budget MoR option. Gaining users fleeing Lemon Squeezy uncertainty.

### Trending Down
- **Lemon Squeezy** --- acquired by Stripe, being absorbed into Managed Payments. Reliability complaints since acquisition. Not recommended for new projects.
- **Gumroad** --- stagnant. 10% fees are not competitive. No developer tools. Losing creators to Whop, Polar, and others.
- **FastSpring** --- still relevant for enterprise but losing indie/startup market to Paddle and newer players.

### Stable
- **Whop** --- growing in the creator economy but not relevant for technical SaaS/AI products.

---

## Real-World Examples

### Products Built on Stripe
- **OpenAI / ChatGPT** --- usage-based and subscription billing
- **Figma** --- team-based subscription billing
- **Notion** --- freemium to enterprise subscriptions
- **Vercel** --- hybrid subscription + usage
- Most Y Combinator and Stripe Atlas startups default to Stripe

### Products Built on Paddle
- **n8n** --- workflow automation SaaS
- **Letterboxd** --- social film platform
- **AdGuard** --- ad blocking software
- **1Password** --- password management
- **Framer** --- design/website builder

### Products Built on Lemon Squeezy
- Various indie SaaS products, browser extensions, developer tools
- Many are now migrating away due to acquisition uncertainty

### Products Built on Polar
- Open-source developer tools and libraries
- Indie developer side projects with subscription models

---

## Recommendations

### For Sherlock Labs: Stripe (Primary) + Evaluate Paddle (Secondary)

Given the team's profile---small AI product team, technical capability, building both consumer and B2B products---here is my recommendation:

#### Primary Recommendation: Stripe

**Why Stripe:**
1. **Ecosystem depth** --- everything you could need is available: subscriptions, usage-based billing, payment links, embedded checkout, Connect for marketplaces, and more
2. **Usage-based billing** --- critical for AI products where consumption varies; Stripe's metered billing is the most mature
3. **Developer experience** --- the team already has strong technical capability; Stripe's API quality and SDK breadth match this
4. **Managed Payments (MoR) option** --- when it goes public in 2026, you can selectively apply MoR at the transaction level, getting compliance offloading where you need it while keeping full control elsewhere
5. **Scale trajectory** --- whether products stay small or grow to enterprise, Stripe handles it without migration
6. **AI product alignment** --- 78% of Forbes AI 50 are on Stripe for a reason; the tooling is built for this

**The trade-off:** Without Managed Payments, you handle tax compliance yourself (Stripe Tax helps but you own the filing). With Managed Payments, the added 3-7% fee makes it more expensive than Paddle. However, the flexibility and ecosystem benefits outweigh this for a team building multiple product types.

#### Secondary/Alternative: Paddle

**When Paddle makes more sense:**
- If the first product is a straightforward SaaS subscription (no usage-based billing needed)
- If the team wants to completely eliminate tax/compliance burden from day one
- If speed to market matters more than long-term flexibility
- If the product sells primarily to international customers (Paddle's flat 5% with no international surcharge)

**Paddle's limitation:** If you later need usage-based billing, marketplace payments, or complex hybrid models for AI products, you may outgrow Paddle and face a migration.

#### Not Recommended for Sherlock Labs
- **Lemon Squeezy** --- future is too uncertain post-acquisition
- **Gumroad** --- fees too high, no developer tools, wrong audience
- **Whop** --- creator/community focused, not SaaS/AI
- **FastSpring** --- too expensive and enterprise-oriented for a small team
- **Polar** --- interesting but too new/unproven for primary billing; worth watching
- **Dodo Payments** --- too new; good concept but needs more track record

#### Recommended Approach

1. **Start with Stripe** on the standard plan (2.9% + $0.30)
2. **Use Stripe Tax** for automated tax calculation (+$0.50/taxable transaction)
3. **Use Stripe Checkout** (hosted) initially for fastest launch, then migrate to Elements for custom UX
4. **Implement Stripe Billing** for subscriptions with metered billing for AI usage
5. **Evaluate Stripe Managed Payments** when it goes public---apply MoR selectively to markets where tax compliance is most burdensome
6. **Consider Paddle** as an alternative if the first product is a simple subscription SaaS and the team wants zero compliance overhead from day one

This gives maximum flexibility for a team that may build consumer apps, B2B SaaS, AI APIs, or marketplace products---Stripe handles all of these. The ecosystem depth means you add capabilities (fraud detection, revenue recognition, data pipelines) without switching platforms.

---

## Sources

- [Lemon Squeezy Pricing](https://www.lemonsqueezy.com/pricing)
- [Lemon Squeezy 2026 Update](https://www.lemonsqueezy.com/blog/2026-update)
- [Stripe Payments](https://stripe.com/payments)
- [Stripe Managed Payments Docs](https://docs.stripe.com/payments/managed-payments)
- [Stripe Sessions 2025 Updates](https://stripe.com/blog/top-product-updates-sessions-2025)
- [Stripe Managed Payments Overview (UserJot)](https://userjot.com/blog/stripe-managed-payments-for-saas)
- [Paddle Pricing](https://www.paddle.com/pricing)
- [Paddle Developer Docs](https://developer.paddle.com/)
- [Paddle Review 2026 (Dodo)](https://dodopayments.com/blogs/paddle-review)
- [Polar.sh](https://polar.sh/)
- [Polar API Docs](https://polar.sh/docs/api-reference/introduction)
- [Gumroad Pricing](https://gumroad.com/pricing)
- [Gumroad 2025 Review (Medium)](https://medium.com/@RiseLogan/gumroad-in-2025-fees-features-and-better-alternatives-fef48cecb31d)
- [Whop Fees Docs](https://docs.whop.com/fees)
- [Whop Review 2026 (Dodo)](https://dodopayments.com/blogs/whop-review)
- [FastSpring Pricing](https://fastspring.com/pricing/)
- [Dodo Payments](https://dodopayments.com/)
- [Payment Processor Fee Comparison (UserJot)](https://userjot.com/blog/stripe-polar-lemon-squeezy-gumroad-transaction-fees)
- [Stripe vs Paddle vs Lemon Squeezy Comparison (Medium)](https://medium.com/@muhammadwaniai/stripe-vs-paddle-vs-lemon-squeezy-i-processed-10k-through-each-heres-what-actually-matters-27ef04e4cb43)
- [AI Monetization in 2025 (Orb)](https://www.withorb.com/blog/ai-monetization)
- [2026 Guide to SaaS/AI Pricing Models](https://www.getmonetizely.com/blogs/the-2026-guide-to-saas-ai-and-agentic-pricing-models)
- [AI Pricing Field Report 2025 (Metronome)](https://metronome.com/blog/ai-pricing-in-practice-2025-field-report-from-leading-saas-teams)
- [MoR Guide (Lemon Squeezy)](https://www.lemonsqueezy.com/guide-to-merchant-of-record)
- [Lemon Squeezy Alternatives 2026 (Affonso)](https://affonso.io/blog/lemon-squeezy-alternatives-for-saas)
- [Paddle Alternatives 2026 (Affonso)](https://affonso.io/blog/paddle-alternatives-for-saas)
