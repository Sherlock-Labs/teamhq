/**
 * Clerk webhook handler.
 *
 * Handles user.created events to sync Clerk users to the database.
 * Uses Svix for webhook signature verification.
 * Idempotent via processedEvents table.
 */
import { Router, type Request, type Response } from "express";
import { Webhook } from "svix";
import { db } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { processedEvents } from "../db/schema/events.js";
import { eq } from "drizzle-orm";
import { createContact } from "../services/loops.js";

const router = Router();

interface ClerkUserCreatedEvent {
  type: "user.created";
  data: {
    id: string;
    email_addresses: Array<{
      email_address: string;
      id: string;
    }>;
    first_name: string | null;
    last_name: string | null;
  };
}

/**
 * POST /api/webhooks/clerk
 *
 * Handles Clerk webhook events. Currently processes:
 * - user.created: Creates a user record in the database + Loops contact
 *
 * Requires raw body for signature verification.
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!CLERK_WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET not configured");
    res.status(500).json({ error: "Webhook not configured" });
    return;
  }

  // Verify the webhook signature using Svix
  const svixId = req.headers["svix-id"] as string;
  const svixTimestamp = req.headers["svix-timestamp"] as string;
  const svixSignature = req.headers["svix-signature"] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    res.status(400).json({ error: "Missing Svix headers" });
    return;
  }

  let event: ClerkUserCreatedEvent;
  try {
    const wh = new Webhook(CLERK_WEBHOOK_SECRET);
    event = wh.verify(req.body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserCreatedEvent;
  } catch (error) {
    console.error("Clerk webhook signature verification failed:", error);
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  // Check for idempotency -- have we already processed this event?
  const eventId = svixId;
  const [existing] = await db
    .select()
    .from(processedEvents)
    .where(eq(processedEvents.eventId, eventId))
    .limit(1);

  if (existing) {
    // Already processed, return success
    res.status(200).json({ received: true, duplicate: true });
    return;
  }

  try {
    if (event.type === "user.created") {
      const clerkId = event.data.id;
      const email = event.data.email_addresses[0]?.email_address;

      if (!email) {
        console.error("Clerk user.created event has no email address:", clerkId);
        res.status(400).json({ error: "No email address in event" });
        return;
      }

      // Check if user already exists (belt + suspenders with idempotency check)
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, clerkId))
        .limit(1);

      if (!existingUser) {
        // Create the user record
        await db.insert(users).values({
          clerkId,
          email,
          plan: "free",
        });
      }

      // Record the event as processed
      await db.insert(processedEvents).values({
        eventId,
        source: "clerk",
      });

      // Fire-and-forget: create Loops contact + send welcome email
      createContact({
        email,
        firstName: event.data.first_name || undefined,
        userId: clerkId,
        source: "sitesnap",
      }).catch((err) => console.error("Loops contact creation failed:", err));

      res.status(200).json({ received: true });
    } else {
      // Unhandled event type -- acknowledge it
      res.status(200).json({ received: true, unhandled: true });
    }
  } catch (error) {
    console.error("Clerk webhook processing error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
