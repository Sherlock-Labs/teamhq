# SiteSnap Backend -- Code Review

**Reviewer:** Atlas (Principal Code Reviewer)
**Date:** 2026-02-16
**Scope:** `sitesnap-server/src/` -- Express API backend
**Built by:** Jonah (Backend Developer)
**Spec:** `docs/sitesnap-tech-approach.md` (Andrei), `docs/sitesnap-payments-spec.md` (Howard)

---

## Executive Summary

Jonah has delivered a solid, well-structured backend. The route-service-DB separation is clean, Zod validation is consistently applied, cursor-based pagination is implemented correctly, and the fire-and-forget background processing pattern for photo classification is faithful to Andrei's architecture. The Clerk webhook uses proper Svix signature verification, the R2 presigned URL lifecycle matches the spec, and the Gemini classification has a sensible timeout and fallback.

There are several findings that need attention before production, organized by severity below.

---

## Critical / Blocker

### C-1. SQL Injection via Unsanitized Search Query

**Category:** Security
**File:** `/Users/jeffsherlock/Projects/teamhq/sitesnap-server/src/routes/search.ts`, line 88
**What:** The job name search query parameter `q` is interpolated directly into an `ilike` pattern without escaping SQL wildcard characters (`%`, `_`). More importantly, the string is passed as a template literal into `ilike()` which Drizzle parameterizes -- so this is NOT a classic SQL injection. However, a user can craft `q` values like `%` or `_%` to match all jobs or exploit wildcard patterns to enumerate data they own (low impact since results are scoped by userId). The real concern is that Drizzle's `ilike()` with user-supplied `%` wildcards could cause expensive sequential scans on large datasets.

**Recommendation:** Escape `%` and `_` characters in the search input before wrapping in wildcards:

```typescript
function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}
// Then:
ilike(jobs.name, `%${escapeIlike(q.trim())}%`)
```

**Severity rationale:** Marking this Critical because even though Drizzle parameterizes the value, unescaped wildcards in a LIKE query against a growing dataset can be weaponized for denial-of-service by sending `q=%` to force full table scans repeatedly.

---

### C-2. Payments Architecture Mismatch -- Stripe Implemented, Howard Specified Apple IAP

**Category:** Architecture
**Files:**
- `/Users/jeffsherlock/Projects/teamhq/sitesnap-server/src/webhooks/stripe.ts` (entire file)
- `/Users/jeffsherlock/Projects/teamhq/sitesnap-server/src/routes/billing.ts` (entire file)
- `/Users/jeffsherlock/Projects/teamhq/sitesnap-server/src/db/schema/subscriptions.ts` (schema)

**What:** Howard's payments spec explicitly states that SiteSnap uses **Apple In-App Purchase** as the sole payment path for v1. The spec says:

> "Stripe's role is reduced to optional analytics. We do NOT create Stripe Checkout Sessions or handle Stripe webhooks for subscription lifecycle."

However, Jonah's implementation includes:
1. A full Stripe Checkout flow in `billing.ts` (lines 82-134)
2. A complete Stripe webhook handler in `webhooks/stripe.ts` with `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. The subscription schema uses `stripeSubscriptionId` instead of Howard's `originalTransactionId`, `productId`, and `environment` fields
4. The users table includes `stripeCustomerId` (correct for Stripe, not needed for Apple IAP)
5. The Apple IAP path in `billing.ts` is a placeholder returning 501

Howard's spec also calls for:
- `POST /api/billing/verify-receipt` endpoint (not implemented -- a placeholder exists at `/api/billing/checkout` with `appleReceipt` field)
- `POST /api/webhooks/apple` handler (not implemented)
- `middleware/subscription.ts` with `resolveSubscription` and `enforceJobLimit` (not implemented -- free tier logic is inline in jobs.ts, which works but differs from spec)
- Subscription status states: `active`, `will_cancel`, `billing_retry_period`, `grace_period_expired`, `expired`, `refunded`, `revoked` (current schema only supports `active`, `canceled`, `past_due`)

**Recommendation:** This needs a decision from Thomas (PM). Either:
1. **Follow Howard's spec** -- rip out Stripe Checkout/webhooks, implement Apple IAP with `@apple/app-store-server-library`, update the subscription schema, and add the Apple webhook handler. This is the correct path if the CEO decision stands.
2. **Keep Stripe for now** -- if there is a later decision to ship with Stripe first (e.g., for Android/web beta before iOS), then Howard's spec needs updating to reflect that.

The current state is ambiguous -- a half-implemented Stripe path and a stub Apple IAP path. This cannot ship as-is. **Thomas needs to confirm which payment path is in scope for v1 launch.**

**Note for Milo (DevOps):** The env vars in `index.ts` list Stripe keys as optional but do not list any Apple IAP keys. If Apple IAP is the path, Milo needs to set up `APPLE_KEY_ID`, `APPLE_ISSUER_ID`, `APPLE_BUNDLE_ID`, `APPLE_PRIVATE_KEY`, and `APPLE_ENVIRONMENT` in Railway.

---

### C-3. Comparison Image Route Proxies Full Image Data Through Express

**Category:** Performance / Architecture
**File:** `/Users/jeffsherlock/Projects/teamhq/sitesnap-server/src/routes/compare.ts`, lines 113-144

**What:** The comparison endpoint downloads two original photos from R2 into memory, runs Sharp compositing, then sends the resulting buffer back through Express as `res.send(comparisonBuffer)`. This means the Express server is proxying ~1-3MB of image data per request.

Andrei's tech approach (Section 1) states:
> "The Express server never proxies photo data -- it only generates presigned URLs and processes metadata."

For the comparison use case, some proxying is inherent because Sharp must run server-side. However, the current implementation also proxies the *cached* comparison image (line 113-117) -- it downloads the cached image from R2 and sends it through Express. The cached result should instead return a presigned download URL, letting the client fetch directly from R2.

**Recommendation:** Change the response format. Instead of sending the JPEG buffer:

```typescript
// Instead of downloading and proxying the cached image:
const downloadUrl = await generateDownloadUrl(comparisonR2Key);
res.json({ comparisonUrl: downloadUrl, comparisonId });
```

For the initial generation (cache miss), generate the image, upload to R2, then return the presigned URL. This keeps Express off the data path for subsequent requests and is consistent with the presigned URL pattern used everywhere else.

**Severity rationale:** Critical because at scale, comparison requests will bottleneck the Express server on bandwidth. Railway has limited egress bandwidth per service, and proxying images through it is the exact anti-pattern Andrei's architecture was designed to avoid.

---

## Major (Improvement)

### M-1. Background Processing Has No Concurrency Control

**Category:** Reliability / Performance
**File:** `/Users/jeffsherlock/Projects/teamhq/sitesnap-server/src/routes/photos.ts`, lines 278-286

**What:** The `processPhotoInBackground` function is called with `.catch()` (fire-and-forget) on every photo upload confirmation. If a user uploads 20 photos rapidly, this spawns 20 concurrent background tasks, each downloading an image from R2, running Sharp, and calling Gemini. This could:
1. Exhaust memory on the Railway container (20 x ~2MB buffers = 40MB+ in flight)
2. Hit Gemini rate limits
3. Cause OOM kills under sustained load

**Recommendation:** Add a simple in-process queue with concurrency control. A lightweight approach:

```typescript
// Use a semaphore or a package like `p-limit` to cap concurrent background tasks
import pLimit from "p-limit";
const backgroundLimit = pLimit(3); // Max 3 concurrent photo processing tasks

// In the route handler:
backgroundLimit(() =>
  processPhotoInBackground(newPhoto.id, parsed.data.r2Key, jobId, dbUser.clerkId)
).catch((err) => console.error(`Background processing failed:`, err));
```

This is a simple, single-dependency fix that prevents unbounded concurrency. `p-limit` is a tiny, well-maintained package.

---

### M-2. photoCount Can Drift Due to Non-Atomic Increment

**Category:** Reliability
**File:** `/Users/jeffsherlock/Projects/teamhq/sitesnap-server/src/routes/photos.ts`, lines 340-348 and 363-369

**What:** The `photoCount` on the job is incremented via `sql\`${jobs.photoCount} + 1\`` in the background processing function. This increment happens in the background after the API response returns. If background processing fails partway (e.g., thumbnail succeeds but Gemini times out), the fallback error handler also increments `photoCount`. This means the count is incremented exactly once per photo -- which is correct.

However, there is a subtler issue: if the database update at line 340-348 succeeds but the process crashes before completion, and then the photo is re-processed or the count is manually checked, there is no reconciliation mechanism. Over time, `photoCount` could drift from the actual number of photos in the `photos` table.

**Recommendation:** Add a periodic reconciliation query or compute `photoCount` on read rather than maintaining it as a denormalized counter. For v1, a simpler fix is to add a reconciliation function that can be called manually or on a schedule:

```typescript
// Reconcile photo count for a job
await db.update(jobs).set({
  photoCount: db.select({ count: count() }).from(photos).where(eq(photos.jobId, jobId)),
}).where(eq(jobs.id, jobId));
```

Alternatively, accept the current approach for v1 but document it as a known limitation.

---

### M-3. Cursor Pagination Is Not Stable When Sort Key Has Ties

**Category:** Reliability
**File:** `/Users/jeffsherlock/Projects/teamhq/sitesnap-server/src/routes/photos.ts`, lines 94-103

**What:** The photo list endpoint uses `takenAt` as the cursor sort key. If multiple photos have the same `takenAt` timestamp (e.g., burst mode photos taken in the same second), the cursor-based pagination will skip or duplicate photos because `lt(photos.takenAt, cursorPhoto.takenAt)` would skip all photos with that same timestamp.

The same issue exists in the search route (`/Users/jeffsherlock/Projects/teamhq/sitesnap-server/src/routes/search.ts`, lines 65-74).

**Recommendation:** Use a composite cursor that includes both `takenAt` and `id` for a stable sort order:

```typescript
if (cursorPhoto) {
  conditions.push(
    sql`(${photos.takenAt}, ${photos.id}) < (${cursorPhoto.takenAt}, ${cursorPhoto.id})`
  );
}
```

And add `desc(photos.id)` as a secondary sort:

```typescript
.orderBy(desc(photos.takenAt), desc(photos.id))
```

---

### M-4. Job Deletion Deletes DB Record Before R2 Cleanup Can Reference It

**Category:** Reliability
**File:** `/Users/jeffsherlock/Projects/teamhq/sitesnap-server/src/routes/jobs.ts`, lines 300-306

**What:** The job deletion flow:
1. Deletes the job from DB (line 300) -- this cascade-deletes all photo records
2. Fire-and-forget: cleans up R2 objects (lines 303-306)

The R2 cleanup uses `buildJobPrefix(dbUser.clerkId, jobId)` which only needs the clerkId and jobId (not DB records), so this actually works. However, if R2 cleanup fails silently (the error is caught and logged but not retried), orphaned objects remain in R2 indefinitely with no way to find them since the DB records are already gone.

**Recommendation:** For v1, this is acceptable since R2 storage is cheap ($0.015/GB/month). But add a comment documenting this as a known trade-off and consider a future cleanup job that lists all R2 objects and reconciles against the DB. The fire-and-forget pattern is the right call for user-facing latency.

---

### M-5. Billing Status Endpoint Does Not Check Subscription Expiry

**Category:** Reliability
**File:** `/Users/jeffsherlock/Projects/teamhq/sitesnap-server/src/routes/billing.ts`, lines 143-170

**What:** The `GET /api/billing/status` endpoint returns the user's `plan` field directly from the database without checking whether the subscription's `currentPeriodEnd` has passed. If a Stripe webhook is delayed or missed, a user could retain "pro" status indefinitely.

Howard's spec (Section 6) includes explicit logic to check `currentPeriodEnd` against the current time and downgrade if expired:

```typescript
if (sub.currentPeriodEnd < now && !["expired", "refunded", "revoked"].includes(sub.status)) {
  effectivePlan = "free";
  effectiveStatus = "expired";
  // Update DB to reflect...
}
```

**Recommendation:** Add the expiry check from Howard's spec to the billing status endpoint. This is a safety net against missed webhooks and is critical for free tier enforcement integrity.

---

### M-6. `r2Key` in Photo Upload Confirmation Is Not Validated Against Expected Path

**Category:** Security
**File:** `/Users/jeffsherlock/Projects/teamhq/sitesnap-server/src/routes/photos.ts`, lines 252-265

**What:** The `confirmUploadSchema` accepts any `r2Key` string (line 43: `z.string().min(1)`). A malicious client could send an `r2Key` that does not match the expected pattern (`{clerkUserId}/jobs/{jobId}/{photoId}.jpg`), potentially referencing another user's photo or an arbitrary R2 path.

The presigned upload URL endpoint (line 200) correctly builds the R2 key server-side using `buildPhotoKey()`. But the confirmation endpoint trusts the client's `r2Key` value and stores it in the database without verifying it matches what was generated.

**Recommendation:** Validate that the submitted `r2Key` matches the expected pattern:

```typescript
const expectedR2Key = buildPhotoKey(dbUser.clerkId, jobId, parsed.data.photoId);
if (parsed.data.r2Key !== expectedR2Key) {
  res.status(400).json({ error: "Invalid r2Key" });
  return;
}
```

This is a belt-and-suspenders check. The presigned URL already scopes the upload, so even with a wrong r2Key in the DB, the actual R2 object is at the correct path. But storing an arbitrary r2Key would cause the thumbnail generator and URL generator to reference the wrong object.

---

## Minor

### m-1. `deleteObjectsByPrefix` Deletes Objects One at a Time

**Category:** Performance
**File:** `/Users/jeffsherlock/Projects/teamhq/sitesnap-server/src/services/r2.ts`, lines 112-117

**What:** The `deleteObjectsByPrefix` function iterates over listed objects and calls `deleteObject` sequentially in a for-loop. For a job with 100+ photos, this means 200+ individual DELETE API calls (original + thumbnail for each photo).

**Recommendation:** Use the S3 `DeleteObjectsCommand` (batch delete) which can delete up to 1,000 objects per request. R2 supports this. This would reduce 200 API calls to a single batch call:

```typescript
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";

const deleteCommand = new DeleteObjectsCommand({
  Bucket: R2_BUCKET_NAME,
  Delete: { Objects: objects.map((o) => ({ Key: o.Key! })) },
});
await s3.send(deleteCommand);
```

---

### m-2. In-Memory Rate Limiter Resets on Deploy

**Category:** Reliability
**File:** `/Users/jeffsherlock/Projects/teamhq/sitesnap-server/src/middleware/rate-limit.ts`

**What:** `express-rate-limit` defaults to an in-memory store. On Railway, every deploy creates a new container, resetting all rate limit counters. A determined user could bypass daily photo limits by timing uploads around deployments.

**Recommendation:** Acceptable for v1. Document this as a known limitation. When deploying to production with frequent deploys, consider switching to the `rate-limit-redis` store (Railway provides Redis). The comment at the top of the file already acknowledges this.

---

### m-3. Environment Variable Validation Runs After Server Starts Listening

**Category:** Reliability
**File:** `/Users/jeffsherlock/Projects/teamhq/sitesnap-server/src/index.ts`, lines 100-136

**What:** The `required` env var validation (which calls `process.exit(1)` on missing vars) runs inside the `app.listen()` callback. This means the server is already accepting connections before the validation runs. In the brief window between `listen()` and the validation check, requests could hit endpoints that depend on missing env vars.

**Recommendation:** Move env var validation before `app.listen()`:

```typescript
// Validate BEFORE starting the server
const required = ["DATABASE_URL", "CLERK_SECRET_KEY"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`FATAL: Required env var ${key} is not set.`);
    process.exit(1);
  }
}

app.listen(PORT, () => {
  console.log(`SiteSnap API server running on port ${PORT}`);
  // ... optional env var warnings
});
```

---

### m-4. Comparison Cache Is Not Invalidated When Source Photos Are Deleted

**Category:** Reliability
**File:** `/Users/jeffsherlock/Projects/teamhq/sitesnap-server/src/routes/compare.ts`

**What:** Andrei's spec (Section 5) states: "Cache is invalidated if either source photo is deleted." The photo deletion handler in `photos.ts` deletes the original and thumbnail from R2 but does not delete any cached comparison images that reference the deleted photo.

**Recommendation:** For v1, this is low risk because:
1. Comparison images are keyed by `hash(beforePhotoId + afterPhotoId)`, so they can only be accessed by a user who knows both photo IDs.
2. If a source photo is deleted, the comparison endpoint would fail on cache miss anyway (source download would fail).

However, orphaned comparison images remain in R2. Accept this for v1 and add to tech debt backlog.

---

### m-5. The `pending` Type Is Missing from the `updatePhotoSchema` Valid Types

**Category:** Code Quality
**File:** `/Users/jeffsherlock/Projects/teamhq/sitesnap-server/src/routes/photos.ts`, lines 33-35

**What:** The `VALID_PHOTO_TYPES` array used for manual type override does not include `"pending"`, which is correct -- users should not be able to set a photo back to "pending". This is good design. Just noting it is intentional.

No action required.

---

## Notes (Suggestions)

### N-1. Good: Graceful Gemini Fallback

The Gemini service in `/Users/jeffsherlock/Projects/teamhq/sitesnap-server/src/services/gemini.ts` handles failures well:
- 10-second timeout via `Promise.race`
- Falls back to `unclassified` on any error (timeout, rate limit, API error)
- Confidence clamping to [0, 1]
- Clear error type categorization for logging
- The photo is never lost due to classification failure

This is exactly what Andrei specified. Well done.

### N-2. Good: Consistent Ownership Checks

Every endpoint that operates on a user's data includes a `WHERE user_id = dbUser.id` (or equivalent `clerkId` check). This is thorough and prevents cross-user data access. The pattern is consistent across jobs, photos, search, compare, and billing.

### N-3. Good: Webhook Idempotency

Both the Clerk and Stripe webhooks use the `processedEvents` table for deduplication. The Clerk handler also does a belt-and-suspenders check for existing users before insert. This prevents duplicate user creation on webhook replay.

### N-4. Good: Input Validation with Zod

All route handlers validate input with Zod schemas before processing. UUID validation on photo IDs, ISO datetime validation on `takenAt`, enum validation on photo types -- this is solid defensive programming.

### N-5. Good: XML Escaping in SVG Labels

The Sharp service escapes XML special characters in job names and business names before embedding them in SVG overlays (`/Users/jeffsherlock/Projects/teamhq/sitesnap-server/src/services/sharp.ts`, line 70-77). This prevents SVG injection through user-controlled text fields.

### N-6. Consider: `@apple/app-store-server-library` Dependency

If the payments path resolves to Apple IAP per Howard's spec, `@apple/app-store-server-library` needs to be added to `package.json` and the `stripe` package can be removed (or kept as optional for future use). Currently, `stripe` and `svix` are dependencies but `@apple/app-store-server-library` is not.

### N-7. Consider: Health Check Could Verify DB Connectivity

The health check at `GET /api/health` returns a static `{ status: "ok" }`. For production monitoring, consider adding a lightweight DB ping:

```typescript
app.get("/api/health", async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ status: "ok", db: "connected" });
  } catch {
    res.status(503).json({ status: "degraded", db: "disconnected" });
  }
});
```

This helps Railway's health checks detect a database outage.

---

## Summary

| Severity | Count | Key Issues |
|----------|-------|------------|
| **Critical** | 3 | SQL wildcard injection in search, payments architecture mismatch, comparison image proxying through Express |
| **Major** | 6 | No background task concurrency control, photoCount drift, unstable cursor pagination, premature DB deletion before R2 cleanup, missing subscription expiry check, r2Key not validated against expected pattern |
| **Minor** | 5 | Sequential R2 deletes, in-memory rate limiter, env var validation timing, comparison cache not invalidated, (1 noted as intentional) |
| **Note** | 7 | Positive observations and suggestions |

**Blocking items:** C-1 (search wildcard escaping), C-2 (payments path decision from Thomas), and C-3 (comparison image proxying) must be resolved before shipping.

**Recommended priority for fixes:**
1. Get Thomas's decision on Stripe vs. Apple IAP (C-2) -- this determines scope of remaining work
2. Fix search wildcard escaping (C-1) -- quick fix
3. Refactor comparison endpoint to return presigned URL instead of proxying (C-3)
4. Validate r2Key against expected pattern (M-6) -- quick fix
5. Add subscription expiry check to billing status (M-5) -- quick fix
6. Add background task concurrency control (M-1)
7. Fix cursor pagination stability (M-3)
8. Move env var validation before listen (m-3)

---

*Code review conducted by Atlas (Principal Code Reviewer) for Sherlock Labs. February 2026.*
