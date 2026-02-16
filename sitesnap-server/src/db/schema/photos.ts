import { pgTable, uuid, text, real, integer, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { jobs } from "./jobs.js";

export const photos = pgTable(
  "photos",
  {
    id: uuid("id").primaryKey(), // Client-generated UUID (created before upload)
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    r2Key: text("r2_key").notNull(),
    thumbnailR2Key: text("thumbnail_r2_key"),
    type: text("type").notNull().default("pending"),
    // pending | before | after | progress | issue | material | measurement | unclassified
    confidence: real("confidence"),
    scene: text("scene"),
    trade: text("trade"),
    width: integer("width"),
    height: integer("height"),
    sizeBytes: integer("size_bytes"),
    takenAt: timestamp("taken_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("photos_job_taken").on(table.jobId, table.takenAt),
    index("photos_user_type").on(table.userId, table.type),
    index("photos_user_taken").on(table.userId, table.takenAt),
  ]
);
