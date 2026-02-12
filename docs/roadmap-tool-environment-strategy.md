# Roadmap Tool — Environment & Deployment Strategy

---

## Part 1: Environment Architecture (Andrei)

**Author:** Andrei (Technical Architect)
**Date:** February 11, 2026
**Status:** Complete
**Project ID:** `roadmap-tool`
**Inputs:** `docs/roadmap-tool-tech-approach.md`, `docs/roadmap-tool-requirements.md`, `skills/development/saas-stack.md`, current codebase at `roadmap-tool/`

---

### 1. Executive Summary

Two environments: **local development** and **production**. No persistent staging environment.

A staging environment adds infrastructure cost, configuration duplication, and maintenance overhead that isn't justified for a product at this stage — pre-launch, small team, no external users yet. The risk of deploying a bad build to production is lower than the cost of maintaining staging. We add staging when we have paying users and need a safety net before releases.

Railway's preview environments (auto-deployed from PR branches) serve as ad-hoc staging when we need it — they spin up on demand, cost nothing when idle, and tear down automatically. That's better than maintaining a persistent staging environment that nobody uses most of the time.

> **Note on Milo's staging recommendation (Part 2):** Milo's CI/CD section recommends a staging + production Railway setup with manual promote. That's a reasonable approach and easy to add later. My recommendation is to start with just production to minimize overhead during early development, then add staging as a persistent environment once we have users and a QA flow that needs it. Both approaches are compatible — the difference is timing. If the CEO prefers the safety of staging from day one, Milo's approach is ready to go.

---

### 2. Environment Tiers

#### 2.1 Local Development

**Purpose:** Active development, debugging, feature building.

| Component | Local Dev Setup |
|-----------|----------------|
| **Frontend** | Vite dev server at `localhost:5173` with HMR |
| **Backend** | tsx watch at `localhost:3001` with hot-reload |
| **Database** | Local PostgreSQL (macOS native or Postgres.app) |
| **Auth** | Bypassed via `DEV_BYPASS_AUTH=true` |
| **WebSocket** | Socket.IO on local server, same bypass |
| **R2** | Skipped — file uploads return a no-op or stub URL when R2 env vars absent |
| **PostHog** | Disabled — no tracking in dev |
| **Stripe** | Skipped until payments are implemented |
| **Email** | Skipped — Loops not wired in dev |

**Key characteristics:**
- Zero external service dependencies. You can work offline after `npm install`.
- Auth bypass creates a hardcoded `dev_org` / `dev_user` pair in the local database (already implemented in `server/src/middleware/auth.ts`).
- Seed script populates color palettes and can be extended with sample roadmap data for development convenience.

#### 2.2 Production

**Purpose:** Live product serving real users.

| Component | Production Setup |
|-----------|-----------------|
| **Frontend** | Static build served from Express (`client/dist/`) |
| **Backend** | Express on Railway, single service |
| **Database** | Railway managed PostgreSQL |
| **Auth** | Clerk (full auth flow — signup, login, orgs) |
| **WebSocket** | Socket.IO on the same Railway service |
| **R2** | Cloudflare R2 for file storage |
| **PostHog** | Full analytics tracking |
| **Stripe** | Live mode for payments (when implemented) |
| **Email** | Loops for transactional + product email (when implemented) |

**Key characteristics:**
- All services are real, all secrets are production keys.
- Railway auto-injects `DATABASE_URL` for the linked Postgres service.
- GitHub repo connection auto-deploys on push to `main`.

#### 2.3 Railway Preview Environments (Ad-Hoc)

Railway creates ephemeral preview environments from pull request branches. These are disposable and short-lived.

**When to use:** Before merging a PR that touches database schema, auth flow, or real-time behavior — things that are hard to test with just the local dev bypass.

**Configuration:** Preview environments inherit the production Railway project's env vars but get their own isolated Postgres instance. Override `CLIENT_URL` and `NODE_ENV` per-preview.

---

### 3. Configuration Architecture

#### 3.1 Single `.env` File Per Environment

The project uses a single `.env` file at the project root. This is the right approach.

**Decision: Keep the current pattern.** No environment-specific config files (`.env.development`, `.env.production`, etc.). The `.env` file is local-only (gitignored). Production env vars are set directly in Railway's service settings.

Why not environment-specific files:
- Railway doesn't read `.env` files — it injects env vars directly into the process.
- Vite already handles `VITE_*` prefix for client-side env vars.
- Having one `.env` file means one place to look during local dev.

#### 3.2 Environment Variable Naming Convention

**Server-side variables:** Use `UPPER_SNAKE_CASE` without prefix.
```
DATABASE_URL, CLERK_SECRET_KEY, R2_ENDPOINT, PORT, NODE_ENV
```

**Client-side variables (Vite):** Prefix with `VITE_`.
```
VITE_CLERK_PUBLISHABLE_KEY, VITE_POSTHOG_KEY, VITE_DEV_BYPASS_AUTH
```

**Convention rules:**
1. Never expose secret keys to the client. Only `VITE_*` vars are bundled into the frontend build.
2. Service-specific vars are prefixed with the service name: `CLERK_*`, `STRIPE_*`, `R2_*`, `POSTHOG_*`.
3. App-level vars use no service prefix: `PORT`, `NODE_ENV`, `CLIENT_URL`, `DEV_BYPASS_AUTH`.

---

### 4. Secrets Management

#### 4.1 Where Secrets Live

| Environment | Where secrets are stored | Who manages them |
|-------------|------------------------|-----------------|
| **Local dev** | `.env` file (gitignored) | Developer |
| **Production** | Railway service env vars | Deployed via Railway dashboard or CLI |
| **Preview envs** | Inherited from Railway project | Automatic |

#### 4.2 Key Separation: Test vs. Live Keys

Clerk and Stripe both provide separate test and live API keys:
- **Local dev:** Use test keys (`pk_test_*`, `sk_test_*`) — or bypass entirely with `DEV_BYPASS_AUTH=true`.
- **Production:** Use live keys (`pk_live_*`, `sk_live_*`).

**Rule:** Never put live keys in `.env.example` or commit them anywhere.

#### 4.3 No Vault / No KMS

Railway's built-in env var management is sufficient at this stage. Secrets are encrypted at rest in Railway and only exposed to the running process. Add Vault/KMS when we have compliance requirements.

---

### 5. Service Topology Per Environment

#### 5.1 Local Development Topology

```
Browser (localhost:5173)
  │
  ├── Vite dev server (HMR, proxy /api + /socket.io)
  │       │
  │       ▼
  │   Express (localhost:3001)
  │       ├── REST API (DEV_BYPASS_AUTH → dev_org/dev_user)
  │       ├── Socket.IO (DEV_BYPASS_AUTH → dev_user)
  │       └── Drizzle ORM
  │               │
  │               ▼
  │       Local PostgreSQL (localhost:5432/roadmap_tool)
  │
  ├── Clerk: BYPASSED
  ├── R2: BYPASSED (no-op when config absent)
  ├── PostHog: DISABLED
  ├── Stripe: NOT CONNECTED
  └── Loops: NOT CONNECTED
```

**Dependencies to run locally:** PostgreSQL only. Everything else is bypassed or deferred.

#### 5.2 Production Topology

```
Browser (roadmap.sherlocklabs.ai)
  │
  ├── Railway Service: "roadmap-tool"
  │       ├── Express serves static client build (client/dist/)
  │       ├── REST API (Clerk JWT auth)
  │       ├── Socket.IO (Clerk JWT auth)
  │       └── Drizzle ORM
  │               │
  │               ▼
  │       Railway PostgreSQL (internal network)
  │
  ├── Clerk: Full auth (signup, login, orgs, webhooks)
  ├── R2: Cloudflare R2 (presigned uploads/downloads)
  ├── PostHog: Analytics tracking
  ├── Stripe: Subscriptions (when implemented)
  └── Loops: Email (when implemented)
```

Single Railway service serves both API and static frontend build per tech approach doc (Section 12.2, Option A).

---

### 6. Feature Flags and Environment-Specific Behavior

#### 6.1 General Pattern: Service Availability Guards

Rather than a feature flag system, use **service availability guards** — check if a service is configured before using it.

```typescript
// Pattern: guard on the presence of config, not on NODE_ENV
const isR2Configured = !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID);
const isPostHogConfigured = !!process.env.POSTHOG_KEY;
const isClerkConfigured = !!process.env.CLERK_SECRET_KEY && process.env.DEV_BYPASS_AUTH !== 'true';
```

**Why guard on config, not NODE_ENV:**
- `NODE_ENV` is a blunt instrument. Guarding on config presence is self-documenting and works correctly across Railway preview environments.
- You might want to test R2 uploads locally with real keys. Guarding on `NODE_ENV === 'production'` would prevent that.

#### 6.2 What Should Be Dev-Only

| Behavior | How it's gated |
|----------|---------------|
| Auth bypass (dev_org/dev_user) | `DEV_BYPASS_AUTH=true` |
| Verbose error messages in API responses | `NODE_ENV !== 'production'` (already implemented) |
| Seed data script | Run manually — not automatic |
| Source maps | Vite: enabled in dev, disabled in prod build by default |

#### 6.3 What We Don't Need

- **Feature flag service:** Overkill for pre-launch. Use env var guards. Add PostHog feature flags later for gradual rollouts.
- **Maintenance mode:** Not needed until we have users.
- **Canary deployments:** Railway doesn't support traffic splitting. Not needed at our scale.

---

### 7. Data Strategy

#### 7.1 Local PostgreSQL, Not SQLite

The schema uses PostgreSQL-specific features (`gen_random_uuid()`, JSONB, `timestamptz`, unique constraints on nullable columns). SQLite would require significant schema changes. Running local Postgres is trivial on macOS via Postgres.app or Homebrew.

#### 7.2 Data Isolation Between Environments

Local dev and production use completely separate databases on completely separate infrastructure. There is no data sharing between them.

**Rules:**
- Never connect to the production database from a local machine.
- Never copy production data to local dev. If you need realistic test data, enhance the seed script.
- Only run migrations forward in production — never `DROP`.

#### 7.3 Migration Strategy

1. **Schema change:** Edit `server/src/db/schema.ts`
2. **Generate migration:** `npm run db:generate -w server`
3. **Apply locally:** `npm run db:migrate -w server`
4. **Deploy:** Migration runs as part of Railway start command

**Migrations must be backwards-compatible:** add columns as nullable, backfill data, then add NOT NULL constraints in a subsequent migration. This prevents downtime during deploys.

---

### 8. Production Deployment Configuration

#### 8.1 Static File Serving

Add to `server/src/index.ts` after all API routes but before the error handler:

```typescript
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}
```

#### 8.2 Railway Service Configuration

```
Build command:     npm ci && npm run build
Start command:     npm run db:migrate -w server && node server/dist/index.js
```

Migrations run at start time (idempotent). Auto-deploy on push to `main`.

---

### 9. Domain and URL Strategy

| Environment | Frontend URL | API (proxied) |
|-------------|-------------|---------------|
| **Local dev** | `http://localhost:5173` | `http://localhost:3001` via Vite proxy |
| **Production** | `https://roadmap.sherlocklabs.ai` | Same origin, `/api/v1/*` |
| **Preview** | `roadmap-tool-pr-N.up.railway.app` | Same origin |

Custom domain setup: add domain in Railway settings, point DNS CNAME to Railway's target, SSL auto-provisioned.

---

### 10. Implementation Checklist

#### P0 — Required for Production Deploy

- [ ] Add static file serving to Express (Section 8.1)
- [ ] Set all env vars in Railway with production values
- [ ] Connect GitHub repo to Railway, auto-deploy on push to `main`
- [ ] Configure custom domain in Railway
- [ ] Set `CLIENT_URL` in Railway to match production domain
- [ ] Add `VITE_*` build-time env vars to Railway

#### P1 — Dev Experience

- [ ] Extend seed script with `--dev` flag for sample data
- [ ] Add R2 guard in upload routes (no-op when unconfigured)
- [ ] Add PostHog guard on client (skip when key absent)

#### P2 — Future

- [ ] Enable Railway preview environments
- [ ] Add GitHub Actions for type-checking/lint on PRs
- [ ] Add health check endpoint (`GET /api/v1/health`)
- [ ] Add structured logging

---

### 11. Architecture Decision Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Two environments (dev + prod), no persistent staging | Pre-launch. Add staging when we have paying users. |
| 2 | Single `.env` file, no env-specific files | Railway doesn't read `.env` files. One file for local dev simplicity. |
| 3 | Guard on service config presence, not `NODE_ENV` | More flexible, self-documenting, works across preview envs. |
| 4 | Local PostgreSQL, not SQLite for dev | Schema uses Postgres-specific features. |
| 5 | Migrations in start command | Idempotent. Ensures schema is always current. |
| 6 | Single Railway service (API + static frontend) | Simplest deployment model for v1. |
| 7 | No CI/CD pipeline at launch | Railway handles build + deploy. Add GH Actions when we have tests to gate on. |
| 8 | No secrets vault | Railway env var management is sufficient at this stage. |

---

*Environment architecture written by Andrei (Technical Architect). Downstream agents: Jonah and Milo, read this for deployment and configuration decisions. Alice, read Section 3 for client-side env var conventions.*

---
---

## Part 2: CI/CD Pipeline & Deployment Strategy

**Author:** Milo (Backend DevOps)
**Date:** February 11, 2026
**Status:** Complete
**Inputs:** `docs/roadmap-tool-tech-approach.md` (Andrei), `docs/roadmap-tool-requirements.md` (Thomas), `skills/development/saas-stack.md`

---

### 1. Railway Environment Setup

**Two environments: staging + production.** No separate dev environment on Railway — local dev uses `npm run dev` with a local `.env` pointing at a local Postgres (or a free Railway dev database if preferred). Three environments is overkill for current team size.

**Branch-to-environment mapping:**
- `main` branch → **staging** (auto-deploy on every push/merge to main)
- Production → **manual promote** from staging (Railway's "Promote" feature or git tag trigger)

**Railway project structure:**

```
Project: roadmap-tool
├── Environment: staging
│   ├── Service: api (Express + static frontend)
│   └── Service: postgres (Railway managed)
└── Environment: production
    ├── Service: api (Express + static frontend)
    └── Service: postgres (Railway managed)
```

**Railway CLI setup:**

```bash
# Link repo to Railway project
railway link

# Switch between environments
railway environment staging
railway environment production

# Check current environment
railway status
```

**Why not three environments:**
- We're a small team. Staging catches issues before prod. A third "dev" environment on Railway is an extra cost with no real benefit when local development works fine.
- If we later need isolated testing for specific features, Railway's PR preview environments handle that (see section 9).

---

### 2. CI/CD Pipeline (GitHub Actions)

Two workflows: one for PRs, one for merge-to-main.

#### 2.1 PR Checks (`ci.yml`)

Runs on every PR and push to PR branches. Fast feedback — should complete in under 3 minutes.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: roadmap_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/roadmap_test
      - run: npm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/roadmap_test
          NODE_ENV: test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
```

**What this does:**
- **lint-and-typecheck** — ESLint + `tsc --noEmit` across all workspace packages. Catches type errors and style issues.
- **test** — Runs the test suite against a real Postgres (not SQLite mocks). Drizzle migrations run first to set up the schema.
- **build** — Full production build (`shared` → `client` → `server`). Catches build-time errors that typecheck misses (Vite bundling issues, missing imports, etc.).

All three jobs run in parallel. PR can't merge unless all pass.

#### 2.2 Root Scripts to Add

The root `package.json` needs these scripts for CI:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev -w client\" \"npm run dev -w server\"",
    "build": "npm run build -w shared && npm run build -w client && npm run build -w server",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc -b",
    "test": "npm run test -w server",
    "db:generate": "npm run db:generate -w server",
    "db:migrate": "npm run db:migrate -w server",
    "db:seed": "npm run db:seed -w server"
  }
}
```

**Note:** `tsc -b` uses TypeScript's project references / build mode to typecheck all workspace packages in dependency order. This respects the `shared` → `client`/`server` dependency graph.

---

### 3. Deployment Flow

**The path from code to production:**

```
Developer pushes code
       │
       ▼
PR opened → GitHub Actions CI runs (lint, typecheck, test, build)
       │
       ▼ (all checks pass, PR reviewed)
       │
Merge to main
       │
       ▼
Railway auto-deploys to STAGING
       │
       ▼ (Railway runs build + start command)
       │
Staging verified (manual smoke test or automated health check)
       │
       ▼
Manual promote to PRODUCTION (Railway CLI or dashboard)
```

**Railway auto-deploy on merge to main:**
Railway watches the `main` branch. On every push, it:
1. Clones the repo
2. Runs the build command
3. Starts the service with the start command
4. Routes traffic to the new instance once healthy (zero-downtime deploy via Railway's rolling update)

**Railway service config (both environments):**

```
Build command:  npm ci && npm run build && npm run db:migrate
Start command:  node server/dist/index.js
Watch paths:    / (whole repo — monorepo)
Health check:   /api/health (GET, expect 200)
```

**Promote to production:**

```bash
# Option A: Railway CLI promote
railway environment staging
railway promote --to production

# Option B: Railway dashboard
# Click "Promote to Production" button in staging environment
```

**Why manual promote (not auto-deploy to prod):**
- Staging gives us a buffer to catch issues before users see them.
- At our scale, manually clicking "promote" takes 5 seconds and adds a real safety gate.
- We can automate this later if we build confidence in our test suite.

---

### 4. Database Migrations in CI/CD

**Drizzle migrations run as part of the Railway build command,** before the new code starts serving traffic.

**Migration flow on deploy:**

```
Railway build step:
  1. npm ci                    ← install deps
  2. npm run build             ← compile shared → client → server
  3. npm run db:migrate        ← drizzle-kit migrate (applies pending migrations)

Railway start step:
  4. node server/dist/index.js ← start the app (schema is already up-to-date)
```

**Why run migrations in the build step (not at app startup):**
- If the migration fails, the deploy fails. Railway keeps the old instance running. Users are never affected.
- Running migrations at app startup risks partial states if the app starts receiving traffic before migrations complete.
- Build-step migrations also mean the app code doesn't need migration logic — cleaner separation.

**Migration script in server/package.json:**

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx src/db/seed.ts"
  }
}
```

**Drizzle config (`server/drizzle.config.ts`):**

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Rollback strategy for migrations:**

Drizzle doesn't have automatic rollback. Our strategy:

1. **Prevention first:** Every migration should be backward-compatible. Add columns as nullable, add new tables — don't drop or rename existing columns in the same deploy as the code change.
2. **If a migration breaks staging:** Fix the migration forward (write a new migration that corrects the issue). Don't manually edit applied migration files.
3. **Nuclear option (staging only):** Drop and recreate the staging database. Staging data is ephemeral — losing it is fine.
4. **Production rollback:** If a migration causes issues in prod, we write a corrective migration and deploy it. For truly catastrophic cases, Railway's Postgres backups let us restore to a point-in-time snapshot.

**Safe migration checklist (for code reviewers):**
- [ ] New columns are nullable or have defaults
- [ ] No column renames (add new, migrate data, drop old — across 2 deploys)
- [ ] No table drops without data verification
- [ ] Indexes added concurrently where possible (`CREATE INDEX CONCURRENTLY`)
- [ ] Migration tested locally against a populated database

---

### 5. Environment Promotion

**Staging → Production promotion uses Railway's built-in promote feature.**

Railway environments share the same project config but have separate:
- Service instances (different URLs)
- Databases (separate Postgres instances)
- Environment variables (different secrets)

**Promotion gates (what must be true before promoting):**

1. **CI passed** — all GitHub Actions checks green on the commit being promoted
2. **Staging verified** — the code has been running on staging without errors. Check:
   - Health endpoint returns 200: `curl https://staging.roadmap.sherlocklabs.ai/api/health`
   - No error spikes in Railway logs
   - Manual smoke test of critical flows (create roadmap, add items, switch views)
3. **QA approval** — for major releases, Enzo gives explicit approval

**Promotion is manual for now.** Here's the flow:

```bash
# Check staging health
curl -s https://staging.roadmap.sherlocklabs.ai/api/health | jq .

# Check Railway staging logs for errors
railway logs --environment staging --tail 50

# Promote staging → production
railway promote --environment staging --to production
```

**Future automation:** Once the test suite is mature and covers critical paths, we can add a GitHub Action that auto-promotes to production after staging has been stable for N minutes. Not needed for v1.

---

### 6. Secrets Management in Railway

**All secrets live in Railway environment variables.** Never in the codebase, never in `.env` files committed to git.

**Environment variable tiers:**

| Variable | Staging | Production | Notes |
|----------|---------|------------|-------|
| `DATABASE_URL` | Auto-injected | Auto-injected | Railway internal networking, per-environment |
| `CLERK_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` | Separate Clerk apps for test/live |
| `CLERK_SECRET_KEY` | `sk_test_...` | `sk_live_...` | Separate Clerk apps |
| `CLERK_WEBHOOK_SECRET` | `whsec_...` (staging) | `whsec_...` (prod) | Different webhook endpoints → different secrets |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` | Stripe test mode vs live mode |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` | Stripe test mode vs live mode |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (staging) | `whsec_...` (prod) | Different endpoints |
| `R2_ACCESS_KEY_ID` | Shared or separate | Same or separate | Can share a bucket with prefix separation, or use separate buckets |
| `R2_SECRET_ACCESS_KEY` | Shared | Same | Paired with access key |
| `R2_BUCKET_NAME` | `roadmap-tool-staging` | `roadmap-tool-prod` | **Separate buckets** — staging uploads shouldn't pollute prod |
| `POSTHOG_KEY` | Same project, different env | Same or separate | PostHog supports environment filtering |
| `NODE_ENV` | `staging` | `production` | Controls Express behavior, logging level |
| `CLIENT_URL` | `https://staging.roadmap.sherlocklabs.ai` | `https://roadmap.sherlocklabs.ai` | CORS origin, Clerk redirect URLs |
| `PORT` | Auto-injected | Auto-injected | Railway sets this |

**Setting variables via CLI:**

```bash
# Set a variable on staging
railway variables set CLERK_SECRET_KEY=sk_test_xxx --environment staging

# Set a variable on production
railway variables set CLERK_SECRET_KEY=sk_live_xxx --environment production

# List variables for an environment
railway variables --environment production
```

**Secret rotation process:**
1. Generate new secret in the service dashboard (Clerk, Stripe, etc.)
2. Update the Railway environment variable
3. Railway auto-redeploys with the new value (or trigger manual redeploy)
4. Verify the service is healthy with the new secret
5. Revoke the old secret in the service dashboard

**`.env.example` in the repo (for local dev):**

```bash
# Copy to .env and fill in values
# NEVER commit .env to git

# Database (local Postgres or Railway dev DB)
DATABASE_URL=postgresql://localhost:5432/roadmap_dev

# Clerk (use test keys)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Stripe (use test keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# R2
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=roadmap-tool-dev

# PostHog
POSTHOG_KEY=phc_...
POSTHOG_HOST=https://us.i.posthog.com

# App
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

---

### 7. Monitoring & Alerting

**Tier 1: What we ship with (v1, zero extra cost):**

| What | How | Why |
|------|-----|-----|
| **Health check endpoint** | `GET /api/health` → `{ status: "ok", db: "ok", uptime: 12345 }` | Railway uses this for deploy health gates. We use it for manual checks. |
| **Railway built-in metrics** | CPU, memory, network in Railway dashboard | Free with Railway. Covers basic resource monitoring. |
| **Railway deploy logs** | `railway logs` | Build failures, runtime errors, startup issues. |
| **Structured logging** | `pino` (JSON logger) in Express | Searchable logs. Log request method/path/status/duration on every request. Log errors with stack traces. |
| **PostHog for product analytics** | Already in the stack | User behavior, feature adoption, page load times (via web vitals capture). |

**Health check implementation:**

```typescript
// server/src/routes/health.ts
import { Router } from 'express';
import { db } from '../db/client';
import { sql } from 'drizzle-orm';

const router = Router();

router.get('/api/health', async (req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({
      status: 'ok',
      db: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      db: 'error',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
```

**What to log (structured, via pino):**

```typescript
// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      userId: req.auth?.userId,
      orgId: req.auth?.orgId,
    });
  });
  next();
});
```

**WebSocket monitoring (log on connect/disconnect):**

```typescript
io.on('connection', (socket) => {
  logger.info({ event: 'ws_connect', socketId: socket.id, userId: socket.data.userId });
  socket.on('disconnect', (reason) => {
    logger.info({ event: 'ws_disconnect', socketId: socket.id, reason });
  });
});
```

**Tier 2: Add when we have paying users (not v1):**
- **Sentry** for error tracking with source maps (catches client-side errors too)
- **BetterStack (formerly Logtail)** for log aggregation and alerting
- **UptimeRobot** or **BetterStack uptime** for external ping monitoring with PagerDuty/Slack alerts

**Why not add monitoring tools on day 1:** We're pre-launch. Railway logs + PostHog + structured logging gives us enough visibility. Adding Sentry etc. before we have users is premature infrastructure. Ship, get users, then instrument deeper.

---

### 8. Rollback Strategy

**Railway makes rollback simple: redeploy a previous successful deployment.**

**Scenario: Bad code deployed to production**

```bash
# Option A: Railway dashboard
# Go to the production service → Deployments tab → click "Redeploy" on a previous healthy deployment

# Option B: Git revert + push
git revert HEAD
git push origin main
# Railway auto-deploys the revert to staging → promote to prod
```

**Scenario: Bad database migration in production**

This is the harder case. Strategy depends on severity:

1. **Additive migration (added a column/table that shouldn't exist):**
   - Write a corrective migration that drops the column/table
   - Deploy normally. The corrective migration runs during the build step.

2. **Destructive migration (dropped data or altered column type):**
   - Use Railway's point-in-time Postgres backup to restore the database
   - Write a corrective migration if schema needs adjustment
   - Redeploy

3. **Migration that causes app crash:**
   - The build step will fail (migration runs, then app tries to start with incompatible schema)
   - Railway keeps the old deployment running — users are unaffected
   - Fix the migration, push, let it rebuild

**Prevention is the real strategy:**
- Always test migrations on staging first (staging has real-ish data)
- Follow the safe migration checklist (section 4)
- Never run destructive migrations without a backup plan documented in the PR

**Socket.IO reconnection on rollback:**
When the server restarts (during deploy or rollback), all WebSocket connections drop. Socket.IO's auto-reconnection handles this — clients reconnect within 1-4 seconds. Presence state rebuilds from client reconnections. In-memory edit locks are lost (by design — the 5-minute TTL was designed for exactly this scenario).

---

### 9. Preview Environments

**Recommendation: Enable Railway preview environments for PRs, but only once the core product is building successfully.**

Don't set this up during Sprint 1. Set it up after Sprint 2 when the product has enough UI to actually preview.

**How it works:**
- Railway can auto-create a temporary environment for each PR branch
- Each preview environment gets its own URL and database
- Preview is destroyed when the PR is closed/merged

**Railway config for preview environments:**

```bash
# Enable PR environments in Railway project settings
# Settings → Environments → Enable "PR Environments"
# Each PR gets: roadmap-tool-pr-{number}.up.railway.app
```

**Cost consideration:**
- Railway charges for active services. Preview environments only consume resources while the PR is open.
- A preview environment with Postgres costs ~$5/month if left running. Set auto-destroy to close with the PR.
- At current team size (1-3 active PRs), cost is negligible.

**When preview environments are worth it:**
- Design review — Robert can check implementation against design spec on a live URL
- QA — Enzo can test on staging-like environments without blocking the main staging pipeline
- Stakeholder demos — show a feature in progress without deploying to staging

**Seed data for previews:**
Create a lightweight seed script that populates a preview database with enough data to be useful (a sample roadmap with 20 items, fields, milestones). This runs as part of the preview build command:

```
Build command (preview): npm ci && npm run build && npm run db:migrate && npm run db:seed
```

---

### 10. Build Configuration

**Monorepo build strategy: npm workspaces + ordered build.**

The build must respect the dependency graph:

```
shared (types + validation)
   ├── client (depends on shared)
   └── server (depends on shared)
```

**Build order enforced in root `package.json`:**

```json
{
  "scripts": {
    "build": "npm run build -w shared && npm run build -w client && npm run build -w server"
  }
}
```

`shared` builds first (compiles TypeScript types and Zod schemas). Then `client` and `server` can build in any order (they import from `shared`). We run them sequentially for simplicity — parallel build saves ~10 seconds but adds complexity.

**Build output:**

```
shared/dist/           ← compiled types + validation
client/dist/           ← Vite static build (HTML, JS, CSS)
server/dist/           ← compiled Express server
```

**Railway builds the monorepo with Nixpacks auto-detect.** Nixpacks sees `package.json` at the root, runs `npm ci`, then runs the build command. No Dockerfile needed.

**Railway service configuration:**

```
Root directory:    / (repo root)
Build command:     npm ci && npm run build && npm run db:migrate
Start command:     node server/dist/index.js
Node version:      20 (set via engines in package.json or .node-version file)
```

**Express serves the static frontend** (Andrei's Option A for v1):

```typescript
// server/src/index.ts (relevant section)
import path from 'path';
import express from 'express';

const app = express();

// API routes
app.use('/api', apiRouter);

// Socket.IO (handled separately)

// Serve static frontend build
app.use(express.static(path.join(__dirname, '../../client/dist')));

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});
```

**Vite client build config:**

```typescript
// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true, // for debugging in staging
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
```

**Node version pinning (`.node-version` at repo root):**

```
20
```

This ensures Railway, GitHub Actions, and local dev all use the same Node version.

**TypeScript build config (tsconfig hierarchy):**

```
tsconfig.base.json       ← shared compiler options
client/tsconfig.json     ← extends base, adds React/JSX settings
server/tsconfig.json     ← extends base, adds Node settings
shared/tsconfig.json     ← extends base, minimal
```

---

### Summary: What to Set Up and When

| When | What | Effort |
|------|------|--------|
| **Sprint 1 start** | Railway project with staging + production environments | 30 min |
| **Sprint 1 start** | Environment variables configured per environment | 30 min |
| **Sprint 1 start** | `ci.yml` GitHub Actions workflow (lint, typecheck, test, build) | 1 hour |
| **Sprint 1 start** | Health check endpoint | 15 min |
| **Sprint 1 start** | Structured logging with pino | 30 min |
| **Sprint 1 start** | `.env.example` + `.gitignore` for secrets | 15 min |
| **Sprint 1 start** | Build scripts in root `package.json` | 15 min |
| **Sprint 2+** | Railway PR preview environments | 30 min |
| **Post-launch** | Sentry error tracking | 1 hour |
| **Post-launch** | External uptime monitoring | 15 min |
| **Post-launch** | Automated staging → prod promotion | 2 hours |

**Total Sprint 1 DevOps setup: ~3 hours.** Everything else is deferred until it's actually needed. Keep it boring.

---

*CI/CD and deployment strategy written by Milo (Backend DevOps). Downstream agents: Jonah, reference this for health check endpoint and logging setup. Alice, reference the Vite build config and static serving pattern. Andrei, review Railway environment setup for alignment with your architecture.*

---

## Backend Environment Configuration

**Author:** Jonah (Backend Developer)
**Date:** February 11, 2026
**Status:** Complete
**Inputs:** Backend codebase at `roadmap-tool/server/src/`, `docs/roadmap-tool-tech-approach.md` (Andrei), Milo's CI/CD section above

This section covers every backend-specific concern for running the Roadmap Tool across three environments: **local dev**, **staging**, and **production**. I've read every file in `server/src/` and the root configs to ground these recommendations in what the code actually does today.

---

### 1. Database Per Environment

#### Local Dev: Local PostgreSQL

The current `.env` points to `postgresql://jeffsherlock@localhost:5432/roadmap_tool` — this is correct and should stay. Local Postgres is instant, free, needs no network, and can be dropped and recreated at will.

**One-time setup:**
```bash
createdb roadmap_tool
npm run db:migrate
npm run db:seed
```

No connection pooling or SSL needed locally. The current `pg.Pool` with a bare `connectionString` is correct for dev.

#### Staging: Separate Railway Postgres Instance

Railway provisions a dedicated Postgres per environment. Staging gets its own instance — **never share a database between staging and production**. Railway auto-injects `DATABASE_URL`.

**Connection pooling note:** Railway's managed Postgres can optionally proxy through PgBouncer. When PgBouncer is enabled, Railway provides two URLs:
- `DATABASE_URL` — pooled (through PgBouncer), for the app
- `DATABASE_DIRECT_URL` — direct, for migrations (Drizzle's migration runner uses `SET` commands that PgBouncer in transaction mode doesn't support)

#### Production: Railway Postgres with Hardened Pool Config

Same Railway Postgres, separate instance. The current `db/client.ts` creates a `pg.Pool` with zero configuration beyond `connectionString`. For production, we need pool tuning.

**Recommended change to `server/src/db/client.ts`:**

```typescript
import '../env.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const isProduction = process.env.NODE_ENV === 'production';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX ?? (isProduction ? '20' : '5'), 10),
  idleTimeoutMillis: isProduction ? 30_000 : 10_000,
  connectionTimeoutMillis: 5_000,
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;
```

**Why these values:**
- `max: 20` for prod — Railway's single-instance Postgres defaults to 100 max connections. 20 per Express instance leaves headroom for migrations, Railway health checks, and future scaling.
- `max: 5` for dev — minimal footprint, more than enough for a single developer.
- `idleTimeoutMillis: 30_000` for prod — close idle connections after 30 seconds to return them to the pool. Shorter in dev to clean up faster.
- `connectionTimeoutMillis: 5_000` — fail fast if the DB is unreachable rather than hanging indefinitely.

**SSL:** Not explicitly configured because Railway's `DATABASE_URL` includes `?sslmode=require` when connecting from outside their internal network. Internal connections (same Railway project) don't need it and Railway's URL omits the SSL param. The `pg` driver handles this transparently.

---

### 2. Migration Strategy

#### Current State

`drizzle-kit generate` creates SQL migration files in `server/src/db/migrations/`. `drizzle-kit migrate` applies them. The `drizzle.config.ts` reads `DATABASE_URL` directly.

#### Per-Environment Migration Policy

| Environment | When migrations run | Who triggers | Guardrails |
|-------------|-------------------|--------------|------------|
| **Local dev** | Manually via `npm run db:migrate` | Developer | None needed — DB is disposable |
| **Staging** | Automatically during Railway build step | Railway (on deploy) | Milo's build command: `npm ci && npm run build && npm run db:migrate` |
| **Production** | **Manually** via `railway run` or dashboard | Human (deliberate action) | Requires explicit invocation outside the build command |

**Why NOT auto-migrate in production:** A bad migration against prod data with live connections is the highest-risk backend operation. Separating the migration from the deploy means a human reviews the migration SQL against the production schema before running it. For staging, auto-migration is fine — staging data is expendable.

**Production build command (differs from staging):**
```bash
# Staging Railway build command
npm ci && npm run build && npm run db:migrate

# Production Railway build command (NO auto-migrate)
npm ci && npm run build

# Production migrations run manually:
railway run --environment production npm run db:migrate -w server
```

**Drizzle config change for PgBouncer compatibility:**

```typescript
// server/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
```

`DATABASE_DIRECT_URL` bypasses PgBouncer. Falls back to `DATABASE_URL` for local dev (where there's no PgBouncer).

---

### 3. Seed Data

#### Current State

The seed script (`server/src/db/seed.ts`) creates 6 default color palettes with `accountId = null`. It's idempotent via `onConflictDoNothing`. It does **not** create the dev user/account — that's handled lazily by `auth.ts` when `DEV_BYPASS_AUTH=true`.

#### What Needs to Change

The seed script should create dev-friendly sample data in non-production environments so developers see something useful immediately after `npm run dev`.

**Expanded seed strategy:**

| Environment | What gets seeded | Trigger |
|-------------|-----------------|---------|
| **Local dev** | System palettes + dev account + sample roadmap (20 items, 4 fields, 3 views, 2 milestones) | `npm run db:seed` |
| **Staging** | System palettes only | Railway build command (Milo's preview env seed) |
| **Production** | System palettes only (first deploy) | One-time `railway run npm run db:seed -w server` |

**Production safety — hard guard in seed script:**

```typescript
// server/src/db/seed.ts — top of seedDevData()
async function seedDevData(db: DrizzleDB) {
  if (process.env.NODE_ENV === 'production') {
    console.log('SKIPPING dev seed data — production environment detected.');
    return;
  }
  // ... create dev account, sample roadmap, items, fields, views
}
```

The system-level palette seed is always safe (idempotent, `accountId = null`). The dev data seed checks `NODE_ENV` and refuses to run in production. Belt and suspenders.

**Updated root scripts:**
```json
{
  "db:seed": "npm run db:seed -w server",
  "db:fresh": "npm run db:migrate -w server && npm run db:seed -w server"
}
```

`db:fresh` is a convenience for local dev: apply all pending migrations then seed.

---

### 4. Auth Configuration

#### Current State (What the Code Does Today)

**Backend (`server/src/middleware/auth.ts`):**
- `DEV_BYPASS_AUTH=true` → skips Clerk entirely, creates/finds a `dev_org`/`dev_user` in the DB, grants `org:admin` role
- `DEV_BYPASS_AUTH` unset or `false` → full Clerk JWT verification via `@clerk/express`
- Both the HTTP middleware (`clerkAuth` + `resolveAuth`) and Socket.IO auth (`ws/handler.ts`) respect this flag

**Frontend (`client/.env`):**
- `VITE_DEV_BYPASS_AUTH=true` → client skips Clerk provider

This pattern is clean and works well. The question is what staging uses.

#### Per-Environment Auth Config

| Environment | Auth mode | Clerk instance | Keys needed |
|-------------|-----------|---------------|-------------|
| **Local dev** | `DEV_BYPASS_AUTH=true` | None | None |
| **Staging** | Full Clerk (test mode) | Clerk dev/test instance | `pk_test_*` / `sk_test_*` |
| **Production** | Full Clerk (live mode) | Clerk production instance | `pk_live_*` / `sk_live_*` |

**Staging MUST use real Clerk auth, not DEV_BYPASS_AUTH.** Staging exists to catch bugs before production. Auth is one of the most common sources of production bugs (token expiration, org switching, webhook race conditions). If staging bypasses auth, we're flying blind.

Clerk test mode gives us:
- Test users with real JWT flows
- Test email delivery (no real emails sent)
- Sandboxed data separate from production
- Webhook delivery to staging endpoints

**Clerk webhook secrets — per environment:**

Each Clerk instance (test vs production) has separate webhook configurations pointing at different endpoints:

| Clerk Instance | Webhook Target |
|---------------|---------------|
| Test (staging) | `https://staging-roadmap-api.up.railway.app/api/v1/webhooks/clerk` |
| Production | `https://api.roadmap.sherlocklabs.ai/api/v1/webhooks/clerk` |

Each webhook registration generates its own `CLERK_WEBHOOK_SECRET` (`whsec_*`).

**Critical TODO — webhook signature verification:**

The current `routes/webhooks.ts` has `// TODO: Verify webhook signature with CLERK_WEBHOOK_SECRET`. This MUST be implemented before any non-dev deployment. Without it, anyone can POST fake events to create accounts or modify users.

Implementation using `svix` (Clerk's webhook provider):

```typescript
import { Webhook } from 'svix';

webhooksRouter.post('/clerk', express.raw({ type: 'application/json' }), async (req, res, next) => {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error('CLERK_WEBHOOK_SECRET not configured');
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  try {
    const wh = new Webhook(secret);
    const payload = wh.verify(req.body.toString(), {
      'svix-id': req.headers['svix-id'] as string,
      'svix-timestamp': req.headers['svix-timestamp'] as string,
      'svix-signature': req.headers['svix-signature'] as string,
    });
    // ... handle verified payload
  } catch {
    res.status(401).json({ error: 'Invalid webhook signature' });
    return;
  }
});
```

**Note:** The webhook route needs `express.raw()` instead of `express.json()` for signature verification. This means the webhook routes need to be mounted before the global `app.use(express.json())` call, or use a route-level parser override. The current code already mounts webhooks before the global JSON parser, but the raw body issue still applies — Clerk's `svix` verification requires the raw request body, not the parsed JSON.

**Frontend Clerk Provider:**

The client needs conditional Clerk wrapping based on environment:

```typescript
// Already works: VITE_DEV_BYPASS_AUTH=true in client/.env for dev
// Staging/prod: VITE_DEV_BYPASS_AUTH unset + VITE_CLERK_PUBLISHABLE_KEY set
```

Vite env vars are compile-time, so Railway needs to set them as build-time environment variables (Milo's build command handles this).

---

### 5. Stripe Configuration

#### Current State

Stripe is deferred to post-v1. The webhook endpoint exists but does nothing (`// TODO`). The env vars are reserved in `.env.example`.

#### Per-Environment Strategy (for When Stripe Ships)

| Environment | Stripe mode | Webhook delivery |
|-------------|------------|-----------------|
| **Local dev** | Test mode (`sk_test_*`) | Stripe CLI: `stripe listen --forward-to localhost:3001/api/v1/webhooks/stripe` |
| **Staging** | Test mode (`sk_test_*`) | Stripe dashboard webhook pointed at staging URL |
| **Production** | Live mode (`sk_live_*`) | Stripe dashboard webhook pointed at prod URL |

**Key rules:**
1. Test mode keys can never charge real cards. Live keys must only exist in production Railway env vars.
2. Each webhook endpoint registration generates a unique `STRIPE_WEBHOOK_SECRET` (`whsec_*`).
3. Stripe CLI for local development auto-forwards webhook events and prints the signing secret.

**Stripe webhook verification** (implement when Stripe ships):

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

webhooksRouter.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
  // ... handle event
});
```

Same raw body requirement as Clerk webhooks — both need `express.raw()` before parsing.

---

### 6. Cloudflare R2 Configuration

#### Current State

R2 client (`server/src/lib/r2.ts`) reads `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. Upload keys follow the pattern `${accountId}/${itemId}/${uuid}-${filename}`.

The current code will crash if R2 credentials aren't set — the S3Client is instantiated at module load time with empty strings for credentials.

#### Recommendation: Separate Buckets Per Environment

| Environment | Bucket Name | API Token | Rationale |
|-------------|------------|-----------|-----------|
| **Local dev** | `roadmap-tool-dev` | Dev-scoped token | Can be freely wiped |
| **Staging** | `roadmap-tool-staging` | Staging-scoped token | Test uploads don't pollute prod |
| **Production** | `roadmap-tool-uploads` | Prod-scoped token | Production uploads |

**Why separate buckets, not path prefixes:** A misconfigured `R2_BUCKET_NAME` env var with path prefixes in a single bucket could leak prod files to staging. Separate buckets with separate API tokens provide hard isolation — each Cloudflare R2 API token is scoped to a single bucket.

**Presigned URLs work identically across environments.** The client receives a presigned URL from the server and uploads directly to R2. The bucket name is invisible to the client.

**Required code change — graceful degradation when R2 isn't configured:**

```typescript
// server/src/lib/r2.ts
const R2_CONFIGURED = !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID);

let r2: S3Client | null = null;
let bucket: string = '';

if (R2_CONFIGURED) {
  r2 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  bucket = process.env.R2_BUCKET_NAME ?? 'roadmap-tool-uploads';
}

export function isR2Configured(): boolean {
  return R2_CONFIGURED;
}

export async function getPresignedUploadUrl(key: string, mimeType: string, expiresIn = 3600): Promise<string> {
  if (!r2) throw new Error('R2 storage is not configured');
  // ... existing logic
}
```

Upload routes check `isR2Configured()` and return 503 with a helpful message when R2 isn't set up. This lets local dev run without R2 credentials — uploads just return a clear error instead of crashing the process.

---

### 7. WebSocket Configuration

#### Current State

Socket.IO in `ws/handler.ts`:
- CORS origin: `process.env.CLIENT_URL ?? 'http://localhost:5173'`
- `pingTimeout: 10_000`, `pingInterval: 25_000`
- Auth: Clerk JWT or `DEV_BYPASS_AUTH`
- In-memory presence (`ws/presence.ts`) and edit locks (`ws/editLock.ts`)

#### Environment Differences

| Setting | Local Dev | Staging | Production |
|---------|-----------|---------|------------|
| CORS origin | `http://localhost:5173` | Staging URL | `https://roadmap.sherlocklabs.ai` |
| Auth | `DEV_BYPASS_AUTH` | Clerk JWT | Clerk JWT |
| Transport | Default (polling + websocket) | Default | Default |
| `maxHttpBufferSize` | Not set (1MB default) | Not set | **Set to 1MB explicitly** |

**The current Socket.IO config is already environment-aware** — it reads `CLIENT_URL` for CORS and `DEV_BYPASS_AUTH` for auth. No per-environment Socket.IO changes are needed beyond one production hardening addition.

**Production hardening — add `maxHttpBufferSize`:**

```typescript
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    credentials: true,
  },
  pingTimeout: 10_000,
  pingInterval: 25_000,
  maxHttpBufferSize: 1e6,  // 1MB — prevents oversized event payloads
});
```

This is Socket.IO's default, but setting it explicitly documents our intent and prevents accidental removal.

**Railway WebSocket support:** Railway's HTTP proxy passes WebSocket Upgrade headers natively. Socket.IO's default behavior (try WebSocket first, fall back to polling) works out of the box. No special Railway config needed.

**Presence and edit locks on deploy:** When Railway does a rolling deploy, the old instance's WebSocket connections drop. Socket.IO auto-reconnects clients within 1-4 seconds. In-memory presence rebuilds from reconnections. Edit locks are lost — by design (they have a 5-minute TTL and the `editLock.ts` implementation handles this gracefully).

---

### 8. Logging & Error Handling

#### Current State

- Bare `console.log` / `console.error` throughout
- Error handler in `index.ts` returns raw `err.message` in dev, `"Internal server error"` in production
- No request logging

#### Recommendation: Keep It Simple, Don't Add a Logging Library

Milo recommends `pino` in his section. I'm going to push back slightly — **for v1, `console.log` with a structured format is sufficient.** Railway captures stdout/stderr and provides searchable logs. Adding `pino` adds a dependency, changes every log call, and requires configuration that `console.log` doesn't. We can add pino later if Railway's log viewer isn't enough.

**What I recommend instead — a lightweight request logger middleware:**

```typescript
// server/src/middleware/requestLogger.ts
import type { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(JSON.stringify({
      level,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      userId: req.userId,
    }));
  });
  next();
}
```

**JSON format** because Railway's log viewer can parse and filter structured JSON logs. Same benefit as pino without the dependency.

**Per-environment logging behavior:**

| Concern | Local Dev | Staging | Production |
|---------|-----------|---------|------------|
| Error responses | Full `err.message` | Full `err.message` | Generic "Internal server error" |
| Request logging | JSON to stdout | JSON to stdout | JSON to stdout |
| SQL query logging | Optional (`LOG_QUERIES=true`) | Off | Off |
| Stack traces in logs | Yes | Yes | Yes (in server logs, not in API responses) |

**Error handler (already correct):** The current code in `index.ts` line 66-69 already hides error details in production:

```typescript
message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
```

This is the right pattern. In staging (`NODE_ENV` could be `staging` or `production` per Milo's recommendation), we want full error messages for debugging. If Milo sets `NODE_ENV=production` for staging (which is common), we should switch the check to a dedicated flag:

```typescript
const SHOW_ERROR_DETAILS = process.env.NODE_ENV !== 'production' || process.env.SHOW_ERROR_DETAILS === 'true';
// Set SHOW_ERROR_DETAILS=true on staging Railway env vars
```

**Optional Drizzle query logging for dev:**

```typescript
// server/src/db/client.ts
export const db = drizzle(pool, {
  schema,
  logger: process.env.LOG_QUERIES === 'true',
});
```

---

### 9. Complete Environment Variable Inventory

Every env var the backend reads, organized by where it's used in the code.

#### Core App (`server/src/index.ts`, `server/src/env.ts`)

| Variable | File | Required | Local Dev | Staging | Production |
|----------|------|----------|-----------|---------|------------|
| `NODE_ENV` | `index.ts:66` | Yes | `development` | `production` | `production` |
| `PORT` | `index.ts:77` | Yes | `3001` | Railway auto | Railway auto |
| `CLIENT_URL` | `index.ts:23`, `ws/handler.ts:22` | Yes | `http://localhost:5173` | `https://staging.roadmap.sherlocklabs.ai` | `https://roadmap.sherlocklabs.ai` |

#### Auth (`server/src/middleware/auth.ts`, `server/src/ws/handler.ts`)

| Variable | File | Required | Local Dev | Staging | Production |
|----------|------|----------|-----------|---------|------------|
| `DEV_BYPASS_AUTH` | `auth.ts:7`, `ws/handler.ts:10` | No | `true` | **Must be unset** | **Must be unset** |
| `CLERK_SECRET_KEY` | `ws/handler.ts:56` | Staging/Prod | Not needed | `sk_test_*` | `sk_live_*` |
| `CLERK_WEBHOOK_SECRET` | `routes/webhooks.ts` (TODO) | Staging/Prod | Not needed | `whsec_*` | `whsec_*` |

**Note:** `CLERK_PUBLISHABLE_KEY` is a frontend-only variable — the backend doesn't read it. It's used by `<ClerkProvider>` on the client.

#### Database (`server/src/db/client.ts`, `server/drizzle.config.ts`)

| Variable | File | Required | Local Dev | Staging | Production |
|----------|------|----------|-----------|---------|------------|
| `DATABASE_URL` | `db/client.ts:7`, `drizzle.config.ts:8` | Yes | `postgresql://localhost:5432/roadmap_tool` | Railway auto | Railway auto |
| `DATABASE_DIRECT_URL` | `drizzle.config.ts` (proposed) | Migrations only | Same as DATABASE_URL | Railway provides | Railway provides |
| `DB_POOL_MAX` | `db/client.ts` (proposed) | No | `5` (default) | `10` | `20` |
| `LOG_QUERIES` | `db/client.ts` (proposed) | No | `true` (optional) | Not set | Not set |

#### Cloudflare R2 (`server/src/lib/r2.ts`)

| Variable | File | Required | Local Dev | Staging | Production |
|----------|------|----------|-----------|---------|------------|
| `R2_ENDPOINT` | `r2.ts:6` | For uploads | Optional | Cloudflare endpoint | Cloudflare endpoint |
| `R2_ACCESS_KEY_ID` | `r2.ts:8` | For uploads | Optional | Staging token | Prod token |
| `R2_SECRET_ACCESS_KEY` | `r2.ts:9` | For uploads | Optional | Staging token | Prod token |
| `R2_BUCKET_NAME` | `r2.ts:14` | For uploads | `roadmap-tool-dev` | `roadmap-tool-staging` | `roadmap-tool-uploads` |

#### Stripe (deferred, `server/src/routes/webhooks.ts`)

| Variable | File | Required | Local Dev | Staging | Production |
|----------|------|----------|-----------|---------|------------|
| `STRIPE_SECRET_KEY` | webhooks.ts (TODO) | Post-v1 | `sk_test_*` | `sk_test_*` | `sk_live_*` |
| `STRIPE_WEBHOOK_SECRET` | webhooks.ts (TODO) | Post-v1 | From `stripe listen` CLI | `whsec_*` | `whsec_*` |

#### Frontend (Vite compile-time vars — not read by server, but needed for build)

| Variable | Required | Local Dev | Staging | Production |
|----------|----------|-----------|---------|------------|
| `VITE_DEV_BYPASS_AUTH` | No | `true` | Unset | Unset |
| `VITE_CLERK_PUBLISHABLE_KEY` | Staging/Prod | Not needed | `pk_test_*` | `pk_live_*` |
| `VITE_POSTHOG_KEY` | Optional | Not set | `phc_*` | `phc_*` |
| `VITE_POSTHOG_HOST` | Optional | Not set | `https://us.i.posthog.com` | `https://us.i.posthog.com` |

#### Debug / Development

| Variable | Required | Local Dev | Staging | Production |
|----------|----------|-----------|---------|------------|
| `LOG_QUERIES` | No | `true` (opt-in) | Not set | Not set |
| `SHOW_ERROR_DETAILS` | No | Not needed (dev shows errors) | `true` | Not set |

---

### 10. Required Code Changes Before Deployment

Ordered by priority. Each change is backward-compatible with local dev.

| # | File | Change | Priority | Why |
|---|------|--------|----------|-----|
| 1 | `routes/webhooks.ts` | Implement Clerk webhook signature verification via `svix` | **Critical** | Security: without this, anyone can POST fake events to create accounts |
| 2 | `db/client.ts` | Add environment-aware pool config (`max`, `idleTimeoutMillis`, `connectionTimeoutMillis`) | High | Production stability: prevents connection exhaustion |
| 3 | `drizzle.config.ts` | Use `DATABASE_DIRECT_URL ?? DATABASE_URL` | High | PgBouncer compatibility for Railway migrations |
| 4 | `lib/r2.ts` | Add `isR2Configured()` guard, lazy-init S3Client | Medium | Prevents crash in local dev without R2 credentials |
| 5 | `index.ts` | Add request logger middleware | Medium | Observability in staging/production |
| 6 | `ws/handler.ts` | Add `maxHttpBufferSize: 1e6` to Socket.IO config | Low | Defense-in-depth for production |
| 7 | `db/seed.ts` | Add `NODE_ENV` guard for dev data, expand with sample roadmap | Low | Dev convenience + production safety |
| 8 | `.env.example` | Update with full variable inventory | Low | Documentation |

None of these are breaking changes. All work across all three environments. Items 1-3 are blocking for staging/production deployment. Items 4-8 are quality-of-life improvements that can ship incrementally.

---

### 11. Updated `.env.example`

Replace the current `.env.example` with a documented version:

```bash
# ============================================================
# Roadmap Tool — Environment Variables
# ============================================================
# Copy to .env for local development.
# Only DATABASE_URL, PORT, NODE_ENV, and CLIENT_URL are required locally.
# ============================================================

# --- Core ---
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173

# --- Auth ---
# Set to 'true' for local dev to skip Clerk entirely.
# MUST be unset for staging and production.
DEV_BYPASS_AUTH=true

# Clerk (not needed when DEV_BYPASS_AUTH=true)
# CLERK_PUBLISHABLE_KEY=pk_test_...
# CLERK_SECRET_KEY=sk_test_...
# CLERK_WEBHOOK_SECRET=whsec_...

# --- Database ---
DATABASE_URL=postgresql://localhost:5432/roadmap_tool
# DATABASE_DIRECT_URL=               # Railway provides; bypasses PgBouncer for migrations
# DB_POOL_MAX=5                       # Override connection pool size

# --- Cloudflare R2 (optional locally — uploads will return 503) ---
# R2_ENDPOINT=https://...r2.cloudflarestorage.com
# R2_ACCESS_KEY_ID=
# R2_SECRET_ACCESS_KEY=
# R2_BUCKET_NAME=roadmap-tool-dev

# --- Stripe (deferred to post-v1) ---
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_PUBLISHABLE_KEY=pk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...

# --- PostHog (optional) ---
# POSTHOG_KEY=phc_...
# POSTHOG_HOST=https://us.i.posthog.com

# --- Debug ---
# LOG_QUERIES=true                    # Enable Drizzle SQL query logging
# SHOW_ERROR_DETAILS=true             # Show error details in API responses (staging)
```

---

*Backend environment configuration written by Jonah (Backend Developer). Downstream: Andrei, review pool config and migration strategy alignment. Milo, coordinate on Railway env var setup and build command differences between staging and production. Alice, note the `VITE_*` variables needed for frontend builds in staging/production.*
