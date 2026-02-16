import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const processedEvents = pgTable("processed_events", {
  eventId: text("event_id").primaryKey(),
  source: text("source").notNull(), // clerk | apple
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});
