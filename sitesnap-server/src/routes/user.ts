/**
 * User profile routes.
 *
 * GET /api/me — user profile + subscription status + active job count
 * PUT /api/me — update profile (businessName, trade)
 */
import { Router, type Response } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { jobs } from "../db/schema/jobs.js";
import { subscriptions } from "../db/schema/subscriptions.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { eq, and, count } from "drizzle-orm";

const router = Router();

const VALID_TRADES = ["general", "plumbing", "electrical", "hvac", "roofing", "painting", "other"] as const;

const updateProfileSchema = z.object({
  businessName: z.string().max(100).nullable().optional(),
  trade: z.enum(VALID_TRADES).nullable().optional(),
});

/**
 * GET /api/me
 *
 * Returns the authenticated user's profile, subscription status,
 * and active job count (for free tier display).
 */
router.get("/", requireAuth, async (req, res: Response): Promise<void> => {
  const { dbUser } = req as AuthenticatedRequest;

  try {
    // Get active job count for free tier display
    const [activeJobResult] = await db
      .select({ value: count() })
      .from(jobs)
      .where(and(eq(jobs.userId, dbUser.id), eq(jobs.status, "active")));

    const activeJobCount = activeJobResult?.value ?? 0;

    // Get subscription details if they exist
    let subscriptionStatus = null;
    if (dbUser.plan === "pro") {
      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, dbUser.id))
        .limit(1);

      if (sub) {
        subscriptionStatus = {
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
        };
      }
    }

    res.json({
      id: dbUser.id,
      email: dbUser.email,
      businessName: dbUser.businessName,
      trade: dbUser.trade,
      plan: dbUser.plan,
      activeJobCount,
      activeJobLimit: dbUser.plan === "pro" ? null : 10,
      subscription: subscriptionStatus,
    });
  } catch (error) {
    console.error("GET /api/me error:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

/**
 * PUT /api/me
 *
 * Update the authenticated user's profile.
 * Only businessName and trade can be updated by the user.
 */
router.put("/", requireAuth, async (req, res: Response): Promise<void> => {
  const { dbUser } = req as AuthenticatedRequest;

  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
    });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.businessName !== undefined) {
    updates.businessName = parsed.data.businessName;
  }
  if (parsed.data.trade !== undefined) {
    updates.trade = parsed.data.trade;
  }

  try {
    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, dbUser.id))
      .returning();

    res.json({
      id: updated.id,
      email: updated.email,
      businessName: updated.businessName,
      trade: updated.trade,
      plan: updated.plan,
    });
  } catch (error) {
    console.error("PUT /api/me error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
