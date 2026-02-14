# SaaS Stack Reference

**Category:** Development
**Used by:** Andrei, Jonah, Alice, Howard, Marco, all
**Last updated:** 2026-02-14

## Stack Overview

| Layer | Tool | Free tier |
|-------|------|-----------|
| Hosting + DB | Railway (Postgres) | usage-based |
| Auth | Clerk | < 10K MAU |
| Payments | Stripe Managed Payments | % per txn (Stripe is merchant of record) |
| Product analytics | PostHog | < 1M events/mo |
| Revenue metrics | Stripe dashboard | included |
| Email (txn + marketing) | Loops | < 1K subs, 4K sends/mo |
| File storage | Cloudflare R2 | 10 GB + 10M reads/mo |

## MCP Servers Available

All services have MCP servers configured in `.mcp.json`:

| MCP | Package | What it does |
|-----|---------|--------------|
| `stripe` | `@stripe/mcp` | Manage customers, products, subscriptions, invoices |
| `railway` | `@railway/mcp-server` | Deploy, manage services, pull env vars, view logs |
| `posthog` | Remote SSE server | Query analytics, manage feature flags, run SQL insights |
| `clerk` | Remote MCP server | Manage users, orgs, SDK snippets |

## Railway (Hosting + Postgres)

**Docs:** https://docs.railway.com

### Key Concepts
- **Projects** contain services (app, database, redis, etc.)
- **Environments** for staging/production
- **Railway Postgres** runs alongside your app on the internal network
- Use `DATABASE_URL` env var — Railway auto-injects it for linked services
- Deploy via GitHub repo connection or `railway up` CLI

### Database Access
- Internal networking: services connect via private URLs (no egress cost)
- Use connection pooling for serverless/edge workloads
- Backups: Railway handles automated backups for Postgres

### MCP Usage
- Use the `railway` MCP to create projects, manage services, pull env vars
- The MCP is read-safe — it deliberately omits destructive operations

## Clerk (Auth)

**Docs:** https://clerk.com/docs

> **For full integration code** (Express middleware, webhook handlers, Drizzle schema, React components), see **`skills/development/clerk-stripe-integration.md`**. This section covers concepts and quick reference only.

### Key Concepts
- Drop-in `<SignIn />`, `<SignUp />`, `<UserProfile />` React components
- `clerkMiddleware()` for Express (`@clerk/express >= 1.7.4`) — use `authorizedParties` in production
- `getAuth(req)` and `requireAuth()` server-side helpers
- `verifyWebhook` from `@clerk/express/webhooks` for webhook signature verification (not raw Svix)
- Webhook events for syncing user/org data to your DB

### Organizations (Multi-Tenancy)
- `<OrganizationSwitcher />` — lets users switch between teams
- `<OrganizationProfile />` — team settings, member management, invites
- `<CreateOrganization />` — team creation flow
- **Roles**: default `admin` + `member`, custom roles available (up to 10)
- **Role checks**: use `auth.has({ role: 'org:admin' })` — not string comparison on `orgRole`
- **Permissions**: fine-grained access control via `has({ permission: 'org:posts:edit' })`
- Enterprise SSO (SAML/OIDC) supported per-org for enterprise customers

### Data Model
```
Clerk User (1) ──→ (many) Org Memberships ──→ (many) Clerk Organizations
                                                        │
                                                        ├── maps to Stripe Customer (1:1)
                                                        └── maps to your DB organizations record (1:1)
```
- Every org gets a Stripe Customer — billing is per-org, not per-user
- Your DB `organizations` table stores `clerkOrgId` + `stripeCustomerId`
- Data isolation: always scope DB queries by `clerkOrgId`

### Environment Variables
- `VITE_CLERK_PUBLISHABLE_KEY` — client-side (use `VITE_` prefix, not `NEXT_PUBLIC_`)
- `CLERK_SECRET_KEY` — server-side only
- `CLERK_WEBHOOK_SIGNING_SECRET` — for webhook signature verification

### MCP Usage
- Use the `clerk` MCP for SDK snippets and implementation patterns
- Authenticates via browser login on first use

## Stripe Managed Payments (Payments — Default)

**Docs:** https://docs.stripe.com/payments/managed-payments/how-it-works

> **For full integration code** (Checkout Sessions, webhook handlers, feature gating, Drizzle schema), see **`skills/development/clerk-stripe-integration.md`**. This section covers concepts and quick reference only.

**Stripe Managed Payments is our default for all new products.** Stripe becomes the merchant of record, which means they handle tax compliance, fraud prevention, disputes, refunds, and customer transaction support.

### Why Managed Payments
- **Global tax compliance handled** — no need to register for tax in every jurisdiction
- **Fraud prevention built-in** — AI monitoring, blocklists, no configuration needed
- **Disputes auto-responded** — Smart Disputes submits evidence automatically
- **Customer support delegated** — Stripe handles transaction-level support via Link
- **Adaptive Pricing** — auto-converts to customer's local currency
- **15+ payment methods** — cards, Apple Pay, Google Pay, Klarna, UPI, etc.

### Key Constraints
- **Digital products only** — SaaS, software, online courses, digital media. No physical goods.
- **Stripe Checkout required** — must use hosted or embedded Checkout (no custom Elements)
- **Checkout says "Sold through Link"** — customers manage subscriptions via Link app
- **Seller location** — must be in US, CA, EU, or HK
- **Tax codes required** — assign correct tax codes to every product (SaaS: `txcd_10000000`)
- **Do NOT pass `customer_update`** options in Checkout Sessions — Managed Payments auto-collects billing address

### Webhook Events to Handle
- `checkout.session.completed` — initial purchase
- `invoice.paid` — recurring payment succeeded
- `invoice.payment_failed` — dunning / failed payment
- `customer.subscription.updated` — plan changes
- `customer.subscription.deleted` — cancellation

### Environment Variables
- `STRIPE_SECRET_KEY` — server-side only
- `STRIPE_WEBHOOK_SECRET` — for webhook signature verification
- `STRIPE_PRICE_*` — Price IDs for each plan/interval combo

### MCP Usage
- Use the `stripe` MCP to manage customers, products, prices, subscriptions, invoices
- Requires `STRIPE_SECRET_KEY` env var

### When NOT to Use Managed Payments
If a product sells physical goods, services, or is a marketplace — fall back to standard Stripe integration (Payment Intents + Elements). Check with Howard.

## PostHog (Product Analytics)

**Docs:** https://posthog.com/docs

### Key Concepts
- Client-side JS snippet auto-captures pageviews, clicks, and sessions
- Custom events via `posthog.capture('event_name', { properties })`
- **Feature flags** for gradual rollouts and A/B testing
- **Session replay** for debugging user issues
- Free tier: 1M events/mo, 5K session recordings/mo

### Key Events to Track
- `user_signed_up` — with plan, source
- `subscription_started` — with plan, price
- `subscription_cancelled` — with reason, plan
- `feature_used` — with feature name, context
- `onboarding_completed` — with steps completed

### Integration Pattern
```
Identify users after Clerk auth: posthog.identify(clerkUserId, { email, name, plan })
Track events from both client and server side
```

### Environment Variables
- `NEXT_PUBLIC_POSTHOG_KEY` — client-side
- `NEXT_PUBLIC_POSTHOG_HOST` — usually `https://us.i.posthog.com`
- `POSTHOG_API_KEY` — server-side (for server events)

### MCP Usage
- Use the `posthog` MCP to query analytics, create annotations, manage feature flags
- Authenticates via browser login on first use

## Loops (Email)

**Docs:** https://loops.so/docs

### Key Concepts
- Single platform for transactional, product, and marketing email
- **Transactional**: triggered by API (welcome, password reset, receipts)
- **Product**: event-triggered sequences (onboarding, re-engagement)
- **Marketing**: newsletters and announcements
- Notion-style email editor
- Free tier: 1K contacts, 4K sends/mo

### Integration Pattern
```
Clerk webhook (user.created) → your API → Loops API (create contact + trigger welcome email)
Stripe webhook (subscription started) → your API → Loops API (trigger onboarding sequence)
```

### API Usage
- `POST /v1/contacts/create` — add a contact
- `POST /v1/contacts/update` — update contact properties
- `POST /v1/transactional` — send a transactional email
- `POST /v1/events/send` — trigger an event-based email

### Environment Variables
- `LOOPS_API_KEY` — server-side only

### No MCP
- Loops does not have an MCP server yet. Use the REST API directly.

## Cloudflare R2 (File Storage)

**Docs:** https://developers.cloudflare.com/r2/

### Key Concepts
- S3-compatible object storage — use `@aws-sdk/client-s3` to interact with it
- **Zero egress fees** — reads are free, you only pay for storage + writes
- No region configuration — stored on Cloudflare's global edge automatically
- Free tier: 10 GB storage, 10M reads/mo, 1M writes/mo
- $0.015/GB/mo after free tier

### Usage Patterns
- **User uploads** (avatars, team logos, attachments): generate presigned upload URLs server-side, upload directly from client to R2
- **Private files**: use presigned download URLs with expiry for access control
- **Public assets**: enable public access on a bucket for static assets (images, docs)
- Scope uploads by org: use key prefixes like `{clerkOrgId}/{fileType}/{fileId}`

### Integration Pattern
```
Client requests upload URL → your API generates presigned PUT URL (scoped to org)
→ client uploads directly to R2 → store file metadata (key, size, type) in Postgres
→ serve via presigned GET URL or Cloudflare CDN
```

### Environment Variables
- `R2_ENDPOINT` — `https://<account-id>.r2.cloudflarestorage.com`
- `R2_ACCESS_KEY_ID` — R2 API token access key
- `R2_SECRET_ACCESS_KEY` — R2 API token secret
- `R2_BUCKET_NAME` — your bucket name

### S3 Client Setup
```typescript
import { S3Client } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
```

### No MCP
- Cloudflare R2 does not have an MCP server. Use the S3-compatible SDK directly.

## Service Integration Map

```
                    ┌─────────┐
                    │  Clerk  │ ← Auth (signup, login, orgs, teams)
                    └────┬────┘
                         │ webhooks: user.created, organization.created,
                         │          organizationMembership.created
                         ▼
┌──────────┐      ┌─────────────┐      ┌─────────┐
│ PostHog  │ ←──  │  Your App   │ ──→  │ Stripe  │
│(analytics)│     │  (Railway)  │      │(payments)│
└──────────┘      └──────┬──────┘      └────┬────┘
                         │                   │ webhook: invoice.paid
                    ┌────┴────┐              ▼
                    │ Railway │        ┌─────────┐
                    │Postgres │        │  Loops  │
                    └─────────┘        │ (email) │
                                       └─────────┘
                    ┌─────────────┐
                    │Cloudflare R2│ ← File storage (avatars, uploads, attachments)
                    └─────────────┘

Data isolation: Clerk orgId → DB team record → scope all queries by team
Billing: Clerk orgId → Stripe Customer → subscription is per-team
File storage: scope R2 keys by orgId → {clerkOrgId}/{fileType}/{fileId}
```

## Environment Variables Summary

All secrets go in Railway env vars (never in source):

```
# Clerk (use VITE_ prefix, not NEXT_PUBLIC_ — we use Vite, not Next.js)
VITE_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_API_KEY=phx_...

# Loops
LOOPS_API_KEY=...

# Cloudflare R2
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...

# Database (auto-injected by Railway)
DATABASE_URL=postgresql://...
```
