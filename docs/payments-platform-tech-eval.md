# Payment Platform Technical Evaluation

**Author:** Marco (Technical Researcher)
**Date:** 2026-02-08
**Status:** Complete

---

## Executive Summary

This document evaluates five payment/commerce platforms from a technical/engineering perspective: **Stripe**, **Paddle**, **Lemon Squeezy**, **Polar**, and **Whop** — plus brief notes on FastSpring and Shopify Storefront API. Each platform is assessed on API quality, SDK availability, webhook reliability, checkout options, sandbox/test environments, MCP server availability, and fit with our stack (Vite+React frontend, Express backend, vanilla HTML tools).

**Bottom line:** Stripe is the most technically capable and flexible platform by a wide margin. Paddle and Polar are strong alternatives when merchant-of-record (MoR) is a requirement. Lemon Squeezy (now Stripe-owned) is simpler but limited. Whop targets a niche market. The right choice depends on whether we need MoR tax handling or want maximum control.

---

## Platform Evaluations

### 1. Stripe

**Overview:** The industry standard for payment processing. Provides raw payment infrastructure — you are the merchant of record. Maximum flexibility and control, but you handle tax compliance.

#### API Quality
- **Protocol:** REST, resource-oriented URLs, form-encoded requests, JSON responses
- **Versioning:** Explicit API versions (rolling + pinned). New v2 namespace for improved idempotency
- **Documentation:** Gold standard. Three-column layout with live code execution (Stripe Shell). Interactive API explorer, copy-paste-ready examples in 8+ languages
- **Consistency:** Extremely consistent resource patterns (create, retrieve, update, delete, list). Predictable pagination, filtering, expanding relationships
- **Error handling:** Structured error objects with type, code, message, and param fields

#### SDK Availability
- **Server-side:** `stripe` npm package — full-featured, TypeScript-first, actively maintained
- **Client-side:** `@stripe/stripe-js` (Stripe.js loader), `@stripe/react-stripe-js` (React bindings with hooks and components)
- **React components:** `<Elements>`, `<PaymentElement>`, `<CheckoutProvider>`, `<ExpressCheckoutElement>` — all first-party
- **Install:** `npm install stripe @stripe/stripe-js @stripe/react-stripe-js`

#### Webhook Reliability
- **Retry logic:** Automatic retries for up to 3 days with exponential backoff
- **Signature verification:** HMAC-SHA256 via `stripe.webhooks.constructEvent()`
- **Event types:** 300+ event types covering every resource lifecycle
- **Critical Express.js detail:** Must use `express.raw({ type: 'application/json' })` on the webhook route — if `express.json()` middleware runs first, signature verification fails

#### Checkout Options

| Mode | Description |
|------|-------------|
| **Hosted Checkout** | Redirect to `checkout.stripe.com`. Zero frontend code needed. |
| **Embedded Checkout** | `ui_mode: "custom"` — renders Payment Element in your page via React components |
| **Custom (API-only)** | PaymentIntents API + Elements for full control over every pixel |
| **Express Checkout** | One-click buttons (Apple Pay, Google Pay, PayPal, Link) |

#### Code Example: Express Backend + React Frontend

**Server (Express):**
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require('express');
const app = express();

app.post('/create-checkout-session', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'custom',
    line_items: [{ price: 'price_xxx', quantity: 1 }],
    mode: 'payment',
    return_url: `${process.env.DOMAIN}/complete?session_id={CHECKOUT_SESSION_ID}`,
    automatic_tax: { enabled: true },
  });
  res.json({ clientSecret: session.client_secret });
});

// Webhook endpoint — MUST use raw body
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

  switch (event.type) {
    case 'checkout.session.completed':
      // Fulfill order
      break;
    case 'customer.subscription.updated':
      // Update subscription status
      break;
  }
  res.json({ received: true });
});

app.listen(4242);
```

**Client (React):**
```jsx
import { loadStripe } from '@stripe/stripe-js';
import { CheckoutProvider, PaymentElement } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PK);

function App() {
  const fetchClientSecret = () =>
    fetch('/create-checkout-session', { method: 'POST' })
      .then(r => r.json())
      .then(d => d.clientSecret);

  return (
    <CheckoutProvider stripe={stripePromise} options={{ clientSecret: fetchClientSecret() }}>
      <PaymentElement />
      <button onClick={() => checkout.confirm()}>Pay</button>
    </CheckoutProvider>
  );
}
```

#### Test Mode / Sandbox
- **Test mode:** Separate API keys (pk_test / sk_test). All API calls work identically, no real money moves
- **Sandboxes:** Isolated environments with separate data, settings, and API keys (recommended over basic test mode)
- **Test clocks:** Programmatically advance time to test subscription billing cycles without waiting
- **Test cards:** Extensive set — `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (decline), 3DS cards, international cards
- **CLI:** `stripe listen --forward-to localhost:4242/webhook` for local webhook testing

#### MCP Server
- **Official:** Yes. First-party Stripe MCP server
- **Setup:** `claude mcp add --transport http stripe https://mcp.stripe.com/`
- **Capabilities:** 20+ tools — create products/prices, manage customers/subscriptions, process refunds, search documentation
- **Auth:** OAuth or API keys. Supports restricted keys for security

#### Fit With Our Stack
- **Vite+React:** Excellent. First-party React components, hooks, and TypeScript types
- **Express:** Excellent. `stripe` npm package designed for Node.js/Express
- **Vanilla HTML tools:** Good. Can use Stripe.js directly with `<script>` tag and `data-` attributes

#### Time to First Payment
~30 minutes for hosted checkout (redirect). ~1-2 hours for embedded checkout with React. ~3-4 hours for fully custom checkout with PaymentIntents.

---

### 2. Paddle

**Overview:** Merchant of record for SaaS. Handles global sales tax, VAT, and compliance. You sell through Paddle — they remit to you. Strong developer experience, focused on subscriptions.

#### API Quality
- **Protocol:** REST, JSON request/response bodies
- **Versioning:** Paddle Billing (v2) is the current API — distinct from legacy "Paddle Classic"
- **Documentation:** Well-structured at `developer.paddle.com`. Clear guides, API reference, changelog
- **Consistency:** Good resource patterns. Uses cursor-based pagination
- **Error handling:** Structured error responses with codes and details

#### SDK Availability
- **Server-side:** `@paddle/paddle-node-sdk` — official, TypeScript, covers full API
- **Client-side:** `@paddle/paddle-js` — ES module wrapper for Paddle.js with TypeScript support
- **React:** No official React components, but Paddle.js works in React via `window.Paddle` or the community `paddle-checkout-react` package
- **Install:** `npm install @paddle/paddle-node-sdk @paddle/paddle-js`

#### Webhook Reliability
- **Retry logic:** Automatic retries with backoff
- **Signature verification:** `Paddle-Signature` header, verified via SDK's `unmarshal()` function
- **Event types:** Comprehensive — subscription lifecycle, transaction events, payment method updates
- **Express.js detail:** Must use `express.raw()` middleware on webhook route (same pattern as Stripe)

#### Checkout Options

| Mode | Description |
|------|-------------|
| **Overlay** | Paddle.js opens a modal on your page. Recommended for getting started. |
| **Inline** | Embedded checkout rendered in a `<div>` on your page. More branded. |
| **No hosted redirect** | Unlike Stripe/LS, Paddle does not offer a redirect-to-hosted-page option. Checkout is always on your domain. |

#### Code Example: Overlay Checkout

**HTML/JS (works in vanilla or React):**
```html
<script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>
<script>
  Paddle.Initialize({
    token: 'live_7d279f61a3499fed520f7cd8c08',
    checkout: {
      settings: {
        displayMode: 'overlay',
        theme: 'dark',
        locale: 'en'
      }
    }
  });

  function openCheckout() {
    Paddle.Checkout.open({
      items: [{ priceId: 'pri_01gsz8x8sawmvhz1pv30nge1ke', quantity: 1 }],
      customer: { email: 'customer@example.com' }
    });
  }
</script>
<button onclick="openCheckout()">Subscribe</button>
```

**Server-side webhook handling (Express):**
```javascript
const { Environment, Paddle } = require('@paddle/paddle-node-sdk');

const paddle = new Paddle(process.env.PADDLE_API_KEY, {
  environment: Environment.sandbox,
});

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['paddle-signature'];
  const event = paddle.webhooks.unmarshal(
    req.body.toString(),
    process.env.PADDLE_WEBHOOK_SECRET,
    signature
  );

  switch (event.eventType) {
    case 'subscription.activated':
      // Grant access
      break;
    case 'subscription.canceled':
      // Revoke access
      break;
  }
  res.sendStatus(200);
});
```

#### Test Mode / Sandbox
- **Sandbox:** Completely separate environment at `sandbox-api.paddle.com` with its own account, data, and API keys
- **Test cards:** Standard test card numbers (Stripe-style). Cannot use real cards in sandbox
- **Time simulation:** Can pull forward subscription billing dates to test renewals in minutes instead of waiting months
- **Sandbox API keys:** Created after May 2025 contain `_sdbx` prefix for easy identification

#### MCP Server
- **Official:** Yes. `@paddle/paddle-mcp` npm package (released March 2025)
- **Setup:** `claude mcp add-json "paddle" '{"command":"npx","args":["-y","@paddle/paddle-mcp","--api-key=KEY","--environment=sandbox"]}'`
- **Capabilities:** Manage product catalog, billing, subscriptions, and reports

#### Fit With Our Stack
- **Vite+React:** Good. No official React components, but Paddle.js works via `window.Paddle` or ES module import. The overlay checkout is straightforward
- **Express:** Good. Official Node.js SDK for server-side operations and webhook handling
- **Vanilla HTML tools:** Excellent. Paddle.js is a simple `<script>` tag + `Paddle.Checkout.open()` — ideal for plain HTML

#### Time to First Payment
~15-20 minutes for overlay checkout. ~1 hour for inline checkout with customization. No redirect option — checkout is always on your domain.

---

### 3. Lemon Squeezy

**Overview:** Merchant of record aimed at creators and indie developers. Acquired by Stripe in July 2024. Simpler than Paddle, fewer customization options. Handles tax, licensing, and digital delivery.

#### API Quality
- **Protocol:** REST, JSON:API spec (includes `type`, `id`, `attributes`, `relationships`). Base URL: `https://api.lemonsqueezy.com/v1/`
- **Versioning:** Single version (v1). No versioning strategy documented
- **Documentation:** Decent at `docs.lemonsqueezy.com`. Organized by resource type. Less polished than Stripe/Paddle
- **Consistency:** JSON:API format is consistent but verbose. Requires `Accept: application/vnd.api+json` and `Content-Type: application/vnd.api+json` headers
- **Error handling:** Standard HTTP status codes with JSON:API error objects

#### SDK Availability
- **Server-side:** `@lemonsqueezy/lemonsqueezy.js` — 59 API functions, TypeScript, tree-shakeable. **Server-side only** — do not use in browser (exposes API key)
- **Client-side:** Lemon.js — a 2.3kB script for checkout overlays. CDN only, not npm
- **React:** No official React components. Use Lemon.js via `<script>` tag
- **Install:** `npm install @lemonsqueezy/lemonsqueezy.js` (server), CDN `<script>` (client)

#### Webhook Reliability
- **Retry logic:** Automatic retries (details not extensively documented)
- **Signature verification:** HMAC-SHA256 via `X-Signature` header. Manual verification with `crypto.timingSafeEqual()`
- **Event types:** Core events — order_created, subscription_created/updated/cancelled, license_key_created
- **Express.js gotcha:** Must use `bodyParser.text({ type: '*/*' })` on webhook route — `bodyParser.json()` alters the body and breaks signature verification
- **Webhook simulation:** Dashboard allows simulating individual webhook events in test mode

#### Checkout Options

| Mode | Description |
|------|-------------|
| **Hosted** | Redirect to Lemon Squeezy checkout page |
| **Overlay** | Lemon.js opens a modal overlay on your page |
| **No custom/embedded** | Cannot embed payment fields directly in your page |

#### Code Example: Overlay Checkout

**Client-side (HTML):**
```html
<script src="https://app.lemonsqueezy.com/js/lemon.js" defer></script>

<!-- Automatic: any link with this class opens overlay checkout -->
<a class="lemonsqueezy-button" href="https://yourstore.lemonsqueezy.com/checkout/buy/xxx">
  Buy Now
</a>
```

**Server-side checkout creation:**
```javascript
import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js';

lemonSqueezySetup({ apiKey: process.env.LEMON_SQUEEZY_API_KEY });

const { data, error } = await createCheckout('store_id', 'variant_id', {
  checkoutData: {
    email: 'customer@example.com',
    custom: { user_id: '123' },
  },
});
// data.data.attributes.url → redirect URL or use with Lemon.js overlay
```

**Webhook verification (Express):**
```javascript
const crypto = require('crypto');

app.post('/webhook', express.text({ type: '*/*' }), (req, res) => {
  const secret = process.env.LS_WEBHOOK_SECRET;
  const hmac = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  const signature = req.headers['x-signature'];

  if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature))) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body);
  // Handle event...
  res.sendStatus(200);
});
```

#### Test Mode / Sandbox
- **Test mode:** Built-in toggle. Separate API keys, products, and data for test vs. live
- **Test cards:** Standard test card numbers for simulating purchases
- **Products:** Test mode products don't transfer to live — must use "Copy to Live Mode" feature
- **Webhook simulation:** Can manually trigger subscription webhook events from dashboard

#### MCP Server
- **Community-built:** No official MCP server. Third-party options exist (`lemonsqueezy-mcp-server` on GitHub) but not maintained by Lemon Squeezy
- **Setup:** Via `npx` with community packages — reliability varies

#### Fit With Our Stack
- **Vite+React:** Adequate. No React components. Lemon.js overlay works but feels less integrated
- **Express:** Good. The JS SDK covers server-side operations well
- **Vanilla HTML tools:** Good. Lemon.js is just a `<script>` tag + CSS class on an anchor — very simple

#### Time to First Payment
~10-15 minutes for hosted checkout redirect. ~20 minutes for overlay. No embedded option.

#### Concerns
- **Stripe acquisition:** Future uncertain. May be merged into Stripe or deprecated. No public roadmap post-acquisition
- **JSON:API format:** Verbose compared to standard JSON REST. More boilerplate per request
- **Limited customization:** Cannot control the checkout UI beyond basic branding

---

### 4. Polar

**Overview:** Open-source billing platform for developers. Merchant of record. Built specifically for software monetization (SaaS, digital products, license keys). Cheapest MoR fees.

#### API Quality
- **Protocol:** REST, standard JSON request/response
- **Versioning:** Single version, actively evolving (still relatively new)
- **Documentation:** Available at `docs.polar.sh` and `polar.apidocumentation.com`. Clean but less comprehensive than Stripe/Paddle
- **Consistency:** Standard CRUD patterns. Well-typed responses
- **Error handling:** HTTP status codes with structured error bodies (422 for validation, 404 for not found)

#### SDK Availability
- **Server-side:** `@polar-sh/sdk` — TypeScript SDK with async iteration, tree-shakeable standalone functions
- **Client-side:** `@polar-sh/checkout` — embedded checkout component
- **Framework adapters:** `@polar-sh/nextjs` — Next.js-specific helpers for checkout and webhooks
- **No React adapter for non-Next.js apps** — would need to use the SDK directly in Express+React
- **Install:** `npm install @polar-sh/sdk @polar-sh/checkout`

#### Webhook Reliability
- **Retry logic:** Documented retry behavior
- **Signature verification:** Webhook secret-based verification via SDK helpers
- **Event types:** Core events for subscriptions, checkouts, and orders
- **Framework support:** Next.js has a built-in `Webhooks()` handler; Express requires manual setup

#### Checkout Options

| Mode | Description |
|------|-------------|
| **Hosted** | Redirect to Polar checkout page |
| **Embedded** | `PolarEmbedCheckout.create()` renders checkout in your page |
| **API-driven** | Create checkout sessions programmatically, get redirect URLs |

#### Code Example: Checkout with Express

**Server-side:**
```typescript
import { Polar } from '@polar-sh/sdk';

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
});

app.post('/create-checkout', async (req, res) => {
  const checkout = await polar.checkouts.create({
    products: [process.env.POLAR_PRODUCT_ID],
    customerEmail: req.body.email,
    successUrl: `${process.env.DOMAIN}/success`,
  });
  res.json({ url: checkout.url });
});
```

**Client-side embedded checkout:**
```javascript
import { PolarEmbedCheckout } from '@polar-sh/checkout/embed';

const checkout = await PolarEmbedCheckout.create('https://polar.sh/checkout/xxx', 'dark');
```

#### Test Mode / Sandbox
- **Sandbox:** Completely separate environment at `sandbox.polar.sh`
- **Test payments:** Uses Stripe's test card numbers under the hood
- **Isolation:** Separate accounts, organizations, products, and API keys
- **Unlimited test accounts:** Can create as many sandbox orgs as needed

#### MCP Server
- **Not available:** No official or community MCP server found

#### Fit With Our Stack
- **Vite+React:** Adequate. No React components for non-Next.js. The embedded checkout works but requires manual integration
- **Express:** Good. SDK works well server-side. No Express-specific helpers (Next.js-focused)
- **Vanilla HTML tools:** Limited. Hosted checkout redirect is the simplest path

#### Time to First Payment
~20-30 minutes for hosted checkout. ~1 hour for embedded checkout integration.

#### Concerns
- **Next.js-centric:** Framework adapters and examples heavily favor Next.js. Express+React is supported but less documented
- **Younger platform:** Less battle-tested than Stripe/Paddle. Smaller community
- **Feature gaps:** Fewer payment methods, less international coverage than Stripe/Paddle

---

### 5. Whop

**Overview:** Marketplace-first platform for selling digital products, memberships, and SaaS. Not a pure payment processor — it's a distribution platform with built-in payments.

#### API Quality
- **Protocol:** REST API
- **Documentation:** Available at `docs.whop.com`. Organized around guides and use cases
- **Scope:** More limited than Stripe/Paddle — focused on memberships, product access, and the Whop marketplace ecosystem

#### SDK Availability
- **Server-side:** `@whop/sdk` (npm), Python SDK (`whop-sdk`), Ruby SDK (`whop_sdk`)
- **Client-side:** `WhopCheckoutEmbed` React component for embedded checkouts
- **Install:** `npm install @whop/sdk`

#### Checkout Options
- **Checkout links:** Shareable URLs to Whop-hosted checkout
- **Embedded checkout:** `WhopCheckoutEmbed` React component renders in your page

#### Pricing
- Free to start, 2.7% + $0.30 per transaction — competitive base rate
- 100+ payment methods including cryptocurrency

#### MCP Server
- **Not available**

#### Fit With Our Stack
- Fair. React component available but Whop's model (marketplace-first) may not fit our product architecture. Better suited for community/membership products sold through the Whop marketplace.

#### Time to First Payment
~15 minutes for checkout links. ~30-45 minutes for embedded checkout.

---

### 6. Brief Notes: Other Platforms

#### FastSpring
- **MoR:** Yes — handles tax compliance globally
- **Checkout:** Popup storefront (iframe-based), full-page storefront, or embedded
- **API:** REST API with "Store Builder Library" (SBL) JavaScript for client-side
- **SDKs:** No official Node.js/JS SDK. API-only integration
- **Target:** Software/SaaS companies. Enterprise-leaning
- **MCP Server:** Not available
- **Verdict:** Functional but developer experience is dated compared to Paddle/Stripe. Less relevant for our stack

#### Shopify Storefront API
- **Purpose:** Headless commerce — build custom storefronts on top of Shopify's commerce engine
- **API:** GraphQL (Storefront API) + REST (Admin API)
- **SDK:** `@shopify/hydrogen` (React framework), `@shopify/shopify-api` (Node.js)
- **Target:** E-commerce/physical goods. Overkill for digital products/SaaS
- **MCP Server:** Not available for Storefront API
- **Verdict:** Wrong tool for software monetization. Best for physical product storefronts

---

## Comparison Matrix

### Feature Comparison

| Feature | Stripe | Paddle | Lemon Squeezy | Polar | Whop |
|---------|--------|--------|----------------|-------|------|
| **Merchant of Record** | No (you are MoR) | Yes | Yes | Yes | Yes |
| **Tax Handling** | Via Stripe Tax (add-on) | Included | Included | Included | Included |
| **API Protocol** | REST (JSON) | REST (JSON) | REST (JSON:API) | REST (JSON) | REST |
| **API Docs Quality** | Best in class | Very good | Good | Good | Adequate |
| **Node.js SDK** | Official, excellent | Official, good | Official, good | Official, good | Official, basic |
| **React Components** | Official, excellent | Community only | None | Next.js only | Basic embed |
| **TypeScript** | Full types | Full types | Full types | Full types | Partial |
| **Hosted Checkout** | Yes | No (overlay/inline) | Yes | Yes | Yes |
| **Overlay Checkout** | No (embedded instead) | Yes | Yes | Yes | No |
| **Embedded Checkout** | Yes (Elements) | Yes (inline) | No | Yes | Yes |
| **Custom Checkout** | Yes (full API control) | Limited | No | No | No |
| **Webhook Retries** | Yes (3 days) | Yes | Yes | Yes | Yes |
| **Webhook Sig Verify** | SDK built-in | SDK built-in | Manual (crypto) | SDK built-in | SDK built-in |
| **Test Mode** | Excellent (+ sandboxes + test clocks) | Good (separate sandbox) | Good (toggle-based) | Good (sandbox.polar.sh) | Basic |
| **MCP Server** | Official (first-party) | Official (first-party) | Community only | None | None |
| **License Key System** | No (use third-party) | No | Yes (built-in) | Yes (built-in) | No |
| **Digital File Delivery** | No | No | Yes (built-in) | Yes (built-in) | No |

### Pricing Comparison

| Platform | Transaction Fee | Monthly Fee | Notes |
|----------|----------------|-------------|-------|
| **Stripe** | 2.9% + $0.30 | $0 | Add-ons (Tax, Radar, etc.) cost extra |
| **Paddle** | 5% + $0.50 | $0 | 10% fee on transactions under $10 |
| **Lemon Squeezy** | 5% + $0.50 | $0 | Same pricing as pre-acquisition |
| **Polar** | 4% + $0.40 | $0 | Cheapest MoR option |
| **Whop** | 2.7% + $0.30 | $0 | Marketplace takes additional cut on discovery sales |

### Stack Fit Scores

| Platform | Express Backend | React Frontend | Vanilla HTML | Overall |
|----------|----------------|----------------|--------------|---------|
| **Stripe** | 10/10 | 10/10 | 8/10 | 9.5/10 |
| **Paddle** | 8/10 | 7/10 | 9/10 | 8/10 |
| **Lemon Squeezy** | 7/10 | 5/10 | 8/10 | 6.5/10 |
| **Polar** | 7/10 | 5/10 | 5/10 | 5.5/10 |
| **Whop** | 6/10 | 6/10 | 4/10 | 5/10 |

---

## Developer Experience Comparison

### Best Documentation
1. **Stripe** — Industry benchmark. Three-column layout, live API shell, interactive examples, 8+ language samples
2. **Paddle** — Clean, well-organized. Good guides + API reference at developer.paddle.com
3. **Lemon Squeezy** — Adequate. Separate docs for API and guides. Less polished
4. **Polar** — Good for its size. Improving rapidly
5. **Whop** — Basic. Guide-oriented, less reference documentation

### Most Active Developer Community
1. **Stripe** — Massive. Stack Overflow, Discord, GitHub, Stripe Insiders forum, annual Sessions conference
2. **Paddle** — Growing. Active changelog, community examples, GitHub presence
3. **Polar** — Open-source community on GitHub. Smaller but engaged
4. **Lemon Squeezy** — Was growing pre-acquisition. Future community investment unclear
5. **Whop** — Community-focused but more user/creator than developer

### Easiest Integration With Express+React
1. **Stripe** — Purpose-built React components + Express-friendly Node SDK. Unmatched
2. **Paddle** — Overlay checkout is trivially easy. Inline takes more work without official React components
3. **Lemon Squeezy** — Simple overlay via Lemon.js, but limited customization
4. **Polar** — Works but Next.js-centric helpers don't translate directly to Express+React
5. **Whop** — Embed component exists but ecosystem is marketplace-oriented

---

## Platform-Specific Gotchas

### Stripe
- You are the merchant of record — tax compliance is your responsibility (Stripe Tax helps but adds cost)
- `express.json()` middleware MUST NOT run before the webhook route — breaks signature verification
- Total cost can creep up: base fee + Tax + Radar (fraud) + custom domain + etc.
- No built-in license key system — need third-party or custom implementation

### Paddle
- No hosted checkout redirect — must use overlay or inline on your domain
- `Paddle.Initialize()` can only be called once per page load
- Paddle Classic (v1) and Paddle Billing (v2) are completely separate systems — make sure you use Billing
- Payout schedule is monthly with a threshold — not instant

### Lemon Squeezy
- Acquired by Stripe (July 2024) — long-term future uncertain
- Test mode products must be manually copied to live mode
- JSON:API format adds verbosity to every request/response
- `bodyParser.json()` breaks webhook signature verification — use `bodyParser.text({ type: '*/*' })`
- No npm package for Lemon.js (client-side) — CDN only. Cannot self-host
- Server-side SDK must never be used in browser code (exposes API key)

### Polar
- Framework adapters are Next.js-specific — Express+React requires more manual work
- Younger platform — API surface may change more frequently
- Fewer payment methods and less international coverage than Stripe/Paddle
- No MCP server — less AI-assisted development support

### Whop
- Marketplace-first model — may not fit a standalone product architecture
- Less control over checkout UX
- Marketplace takes additional commission on discovery-based sales

---

## Recommendations

### For Maximum Technical Control: Stripe
Best when you want full control over the payment UX, need the broadest set of payment methods, and can handle tax compliance yourself (or with Stripe Tax). First-party React components, excellent docs, official MCP server, and the deepest API surface make it the top choice for engineering teams.

### For "Ship Fast + Tax Handled" (SaaS): Paddle
Best when selling SaaS subscriptions internationally and you want tax compliance handled automatically. The overlay checkout gets you to first payment in under 20 minutes. Official MCP server, good Node.js SDK. Checkout always lives on your domain (no redirect), which can be a pro or con.

### For Budget MoR + Digital Products: Polar
Best when you want the cheapest MoR fees (4% + $0.40) and are selling digital products to a developer audience. Open-source, actively improving. Less mature than Paddle but more aligned with developer/OSS culture. Weaker fit for our Express+React stack due to Next.js-centric tooling.

### For Simple Digital Sales: Lemon Squeezy
Best for quick, simple checkout with built-in license keys and file delivery. Easy overlay integration. But the Stripe acquisition creates uncertainty, and the lack of embedded checkout and React components limits its ceiling.

### Not Recommended for Our Use Case: Whop, FastSpring, Shopify
- **Whop:** Marketplace model doesn't fit standalone products
- **FastSpring:** Dated DX, no JS SDK, enterprise-oriented
- **Shopify:** Physical goods focused, overkill for digital products

### Overall Recommendation for Sherlock Labs

| Priority | Recommended Platform |
|----------|---------------------|
| **Full-stack product with custom checkout** | Stripe |
| **SaaS with global tax compliance** | Paddle |
| **Simple tools/products, fast launch** | Polar or Lemon Squeezy |
| **AI-assisted development workflow** | Stripe (best MCP) or Paddle (good MCP) |

**If choosing one platform to standardize on:** Stripe gives us the most flexibility across product types (SaaS, tools, one-time purchases) and the best integration with our Vite+React+Express stack. The tax burden is the main trade-off, addressable with Stripe Tax.

**If MoR is a hard requirement:** Paddle is the strongest choice. Better developer experience than Lemon Squeezy, more mature than Polar, and the overlay checkout works well with both React apps and vanilla HTML tools.
