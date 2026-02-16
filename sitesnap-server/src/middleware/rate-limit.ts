/**
 * Rate limiting middleware.
 *
 * Limits per the tech approach (Section 8):
 * - Photo upload: 100/day per user
 * - Comparison generation: 20/hour per user
 * - Billing checkout: 3/minute per user
 *
 * Uses express-rate-limit with in-memory store.
 * For multi-instance deployments, swap to a Redis store.
 */
import rateLimit from "express-rate-limit";
import { getAuth } from "@clerk/express";
import { type Request } from "express";

/**
 * Extract the Clerk user ID from the request for rate limit keying.
 * Falls back to IP address if user is not authenticated.
 */
function getUserKey(req: Request): string {
  try {
    const auth = getAuth(req);
    if (auth?.userId) {
      return auth.userId;
    }
  } catch {
    // Fall through to IP-based key
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * 100 photos per day per user.
 * Applied to POST /api/jobs/:id/photos/upload-url and POST /api/jobs/:id/photos
 */
export const photoUploadLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: getUserKey,
  message: {
    error: "rate_limit_exceeded",
    message: "Daily photo limit reached. Resets tomorrow.",
    limit: 100,
    window: "24h",
  },
});

/**
 * 20 comparison generations per hour per user.
 * Applied to POST /api/photos/compare
 */
export const comparisonLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: getUserKey,
  message: {
    error: "rate_limit_exceeded",
    message: "Comparison generation limit reached. Try again later.",
    limit: 20,
    window: "1h",
  },
});

/**
 * 3 checkout attempts per minute per user.
 * Applied to POST /api/billing/checkout
 */
export const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: getUserKey,
  message: {
    error: "rate_limit_exceeded",
    message: "Too many checkout attempts. Please wait.",
    limit: 3,
    window: "1m",
  },
});
