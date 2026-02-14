# Clerk + Stripe Billing Integration Research

**Researcher:** Marco (Technical Researcher)
**Date:** 2026-02-14
**Status:** Complete

---

## Executive Summary

We want per-organization billing using Clerk Organizations for multi-tenancy and Stripe Managed Payments as merchant of record. There are two paths: Clerk Billing (their built-in product) or a DIY Clerk-to-Stripe integration. **Recommendation: skip Clerk Billing, wire it ourselves.** Clerk Billing is immature, USD-only, and architecturally incompatible with Stripe Managed Payments. The DIY approach gives us full control, works with Managed Payments, and follows a well-documented pattern.

---

## 1. Clerk Billing vs DIY Clerk+Stripe

### What Clerk Billing Handles

Clerk Billing is a relatively new product that wraps Stripe's payment processing into Clerk's auth layer. It provides:

- **`<PricingTable for="organization" />`** -- a drop-in component that renders plans and lets orgs subscribe directly from the UI.
- **Plan/Feature management in Clerk Dashboard** -- create plans, assign features, toggle public visibility. No code needed for plan CRUD.
- **Feature gating via `has()`** -- server-side checks like `has({ plan: 'pro' })`, `has({ feature: 'advanced_analytics' })`, and `has({ permission: 'org:feature_name:action' })`.
- **`<Protect plan="pro">` component** -- declarative client-side gating with fallback UI.
- **Session token injection** -- active plan features/permissions are baked into the JWT, so gating checks don't require additional API calls.
- **Subscription lifecycle** -- upgrades apply immediately, downgrades apply at cycle end.
- **`<OrganizationProfile />`** -- includes subscription management when billing is enabled.

The developer experience is genuinely good for simple cases: zero webhook handling, zero Stripe Dashboard management, zero custom checkout UI.

### What Clerk Billing Cannot Do

| Limitation | Impact |
|-----------|--------|
| **USD only** | Cannot bill international customers in their currency. No EUR, GBP, etc. |
| **No tax/VAT handling** | You are responsible for tax compliance -- the whole point of Managed Payments is to avoid this. |
| **No 3D Secure** | Required for EU Strong Customer Authentication (SCA). Missing this means failed payments in Europe. |
| **No refunds** | Must issue refunds through Stripe Dashboard manually. Refunds don't reflect in Clerk's MRR tracking. |
| **Not a Merchant of Record** | Clerk explicitly states it is not an MoR. Tax liability stays with you. |
| **Plans don't sync to Stripe** | Clerk manages plans/subscriptions in its own system. They appear as charges in Stripe but not as Stripe Subscriptions or Products. |
| **No Stripe Billing Portal** | Customers can't use Stripe's self-service portal for subscription management -- Clerk handles it. |
| **Geo restrictions** | Unavailable in Brazil, India, Malaysia, Mexico, Singapore, Thailand. |
| **0.7% transaction fee** | On top of Stripe's fees. |

### Clerk Billing + Stripe Managed Payments: Incompatible

This is the critical finding. **They cannot work together.** Here is why:

1. **Stripe Managed Payments requires Stripe Checkout** (hosted or embedded). Clerk Billing uses its own checkout flow that bypasses Stripe Checkout entirely.

2. **Managed Payments requires Stripe to be the merchant of record.** Clerk Billing explicitly states it is "not a Merchant of Record." The two systems have fundamentally different assumptions about who owns the customer relationship.

3. **Plans don't sync to Stripe.** Clerk manages subscriptions in its own layer. Managed Payments needs real Stripe Subscription objects tied to real Stripe Products with tax codes for automatic tax calculation.

4. **Managed Payments requires tax codes on products.** Clerk Billing has no concept of tax codes -- it delegates all product management to its own system.

5. **Managed Payments sends receipts saying "Sold through Link."** Clerk Billing sends its own receipts. These would conflict.

### Recommendation: DIY Integration

Skip Clerk Billing entirely. Wire Clerk Organizations directly to Stripe. Reasons:

- **Full Managed Payments compatibility** -- use Stripe Checkout, get tax compliance, fraud prevention, dispute handling, and MoR benefits.
- **Standard Stripe objects** -- real Customers, Subscriptions, Products, Prices in your Stripe Dashboard. Full visibility and control.
- **Stripe Billing Portal** -- customers self-serve subscription changes, payment method updates, invoice history.
- **No extra fees** -- avoid Clerk's 0.7% surcharge.
- **3DS/SCA support** -- Stripe Checkout handles Strong Customer Authentication automatically.
- **Multi-currency** -- Adaptive Pricing converts to customer's local currency.
- **The integration is straightforward** -- Clerk's official blog documents this exact pattern. It's maybe 200 lines of webhook + checkout code.

The tradeoff: you lose `<PricingTable />` and `has({ plan: 'pro' })` from Clerk. But you gain everything that makes Managed Payments valuable. Building a pricing table in React is trivial. Feature gating from your own DB is also trivial.

---

## 2. DIY Integration Pattern

### Architecture Overview

```
Clerk Organizations          Your DB (Postgres)         Stripe
┌─────────────────┐    ┌───────────────────────┐    ┌──────────────────┐
│ Org: "Acme Inc" │───→│ teams                 │───→│ Customer: cus_xxx│
│ org_abc123      │    │  clerkOrgId: org_abc123│    │ Subscription     │
│                 │    │  stripeCustomerId:     │    │ Products + Prices│
│ Members:        │    │    cus_xxx             │    │ Checkout Sessions│
│  - admin@acme   │    │  plan: 'pro'           │    │ Billing Portal   │
│  - dev@acme     │    │  planStatus: 'active'  │    └──────────────────┘
└─────────────────┘    └───────────────────────┘
```

### Step 1: Clerk Webhook -- org.created --> Create Stripe Customer

When a Clerk Organization is created, create a corresponding Stripe Customer and store the mapping.

```typescript
// server/webhooks/clerk.ts
import { Webhook } from 'svix';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handleClerkWebhook(req: Request) {
  // 1. Verify webhook signature (Clerk uses Svix)
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
  const payload = await req.text();
  const headers = {
    'svix-id': req.headers.get('svix-id'),
    'svix-timestamp': req.headers.get('svix-timestamp'),
    'svix-signature': req.headers.get('svix-signature'),
  };
  const evt = wh.verify(payload, headers);

  // 2. Handle organization.created
  if (evt.type === 'organization.created') {
    const { id: clerkOrgId, name } = evt.data;

    // Create Stripe Customer for this org
    const customer = await stripe.customers.create({
      name,
      metadata: { clerkOrgId },  // cross-reference back to Clerk
    });

    // Store mapping in your DB
    await db.query(
      `INSERT INTO teams (clerk_org_id, stripe_customer_id, name, plan, plan_status)
       VALUES ($1, $2, $3, 'free', 'active')`,
      [clerkOrgId, customer.id, name]
    );
  }

  // 3. Handle organization.updated (name changes, etc.)
  if (evt.type === 'organization.updated') {
    const { id: clerkOrgId, name } = evt.data;
    const team = await db.query(
      'SELECT stripe_customer_id FROM teams WHERE clerk_org_id = $1',
      [clerkOrgId]
    );
    if (team.rows[0]) {
      await stripe.customers.update(team.rows[0].stripe_customer_id, { name });
    }
  }

  return new Response('OK', { status: 200 });
}
```

### Step 2: Create Stripe Checkout Sessions Tied to the Org

When an org admin clicks "Upgrade to Pro," create a Checkout Session linked to their Stripe Customer.

```typescript
// server/api/checkout.ts
export async function createCheckoutSession(clerkOrgId: string, priceId: string) {
  // Look up the Stripe Customer for this org
  const team = await db.query(
    'SELECT stripe_customer_id FROM teams WHERE clerk_org_id = $1',
    [clerkOrgId]
  );

  if (!team.rows[0]) {
    throw new Error('Team not found');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: team.rows[0].stripe_customer_id,
    line_items: [
      {
        price: priceId,  // e.g., price_xxx for "Pro Monthly"
        quantity: 1,
      },
    ],
    // Managed Payments: pass metadata to link back to org
    subscription_data: {
      metadata: { clerkOrgId },
    },
    success_url: `${process.env.APP_URL}/settings/billing?success=true`,
    cancel_url: `${process.env.APP_URL}/settings/billing?canceled=true`,
  });

  return session.url;
}
```

**Important for Managed Payments:** Stripe Checkout handles tax calculation automatically when Managed Payments is enabled. You must assign tax codes to your Products in Stripe Dashboard (e.g., `txcd_10000000` for SaaS).

### Step 3: Handle Stripe Webhooks to Activate/Deactivate Plans

```typescript
// server/webhooks/stripe.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handleStripeWebhook(req: Request) {
  const payload = await req.text();
  const sig = req.headers.get('stripe-signature');
  const event = stripe.webhooks.constructEvent(
    payload,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    // Initial subscription created via Checkout
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription') {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        await activatePlan(session.customer as string, subscription);
      }
      break;
    }

    // Recurring payment succeeded
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        await db.query(
          `UPDATE teams SET plan_status = 'active'
           WHERE stripe_customer_id = $1`,
          [invoice.customer]
        );
      }
      break;
    }

    // Payment failed (dunning)
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await db.query(
        `UPDATE teams SET plan_status = 'past_due'
         WHERE stripe_customer_id = $1`,
        [invoice.customer]
      );
      // Optionally: notify org admins via email (Loops)
      break;
    }

    // Subscription updated (upgrade, downgrade, quantity change)
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await activatePlan(subscription.customer as string, subscription);
      break;
    }

    // Subscription canceled
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await db.query(
        `UPDATE teams SET plan = 'free', plan_status = 'active',
         stripe_subscription_id = NULL
         WHERE stripe_customer_id = $1`,
        [subscription.customer]
      );
      break;
    }
  }

  return new Response('OK', { status: 200 });
}

async function activatePlan(
  stripeCustomerId: string,
  subscription: Stripe.Subscription
) {
  // Map Stripe Price ID to your plan name
  const priceId = subscription.items.data[0]?.price.id;
  const plan = mapPriceToPlan(priceId);  // e.g., 'pro', 'enterprise'

  await db.query(
    `UPDATE teams
     SET plan = $1,
         plan_status = $2,
         stripe_subscription_id = $3
     WHERE stripe_customer_id = $4`,
    [plan, subscription.status, subscription.id, stripeCustomerId]
  );
}

function mapPriceToPlan(priceId: string): string {
  const priceMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_PRO_MONTHLY]: 'pro',
    [process.env.STRIPE_PRICE_PRO_ANNUAL]: 'pro',
    [process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY]: 'enterprise',
    [process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL]: 'enterprise',
  };
  return priceMap[priceId] || 'free';
}
```

### Step 4: Gate Features Using DB Plan Status

```typescript
// server/middleware/planGate.ts
export function requirePlan(...allowedPlans: string[]) {
  return async (req, res, next) => {
    const { orgId } = req.auth;  // from Clerk middleware
    const team = await db.query(
      'SELECT plan, plan_status FROM teams WHERE clerk_org_id = $1',
      [orgId]
    );

    if (!team.rows[0]) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const { plan, plan_status } = team.rows[0];

    if (plan_status !== 'active') {
      return res.status(402).json({ error: 'Subscription inactive' });
    }

    if (!allowedPlans.includes(plan)) {
      return res.status(403).json({
        error: 'Plan upgrade required',
        currentPlan: plan,
        requiredPlans: allowedPlans,
      });
    }

    next();
  };
}

// Usage:
app.get('/api/advanced-feature', requirePlan('pro', 'enterprise'), handler);
app.get('/api/enterprise-feature', requirePlan('enterprise'), handler);
```

---

## 3. Plan Status: Clerk Org Metadata vs Local DB

### Option A: Store Plan in Clerk Org publicMetadata

```typescript
// After Stripe webhook confirms subscription:
await clerkClient.organizations.updateOrganizationMetadata({
  organizationId: clerkOrgId,
  publicMetadata: {
    plan: 'pro',
    planStatus: 'active',
    stripeSubscriptionId: 'sub_xxx',
  },
});
```

**Pros:**
- Readable client-side via `useOrganization()` hook -- no API call needed.
- Can be injected into session token (JWT) for server-side checks without DB query.
- Simple for UI-level gating (show/hide elements based on plan).

**Cons:**
- **1.2KB session token limit.** After Clerk's default claims, you get roughly 1.2KB for custom claims. Fine for `{ plan: "pro" }`, but don't stuff complex objects in there.
- **Dual write required.** You update both your DB and Clerk metadata on every plan change. Two writes, two sources of truth, potential for drift.
- **Clerk metadata is not your source of truth.** Stripe events might arrive before the Clerk metadata update completes, or vice versa.

### Option B: Store Plan in Local DB Only

```typescript
// Client-side: fetch plan from your API
const { data: team } = useSWR(`/api/team/${orgId}`, fetcher);
const isPro = team?.plan === 'pro' && team?.planStatus === 'active';
```

**Pros:**
- Single source of truth. No sync concerns between Clerk metadata and DB.
- Full query flexibility (join with other team data, audit trails, etc.).
- No 1.2KB limit.

**Cons:**
- Requires an API call to check plan status client-side.
- Cannot use Clerk's `has()` or `<Protect>` for plan gating (those only work with Clerk Billing).

### Recommendation: Hybrid Approach

Use your DB as the source of truth, but mirror the plan tier to Clerk org publicMetadata for lightweight client-side checks.

```typescript
// In your Stripe webhook handler, after updating DB:
async function syncPlanToClerk(clerkOrgId: string, plan: string, status: string) {
  await clerkClient.organizations.updateOrganizationMetadata({
    organizationId: clerkOrgId,
    publicMetadata: { plan, planStatus: status },
  });
}
```

**Client-side usage:**

```tsx
function UpgradeGate({ children, requiredPlan }) {
  const { organization } = useOrganization();
  const currentPlan = organization?.publicMetadata?.plan;

  if (currentPlan === requiredPlan) return children;
  return <UpgradePrompt requiredPlan={requiredPlan} />;
}
```

**Server-side:** Always check the DB, not Clerk metadata. The DB is authoritative.

This gives you fast client-side UI gating without API calls, while keeping your DB as the single source of truth for all access control decisions.

---

## 4. Webhook Coordination: Clerk + Stripe

### The Order of Operations Problem

Two webhook systems fire independently:

1. **Clerk:** `organization.created` fires when someone creates an org.
2. **Stripe:** `checkout.session.completed` fires when someone finishes a checkout.

The danger: a user creates an org and immediately clicks "Upgrade to Pro." If the Clerk webhook hasn't finished processing (Stripe Customer not yet created), the checkout session creation will fail because there's no `stripeCustomerId` to attach.

### Recommended Strategy: Eager Creation + Idempotent Handlers

**Strategy 1: Create Stripe Customer eagerly (preferred)**

Don't wait for the webhook. Create the Stripe Customer synchronously when the org is created in your app, then let the webhook be a fallback/sync mechanism.

```typescript
// In your "Create Organization" API endpoint:
export async function createOrganization(req, res) {
  const { orgName } = req.body;
  const { userId } = req.auth;

  // 1. Create org in Clerk
  const org = await clerkClient.organizations.createOrganization({
    name: orgName,
    createdBy: userId,
  });

  // 2. Create Stripe Customer immediately (don't wait for webhook)
  const customer = await stripe.customers.create({
    name: orgName,
    metadata: { clerkOrgId: org.id },
  });

  // 3. Store in DB
  await db.query(
    `INSERT INTO teams (clerk_org_id, stripe_customer_id, name, plan, plan_status)
     VALUES ($1, $2, $3, 'free', 'active')`,
    [org.id, customer.id, orgName]
  );

  return res.json({ orgId: org.id });
}
```

**The webhook handler becomes a safety net:**

```typescript
// In your Clerk webhook handler:
if (evt.type === 'organization.created') {
  const { id: clerkOrgId, name } = evt.data;

  // Check if team record already exists (created eagerly above)
  const existing = await db.query(
    'SELECT id FROM teams WHERE clerk_org_id = $1',
    [clerkOrgId]
  );

  if (existing.rows.length === 0) {
    // Fallback: create Stripe Customer + DB record
    // (handles orgs created via Clerk Dashboard, API, or if eager creation failed)
    const customer = await stripe.customers.create({
      name,
      metadata: { clerkOrgId },
    });
    await db.query(
      `INSERT INTO teams (clerk_org_id, stripe_customer_id, name, plan, plan_status)
       VALUES ($1, $2, $3, 'free', 'active')`,
      [clerkOrgId, customer.id, name]
    );
  }
}
```

**Strategy 2: Queue + retry for checkout (belt-and-suspenders)**

If someone somehow reaches checkout before the Stripe Customer exists:

```typescript
export async function createCheckoutSession(clerkOrgId: string, priceId: string) {
  let team = await db.query(
    'SELECT stripe_customer_id FROM teams WHERE clerk_org_id = $1',
    [clerkOrgId]
  );

  // If no team record yet, create Stripe Customer on-demand
  if (!team.rows[0]) {
    const org = await clerkClient.organizations.getOrganization({
      organizationId: clerkOrgId,
    });
    const customer = await stripe.customers.create({
      name: org.name,
      metadata: { clerkOrgId },
    });
    await db.query(
      `INSERT INTO teams (clerk_org_id, stripe_customer_id, name, plan, plan_status)
       VALUES ($1, $2, $3, 'free', 'active')
       ON CONFLICT (clerk_org_id) DO UPDATE SET stripe_customer_id = $2`,
      [clerkOrgId, customer.id, org.name]
    );
    team = { rows: [{ stripe_customer_id: customer.id }] };
  }

  // Now proceed with checkout
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: team.rows[0].stripe_customer_id,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { clerkOrgId } },
    success_url: `${process.env.APP_URL}/settings/billing?success=true`,
    cancel_url: `${process.env.APP_URL}/settings/billing?canceled=true`,
  });

  return session.url;
}
```

### Idempotency Rules

All webhook handlers should be idempotent. Clerk (via Svix) and Stripe both retry failed deliveries.

- **Clerk webhooks:** Use `clerk_org_id` as the idempotency key. `INSERT ... ON CONFLICT DO UPDATE`.
- **Stripe webhooks:** Use the `event.id` to dedup. Store processed event IDs and skip duplicates, or just make your handlers safe to re-run (UPDATE is naturally idempotent).

### Full Event Flow

```
User creates org in app
├── Synchronous: Create Clerk Org + Stripe Customer + DB record
└── Async (safety net): Clerk webhook (organization.created) → idempotent upsert

User clicks "Upgrade to Pro"
├── Server: look up stripeCustomerId by clerkOrgId
├── Server: create Stripe Checkout Session (mode: subscription)
├── Client: redirect to Stripe Checkout URL
└── User completes payment on Stripe Checkout

Stripe fires checkout.session.completed webhook
├── Server: retrieve subscription from session
├── Server: map price ID to plan name
├── Server: UPDATE teams SET plan = 'pro', plan_status = 'active'
└── Server: sync plan to Clerk org publicMetadata (optional, for client-side UI)

Monthly renewal:
├── Stripe fires invoice.paid → keep plan_status = 'active'
└── Stripe fires invoice.payment_failed → set plan_status = 'past_due'

User cancels:
├── Via Stripe Billing Portal (or via Link under Managed Payments)
├── Stripe fires customer.subscription.deleted
├── Server: UPDATE teams SET plan = 'free', plan_status = 'active'
└── Server: sync to Clerk publicMetadata
```

---

## 5. Session/Auth Flow with Stripe Checkout

### How a Logged-In Clerk User Reaches Stripe Checkout

```
┌─────────────────────────────────────────────────────┐
│ Your App (authenticated via Clerk)                  │
│                                                     │
│  Settings > Billing page                            │
│  ┌─────────────────────────────────────────────┐    │
│  │ Current plan: Free                          │    │
│  │                                             │    │
│  │  [Upgrade to Pro - $29/mo]                  │    │
│  │  [Upgrade to Enterprise - $99/mo]           │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  User clicks "Upgrade to Pro"                       │
│  → POST /api/checkout { priceId: 'price_xxx' }      │
│  → Server verifies: user is org admin (Clerk auth)  │
│  → Server creates Checkout Session for org's         │
│    Stripe Customer                                  │
│  → Server returns checkout URL                      │
│  → Client redirects to Stripe Checkout              │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│ Stripe Checkout (hosted by Stripe)                  │
│ Shows: "Sold through Link" (Managed Payments)       │
│ Handles: tax calculation, 3DS, payment methods      │
│ Customer enters payment details                     │
│ → On success: redirects to success_url              │
│ → Stripe fires checkout.session.completed webhook   │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│ Your App - /settings/billing?success=true           │
│ (Plan now active, gated features unlocked)          │
└─────────────────────────────────────────────────────┘
```

### Linking Checkout Back to the Right Org

The link is the `customer` field on the Checkout Session. Since you create the session with `customer: team.stripe_customer_id`, and your DB maps `stripe_customer_id` to `clerk_org_id`, the chain is:

```
Checkout Session → customer (cus_xxx) → teams table → clerk_org_id (org_abc123)
```

Additionally, pass `clerkOrgId` in `subscription_data.metadata` as a belt-and-suspenders cross-reference:

```typescript
const session = await stripe.checkout.sessions.create({
  customer: stripeCustomerId,         // primary link
  subscription_data: {
    metadata: { clerkOrgId },          // backup cross-reference
  },
  // ...
});
```

### Authorization: Only Org Admins Can Manage Billing

```typescript
// server/api/checkout.ts
export async function POST(req) {
  const { orgId, orgRole } = req.auth;  // from Clerk middleware

  if (orgRole !== 'org:admin') {
    return Response.json({ error: 'Only org admins can manage billing' }, { status: 403 });
  }

  // ... proceed with checkout session creation
}
```

### Stripe Billing Portal for Subscription Management

Under Managed Payments, customers manage subscriptions via the Link app. But you can also provide a Stripe Billing Portal link for payment method updates:

```typescript
export async function createPortalSession(clerkOrgId: string) {
  const team = await db.query(
    'SELECT stripe_customer_id FROM teams WHERE clerk_org_id = $1',
    [clerkOrgId]
  );

  const session = await stripe.billingPortal.sessions.create({
    customer: team.rows[0].stripe_customer_id,
    return_url: `${process.env.APP_URL}/settings/billing`,
  });

  return session.url;
}
```

**Note:** Under Managed Payments, some portal features may be limited since Stripe/Link handles subscription management. Test this behavior during development.

---

## 6. Database Schema

```sql
CREATE TABLE teams (
  id              SERIAL PRIMARY KEY,
  clerk_org_id    TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  name            TEXT NOT NULL,

  -- Billing
  plan            TEXT NOT NULL DEFAULT 'free',    -- 'free', 'pro', 'enterprise'
  plan_status     TEXT NOT NULL DEFAULT 'active',  -- 'active', 'past_due', 'canceled', 'trialing'
  stripe_subscription_id TEXT,

  -- Timestamps
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_clerk_org ON teams(clerk_org_id);
CREATE INDEX idx_teams_stripe_customer ON teams(stripe_customer_id);

-- Optional: track processed webhook events for idempotency
CREATE TABLE processed_events (
  event_id    TEXT PRIMARY KEY,  -- Stripe event ID or Clerk event ID
  source      TEXT NOT NULL,     -- 'stripe' or 'clerk'
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Clerk Billing vs DIY | **DIY** | Clerk Billing is incompatible with Managed Payments (no MoR, no tax, no 3DS, USD only) |
| Plan status source of truth | **Postgres** | Single source of truth; mirror to Clerk publicMetadata for client-side convenience |
| Stripe Customer creation timing | **Eager (synchronous)** | Avoids race condition between org creation and first checkout |
| Org-to-Customer mapping | **1:1 via teams table** | clerk_org_id and stripe_customer_id both have unique indexes |
| Feature gating | **Server: DB check; Client: Clerk publicMetadata** | Authoritative on server, fast on client |
| Who can manage billing | **org:admin role only** | Checked via Clerk auth middleware |
| Webhook idempotency | **ON CONFLICT + event dedup** | Both Clerk and Stripe retry on failure |

---

## Sources

- [Clerk Billing Overview](https://clerk.com/docs/guides/billing/overview)
- [Clerk Billing for B2B SaaS (Next.js)](https://clerk.com/docs/nextjs/guides/billing/for-b2b)
- [Clerk Organizations Overview](https://clerk.com/docs/organizations/overview)
- [Clerk Organization Metadata](https://clerk.com/docs/organizations/metadata)
- [Clerk Webhooks Overview](https://clerk.com/docs/webhooks/overview)
- [Clerk Webhook Sync Data Guide](https://clerk.com/docs/webhooks/sync-data)
- [Clerk Blog: Exploring Clerk Metadata with Stripe Webhooks](https://clerk.com/blog/exploring-clerk-metadata-stripe-webhooks)
- [Clerk Blog: Per-User B2B Monetization with Stripe and Clerk Organizations](https://clerk.com/blog/per-user-licensing-with-stripe-and-clerk-organizations)
- [Clerk Blog: Getting Started with Clerk Billing](https://clerk.com/blog/intro-to-clerk-billing)
- [Stripe Managed Payments: How It Works](https://docs.stripe.com/payments/managed-payments/how-it-works)
- [Stripe Managed Payments Overview](https://docs.stripe.com/payments/managed-payments)
- [Stripe: Build Subscriptions with Checkout](https://docs.stripe.com/payments/checkout/build-subscriptions)
- [Stripe: Subscription Webhooks](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Stripe: Checkout Session API](https://docs.stripe.com/api/checkout/sessions/create)
- [Stripe: Metadata](https://docs.stripe.com/metadata)
- [GitHub: clerk-stripe-organizations reference repo](https://github.com/panteliselef/clerk-stripe-organizations)
- [Stripe Sessions 2025: Instant SaaS Billing with Clerk + Stripe](https://stripe.com/sessions/2025/instant-zero-integration-saas-billing-with-clerk-stripe)
