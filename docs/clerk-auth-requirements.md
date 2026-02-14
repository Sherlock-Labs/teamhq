# Clerk + Stripe Managed Payments Integration Template — Requirements

**Project:** clerk-auth
**Status:** In Progress
**Author:** Thomas (PM)
**Date:** 2026-02-14

## Summary

A reusable integration template that gives every new product Clerk authentication (with organizations/multi-tenancy) and Stripe Managed Payments billing out of the box. The goal: a new product goes from `git clone` to "auth and billing working" in under an hour.

## Problem

Every new product we build needs the same auth + billing plumbing: Clerk for users and orgs, Stripe for subscriptions, webhooks to sync them, a DB schema to tie it together, and feature gating to enforce plan limits. Today this is undocumented tribal knowledge spread across research docs. Each new product means re-deriving the same integration from scratch.

## Decision: Skills Doc + Starter Template (Phased)

**v1 (this project):** A comprehensive skills reference doc at `skills/development/clerk-stripe-integration.md` with complete, copy-paste-ready code for every layer of the integration. This is the fastest path to "every new product has auth and billing working in under an hour." The doc becomes the authoritative source that all agents read when building a new product.

**v2 (deferred):** A standalone starter template repo (`sherlock-labs/saas-starter`) that you can clone and have a running app with auth + billing. This is a real codebase, not documentation -- it requires maintenance, testing, and updates when dependencies change. We'll build it when we've used the skills doc on 2-3 products and the patterns are proven.

**Rationale:** The skills doc compounds our toolkit immediately with zero maintenance burden. A template repo is valuable but is a product in itself -- it needs CI, tests, version management. Our product philosophy says: ship the simplest thing that solves the problem. The skills doc does that.

## Scope

### In Scope (v1)

1. **Skills reference document** (`skills/development/clerk-stripe-integration.md`)
   - Complete, copy-paste-ready code for Express backend + React frontend
   - Drizzle ORM schema for users, organizations, org_memberships tables
   - Clerk webhook handlers (user.created, organization.created, organizationMembership.*)
   - Stripe Customer creation on org creation (eager pattern)
   - Stripe Checkout Session creation endpoint (Managed Payments mode)
   - Stripe webhook handlers for subscription lifecycle (5 events)
   - Feature gating middleware (server-side DB check)
   - Client-side plan gating via Clerk org publicMetadata
   - React components: ClerkProvider, SignIn, SignUp, OrganizationSwitcher, UserButton
   - Environment variable reference (all services)
   - Railway deployment configuration
   - Clerk production instance setup checklist
   - Stripe Managed Payments setup checklist (products, prices, tax codes, webhook endpoints)

2. **Update to existing SaaS stack skill** (`skills/development/saas-stack.md`)
   - Cross-reference to the new integration doc
   - Any gaps identified during writing

3. **Drizzle schema file** (`skills/development/templates/clerk-stripe-schema.ts`)
   - Ready-to-copy Drizzle ORM schema
   - Users, organizations, org_memberships, processed_events tables
   - Proper indexes and constraints

4. **Pipeline log and work items** tracking

### Deferred (not v1)

- Standalone starter template repo (requires CI, tests, maintenance)
- Stripe Billing Portal integration (Managed Payments handles this via Link)
- Loops email integration (separate concern, covered in saas-stack.md)
- PostHog analytics integration (separate concern, covered in saas-stack.md)
- Cloudflare R2 file storage (separate concern, covered in saas-stack.md)
- Custom roles beyond admin/member (product-specific)
- Enterprise SSO/SAML setup (product-specific)
- Usage-based billing / metered pricing (product-specific)
- Multi-product Stripe setup (product-specific)
- Staging vs production environment guide (covered by Railway docs)
- Automated testing patterns for webhooks

### Explicitly Out of Scope

- Any product-specific business logic
- UI design for pricing pages (product-specific -- Robert handles per-product)
- Mobile auth flows (Zara/Leo handle per-product)
- Custom Stripe Elements checkout (Managed Payments requires Stripe Checkout)

## Deliverables

### D-1: Skills Reference Document

**File:** `skills/development/clerk-stripe-integration.md`

This is the primary deliverable. It must be structured so that a developer (Alice or Jonah) can follow it top-to-bottom to add auth and billing to a new product. It is NOT a tutorial -- it is a reference with copy-paste code blocks and decision rationale.

**Required sections:**

1. **Overview** -- what this integration does, when to use it, prerequisites
2. **Setup Checklist** -- step-by-step for Clerk + Stripe configuration (dashboards, env vars, webhooks)
3. **Database Schema** -- Drizzle ORM tables with full code
4. **Express Backend**
   - Clerk middleware setup (`@clerk/express`)
   - Clerk webhook handler (Svix verification + event handlers)
   - Stripe webhook handler (signature verification + event handlers)
   - Checkout Session creation endpoint
   - Feature gating middleware
   - Billing Portal session creation endpoint
   - Org creation endpoint (eager Stripe Customer creation)
5. **React Frontend**
   - ClerkProvider setup
   - Auth components (SignIn, SignUp, UserButton, OrganizationSwitcher)
   - Plan gating component (reads org publicMetadata)
   - Upgrade button / checkout redirect
   - Billing settings page skeleton
6. **Webhook Event Reference** -- table of all Clerk + Stripe events handled, with what each does
7. **Environment Variables** -- complete list with descriptions
8. **Railway Deployment** -- Procfile, env var configuration, webhook URL setup
9. **Troubleshooting** -- common issues (webhook signature failures, race conditions, missing env vars)

**Acceptance Criteria:**
- [ ] Document follows the skills/ format (Category, Used by, Last updated header)
- [ ] Every code block is syntactically valid TypeScript
- [ ] Every code block includes the target file path in a comment (e.g., `// server/webhooks/clerk.ts`)
- [ ] The Drizzle schema compiles against `drizzle-orm` and `drizzle-orm/pg-core` imports
- [ ] Webhook handlers are idempotent (ON CONFLICT / event dedup)
- [ ] Stripe Customer creation uses the eager pattern (synchronous on org creation, webhook as safety net)
- [ ] Feature gating middleware checks DB as source of truth, not Clerk metadata
- [ ] Client-side plan gating uses Clerk org publicMetadata for speed
- [ ] The hybrid plan storage approach is documented (DB = source of truth, Clerk metadata = convenience mirror)
- [ ] Setup checklists are ordered and numbered (not just bullet points)
- [ ] Environment variable reference includes every variable with description and example format
- [ ] Railway deployment section covers Procfile, env vars, and webhook URL configuration
- [ ] Document references `skills/development/saas-stack.md` for non-auth/billing services
- [ ] Troubleshooting section covers at least: webhook signature failures, Clerk/Stripe race conditions, missing env vars, and "org created but no Stripe Customer" scenario

### D-2: Drizzle Schema Template

**File:** `skills/development/templates/clerk-stripe-schema.ts`

A standalone, copy-paste-ready Drizzle schema file.

**Acceptance Criteria:**
- [ ] Defines `users` table (id, clerkUserId, email, name, timestamps)
- [ ] Defines `organizations` table (id, clerkOrgId, stripeCustomerId, name, plan, planStatus, stripeSubscriptionId, timestamps)
- [ ] Defines `orgMemberships` table (id, clerkOrgId, clerkUserId, role, timestamps)
- [ ] Defines `processedEvents` table (eventId, source, processedAt)
- [ ] All tables have appropriate indexes (clerkUserId unique, clerkOrgId unique, stripeCustomerId unique)
- [ ] Uses `pgTable` from `drizzle-orm/pg-core`
- [ ] Includes TypeScript infer types for insert/select
- [ ] File compiles standalone (all imports present)

### D-3: SaaS Stack Skill Update

**File:** `skills/development/saas-stack.md`

**Acceptance Criteria:**
- [ ] Contains a cross-reference to `skills/development/clerk-stripe-integration.md` in the Clerk and Stripe sections
- [ ] Any integration pattern details that are now covered in the new doc are replaced with a pointer (avoid duplication)

## Technical Constraints

- **Express backend** (not Next.js) -- our standard stack uses Vite + React frontend with Express backend
- **Drizzle ORM** -- our standard ORM, not Prisma
- **@clerk/express** middleware -- not @clerk/nextjs
- **Svix for Clerk webhook verification** -- Clerk uses Svix under the hood
- **Stripe Node.js SDK** (`stripe` package) -- use `constructEvent` for webhook verification
- **npm workspaces** -- our standard monorepo structure (see ost-tool for reference)
- **Railway deployment** -- not Vercel, not AWS
- **TypeScript** -- all code in strict TypeScript

## User Stories

### US-1: Set up Clerk + Stripe from scratch

**As** a developer starting a new product, **I want** a step-by-step setup checklist **so that** I can configure Clerk and Stripe correctly without guessing at dashboard settings.

**Acceptance Criteria:**
- [ ] Checklist covers: create Clerk application, enable Organizations, configure OAuth providers, set up webhook endpoint, copy env vars
- [ ] Checklist covers: create Stripe products/prices with tax codes, enable Managed Payments, set up webhook endpoint, copy env vars
- [ ] Each step has the exact Clerk/Stripe Dashboard path (e.g., "Clerk Dashboard > Webhooks > Add Endpoint")
- [ ] Webhook event subscriptions are listed explicitly (which Clerk events to subscribe to, which Stripe events)
- [ ] The checklist distinguishes between development and production setup where they differ

### US-2: Add the database schema to a new product

**As** a developer, **I want** a ready-to-copy Drizzle schema **so that** I can add the auth/billing tables to my product without designing them from scratch.

**Acceptance Criteria:**
- [ ] Schema file can be copied directly into a project's `server/db/schema/` directory
- [ ] Running `npx drizzle-kit generate` produces a valid migration
- [ ] The schema handles the full lifecycle: user creation, org creation, membership tracking, plan management, webhook dedup
- [ ] Column types are appropriate (TEXT for IDs, TIMESTAMPTZ for dates, etc.)

### US-3: Wire up Clerk auth in Express

**As** a backend developer, **I want** copy-paste middleware setup **so that** I can protect API routes with Clerk auth in under 5 minutes.

**Acceptance Criteria:**
- [ ] Shows `clerkMiddleware()` setup on the Express app
- [ ] Shows `requireAuth()` middleware for protected routes
- [ ] Shows how to access `req.auth.userId`, `req.auth.orgId`, `req.auth.orgRole`
- [ ] Includes a public routes example (health check, webhooks)

### US-4: Handle Clerk webhooks

**As** a backend developer, **I want** webhook handler code for user and org lifecycle events **so that** my local DB stays in sync with Clerk.

**Acceptance Criteria:**
- [ ] Svix signature verification is shown with proper error handling
- [ ] `user.created` handler creates a local user record
- [ ] `organization.created` handler creates a local org record AND a Stripe Customer (eager pattern)
- [ ] `organizationMembership.created` and `organizationMembership.deleted` handlers sync memberships
- [ ] All handlers are idempotent (ON CONFLICT)
- [ ] Raw body parsing is configured correctly (webhooks need raw body, not JSON-parsed)

### US-5: Handle Stripe webhooks and subscription lifecycle

**As** a backend developer, **I want** webhook handler code for Stripe subscription events **so that** plan changes are reflected in my DB automatically.

**Acceptance Criteria:**
- [ ] Stripe signature verification is shown with proper error handling
- [ ] `checkout.session.completed` activates the plan
- [ ] `invoice.paid` confirms active status
- [ ] `invoice.payment_failed` sets past_due status
- [ ] `customer.subscription.updated` handles upgrades/downgrades
- [ ] `customer.subscription.deleted` reverts to free plan
- [ ] Plan-to-price mapping is configurable (env vars or config object)
- [ ] After DB update, plan is mirrored to Clerk org publicMetadata
- [ ] Raw body parsing is configured correctly for Stripe webhooks

### US-6: Create a Stripe Checkout Session

**As** a backend developer, **I want** an endpoint that creates a Checkout Session **so that** org admins can upgrade their plan.

**Acceptance Criteria:**
- [ ] Endpoint requires Clerk auth and org:admin role
- [ ] Looks up Stripe Customer by Clerk orgId
- [ ] Creates Checkout Session in subscription mode with Managed Payments
- [ ] Passes clerkOrgId in subscription metadata (belt-and-suspenders cross-reference)
- [ ] Returns the checkout URL for client-side redirect
- [ ] Handles missing Stripe Customer gracefully (creates on-demand as fallback)

### US-7: Gate features by plan

**As** a backend developer, **I want** middleware that checks the org's plan **so that** I can restrict API endpoints to paid plans.

**Acceptance Criteria:**
- [ ] `requirePlan('pro', 'enterprise')` middleware checks DB, not Clerk metadata
- [ ] Returns 402 if subscription is inactive (past_due, canceled)
- [ ] Returns 403 if plan doesn't match required tier, with current plan and required plans in response
- [ ] Returns 404 if org not found in DB
- [ ] Works as standard Express middleware (composable with other middleware)

### US-8: Set up Clerk auth in React

**As** a frontend developer, **I want** copy-paste React setup **so that** I can add auth UI to a new product in under 10 minutes.

**Acceptance Criteria:**
- [ ] ClerkProvider setup with publishableKey
- [ ] Protected route wrapper using Clerk's `useAuth` or `<SignedIn>` / `<SignedOut>`
- [ ] SignIn and SignUp pages with routing config
- [ ] OrganizationSwitcher in app header/sidebar
- [ ] UserButton for account menu
- [ ] Shows how to read org plan from publicMetadata for UI gating

### US-9: Upgrade flow from React

**As** a frontend developer, **I want** an upgrade button component pattern **so that** I can let org admins start the checkout flow.

**Acceptance Criteria:**
- [ ] Shows a React component that calls the checkout endpoint and redirects to Stripe
- [ ] Button is only shown to org admins
- [ ] Button is disabled while the checkout request is in flight
- [ ] Handles checkout creation errors with user-visible feedback
- [ ] Success redirect page handles the `?success=true` query param

N/A -- Interaction States Checklist is not appended. This is a documentation/template project, not an interactive UI. The code examples describe patterns; the actual implementation will get its own AC when used in a specific product.

## Pipeline

This project is **documentation-only** -- no product code is being built. The deliverables are skills docs and a Drizzle schema template. This significantly simplifies the pipeline.

### Recommended pipeline:

1. **Thomas (PM)** -- requirements (this doc) -- DONE
2. **Andrei (Arch)** -- review the integration patterns for correctness, fill in any gaps the research missed (e.g., raw body parsing, middleware ordering, Railway-specific config). Produce `docs/clerk-auth-tech-approach.md` if he has meaningful additions; otherwise, a short review note is fine. The research doc is already quite technical.
3. **Jonah (BE)** -- write the skills doc (`skills/development/clerk-stripe-integration.md`) and schema template. Jonah knows our Express patterns best. He should follow the research doc but adapt code to our conventions (Drizzle, npm workspaces, strict TS).
4. **Alice (FE)** -- write the React frontend sections of the skills doc. She should add the ClerkProvider setup, auth components, plan gating component, and checkout redirect pattern.
5. **Nadia (Writer)** -- review the skills doc for clarity, consistency, and completeness. Fix any ambiguous language, ensure the setup checklists are followable, and verify cross-references.
6. **Enzo (QA)** -- validate the integration patterns. Verify: webhook handlers are idempotent, race conditions are addressed, error handling is complete, the schema is correct, env var references are complete. This is a documentation review, not functional testing.

### Agents NOT needed:

- **Suki / Marco** -- research is already done
- **Robert** -- no UI design needed (this is a code template, not a product)
- **Nina / Soren / Amara** -- no interactive UI
- **Sam** -- one BE developer is sufficient for documentation
- **Zara / Leo** -- no mobile
- **Howard** -- the billing patterns are straightforward; Jonah can handle them from the research doc
- **Priya** -- no marketing
- **Derek** -- no third-party wiring (we're documenting the wiring patterns, not executing them)
- **Milo** -- Railway config is a small section, not a deployment task
- **Yuki** -- no retrospective needed for a docs project
- **Ravi** -- no strategic input needed
- **Kai** -- no AI integration

### Pipeline notes:

- Andrei and Jonah can potentially run **in parallel** since Andrei is reviewing patterns while Jonah is writing the doc. However, if Andrei finds gaps, Jonah should incorporate them. Recommend: Andrei first (fast review), then Jonah.
- Alice depends on Jonah finishing the backend sections (she needs to reference the API endpoints in her frontend examples).
- Nadia and Enzo can run **in parallel** at the end.
- No Restructure-classified files -- this is all new content. No early QA notification needed.

## Risks

1. **The research doc may have gaps** -- Marco's research is thorough but theoretical. Andrei should validate against actual `@clerk/express` SDK behavior and Stripe Managed Payments docs. Specific risk: Managed Payments may have changed behavior since the research was conducted.

2. **Drizzle schema conventions** -- we need to match whatever Drizzle conventions we've established in existing products (e.g., ost-tool). Jonah should check.

3. **Raw body parsing** -- Clerk and Stripe webhooks both need raw request bodies for signature verification. Express typically parses JSON bodies automatically. The doc must clearly show how to handle this (express.raw() for webhook routes, express.json() for everything else). This is a common gotcha.

4. **Clerk + Express middleware ordering** -- `clerkMiddleware()` must come before auth-dependent routes but after webhook routes (which are unauthenticated). The doc must show the correct middleware ordering.

## Success Criteria

This project is successful when:
- A developer can follow the skills doc to add Clerk auth + Stripe billing to a new Express/React product in under 1 hour
- The Drizzle schema can be copied and migrated without modification
- The webhook handlers are production-ready (idempotent, verified, error-handled)
- The feature gating middleware works out of the box
- The next product that needs auth + billing references this doc instead of doing fresh research
