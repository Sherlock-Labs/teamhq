# SiteSnap -- Payments Specification

**Author:** Howard (Payments Engineer)
**Date:** 2026-02-16
**Status:** Final
**Repo:** `Sherlock-Labs/sitesnap` (to be created)

---

## 1. Payment Architecture Overview

SiteSnap uses **Apple In-App Purchase (IAP)** for payment collection and **Stripe** as the backend subscription state manager. This is a different architecture from VoiceNote Pro, which uses Stripe Checkout via an external purchase link. The CEO has decided to go through the App Store for SiteSnap -- Apple handles the actual money movement, and our backend tracks subscription status.

### Why Apple IAP (CEO Decision)

- Users subscribe through the iOS App Store payment sheet (familiar, trusted)
- Apple handles card collection, tax calculation, fraud prevention, refunds
- Apple takes 30% ($1.50 of $4.99) -- or 15% ($0.75) if Sherlock Labs qualifies for the Small Business Program (< $1M annual revenue)
- Net revenue per subscriber: **$3.49/month** (30% cut) or **$4.24/month** (15% cut)

### How Apple IAP and Stripe Coexist

Apple and Stripe serve different roles:

| Concern | Who Handles It |
|---------|---------------|
| Payment collection (card charges) | Apple |
| Tax calculation | Apple |
| Fraud prevention | Apple |
| Refunds and disputes | Apple |
| Subscription renewal billing | Apple |
| Receipt validation | Our backend (via Apple App Store Server API v2) |
| Subscription status tracking | Our backend (Postgres) |
| Free tier enforcement | Our backend |
| Customer record for analytics | Stripe (optional, for revenue dashboards) |

**Stripe's role is reduced to optional analytics.** We do NOT create Stripe Checkout Sessions or handle Stripe webhooks for subscription lifecycle. The subscription state machine is driven entirely by Apple server-to-server (S2S) notifications and receipt validation.

If we later add a web-based subscription path (Android via Google Play, or a web dashboard), Stripe becomes the payment processor for those channels. For iOS v1, Apple IAP is the sole payment path.

### Architecture Diagram

```
                    ┌──────────────────────┐
                    │    iOS App (Expo)     │
                    │                       │
                    │  StoreKit / IAP       │
                    │  (purchase flow)      │
                    └───────────┬───────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
          (1) Purchase   (3) Receipt   (5) Check
          via App Store  to backend    sub status
                    │           │           │
                    ▼           ▼           ▼
            ┌──────────┐  ┌──────────────────────┐
            │  Apple    │  │   Express Backend     │
            │  App      │  │   (Railway)           │
            │  Store    │  │                       │
            │           │  │  ┌──────────────────┐ │
            │  ┌──────┐ │  │  │ Receipt          │ │
            │  │ S2S  │─┼──┼─→│ Validation       │ │
            │  │Notif.│ │  │  │ (App Store API)  │ │
            │  └──────┘ │  │  └──────────────────┘ │
            └──────────┘  │  ┌──────────────────┐ │
                          │  │ Subscription     │ │
                          │  │ State Machine    │ │
                          │  │ (Postgres)       │ │
                          │  └──────────────────┘ │
                          └──────────────────────┘
```

---

## 2. Apple App Store Product Configuration

### App Store Connect Setup

Create an auto-renewable subscription in App Store Connect:

| Field | Value |
|-------|-------|
| **Reference Name** | SiteSnap Pro Monthly |
| **Product ID** | `com.sherlocklabs.sitesnap.pro.monthly` |
| **Subscription Group** | SiteSnap Pro |
| **Price** | Tier 2 ($4.99 USD/month) |
| **Subscription Duration** | 1 Month |
| **Free Trial** | None for v1 (defer to v2) |
| **Grace Period** | Enabled (16 days for monthly subscriptions -- Apple default) |
| **Billing Retry** | Enabled (Apple retries billing for up to 60 days) |

### Subscription Group

All SiteSnap subscriptions belong to the "SiteSnap Pro" subscription group. For v1 there is only one product. When we add annual pricing in v2, it goes in the same group so Apple handles upgrade/downgrade proration automatically.

### Environment Variable

```
APPLE_IAP_PRODUCT_ID=com.sherlocklabs.sitesnap.pro.monthly
```

This is NOT a secret -- it is a public product identifier. The mobile app uses it to request product info from StoreKit.

---

## 3. Apple App Store Server API v2 Configuration

### Server-Side Authentication

Apple's App Store Server API v2 uses JWT (JSON Web Tokens) signed with an ECDSA P-256 key. The server needs these credentials to validate receipts and decode S2S notifications.

**Required App Store Connect configuration:**

1. **Generate an API Key** in App Store Connect > Users and Access > Keys > In-App Purchase
   - Download the `.p8` private key file (download once -- Apple does not store it)
   - Note the Key ID
2. **Note your Issuer ID** (App Store Connect > Users and Access > Keys)
3. **Note your App Bundle ID** (`com.sherlocklabs.sitesnap`)

### Environment Variables

```
# Apple App Store Server API
APPLE_KEY_ID=XXXXXXXXXX                    # Key ID from App Store Connect
APPLE_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  # Issuer ID
APPLE_BUNDLE_ID=com.sherlocklabs.sitesnap  # App bundle ID
APPLE_PRIVATE_KEY_PATH=./keys/apple-iap.p8 # Path to .p8 private key file
# OR inline (for Railway env vars where file paths are impractical):
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIGT...base64...\n-----END PRIVATE KEY-----

# Apple S2S Notification signing
# Apple signs notifications with their root CA certificate.
# The library (app-store-server-library) handles verification automatically.

# Environment flag
APPLE_ENVIRONMENT=Sandbox  # "Sandbox" for dev/test, "Production" for live
```

**Railway deployment:** Store `APPLE_PRIVATE_KEY` as an inline env var (with escaped newlines) rather than a file path. Mark it as **sealed** in Railway.

---

## 4. Receipt Validation Flow

### Overview

After a user completes a purchase in the App Store, the mobile app receives a receipt (a signed transaction). The app sends this receipt to our backend, which validates it with Apple and creates/updates the local subscription record.

### Flow Diagram

```
1. User taps "Subscribe" in the app
2. StoreKit presents the App Store payment sheet
3. User authenticates (Face ID / Touch ID / Apple ID password)
4. Apple charges the user's payment method
5. StoreKit returns a signed transaction (JWS format)
6. App sends the signed transaction to POST /api/billing/verify-receipt
7. Backend decodes and verifies the JWS using Apple's root CA
8. Backend extracts subscription data:
   - originalTransactionId (stable across renewals)
   - productId (must match our expected product)
   - expiresDate
   - environment (Sandbox vs. Production)
9. Backend creates/updates the subscription record in Postgres
10. Backend updates the user's plan to "pro"
11. Returns { plan: "pro", expiresAt: "2026-03-16T..." }
12. App updates local state, dismisses upgrade prompt
```

### POST /api/billing/verify-receipt

**Request:**

```typescript
POST /api/billing/verify-receipt
Authorization: Bearer <clerk_jwt>
Content-Type: application/json

{
  "signedTransaction": "eyJhbGciOiJFUzI1NiIs..."  // JWS from StoreKit 2
}
```

**Server logic:**

```typescript
// server/src/routes/billing.ts
import { Router } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import {
  SignedDataVerifier,
  Environment,
  AppTransaction,
} from "@apple/app-store-server-library";
import { db } from "../db/index.js";
import { users, subscriptions } from "../db/schema/index.js";
import { eq, and } from "drizzle-orm";

export const billingRouter = Router();

// Initialize Apple's signed data verifier
// The verifier downloads and caches Apple's root certificates automatically
const appleEnvironment =
  process.env.APPLE_ENVIRONMENT === "Production"
    ? Environment.PRODUCTION
    : Environment.SANDBOX;

const privateKey = process.env.APPLE_PRIVATE_KEY
  ?? fs.readFileSync(process.env.APPLE_PRIVATE_KEY_PATH!, "utf-8");

const verifier = new SignedDataVerifier(
  [], // Apple root CAs -- the library fetches them automatically in v2
  true, // enableOnlineChecks
  appleEnvironment,
  process.env.APPLE_BUNDLE_ID!,
  process.env.APPLE_KEY_ID!, // appAppleId -- not needed for JWS verification
);

billingRouter.post(
  "/verify-receipt",
  requireAuth(),
  async (req, res) => {
    const auth = getAuth(req);
    const { signedTransaction } = req.body;

    if (!signedTransaction || typeof signedTransaction !== "string") {
      return res.status(400).json({ error: "signedTransaction is required" });
    }

    try {
      // 1. Verify and decode the JWS signed transaction
      const transaction = await verifier.verifyAndDecodeTransaction(
        signedTransaction
      );

      // 2. Validate the product ID matches our expected subscription
      if (transaction.productId !== process.env.APPLE_IAP_PRODUCT_ID) {
        console.error(
          `Unexpected product ID: ${transaction.productId}. Expected: ${process.env.APPLE_IAP_PRODUCT_ID}`
        );
        return res.status(400).json({ error: "Invalid product" });
      }

      // 3. Look up the authenticated user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, auth.userId!))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // 4. Extract subscription details
      const originalTransactionId = transaction.originalTransactionId!;
      const expiresDate = new Date(Number(transaction.expiresDate));
      const now = new Date();
      const isActive = expiresDate > now;

      // 5. Upsert subscription record
      const [existingSub] = await db
        .select()
        .from(subscriptions)
        .where(
          eq(subscriptions.originalTransactionId, originalTransactionId)
        )
        .limit(1);

      if (existingSub) {
        // Update existing subscription
        await db
          .update(subscriptions)
          .set({
            status: isActive ? "active" : "expired",
            currentPeriodEnd: expiresDate,
            productId: transaction.productId!,
            environment: transaction.environment!,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, existingSub.id));
      } else {
        // Create new subscription
        await db.insert(subscriptions).values({
          userId: user.id,
          originalTransactionId,
          productId: transaction.productId!,
          status: isActive ? "active" : "expired",
          currentPeriodEnd: expiresDate,
          environment: transaction.environment!,
        });
      }

      // 6. Update user plan
      if (isActive) {
        await db
          .update(users)
          .set({ plan: "pro", updatedAt: now })
          .where(eq(users.id, user.id));
      }

      // 7. Return subscription status
      return res.json({
        plan: isActive ? "pro" : "free",
        status: isActive ? "active" : "expired",
        expiresAt: expiresDate.toISOString(),
        originalTransactionId,
      });
    } catch (err) {
      console.error("Receipt verification failed:", err);

      // Distinguish between verification failures and server errors
      if (
        err instanceof Error &&
        err.message.includes("verification")
      ) {
        return res.status(400).json({
          error: "Receipt verification failed. The transaction could not be validated.",
        });
      }

      return res.status(500).json({
        error: "Failed to verify receipt. Please try again.",
      });
    }
  }
);
```

### Key Implementation Notes

1. **Use `@apple/app-store-server-library`** -- Apple's official Node.js library. It handles JWS verification, root CA certificate fetching, and transaction decoding. Do NOT manually verify JWS signatures.

2. **`originalTransactionId` is the stable key.** It remains the same across all renewals of the same subscription. Use it to identify a subscription across its entire lifecycle.

3. **Product ID validation** -- Always verify the `productId` in the decoded transaction matches our expected product. Prevents a receipt from a different app or product being used.

4. **Upsert pattern** -- The same `originalTransactionId` may be sent multiple times (user taps "Restore Purchases," or the app retries after a network failure). The upsert handles this idempotently.

---

## 5. Apple Server-to-Server Notifications (V2)

### Overview

Apple sends real-time notifications to our server when subscription events occur (renewal, cancellation, grace period, billing retry failure). These are the primary mechanism for keeping subscription status in sync -- receipt verification alone is insufficient because the user may not open the app for days after a renewal or cancellation.

### Webhook Endpoint

`POST /api/webhooks/apple` -- mounted BEFORE `express.json()` with `express.raw({ type: "application/json" })` for raw body access.

### App Store Connect Configuration

1. App Store Connect > App > App Information > App Store Server Notifications
2. **Production URL:** `https://{your-railway-domain}/api/webhooks/apple`
3. **Sandbox URL:** `https://{your-railway-domain}/api/webhooks/apple`
4. **Version:** V2 (required -- V1 is deprecated)

### Notification Types to Handle

| Notification Type | Subtype | What It Means | What We Do |
|-------------------|---------|---------------|------------|
| `SUBSCRIBED` | `INITIAL_BUY` | New subscription purchased | Create subscription, set plan to "pro" |
| `SUBSCRIBED` | `RESUBSCRIBE` | User re-subscribes after cancellation | Reactivate subscription, set plan to "pro" |
| `DID_RENEW` | -- | Subscription successfully renewed | Update `currentPeriodEnd`, confirm "active" |
| `DID_FAIL_TO_RENEW` | -- | Billing failed, enters billing retry | Set status to "billing_retry_period" |
| `DID_CHANGE_RENEWAL_STATUS` | `AUTO_RENEW_DISABLED` | User turned off auto-renew | Set status to "will_cancel", log cancellation intent |
| `DID_CHANGE_RENEWAL_STATUS` | `AUTO_RENEW_ENABLED` | User re-enabled auto-renew | Set status to "active" |
| `EXPIRED` | `VOLUNTARY` | Subscription expired after user canceled | Set plan to "free", status to "expired" |
| `EXPIRED` | `BILLING_RETRY` | Expired after all billing retries failed | Set plan to "free", status to "expired" |
| `GRACE_PERIOD_EXPIRED` | -- | Grace period ended without successful payment | Set status to "grace_period_expired" |
| `REFUND` | -- | Apple issued a refund | Set plan to "free", status to "refunded" |
| `REVOKE` | -- | Family Sharing revocation | Set plan to "free", status to "revoked" |
| `CONSUMPTION_REQUEST` | -- | Apple requests consumption info for refund decision | Log and respond (see Section 5.2) |

### Webhook Handler

```typescript
// server/src/webhooks/apple.ts
import type { Request, Response } from "express";
import {
  SignedDataVerifier,
  Environment,
  ResponseBodyV2DecodedPayload,
  JWSTransactionDecodedPayload,
} from "@apple/app-store-server-library";
import { db } from "../db/index.js";
import { users, subscriptions, processedEvents } from "../db/schema/index.js";
import { eq } from "drizzle-orm";

const appleEnvironment =
  process.env.APPLE_ENVIRONMENT === "Production"
    ? Environment.PRODUCTION
    : Environment.SANDBOX;

const verifier = new SignedDataVerifier(
  [],
  true,
  appleEnvironment,
  process.env.APPLE_BUNDLE_ID!,
  process.env.APPLE_KEY_ID!,
);

export async function handleAppleWebhook(req: Request, res: Response) {
  let payload: ResponseBodyV2DecodedPayload;

  try {
    // 1. Parse the raw body
    const body = JSON.parse(req.body.toString());
    const signedPayload = body.signedPayload;

    if (!signedPayload) {
      return res.status(400).json({ error: "Missing signedPayload" });
    }

    // 2. Verify and decode the notification
    payload = await verifier.verifyAndDecodeNotification(signedPayload);
  } catch (err) {
    console.error("Apple webhook verification failed:", err);
    return res.status(400).json({ error: "Notification verification failed" });
  }

  // 3. Idempotency check using notification UUID
  const notificationId = payload.notificationUUID;
  if (notificationId) {
    const [existing] = await db
      .select()
      .from(processedEvents)
      .where(eq(processedEvents.eventId, notificationId))
      .limit(1);

    if (existing) {
      return res.json({ received: true, skipped: true });
    }
  }

  try {
    // 4. Extract the transaction info from the notification
    const transactionInfo = payload.data?.signedTransactionInfo;
    if (!transactionInfo) {
      // Some notification types may not include transaction info
      console.log(
        `Apple notification ${payload.notificationType} has no transaction info`
      );
      return res.json({ received: true });
    }

    const transaction = await verifier.verifyAndDecodeTransaction(
      transactionInfo
    );
    const originalTransactionId = transaction.originalTransactionId!;

    // 5. Find the subscription by originalTransactionId
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.originalTransactionId, originalTransactionId))
      .limit(1);

    // 6. Route by notification type
    const notificationType = payload.notificationType;
    const subtype = payload.subtype;
    const now = new Date();

    console.log(
      `Apple S2S: ${notificationType}${subtype ? ` (${subtype})` : ""} ` +
      `for transaction ${originalTransactionId}`
    );

    switch (notificationType) {
      case "SUBSCRIBED": {
        // New subscription or re-subscribe
        const expiresDate = new Date(Number(transaction.expiresDate));

        if (sub) {
          await db
            .update(subscriptions)
            .set({
              status: "active",
              currentPeriodEnd: expiresDate,
              updatedAt: now,
            })
            .where(eq(subscriptions.id, sub.id));

          await setUserPlan(sub.userId, "pro");
        } else {
          // Subscription record does not exist yet
          // (This can happen if the receipt verification endpoint was not called)
          // We need to find the user -- check if any user has this transaction
          // from a prior receipt verification, or create a "pending" subscription.
          console.warn(
            `No subscription found for ${originalTransactionId}. ` +
            `This may happen if the app did not call verify-receipt.`
          );
          // The next time the user opens the app and calls verify-receipt
          // or GET /api/billing/status, the subscription will be created.
        }
        break;
      }

      case "DID_RENEW": {
        if (sub) {
          const expiresDate = new Date(Number(transaction.expiresDate));
          await db
            .update(subscriptions)
            .set({
              status: "active",
              currentPeriodEnd: expiresDate,
              updatedAt: now,
            })
            .where(eq(subscriptions.id, sub.id));

          await setUserPlan(sub.userId, "pro");
        }
        break;
      }

      case "DID_FAIL_TO_RENEW": {
        if (sub) {
          await db
            .update(subscriptions)
            .set({
              status: "billing_retry_period",
              updatedAt: now,
            })
            .where(eq(subscriptions.id, sub.id));

          // User retains access during billing retry period
          // (Apple retries for up to 60 days)
          // Do NOT downgrade the user yet
        }
        break;
      }

      case "DID_CHANGE_RENEWAL_STATUS": {
        if (sub) {
          if (subtype === "AUTO_RENEW_DISABLED") {
            // User turned off auto-renew -- they will lose access at period end
            await db
              .update(subscriptions)
              .set({
                status: "will_cancel",
                updatedAt: now,
              })
              .where(eq(subscriptions.id, sub.id));

            // Do NOT downgrade yet -- they have access until currentPeriodEnd
          } else if (subtype === "AUTO_RENEW_ENABLED") {
            // User re-enabled auto-renew
            await db
              .update(subscriptions)
              .set({
                status: "active",
                updatedAt: now,
              })
              .where(eq(subscriptions.id, sub.id));
          }
        }
        break;
      }

      case "EXPIRED": {
        if (sub) {
          await db
            .update(subscriptions)
            .set({
              status: "expired",
              updatedAt: now,
            })
            .where(eq(subscriptions.id, sub.id));

          await setUserPlan(sub.userId, "free");
        }
        break;
      }

      case "GRACE_PERIOD_EXPIRED": {
        if (sub) {
          await db
            .update(subscriptions)
            .set({
              status: "grace_period_expired",
              updatedAt: now,
            })
            .where(eq(subscriptions.id, sub.id));

          // Downgrade: grace period is over, payment failed
          await setUserPlan(sub.userId, "free");
        }
        break;
      }

      case "REFUND": {
        if (sub) {
          await db
            .update(subscriptions)
            .set({
              status: "refunded",
              updatedAt: now,
            })
            .where(eq(subscriptions.id, sub.id));

          await setUserPlan(sub.userId, "free");
        }
        break;
      }

      case "REVOKE": {
        if (sub) {
          await db
            .update(subscriptions)
            .set({
              status: "revoked",
              updatedAt: now,
            })
            .where(eq(subscriptions.id, sub.id));

          await setUserPlan(sub.userId, "free");
        }
        break;
      }

      default: {
        console.log(`Unhandled Apple notification: ${notificationType}`);
      }
    }

    // 7. Record processed event
    if (notificationId) {
      await db
        .insert(processedEvents)
        .values({ eventId: notificationId, source: "apple" })
        .onConflictDoNothing();
    }

    return res.json({ received: true });
  } catch (err) {
    console.error(`Apple webhook handler error for ${payload.notificationType}:`, err);
    // Return 500 so Apple retries
    return res.status(500).json({ error: "Webhook handler failed" });
  }
}

// Helper: update user's plan
async function setUserPlan(userId: string, plan: "free" | "pro") {
  await db
    .update(users)
    .set({ plan, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
```

### 5.1 Notification Verification

Apple signs all V2 notifications with JWS. The `@apple/app-store-server-library` handles verification:

1. The outer JWS contains the `ResponseBodyV2DecodedPayload`
2. The inner `signedTransactionInfo` is another JWS containing the `JWSTransactionDecodedPayload`
3. Both are verified against Apple's root CA certificate chain
4. The library caches Apple's root certificates

**Never process an unverified notification.** If verification fails, return 400.

### 5.2 CONSUMPTION_REQUEST Handling

When Apple receives a refund request, they may send a `CONSUMPTION_REQUEST` notification asking for consumption data. For v1, we log it and respond with basic information:

```typescript
case "CONSUMPTION_REQUEST": {
  // Apple is asking about the user's consumption for a refund decision
  // For v1, we log this. In v2, we can provide detailed consumption data.
  console.log(
    `Apple CONSUMPTION_REQUEST for transaction ${originalTransactionId}`
  );
  // TODO: Respond via the Send Consumption Information endpoint
  // https://developer.apple.com/documentation/appstoreserverapi/send_consumption_information
  break;
}
```

---

## 6. Subscription Status Endpoint

### GET /api/billing/status

Returns the current user's subscription status. Called by the mobile app on launch and after purchase flows.

```typescript
billingRouter.get(
  "/status",
  requireAuth(),
  async (req, res) => {
    const auth = getAuth(req);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, auth.userId!))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find the most recent subscription for this user
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .orderBy(subscriptions.updatedAt, "desc")
      .limit(1);

    // Determine effective plan status
    let effectivePlan = user.plan;
    let effectiveStatus = "none";
    let expiresAt: string | null = null;
    let willCancel = false;

    if (sub) {
      effectiveStatus = sub.status;
      expiresAt = sub.currentPeriodEnd.toISOString();
      willCancel = sub.status === "will_cancel";

      // Check if the subscription has expired but we missed the webhook
      const now = new Date();
      if (
        sub.currentPeriodEnd < now &&
        !["expired", "refunded", "revoked"].includes(sub.status)
      ) {
        // The subscription period has passed -- treat as expired
        // The Apple S2S notification may arrive later and correct this
        effectivePlan = "free";
        effectiveStatus = "expired";

        // Update the DB to reflect this
        await db
          .update(subscriptions)
          .set({ status: "expired", updatedAt: now })
          .where(eq(subscriptions.id, sub.id));

        await db
          .update(users)
          .set({ plan: "free", updatedAt: now })
          .where(eq(users.id, user.id));
      }

      // Grace period and billing retry: user keeps access
      if (
        ["active", "will_cancel", "billing_retry_period"].includes(sub.status) &&
        sub.currentPeriodEnd >= now
      ) {
        effectivePlan = "pro";
      }
    }

    // Count active jobs for free tier display
    const activeJobCountResult = await db
      .select({ count: sql`count(*)` })
      .from(jobs)
      .where(and(eq(jobs.userId, user.id), eq(jobs.status, "active")));

    const activeJobCount = Number(activeJobCountResult[0]?.count ?? 0);

    return res.json({
      plan: effectivePlan,
      subscriptionStatus: effectiveStatus,
      expiresAt,
      willCancel,
      activeJobCount,
      activeJobLimit: effectivePlan === "pro" ? null : 10,
    });
  }
);
```

---

## 7. Subscription Status Check Middleware

Used by the job creation endpoint to enforce the free tier limit.

```typescript
// server/src/middleware/subscription.ts
import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db } from "../db/index.js";
import { users, subscriptions, jobs } from "../db/schema/index.js";
import { eq, and, sql } from "drizzle-orm";

/**
 * Resolves the user's effective subscription plan and attaches it to the request.
 * Does NOT block requests -- just enriches the request with plan info.
 */
export async function resolveSubscription(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const auth = getAuth(req);
  if (!auth.userId) return next();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, auth.userId))
    .limit(1);

  if (!user) return next();

  // Attach to request for downstream handlers
  (req as any).dbUser = user;
  (req as any).effectivePlan = user.plan;

  // Check subscription validity
  if (user.plan === "pro") {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .orderBy(subscriptions.updatedAt, "desc")
      .limit(1);

    if (sub) {
      const now = new Date();
      // If subscription has expired, downgrade
      if (
        sub.currentPeriodEnd < now &&
        !["billing_retry_period"].includes(sub.status)
      ) {
        (req as any).effectivePlan = "free";
      }
    }
  }

  next();
}

/**
 * Enforces the free tier job limit.
 * Returns 402 if a free user has >= 10 active jobs.
 * Use on POST /api/jobs.
 */
export async function enforceJobLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (req as any).dbUser;
  const plan = (req as any).effectivePlan;

  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Pro users have no job limit
  if (plan === "pro") return next();

  // Count active jobs
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(jobs)
    .where(and(eq(jobs.userId, user.id), eq(jobs.status, "active")));

  const activeJobCount = result[0]?.count ?? 0;

  if (activeJobCount >= 10) {
    return res.status(402).json({
      error: "free_tier_exceeded",
      activeJobs: activeJobCount,
      limit: 10,
      message: "You've reached the 10 active job limit. Subscribe for unlimited jobs, or archive finished jobs to free up slots.",
    });
  }

  next();
}
```

### Usage in Routes

```typescript
// server/src/routes/jobs.ts
import { requireAuth } from "@clerk/express";
import { resolveSubscription, enforceJobLimit } from "../middleware/subscription.js";

router.post(
  "/api/jobs",
  requireAuth(),
  resolveSubscription,
  enforceJobLimit,
  createJobHandler
);
```

---

## 8. Database Schema Changes

The subscription table changes from Andrei's original spec to accommodate Apple IAP instead of Stripe:

```typescript
// server/src/db/schema/subscriptions.ts
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),

  // Apple IAP fields (replaces stripeSubscriptionId)
  originalTransactionId: text("original_transaction_id").notNull().unique(),
  productId: text("product_id").notNull(),
  // "Sandbox" | "Production"
  environment: text("environment").notNull(),

  // Subscription lifecycle
  // active | will_cancel | billing_retry_period | grace_period_expired
  // | expired | refunded | revoked
  status: text("status").notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

### Key Differences from Andrei's Original Spec

| Original (Stripe) | Updated (Apple IAP) | Reason |
|-------------------|---------------------|--------|
| `stripeSubscriptionId` | `originalTransactionId` | Apple's stable subscription identifier across renewals |
| Status: `active`, `canceled`, `past_due` | Status: `active`, `will_cancel`, `billing_retry_period`, `grace_period_expired`, `expired`, `refunded`, `revoked` | Apple has more granular subscription states |
| -- | `productId` | Identifies which IAP product the subscription is for |
| -- | `environment` | Distinguishes Sandbox from Production transactions |

### processedEvents Table

The existing `processedEvents` table is reused for Apple S2S notification idempotency. The `source` field accepts `"apple"` in addition to `"clerk"` and `"stripe"`.

---

## 9. Subscription State Machine

```
                    ┌─────────────────────────────┐
                    │           free               │
                    │   (default for new users)    │
                    └─────────────┬───────────────┘
                                  │
                    SUBSCRIBED (INITIAL_BUY)
                    or verify-receipt success
                                  │
                                  ▼
                    ┌─────────────────────────────┐
               ┌───→│          active              │←──────────────────┐
               │    │  (full access, unlimited)    │                   │
               │    └──────┬──────────┬───────────┘                   │
               │           │          │                                │
               │  DID_CHANGE_  DID_FAIL_                     DID_RENEW
               │  RENEWAL_     TO_RENEW                      (renewal ok)
               │  STATUS                                               │
               │  (AUTO_RENEW                                          │
               │   _DISABLED)  │                                       │
               │           │   │                                       │
               │           ▼   ▼                                       │
               │    ┌────────────────────────┐    ┌───────────────────┐
               │    │    will_cancel         │    │billing_retry_period│
               │    │ (access until period   │    │(access continues, │──┘
               │    │  end, then expires)    │    │ Apple retrying    │
               │    └──────────┬─────────────┘    │ for up to 60 days)│
               │               │                  └────────┬──────────┘
               │    EXPIRED    │                           │
               │    (VOLUNTARY)│              EXPIRED (BILLING_RETRY)
               │               │              or GRACE_PERIOD_EXPIRED
               │               │                           │
               │               ▼                           ▼
               │    ┌─────────────────────────────────────────────────┐
               │    │                   expired                       │
               │    │            (reverts to free)                    │
               └────┤                                                 │
                    └─────────────────────────────────────────────────┘
                             also: REFUND → refunded
                                   REVOKE → revoked
                    (both revert to free tier)
```

### State Descriptions

| State | User Access | What's Happening |
|-------|------------|-----------------|
| `active` | Full (unlimited jobs) | Subscription is current and auto-renew is on |
| `will_cancel` | Full (until period end) | User turned off auto-renew. Access continues until `currentPeriodEnd` |
| `billing_retry_period` | Full | Apple's payment failed but is retrying (up to 60 days). User keeps access during retries. |
| `grace_period_expired` | Revoked | Grace period ended. Apple could not collect payment. |
| `expired` | Revoked (free tier) | Subscription ended. User reverts to 10-job limit. |
| `refunded` | Revoked (free tier) | Apple issued a refund. |
| `revoked` | Revoked (free tier) | Family Sharing revocation. |

### Access Rules

A user has "pro" access if their subscription status is one of:
- `active`
- `will_cancel` (and `currentPeriodEnd` is in the future)
- `billing_retry_period`

All other states revert the user to the free tier.

---

## 10. Free Tier to Paid Transition

### What Happens When a User Subscribes

1. User has 10 active jobs (free tier limit reached)
2. User taps "+ New Job" and sees the upgrade prompt
3. User taps "Subscribe -- $4.99/month"
4. StoreKit presents the Apple payment sheet
5. User authenticates with Face ID / Touch ID
6. Apple charges the user's payment method
7. StoreKit returns a signed transaction to the app
8. App sends the transaction to `POST /api/billing/verify-receipt`
9. Backend verifies, creates subscription record, sets `plan = "pro"`
10. Backend returns `{ plan: "pro" }`
11. App updates local state (`userPlan: "pro"` in Zustand store)
12. Upgrade prompt dismisses
13. App continues to the job creation flow
14. User can now create unlimited jobs

**The transition is immediate and synchronous** (unlike Stripe Managed Payments where the webhook is async). The receipt verification response directly confirms the subscription.

---

## 11. Paid to Free Transition (Cancellation)

### What Happens When a User Cancels

Apple handles subscription cancellation through the App Store subscription management screen (Settings > Apple ID > Subscriptions > SiteSnap Pro > Cancel). Our app does NOT need a "Cancel Subscription" button -- Apple guidelines prefer users manage subscriptions through the system UI.

1. User opens iOS Settings > Apple ID > Subscriptions
2. User selects SiteSnap Pro and taps "Cancel Subscription"
3. Apple sends `DID_CHANGE_RENEWAL_STATUS` (subtype: `AUTO_RENEW_DISABLED`)
4. Our webhook sets status to `will_cancel`
5. **User retains full access until `currentPeriodEnd`**
6. At `currentPeriodEnd`, Apple sends `EXPIRED` (subtype: `VOLUNTARY`)
7. Our webhook sets status to `expired` and plan to `free`
8. On next app launch, `GET /api/billing/status` returns `{ plan: "free" }`
9. App updates local state, 10-job limit re-enforced
10. Existing jobs and photos remain fully accessible (view, search, share, compare)
11. User can archive jobs to free up slots within the 10-job limit

**Key principle:** Cancellation does not mean immediate loss of access. The user paid for the current period and keeps access until it expires.

---

## 12. Client-Side Integration Guide for Zara

### Package Setup

Use `react-native-iap` (more mature and widely used than `expo-in-app-purchases`):

```bash
# In the mobile workspace
npx expo install react-native-iap
```

### Configuration

In `app.json`:

```json
{
  "expo": {
    "scheme": "sitesnap",
    "ios": {
      "bundleIdentifier": "com.sherlocklabs.sitesnap",
      "usesIAP": true
    }
  }
}
```

### Product ID

```typescript
// packages/shared/src/constants/billing.ts
export const IAP_PRODUCT_ID = "com.sherlocklabs.sitesnap.pro.monthly";
export const IAP_SUBSCRIPTION_GROUP = "SiteSnap Pro";
```

### Purchase Flow Implementation

```typescript
// mobile/lib/iap.ts
import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  type ProductPurchase,
  type SubscriptionPurchase,
} from "react-native-iap";
import { IAP_PRODUCT_ID } from "@sitesnap/shared";
import { apiClient } from "./auth";

// SKUs for subscription products
const subscriptionSkus = [IAP_PRODUCT_ID];

/**
 * Initialize IAP connection. Call once on app startup.
 */
export async function initIAP() {
  try {
    await initConnection();
  } catch (err) {
    console.error("IAP connection failed:", err);
  }
}

/**
 * Clean up IAP connection. Call on app unmount.
 */
export async function cleanupIAP() {
  await endConnection();
}

/**
 * Get subscription product info (price, description) from the App Store.
 */
export async function getSubscriptionProduct() {
  const products = await getSubscriptions({ skus: subscriptionSkus });
  return products[0] ?? null;
}

/**
 * Initiate a subscription purchase.
 * Returns the verified subscription status from the backend.
 */
export async function purchaseSubscription(): Promise<{
  plan: string;
  status: string;
  expiresAt: string;
}> {
  // 1. Request the subscription from StoreKit
  await requestSubscription({ sku: IAP_PRODUCT_ID });

  // The purchase result will come through the purchaseUpdatedListener
  // (see setupPurchaseListeners below)
  // This function kicks off the flow; the listener handles completion.
  // For a simpler API, wrap in a Promise that resolves in the listener.

  return new Promise((resolve, reject) => {
    // This is simplified -- in practice, use a ref or event emitter
    // to connect the listener callback to this Promise.
    pendingPurchaseResolve = resolve;
    pendingPurchaseReject = reject;
  });
}

let pendingPurchaseResolve: ((value: any) => void) | null = null;
let pendingPurchaseReject: ((reason: any) => void) | null = null;

/**
 * Set up purchase listeners. Call once on app startup after initIAP().
 */
export function setupPurchaseListeners() {
  // Successful purchase
  const purchaseUpdateSubscription = purchaseUpdatedListener(
    async (purchase: ProductPurchase | SubscriptionPurchase) => {
      const receipt = purchase.transactionReceipt;
      if (!receipt) return;

      try {
        // Send to backend for verification
        const result = await apiClient.post("/api/billing/verify-receipt", {
          signedTransaction: receipt,
        });

        // Finish the transaction with Apple (required!)
        // If you don't call this, Apple will refund the purchase.
        await finishTransaction({
          purchase,
          isConsumable: false,
        });

        if (pendingPurchaseResolve) {
          pendingPurchaseResolve(result);
          pendingPurchaseResolve = null;
        }
      } catch (err) {
        console.error("Receipt verification failed:", err);
        // Still finish the transaction -- the purchase was successful on Apple's side.
        // The backend verification can be retried later.
        await finishTransaction({
          purchase,
          isConsumable: false,
        });

        if (pendingPurchaseReject) {
          pendingPurchaseReject(err);
          pendingPurchaseReject = null;
        }
      }
    }
  );

  // Purchase error
  const purchaseErrorSubscription = purchaseErrorListener((error) => {
    console.error("Purchase error:", error);
    if (pendingPurchaseReject) {
      pendingPurchaseReject(error);
      pendingPurchaseReject = null;
    }
  });

  // Return cleanup function
  return () => {
    purchaseUpdateSubscription.remove();
    purchaseErrorSubscription.remove();
  };
}

/**
 * Restore purchases. Call when user taps "Restore Purchases" in settings,
 * or on first launch on a new device.
 */
export async function restorePurchases(): Promise<{
  plan: string;
  status: string;
  expiresAt: string | null;
}> {
  // react-native-iap's getAvailablePurchases returns all active subscriptions
  const { getAvailablePurchases } = await import("react-native-iap");
  const purchases = await getAvailablePurchases();

  // Find our subscription
  const sitesnapPurchase = purchases.find(
    (p) => p.productId === IAP_PRODUCT_ID
  );

  if (!sitesnapPurchase?.transactionReceipt) {
    return { plan: "free", status: "none", expiresAt: null };
  }

  // Verify with backend
  const result = await apiClient.post("/api/billing/verify-receipt", {
    signedTransaction: sitesnapPurchase.transactionReceipt,
  });

  return result;
}
```

### UpgradeSheet Component Integration

```typescript
// mobile/components/UpgradeSheet.tsx -- Zara builds the UI, payment logic below

import { useEffect, useState } from "react";
import { getSubscriptionProduct, purchaseSubscription } from "../lib/iap";
import { useSiteSnapStore } from "../lib/store";

export function UpgradeSheet({ visible, onDismiss }: Props) {
  const [product, setProduct] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setUserInfo = useSiteSnapStore((s) => s.setUserInfo);

  useEffect(() => {
    getSubscriptionProduct().then(setProduct);
  }, []);

  async function handleSubscribe() {
    setPurchasing(true);
    setError(null);

    try {
      const result = await purchaseSubscription();
      // Update local state
      setUserInfo(result.plan, 0); // activeJobCount will refresh on next API call
      onDismiss();
    } catch (err) {
      setError("Purchase could not be completed. Please try again.");
    } finally {
      setPurchasing(false);
    }
  }

  // Zara builds the actual UI. Key data points:
  // - product?.localizedPrice (e.g., "$4.99") -- always use the localized price from StoreKit
  // - product?.title (e.g., "SiteSnap Pro Monthly")
  // - purchasing state for loading indicator
  // - error state for error message
}
```

### Restore Purchases

Apple requires all apps with IAP to provide a "Restore Purchases" option. Add it to the profile/settings screen:

```typescript
// In profile.tsx or settings screen
import { restorePurchases } from "../lib/iap";

async function handleRestore() {
  setRestoring(true);
  try {
    const result = await restorePurchases();
    if (result.plan === "pro") {
      setUserInfo("pro", activeJobCount);
      showToast("Subscription restored!");
    } else {
      showToast("No active subscription found.");
    }
  } catch (err) {
    showToast("Could not restore purchases. Please try again.");
  } finally {
    setRestoring(false);
  }
}
```

### Subscription Status Display

In the profile screen, show the current subscription status:

```typescript
// Data from GET /api/billing/status
{
  plan: "pro",
  subscriptionStatus: "active",    // or "will_cancel"
  expiresAt: "2026-03-16T00:00:00Z",
  willCancel: false,
  activeJobCount: 7,
  activeJobLimit: null,            // null = unlimited
}
```

Display rules:
- `plan === "free"`: Show "Free Plan -- 7 of 10 active jobs" and "Subscribe" button
- `plan === "pro"` and `willCancel === false`: Show "Pro Plan -- Unlimited jobs"
- `plan === "pro"` and `willCancel === true`: Show "Pro Plan -- Expires {date}. Your subscription will not renew."
- "Manage Subscription" link opens the iOS subscription management screen via `Linking.openURL("https://apps.apple.com/account/subscriptions")`

---

## 13. Edge Cases

### 13.1 Apple IAP Succeeds but Backend Verification Fails

**Scenario:** The user's payment goes through Apple, but the network call to `POST /api/billing/verify-receipt` fails.

**Handling:**
1. The `purchaseUpdatedListener` receives the successful purchase
2. Backend verification fails (network error, server down)
3. **Critical:** We still call `finishTransaction()` -- if we do not, Apple will refund the purchase after a few days
4. Store the signed transaction locally (AsyncStorage) for retry
5. On next app launch, check for unverified transactions and re-send to the backend
6. The backend upsert is idempotent -- sending the same transaction twice is safe

```typescript
// mobile/lib/store.ts -- add to Zustand store
pendingReceipts: string[];
addPendingReceipt: (receipt: string) => void;
removePendingReceipt: (receipt: string) => void;
```

```typescript
// mobile/lib/iap.ts -- in the purchaseUpdatedListener error handler
} catch (err) {
  // Store for retry
  useSiteSnapStore.getState().addPendingReceipt(receipt);
  await finishTransaction({ purchase, isConsumable: false });
}

// On app launch
export async function retryPendingReceipts() {
  const pending = useSiteSnapStore.getState().pendingReceipts;
  for (const receipt of pending) {
    try {
      await apiClient.post("/api/billing/verify-receipt", {
        signedTransaction: receipt,
      });
      useSiteSnapStore.getState().removePendingReceipt(receipt);
    } catch {
      // Will retry again on next launch
    }
  }
}
```

### 13.2 Grace Period Handling

Apple's Billing Grace Period gives subscribers a window to fix payment issues before losing access:

- **Duration:** 16 days for monthly subscriptions (Apple default)
- **User experience:** User retains full access during the grace period
- **Our handling:** When `DID_FAIL_TO_RENEW` fires, we set status to `billing_retry_period` but do NOT downgrade the user
- **If payment recovers:** Apple sends `DID_RENEW` and we confirm `active`
- **If grace period expires:** Apple sends `GRACE_PERIOD_EXPIRED` and we downgrade to free

### 13.3 User Switches Devices

**Scenario:** User subscribes on iPhone A, gets a new iPhone B.

**Handling:**
1. User installs SiteSnap on iPhone B
2. Signs in with Clerk (same account)
3. Taps "Restore Purchases" (or the app calls `restorePurchases()` automatically on sign-in)
4. StoreKit returns the active subscription receipt from iPhone B
5. App sends to `POST /api/billing/verify-receipt`
6. Backend matches on `originalTransactionId` -- finds existing subscription record
7. Subscription is already linked to this user -- confirms active status
8. User has full pro access on both devices

**Auto-restore on sign-in:** Call `restorePurchases()` automatically after successful Clerk authentication. This ensures users who switch devices do not need to manually restore.

### 13.4 Restore Purchases on Reinstall

Same flow as device switch. StoreKit remembers all purchases tied to the Apple ID. `getAvailablePurchases()` returns them.

### 13.5 Sandbox Testing

**App Store Connect Sandbox Testers:**
1. App Store Connect > Users and Access > Sandbox > Testers
2. Create sandbox test accounts (use real email addresses you control)
3. Sandbox subscriptions auto-renew on an accelerated schedule:

| Real Duration | Sandbox Duration |
|--------------|-----------------|
| 1 month | 5 minutes |
| 1 year | 1 hour |

4. Sandbox subscriptions auto-renew up to 12 times, then expire

**Testing in Expo Dev Client:**
- Apple IAP requires a real device (not the iOS Simulator)
- Use `expo-dev-client` for testing: `npx expo run:ios --device`
- Sign into the sandbox Apple ID on the device (Settings > App Store > scroll to bottom > Sandbox Account)

**Testing the webhook:**
- Sandbox notifications are sent to the Sandbox URL configured in App Store Connect
- Use a tunnel (ngrok) for local testing: `ngrok http 3001`
- Set the Sandbox URL in App Store Connect to your ngrok URL

### 13.6 Family Sharing

If the subscriber shares their subscription via Family Sharing and later revokes it, Apple sends a `REVOKE` notification. We handle this by setting the revoked user's plan to "free." The original subscriber's plan is unaffected.

For v1, we do not actively support Family Sharing (it requires additional App Store Connect configuration). If a user happens to share via Family Sharing, the revocation flow will work correctly.

### 13.7 Price Increase

If we increase the $4.99 price in the future, Apple requires existing subscribers to consent. Apple handles the consent flow (notification to the user, require opt-in). We receive a `PRICE_INCREASE` notification. No server-side action needed for v1 -- Apple handles the entire flow.

---

## 14. Server Middleware Ordering

The Apple webhook must be registered BEFORE `express.json()`, same pattern as Clerk and Stripe webhooks:

```typescript
// server/src/index.ts

// 1. CORS
app.use(cors({ origin: process.env.APP_URL, credentials: true }));

// 2. WEBHOOK ROUTES -- BEFORE express.json()
app.post(
  "/api/webhooks/clerk",
  express.raw({ type: "application/json" }),
  handleClerkWebhook
);
app.post(
  "/api/webhooks/apple",
  express.raw({ type: "application/json" }),
  handleAppleWebhook
);

// 3. JSON body parsing
app.use(express.json());

// 4. Clerk auth middleware
app.use(clerkMiddleware({ ... }));

// 5. Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// 6. API routes (including billing routes)
app.use("/api/billing", billingRouter);
app.use("/api", apiRouter);
```

Note: The Stripe webhook route from Andrei's tech approach (`/api/webhooks/stripe`) is **removed** for v1. Apple IAP replaces Stripe for subscription billing. If we add web/Android Stripe billing later, the Stripe webhook comes back.

---

## 15. Environment Variables Summary

All payment-related environment variables:

| Variable | Description | Secret? | Where |
|----------|-------------|---------|-------|
| `APPLE_KEY_ID` | App Store Connect API Key ID | No | Railway |
| `APPLE_ISSUER_ID` | App Store Connect Issuer ID | No | Railway |
| `APPLE_BUNDLE_ID` | App bundle identifier | No | Railway |
| `APPLE_PRIVATE_KEY` | ECDSA P-256 private key (inline, escaped newlines) | **Yes** (sealed) | Railway |
| `APPLE_ENVIRONMENT` | `Sandbox` or `Production` | No | Railway |
| `APPLE_IAP_PRODUCT_ID` | IAP product ID (`com.sherlocklabs.sitesnap.pro.monthly`) | No | Railway + Mobile |

**Removed from Andrei's original env spec (not needed for Apple IAP v1):**

| Variable | Reason Removed |
|----------|---------------|
| `STRIPE_SECRET_KEY` | No Stripe payment processing in v1 |
| `STRIPE_WEBHOOK_SECRET` | No Stripe webhooks in v1 |
| `STRIPE_PRICE_MONTHLY` | No Stripe prices in v1 |

If Stripe is needed later (web billing, Android, revenue analytics), these env vars come back.

---

## 16. npm Dependencies

### Server

```bash
# Add to server/package.json
npm install @apple/app-store-server-library
```

This is Apple's official Node.js library for:
- JWS signed transaction verification
- S2S notification decoding and verification
- App Store Server API v2 client (for receipt lookups, subscription status queries)

### Mobile

```bash
# Add to mobile/package.json
npx expo install react-native-iap
```

`react-native-iap` provides:
- StoreKit 2 integration for iOS
- Google Play Billing for Android (future)
- Unified API for subscriptions, purchases, and restore

---

## 17. Security

### Receipt Verification

- Every receipt is verified server-side using Apple's root CA certificate chain via `@apple/app-store-server-library`
- The server NEVER trusts the client's claim of subscription status
- Product ID is validated against the expected value -- prevents receipt reuse from other apps
- The `originalTransactionId` is the canonical subscription identifier

### Webhook Verification

- All Apple S2S notifications are JWS-signed
- The `@apple/app-store-server-library` verifies the signature chain against Apple's root CA
- Unverified notifications are rejected with 400

### Idempotency

- Receipt verification is idempotent (upsert on `originalTransactionId`)
- Webhook processing is idempotent (dedup via `processedEvents` table using `notificationUUID`)
- Sending the same receipt or notification twice produces the same result

### No Sensitive Data in Logs

Payment logging includes:
- Notification type and subtype
- `originalTransactionId`
- User ID
- Product ID
- Environment (Sandbox/Production)

Payment logging NEVER includes:
- Apple API private keys
- Raw JWS tokens (except in error debugging, redacted)
- User payment method details (we never have access -- Apple handles this)

### Server-Side Authority

The server is the sole authority for subscription status:
- `GET /api/billing/status` returns the authoritative plan
- `POST /api/jobs` checks plan server-side before creating jobs
- The mobile app caches plan locally for UI responsiveness, but the server always wins
- Jailbroken devices cannot spoof subscription status

---

## 18. Testing Strategy

### Test Scenarios

| # | Scenario | Expected Result |
|---|----------|-----------------|
| 1 | New user signs up | `plan: "free"`, 10 active job limit |
| 2 | Free user creates 10th active job | Job creates successfully, count shows "10 of 10" |
| 3 | Free user tries to create 11th active job | Returns 402, shows upgrade prompt |
| 4 | Free user archives a job, then creates a new one | Archive succeeds, new job creates (now 10 active again) |
| 5 | User completes IAP purchase | Receipt verified, `plan: "pro"`, unlimited jobs |
| 6 | User creates 11th job after subscribing | Job creates successfully |
| 7 | User cancels subscription in iOS Settings | `DID_CHANGE_RENEWAL_STATUS` fires, status becomes `will_cancel`, access continues |
| 8 | Canceled subscription reaches period end | `EXPIRED` fires, `plan: "free"`, 10-job limit re-enforced |
| 9 | Subscription renewal succeeds | `DID_RENEW` fires, `currentPeriodEnd` updated |
| 10 | Subscription renewal fails | `DID_FAIL_TO_RENEW` fires, `billing_retry_period`, access continues |
| 11 | All billing retries fail | `EXPIRED (BILLING_RETRY)` fires, `plan: "free"` |
| 12 | User reinstalls app and restores | `restorePurchases()` → `verify-receipt` → `plan: "pro"` |
| 13 | User switches devices | Same as restore -- `originalTransactionId` matches |
| 14 | Receipt sent twice (idempotency) | Second call returns same result, no duplicate records |
| 15 | Webhook sent twice (idempotency) | Second delivery skipped via `processedEvents` |
| 16 | Apple issues refund | `REFUND` fires, `plan: "free"` |
| 17 | Receipt verification fails after purchase | Transaction finished with Apple, receipt queued locally for retry |

### Sandbox Testing Checklist

1. Create sandbox tester in App Store Connect
2. Sign in on test device with sandbox Apple ID
3. Run the app via `expo-dev-client` on device
4. Complete a purchase -- verify receipt validation endpoint works
5. Wait 5 minutes (sandbox renewal) -- verify `DID_RENEW` webhook fires
6. Cancel the subscription in Settings -- verify `DID_CHANGE_RENEWAL_STATUS` fires
7. Wait for expiration -- verify `EXPIRED` fires and user is downgraded
8. Re-subscribe -- verify `SUBSCRIBED (RESUBSCRIBE)` fires

---

## 19. Revenue Impact Analysis

### Revenue per Subscriber

| Scenario | Apple Cut | Net Revenue | vs. Stripe-Only |
|----------|----------|-------------|-----------------|
| Standard (30% Apple) | $1.50 | $3.49/month | -$3.01 vs. VoiceNote Pro's Stripe Checkout approach |
| Small Business Program (15%) | $0.75 | $4.24/month | -$2.26 vs. Stripe Checkout |
| Stripe Checkout (reference) | $0.18 (3.5%) | $4.81/month | Baseline |

**Net impact:** Apple IAP costs $1.32-$2.07 more per subscriber per month than external Stripe Checkout. At 40 subscribers (Month 3 target), that is $53-$83/month in additional platform fees.

**Trade-off:** The CEO has decided this is acceptable. Apple IAP provides:
- Frictionless purchase flow (Face ID + one tap)
- Trust and familiarity for users
- No App Store rejection risk
- Automatic subscription management in iOS Settings
- Apple handles tax, fraud, disputes, and refunds

### Break-Even

At $3.49 net/subscriber (30% cut), SiteSnap needs **~3 paying users** to cover Gemini classification costs ($0.12/user/month at average use) and R2 storage ($0.02/user/month at 6 months). Infrastructure costs are negligible relative to revenue.

---

## 20. Coordination Notes

### For Jonah (Backend Developer)

- The subscription schema changes from Andrei's original spec. Use the Apple IAP version in Section 8 instead of the Stripe version.
- Remove the Stripe webhook route (`/api/webhooks/stripe`) and add the Apple webhook route (`/api/webhooks/apple`) instead.
- The billing routes (`/api/billing/verify-receipt`, `/api/billing/status`) go in `server/src/routes/billing.ts`.
- The `resolveSubscription` and `enforceJobLimit` middleware go in `server/src/middleware/subscription.ts`. Apply `enforceJobLimit` to `POST /api/jobs`.
- The `processedEvents` table is unchanged -- just add `"apple"` as a valid `source` value.
- Add `@apple/app-store-server-library` to server dependencies.

### For Zara (Mobile Developer)

- Use `react-native-iap` (not `expo-in-app-purchases`). It has better StoreKit 2 support.
- Product ID: `com.sherlocklabs.sitesnap.pro.monthly`
- The purchase flow is in Section 12. Key files: `mobile/lib/iap.ts`, `mobile/components/UpgradeSheet.tsx`.
- Always call `finishTransaction()` after a purchase, even if backend verification fails.
- Implement `retryPendingReceipts()` on app launch for reliability.
- Call `restorePurchases()` automatically after Clerk sign-in.
- Add a "Restore Purchases" button in the profile/settings screen.
- Testing requires a real device with `expo-dev-client` -- IAP does not work in the Simulator.
- Use the localized price from `getSubscriptionProduct()` in the UI -- never hardcode "$4.99".

### For Andrei (Technical Architect)

- The subscription schema diverges from the Stripe pattern in the tech approach. `stripeSubscriptionId` is replaced by `originalTransactionId`, `productId`, and `environment`. Status has more granular states.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_MONTHLY` env vars are removed for v1.
- Apple env vars are added: `APPLE_KEY_ID`, `APPLE_ISSUER_ID`, `APPLE_BUNDLE_ID`, `APPLE_PRIVATE_KEY`, `APPLE_ENVIRONMENT`.
- The middleware ordering in `server/src/index.ts` changes: Apple webhook replaces Stripe webhook.

---

*Payments specification written by Howard (Payments Engineer) for Sherlock Labs. February 2026.*
