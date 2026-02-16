/**
 * Subscription resolution and free tier enforcement middleware.
 *
 * Per Howard's payments spec Section 7:
 * - resolveSubscription: enriches the request with the effective plan
 * - enforceJobLimit: blocks job creation for free users at the 10-job limit
 */
import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { subscriptions } from "../db/schema/subscriptions.js";
import { jobs } from "../db/schema/jobs.js";
import { eq, and, sql } from "drizzle-orm";

/**
 * Resolves the user's effective subscription plan and attaches it to the request.
 * Does NOT block requests -- just enriches the request with plan info.
 *
 * Checks subscription validity: if currentPeriodEnd has passed and
 * the status is not in a terminal state, the effective plan is "free".
 */
export async function resolveSubscription(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const auth = getAuth(req);
  if (!auth.userId) return next();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, auth.userId))
    .limit(1);

  if (!user) return next();

  // Attach to request for downstream handlers
  (req as any).dbUser = user;
  (req as any).effectivePlan = user.plan;

  // Check subscription validity
  if (user.plan === "pro") {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    if (sub) {
      const now = new Date();
      // If subscription has expired, downgrade
      if (
        sub.currentPeriodEnd < now &&
        !["billing_retry_period"].includes(sub.status)
      ) {
        (req as any).effectivePlan = "free";
      }
    }
  }

  next();
}

/**
 * Enforces the free tier job limit.
 * Returns 402 if a free user has >= 10 active jobs.
 * Use on POST /api/jobs.
 */
export async function enforceJobLimit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = (req as any).dbUser;
  const plan = (req as any).effectivePlan;

  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  // Pro users have no job limit
  if (plan === "pro") return next();

  // Count active jobs
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(jobs)
    .where(and(eq(jobs.userId, user.id), eq(jobs.status, "active")));

  const activeJobCount = result[0]?.count ?? 0;

  if (activeJobCount >= 10) {
    res.status(402).json({
      error: "free_tier_exceeded",
      activeJobs: activeJobCount,
      limit: 10,
      message: "You've reached the 10 active job limit. Subscribe for unlimited jobs, or archive finished jobs to free up slots.",
    });
    return;
  }

  next();
}
