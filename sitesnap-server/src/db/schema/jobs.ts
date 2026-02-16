import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(), // Max 100 chars (enforced in API)
    address: text("address"),
    status: text("status").notNull().default("active"), // active | archived
    photoCount: integer("photo_count").notNull().default(0),
    lastPhotoAt: timestamp("last_photo_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("jobs_user_updated").on(table.userId, table.updatedAt),
    index("jobs_user_status").on(table.userId, table.status),
  ]
);
