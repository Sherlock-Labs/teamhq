import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Price ID mapping — environment variables hold actual Stripe price IDs
export function getPriceId(plan: "monthly" | "annual"): string {
  if (plan === "monthly") {
    const id = process.env.STRIPE_PRICE_MONTHLY;
    if (!id) throw new Error("STRIPE_PRICE_MONTHLY environment variable is required");
    return id;
  }
  const id = process.env.STRIPE_PRICE_ANNUAL;
  if (!id) throw new Error("STRIPE_PRICE_ANNUAL environment variable is required");
  return id;
}
