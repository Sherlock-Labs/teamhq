import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as usersSchema from "./schema/users.js";
import * as jobsSchema from "./schema/jobs.js";
import * as photosSchema from "./schema/photos.js";
import * as subscriptionsSchema from "./schema/subscriptions.js";
import * as eventsSchema from "./schema/events.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(connectionString);

export const db = drizzle(client, {
  schema: {
    ...usersSchema,
    ...jobsSchema,
    ...photosSchema,
    ...subscriptionsSchema,
    ...eventsSchema,
  },
});

export { usersSchema, jobsSchema, photosSchema, subscriptionsSchema, eventsSchema };
