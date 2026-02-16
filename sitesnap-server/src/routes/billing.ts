/**
 * Billing routes (Apple IAP).
 *
 * POST /api/billing/verify-receipt — verify Apple IAP signed transaction
 * GET  /api/billing/status         — subscription status with server-side expiry check
 *
 * Per Howard's payments spec: Apple IAP is the sole payment path for v1.
 * Stripe's role is reduced to optional analytics.
 */
import { Router, type Response } from "express";
import { z } from "zod";
import {
  SignedDataVerifier,
  Environment,
} from "@apple/app-store-server-library";
import { db } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { subscriptions } from "../db/schema/subscriptions.js";
import { jobs } from "../db/schema/jobs.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { checkoutLimiter } from "../middleware/rate-limit.js";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

// Apple App Store Server API configuration
const APPLE_KEY_ID = process.env.APPLE_KEY_ID;
const APPLE_ISSUER_ID = process.env.APPLE_ISSUER_ID;
const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID;
const APPLE_IAP_PRODUCT_ID = process.env.APPLE_IAP_PRODUCT_ID;
const APPLE_ENVIRONMENT_STR = process.env.APPLE_ENVIRONMENT || "Sandbox";

const appleEnvironment =
  APPLE_ENVIRONMENT_STR === "Production"
    ? Environment.PRODUCTION
    : Environment.SANDBOX;

// Initialize Apple's signed data verifier (if credentials are available)
let verifier: SignedDataVerifier | null = null;

if (APPLE_KEY_ID && APPLE_BUNDLE_ID) {
  try {
    verifier = new SignedDataVerifier(
      [], // Apple root CAs -- the library fetches them automatically in v2
      true, // enableOnlineChecks
      appleEnvironment,
      APPLE_BUNDLE_ID,
      APPLE_KEY_ID,
    );
  } catch (err) {
    console.warn("Failed to initialize Apple SignedDataVerifier:", err);
  }
}

const verifyReceiptSchema = z.object({
  signedTransaction: z.string().min(1, "signedTransaction is required"),
});

/**
 * POST /api/billing/verify-receipt
 *
 * Verify an Apple IAP signed transaction (JWS from StoreKit 2).
 * Creates/updates the subscription record and upgrades the user to pro.
 *
 * Per Howard's payments spec Section 4.
 *
 * Rate limited to 3/minute per user.
 */
router.post(
  "/verify-receipt",
  requireAuth,
  checkoutLimiter,
  async (req, res: Response): Promise<void> => {
    const { dbUser } = req as AuthenticatedRequest;

    if (!verifier) {
      res.status(500).json({
        error: "Apple IAP not configured. Missing APPLE_KEY_ID or APPLE_BUNDLE_ID.",
      });
      return;
    }

    const parsed = verifyReceiptSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "validation_error",
        details: parsed.error.issues,
      });
      return;
    }

    try {
      // 1. Verify and decode the JWS signed transaction
      const transaction = await verifier.verifyAndDecodeTransaction(
        parsed.data.signedTransaction
      );

      // 2. Validate the product ID matches our expected subscription
      if (APPLE_IAP_PRODUCT_ID && transaction.productId !== APPLE_IAP_PRODUCT_ID) {
        console.error(
          `Unexpected product ID: ${transaction.productId}. Expected: ${APPLE_IAP_PRODUCT_ID}`
        );
        res.status(400).json({ error: "Invalid product" });
        return;
      }

      // 3. Extract subscription details
      const originalTransactionId = transaction.originalTransactionId!;
      const expiresDate = new Date(Number(transaction.expiresDate));
      const now = new Date();
      const isActive = expiresDate > now;

      // 4. Upsert subscription record
      const [existingSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.originalTransactionId, originalTransactionId))
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
          userId: dbUser.id,
          originalTransactionId,
          productId: transaction.productId!,
          status: isActive ? "active" : "expired",
          currentPeriodEnd: expiresDate,
          environment: transaction.environment!,
        });
      }

      // 5. Update user plan
      if (isActive) {
        await db
          .update(users)
          .set({ plan: "pro", updatedAt: now })
          .where(eq(users.id, dbUser.id));
      }

      // 6. Return subscription status
      res.json({
        plan: isActive ? "pro" : "free",
        status: isActive ? "active" : "expired",
        expiresAt: expiresDate.toISOString(),
        originalTransactionId,
      });
    } catch (err) {
      console.error("Receipt verification failed:", err);

      // Distinguish between verification failures and server errors
      if (err instanceof Error && err.message.includes("verification")) {
        res.status(400).json({
          error: "Receipt verification failed. The transaction could not be validated.",
        });
        return;
      }

      res.status(500).json({
        error: "Failed to verify receipt. Please try again.",
      });
    }
  }
);

/**
 * GET /api/billing/status
 *
 * Returns the current subscription status for the authenticated user.
 * Includes server-side expiry check per Howard's Section 6:
 * if currentPeriodEnd has passed and we missed the webhook, treat as expired.
 */
router.get("/status", requireAuth, async (req, res: Response): Promise<void> => {
  const { dbUser } = req as AuthenticatedRequest;

  try {
    // Find the most recent subscription for this user
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, dbUser.id))
      .limit(1);

    // Determine effective plan status
    let effectivePlan = dbUser.plan;
    let effectiveStatus = "none";
    let expiresAt: string | null = null;
    let willCancel = false;

    if (sub) {
      effectiveStatus = sub.status;
      expiresAt = sub.currentPeriodEnd.toISOString();
      willCancel = sub.status === "will_cancel";

      const now = new Date();

      // Server-side expiry check: catch missed webhooks
      // Per Howard's payments spec Section 6
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
          .where(eq(users.id, dbUser.id));
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
      .where(and(eq(jobs.userId, dbUser.id), eq(jobs.status, "active")));

    const activeJobCount = Number(activeJobCountResult[0]?.count ?? 0);

    res.json({
      plan: effectivePlan,
      subscriptionStatus: effectiveStatus,
      expiresAt,
      willCancel,
      activeJobCount,
      activeJobLimit: effectivePlan === "pro" ? null : 10,
    });
  } catch (error) {
    console.error("GET /api/billing/status error:", error);
    res.status(500).json({ error: "Failed to fetch billing status" });
  }
});

export default router;
