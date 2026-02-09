import { Router, type Request, type Response } from "express";
import { stripe } from "../stripe.js";
import type Stripe from "stripe";

const router = Router();

/**
 * POST /api/webhooks
 *
 * Stripe webhook handler. Verifies webhook signature and processes subscription lifecycle events.
 * NOTE: This route must receive the raw body (not parsed JSON). The main index.ts
 * registers this route BEFORE the express.json() middleware for this path.
 */
router.post("/webhooks", async (req: Request, res: Response) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set — webhook verification disabled in dev");
  }

  let event: Stripe.Event;

  try {
    if (webhookSecret) {
      const signature = req.headers["stripe-signature"];
      if (!signature) {
        res.status(400).json({ error: "Missing stripe-signature header" });
        return;
      }
      // req.body is the raw Buffer when express.raw() is used for this route
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        signature,
        webhookSecret
      );
    } else {
      // Dev mode fallback — no signature verification
      event = req.body as Stripe.Event;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    res.status(400).json({ error: `Webhook signature verification failed: ${message}` });
    return;
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(
        `[webhook] checkout.session.completed — customer: ${session.customer}, email: ${session.customer_details?.email}`
      );
      // Subscription is now active. The /api/status endpoint will pick this up
      // via live Stripe API queries. No local state to update.
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(
        `[webhook] customer.subscription.updated — id: ${subscription.id}, status: ${subscription.status}, customer: ${subscription.customer}`
      );
      // Could be plan change, renewal, or payment method update.
      // Status endpoint handles this via live queries.
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(
        `[webhook] customer.subscription.deleted — id: ${subscription.id}, customer: ${subscription.customer}`
      );
      // Subscription cancelled. Status endpoint will return active: false.
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(
        `[webhook] invoice.payment_failed — invoice: ${invoice.id}, customer: ${invoice.customer}, amount: ${invoice.amount_due}`
      );
      // Stripe handles dunning (retry logic) automatically.
      // Future: send notification email to the customer.
      break;
    }

    default:
      console.log(`[webhook] Unhandled event type: ${event.type}`);
  }

  // Acknowledge receipt
  res.json({ received: true });
});

export default router;
