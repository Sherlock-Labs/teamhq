/**
 * Apple App Store Server-to-Server (S2S) notification handler (V2).
 *
 * Handles subscription lifecycle events from Apple:
 * - SUBSCRIBED: New subscription or re-subscribe
 * - DID_RENEW: Successful renewal
 * - DID_FAIL_TO_RENEW: Billing failed, enters billing retry
 * - DID_CHANGE_RENEWAL_STATUS: Auto-renew toggled
 * - EXPIRED: Subscription ended
 * - GRACE_PERIOD_EXPIRED: Grace period over without payment
 * - REFUND: Apple issued a refund
 * - REVOKE: Family Sharing revocation
 * - CONSUMPTION_REQUEST: Apple asks for consumption data
 *
 * Idempotent via processedEvents table.
 * Per Howard's payments spec Section 5.
 */
import type { Request, Response } from "express";
import {
  SignedDataVerifier,
  Environment,
  type ResponseBodyV2DecodedPayload,
} from "@apple/app-store-server-library";
import { db } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { subscriptions } from "../db/schema/subscriptions.js";
import { processedEvents } from "../db/schema/events.js";
import { eq } from "drizzle-orm";

const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID;
const APPLE_KEY_ID = process.env.APPLE_KEY_ID;
const APPLE_ENVIRONMENT_STR = process.env.APPLE_ENVIRONMENT || "Sandbox";

const appleEnvironment =
  APPLE_ENVIRONMENT_STR === "Production"
    ? Environment.PRODUCTION
    : Environment.SANDBOX;

let verifier: SignedDataVerifier | null = null;

if (APPLE_KEY_ID && APPLE_BUNDLE_ID) {
  try {
    verifier = new SignedDataVerifier(
      [],
      true,
      appleEnvironment,
      APPLE_BUNDLE_ID,
      APPLE_KEY_ID,
    );
  } catch (err) {
    console.warn("Failed to initialize Apple SignedDataVerifier for webhooks:", err);
  }
}

/**
 * POST /api/webhooks/apple
 *
 * Apple S2S V2 notification handler.
 * Requires raw body parsing (express.raw) for JWS verification.
 */
export async function handleAppleWebhook(req: Request, res: Response): Promise<void> {
  if (!verifier) {
    console.error("Apple webhook: verifier not configured");
    res.status(500).json({ error: "Apple IAP not configured" });
    return;
  }

  let payload: ResponseBodyV2DecodedPayload;

  try {
    // 1. Parse the raw body
    const body = JSON.parse(req.body.toString());
    const signedPayload = body.signedPayload;

    if (!signedPayload) {
      res.status(400).json({ error: "Missing signedPayload" });
      return;
    }

    // 2. Verify and decode the notification
    payload = await verifier.verifyAndDecodeNotification(signedPayload);
  } catch (err) {
    console.error("Apple webhook verification failed:", err);
    res.status(400).json({ error: "Notification verification failed" });
    return;
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
      res.json({ received: true, skipped: true });
      return;
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
      res.json({ received: true });
      return;
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
          // Subscription record does not exist yet.
          // This can happen if the receipt verification endpoint was not called.
          // The next time the user opens the app and calls verify-receipt
          // or GET /api/billing/status, the subscription will be created.
          console.warn(
            `No subscription found for ${originalTransactionId}. ` +
            `This may happen if the app did not call verify-receipt.`
          );
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

      case "CONSUMPTION_REQUEST": {
        // Apple is asking about the user's consumption for a refund decision
        // For v1, we log this. In v2, we can provide detailed consumption data.
        console.log(
          `Apple CONSUMPTION_REQUEST for transaction ${originalTransactionId}`
        );
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

    res.json({ received: true });
  } catch (err) {
    console.error(`Apple webhook handler error for ${payload.notificationType}:`, err);
    // Return 500 so Apple retries
    res.status(500).json({ error: "Webhook handler failed" });
  }
}

/**
 * Helper: update user's plan.
 */
async function setUserPlan(userId: string, plan: "free" | "pro"): Promise<void> {
  await db
    .update(users)
    .set({ plan, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
