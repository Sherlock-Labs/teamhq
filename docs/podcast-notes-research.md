# Podcast Show Notes Tool — Competitive Scan

**Author:** Suki (Product Researcher)
**Date:** February 9, 2026
**Status:** Complete
**Research question:** Is there a viable gap in the podcast show notes tool market for a simple, pay-per-episode indie-focused tool — and if so, what features and pricing would win?

---

## Top 5 Competitors

| Dimension | Castmagic | Podium | Podsqueeze | Capsho | Descript |
|---|---|---|---|---|---|
| **URL** | [castmagic.io](https://www.castmagic.io) | [hello.podium.page](https://hello.podium.page) | [podsqueeze.com](https://podsqueeze.com) | [capsho.com](https://www.capsho.com) | [descript.com](https://www.descript.com) |
| **Pricing model** | Monthly subscription | Monthly subscription + pay-as-you-go credits | Monthly subscription (free tier available) | Monthly subscription (7-day trial) | Monthly subscription (free tier available) |
| **Lowest price** | $21/mo (annual) / $29/mo | ~$24/mo (Creator); $6-9/hr pay-as-you-go | Free (30 min/mo); $8.99/mo (Starter) | $99/mo ($59/mo with promo code) | Free (1 hr/mo); $16/mo (Hobbyist) |
| **Mid-tier price** | $79/mo (annual) / $99/mo (Starter, 20 hrs) | $213/mo (Studio, 60 hrs) | $19.99/mo (Pro, 320 min) | $99/mo (single tier) | $24/mo (Creator) |
| **High-tier price** | $790/mo (annual) / $999/mo (Business, 80 hrs) | Custom | $89.99/mo (Agency Scale, 4000 min) | N/A | $50/mo (Business) |
| **Target audience** | Professional creators, agencies, content teams | Podcasters (indie to pro) | Indie to mid-tier podcasters, agencies | Established podcasters, content marketers | Video/audio editors broadly (podcasters are a subset) |
| **Core features** | Show notes, transcripts, social posts, blog posts, audiograms, Magic Chat, custom AI prompts | Show notes, chapters, transcripts, audiograms, clips, social posts, PodiumGPT | Show notes, transcripts, blog posts, newsletters, social posts, video clips, quote images, landing pages | Show notes, transcripts, blog posts, social posts, LinkedIn articles, email newsletters, YouTube descriptions, AI personas | Transcript-based editing, show notes, social posts, Magic Clips, AI speech, dubbing |
| **Input method** | Audio/video upload, YouTube/TikTok/Instagram URL import, Zoom/Google Drive integration | Audio upload, RSS feed | Audio/video upload, RSS feed | Audio/video upload | Audio/video upload, direct recording |
| **Output format** | Text (copy-paste), custom prompts generate any format | Text (copy-paste), API access | Text, video clips, images, podcast landing pages | Text (copy-paste), images | Text, video, within Descript editor |
| **AI model** | Not disclosed (mentions ChatGPT for Magic Chat) | Not disclosed | Not disclosed | Not disclosed | Proprietary AI stack |
| **Limitations** | 5 hrs/mo on cheapest plan; no pay-per-episode option | 3 free hours then subscription or per-hour credits; English-only transcripts on Creator plan | 30 min/mo free; 160 min on Starter; watermarks on free tier clips | 300 min/mo; no rollover; content locked if you cancel | 60 min/mo free; AI features limited on free/Hobbyist tiers; show notes are a secondary feature |

**Notable omission from the top 5:** Riverside.fm ($29/mo Pro plan) includes AI show notes as a feature within their recording/editing platform, not as a standalone tool. It competes tangentially but its primary value prop is recording infrastructure, not content generation. I excluded it from the primary 5 because it's a recording platform that added show notes, not a show notes tool — different buying decision.

*Data gathered: February 9, 2026. All pricing verified against primary sources (product websites) or recent review sources.*

---

## Pricing Landscape

### What's the lowest price point available?

**Free** — both Podsqueeze (30 min/month) and Descript (1 hour/month) offer free tiers that include basic show notes generation. These free tiers are heavily limited and serve as funnels to paid plans. The lowest paid entry point is **Podsqueeze at $8.99/month** (160 minutes).

### What's the modal (most common) pricing model?

**Monthly subscription with minute-based quotas.** Every competitor uses a subscription model as their primary pricing. Plans are gated by transcription minutes per month (Castmagic: hours, Podsqueeze: minutes, Descript: minutes, Capsho: minutes). This creates a "pay whether you use it or not" dynamic that penalizes low-frequency publishers.

### Is anyone doing pay-per-episode?

**Almost no one.** Podium offers pay-as-you-go credits at $6-9 per 60 minutes of audio, which is the closest to per-episode pricing — but at $6-9 per episode, it's expensive and not prominently marketed. No competitor has a clean "$X per episode" checkout flow as their primary model. This is the clearest gap in the market.

The absence of per-episode pricing is likely because existing tools are designed for content *repurposing* (generating 10+ assets per episode), which justifies monthly subscriptions. A tool that generates *only* show notes doesn't carry enough perceived value to sustain a $20+/month subscription — which is exactly why no one has built the simpler version.

### What does the free tier typically include?

Free tiers are loss leaders: 30-60 minutes/month, watermarked clips, limited AI features. They exist to demonstrate value and convert to subscriptions. No free tier is generous enough for a weekly podcaster (a 40-minute weekly show = 160 min/month, requiring at minimum a $8.99-19.99/month paid plan).

### Where's the price sensitivity?

**The $20/month threshold is where indie podcasters drop off.** Castmagic ($29/mo), Podium ($24/mo), and Capsho ($99/mo) are priced for professional creators or agencies. Indie podcasters producing 4-8 episodes/month can't justify these costs — especially when 85% of indie podcasters aren't monetizing their shows at all ([source: podnews.net, 2025](https://podnews.net/update/not-monetising)). The switching trigger is simple: a tool that costs less than $10/month for a weekly podcaster, with zero commitment beyond the episode they're working on.

---

## Feature Gaps

### 1. No clean pay-per-episode workflow exists

**The gap:** Every tool requires an account, a subscription commitment, and a learning curve before you can process a single episode. No tool offers a "drop in an audio file, pay $2, get show notes" flow. The closest is Podium's pay-as-you-go credits, but that still requires an account and the per-hour cost ($6-9) makes it more expensive than most monthly plans on a per-episode basis.

**Who has this need:** Indie podcasters who publish biweekly or monthly. They need show notes 2-4 times per month and can't justify $20+/month for that frequency. Also podcasters with back catalogs who want to retroactively add show notes to old episodes — a one-time batch job, not an ongoing subscription.

### 2. Tools are over-featured for the show notes use case

**The gap:** Every competitor bundles show notes with social media post generation, blog writing, newsletter drafts, audiogram creation, video clips, and more. The cheapest plans still include all these features — you're paying for a content repurposing suite when all you want is show notes. The result is complex UIs, onboarding flows, and pricing that reflects the full suite, not the single feature.

**Who has this need:** Podcasters who already have their social media workflow figured out (or don't do social at all) and just want the tedious part automated: structured show notes with timestamps, a summary, and mentioned links. They don't need 15 output types — they need one, done well.

### 3. Markdown/plain-text export optimized for podcast hosting platforms

**The gap:** Most tools output formatted text designed for their own platform or generic copy-paste. None generate clean markdown pre-formatted for common podcast hosts (Buzzsprout, Podbean, Transistor, Anchor/Spotify). Podcasters still have to manually reformat the output to match their hosting platform's editor. A tool that outputs in the exact format their host expects — or even integrates with the host's API — would save a meaningful step.

**Who has this need:** Every podcaster using a hosting platform, which is all of them. The last-mile formatting step is friction that reduces the value of AI-generated notes.

### 4. SEO-aware show notes are gated behind expensive tiers

**The gap:** Keyword extraction, SEO-optimized descriptions, and structured metadata (chapter markers in Podcasting 2.0 format) are either missing entirely or locked behind $20+/month tiers. Indie podcasters who care about discoverability — and should care, since show notes are their primary SEO surface — can't access these features at their price point.

**Who has this need:** Growth-minded indie podcasters. Suki's observation from the meeting holds: podcasters skip show notes because they're tedious, and when they do write them, they don't optimize for SEO. A tool that automatically generates SEO-optimized notes at $2/episode would be directly revenue-relevant to these creators.

### 5. No tool handles the "mentioned links" problem well

**The gap:** When a podcast guest says "check out my website at..." or "we talked about this in a New York Times article from last week," existing tools transcribe the words but don't resolve them to actual clickable URLs. Manually hunting down every link mentioned in a 45-minute conversation is one of the most time-consuming parts of writing show notes. AI could do a second pass, identifying proper nouns and references, and attempting to resolve them to actual URLs via search.

**Who has this need:** Interview-format podcasters (the majority of indie shows). The guest mentions 5-10 resources per episode, and the host has to track them all down manually after recording. This is high-value automation that no competitor does well.

---

## Go/No-Go Recommendation

**Go.** The gap is real and exploitable. Every competitor is a content repurposing *suite* priced at $20-100/month, targeting professional creators. No one has built the simple version: upload audio, get show notes, pay $2. The indie podcaster segment (millions of shows, 85% unmonetized, publishing weekly or biweekly) is underserved not because the market is crowded, but because existing tools overshoot the need. A focused, pay-per-episode tool at $2-2.50/episode would undercut every competitor for low-frequency publishers, require zero commitment, and hit a price point where the decision is impulsive rather than deliberated. Yuki's revenue model (see `docs/revenue-model-analysis.md`) confirms the unit economics work at this price. The 2-3 day build estimate (Andrei, Meeting #3) makes this the lowest-risk first bet of the three product candidates.

---

## Uncertainties and Limitations

- **Podium's pricing is partially opaque.** Their pricing page returned 404 during research; pricing was reconstructed from third-party review sites and earlier search data. The $24/mo Creator plan and $6-9/hr pay-as-you-go rates may not be current. Confidence: medium.
- **Capsho's effective pricing is unclear.** The listed price is $99/mo, but a prominently displayed promo code reduces it to $59/mo. It's unclear whether this is a permanent discount or time-limited. Confidence: medium.
- **Conversion rate for pay-per-episode is unvalidated.** No competitor uses this model as their primary pricing, so there's no market data on conversion rates. The assumption that indie podcasters prefer per-episode over subscription is based on Suki's meeting observations and general SaaS pricing research, not validated user data. Recommend a soft launch with both per-episode and small bundle options to test.
- **Show notes quality is table stakes but hard to differentiate.** If Gemini-generated show notes aren't noticeably better than what Podsqueeze or Descript produce on their free tiers, the value prop becomes purely about pricing — which is a thin moat. Quality of output (especially timestamp accuracy and link resolution) must be a launch priority, not an afterthought.
- **Market size for "show notes only" is smaller than "content repurposing."** By deliberately scoping down to just show notes, we may cap the addressable market. This is the right call for v1 (ship small, learn fast), but expansion into additional output types (social posts, blog drafts) should be on the roadmap if the core product gets traction.

---

## Sources

| Source | URL | Accessed |
|---|---|---|
| Castmagic pricing page | https://www.castmagic.io/pricing | Feb 9, 2026 |
| Castmagic review (Kripesh Adwani) | https://kripeshadwani.com/castmagic-review/ | Feb 9, 2026 |
| Podium pricing (SaaSWorthy) | https://www.saasworthy.com/product/podium-ai/pricing | Feb 9, 2026 |
| Podium features | https://hello.podium.page/feature/ai-generated-show-notes | Feb 9, 2026 |
| Podsqueeze pricing page | https://podsqueeze.com/pricing/ | Feb 9, 2026 |
| Capsho pricing page | https://www.capsho.com/pricing | Feb 9, 2026 |
| Descript pricing page | https://www.descript.com/pricing | Feb 9, 2026 |
| Riverside pricing page | https://riverside.com/pricing | Feb 9, 2026 |
| Descript show notes review | https://www.descript.com/blog/article/the-best-ai-tools-for-podcast-show-notes-reviewed | Feb 9, 2026 |
| Indie podcaster monetization (Podnews) | https://podnews.net/update/not-monetising | Feb 9, 2026 |
| Podcast market stats (Business Research Insights) | https://www.businessresearchinsights.com/market-reports/podcast-market-118273 | Feb 9, 2026 |
| Yuki's revenue model (internal) | docs/revenue-model-analysis.md | Feb 9, 2026 |
| Custom Meeting #3 transcript (internal) | data/meetings/d9b62321-703f-4ff6-a7c3-6564c62a0e2b.json | Feb 9, 2026 |
