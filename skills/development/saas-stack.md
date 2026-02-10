# SaaS Stack Reference

**Category:** Development
**Used by:** Andrei, Jonah, Alice, Howard, Marco, all
**Last updated:** 2026-02-09

## Stack Overview

| Layer | Tool | Free tier |
|-------|------|-----------|
| Hosting + DB | Railway (Postgres) | usage-based |
| Auth | Clerk | < 10K MAU |
| Payments | Stripe | % per txn |
| Product analytics | PostHog | < 1M events/mo |
| Revenue metrics | Stripe dashboard | included |
| Email (txn + marketing) | Loops | < 1K subs, 4K sends/mo |

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

### Key Concepts
- Drop-in `<SignIn />`, `<SignUp />`, `<UserProfile />` React components
- `<OrganizationSwitcher />` for multi-tenant org management
- Middleware-based auth for Next.js (`clerkMiddleware()`)
- `auth()` and `currentUser()` server-side helpers
- Webhook events for syncing user data to your DB

### Integration Pattern
```
User signs up via Clerk → Clerk webhook → your API creates local user record → link Clerk userId to your DB
```

### Environment Variables
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — client-side
- `CLERK_SECRET_KEY` — server-side only
- `CLERK_WEBHOOK_SECRET` — for webhook signature verification

### MCP Usage
- Use the `clerk` MCP for SDK snippets and implementation patterns
- Authenticates via browser login on first use

## Stripe (Payments)

**Docs:** https://docs.stripe.com

### Key Concepts
- Use **Payment Intents API** for one-time payments (not legacy Charges)
- Use **Stripe Checkout** or **Elements** for PCI-compliant card collection
- Use **Customer** objects to associate payments with users
- Use **Subscriptions** with **Prices** and **Products** for recurring billing
- Pin your API version — don't auto-upgrade

### Integration Pattern
```
Clerk user created → create Stripe Customer (store stripeCustomerId in your DB)
→ Checkout Session for subscription → webhook confirms payment → activate plan
```

### Webhook Events to Handle
- `checkout.session.completed` — initial purchase
- `invoice.payment_succeeded` — recurring payment
- `invoice.payment_failed` — dunning / failed payment
- `customer.subscription.updated` — plan changes
- `customer.subscription.deleted` — cancellation

### Environment Variables
- `STRIPE_SECRET_KEY` — server-side only
- `STRIPE_PUBLISHABLE_KEY` — client-side
- `STRIPE_WEBHOOK_SECRET` — for webhook signature verification

### MCP Usage
- Use the `stripe` MCP to manage customers, products, prices, subscriptions, invoices
- Requires `STRIPE_SECRET_KEY` env var

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

## Service Integration Map

```
                    ┌─────────┐
                    │  Clerk  │ ← Auth (signup, login, orgs)
                    └────┬────┘
                         │ webhook: user.created
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
```

## Environment Variables Summary

All secrets go in Railway env vars (never in source):

```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_API_KEY=phx_...

# Loops
LOOPS_API_KEY=...

# Database (auto-injected by Railway)
DATABASE_URL=postgresql://...
```
