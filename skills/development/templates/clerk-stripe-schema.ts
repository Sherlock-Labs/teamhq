// skills/development/templates/clerk-stripe-schema.ts
//
// Drizzle ORM schema for Clerk + Stripe Managed Payments integration.
// Copy this file into your project's server/db/schema/ directory.
//
// Prerequisites:
//   npm install drizzle-orm @neondatabase/serverless (or postgres)
//   npm install -D drizzle-kit
//
// After copying, run:
//   npx drizzle-kit generate
//   npx drizzle-kit migrate

import {
  index,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Users — synced from Clerk via user.created / user.updated webhooks
// ---------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    email: text("email").notNull(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_clerk_user_id_idx").on(table.clerkUserId),
    index("users_email_idx").on(table.email),
  ]
);

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// ---------------------------------------------------------------------------
// Organizations — synced from Clerk via organization.created webhook.
// Each org maps 1:1 to a Stripe Customer for billing.
// ---------------------------------------------------------------------------
export const organizations = pgTable(
  "organizations",
  {
    id: serial("id").primaryKey(),
    clerkOrgId: text("clerk_org_id").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    name: text("name").notNull(),

    // Billing — DB is the source of truth, Clerk publicMetadata is a mirror.
    plan: text("plan").notNull().default("free"), // 'free' | 'pro' | 'enterprise'
    planStatus: text("plan_status").notNull().default("active"), // 'active' | 'past_due' | 'canceled' | 'trialing'
    stripeSubscriptionId: text("stripe_subscription_id"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("organizations_clerk_org_id_idx").on(table.clerkOrgId),
    uniqueIndex("organizations_stripe_customer_id_idx").on(table.stripeCustomerId),
    index("organizations_stripe_subscription_id_idx").on(table.stripeSubscriptionId),
  ]
);

export type Organization = InferSelectModel<typeof organizations>;
export type NewOrganization = InferInsertModel<typeof organizations>;

// ---------------------------------------------------------------------------
// Org Memberships — synced from Clerk via organizationMembership.* webhooks.
// Tracks which users belong to which orgs, with their role.
// ---------------------------------------------------------------------------
export const orgMemberships = pgTable(
  "org_memberships",
  {
    id: serial("id").primaryKey(),
    clerkOrgId: text("clerk_org_id").notNull(),
    clerkUserId: text("clerk_user_id").notNull(),
    role: text("role").notNull().default("member"), // 'admin' | 'member'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Composite unique: one membership per user per org
    uniqueIndex("org_memberships_org_user_idx").on(table.clerkOrgId, table.clerkUserId),
    index("org_memberships_clerk_org_id_idx").on(table.clerkOrgId),
    index("org_memberships_clerk_user_id_idx").on(table.clerkUserId),
  ]
);

export type OrgMembership = InferSelectModel<typeof orgMemberships>;
export type NewOrgMembership = InferInsertModel<typeof orgMemberships>;

// ---------------------------------------------------------------------------
// Processed Events — idempotency tracking for webhook deduplication.
// Both Clerk and Stripe retry failed webhook deliveries. Store processed
// event IDs so handlers can skip duplicates.
// ---------------------------------------------------------------------------
export const processedEvents = pgTable("processed_events", {
  eventId: text("event_id").primaryKey(),
  source: text("source").notNull(), // 'clerk' | 'stripe'
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ProcessedEvent = InferSelectModel<typeof processedEvents>;
export type NewProcessedEvent = InferInsertModel<typeof processedEvents>;
