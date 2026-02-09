/**
 * Stripe Product & Price Setup Script
 *
 * Run this once to create the SherlockPDF Pro product with monthly and annual prices.
 * Usage: npx tsx src/setup-stripe.ts
 *        (requires STRIPE_SECRET_KEY in .env or environment)
 *
 * After running, copy the printed price IDs into your .env file as:
 *   STRIPE_PRICE_MONTHLY=price_xxx
 *   STRIPE_PRICE_ANNUAL=price_xxx
 */

import "dotenv/config";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("Error: STRIPE_SECRET_KEY environment variable is required");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function setup() {
  console.log("Creating SherlockPDF Pro product...\n");

  // Create the product
  const product = await stripe.products.create({
    name: "SherlockPDF Pro",
    description:
      "Unlimited PDF processing. No daily file limit, no output branding, 200MB file size, batch processing.",
    metadata: {
      app: "sherlockpdf",
    },
  });
  console.log(`Product created: ${product.id} (${product.name})`);

  // Create monthly price ($9/month)
  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 900, // $9.00 in cents
    currency: "usd",
    recurring: {
      interval: "month",
    },
    tax_behavior: "exclusive",
    metadata: {
      plan: "monthly",
      app: "sherlockpdf",
    },
  });
  console.log(`Monthly price created: ${monthlyPrice.id} ($9/month)`);

  // Create annual price ($84/year = $7/month)
  const annualPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 8400, // $84.00 in cents
    currency: "usd",
    recurring: {
      interval: "year",
    },
    tax_behavior: "exclusive",
    metadata: {
      plan: "annual",
      app: "sherlockpdf",
    },
  });
  console.log(`Annual price created: ${annualPrice.id} ($84/year)`);

  console.log("\n--- Add these to your .env file ---");
  console.log(`STRIPE_PRICE_MONTHLY=${monthlyPrice.id}`);
  console.log(`STRIPE_PRICE_ANNUAL=${annualPrice.id}`);
  console.log("-----------------------------------\n");

  console.log("REMINDER: Enable Stripe Tax in your Stripe Dashboard:");
  console.log("  1. Go to https://dashboard.stripe.com/settings/tax");
  console.log("  2. Enable automatic tax collection");
  console.log("  3. Set your business address for origin-based tax calculation");
  console.log("");

  console.log("REMINDER: Configure Stripe Customer Portal:");
  console.log("  1. Go to https://dashboard.stripe.com/settings/billing/portal");
  console.log("  2. Enable: cancel subscription, update payment method, view invoices");
  console.log("  3. Set the default return URL to your CLIENT_URL");
}

setup().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});
