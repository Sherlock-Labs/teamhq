# Clerk + Stripe Managed Payments Integration

**Category:** Development
**Used by:** Jonah, Alice, Howard, Andrei, Sam, Derek, all
**Last updated:** 2026-02-14

## Overview

This is the authoritative reference for adding Clerk authentication (with organizations/multi-tenancy) and Stripe Managed Payments billing to any new product. Follow it top-to-bottom when starting a new project. Every code block is copy-paste ready.

**What this covers:**
- Clerk Organizations for multi-tenant auth (users, orgs, memberships)
- Stripe Managed Payments for subscription billing (Stripe is merchant of record)
- Express backend with webhook handlers, checkout endpoint, and feature gating
- React frontend with ClerkProvider, auth components, and plan-based UI gating
- Drizzle ORM schema for Postgres (Railway)
- Railway deployment configuration

**What this does NOT cover:**
- PostHog analytics, Loops email, Cloudflare R2 file storage -- see `skills/development/saas-stack.md`
- Mobile auth flows (Zara/Leo handle per-product)
- Usage-based billing, metered pricing (product-specific)
- Enterprise SSO/SAML (product-specific)
- Custom Stripe Elements checkout (Managed Payments requires Stripe Checkout)

**Prerequisites:**
- Clerk account with Organizations enabled
- Stripe account with Managed Payments enabled
- Railway project with Postgres
- Node.js 20+, npm workspaces (see ost-tool for reference structure)

**Key architecture decisions:**
- **Skip Clerk Billing** -- incompatible with Managed Payments (no MoR, no tax, no 3DS, USD only)
- **DB is source of truth** for plan status; Clerk org publicMetadata is a convenience mirror for fast client-side UI gating
- **Eager Stripe Customer creation** on org creation (synchronous), with webhook as safety net
- **1:1 mapping**: Clerk Organization <-> DB organizations row <-> Stripe Customer

**Document structure:**

| Section | What it covers |
|---------|---------------|
| [1. Setup Checklist](#section-1-setup-checklist) | Clerk Dashboard, Stripe Dashboard, npm packages |
| [2. Environment Variables](#section-2-environment-variables) | Server and client env vars, dev vs production |
| [3. Drizzle Schema](#section-3-drizzle-schema) | Database tables, migrations, DB connection setup |
| [4. Express Server Setup](#section-4-express-server-setup) | Middleware ordering, auth helpers, route mounting |
| [5. Clerk Webhook Handlers](#section-5-clerk-webhook-handlers) | User, org, and membership event handlers |
| [6. Stripe Integration](#section-6-stripe-integration) | Webhook handlers, checkout endpoint, billing portal |
| [7. Feature Gating Middleware](#section-7-feature-gating-middleware) | `requirePlan()` middleware for server-side plan checks |
| [8. Railway Deployment](#section-8-railway-deployment) | Deployment checklist, health checks, start commands |
| [9. React Frontend Setup](#section-9-react-frontend-setup) | ClerkProvider, routing, API helper, plan hooks |
| [10. Auth Components & Upgrade Flow](#section-10-auth-components--upgrade-flow) | Sign-in/up, billing page, plan gating components |
| [Troubleshooting](#troubleshooting) | Common errors and fixes |

---

## Section 1: Setup Checklist

### 1a. Clerk Dashboard Setup

1. **Create a Clerk application** at [clerk.com/dashboard](https://dashboard.clerk.com)
   - Choose "Organization" application type if prompted
   - Note your **Publishable Key** (`pk_test_...`) and **Secret Key** (`sk_test_...`)

2. **Enable Organizations**
   - Clerk Dashboard > Organizations (left sidebar) > Enable Organizations
   - Set "Allow users to create organizations" to **Yes**
   - Default roles: `admin` and `member` (sufficient for billing -- admin manages the subscription)

3. **Configure OAuth providers** (optional but recommended)
   - Clerk Dashboard > User & Authentication > Social Connections
   - Enable Google, GitHub, or others as appropriate for your product
   - For production: configure your own OAuth credentials (not Clerk's shared dev credentials)

4. **Set up webhook endpoint**
   - Clerk Dashboard > Webhooks > Add Endpoint
   - **URL:** `https://your-app.railway.app/api/webhooks/clerk` (use ngrok or Clerk CLI for local dev)
   - **Subscribe to these events:**
     - `user.created`
     - `user.updated`
     - `user.deleted`
     - `organization.created`
     - `organization.updated`
     - `organizationMembership.created`
     - `organizationMembership.updated`
     - `organizationMembership.deleted`
   - Copy the **Signing Secret** (`whsec_...`) -- this is your `CLERK_WEBHOOK_SIGNING_SECRET`

5. **Production instance** (when ready to ship)
   - Clerk Dashboard > Instances > Create Production Instance
   - Configure your custom domain (e.g., `auth.yourapp.com`)
   - Transfer OAuth provider credentials from dev to production
   - Update webhook endpoint URL to your production domain
   - Copy production API keys (they differ from dev keys)

### 1b. Stripe Dashboard Setup

1. **Create products and prices**
   - Stripe Dashboard > Product Catalog > Add Product
   - Example: "Pro Plan" with monthly ($29/mo) and annual ($290/yr) prices
   - Example: "Enterprise Plan" with monthly ($99/mo) and annual ($990/yr) prices
   - **Assign tax codes** to every product (required for Managed Payments):
     - SaaS products: `txcd_10000000` (Software as a Service)
     - Digital content: `txcd_10201000` (Digital - General)
   - Note each **Price ID** (`price_...`) -- you will need these in your env vars

2. **Enable Managed Payments**
   - Stripe Dashboard > Settings > Payments > Managed Payments
   - Follow the onboarding flow (verify business details, bank account, etc.)
   - Once enabled, Stripe becomes the merchant of record for all transactions

3. **Set up webhook endpoint**
   - Stripe Dashboard > Developers > Webhooks > Add Endpoint
   - **URL:** `https://your-app.railway.app/api/webhooks/stripe`
   - **Subscribe to these events:**
     - `checkout.session.completed`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Copy the **Signing Secret** (`whsec_...`) -- this is your `STRIPE_WEBHOOK_SECRET`

4. **Note: Managed Payments constraints**
   - Checkout says "Sold through Link" -- customers manage subscriptions via the Link app
   - Digital products only (SaaS, software, online courses -- no physical goods)
   - Do NOT pass `customer_update[address]` or `customer_update[name]` in Checkout Sessions -- Managed Payments auto-collects billing address for tax calculation
   - Adaptive Pricing auto-converts to the customer's local currency

### 1c. npm Packages

```bash
# Server dependencies
npm install @clerk/express@^1.7.4 stripe drizzle-orm @neondatabase/serverless dotenv cors

# Client dependencies
npm install @clerk/clerk-react react-router-dom

# Dev dependencies
npm install -D drizzle-kit @types/express @types/cors typescript tsx concurrently
```

> **Pin `@clerk/express` to >= 1.7.4.** Earlier versions of `verifyWebhook` had a security vulnerability that was patched in 1.7.4. You do NOT need the `svix` package -- `@clerk/express/webhooks` handles Clerk webhook verification.
>
> **Note:** `cors` is needed for cross-origin requests in development (Vite dev server on port 5173 to Express on port 3001). `react-router-dom` provides client-side routing. `tsx` and `concurrently` are for the `dev` script (see Section 8b).

---

## Section 2: Environment Variables

```bash
# ============================================================
# server/.env (NEVER commit this file)
# ============================================================

# Clerk — server-side
CLERK_SECRET_KEY=sk_test_xxxxx              # Clerk Dashboard > API Keys
CLERK_WEBHOOK_SIGNING_SECRET=whsec_xxxxx    # Clerk Dashboard > Webhooks > Signing Secret
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx         # Also needed server-side for clerkMiddleware

# Stripe — server-side
STRIPE_SECRET_KEY=sk_test_xxxxx             # Stripe Dashboard > Developers > API Keys
STRIPE_WEBHOOK_SECRET=whsec_xxxxx           # Stripe Dashboard > Developers > Webhooks > Signing Secret

# Stripe Price IDs — map to your plan tiers
STRIPE_PRICE_PRO_MONTHLY=price_xxxxx        # Stripe Dashboard > Product > Pro > Monthly price ID
STRIPE_PRICE_PRO_ANNUAL=price_xxxxx         # Stripe Dashboard > Product > Pro > Annual price ID
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxxxx
STRIPE_PRICE_ENTERPRISE_ANNUAL=price_xxxxx

# App
APP_URL=http://localhost:5173               # Your frontend URL (no trailing slash)
PORT=3001                                   # Express server port

# Database — Railway auto-injects this for linked Postgres
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

```bash
# ============================================================
# client/.env (committed to repo -- client vars are public)
# ============================================================

# Clerk — client-side (VITE_ prefix required for Vite to expose to browser)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx    # Same key as CLERK_PUBLISHABLE_KEY

# Stripe Price IDs — used by the BillingPage to pass priceId to POST /api/checkout
# These are not secret (they are visible in Stripe Checkout URLs).
VITE_STRIPE_PRICE_PRO_MONTHLY=price_xxxxx
VITE_STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxxxx
```

**Railway-specific notes:**
- Set all server env vars in Railway Dashboard > Service > Variables
- Use **Shared Variables** for values used by multiple services (e.g., `APP_URL`)
- `DATABASE_URL` is auto-injected when you link a Postgres service -- do not set it manually
- For production, use `sk_live_` and `pk_live_` keys (not `sk_test_`/`pk_test_`)
- Mark `STRIPE_SECRET_KEY`, `CLERK_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET` as **sealed** in Railway (visible only during set, encrypted at rest)

**Dev vs Production differences:**

| Variable | Development | Production |
|----------|------------|------------|
| `CLERK_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `CLERK_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | From Stripe CLI (`stripe listen`) | From Stripe Dashboard |
| `APP_URL` | `http://localhost:5173` | `https://yourapp.com` |
| Webhook URLs | ngrok or Clerk/Stripe CLI tunnels | Railway public URL |

---

## Section 3: Drizzle Schema

The full schema is in `skills/development/templates/clerk-stripe-schema.ts`. Copy it into your project:

```bash
mkdir -p server/db/schema
cp skills/development/templates/clerk-stripe-schema.ts server/db/schema/auth-billing.ts
```

The schema defines four tables:

| Table | Purpose | Unique indexes |
|-------|---------|---------------|
| `users` | Local mirror of Clerk users | `clerkUserId` |
| `organizations` | Clerk orgs + Stripe billing state | `clerkOrgId`, `stripeCustomerId` |
| `orgMemberships` | User-to-org membership with role | composite `(clerkOrgId, clerkUserId)` |
| `processedEvents` | Webhook deduplication | `eventId` (PK) |

**Key design decisions:**
- `serial` primary keys for simplicity (auto-increment integers)
- `text` for external IDs (Clerk and Stripe IDs are strings of varying length)
- `timestamp with timezone` for all date columns
- The `organizations` table holds billing state (`plan`, `planStatus`, `stripeSubscriptionId`) because DB is the source of truth
- `processedEvents` enables idempotent webhook handlers -- both Clerk and Stripe retry on failure

**After copying, generate and run the migration:**

```bash
# drizzle.config.ts should point to your schema file
npx drizzle-kit generate
npx drizzle-kit migrate
```

**Drizzle config example:**

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/db/schema/*.ts",
  out: "./server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Database connection file** -- every code example in this doc imports `db` from `../db/index.js`. Create this file to set up the Drizzle client:

```typescript
// server/db/index.ts
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";

// For Railway Postgres, @neondatabase/serverless works as a standard
// Postgres driver over WebSockets. If you prefer a traditional driver,
// replace with: import { drizzle } from "drizzle-orm/node-postgres";
//               import { Pool } from "pg";
//               npm install pg @types/pg (instead of @neondatabase/serverless)

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle(pool);
```

---

## Section 4: Express Server Setup

This is the most critical section. Middleware ordering determines whether webhook verification works. Get this wrong and every webhook will fail with a 400 signature error.

### 4a. Complete server/index.ts (Correct Middleware Ordering)

```typescript
// server/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { handleClerkWebhook } from "./webhooks/clerk.js";
import { handleStripeWebhook } from "./webhooks/stripe.js";
import { apiRouter } from "./routes/index.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------
// MIDDLEWARE ORDERING — THIS ORDER IS NOT OPTIONAL
// ---------------------------------------------------------------

// 1. CORS — allow requests from your frontend
app.use(
  cors({
    origin: process.env.APP_URL,
    credentials: true,
  })
);

// 2. WEBHOOK ROUTES — MUST come BEFORE express.json() and clerkMiddleware()
//    Webhooks need the raw Buffer body for HMAC signature verification.
//    express.json() would parse the body into an object, destroying the
//    raw bytes and breaking verification.
//    clerkMiddleware() must NOT run on webhook routes — webhooks are
//    unauthenticated external requests from Clerk/Stripe servers.
app.post(
  "/api/webhooks/clerk",
  express.raw({ type: "application/json" }),
  handleClerkWebhook
);

app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

// 3. JSON body parsing — for all non-webhook routes
app.use(express.json());

// 4. Clerk auth middleware — validates session tokens on all subsequent routes.
//    authorizedParties prevents subdomain cookie leaking in production.
app.use(
  clerkMiddleware({
    authorizedParties: process.env.APP_URL ? [process.env.APP_URL] : undefined,
  })
);

// 5. Health check — unauthenticated (useful for Railway health checks)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 6. Protected API routes — Clerk auth is available via getAuth(req)
app.use("/api", apiRouter);

// ---------------------------------------------------------------
// Start server
// ---------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Why this order matters:**
1. CORS runs first so preflight requests work.
2. Webhook routes use `express.raw()` per-route to get the raw `Buffer` body. This MUST come before `express.json()`, which would parse the body and destroy the raw bytes needed for HMAC verification.
3. `express.json()` applies to all routes declared after it -- every non-webhook route gets parsed JSON.
4. `clerkMiddleware()` attaches auth info to every subsequent request. It does NOT reject unauthenticated requests on its own -- that is the job of `requireAuth()` or `getAuth()` in individual route handlers.
5. Routes after `clerkMiddleware()` can access `getAuth(req)` to read the session.

### 4b. Authentication Helpers

```typescript
// server/middleware/auth.ts
import { getAuth, requireAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

// requireAuth() — returns 401 if no valid session.
// Use as route middleware for endpoints that require a logged-in user.
export { requireAuth };

// getAuth() — reads auth state without rejecting.
// Returns { userId, orgId, orgRole, sessionId, has } or nulls.
export { getAuth };

// requireOrgAdmin() — returns 403 if user is not an org admin.
// Uses has() which abstracts over session token v1/v2 format differences.
export function requireOrgAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);

  if (!auth.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!auth.orgId) {
    return res.status(400).json({ error: "No active organization selected" });
  }

  // has() handles token version differences internally.
  // Do NOT compare orgRole strings directly — the format changed between
  // session token v1 ('org:admin') and v2 ('admin').
  if (!auth.has({ role: "org:admin" })) {
    return res.status(403).json({ error: "Only organization admins can perform this action" });
  }

  next();
}
```

**Usage in routes:**

```typescript
// server/routes/index.ts
import { Router } from "express";
import { requireAuth } from "@clerk/express";
import { requireOrgAdmin } from "../middleware/auth.js";
import { requirePlan } from "../middleware/plan-gate.js";
import { checkoutRouter } from "./checkout.js";
import { billingRouter } from "./billing.js";

export const apiRouter = Router();

// Mount sub-routers (defined in Sections 6b and 6c)
apiRouter.use(checkoutRouter);
apiRouter.use(billingRouter);

// Public route (no auth needed — but still behind clerkMiddleware for session parsing)
apiRouter.get("/plans", getPlansHandler);

// Requires logged-in user
apiRouter.get("/me", requireAuth(), getMeHandler);

// Requires specific plan tier
apiRouter.get("/advanced-feature", requireAuth(), requirePlan("pro", "enterprise"), advancedHandler);
```

> **How routes connect:** The `apiRouter` in `server/routes/index.ts` is mounted at `/api` in `server/index.ts` (Section 4a). The `checkoutRouter` and `billingRouter` from Sections 6b and 6c are sub-routers mounted onto `apiRouter`. So `checkoutRouter.post("/checkout", ...)` becomes `POST /api/checkout`, and `billingRouter.post("/billing/portal", ...)` becomes `POST /api/billing/portal`.

---

## Section 5: Clerk Webhook Handlers

Uses `verifyWebhook` from `@clerk/express/webhooks` -- not raw Svix. This is Clerk's first-party helper. It verifies the HMAC signature internally using the `CLERK_WEBHOOK_SIGNING_SECRET` env var.

```typescript
// server/webhooks/clerk.ts
import type { Request, Response } from "express";
import { verifyWebhook, type WebhookEvent } from "@clerk/express/webhooks";
import Stripe from "stripe";
import { db } from "../db/index.js";
import { users, organizations, orgMemberships, processedEvents } from "../db/schema/auth-billing.js";
import { eq, and } from "drizzle-orm";
import { clerkClient } from "@clerk/express";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function handleClerkWebhook(req: Request, res: Response) {
  let evt: WebhookEvent;

  try {
    evt = verifyWebhook(req);
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    return res.status(400).json({ error: "Webhook verification failed" });
  }

  // ------------------------------------------------------------------
  // Idempotency check — skip if we already processed this event.
  // Clerk (via Svix) retries failed deliveries. Without this check,
  // a retry could create duplicate Stripe Customers.
  // ------------------------------------------------------------------
  const eventId = req.headers["svix-id"] as string;
  if (eventId) {
    const [existing] = await db
      .select()
      .from(processedEvents)
      .where(eq(processedEvents.eventId, eventId))
      .limit(1);

    if (existing) {
      return res.json({ received: true, skipped: true });
    }
  }

  try {
    switch (evt.type) {
      // ================================================================
      // USER EVENTS
      // ================================================================

      case "user.created": {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        const primaryEmail = email_addresses?.[0]?.email_address ?? "";
        const name = [first_name, last_name].filter(Boolean).join(" ") || null;

        await db
          .insert(users)
          .values({
            clerkUserId: id,
            email: primaryEmail,
            name,
            avatarUrl: image_url ?? null,
          })
          .onConflictDoUpdate({
            target: users.clerkUserId,
            set: { email: primaryEmail, name, avatarUrl: image_url ?? null, updatedAt: new Date() },
          });

        break;
      }

      case "user.updated": {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        const primaryEmail = email_addresses?.[0]?.email_address ?? "";
        const name = [first_name, last_name].filter(Boolean).join(" ") || null;

        await db
          .update(users)
          .set({ email: primaryEmail, name, avatarUrl: image_url ?? null, updatedAt: new Date() })
          .where(eq(users.clerkUserId, id));

        break;
      }

      case "user.deleted": {
        const { id } = evt.data;
        if (id) {
          await db.delete(users).where(eq(users.clerkUserId, id));
        }
        break;
      }

      // ================================================================
      // ORGANIZATION EVENTS
      // ================================================================

      case "organization.created": {
        const { id: clerkOrgId, name } = evt.data;

        // Check if this org was already created eagerly (see Section 6b note
        // on eager Stripe Customer creation). The synchronous creation path
        // creates the org + Stripe Customer before this webhook fires.
        // This handler is the safety net.
        const [existingOrg] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.clerkOrgId, clerkOrgId))
          .limit(1);

        if (!existingOrg) {
          // Create Stripe Customer for this org.
          // The clerkOrgId in metadata enables cross-referencing from Stripe back to Clerk.
          const customer = await stripe.customers.create({
            name,
            metadata: { clerkOrgId },
          });

          await db.insert(organizations).values({
            clerkOrgId,
            stripeCustomerId: customer.id,
            name,
            plan: "free",
            planStatus: "active",
          });
        }

        break;
      }

      case "organization.updated": {
        const { id: clerkOrgId, name } = evt.data;

        // Sync name change to local DB and Stripe Customer
        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.clerkOrgId, clerkOrgId))
          .limit(1);

        if (org) {
          await db
            .update(organizations)
            .set({ name, updatedAt: new Date() })
            .where(eq(organizations.clerkOrgId, clerkOrgId));

          if (org.stripeCustomerId) {
            await stripe.customers.update(org.stripeCustomerId, { name });
          }
        }

        break;
      }

      // ================================================================
      // ORGANIZATION MEMBERSHIP EVENTS
      // ================================================================

      case "organizationMembership.created": {
        const { organization, public_user_data, role } = evt.data;

        await db
          .insert(orgMemberships)
          .values({
            clerkOrgId: organization.id,
            clerkUserId: public_user_data.user_id,
            role: role ?? "member",
          })
          .onConflictDoUpdate({
            target: [orgMemberships.clerkOrgId, orgMemberships.clerkUserId],
            set: { role: role ?? "member", updatedAt: new Date() },
          });

        break;
      }

      case "organizationMembership.updated": {
        const { organization, public_user_data, role } = evt.data;

        await db
          .update(orgMemberships)
          .set({ role: role ?? "member", updatedAt: new Date() })
          .where(
            and(
              eq(orgMemberships.clerkOrgId, organization.id),
              eq(orgMemberships.clerkUserId, public_user_data.user_id)
            )
          );

        break;
      }

      case "organizationMembership.deleted": {
        const { organization, public_user_data } = evt.data;

        await db
          .delete(orgMemberships)
          .where(
            and(
              eq(orgMemberships.clerkOrgId, organization.id),
              eq(orgMemberships.clerkUserId, public_user_data.user_id)
            )
          );

        break;
      }
    }

    // Record that we processed this event
    if (eventId) {
      await db
        .insert(processedEvents)
        .values({ eventId, source: "clerk" })
        .onConflictDoNothing();
    }

    return res.json({ received: true });
  } catch (err) {
    console.error(`Clerk webhook handler error for ${evt.type}:`, err);
    // Return 500 so Clerk retries the delivery
    return res.status(500).json({ error: "Webhook handler failed" });
  }
}
```

**Key points:**
- `verifyWebhook(req)` reads the raw body from `req.body` (which is a `Buffer` because of `express.raw()`) and the `svix-*` headers. It throws on invalid signatures.
- Every handler uses `onConflictDoUpdate` or existence checks for idempotency -- safe to re-process on retry.
- `organization.created` creates a Stripe Customer as a safety net. The primary path is eager creation in your org-creation API endpoint (see Section 6 note on eager creation).
- Return 500 on handler errors so Clerk retries. Return 200 only on success.

---

## Section 6: Stripe Integration

### 6a. Stripe Webhook Handlers

```typescript
// server/webhooks/stripe.ts
import type { Request, Response } from "express";
import Stripe from "stripe";
import { db } from "../db/index.js";
import { organizations, processedEvents } from "../db/schema/auth-billing.js";
import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/express";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ---------------------------------------------------------------
// Price-to-plan mapping — configure per product.
// Maps Stripe Price IDs to your plan tier names.
// ---------------------------------------------------------------
const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRICE_PRO_MONTHLY!]: "pro",
  [process.env.STRIPE_PRICE_PRO_ANNUAL!]: "pro",
  [process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY!]: "enterprise",
  [process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL!]: "enterprise",
};

export async function handleStripeWebhook(req: Request, res: Response) {
  let event: Stripe.Event;

  try {
    const sig = req.headers["stripe-signature"] as string;
    // req.body is a raw Buffer because of express.raw() on this route
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return res.status(400).json({ error: "Webhook signature verification failed" });
  }

  // ------------------------------------------------------------------
  // Idempotency check
  // ------------------------------------------------------------------
  const [existing] = await db
    .select()
    .from(processedEvents)
    .where(eq(processedEvents.eventId, event.id))
    .limit(1);

  if (existing) {
    return res.json({ received: true, skipped: true });
  }

  try {
    switch (event.type) {
      // ================================================================
      // checkout.session.completed — initial subscription purchase
      // Fires once when the customer completes Stripe Checkout.
      // ================================================================
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await activatePlan(session.customer as string, subscription);
        }

        break;
      }

      // ================================================================
      // invoice.paid — recurring payment succeeded
      // Fires on every successful invoice payment (initial + renewals).
      // Confirms the subscription is active.
      // ================================================================
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.subscription) {
          await db
            .update(organizations)
            .set({ planStatus: "active", updatedAt: new Date() })
            .where(eq(organizations.stripeCustomerId, invoice.customer as string));

          // Mirror to Clerk publicMetadata
          await syncPlanToClerk(invoice.customer as string);
        }

        break;
      }

      // ================================================================
      // invoice.payment_failed — payment failed (dunning)
      // Fires when a recurring charge fails. Mark the plan as past_due
      // so feature gating can restrict access.
      // ================================================================
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        await db
          .update(organizations)
          .set({ planStatus: "past_due", updatedAt: new Date() })
          .where(eq(organizations.stripeCustomerId, invoice.customer as string));

        // Mirror to Clerk publicMetadata
        await syncPlanToClerk(invoice.customer as string);

        // Optionally: trigger a dunning email via Loops
        // await loopsClient.sendEvent({ ... });

        break;
      }

      // ================================================================
      // customer.subscription.updated — plan change
      // Fires on upgrade, downgrade, quantity change, or status change.
      // ================================================================
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await activatePlan(subscription.customer as string, subscription);
        break;
      }

      // ================================================================
      // customer.subscription.deleted — cancellation
      // Fires when a subscription is fully canceled (not just at period end).
      // Revert to the free plan.
      // ================================================================
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await db
          .update(organizations)
          .set({
            plan: "free",
            planStatus: "active",
            stripeSubscriptionId: null,
            updatedAt: new Date(),
          })
          .where(eq(organizations.stripeCustomerId, subscription.customer as string));

        // Mirror to Clerk publicMetadata
        await syncPlanToClerk(subscription.customer as string);

        break;
      }
    }

    // Record processed event
    await db
      .insert(processedEvents)
      .values({ eventId: event.id, source: "stripe" })
      .onConflictDoNothing();

    return res.json({ received: true });
  } catch (err) {
    console.error(`Stripe webhook handler error for ${event.type}:`, err);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
}

// ---------------------------------------------------------------
// activatePlan — maps a Stripe Subscription to a plan tier and
// updates the organizations table + Clerk publicMetadata.
// ---------------------------------------------------------------
async function activatePlan(stripeCustomerId: string, subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id;
  const plan = PRICE_TO_PLAN[priceId] ?? "free";

  await db
    .update(organizations)
    .set({
      plan,
      planStatus: subscription.status, // 'active', 'past_due', 'trialing', etc.
      stripeSubscriptionId: subscription.id,
      updatedAt: new Date(),
    })
    .where(eq(organizations.stripeCustomerId, stripeCustomerId));

  await syncPlanToClerk(stripeCustomerId);
}

// ---------------------------------------------------------------
// syncPlanToClerk — mirrors plan info to Clerk org publicMetadata
// so the React frontend can read it without an API call.
// This is a convenience mirror. DB is always the source of truth.
// ---------------------------------------------------------------
async function syncPlanToClerk(stripeCustomerId: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.stripeCustomerId, stripeCustomerId))
    .limit(1);

  if (org?.clerkOrgId) {
    try {
      await clerkClient.organizations.updateOrganizationMetadata(org.clerkOrgId, {
        publicMetadata: {
          plan: org.plan,
          planStatus: org.planStatus,
        },
      });
    } catch (err) {
      // Non-fatal — the DB is the source of truth. Log and continue.
      console.error("Failed to sync plan to Clerk publicMetadata:", err);
    }
  }
}
```

### 6b. Checkout Session Endpoint

```typescript
// server/routes/checkout.ts
import { Router } from "express";
import { getAuth } from "@clerk/express";
import Stripe from "stripe";
import { db } from "../db/index.js";
import { organizations } from "../db/schema/auth-billing.js";
import { eq } from "drizzle-orm";
import { requireOrgAdmin } from "../middleware/auth.js";
import { clerkClient } from "@clerk/express";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const checkoutRouter = Router();

// POST /api/checkout — create a Stripe Checkout Session
// Requires: authenticated user + org admin role
checkoutRouter.post("/checkout", requireOrgAdmin, async (req, res) => {
  const auth = getAuth(req);
  const { priceId } = req.body;

  if (!priceId || typeof priceId !== "string") {
    return res.status(400).json({ error: "priceId is required" });
  }

  if (!auth.orgId) {
    return res.status(400).json({ error: "No active organization" });
  }

  try {
    // Look up the org's Stripe Customer
    let [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.clerkOrgId, auth.orgId))
      .limit(1);

    // ---------------------------------------------------------------
    // On-demand fallback: if the org exists in Clerk but has no
    // Stripe Customer yet (e.g., eager creation failed, or the org was
    // created via Clerk Dashboard), create the Customer now.
    // ---------------------------------------------------------------
    if (!org || !org.stripeCustomerId) {
      const clerkOrg = await clerkClient.organizations.getOrganization({
        organizationId: auth.orgId,
      });

      const customer = await stripe.customers.create({
        name: clerkOrg.name,
        metadata: { clerkOrgId: auth.orgId },
      });

      if (org) {
        // Org record exists but missing Stripe Customer
        await db
          .update(organizations)
          .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
          .where(eq(organizations.clerkOrgId, auth.orgId));
      } else {
        // No org record at all — create it
        await db.insert(organizations).values({
          clerkOrgId: auth.orgId,
          stripeCustomerId: customer.id,
          name: clerkOrg.name,
          plan: "free",
          planStatus: "active",
        });
      }

      // Re-read the org so we have the stripeCustomerId
      [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.clerkOrgId, auth.orgId))
        .limit(1);
    }

    // Create the Checkout Session
    // Managed Payments: do NOT pass customer_update options —
    // Stripe auto-collects billing address for tax calculation.
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: org!.stripeCustomerId!,
      line_items: [{ price: priceId, quantity: 1 }],
      // Belt-and-suspenders: clerkOrgId in metadata enables cross-referencing
      // from the subscription back to the org, independent of the Customer link.
      subscription_data: {
        metadata: { clerkOrgId: auth.orgId },
      },
      success_url: `${process.env.APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.APP_URL}/settings/billing?canceled=true`,
    });

    return res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error("Checkout session creation failed:", err);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
});
```

**Note on eager Stripe Customer creation:** The recommended pattern is to create the Stripe Customer synchronously when the user creates an org in your app, BEFORE the Clerk webhook fires. This avoids a race condition where the user tries to upgrade immediately after creating an org but the webhook hasn't processed yet. The code above handles both the happy path (Customer exists) and the fallback (Customer doesn't exist yet). If your product uses Clerk's `<CreateOrganization />` component rather than a custom endpoint, the webhook-based creation is your primary path and the checkout fallback is your safety net.

### 6c. Billing Portal Endpoint (Optional)

```typescript
// server/routes/billing.ts
import { Router } from "express";
import { getAuth } from "@clerk/express";
import Stripe from "stripe";
import { db } from "../db/index.js";
import { organizations } from "../db/schema/auth-billing.js";
import { eq } from "drizzle-orm";
import { requireOrgAdmin } from "../middleware/auth.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const billingRouter = Router();

// POST /api/billing/portal — create a Stripe Billing Portal session
// Under Managed Payments, the portal is primarily for payment method updates.
// Subscription management (upgrade, downgrade, cancel) is handled by Link.
billingRouter.post("/billing/portal", requireOrgAdmin, async (req, res) => {
  const auth = getAuth(req);

  if (!auth.orgId) {
    return res.status(400).json({ error: "No active organization" });
  }

  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.clerkOrgId, auth.orgId))
      .limit(1);

    if (!org?.stripeCustomerId) {
      return res.status(404).json({ error: "No billing account found for this organization" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${process.env.APP_URL}/settings/billing`,
    });

    return res.json({ portalUrl: session.url });
  } catch (err) {
    console.error("Billing portal session creation failed:", err);
    return res.status(500).json({ error: "Failed to create billing portal session" });
  }
});
```

> **Managed Payments caveat:** Under Managed Payments, customers manage subscriptions (upgrade, downgrade, cancel) via the Link app, NOT the Billing Portal. The portal is still useful for payment method management. Test the exact portal behavior during development of each product -- Stripe may expand or change what is available under Managed Payments.

---

## Section 7: Feature Gating Middleware

The `requirePlan()` middleware checks the **database** for plan status. Never gate features based on Clerk publicMetadata server-side -- the DB is the source of truth.

```typescript
// server/middleware/plan-gate.ts
import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db } from "../db/index.js";
import { organizations } from "../db/schema/auth-billing.js";
import { eq } from "drizzle-orm";

// Cache org plan lookups for the duration of a request.
// If multiple middlewares or handlers need the org, avoid redundant DB queries.
declare global {
  namespace Express {
    interface Request {
      orgPlan?: { plan: string; planStatus: string };
    }
  }
}

/**
 * requirePlan() — Express middleware that gates routes by plan tier.
 *
 * Returns:
 *   401 — not authenticated
 *   400 — no active organization selected
 *   404 — organization not found in database
 *   402 — subscription is not active (past_due, canceled, etc.)
 *   403 — plan does not match required tier
 *
 * Usage:
 *   app.get('/api/pro-feature', requireAuth(), requirePlan('pro', 'enterprise'), handler);
 *   app.get('/api/enterprise-only', requireAuth(), requirePlan('enterprise'), handler);
 */
export function requirePlan(...allowedPlans: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!auth.orgId) {
      return res.status(400).json({ error: "No active organization selected" });
    }

    // Use cached plan if available (avoids redundant DB query)
    let plan = req.orgPlan;

    if (!plan) {
      const [org] = await db
        .select({ plan: organizations.plan, planStatus: organizations.planStatus })
        .from(organizations)
        .where(eq(organizations.clerkOrgId, auth.orgId))
        .limit(1);

      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      plan = org;
      req.orgPlan = plan; // Cache for subsequent middleware in this request
    }

    // Check subscription status first — inactive subscriptions block access
    // regardless of plan tier
    if (plan.planStatus !== "active" && plan.planStatus !== "trialing") {
      return res.status(402).json({
        error: "Subscription inactive",
        planStatus: plan.planStatus,
        message: "Your subscription is not active. Please update your payment method.",
      });
    }

    // Check plan tier
    if (!allowedPlans.includes(plan.plan)) {
      return res.status(403).json({
        error: "Plan upgrade required",
        currentPlan: plan.plan,
        requiredPlans: allowedPlans,
        message: `This feature requires one of: ${allowedPlans.join(", ")}`,
      });
    }

    next();
  };
}
```

**Usage examples:**

```typescript
// server/routes/index.ts
import { requireAuth } from "@clerk/express";
import { requirePlan } from "../middleware/plan-gate.js";

// Free features — no plan check needed, just auth
apiRouter.get("/projects", requireAuth(), listProjectsHandler);

// Pro features — requires active pro or enterprise plan
apiRouter.post("/projects/export", requireAuth(), requirePlan("pro", "enterprise"), exportHandler);

// Enterprise features — requires active enterprise plan
apiRouter.get("/audit-log", requireAuth(), requirePlan("enterprise"), auditLogHandler);
```

---

## Section 8: Railway Deployment

### 8a. Deployment Checklist

Follow these steps in order:

1. **Create Railway project**
   - Railway Dashboard > New Project
   - Add a **Postgres** service (Railway will auto-inject `DATABASE_URL`)

2. **Add your app service**
   - Connect your GitHub repo, or deploy via `railway up`
   - Railway auto-detects Node.js and runs `npm start`

3. **Set environment variables**
   - Railway Dashboard > Service > Variables
   - Add every variable from Section 2 (server-side variables only -- client vars are baked into the Vite build)
   - Mark secrets as **sealed**: `CLERK_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLERK_WEBHOOK_SIGNING_SECRET`
   - Set `APP_URL` to your Railway public URL or custom domain (e.g., `https://yourapp.up.railway.app`)

4. **Generate a public domain**
   - Railway Dashboard > Service > Settings > Networking > Generate Domain
   - Or configure a custom domain

5. **Run database migrations**
   ```bash
   # Option A: Railway CLI
   railway run npx drizzle-kit migrate

   # Option B: Add a migration script to package.json
   # "db:migrate": "drizzle-kit migrate"
   # Then: railway run npm run db:migrate
   ```

6. **Update webhook URLs**
   - Clerk Dashboard > Webhooks > Edit Endpoint > set URL to `https://your-domain.railway.app/api/webhooks/clerk`
   - Stripe Dashboard > Developers > Webhooks > Edit Endpoint > set URL to `https://your-domain.railway.app/api/webhooks/stripe`

7. **Verify webhooks**
   - Create a test user in Clerk > verify `user.created` webhook fires and creates a DB record
   - Create a test org > verify Stripe Customer is created
   - Complete a test checkout (use Stripe test mode card `4242 4242 4242 4242`) > verify plan activates

### 8b. Procfile / Start Command

Railway auto-detects `npm start`. Your `package.json` should have:

```json
{
  "scripts": {
    "start": "node server/dist/index.js",
    "build": "tsc -p server/tsconfig.json",
    "dev": "concurrently \"vite\" \"tsx watch server/index.ts\"",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

Railway runs `npm run build` then `npm start` by default. If you need a custom build command:

- Railway Dashboard > Service > Settings > Build Command: `npm run build`
- Railway Dashboard > Service > Settings > Start Command: `npm start`

### 8c. Health Check

Configure Railway's health check to hit your `/api/health` endpoint:

- Railway Dashboard > Service > Settings > Health Check Path: `/api/health`
- This prevents Railway from routing traffic to a service that hasn't finished starting

---

## Webhook Event Quick Reference

| Event | Source | What It Does | Handler |
|-------|--------|-------------|---------|
| `user.created` | Clerk | Creates local user record | `handleClerkWebhook` |
| `user.updated` | Clerk | Updates local user email, name, avatar | `handleClerkWebhook` |
| `user.deleted` | Clerk | Deletes local user record | `handleClerkWebhook` |
| `organization.created` | Clerk | Creates local org + Stripe Customer (safety net) | `handleClerkWebhook` |
| `organization.updated` | Clerk | Syncs org name to DB + Stripe | `handleClerkWebhook` |
| `organizationMembership.created` | Clerk | Creates local membership record | `handleClerkWebhook` |
| `organizationMembership.updated` | Clerk | Updates membership role | `handleClerkWebhook` |
| `organizationMembership.deleted` | Clerk | Deletes membership record | `handleClerkWebhook` |
| `checkout.session.completed` | Stripe | Activates plan after first checkout | `handleStripeWebhook` |
| `invoice.paid` | Stripe | Confirms active status on renewal | `handleStripeWebhook` |
| `invoice.payment_failed` | Stripe | Sets plan status to `past_due` | `handleStripeWebhook` |
| `customer.subscription.updated` | Stripe | Handles upgrade/downgrade | `handleStripeWebhook` |
| `customer.subscription.deleted` | Stripe | Reverts to free plan | `handleStripeWebhook` |

---

## Section 9: React Frontend Setup

This section covers the React application shell: `ClerkProvider`, routing, protected routes, and a reusable API helper. All code uses React Router v6+ with Vite. The backend endpoints referenced here are defined in Sections 6 and 7.

### 9a. ClerkProvider Setup

Wrap your entire app in `ClerkProvider`. The publishable key comes from the Vite-prefixed env var (see Section 2).

```typescript
// client/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App.tsx";
import "./index.css";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in environment");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
);
```

**Key points:**
- `afterSignOutUrl="/"` redirects to your landing page after sign-out. Change this to match your product's public route.
- `ClerkProvider` must wrap `BrowserRouter` so Clerk components can access the router for redirects.
- The env var **must** use the `VITE_` prefix -- Vite only exposes env vars with this prefix to client code. See Section 2.

### 9b. Routing with Public and Protected Routes

Use Clerk's `<SignedIn>` and `<SignedOut>` components to gate access. These read session state from `ClerkProvider` -- no API call required.

```typescript
// client/src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { AppLayout } from "./layouts/AppLayout.tsx";
import { LandingPage } from "./pages/LandingPage.tsx";
import { SignInPage } from "./pages/SignInPage.tsx";
import { SignUpPage } from "./pages/SignUpPage.tsx";
import { DashboardPage } from "./pages/DashboardPage.tsx";
import { BillingPage } from "./pages/BillingPage.tsx";

/**
 * ProtectedRoute — renders children only if the user is signed in.
 * Redirects to the Clerk sign-in page otherwise.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

export function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

      {/* Protected routes — require authentication */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings/billing" element={<BillingPage />} />
        {/* Add more protected routes here */}
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

**Why `<SignedIn>` / `<SignedOut>` over `useAuth()` guards:**
- They are declarative and render synchronously from the Clerk session cache.
- No loading flicker -- Clerk's `<ClerkProvider>` hydrates the session before children render.
- `<RedirectToSignIn />` automatically constructs the redirect URL so the user returns to the protected page after signing in.

### 9c. API Helper

Since the backend runs on the same origin (Express serves the Vite build in production, Vite proxies `/api` in development), **cookies are sent automatically**. You do NOT need `getToken()` or `Authorization` headers. This is simpler and more secure than token-based auth.

```typescript
// client/src/lib/api.ts

/**
 * Typed API error that includes the HTTP status and the error body.
 * Throw this from the api helper so callers can distinguish between
 * network errors and server-returned errors.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>
  ) {
    super(body.error as string ?? body.message as string ?? `API error ${status}`);
    this.name = "ApiError";
  }
}

/**
 * Lightweight fetch wrapper for calling the backend.
 *
 * - Sends cookies automatically (same-origin — no Bearer token needed).
 * - Parses JSON responses.
 * - Throws ApiError on non-2xx responses with the parsed error body.
 *
 * Usage:
 *   const data = await api<{ projects: Project[] }>("/api/projects");
 *   const { checkoutUrl } = await api<{ checkoutUrl: string }>("/api/checkout", {
 *     method: "POST",
 *     body: { priceId: "price_xxx" },
 *   });
 */
export async function api<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    // credentials: "same-origin" is the default for same-origin requests.
    // Clerk's session cookie is sent automatically.
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data as T;
}
```

**Vite proxy configuration** (for local development — in production, Express serves everything):

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
```

This proxies all `/api/*` requests from Vite's dev server (port 5173) to Express (port 3001), preserving cookies. In production, Express serves the built Vite assets directly -- no proxy needed.

### 9d. Reading Org Plan from Clerk Metadata (Client-Side)

For fast UI gating (showing/hiding features, displaying the current plan), read from Clerk's org `publicMetadata`. This is the convenience mirror that the Stripe webhook handler syncs (see Section 6a, `syncPlanToClerk`). The DB is still the source of truth -- the server-side `requirePlan()` middleware (Section 7) always checks the DB.

```typescript
// client/src/hooks/useOrgPlan.ts
import { useOrganization } from "@clerk/clerk-react";

interface OrgPlan {
  plan: string;
  planStatus: string;
}

/**
 * useOrgPlan — reads the current org's plan from Clerk publicMetadata.
 *
 * Returns:
 *   - plan: "free" | "pro" | "enterprise" (defaults to "free" if unset)
 *   - planStatus: "active" | "past_due" | "trialing" | etc.
 *   - isLoaded: whether the org data has loaded from Clerk
 *
 * This reads from Clerk's JWT / session cache — no API call to your backend.
 * Use this for UI gating (show/hide features). For authorization, the server
 * uses requirePlan() middleware which checks the database (Section 7).
 */
export function useOrgPlan() {
  const { organization, isLoaded } = useOrganization();

  const metadata = organization?.publicMetadata as OrgPlan | undefined;

  return {
    plan: metadata?.plan ?? "free",
    planStatus: metadata?.planStatus ?? "active",
    isLoaded,
  };
}
```

**Usage example — conditional rendering by plan:**

```typescript
// In any component
import { useOrgPlan } from "../hooks/useOrgPlan.ts";

function ExportButton() {
  const { plan } = useOrgPlan();

  if (plan === "free") {
    return <UpgradePrompt feature="Export" requiredPlan="pro" />;
  }

  return <button onClick={handleExport}>Export</button>;
}
```

**Important:** `publicMetadata` updates when the Clerk session refreshes. After a Stripe checkout completes and the webhook fires, there can be a brief delay (1-10 seconds) before the client sees the updated plan. See Section 10d for how to handle this on the success redirect page.

---

## Section 10: Auth Components & Upgrade Flow

This section covers the auth UI components (sign-in, sign-up, navigation) and the full upgrade/billing flow. All components use the `api` helper from Section 9c and the `useOrgPlan` hook from Section 9d.

### 10a. Sign-In and Sign-Up Pages

Clerk's pre-built `<SignIn />` and `<SignUp />` components handle the entire auth flow: email/password, OAuth providers, MFA, email verification. They read their configuration from the Clerk Dashboard (which providers are enabled, required fields, etc.).

```typescript
// client/src/pages/SignInPage.tsx
import { SignIn } from "@clerk/clerk-react";

export function SignInPage() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: "4rem" }}>
      <SignIn
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
      />
    </div>
  );
}
```

```typescript
// client/src/pages/SignUpPage.tsx
import { SignUp } from "@clerk/clerk-react";

export function SignUpPage() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: "4rem" }}>
      <SignUp
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/dashboard"
      />
    </div>
  );
}
```

**Key props:**
- `path` — must match the route in your router (Section 9b). The `/*` wildcard in the route handles Clerk's multi-step flows.
- `signUpUrl` / `signInUrl` — cross-links between the two pages.
- `forceRedirectUrl` — where to send the user after successful sign-in/sign-up. Use this instead of `afterSignInUrl` when you always want the same destination regardless of where the user came from.

**Styling:** Clerk components use their own styles by default. Customize via the Clerk Dashboard (Appearance section) or the `appearance` prop. See [Clerk's theming docs](https://clerk.com/docs/customization/overview) for details.

### 10b. App Header with UserButton and OrganizationSwitcher

The app header shows the current user and their active organization. `<OrganizationSwitcher />` lets users switch between orgs or create new ones. `<UserButton />` provides the account menu (profile, sign out).

```typescript
// client/src/layouts/AppLayout.tsx
import { Outlet } from "react-router-dom";
import { UserButton, OrganizationSwitcher } from "@clerk/clerk-react";

export function AppLayout() {
  return (
    <div>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1.5rem",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <a href="/dashboard" style={{ fontWeight: 600, fontSize: "1.125rem" }}>
            YourApp
          </a>
          <OrganizationSwitcher
            hidePersonal
            afterSelectOrganizationUrl="/dashboard"
            afterCreateOrganizationUrl="/dashboard"
          />
        </div>
        <UserButton afterSignOutUrl="/" />
      </header>

      {/* Page content rendered by nested routes */}
      <main style={{ padding: "1.5rem" }}>
        <Outlet />
      </main>
    </div>
  );
}
```

**Key props:**
- `hidePersonal` on `OrganizationSwitcher` — hides the "Personal" workspace. Use this when your product requires an organization (billing is per-org, not per-user). Omit it if users can also work outside of an organization.
- `afterSelectOrganizationUrl` — where to navigate when the user switches orgs. The page reloads with the new org context. All `useAuth()` and `useOrganization()` hooks update automatically.
- `afterSignOutUrl` on `UserButton` — matches the `afterSignOutUrl` on `ClerkProvider` (Section 9a).

### 10c. Billing Page with Upgrade and Manage Billing

The billing page shows the current plan and provides actions: upgrade (calls `POST /api/checkout`, Section 6b) and manage billing (calls `POST /api/billing/portal`, Section 6c). Only org admins can perform billing actions.

```typescript
// client/src/pages/BillingPage.tsx
import { useState } from "react";
import { useAuth, useOrganization } from "@clerk/clerk-react";
import { useSearchParams } from "react-router-dom";
import { useOrgPlan } from "../hooks/useOrgPlan.ts";
import { api, ApiError } from "../lib/api.ts";

// ---------------------------------------------------------------
// Plan display configuration — adapt to your product's plan tiers.
// Price IDs must match the STRIPE_PRICE_* env vars on the server
// (Section 2). The server maps these to plan tier names.
// ---------------------------------------------------------------
const PLANS = [
  {
    name: "Free",
    tier: "free",
    price: "$0",
    features: ["Up to 3 projects", "Basic features"],
  },
  {
    name: "Pro",
    tier: "pro",
    price: "$29/mo",
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY,
    features: ["Unlimited projects", "Export", "Priority support"],
  },
  {
    name: "Enterprise",
    tier: "enterprise",
    price: "$99/mo",
    priceId: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_MONTHLY,
    features: ["Everything in Pro", "Audit log", "SSO", "Dedicated support"],
  },
] as const;

export function BillingPage() {
  const { has } = useAuth();
  const { organization } = useOrganization();
  const { plan, planStatus } = useOrgPlan();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = has?.({ role: "org:admin" }) ?? false;
  const showSuccess = searchParams.get("success") === "true";
  const showCanceled = searchParams.get("canceled") === "true";

  // Clear the query params after showing the message.
  // This prevents the banner from reappearing on page refresh.
  function dismissBanner() {
    setSearchParams({}, { replace: true });
  }

  async function handleUpgrade(priceId: string) {
    setError(null);
    setLoading(priceId);

    try {
      const { checkoutUrl } = await api<{ checkoutUrl: string }>("/api/checkout", {
        method: "POST",
        body: { priceId },
      });

      // Redirect to Stripe Checkout.
      // This navigates away from your app — Stripe handles the payment flow.
      // The user returns to /settings/billing?success=true or ?canceled=true.
      window.location.href = checkoutUrl;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setLoading(null);
    }
  }

  async function handleManageBilling() {
    setError(null);
    setLoading("portal");

    try {
      const { portalUrl } = await api<{ portalUrl: string }>("/api/billing/portal", {
        method: "POST",
      });

      // Redirect to Stripe Billing Portal.
      // Under Managed Payments, this is primarily for payment method updates.
      // Subscription changes (upgrade, downgrade, cancel) are handled by Link.
      window.location.href = portalUrl;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setLoading(null);
    }
  }

  return (
    <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
      <h1>Billing</h1>
      <p style={{ color: "#6b7280" }}>
        Manage the subscription for <strong>{organization?.name}</strong>.
      </p>

      {/* ---- Success / Cancel banners ---- */}
      {showSuccess && (
        <div
          role="status"
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1.5rem",
            background: "#ecfdf5",
            border: "1px solid #6ee7b7",
            borderRadius: "0.375rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Your plan is being activated. It may take a few moments to update.</span>
          <button onClick={dismissBanner} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer" }}>
            &times;
          </button>
        </div>
      )}

      {showCanceled && (
        <div
          role="status"
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1.5rem",
            background: "#fef3c7",
            border: "1px solid #fcd34d",
            borderRadius: "0.375rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Checkout was canceled. No changes were made to your plan.</span>
          <button onClick={dismissBanner} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer" }}>
            &times;
          </button>
        </div>
      )}

      {/* ---- Past-due warning ---- */}
      {planStatus === "past_due" && (
        <div
          role="alert"
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1.5rem",
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "0.375rem",
          }}
        >
          Your payment is past due. Please update your payment method to avoid service interruption.
          {isAdmin && (
            <button
              onClick={handleManageBilling}
              disabled={loading === "portal"}
              style={{ marginLeft: "0.75rem", textDecoration: "underline", cursor: "pointer", background: "none", border: "none" }}
            >
              {loading === "portal" ? "Opening..." : "Update payment method"}
            </button>
          )}
        </div>
      )}

      {/* ---- Error banner ---- */}
      {error && (
        <div
          role="alert"
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1.5rem",
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "0.375rem",
          }}
        >
          {error}
        </div>
      )}

      {/* ---- Plan cards ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))", gap: "1.5rem", marginTop: "1.5rem" }}>
        {PLANS.map((p) => {
          const isCurrent = p.tier === plan;

          return (
            <div
              key={p.tier}
              style={{
                border: isCurrent ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                borderRadius: "0.5rem",
                padding: "1.5rem",
              }}
            >
              <h3 style={{ margin: "0 0 0.25rem" }}>{p.name}</h3>
              <p style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 1rem" }}>{p.price}</p>

              <ul style={{ paddingLeft: "1.25rem", margin: "0 0 1.5rem", fontSize: "0.875rem", color: "#374151" }}>
                {p.features.map((f) => (
                  <li key={f} style={{ marginBottom: "0.25rem" }}>{f}</li>
                ))}
              </ul>

              {isCurrent ? (
                <span
                  style={{
                    display: "inline-block",
                    padding: "0.375rem 0.75rem",
                    background: "#eff6ff",
                    color: "#2563eb",
                    borderRadius: "0.25rem",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                  }}
                >
                  Current plan
                </span>
              ) : p.priceId && isAdmin ? (
                <button
                  onClick={() => handleUpgrade(p.priceId!)}
                  disabled={loading !== null}
                  style={{
                    padding: "0.5rem 1rem",
                    background: loading === p.priceId ? "#9ca3af" : "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: "0.375rem",
                    cursor: loading !== null ? "not-allowed" : "pointer",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                  }}
                >
                  {loading === p.priceId ? "Redirecting..." : "Upgrade"}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* ---- Manage billing link ---- */}
      {isAdmin && plan !== "free" && (
        <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid #e5e7eb" }}>
          <button
            onClick={handleManageBilling}
            disabled={loading === "portal"}
            style={{
              padding: "0.5rem 1rem",
              background: "#fff",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              cursor: loading === "portal" ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
            }}
          >
            {loading === "portal" ? "Opening..." : "Manage billing & payment method"}
          </button>
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.5rem" }}>
            Opens the Stripe billing portal. Under Managed Payments, subscription changes are handled by Link.
          </p>
        </div>
      )}

      {/* ---- Non-admin notice ---- */}
      {!isAdmin && (
        <p style={{ marginTop: "2rem", color: "#6b7280", fontSize: "0.875rem" }}>
          Only organization admins can manage billing. Contact your org admin to upgrade.
        </p>
      )}
    </div>
  );
}
```

**How the upgrade flow works:**
1. User clicks "Upgrade" on a plan card.
2. The button calls `POST /api/checkout` with the `priceId` (see Section 6b).
3. The server creates a Stripe Checkout Session and returns `{ checkoutUrl }`.
4. The frontend redirects the browser to `checkoutUrl` -- Stripe handles the payment.
5. After completing (or canceling) checkout, Stripe redirects back to `/settings/billing?success=true` or `/settings/billing?canceled=true`.
6. The Stripe `checkout.session.completed` webhook fires asynchronously, activating the plan in the DB and syncing to Clerk publicMetadata (see Section 6a).

### 10d. Handling the Post-Checkout Delay

After Stripe redirects back to your app with `?success=true`, the plan may not be updated yet. The webhook takes 1-10 seconds to process. The billing page above shows a static "being activated" banner. If you want the UI to reflect the updated plan automatically, poll the backend:

```typescript
// client/src/hooks/usePollPlan.ts
import { useEffect, useRef } from "react";
import { useOrganization } from "@clerk/clerk-react";

/**
 * usePollPlan — reloads the Clerk organization data on an interval
 * until the plan in publicMetadata changes from the expected value.
 *
 * Usage (on the billing page, after checkout redirect):
 *   usePollPlan({ enabled: showSuccess, expectedPlan: "free" });
 *
 * Stops polling when:
 *   - The plan changes from expectedPlan (webhook has processed)
 *   - 30 seconds elapse (safety timeout)
 *   - The component unmounts
 */
export function usePollPlan({
  enabled,
  expectedPlan,
  intervalMs = 2000,
  timeoutMs = 30000,
}: {
  enabled: boolean;
  expectedPlan: string;
  intervalMs?: number;
  timeoutMs?: number;
}) {
  const { organization } = useOrganization();
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!enabled || !organization) return;

    const start = Date.now();

    timerRef.current = setInterval(async () => {
      // Clerk's reload() re-fetches the org from the Clerk API,
      // which includes updated publicMetadata.
      await organization.reload();

      const currentPlan =
        (organization.publicMetadata as { plan?: string })?.plan ?? "free";

      if (currentPlan !== expectedPlan || Date.now() - start > timeoutMs) {
        clearInterval(timerRef.current);
      }
    }, intervalMs);

    return () => clearInterval(timerRef.current);
  }, [enabled, expectedPlan, intervalMs, timeoutMs, organization]);
}
```

**Usage in the BillingPage:**

```typescript
// Inside BillingPage component, after the existing hooks:
usePollPlan({ enabled: showSuccess, expectedPlan: "free" });
```

This polls every 2 seconds for up to 30 seconds. Once the webhook processes and `syncPlanToClerk` updates the metadata, `organization.reload()` picks up the new plan and all hooks re-render with the updated value.

### 10e. Protected Route with Plan Check

For pages that should only be accessible to users on a specific plan, combine the auth check (Section 9b) with a plan check. The server-side `requirePlan()` middleware (Section 7) is the real gate -- this client-side check provides a better user experience by redirecting before the API call fails.

```typescript
// client/src/components/PlanGate.tsx
import { useOrgPlan } from "../hooks/useOrgPlan.ts";

interface PlanGateProps {
  /** Plans that can access this content */
  allowed: string[];
  /** What to render if the plan is not allowed */
  fallback: React.ReactNode;
  children: React.ReactNode;
}

/**
 * PlanGate — renders children only if the current org's plan
 * is in the allowed list. Shows the fallback otherwise.
 *
 * Usage:
 *   <PlanGate allowed={["pro", "enterprise"]} fallback={<UpgradePrompt />}>
 *     <AdvancedFeaturePage />
 *   </PlanGate>
 */
export function PlanGate({ allowed, fallback, children }: PlanGateProps) {
  const { plan, planStatus, isLoaded } = useOrgPlan();

  // Don't render anything until Clerk has loaded the org data.
  // This prevents a flash of the fallback on initial page load.
  if (!isLoaded) {
    return null;
  }

  // Show fallback if plan doesn't match or subscription is inactive
  if (!allowed.includes(plan) || (planStatus !== "active" && planStatus !== "trialing")) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

**Usage in routes:**

```typescript
// client/src/pages/AdvancedFeaturePage.tsx
import { PlanGate } from "../components/PlanGate.tsx";
import { UpgradePrompt } from "../components/UpgradePrompt.tsx";

export function AdvancedFeaturePage() {
  return (
    <PlanGate
      allowed={["pro", "enterprise"]}
      fallback={
        <UpgradePrompt
          message="Export is a Pro feature."
          upgradePath="/settings/billing"
        />
      }
    >
      {/* The actual feature UI */}
      <ExportDashboard />
    </PlanGate>
  );
}
```

```typescript
// client/src/components/UpgradePrompt.tsx
import { Link } from "react-router-dom";

interface UpgradePromptProps {
  message: string;
  upgradePath: string;
}

export function UpgradePrompt({ message, upgradePath }: UpgradePromptProps) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "3rem 1.5rem",
        maxWidth: "28rem",
        margin: "0 auto",
      }}
    >
      <h2 style={{ marginBottom: "0.5rem" }}>Upgrade required</h2>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>{message}</p>
      <Link
        to={upgradePath}
        style={{
          display: "inline-block",
          padding: "0.5rem 1.5rem",
          background: "#3b82f6",
          color: "#fff",
          borderRadius: "0.375rem",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        View plans
      </Link>
    </div>
  );
}
```

**Remember:** Client-side plan checks are a UX convenience. The server-side `requirePlan()` middleware (Section 7) is the real authorization gate. If a user somehow bypasses the client-side check, the API will still reject the request with a 402 or 403.

---

## Troubleshooting

### Webhook signature verification fails (400 error)

**Symptom:** Clerk or Stripe webhooks return 400 "verification failed."

**Cause:** Almost always a body parsing issue. `express.json()` parsed the body before the webhook handler could read the raw bytes.

**Fix:** Ensure webhook routes are mounted BEFORE `express.json()` in your middleware stack. See Section 4a for the correct ordering. The webhook routes must use `express.raw({ type: "application/json" })` per-route.

**Verify:** Add `console.log(typeof req.body, req.body instanceof Buffer)` at the top of your webhook handler. It should log `object true`. If it logs `object false`, the body was already parsed as JSON.

### "Org created but no Stripe Customer"

**Symptom:** User creates an org, immediately clicks "Upgrade," and gets an error because there is no Stripe Customer.

**Cause:** The Clerk webhook for `organization.created` hasn't processed yet (webhook delivery is asynchronous).

**Fix:** The checkout endpoint (Section 6b) handles this with an on-demand fallback -- if no Stripe Customer exists when checkout is requested, it creates one on the spot. For belt-and-suspenders reliability, also create the Stripe Customer eagerly in your org creation API endpoint (synchronous, before the webhook fires).

### Clerk/Stripe race condition on subscription activation

**Symptom:** After checkout, the plan shows as "free" for a few seconds before updating.

**Cause:** The Stripe `checkout.session.completed` webhook hasn't arrived yet. Webhook delivery is async and can take 1-10 seconds.

**Fix:** This is expected behavior. On the success redirect page (`/settings/billing?success=true`), show a "Plan activating..." message and use the `usePollPlan` hook (Section 10d) to poll Clerk's org metadata until the plan updates. The BillingPage component in Section 10c already handles this with a success banner.

### orgRole format confusion

**Symptom:** Role checks fail -- `auth.orgRole === 'org:admin'` returns false even for admins.

**Cause:** Clerk session token v2 (current default) drops the `org:` prefix. `orgRole` returns `'admin'`, not `'org:admin'`.

**Fix:** Never compare `orgRole` strings directly. Use `auth.has({ role: 'org:admin' })`, which handles token version differences internally. See Section 4b.

### Managed Payments tax code errors

**Symptom:** Checkout Session creation fails with a tax code error.

**Cause:** Products in Stripe don't have tax codes assigned. Managed Payments requires tax codes for automatic tax calculation.

**Fix:** Stripe Dashboard > Product Catalog > edit each product > set Tax Code to `txcd_10000000` (Software as a Service) or the appropriate code for your product type.

### Missing environment variables in production

**Symptom:** Server crashes on startup with "Cannot read properties of undefined."

**Cause:** Environment variables not set in Railway.

**Fix:** Check Railway Dashboard > Service > Variables. Ensure every variable from Section 2 is set. Common misses: `CLERK_WEBHOOK_SIGNING_SECRET` (different from `CLERK_SECRET_KEY`), `STRIPE_WEBHOOK_SECRET` (different from `STRIPE_SECRET_KEY`), and `STRIPE_PRICE_*` IDs.

### Webhooks work in dev but not production

**Symptom:** Webhooks fire correctly via ngrok/CLI but fail in production.

**Cause:** Usually one of: (1) webhook endpoint URL still points to localhost, (2) production webhook signing secret differs from dev, (3) Clerk production instance uses different keys than dev.

**Fix:** Verify: (1) webhook URLs in Clerk/Stripe dashboards point to your Railway URL, (2) `CLERK_WEBHOOK_SIGNING_SECRET` and `STRIPE_WEBHOOK_SECRET` in Railway match the production webhook endpoint secrets, (3) you are using `sk_live_`/`pk_live_` keys in production (not `sk_test_`/`pk_test_`).

---

## Related Resources

- `skills/development/saas-stack.md` -- full SaaS stack reference (PostHog, Loops, R2, Railway)
- `skills/development/templates/clerk-stripe-schema.ts` -- the Drizzle schema template file
- [Clerk Express SDK docs](https://clerk.com/docs/references/express/overview)
- [Stripe Managed Payments docs](https://docs.stripe.com/payments/managed-payments)
- [Stripe Checkout subscriptions guide](https://docs.stripe.com/payments/checkout/build-subscriptions)
- [Drizzle ORM docs](https://orm.drizzle.team/docs/overview)
