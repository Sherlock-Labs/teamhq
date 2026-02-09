import { Router, type Request, type Response } from "express";
import { stripe } from "../stripe.js";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    let email = req.query.email as string | undefined;
    const sessionId = req.query.session_id as string | undefined;

    // If session_id is provided (Stripe redirect return), retrieve the customer email
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      email = session.customer_details?.email ?? undefined;
      if (!email) {
        res.json({ active: false, plan: null, customerId: null });
        return;
      }
    }

    if (!email) {
      res.status(400).json({ error: "email or session_id query parameter is required" });
      return;
    }

    const customers = await stripe.customers.list({ email, limit: 1 });

    if (customers.data.length === 0) {
      res.json({ active: false, plan: null, customerId: null });
      return;
    }

    const customer = customers.data[0];
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      res.json({ active: false, plan: null, customerId: customer.id });
      return;
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price?.id;
    const monthlyPriceId = process.env.STRIPE_PRICE_MONTHLY;
    const annualPriceId = process.env.STRIPE_PRICE_ANNUAL;

    let plan: "monthly" | "annual" | null = null;
    if (priceId === monthlyPriceId) plan = "monthly";
    else if (priceId === annualPriceId) plan = "annual";

    res.json({ active: true, plan, customerId: customer.id, email });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to check subscription status";
    res.status(500).json({ error: message });
  }
});

export default router;
