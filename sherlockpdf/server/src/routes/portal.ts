import { Router, type Request, type Response } from "express";
import { stripe } from "../stripe.js";
import type Stripe from "stripe";

const router = Router();

const CLIENT_URL = process.env.CLIENT_URL || "https://pdf.sherlocklabs.ai";

/**
 * POST /api/portal
 *
 * Creates a Stripe Customer Portal session for subscription management.
 * Accepts: { email: string }
 * Returns: { url: string }
 */
router.post("/portal", async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      res.status(400).json({ error: "email is required" });
      return;
    }

    // Look up customer by email
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      res.status(404).json({ error: "No customer found with this email" });
      return;
    }

    const customer = customers.data[0];

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${CLIENT_URL}/`,
    });

    res.json({ url: session.url });
  } catch (err) {
    if (err instanceof Error && "type" in err) {
      const stripeErr = err as Stripe.errors.StripeError;
      console.error("Stripe error creating portal session:", stripeErr.message);
      res.status(stripeErr.statusCode || 500).json({
        error: stripeErr.message,
        type: stripeErr.type,
      });
      return;
    }
    console.error("Error creating portal session:", err);
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

export default router;
