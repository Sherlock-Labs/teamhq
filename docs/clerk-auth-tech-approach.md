# Clerk + Stripe Managed Payments Integration Template — Tech Approach

**Project:** clerk-auth
**Author:** Andrei (Technical Architect)
**Date:** 2026-02-14
**Status:** Complete

## Summary

Marco's research is solid. The core architecture — skip Clerk Billing, wire Clerk Organizations to Stripe Managed Payments ourselves, use DB as source of truth with Clerk publicMetadata as a convenience mirror — is the right call. I have six adjustments, two of which are significant.

---

## Validation Results

### What Is Correct

1. **Skip Clerk Billing** — confirmed incompatible with Managed Payments. No changes needed.
2. **Hybrid plan storage** (DB = authoritative, Clerk publicMetadata = UI convenience) — sound approach. The 1.2KB JWT limit is real but irrelevant for `{ plan: "pro" }`.
3. **Eager Stripe Customer creation** with webhook as safety net — robust pattern. The on-demand fallback in the checkout endpoint is the right belt-and-suspenders approach.
4. **Feature gating middleware** (`requirePlan`) — correct design. DB check on server, metadata on client.
5. **1:1 org-to-Stripe-Customer mapping** via unique indexes — correct and simple.
6. **Idempotent webhook handlers** via `ON CONFLICT` — correct approach.
7. **`subscription_data.metadata.clerkOrgId`** as cross-reference on Checkout Sessions — good defensive practice.
8. **5 Stripe webhook events** (checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted) — correct and complete for subscription lifecycle.

### Adjustments Required

These are the gaps or corrections Jonah and Alice should incorporate.

---

## ADJ-1: Use `verifyWebhook` from `@clerk/express/webhooks` Instead of Raw Svix

**Severity:** Significant — changes the recommended Clerk webhook pattern.

The research doc shows manual Svix verification:

```typescript
import { Webhook } from 'svix';
const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
const evt = wh.verify(payload, headers);
```

Clerk now provides `verifyWebhook` directly from `@clerk/express/webhooks`. This is simpler, is maintained by Clerk, and handles the Svix internals for you. A security vulnerability in earlier versions of this helper was patched in `@clerk/express` v1.7.4, so pin to at least that version.

**Recommended pattern:**

```typescript
// server/webhooks/clerk.ts
import { verifyWebhook } from '@clerk/express/webhooks';

app.post(
  '/api/webhooks/clerk',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const evt = await verifyWebhook(req);
      // evt is typed — use evt.type and evt.data
    } catch (err) {
      return res.status(400).json({ error: 'Webhook verification failed' });
    }
  }
);
```

**Impact:** Drop the `svix` dependency entirely. Use `@clerk/express/webhooks` for verification. The env var name should be `CLERK_WEBHOOK_SIGNING_SECRET` (Clerk's standard) — the research doc uses `CLERK_WEBHOOK_SECRET`, which also works but is not the documented default.

---

## ADJ-2: Express Middleware Ordering — Raw Body Parsing for Webhooks

**Severity:** Significant — this is the most common gotcha and the research doc does not show it correctly.

The research code uses `req.text()` (Web Request API), which does not exist in Express. Express routes receive `req.body`, and the body content depends on which middleware parsed it. The problem: `express.json()` parses the body into an object, destroying the raw bytes needed for webhook signature verification.

**The correct middleware ordering for Express:**

```typescript
// server/index.ts
import express from 'express';

const app = express();

// 1. Webhook routes FIRST — with raw body parsing
//    These must come BEFORE express.json() or clerkMiddleware()
app.post(
  '/api/webhooks/clerk',
  express.raw({ type: 'application/json' }),
  clerkWebhookHandler
);
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
);

// 2. JSON parsing for all other routes
app.use(express.json());

// 3. Clerk middleware for auth on all subsequent routes
app.use(clerkMiddleware());

// 4. Your API routes (now have parsed JSON + Clerk auth)
app.use('/api', apiRouter);
```

**Why this order matters:**
- Webhook routes need the raw `Buffer` body for HMAC signature verification.
- `express.json()` would parse the body before the webhook handler sees it, breaking verification.
- `clerkMiddleware()` must not run on webhook routes — webhooks are unauthenticated external requests.
- Route-specific `express.raw()` middleware applies only to the webhook paths, so all other routes get normal JSON parsing.

**Jonah:** This is the single most important thing to get right in the skills doc. Show the full `server/index.ts` with correct ordering. Do not show webhook handlers in isolation — show them in context with the rest of the middleware stack.

---

## ADJ-3: `orgRole` Format — Session Token v2

**Severity:** Moderate — affects the role-checking code in the checkout endpoint.

The research doc checks `orgRole !== 'org:admin'`. Clerk's session token v2 (the current default) drops the `org:` prefix from the role claim. The `orgRole` value in `getAuth()` will be `'admin'`, not `'org:admin'`.

**Recommended approach:** Use Clerk's `has()` method instead of string comparison, which abstracts over token versions:

```typescript
import { getAuth } from '@clerk/express';

// Instead of: if (req.auth.orgRole !== 'org:admin')
const auth = getAuth(req);
if (!auth.has({ role: 'org:admin' })) {
  return res.status(403).json({ error: 'Only org admins can manage billing' });
}
```

The `has()` method handles the token version differences internally. This is more robust and forward-compatible.

---

## ADJ-4: Stripe Billing Portal Under Managed Payments

**Severity:** Low — the research doc already flags this as uncertain, but should be more explicit.

Under Managed Payments, customers manage subscriptions via the Link app, not the Stripe Billing Portal. The `stripe.billingPortal.sessions.create()` endpoint may still work for payment method updates, but subscription modification/cancellation flows are handled by Link.

**Recommendation for the skills doc:** Include the Billing Portal code for payment method management, but add a clear callout that subscription management (upgrade, downgrade, cancel) happens through Link under Managed Payments. Test portal behavior during development of each product — the exact feature availability may change as Stripe evolves Managed Payments.

---

## ADJ-5: Managed Payments Breaking Change — Customer Data Collection

**Severity:** Low — but needs to be documented.

Stripe removed the `customer_update[address]` and `customer_update[name]` parameters from Managed Payments Checkout Sessions. Managed Payments now automatically collects customer name and billing address for tax calculation. This means:

- Do NOT pass `customer_update` options in Checkout Session creation.
- The customer's billing address will be set by Stripe during checkout (overwriting any existing value).
- This is actually simpler for us — no configuration needed.

**For the skills doc:** Note this constraint in the Checkout Session section. The research doc's checkout code does not use these parameters, so no code change is needed, but the doc should mention it so developers don't try to add it.

---

## ADJ-6: Drizzle Schema Conventions

**Severity:** Low — conventions alignment.

The research doc shows raw SQL. The requirements correctly call for Drizzle ORM. A few conventions to follow:

1. **Table naming**: Use `camelCase` for Drizzle table names in code (`organizations`, `users`, `orgMemberships`) and let Drizzle generate the SQL names. The research doc uses `teams` — use `organizations` to match Clerk's terminology and avoid confusion.
2. **ID columns**: Use `serial('id').primaryKey()` for auto-increment or `uuid('id').defaultRandom().primaryKey()` — follow whatever convention ost-tool established. Since we don't have a Drizzle precedent in the codebase yet, I recommend `serial` for simplicity.
3. **Timestamp columns**: Use `timestamp('created_at', { withTimezone: true }).defaultNow()`.
4. **Index definitions**: Define indexes using Drizzle's `index()` and `uniqueIndex()` functions.
5. **Inferred types**: Export `type NewUser = typeof users.$inferInsert` and `type User = typeof users.$inferSelect` for each table.

**Table name decision:** The research calls the table `teams`. Thomas's requirements call it `organizations`. I recommend `organizations` — it maps directly to Clerk's concept and avoids a translation layer in developers' heads. The Drizzle variable can be `organizations` and the SQL table name can be `organizations`.

---

## ADJ-7: `clerkMiddleware()` Security Options

**Severity:** Low — defense in depth.

The research doc does not show `authorizedParties` configuration. In production, `clerkMiddleware()` should specify `authorizedParties` to prevent subdomain cookie leaking:

```typescript
app.use(clerkMiddleware({
  authorizedParties: [process.env.APP_URL],
}));
```

The skills doc should include this as part of the standard setup, with a note that `authorizedParties` should match your production domain(s).

---

## Architecture Decisions

### AD-1: Clerk `verifyWebhook` over raw Svix

**Decision:** Use `verifyWebhook` from `@clerk/express/webhooks`.
**Rationale:** First-party, maintained by Clerk, typed, eliminates the `svix` dependency. Patched security vulnerability means we need `@clerk/express >= 1.7.4`.
**Alternatives rejected:** Raw Svix — extra dependency, more code, same result.

### AD-2: Table named `organizations`, not `teams`

**Decision:** Name the primary billing table `organizations`.
**Rationale:** Direct conceptual mapping to Clerk Organizations. Reduces cognitive load when reading code that bridges Clerk and our DB. "Team" is a product-specific synonym that some products may not use.
**Alternatives rejected:** `teams` — adds unnecessary translation.

### AD-3: `has()` for role checks, not string comparison

**Decision:** Use `auth.has({ role: 'org:admin' })` instead of `auth.orgRole !== 'org:admin'`.
**Rationale:** Session token v2 changed the `orgRole` format (dropped `org:` prefix). `has()` abstracts this, is forward-compatible, and is Clerk's recommended approach.
**Alternatives rejected:** String comparison against `orgRole` — brittle across token versions.

### AD-4: Env var naming follows Clerk/Stripe conventions

**Decision:** Use `CLERK_WEBHOOK_SIGNING_SECRET` (not `CLERK_WEBHOOK_SECRET`), `VITE_CLERK_PUBLISHABLE_KEY` (not `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`).
**Rationale:** We use Vite, not Next.js. Vite exposes client env vars with `VITE_` prefix. Follow each service's documented naming convention.
**Alternatives rejected:** Next.js naming conventions — wrong framework.

---

## Recommended File Structure for the Skills Doc

The skills doc (`skills/development/clerk-stripe-integration.md`) should follow this structure. Each section maps to one or more of Thomas's user stories.

```
1. Overview
   - What this doc covers
   - Prerequisites (packages, accounts, env vars)
   - When to use this (new product with auth + org billing)

2. Setup Checklist (US-1)
   2a. Clerk Setup
       - Create application, enable Organizations, configure OAuth
       - Set up webhook endpoint, subscribe to events
       - Copy env vars
       - Production instance checklist
   2b. Stripe Setup
       - Create products/prices with eligible tax codes
       - Enable Managed Payments
       - Set up webhook endpoint, subscribe to events
       - Copy env vars

3. Database Schema (US-2)
   - Full Drizzle schema with users, organizations, orgMemberships, processedEvents
   - Index definitions
   - Inferred types
   - Migration instructions
   - Cross-reference to skills/development/templates/clerk-stripe-schema.ts

4. Express Backend Setup
   4a. Middleware Ordering (critical) (US-3)
       - Full server/index.ts showing correct order
       - clerkMiddleware() with authorizedParties
       - Route mounting
   4b. Clerk Webhook Handler (US-4)
       - verifyWebhook from @clerk/express/webhooks
       - user.created, organization.created, organizationMembership.* handlers
       - Eager Stripe Customer creation in org.created
       - Idempotent upserts
   4c. Stripe Webhook Handler (US-5)
       - stripe.webhooks.constructEvent with raw body
       - 5 event handlers
       - activatePlan helper with price-to-plan mapping
       - Clerk publicMetadata sync
       - Event dedup via processedEvents table
   4d. Checkout Session Endpoint (US-6)
       - Auth + org:admin check via has()
       - Stripe Customer lookup with on-demand fallback
       - Managed Payments Checkout Session creation
   4e. Feature Gating Middleware (US-7)
       - requirePlan() middleware
       - 402/403/404 responses
   4f. Billing Portal Endpoint
       - Portal session creation
       - Callout about Managed Payments / Link limitations

5. React Frontend Setup
   5a. ClerkProvider + Auth Components (US-8)
       - ClerkProvider with Vite env vars
       - SignIn, SignUp pages
       - OrganizationSwitcher, UserButton
       - Protected routes
   5b. Plan Gating Component (US-8)
       - Read org publicMetadata
       - Conditional rendering by plan
   5c. Upgrade Button + Checkout Redirect (US-9)
       - Admin-only visibility
       - Loading state
       - Error handling
       - Success redirect handling

6. Webhook Event Reference
   - Table: event name, source, what it does, handler function

7. Environment Variables
   - Complete list with descriptions and example format
   - Vite prefix for client vars

8. Railway Deployment
   - Procfile
   - Env var configuration
   - Webhook URL setup (use Railway's public URL)

9. Troubleshooting
   - Webhook signature failures (raw body issue)
   - "Org created but no Stripe Customer" (eager creation failed + webhook delayed)
   - Clerk/Stripe race conditions
   - Missing env vars
   - orgRole format confusion (v1 vs v2 token)
   - Managed Payments tax code errors
```

---

## Change Impact Classification

This is a documentation-only project. All files are new.

| File | Classification | Notes |
|------|---------------|-------|
| `skills/development/clerk-stripe-integration.md` | **New** | Primary deliverable |
| `skills/development/templates/clerk-stripe-schema.ts` | **New** | Drizzle schema template |
| `skills/development/saas-stack.md` | **Modify** | Add cross-references to new doc |

No Restructure classifications. No early QA notification needed.

---

## Risks

1. **Managed Payments feature set evolves fast.** Stripe has been adding features (free trials, subscription schedules, one-time payments) and removing parameters (`customer_update`). The skills doc should note the date it was last verified and flag areas where Managed Payments behavior may change.

2. **`verifyWebhook` from `@clerk/express/webhooks` is relatively new.** Pin `@clerk/express >= 1.7.4` to get the security patch. If a product encounters issues, falling back to raw Svix is straightforward.

3. **Billing Portal under Managed Payments.** The exact feature set available in the portal may be limited. Each product should test this during development. The skills doc should document what we know and flag it as "test this."

---

## Notes for Downstream Agents

- **Jonah:** ADJ-1 (verifyWebhook) and ADJ-2 (middleware ordering) are the two most important items. The middleware ordering section should be the most carefully written part of the skills doc — show the full file, not fragments.
- **Alice:** ADJ-3 (orgRole format) affects how you check roles on the frontend. Use Clerk's `useOrganization()` hook and `has()` from `useAuth()` rather than direct string comparison on `orgRole`.
- **Enzo:** The webhook raw body parsing (ADJ-2) is the highest-risk integration point. Validate that the skills doc clearly shows `express.raw()` applied per-route before `express.json()` is applied globally.
