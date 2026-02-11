# Clerk Development & Testing Strategy -- Technical Research Brief

**Author:** Marco (Technical Researcher)
**Date:** February 11, 2026
**Status:** Complete
**Project:** roadmap-tool (Forge)
**Inputs:** Current codebase at `roadmap-tool/`, Clerk docs, `@clerk/testing` package docs, `docs/roadmap-tool-environment-strategy.md`

---

## Research Question

How should we properly develop and test with Clerk enabled in Forge? The current `VITE_DEV_BYPASS_AUTH` / `DEV_BYPASS_AUTH` flag skips Clerk entirely in local dev. What does Clerk officially recommend for local development, E2E testing, unit testing, and multi-environment setups?

---

## 1. Clerk Instances: Development vs Production

**Source:** [Clerk Instances/Environments Docs](https://clerk.com/docs/guides/development/managing-environments)

Clerk provides exactly two instance types per application. There is no built-in staging tier.

### Development Instance

- Default instance type. Optimized for local development.
- Capped at 500 users. Has a visible "Development" banner in Clerk UI components.
- Uses `accounts.dev` domain for its Frontend API (FAPI).
- Sessions are transmitted via query parameter (`__clerk_db_jwt`) because localhost and `accounts.dev` are cross-site -- cookies cannot work across that boundary.
- Shared OAuth credentials for social logins (Google, GitHub, etc.) -- no need to register your own OAuth app in dev.
- Email/SMS templates are prefixed with "[DEV]" to prevent accidental production confusion.
- All paid features are available for testing, but require a Pro plan when you move to production.
- Search engines cannot index the application.
- Keys are prefixed `pk_test_` / `sk_test_`.

### Production Instance

- Strict security posture. Designed for real users and real traffic.
- Requires a custom domain with CNAME pointed to Clerk for first-party cookie session management (the `__client` HttpOnly cookie).
- You must provision your own OAuth credentials for social logins.
- Keys are prefixed `pk_live_` / `sk_live_`.

### Staging / Preview Environments

**Source:** [Clerk Staging Setup Docs](https://clerk.com/docs/deployments/set-up-staging)

Clerk does NOT have a native staging instance type. Their official recommendation:

1. Create a **separate Clerk application** for staging (e.g., "Forge Staging").
2. Use a staging subdomain (e.g., `staging.forge.sherlocklabs.ai`).
3. Use **production API keys** (`pk_live_` / `sk_live_`) for the staging Clerk app to get production-like behavior (first-party cookies, strict security).
4. Configuration changes between your staging and production Clerk apps are NOT synced. You must manually replicate any config changes (custom roles, permissions, webhook endpoints, etc.).

For preview environments (Railway PR previews), two options:
- **Share production credentials** if the preview domain is a subdomain of the production domain (same-site cookies work).
- **Use development API keys** for preview domains that are not subdomains of the production domain (e.g., Railway's `*.up.railway.app`).

### Recommendation for Forge

| Environment | Clerk App | Key Type | Notes |
|-------------|-----------|----------|-------|
| **Local dev** | "Forge Dev" (development instance) | `pk_test_` / `sk_test_` | OR continue using `DEV_BYPASS_AUTH=true` for offline work |
| **Railway staging** | "Forge Staging" (separate app, production keys) | `pk_live_` / `sk_live_` | Separate app from production. Manual config sync required. |
| **Railway production** | "Forge" (production instance) | `pk_live_` / `sk_live_` | Real users, real domain. |
| **Railway PR previews** | "Forge Dev" (development instance) | `pk_test_` / `sk_test_` | Railway preview domains are not subdomains of production, so dev keys are the right choice. |

---

## 2. Testing Tokens

**Source:** [Clerk Testing Overview](https://clerk.com/docs/guides/development/testing/overview), [Production Testing Tokens Changelog](https://clerk.com/changelog/2025-08-19-production-testing-tokens)

### What They Are

Testing Tokens are short-lived tokens that bypass Clerk's bot detection mechanisms. Without them, automated browser tests (Playwright, Cypress) will hit "Bot traffic detected" errors because Clerk's security layer sees the test runner as a bot.

### How They Work

1. Your test setup calls the Clerk Backend API: `POST /testing_tokens` (via `createTestingToken()` from `@clerk/backend`).
2. The API returns a short-lived token.
3. The token is included as a query parameter on Frontend API calls: `__clerk_testing_token=[token]`.
4. Clerk's bot protection skips verification for requests carrying a valid testing token.

### Key Characteristics

- **Short-lived.** They expire quickly. The `@clerk/testing` helpers handle lifecycle automatically.
- **Instance-scoped.** A token for your dev instance does not work on your production instance.
- **Required for automated E2E tests.** Without them, Playwright/Cypress tests will fail with bot detection errors.
- **Now work in production too.** As of August 2025, testing tokens work against production instances, not just development. However, code-based auth methods (OTP via email/SMS) are not supported in production testing -- only email/password and email sign-in work.

### What They Do NOT Do

Testing Tokens do NOT create fake users or sessions. They only bypass bot detection. You still need real Clerk users with real credentials to sign in during tests.

---

## 3. The `@clerk/testing` Package

**Source:** [Playwright Testing Docs](https://clerk.com/docs/guides/development/testing/playwright/overview), [Cypress Testing Docs](https://clerk.com/docs/guides/development/testing/cypress/overview), [Test Helpers Docs](https://clerk.com/docs/guides/development/testing/playwright/test-helpers)

### What It Provides

`@clerk/testing` is a dev dependency that provides framework-specific helpers for E2E testing. Current integrations: **Playwright** and **Cypress**.

```
npm i @clerk/testing --save-dev
```

### Playwright Helpers (`@clerk/testing/playwright`)

| Helper | Purpose |
|--------|---------|
| `clerkSetup()` | Call once in global setup. Fetches a Testing Token and makes it available to all tests. |
| `setupClerkTestingToken({ page })` | Call per-test if not using `clerkSetup()`. Injects testing token for that test. |
| `clerk.signIn({ page, signInParams })` | Signs in a user programmatically without interacting with Clerk UI. Supports `password`, `phone_code`, `email_code` strategies. |
| `clerk.signOut({ page })` | Signs out the current user. |
| `clerk.loaded({ page })` | Asserts that Clerk JS has loaded on the page. |

### Required Environment Variables

```
CLERK_PUBLISHABLE_KEY=pk_test_...   # Your dev instance publishable key
CLERK_SECRET_KEY=sk_test_...         # Your dev instance secret key (for Testing Token generation)
```

### Example: Global Setup with Persistent Auth State

```typescript
// playwright/global.setup.ts
import { clerkSetup } from '@clerk/testing/playwright';
import { test as setup } from '@playwright/test';

setup.describe.configure({ mode: 'serial' });

setup('global setup', async ({}) => {
  await clerkSetup();
});

// Save auth state for reuse across tests
const authFile = 'playwright/.clerk/user.json';
setup('authenticate', async ({ page }) => {
  await page.goto('/');
  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: process.env.E2E_CLERK_USER_USERNAME!,
      password: process.env.E2E_CLERK_USER_PASSWORD!,
    },
  });
  await page.context().storageState({ path: authFile });
});
```

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'global setup', testMatch: /global\.setup\.ts/ },
    {
      name: 'authenticated tests',
      testDir: './tests',
      storageState: 'playwright/.clerk/user.json',
      dependencies: ['global setup'],
    },
  ],
});
```

### Cypress Helpers (`@clerk/testing/cypress`)

Same pattern -- `clerkSetup()` in `cypress.config.ts`, `setupClerkTestingToken()` in test files. Commands for sign-in/sign-out are registered as Cypress custom commands.

### What `@clerk/testing` Does NOT Provide

- No helpers for unit tests (Vitest, Jest). Unit test mocking is your responsibility.
- No helpers for backend/API testing (supertest, etc.).
- No mock Clerk provider for React Testing Library.
- No support for multi-factor authentication flows in test helpers.

---

## 4. Environment Variable Patterns

### Client-Side (Vite)

| Variable | Local Dev (bypass) | Local Dev (Clerk enabled) | Staging | Production |
|----------|-------------------|--------------------------|---------|------------|
| `VITE_DEV_BYPASS_AUTH` | `true` | unset | unset | unset |
| `VITE_CLERK_PUBLISHABLE_KEY` | unset | `pk_test_...` | `pk_live_...` (staging app) | `pk_live_...` (prod app) |

### Server-Side

| Variable | Local Dev (bypass) | Local Dev (Clerk enabled) | Staging | Production |
|----------|-------------------|--------------------------|---------|------------|
| `DEV_BYPASS_AUTH` | `true` | unset | **MUST be unset** | **MUST be unset** |
| `CLERK_SECRET_KEY` | unset | `sk_test_...` | `sk_live_...` (staging app) | `sk_live_...` (prod app) |
| `CLERK_PUBLISHABLE_KEY` | unset | `pk_test_...` | `pk_live_...` (staging app) | `pk_live_...` (prod app) |
| `CLERK_WEBHOOK_SECRET` | unset | `whsec_...` (dev webhook) | `whsec_...` (staging webhook) | `whsec_...` (prod webhook) |

### E2E Test Runner

| Variable | Value |
|----------|-------|
| `CLERK_PUBLISHABLE_KEY` | `pk_test_...` (dev instance) |
| `CLERK_SECRET_KEY` | `sk_test_...` (dev instance) |
| `E2E_CLERK_USER_USERNAME` | Test user email (pre-created in Clerk dev instance) |
| `E2E_CLERK_USER_PASSWORD` | Test user password |

### Critical Rule

`DEV_BYPASS_AUTH` must NEVER be set to `true` in staging or production. If it leaks into a deployed environment, every request is authenticated as `dev_user` with `org:admin` role -- a total security bypass. Consider adding a startup guard:

```typescript
if (process.env.DEV_BYPASS_AUTH === 'true' && process.env.NODE_ENV === 'production') {
  console.error('FATAL: DEV_BYPASS_AUTH=true in production. Refusing to start.');
  process.exit(1);
}
```

---

## 5. Unit/Integration Test Mocking Patterns

**Source:** [Clerk Blog: Testing Clerk Next.js Apps](https://clerk.com/blog/testing-clerk-nextjs), community patterns

Clerk does not provide a mock provider or test utilities for unit tests. Their official recommendation: mock the module yourself.

### Pattern A: Mock `@clerk/clerk-react` with Vitest

```typescript
// test/setup.ts or at the top of a test file
import { vi } from 'vitest';

vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: vi.fn(() => ({
    isSignedIn: true,
    userId: 'user_test_123',
    orgId: 'org_test_456',
    orgRole: 'org:admin',
    getToken: vi.fn().mockResolvedValue('mock-session-token'),
  })),
  useUser: vi.fn(() => ({
    isSignedIn: true,
    user: {
      id: 'user_test_123',
      firstName: 'Test',
      lastName: 'User',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      imageUrl: 'https://example.com/avatar.png',
    },
  })),
  useOrganization: vi.fn(() => ({
    organization: {
      id: 'org_test_456',
      name: 'Test Org',
    },
    membership: { role: 'org:admin' },
  })),
  OrganizationSwitcher: () => <div data-testid="org-switcher">Org Switcher</div>,
  UserButton: () => <div data-testid="user-button">User</div>,
  SignedIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignedOut: ({ children }: { children: React.ReactNode }) => null,
  RedirectToSignIn: () => null,
}));
```

### Pattern B: Configurable Test Wrapper

```typescript
import { useAuth } from '@clerk/clerk-react';

function renderWithAuth(
  ui: React.ReactElement,
  opts: { isSignedIn?: boolean; orgRole?: string } = {}
) {
  const { isSignedIn = true, orgRole = 'org:admin' } = opts;

  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    isSignedIn,
    userId: isSignedIn ? 'user_test_123' : null,
    orgId: isSignedIn ? 'org_test_456' : null,
    orgRole: isSignedIn ? orgRole : null,
    getToken: vi.fn().mockResolvedValue(isSignedIn ? 'mock-token' : null),
  });

  return render(ui);
}
```

### Pattern C: Mock `@clerk/express` for Backend Tests

For Express API integration tests with supertest:

```typescript
// Mock Clerk Express middleware before importing your app
vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (req: any, _res: any, next: any) => next(),
  getAuth: (req: any) => ({
    userId: 'clerk_user_test',
    orgId: 'clerk_org_test',
    orgRole: 'org:admin',
    sessionId: 'sess_test',
  }),
  requireAuth: () => (req: any, _res: any, next: any) => next(),
}));
```

However, in Forge's case, the `DEV_BYPASS_AUTH` pattern already handles this. The auth middleware creates real database records (`dev_org` / `dev_user`) and attaches real UUIDs to the request. For backend integration tests, running with `DEV_BYPASS_AUTH=true` against a test database is simpler and tests more of the real code path than mocking `@clerk/express`.

---

## 6. Testing Clerk APIs with Postman/Insomnia

**Source:** [Clerk Postman/Insomnia Docs](https://clerk.com/docs/testing/postman-or-insomnia)

For manual API testing outside the browser:

1. Create a **JWT template** in the Clerk Dashboard (Settings > JWT Templates).
2. Name it `testing-template`.
3. Set a long token lifetime (up to ~10 years for convenience).
4. Add any custom claims your API middleware expects.
5. Sign into your app in the browser, open DevTools console, and run:
   ```js
   await window.Clerk.session.getToken({ template: 'testing-template' })
   ```
6. Use the returned token as a Bearer token in Postman/Insomnia.

Standard session tokens expire after 60 seconds, which makes them impractical for manual API testing. The JWT template approach gives you long-lived tokens.

---

## 7. Comparison: Bypass vs Real Clerk in Local Dev

| Criterion | `DEV_BYPASS_AUTH=true` (current) | Real Clerk Dev Instance |
|-----------|----------------------------------|------------------------|
| **Offline development** | Works fully offline | Requires internet (calls to `accounts.dev`) |
| **Setup complexity** | Zero -- just set env var | Need Clerk account, dev instance, test users |
| **Auth flow testing** | Cannot test signup/login/org switching | Full auth flow works |
| **Webhook testing** | Cannot test Clerk webhooks | Can test with Clerk's webhook delivery to localhost (via ngrok or Clerk's built-in webhook testing) |
| **Org/role testing** | Hardcoded to `org:admin` on one org | Multiple orgs, roles, users possible |
| **Session expiry testing** | No sessions -- always authenticated | Real sessions with expiry, refresh |
| **Speed** | Fastest -- no network calls | Slightly slower (FAPI calls on page load) |
| **CI compatibility** | Works anywhere, no secrets needed | Needs `sk_test_` in CI environment |
| **Multi-user testing** | Impossible (single hardcoded user) | Multiple test users possible |

---

## 8. Recommendations

### 8.1 Keep `DEV_BYPASS_AUTH` for Daily Development

The bypass pattern is good for daily feature development where auth is not the thing being built. It works offline, is fast, and requires zero configuration. Do not remove it.

### 8.2 Support Clerk Dev Instance as an Optional Local Mode

Add the ability to run locally with a real Clerk dev instance by setting `VITE_DEV_BYPASS_AUTH` to anything other than `true` (or unsetting it) and providing `VITE_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`. The current code already handles this -- the conditional in `App.tsx` and `auth.ts` is in place. Just document the steps for developers who want to test auth flows locally.

### 8.3 Add a Production Safety Guard

Add the startup guard from Section 4 above. The cost of `DEV_BYPASS_AUTH` accidentally being `true` in production is total security bypass. A one-line check prevents this.

### 8.4 Use `@clerk/testing` for E2E Tests

When E2E tests are written (Playwright is the recommended choice given the team's existing Puppeteer MCP familiarity), use `@clerk/testing/playwright` with the global setup pattern. Pre-create 2-3 test users in the Clerk dev instance with known passwords:

- `e2e-admin@forge-test.local` (org:admin role)
- `e2e-editor@forge-test.local` (org:member/editor role)
- `e2e-viewer@forge-test.local` (org:viewer role)

This enables testing permission enforcement in E2E tests.

### 8.5 Mock Clerk Hooks in Component Unit Tests

Use the Vitest `vi.mock('@clerk/clerk-react')` pattern from Section 5 above. Create a shared test utility file (`client/src/test/clerk-mocks.ts`) with the mock setup and a `renderWithAuth` helper. This keeps mocking consistent across all component tests.

### 8.6 Keep `DEV_BYPASS_AUTH` for Backend Integration Tests

For backend API tests with supertest, running against a test database with `DEV_BYPASS_AUTH=true` is simpler and tests more real code than mocking `@clerk/express`. The auth middleware creates real DB records and uses real UUIDs. The only thing being skipped is JWT verification -- which is Clerk's responsibility to test, not ours.

### 8.7 Create Separate Clerk Apps per Environment

When staging deploys:

| Clerk Application | Purpose | API Key Prefix |
|-------------------|---------|----------------|
| "Forge Dev" | Local dev + PR previews + E2E tests | `pk_test_` / `sk_test_` |
| "Forge Staging" | Staging Railway deployment | `pk_live_` / `sk_live_` |
| "Forge" | Production | `pk_live_` / `sk_live_` |

This means three Clerk applications in the Clerk dashboard. The staging and production apps need their own domains, OAuth credentials, and webhook configurations. Config changes must be manually replicated between them.

---

## 9. Gotchas and Known Issues

1. **Session token expiry (60 seconds).** Standard Clerk session tokens expire in 60 seconds. For API testing outside the browser (Postman, curl, supertest with real Clerk), use JWT templates with longer lifetimes. For browser-based E2E tests, `@clerk/testing` handles token refresh automatically.

2. **Clerk dev instance uses query parameters for sessions, not cookies.** This means `document.cookie` will NOT contain the session token in development. Code that checks cookies for auth will fail in dev mode. Clerk's SDKs abstract this, but if you bypass them (e.g., custom middleware), watch for this.

3. **Bot detection in CI.** Without testing tokens, Playwright/Cypress tests WILL fail in CI with "Bot traffic detected." The `@clerk/testing` package exists specifically to solve this. Do not try to work around it by other means.

4. **Clerk dev instance has a 500-user cap.** E2E test suites that create new users on every run will hit this cap. Use pre-created test users with known credentials instead of creating fresh users per test run.

5. **No staging instance type.** Clerk only supports dev and production. A staging "environment" is actually a separate Clerk application with its own config. Changes to one app do not propagate to others. This is a maintenance burden, but there is no workaround.

6. **Webhook secrets are per-endpoint.** Each Clerk application with webhooks configured gets its own `whsec_*` secret. The staging webhook secret is different from the production webhook secret. If you use a single webhook endpoint for both, you need to verify with the correct secret per environment.

7. **Production testing tokens do not support OTP.** If you use email code or SMS code sign-in, E2E tests against production will not work with the `clerk.signIn()` helper. Only `password` and `email_address` (direct sign-in) strategies work in production testing mode.

8. **`require()` in App.tsx.** The current `App.tsx` uses `require('@clerk/clerk-react')` inside a render function for conditional import. This works but is fragile -- it depends on the bundler not tree-shaking the dynamic require. A cleaner pattern is lazy loading with `React.lazy()` or a dedicated `ClerkAuthenticatedApp` component that is only imported when Clerk is enabled (via dynamic `import()`).

---

## 10. Priority Actions

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| **P0** | Add production safety guard for `DEV_BYPASS_AUTH` | 5 min | Prevents catastrophic security bypass |
| **P1** | Document the two local dev modes (bypass vs Clerk dev instance) in project README | 30 min | Developer experience |
| **P1** | Create Clerk dev instance "Forge Dev" and pre-create test users | 15 min | Enables auth flow testing and future E2E tests |
| **P2** | Create `client/src/test/clerk-mocks.ts` shared test utility | 30 min | Consistent unit test mocking |
| **P2** | Set up `@clerk/testing/playwright` with global setup when E2E tests are introduced | 1 hr | E2E auth testing |
| **P3** | Create separate "Forge Staging" Clerk app when staging deploys | 30 min | Production-like staging auth |
| **P3** | Fix `require()` pattern in `App.tsx` to use dynamic `import()` | 30 min | Cleaner code, better tree-shaking |

---

*Research brief written by Marco (Technical Researcher). Downstream agents: Andrei, use this to decide on the auth testing strategy. Jonah, the production safety guard is a critical backend change. Alice, the component mocking patterns are for your unit test setup. Enzo, the E2E testing section feeds your test plan.*
