import { Router, type Request, type Response } from "express";
import type Stripe from "stripe";
import { stripe, getPriceId } from "../stripe.js";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { priceId, email } = req.body as {
      priceId?: "monthly" | "annual";
      email?: string;
    };

    if (!priceId || (priceId !== "monthly" && priceId !== "annual")) {
      res.status(400).json({ error: "priceId must be 'monthly' or 'annual'" });
      return;
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3003";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [{ price: getPriceId(priceId), quantity: 1 }],
      automatic_tax: { enabled: true },
      success_url: `${clientUrl}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/`,
    };

    if (email) {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create checkout session";
    res.status(500).json({ error: message });
  }
});

export default router;
