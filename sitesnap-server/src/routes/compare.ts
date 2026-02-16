/**
 * Comparison image generation route.
 *
 * POST /api/photos/compare — generate before/after comparison image
 *
 * Returns a presigned download URL instead of proxying the image through Express.
 * This follows Andrei's architecture principle: "the Express server never proxies photo data."
 */
import { Router, type Response } from "express";
import { z } from "zod";
import { createHash } from "crypto";
import { db } from "../db/index.js";
import { photos } from "../db/schema/photos.js";
import { jobs } from "../db/schema/jobs.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { comparisonLimiter } from "../middleware/rate-limit.js";
import { eq, and } from "drizzle-orm";
import {
  downloadObject,
  uploadObject,
  generateDownloadUrl,
  buildComparisonKey,
  objectExists,
} from "../services/r2.js";
import { generateComparison } from "../services/sharp.js";

const router = Router();

const compareSchema = z.object({
  beforePhotoId: z.string().uuid("beforePhotoId must be a valid UUID"),
  afterPhotoId: z.string().uuid("afterPhotoId must be a valid UUID"),
});

/**
 * POST /api/photos/compare
 *
 * Generate a 1080x1080 before/after comparison image.
 * Input: { beforePhotoId, afterPhotoId }
 * Returns: { comparisonUrl, comparisonId } with a presigned download URL.
 *
 * Checks R2 cache first (keyed by hash of both photo IDs).
 * If cached, returns presigned URL directly without downloading.
 * If not cached, generates the image, uploads to R2, then returns presigned URL.
 *
 * Rate limited to 20/hour per user.
 */
router.post(
  "/",
  requireAuth,
  comparisonLimiter,
  async (req, res: Response): Promise<void> => {
    const { dbUser } = req as AuthenticatedRequest;

    const parsed = compareSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "validation_error",
        details: parsed.error.issues,
      });
      return;
    }

    const { beforePhotoId, afterPhotoId } = parsed.data;

    if (beforePhotoId === afterPhotoId) {
      res.status(400).json({ error: "Before and after photos must be different" });
      return;
    }

    try {
      // Fetch both photos and verify ownership
      const [beforePhoto] = await db
        .select()
        .from(photos)
        .where(and(eq(photos.id, beforePhotoId), eq(photos.userId, dbUser.id)))
        .limit(1);

      const [afterPhoto] = await db
        .select()
        .from(photos)
        .where(and(eq(photos.id, afterPhotoId), eq(photos.userId, dbUser.id)))
        .limit(1);

      if (!beforePhoto) {
        res.status(404).json({ error: "Before photo not found" });
        return;
      }
      if (!afterPhoto) {
        res.status(404).json({ error: "After photo not found" });
        return;
      }

      // Both photos must belong to the same job
      if (beforePhoto.jobId !== afterPhoto.jobId) {
        res.status(400).json({ error: "Both photos must belong to the same job" });
        return;
      }

      // Get job and user details for labels
      const [job] = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, beforePhoto.jobId))
        .limit(1);

      if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      // Generate deterministic comparison ID for caching
      const comparisonId = createHash("sha256")
        .update(`${beforePhotoId}:${afterPhotoId}`)
        .digest("hex")
        .substring(0, 16);

      const comparisonR2Key = buildComparisonKey(
        dbUser.clerkId,
        beforePhoto.jobId,
        comparisonId
      );

      // Check R2 cache first using HEAD request (no download)
      const cached = await objectExists(comparisonR2Key);
      if (cached) {
        const comparisonUrl = await generateDownloadUrl(comparisonR2Key);
        res.json({ comparisonUrl, comparisonId });
        return;
      }

      // Cache miss: download source photos, generate comparison, upload to R2
      const [beforeBuffer, afterBuffer] = await Promise.all([
        downloadObject(beforePhoto.r2Key),
        downloadObject(afterPhoto.r2Key),
      ]);

      const comparisonBuffer = await generateComparison(
        beforeBuffer,
        afterBuffer,
        job.name,
        dbUser.businessName
      );

      // Upload to R2 (must succeed before returning URL)
      await uploadObject(comparisonR2Key, comparisonBuffer);

      // Return presigned download URL
      const comparisonUrl = await generateDownloadUrl(comparisonR2Key);
      res.json({ comparisonUrl, comparisonId });
    } catch (error) {
      console.error("POST /api/photos/compare error:", error);
      res.status(500).json({ error: "Failed to generate comparison" });
    }
  }
);

export default router;
