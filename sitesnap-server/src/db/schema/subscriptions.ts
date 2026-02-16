import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Apple IAP subscription records.
 *
 * Status states per Howard's payments spec Section 9:
 *   active | will_cancel | billing_retry_period | grace_period_expired
 *   | expired | refunded | revoked
 *
 * originalTransactionId is the stable Apple IAP key across all renewals.
 */
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),

  // Apple IAP fields
  originalTransactionId: text("original_transaction_id").notNull().unique(),
  productId: text("product_id").notNull(),
  environment: text("environment").notNull(), // "Sandbox" | "Production"

  // Subscription lifecycle
  status: text("status").notNull(),
  // active | will_cancel | billing_retry_period | grace_period_expired
  // | expired | refunded | revoked
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
