# ADR-008: Unified SaaS Stack for Sherlock Labs Products

**Status:** Proposed
**Date:** 2026-02-08
**Decision maker:** Andrei (Technical Architect)

## Context

SherlockPDF is our first monetized product, built with a deliberately minimal stack (no auth, no database, localStorage + Stripe email lookup). This won't scale to multiple products. The CEO wants a recommendation for the platform every future Sherlock Labs product builds on --- so we stop rebuilding auth, databases, and storage from scratch each time.

Requirements:
- **Auth reuse across products.** A user who signs up for SherlockPDF should be recognized when we launch the OST tool, the Agent Workspace, or any future product. One account, multiple products.
- **Database for SaaS.** Usage tracking, user preferences, team management, audit logs. Needs to be relational (or at minimum, queryable).
- **File storage.** PDF uploads (for future server-side processing), user-generated content, exports.
- **Stripe integration.** Every product uses Stripe. The stack should make subscription management, webhook handling, and entitlement checking easy.
- **Developer experience.** TypeScript-first. Our team writes TypeScript. The stack should feel native, not require learning a new paradigm.
- **Cost at low scale.** We're pre-revenue. The stack needs a generous free tier or very low starting cost. We can't commit $500/month before we have paying customers.
- **Deployment simplicity.** Fewer moving parts. We don't have a dedicated DevOps person.

## Platforms Evaluated

### 1. Supabase (Auth + Postgres + Storage + Edge Functions)

**What it is:** Open-source Firebase alternative built on Postgres. Provides auth, database, file storage, edge functions, and real-time subscriptions in one platform.

**Strengths:**
- Most complete single-platform offering. Auth, Postgres, S3-compatible storage, edge functions, real-time --- all integrated and managed.
- Postgres is the database. Full SQL, ACID transactions, joins, indexes. No NoSQL compromises.
- Free tier is generous: 500MB database, 1GB storage, 50K MAUs, 500K edge function invocations.
- Pro plan at $25/month is affordable and includes 8GB database, 100GB storage, 100K MAUs.
- Official Stripe sync engine: one-click integration that syncs Stripe data into your Postgres tables.
- Stripe webhook handling via edge functions is documented and well-supported.
- Open source. Can self-host if needed (unlikely, but reduces vendor lock-in fear).
- Row-Level Security (RLS) in Postgres means auth and data access are unified at the database level.
- TypeScript client library (`@supabase/supabase-js`) is well-maintained.

**Weaknesses:**
- Multi-product auth is not a built-in feature. Each Supabase "project" has its own auth database. Sharing users across multiple products requires either: (a) one Supabase project for all products with schema separation, or (b) a custom auth-sharing layer. Option (a) is the pragmatic choice for our scale.
- Edge functions are Deno-based, not Node.js. Minor friction for a Node.js team, but Deno is close enough to TypeScript that it's not a real blocker.
- Real production costs are typically $125+/month once you factor in compute add-ons. Still reasonable, but the $25/month headline is optimistic.
- No built-in billing/subscription UI components. You wire up Stripe yourself (but the sync engine helps).

**Stripe pairing:** Strong. Official Stripe sync engine pulls subscription data into Postgres tables. Webhook handling via edge functions. You can query `select * from stripe.subscriptions where customer_id = ?` directly in SQL. This is elegant.

**Multi-product auth approach:** Run one Supabase project as the "Sherlock Labs Platform." All products share this project's auth. Each product can have its own schema or separate tables. Users sign in once, and their session works across pdf.sherlocklabs.ai, ost.sherlocklabs.ai, etc. (requires shared cookie domain on *.sherlocklabs.ai).

---

### 2. Clerk + Neon + Vercel (Composable Best-of-Breed)

**What it is:** Three specialized services: Clerk for auth, Neon for serverless Postgres, Vercel for hosting/edge functions. Pick the best tool for each job.

**Strengths:**
- Clerk is the best auth product on the market for DX. Pre-built UI components (`<SignIn>`, `<UserButton>`, `<PricingTable>`), organizations/multi-tenancy built in, 50K MAUs free (as of Feb 2026 pricing update).
- Clerk Billing is a game-changer: built-in Stripe integration with zero webhook code. `<PricingTable>` component renders your Stripe plans and handles checkout inline. Subscription status is automatically synced to user metadata. No webhook handlers, no status endpoints, no sync logic.
- Neon serverless Postgres: scales to zero, wakes up in milliseconds, branching for dev/staging, $19/month Scale plan. Storage is now $0.35/GB (dramatically cheaper after Databricks acquisition).
- Vercel: best-in-class deployment for Next.js/React, edge functions, preview deployments, global CDN.
- Multi-product auth is Clerk's strength. One Clerk application, multiple frontends. Users log in once and are recognized across all products. This is what Clerk was designed for.

**Weaknesses:**
- Three services = three bills, three dashboards, three sets of docs, three potential points of failure.
- Clerk Billing is new (launched 2025). Metered usage billing is still in beta. For simple subscriptions it works; for complex billing it may not be ready.
- Vercel pricing can spike unexpectedly. Edge function invocations, bandwidth overages, and build minutes add up.
- Neon is serverless Postgres, which means cold starts (though fast --- sub-second). Not an issue for our use case, but worth noting.
- This stack assumes React/Next.js. Clerk's components are React-first. If we ever build a non-React frontend, Clerk's DX advantage diminishes (though they have vanilla JS SDK).
- Total cost: Clerk Pro ($20/month) + Neon Scale ($19/month) + Vercel Pro ($20/month) = $59/month baseline before usage. Higher starting cost than Supabase's $25/month all-in.

**Stripe pairing:** The best of any option. Clerk Billing eliminates the entire webhook/sync/status-check layer. Connect your Stripe account, define products in Clerk, drop `<PricingTable>` in your app. Subscription status is available on the user object: `user.publicMetadata.plan`. No server code needed for basic subscription gating.

**Multi-product auth approach:** One Clerk application serves all Sherlock Labs products. Each product is a separate frontend that authenticates against the same Clerk instance. Users have one account. Organizations let us add team features. This is Clerk's core use case and it works out of the box.

---

### 3. Convex (Real-Time TypeScript Backend)

**What it is:** A reactive backend-as-a-service. You write queries and mutations in TypeScript, and Convex handles the database, real-time sync, caching, and serverless execution.

**Strengths:**
- Pure TypeScript everywhere. Schema, queries, mutations, actions --- all TypeScript. No SQL, no ORM, no REST API boilerplate. Very tight DX.
- Real-time by default. Every query auto-updates when underlying data changes. No websocket management.
- Built-in auth, file storage, cron jobs, and scheduled functions.
- Open source (FSL license, converts to Apache 2.0 after 2 years). Self-hostable with Docker.
- Sub-50ms read/write latency at scale. Optimistic updates built in.
- Built-in RAG components for AI features. Relevant if we add AI to future products.
- Startup program: up to 1 year free of Professional plan.

**Weaknesses:**
- Not Postgres. Convex has its own document-oriented database. You can't use SQL. You can't use any Postgres tooling, extensions, or ecosystem. This is a significant lock-in.
- Paradigm shift. The reactive model is powerful but unfamiliar. Every team member needs to learn "the Convex way" of doing things. Queries are functions, not SQL. Mutations are transactions. It's elegant but different.
- No built-in Stripe integration or billing primitives. You wire up Stripe manually via actions (serverless functions).
- Smaller ecosystem and community than Supabase or Firebase. Fewer tutorials, fewer Stack Overflow answers, fewer battle-tested patterns.
- Professional plan is $25/month + per-seat fees. Enterprise features (SSO, compliance, SLAs) are still in development.
- Multi-product auth is not a documented pattern. Each Convex project has its own auth. Sharing users across products would require custom work.

**Stripe pairing:** Manual. You write Convex actions (serverless functions) to create Checkout sessions, handle webhooks, and check subscription status. Comparable to doing it with any generic backend, but without the Supabase sync engine or Clerk Billing shortcuts.

**Multi-product auth approach:** Not a strength. You'd need to run one Convex project per product or build a custom auth-sharing layer. Convex is designed for single-product backends, not multi-product platforms.

---

### 4. PocketBase (Self-Hosted, SQLite)

**What it is:** A single Go binary that provides auth, a database (SQLite), file storage, and real-time subscriptions. Self-hosted only.

**Strengths:**
- Absurdly simple. One binary, one file. `./pocketbase serve` and you have a full backend with admin UI.
- Free forever. No SaaS bill. Just hosting costs for a small VPS ($5-10/month).
- Built-in auth (email/password, OAuth2), file storage (local or S3), real-time subscriptions.
- SQLite performance is excellent for read-heavy workloads (which PDF tool usage tracking is).
- Admin UI for managing collections, users, and data without writing code.
- JavaScript SDK works with any frontend framework.

**Weaknesses:**
- Self-hosted only. We own the infrastructure, the backups, the updates, the uptime. No managed option.
- SQLite means single-server. No horizontal scaling, no read replicas, no multi-region. Fine for early stage, but a hard ceiling.
- No edge functions or serverless compute. You deploy PocketBase on a VPS and that's your backend.
- No built-in Stripe integration. Manual implementation like any custom backend.
- The project is maintained primarily by one developer (Gani Georgiev). Bus factor of 1. Active community, but the core is one person.
- Multi-product auth would require all products to share the same PocketBase instance. Doable but not designed for it.
- No TypeScript on the backend. Server-side hooks are written in Go (or JavaScript via embedded runtime, but it's limited).

**Stripe pairing:** Manual. PocketBase hooks (Go or JS) handle webhook endpoints. No special integration.

**Multi-product auth approach:** All products hit the same PocketBase instance. Simple at small scale, but PocketBase on a single server becomes the SPOF for every product.

---

### 5. Firebase (The OG BaaS)

**What it is:** Google's Backend-as-a-Service. Firestore (NoSQL document database), Firebase Auth, Cloud Storage, Cloud Functions, Hosting.

**Strengths:**
- The most mature BaaS. Battle-tested at massive scale. Well-documented. Huge community.
- Firebase Auth is solid and free for most use cases (email/password, social login, phone auth).
- Firestore has real-time listeners, offline sync, and automatic scaling.
- Cloud Functions integrate with Google Cloud's full ecosystem.
- Free Spark plan is generous: 50K reads/day, 20K writes/day, 1GB storage.
- Multi-product auth is straightforward: one Firebase project, multiple web apps, shared auth.

**Weaknesses:**
- Firestore is NoSQL (document-oriented). No joins. No SQL. Complex queries require denormalized data and composite indexes. This is a fundamental architectural constraint that gets worse as your data model grows.
- Pricing is unpredictable. Read/write operations are billed per operation, and a chatty frontend can run up costs fast. Horror stories of unexpected $1,000+ bills are common.
- Vendor lock-in to Google Cloud. Firestore's data model and query language are proprietary. Migration is painful.
- Cloud Functions are slow to cold-start (1-3 seconds). Not ideal for API endpoints that need to be fast.
- TypeScript support exists but it's not TypeScript-native. The Firebase SDK is JavaScript-first with TypeScript definitions layered on.
- No built-in Stripe integration. Firebase Extensions marketplace has community Stripe extensions, but they're not first-party and can be unreliable.
- Data Connect (Postgres option) is new and not yet mature enough to recommend for production.
- Google has a history of killing products. Firebase itself seems safe, but the anxiety is real.

**Stripe pairing:** Manual. Cloud Functions handle webhook endpoints. No sync engine or billing UI components.

**Multi-product auth approach:** One Firebase project, multiple web apps. Shared auth works. This is a well-documented pattern.

---

## Comparison Matrix

| Dimension | Supabase | Clerk+Neon+Vercel | Convex | PocketBase | Firebase |
|-----------|----------|-------------------|--------|------------|----------|
| **Auth quality** | Good (built-in, RLS) | Excellent (best DX) | Good (built-in) | Good (basic) | Good (mature) |
| **Multi-product auth** | Workable (shared project) | Excellent (designed for it) | Weak (not designed for it) | Workable (shared instance) | Good (shared project) |
| **Database** | Postgres (full SQL) | Postgres (Neon, serverless) | Custom document DB | SQLite | Firestore (NoSQL) |
| **File storage** | S3-compatible (built-in) | Vercel Blob or external | Built-in | Built-in (local/S3) | Cloud Storage |
| **Stripe integration** | Strong (sync engine) | Excellent (Clerk Billing) | Manual | Manual | Manual |
| **TypeScript DX** | Good (client SDK) | Good (Clerk + Drizzle/Prisma) | Excellent (pure TS) | Fair (JS SDK, no TS backend) | Fair (JS-first) |
| **Cost at low scale** | $25/month (Pro) | $59/month (combined) | $25/month (Pro) | $5-10/month (VPS) | Free-$25/month |
| **Deployment complexity** | Low (managed) | Medium (3 services) | Low (managed) | Medium (self-hosted) | Low (managed) |
| **Vendor lock-in** | Low (open source, Postgres) | Low (standard Postgres) | Medium (custom DB) | None (self-hosted) | High (proprietary DB) |
| **Community/ecosystem** | Large and growing | Large (each service) | Small but active | Small, 1 maintainer | Largest |
| **Horizontal scaling** | Yes (managed) | Yes (serverless) | Yes (managed) | No (single server) | Yes (managed) |

## Decision

**Recommendation: Supabase as the primary platform, with Clerk as the auth layer if multi-product auth proves painful.**

### The Two Viable Paths

After evaluating all five, the real choice is between two stacks:

**Path A: Supabase (all-in-one)**
- One platform, one bill, one dashboard.
- Postgres for everything. Auth, database, storage, edge functions.
- Stripe sync engine for payment data.
- $25/month starting cost.
- Multi-product auth via shared project with schema separation.

**Path B: Clerk + Neon + Vercel (best-of-breed)**
- Clerk for auth (best multi-product auth story, best Stripe integration via Clerk Billing).
- Neon for database (serverless Postgres, scales to zero).
- Vercel for hosting and edge functions.
- $59/month starting cost.
- Each piece is the best at what it does.

### Why Supabase Wins for Now

1. **Simplicity at our stage.** We're a team shipping our first paid product. One platform to learn, one set of docs, one dashboard. The cognitive overhead of managing three services (Clerk + Neon + Vercel) is real, even if each is excellent individually.

2. **Postgres is the right database.** Every product we're building (PDF tool usage tracking, OST tree data, agent workspace state) benefits from relational data, joins, and SQL. Supabase gives us Postgres without managing it. Convex's custom DB and Firebase's Firestore are both compromises we don't need to make.

3. **Cost.** $25/month vs $59/month. At pre-revenue, this matters. The gap widens with usage-based overages across three services.

4. **The Stripe sync engine is underrated.** Having Stripe subscription data queryable in Postgres (`select * from stripe.subscriptions where status = 'active'`) eliminates an entire category of webhook-sync-check code. This alone saves days of development on every product.

5. **Open source.** If Supabase the company disappears, we can self-host. The data is in Postgres, which is the most portable database on earth. Minimal lock-in.

6. **Multi-product auth is solvable.** One Supabase project for the "Sherlock Labs Platform." All products authenticate against it. Shared cookie on `*.sherlocklabs.ai`. Not as polished as Clerk's purpose-built multi-app auth, but functional.

### When to Reconsider

Upgrade to the Clerk + Neon + Vercel stack if:
- Multi-product auth in Supabase becomes a maintenance burden (shared sessions, cross-product permissions).
- We need Clerk Billing's `<PricingTable>` components to reduce payment UI development time.
- We outgrow Supabase's auth capabilities (need SAML/OIDC enterprise SSO, advanced RBAC).
- We move to Next.js across all products (Clerk + Vercel are optimized for this stack).

### What's Eliminated

- **Convex:** Excellent DX but the custom database is too much lock-in, and multi-product auth is not a strength. Good for a single real-time app, not for a multi-product platform.
- **PocketBase:** Right spirit, wrong scale. Single-server SQLite with one maintainer is fine for a side project but not for a platform we're betting the business on.
- **Firebase:** Firestore's NoSQL model is a poor fit for SaaS data (subscriptions, usage, teams, permissions are inherently relational). Pricing unpredictability is a real risk. The Google kill-product anxiety is irrational but widespread.

## Consequences

- **Positive:** One platform to learn. Postgres for everything. Stripe data in the database. Auth reuse across products. $25/month to start.
- **Positive:** SherlockPDF Phase 2 can migrate from "no auth, localStorage" to Supabase auth without rebuilding the payment flow (Stripe sync engine handles the bridge).
- **Positive:** Future products (OST SaaS, Agent Workspace) inherit auth, database, and storage from day one.
- **Trade-off:** Supabase's multi-product auth is workable but not elegant. If we ship 3+ products, we may need to evaluate Clerk for the auth layer specifically.
- **Trade-off:** Edge functions are Deno-based. Minor learning curve for our Node.js team, or we keep using Railway/Vercel for Node.js API servers and only use Supabase for auth + database + storage.
- **Risk:** Supabase is a startup. They're well-funded and growing, but they're not Google or AWS. The open-source escape hatch mitigates this.
