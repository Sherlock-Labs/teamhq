/**
 * Authentication middleware using Clerk.
 *
 * Provides:
 * - requireAuth: ensures the request has a valid Clerk JWT
 * - getDbUser: resolves the Clerk user ID to the internal database user
 */
import { type Request, type Response, type NextFunction } from "express";
import { getAuth, clerkMiddleware } from "@clerk/express";
import { db } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { eq } from "drizzle-orm";

// Re-export Clerk middleware for use in the Express app
export { clerkMiddleware };

/**
 * Extended request type that includes the resolved database user.
 */
export interface AuthenticatedRequest extends Request {
  dbUser: {
    id: string;
    clerkId: string;
    email: string;
    businessName: string | null;
    trade: string | null;
    plan: string;
    stripeCustomerId: string | null;
  };
}

/**
 * Middleware that requires authentication and resolves the DB user.
 * Must be applied after clerkMiddleware().
 *
 * Sets req.dbUser with the full database user record.
 * Returns 401 if not authenticated, 404 if user not found in DB.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const auth = getAuth(req);
    if (!auth || !auth.userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const clerkId = auth.userId;

    // Look up the user in our database
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    if (!dbUser) {
      // User exists in Clerk but not in our DB yet.
      // This can happen if the webhook hasn't fired yet.
      // Return 404 so the client can retry.
      res.status(404).json({
        error: "user_not_found",
        message: "Account setup in progress. Please try again in a moment.",
      });
      return;
    }

    // Attach the DB user to the request
    (req as AuthenticatedRequest).dbUser = {
      id: dbUser.id,
      clerkId: dbUser.clerkId,
      email: dbUser.email,
      businessName: dbUser.businessName,
      trade: dbUser.trade,
      plan: dbUser.plan,
      stripeCustomerId: dbUser.stripeCustomerId,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Authentication error" });
  }
}
