# SherlockPDF Technical Approach

**Author:** Andrei (Technical Architect)
**Date:** February 8, 2026
**Status:** Complete
**Inputs:** Thomas's requirements (`monetization-strategy-requirements.md`), existing PDF Splitter and Combiner tools, OST tool architecture reference

---

## Architecture Decisions

### Decision 1: Client-Side PDF Processing (Keep It)

**Decision: All PDF processing stays in the browser. No server-side processing in Phase 1.**

The existing tools use `pdf-lib` for manipulation and `PDF.js` for rendering. Both are mature, well-maintained libraries that handle merge and split operations without files ever leaving the user's machine.

**Why this is correct:**
- **Privacy is a real differentiator.** "Your files never leave your device" is a one-sentence selling point that competitors who upload to servers cannot match. This is marketing gold.
- **Zero infrastructure cost for PDF operations.** No file storage, no compute, no cleanup jobs, no S3 buckets. The only server costs are Stripe API calls and a lightweight Express server.
- **Already proven.** Both tools work today. We're consolidating, not rebuilding.
- **Scales infinitely.** 1 user or 100,000 users --- same server cost. Processing happens on the user's CPU.

**Phase 2 consideration:** Some power features (compression, format conversion) may need server-side processing. That's fine --- we'll add a processing API endpoint when those features are built. The client-side architecture doesn't prevent this; it just means Phase 1 is simpler.

**Libraries (already in use, no changes):**
- `pdf-lib@1.17.1` --- PDF creation, merging, splitting, page manipulation
- `pdf.js@3.11.174` --- PDF rendering for previews
- `JSZip@3.10.1` --- ZIP download for split pages
- `Sortable.js@1.15.6` --- drag-and-drop reordering in combiner

---

### Decision 2: No Auth System --- Stripe Customer Email Lookup

**Decision: No user accounts. No passwords. No sessions. Subscription status is checked by email against Stripe.**

This is the single most important decision for hitting the deadline. A proper auth system (even a simple one) adds days of work: registration UI, password hashing, session management, forgot-password flow, database. We have 5 days.

**How it works:**

1. Free users use the tools with no sign-up. Usage counter in localStorage tracks daily file count.
2. When a user hits a limit (25 files/day, 50MB file size, wants no branding), they see an upgrade prompt.
3. "Upgrade to Pro" redirects to Stripe Checkout (hosted). User enters email + payment info on Stripe's page.
4. After payment, Stripe redirects back to SherlockPDF with a `session_id` query parameter.
5. Our server calls `stripe.checkout.sessions.retrieve(session_id)` to get the customer email.
6. We store the email in localStorage as the "logged in" indicator.
7. On subsequent visits, user sees "Enter your email to unlock Pro" --- a single input field.
8. Our server calls `stripe.customers.list({ email })` then `stripe.subscriptions.list({ customer })` to check for an active subscription.
9. If active, the client stores a simple token (email + expiry timestamp) in localStorage and unlocks Pro features.

**What about abuse?**
- Someone could type someone else's email. This is a low risk at our scale. The email lookup only confirms "is there an active subscription for this email?" --- it doesn't expose any data.
- If this becomes a problem in Phase 2, we add email verification (magic link). But for MVP, this is fine.

**What about the Stripe Customer Portal?**
- Pro users get a "Manage Subscription" link that creates a Stripe Customer Portal session. Stripe handles cancellation, payment method updates, and invoice history. Zero custom UI needed.

**Server endpoints needed (3 total):**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/checkout` | POST | Creates a Stripe Checkout session, returns the URL |
| `GET /api/status?email=X` | GET | Looks up subscription status by email, returns `{ active: boolean, plan: string }` |
| `POST /api/portal` | POST | Creates a Stripe Customer Portal session, returns the URL |

That's it. Three endpoints. Howard and Jonah can build this in a few hours.

---

### Decision 3: Separate Directory, Same Repo

**Decision: SherlockPDF lives in `/sherlockpdf/` within the teamhq repo. It is a self-contained app with its own `package.json`.**

**Structure:**
```
teamhq/
  sherlockpdf/
    index.html          # Main app (single HTML file for tools UI)
    css/
      styles.css        # Extracted styles (shared tokens + app-specific)
    js/
      app.js            # Main application logic
      tools/
        merge.js        # Merge tool logic (from pdf-combiner)
        split.js         # Split tool logic (from pdf-splitter)
      paywall.js        # Free/Pro gating, usage tracking, upgrade prompts
      auth.js           # Email-based Stripe status check
    server/
      package.json      # Express server dependencies (stripe, express, cors)
      index.ts          # Express server with 3 Stripe endpoints
      stripe.ts         # Stripe SDK wrapper
    img/
      logo.svg          # SherlockPDF logo (or reuse Sherlock Labs logo initially)
```

**Why same repo, separate directory:**
- Keeps everything together for the team to work on. One `git clone`, one PR.
- Follows the pattern already established by `pdf-splitter/`, `pdf-combiner/`, and `ost-tool/`.
- SherlockPDF can have its own `package.json` for server dependencies without polluting the root.
- Deployment can pull just this directory.

**Why not a separate repo:**
- Overhead. Separate repo means separate PRs, separate CI, separate permissions. For a 5-day sprint, this is wasted motion.
- The team is already working in teamhq. Don't make them context-switch.
- We can extract to a separate repo later if the product grows. That's a 30-minute operation.

---

### Decision 4: Plain HTML/JS --- No React, No Build Step for Frontend

**Decision: The SherlockPDF frontend is plain HTML, CSS, and vanilla JavaScript. No React. No Vite. No build step for the client.**

**Why:**
- **The existing tools are plain HTML/JS and they work.** We're consolidating two working tools into one interface. Rewriting them in React adds zero user value and costs 1-2 days.
- **No build step = deploy by copying files.** Upload HTML/CSS/JS to any static host and it works. No `npm run build`, no Webpack, no Vite config, no bundle optimization.
- **Faster iteration.** Edit a file, refresh the browser. Alice can move at maximum speed.
- **The UI is simple.** It's a tool selector, a file upload zone, and results. This is not a complex SPA with routing, state management, and component trees. Vanilla JS handles this cleanly.

**The server is separate.** The Express server that handles Stripe endpoints is a Node.js app with its own `package.json`. It has a build step (TypeScript). But the frontend is static files that make `fetch()` calls to the server API.

**CDN libraries (same approach as existing tools):**
- pdf-lib, PDF.js, JSZip, Sortable.js loaded via CDN `<script>` tags
- No npm dependencies on the frontend

---

### Decision 5: File Limit Enforcement --- Client-Side for MVP

**Decision: The 25 files/day limit is enforced client-side via localStorage. This is sufficient for MVP.**

**How it works:**
- Each time a user processes a file (merge or split), increment a counter in localStorage keyed to today's date: `sherlockpdf_usage_YYYY-MM-DD`.
- When the counter hits 25, show the upgrade prompt instead of processing.
- Pro users (identified by their stored email + active subscription check) bypass the counter entirely.

**Yes, this is bypassable.** A technical user can clear localStorage and start over. This is acceptable because:
1. The people who would do this are not our target customers. Our target is someone who hits the limit and thinks "I'd rather pay $9/month than deal with this."
2. The 25/day limit is generous. Most casual users won't hit it. Power users who hit it daily are exactly the conversion target.
3. Server-side enforcement requires auth, which we decided against for Phase 1 (Decision 2).
4. The other paywall gates (file size limit, output branding, batch processing) are harder to circumvent client-side and provide additional conversion pressure.

**File size enforcement (50MB free, 200MB Pro):**
- Checked client-side before processing. `file.size` is reliable and not easily spoofed.
- Pro users get the 200MB limit after email verification.

**Output branding ("Powered by SherlockPDF"):**
- Added to merged/split PDFs for free users via `pdf-lib` text drawing.
- Pro users skip the branding step.
- This is the stickiest paywall gate --- professionals will pay to remove branding.

---

### Decision 6: Deployment --- Cloudflare Pages + Railway

**Decision: Static frontend on Cloudflare Pages. Express API server on Railway.**

**Frontend (Cloudflare Pages):**
- Free tier is generous (unlimited bandwidth, 500 builds/month).
- Custom domain support (`pdf.sherlocklabs.ai`).
- Global CDN --- fast everywhere.
- No build step needed --- just point at the `/sherlockpdf/` directory.
- Automatic HTTPS.

**API Server (Railway):**
- Simple Express server with 3 endpoints. Railway's Hobby plan ($5/month) handles this easily.
- Supports Node.js natively. Push to deploy.
- Environment variables for Stripe keys.
- Alternative: Render, Fly.io, or even Vercel serverless functions. Railway is the simplest for a small Express server.

**DNS:**
- `pdf.sherlocklabs.ai` points to Cloudflare Pages (frontend).
- `api.pdf.sherlocklabs.ai` points to Railway (API server). Or use a `/api` path prefix with Cloudflare Workers to proxy --- simpler CORS story.

**Phase 2 option:** If we want to simplify, move the 3 API endpoints to Cloudflare Workers (serverless). Eliminates the Railway server entirely. But for MVP, a running Express server is easier to debug and iterate on.

---

### Decision 7: Stripe Configuration

**Decision: Use Stripe Checkout (hosted), Stripe Billing, Stripe Tax, and Stripe Customer Portal. Howard owns this.**

**Products and Prices (Howard sets up in Stripe Dashboard or via API):**

| Product | Price ID | Amount | Interval |
|---------|----------|--------|----------|
| SherlockPDF Pro | `price_monthly` | $9.00/month | Monthly |
| SherlockPDF Pro | `price_annual` | $84.00/year ($7/month) | Yearly |

**Checkout Session creation parameters:**
```
mode: 'subscription'
line_items: [{ price: price_id, quantity: 1 }]
automatic_tax: { enabled: true }
customer_email: (pre-fill if known)
success_url: 'https://pdf.sherlocklabs.ai/?session_id={CHECKOUT_SESSION_ID}'
cancel_url: 'https://pdf.sherlocklabs.ai/'
```

**Webhooks to handle:**
- `checkout.session.completed` --- new subscription created
- `customer.subscription.updated` --- plan change, renewal
- `customer.subscription.deleted` --- cancellation

For MVP, we primarily need `checkout.session.completed` to confirm payment went through. The subscription status endpoint (`GET /api/status`) does a live check against Stripe's API, so we don't strictly need to maintain our own database of subscriptions. Webhooks are a safety net and useful for future analytics.

**Stripe Customer Portal:**
- Enable via Stripe Dashboard. Configure to allow: cancel subscription, update payment method, view invoices.
- Server creates a portal session via `stripe.billingPortal.sessions.create({ customer })` and returns the URL.

**Stripe Tax:**
- Enable automatic tax collection in Stripe Dashboard.
- Set `automatic_tax.enabled = true` on Checkout sessions.
- Stripe handles tax calculation for all supported jurisdictions. We don't need to build anything.

---

## App Architecture

### Unified Tool Interface

The existing Splitter and Combiner are separate `index.html` files with duplicated CSS and similar UX patterns. SherlockPDF consolidates them into a single app with a tool selector.

**UI Flow:**
1. Landing state: user sees two tool cards --- "Merge PDFs" and "Split PDF" (and future tools in Phase 2).
2. User clicks a tool card.
3. Tool UI loads (same upload zone pattern, same results pattern).
4. "Back to tools" link returns to the selector.

This is not SPA routing. It's showing/hiding `<div>` sections with vanilla JS. Simple.

**Shared code extraction:**
- Upload zone (drag-and-drop, file validation) is identical between tools --- extract to a shared module.
- File processing helpers (formatFileSize, escapeHTML, triggerDownload) --- shared.
- PDF preview rendering (pdf.js canvas) --- shared.
- Paywall checks wrap each tool's processing function.

### Paywall Integration Points

The paywall hooks into the processing pipeline at specific points:

1. **Before file processing:** Check daily usage counter. If >= 25 and not Pro, show upgrade prompt.
2. **Before file acceptance:** Check file size. If > 50MB and not Pro, show upgrade prompt with size limit message.
3. **During output generation:** If not Pro, add "Powered by SherlockPDF" text to output PDFs.
4. **Batch processing:** If not Pro, limit to single-file operations. Pro users can upload multiple files at once for batch merge.

### Data Flow

```
User selects tool
  -> Uploads file(s)
    -> Paywall check (file count, file size)
      -> PASS: Process client-side with pdf-lib
        -> Paywall check (branding)
          -> Free: Add branding to output
          -> Pro: Clean output
        -> Trigger download
      -> FAIL: Show upgrade prompt
        -> "Upgrade to Pro" button
          -> POST /api/checkout (server creates Stripe Checkout session)
          -> Redirect to Stripe Checkout (hosted page)
          -> Payment complete -> redirect back with session_id
          -> Server verifies session, returns customer email
          -> Store email in localStorage
          -> Unlock Pro features
```

---

## Server Implementation

### Tech Stack
- **Runtime:** Node.js 20+
- **Framework:** Express 5 (already used in teamhq server)
- **Language:** TypeScript (compiled with `tsc`, run with `tsx` in dev)
- **Stripe SDK:** `stripe` npm package (latest)
- **CORS:** `cors` npm package (allow requests from `pdf.sherlocklabs.ai`)

### Server Code Structure

```
sherlockpdf/server/
  package.json
  tsconfig.json
  src/
    index.ts          # Express app setup, CORS, webhook endpoint
    routes/
      checkout.ts     # POST /api/checkout
      status.ts       # GET /api/status
      portal.ts       # POST /api/portal
    stripe.ts         # Stripe client initialization
```

### Environment Variables

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_ANNUAL=price_...
CLIENT_URL=https://pdf.sherlocklabs.ai
PORT=3003
```

### API Contract

**POST /api/checkout**
```
Request:  { priceId: "monthly" | "annual", email?: string }
Response: { url: string }  // Stripe Checkout URL to redirect to
```

**GET /api/status?email=user@example.com**
```
Response: { active: boolean, plan: "monthly" | "annual" | null, customerId: string | null }
```

**POST /api/portal**
```
Request:  { email: string }
Response: { url: string }  // Stripe Customer Portal URL
```

**POST /api/webhook** (Stripe webhook, raw body)
```
Stripe sends events directly. Server verifies signature and logs.
```

---

## Implementation Plan (for Alice, Howard, Jonah)

### Day 1 (Today): Architecture + Design

- Andrei: This document (done).
- Robert: Design spec for unified tool UI, paywall UX, upgrade flow.

### Day 2: API Contract + Stripe Setup + Frontend Scaffold

**Howard (Stripe):**
- Create Stripe products and prices (Dashboard or API).
- Enable Stripe Tax in Dashboard.
- Configure Stripe Customer Portal.
- Set up webhook endpoint in Stripe Dashboard.

**Jonah (Backend):**
- Scaffold Express server in `sherlockpdf/server/`.
- Implement 3 API endpoints (checkout, status, portal).
- Implement webhook handler.
- Test with Stripe CLI (`stripe listen --forward-to localhost:3003/api/webhook`).

**Alice (Frontend):**
- Create `sherlockpdf/index.html` with tool selector UI.
- Extract and consolidate merge tool from `pdf-combiner/index.html`.
- Extract and consolidate split tool from `pdf-splitter/index.html`.
- Implement shared upload zone, file processing, download helpers.

### Day 3: Integration + Paywall

**Alice (Frontend):**
- Implement paywall module (usage counter, size check, branding injection).
- Implement upgrade prompt UI.
- Implement email input for Pro unlock.
- Wire up API calls to server endpoints.
- Implement success redirect handling (parse `session_id` from URL).

**Howard + Jonah (Backend):**
- Complete Stripe integration testing.
- Test full checkout flow with Stripe test mode.
- Test subscription status lookup.
- Test Customer Portal session creation.

### Day 4: Polish + Design Review

**Alice:**
- Final UI polish, responsive layout.
- Handle edge cases (network errors, Stripe errors, expired subscriptions).

**Robert:**
- Lightweight design review against spec.
- Flag any issues for Alice to fix.

**Deploy to staging:**
- Frontend to Cloudflare Pages (preview branch).
- Server to Railway (staging environment).

### Day 5: QA + Ship

**Enzo (QA):**
- Full test plan execution.
- Test free tier limits, Pro upgrade flow, Stripe payment, subscription management.
- Test on mobile browsers.
- Pass/fail verdict.

**Ship:**
- Point `pdf.sherlocklabs.ai` DNS to Cloudflare Pages.
- Point API subdomain to Railway.
- Switch Stripe to live mode.
- Verify end-to-end payment flow in production.

---

## What I'm NOT Building

To be explicit about scope boundaries:

- **No database.** Stripe is the source of truth for subscriptions. localStorage is the source of truth for usage tracking. No Postgres, no SQLite, no Redis.
- **No user accounts.** No registration, no passwords, no sessions, no JWT. Email-based Stripe lookup only.
- **No server-side PDF processing.** All PDF operations run in the browser.
- **No custom payment UI.** Stripe Checkout (hosted) handles the payment form. We redirect to Stripe's page.
- **No admin dashboard.** Stripe Dashboard is the admin interface for subscriptions, revenue, and customer management.
- **No analytics beyond Stripe.** Stripe Dashboard shows MRR, subscriber count, churn. Good enough for Phase 1.
- **No CI/CD pipeline.** Manual deploy for Phase 1. Cloudflare Pages auto-deploys from git, Railway auto-deploys from git. That's sufficient.
- **No tests for the frontend.** The frontend is vanilla JS with no build step. Manual testing + QA is the right approach for a 5-day sprint. Jonah should write basic tests for the 3 server endpoints.

---

## Phase 2 Technical Hooks

Decisions made here don't prevent Phase 2 features:

- **Adding tools** (compress, convert, reorder, password protect): Add new JS modules in `js/tools/`, add cards to the tool selector. Same pattern as merge/split.
- **Server-side processing** (for compression, OCR): Add new endpoints to the Express server. Frontend sends files via `FormData`, server processes, returns result. The client-side architecture doesn't block this.
- **Real auth** (magic link, OAuth): Replace the email-only status check with a proper auth flow. The server endpoints already accept email --- we just add verification on top.
- **Custom Stripe Elements checkout:** Replace the Stripe Checkout redirect with an embedded payment form. The backend endpoint stays the same; only the frontend changes.
- **Team tier:** Add a new Stripe product/price. Add seat management endpoints. The subscription status check already returns the plan type.

---

## Risk Acknowledgment

| Risk | My Assessment |
|------|--------------|
| localStorage limits are too easy to bypass | Acceptable for MVP. The 50MB size limit, output branding, and batch restriction are harder to bypass and create sufficient conversion pressure. |
| Email-only "auth" feels flimsy | It is. But it ships in 1 day instead of 3. Phase 2 adds magic link verification. For now, the worst case is someone checks if another email has a subscription --- which tells them nothing useful. |
| No database means no usage analytics | Correct. Stripe Dashboard gives us revenue metrics. For user behavior analytics, we add something lightweight in Phase 2 (Plausible, Umami, or a simple event logger). |
| Cloudflare Pages + Railway = two deploy targets | Slightly more complex than a single platform. But Cloudflare Pages is free and Railway is $5/month. The alternative (Vercel for both) works too but costs more for the server component. |

---

## Summary

SherlockPDF Phase 1 is architecturally simple by design:

- **Frontend:** Static HTML/CSS/JS files. No build step. Client-side PDF processing. CDN-hosted libraries.
- **Backend:** 3 Express endpoints for Stripe. TypeScript. Runs on Railway.
- **Auth:** Email-based Stripe customer lookup. No accounts, no passwords.
- **Payments:** Stripe Checkout (hosted), Stripe Billing, Stripe Tax, Stripe Customer Portal.
- **Deployment:** Cloudflare Pages (frontend) + Railway (API).
- **Data:** localStorage for usage tracking. Stripe for subscription data. No database.

This is a week's worth of work for 3 builders (Alice, Howard, Jonah) with design support from Robert and QA from Enzo. The architecture is deliberately minimal to hit the deadline, and every decision includes a clear upgrade path for Phase 2.

Clock is ticking. Let's build.
