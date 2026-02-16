/**
 * Photo routes.
 *
 * GET    /api/jobs/:id/photos            — list photos for a job (paginated, filterable)
 * POST   /api/jobs/:id/photos/upload-url — generate presigned R2 upload URL
 * POST   /api/jobs/:id/photos            — confirm upload, trigger classification
 * PUT    /api/photos/:id                 — update photo (manual type override)
 * DELETE /api/photos/:id                 — delete photo from R2 + DB
 * GET    /api/photos/:id/url             — refresh presigned URLs for a photo
 */
import { Router, type Response } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { photos } from "../db/schema/photos.js";
import { jobs } from "../db/schema/jobs.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { photoUploadLimiter } from "../middleware/rate-limit.js";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  generateUploadUrl,
  generateDownloadUrl,
  downloadObject,
  uploadObject,
  deleteObject,
  buildPhotoKey,
  buildThumbnailKey,
} from "../services/r2.js";
import { generateThumbnail } from "../services/sharp.js";
import { classifyPhoto } from "../services/gemini.js";
import pLimit from "p-limit";

const router = Router();

/**
 * Concurrency limiter for background photo processing.
 * Caps concurrent Sharp + Gemini tasks to 3 to prevent OOM under burst uploads.
 */
const backgroundProcessingLimit = pLimit(3);

const VALID_PHOTO_TYPES = [
  "before", "after", "progress", "issue", "material", "measurement", "unclassified",
] as const;

const uploadUrlSchema = z.object({
  photoId: z.string().uuid("photoId must be a valid UUID"),
  contentType: z.literal("image/jpeg").optional().default("image/jpeg"),
});

const confirmUploadSchema = z.object({
  r2Key: z.string().min(1, "r2Key is required"),
  photoId: z.string().uuid("photoId must be a valid UUID"),
  takenAt: z.string().datetime({ message: "takenAt must be a valid ISO datetime" }),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  sizeBytes: z.number().int().positive().optional(),
});

const updatePhotoSchema = z.object({
  type: z.enum(VALID_PHOTO_TYPES),
});

/**
 * GET /api/jobs/:id/photos
 *
 * List photos for a job, paginated and filterable by type.
 * Query params:
 *   - type: filter by photo type (optional)
 *   - limit: page size (default 20, max 50)
 *   - cursor: UUID of last photo from previous page
 *
 * Returns thumbnailUrl and originalUrl with presigned download URLs.
 * Sorted by takenAt desc.
 */
router.get("/jobs/:id/photos", requireAuth, async (req, res: Response): Promise<void> => {
  const { dbUser } = req as AuthenticatedRequest;
  const jobId = req.params.id as string;

  const typeFilter = req.query.type as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string | undefined;

  try {
    // Verify job ownership
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, dbUser.id)))
      .limit(1);

    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const conditions: ReturnType<typeof eq>[] = [eq(photos.jobId, jobId)];

    if (typeFilter && VALID_PHOTO_TYPES.includes(typeFilter as (typeof VALID_PHOTO_TYPES)[number])) {
      conditions.push(eq(photos.type, typeFilter));
    }

    // Cursor-based pagination using composite (takenAt, id) for stable ordering
    if (cursor) {
      const [cursorPhoto] = await db
        .select()
        .from(photos)
        .where(eq(photos.id, cursor))
        .limit(1);

      if (cursorPhoto) {
        conditions.push(
          sql`(${photos.takenAt}, ${photos.id}) < (${cursorPhoto.takenAt}, ${cursorPhoto.id})`
        );
      }
    }

    const results = await db
      .select()
      .from(photos)
      .where(and(...conditions))
      .orderBy(desc(photos.takenAt), desc(photos.id))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const items = results.slice(0, limit);

    // Generate presigned download URLs for each photo
    const photosWithUrls = await Promise.all(
      items.map(async (photo) => {
        let thumbnailUrl: string | null = null;
        let originalUrl: string | null = null;

        try {
          if (photo.thumbnailR2Key) {
            thumbnailUrl = await generateDownloadUrl(photo.thumbnailR2Key);
          }
          originalUrl = await generateDownloadUrl(photo.r2Key);
        } catch (err) {
          console.error(`Failed to generate URLs for photo ${photo.id}:`, err);
        }

        return {
          id: photo.id,
          jobId: photo.jobId,
          r2Key: photo.r2Key,
          type: photo.type,
          confidence: photo.confidence,
          scene: photo.scene,
          trade: photo.trade,
          width: photo.width,
          height: photo.height,
          sizeBytes: photo.sizeBytes,
          takenAt: photo.takenAt.toISOString(),
          createdAt: photo.createdAt.toISOString(),
          thumbnailUrl,
          originalUrl,
        };
      })
    );

    res.json({
      photos: photosWithUrls,
      hasMore,
      cursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (error) {
    console.error("GET /api/jobs/:id/photos error:", error);
    res.status(500).json({ error: "Failed to fetch photos" });
  }
});

/**
 * POST /api/jobs/:id/photos/upload-url
 *
 * Generate a presigned R2 upload URL for direct client-to-R2 upload.
 * The client provides a photoId (UUID generated client-side) and gets back
 * the upload URL and R2 key to use.
 *
 * Rate limited to 100/day per user.
 */
router.post(
  "/jobs/:id/photos/upload-url",
  requireAuth,
  photoUploadLimiter,
  async (req, res: Response): Promise<void> => {
    const { dbUser } = req as AuthenticatedRequest;
    const jobId = req.params.id as string;

    const parsed = uploadUrlSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "validation_error",
        details: parsed.error.issues,
      });
      return;
    }

    try {
      // Verify job ownership
      const [job] = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.id, jobId), eq(jobs.userId, dbUser.id)))
        .limit(1);

      if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      const r2Key = buildPhotoKey(dbUser.clerkId, jobId, parsed.data.photoId);
      const uploadUrl = await generateUploadUrl(r2Key);

      res.json({ uploadUrl, r2Key });
    } catch (error) {
      console.error("POST /api/jobs/:id/photos/upload-url error:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  }
);

/**
 * POST /api/jobs/:id/photos
 *
 * Confirm a photo upload and trigger background processing:
 * 1. Insert photo record (type: "pending")
 * 2. Return immediately to client
 * 3. Background: download from R2, generate thumbnail, classify with Gemini
 *
 * Rate limited to 100/day per user.
 */
router.post(
  "/jobs/:id/photos",
  requireAuth,
  photoUploadLimiter,
  async (req, res: Response): Promise<void> => {
    const { dbUser } = req as AuthenticatedRequest;
    const jobId = req.params.id as string;

    const parsed = confirmUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "validation_error",
        details: parsed.error.issues,
      });
      return;
    }

    try {
      // Verify job ownership
      const [job] = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.id, jobId), eq(jobs.userId, dbUser.id)))
        .limit(1);

      if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      // Insert photo record with type "pending"
      const [newPhoto] = await db
        .insert(photos)
        .values({
          id: parsed.data.photoId,
          jobId,
          userId: dbUser.id,
          r2Key: parsed.data.r2Key,
          type: "pending",
          takenAt: new Date(parsed.data.takenAt),
          width: parsed.data.width ?? null,
          height: parsed.data.height ?? null,
          sizeBytes: parsed.data.sizeBytes ?? null,
        })
        .returning();

      // Return immediately -- client shows shimmer loading state
      res.status(201).json({
        photo: {
          id: newPhoto.id,
          jobId: newPhoto.jobId,
          type: newPhoto.type,
          takenAt: newPhoto.takenAt.toISOString(),
          createdAt: newPhoto.createdAt.toISOString(),
        },
      });

      // Fire-and-forget background processing (concurrency capped at 3)
      backgroundProcessingLimit(() =>
        processPhotoInBackground(
          newPhoto.id,
          parsed.data.r2Key,
          jobId,
          dbUser.clerkId
        )
      ).catch((err) =>
        console.error(`Background photo processing failed for ${newPhoto.id}:`, err)
      );
    } catch (error) {
      console.error("POST /api/jobs/:id/photos error:", error);
      res.status(500).json({ error: "Failed to confirm upload" });
    }
  }
);

/**
 * Background photo processing pipeline.
 *
 * Steps (per Andrei's tech approach Section 5-6):
 * 1. Download original from R2
 * 2. Generate 400px thumbnail via Sharp
 * 3. Upload thumbnail to R2
 * 4. Send to Gemini for classification (10s timeout)
 * 5. Update photo record with classification + thumbnail key
 * 6. Update job.lastPhotoAt and job.photoCount
 */
async function processPhotoInBackground(
  photoId: string,
  r2Key: string,
  jobId: string,
  clerkUserId: string
): Promise<void> {
  try {
    // Step 1: Download original from R2
    const originalBuffer = await downloadObject(r2Key);

    // Step 2-3: Generate and upload thumbnail
    const thumbnailBuffer = await generateThumbnail(originalBuffer);
    const thumbnailR2Key = buildThumbnailKey(clerkUserId, jobId, photoId);
    await uploadObject(thumbnailR2Key, thumbnailBuffer);

    // Update photo with thumbnail key
    await db
      .update(photos)
      .set({ thumbnailR2Key })
      .where(eq(photos.id, photoId));

    // Step 4: Classify with Gemini
    const classification = await classifyPhoto(originalBuffer);

    // Step 5: Update photo record with classification
    await db
      .update(photos)
      .set({
        type: classification.type,
        confidence: classification.confidence,
        scene: classification.scene,
        trade: classification.trade,
      })
      .where(eq(photos.id, photoId));

    // Step 6: Update job.lastPhotoAt and job.photoCount
    await db
      .update(jobs)
      .set({
        lastPhotoAt: new Date(),
        photoCount: sql`${jobs.photoCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId));

    console.log(`Photo ${photoId} processed: type=${classification.type}, confidence=${classification.confidence}`);
  } catch (error) {
    console.error(`Photo processing failed for ${photoId}:`, error);

    // Even on failure, mark the photo as unclassified (not pending forever)
    try {
      await db
        .update(photos)
        .set({ type: "unclassified" })
        .where(eq(photos.id, photoId));

      // Still update job counts even on classification failure
      await db
        .update(jobs)
        .set({
          lastPhotoAt: new Date(),
          photoCount: sql`${jobs.photoCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, jobId));
    } catch (updateError) {
      console.error(`Failed to update photo ${photoId} after processing error:`, updateError);
    }
  }
}

/**
 * PUT /api/photos/:id
 *
 * Update a photo's type (manual classification override).
 * Only the photo owner can update.
 */
router.put("/photos/:id", requireAuth, async (req, res: Response): Promise<void> => {
  const { dbUser } = req as AuthenticatedRequest;
  const photoId = req.params.id as string;

  const parsed = updatePhotoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
    });
    return;
  }

  try {
    // Verify ownership
    const [photo] = await db
      .select()
      .from(photos)
      .where(and(eq(photos.id, photoId), eq(photos.userId, dbUser.id)))
      .limit(1);

    if (!photo) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }

    const [updated] = await db
      .update(photos)
      .set({ type: parsed.data.type })
      .where(eq(photos.id, photoId))
      .returning();

    res.json({
      photo: {
        id: updated.id,
        jobId: updated.jobId,
        type: updated.type,
        confidence: updated.confidence,
        scene: updated.scene,
        trade: updated.trade,
        takenAt: updated.takenAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("PUT /api/photos/:id error:", error);
    res.status(500).json({ error: "Failed to update photo" });
  }
});

/**
 * DELETE /api/photos/:id
 *
 * Delete a photo from R2 (original + thumbnail) and the database.
 * Only the photo owner can delete. Decrements the job's photoCount.
 */
router.delete("/photos/:id", requireAuth, async (req, res: Response): Promise<void> => {
  const { dbUser } = req as AuthenticatedRequest;
  const photoId = req.params.id as string;

  try {
    // Verify ownership and get photo details for R2 cleanup
    const [photo] = await db
      .select()
      .from(photos)
      .where(and(eq(photos.id, photoId), eq(photos.userId, dbUser.id)))
      .limit(1);

    if (!photo) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }

    // Delete from database
    await db.delete(photos).where(eq(photos.id, photoId));

    // Decrement job photoCount
    await db
      .update(jobs)
      .set({
        photoCount: sql`GREATEST(${jobs.photoCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, photo.jobId));

    // Fire-and-forget: delete from R2
    const deletePromises: Promise<void>[] = [deleteObject(photo.r2Key)];
    if (photo.thumbnailR2Key) {
      deletePromises.push(deleteObject(photo.thumbnailR2Key));
    }
    Promise.all(deletePromises).catch((err) =>
      console.error(`R2 cleanup failed for photo ${photoId}:`, err)
    );

    res.status(200).json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/photos/:id error:", error);
    res.status(500).json({ error: "Failed to delete photo" });
  }
});

/**
 * GET /api/photos/:id/url
 *
 * Refresh presigned URLs for a specific photo.
 * Returns thumbnailUrl, originalUrl, and expiresAt.
 */
router.get("/photos/:id/url", requireAuth, async (req, res: Response): Promise<void> => {
  const { dbUser } = req as AuthenticatedRequest;
  const photoId = req.params.id as string;

  try {
    const [photo] = await db
      .select()
      .from(photos)
      .where(and(eq(photos.id, photoId), eq(photos.userId, dbUser.id)))
      .limit(1);

    if (!photo) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }

    const originalUrl = await generateDownloadUrl(photo.r2Key);
    const thumbnailUrl = photo.thumbnailR2Key
      ? await generateDownloadUrl(photo.thumbnailR2Key)
      : null;

    // URLs expire in 1 hour
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    res.json({ thumbnailUrl, originalUrl, expiresAt });
  } catch (error) {
    console.error("GET /api/photos/:id/url error:", error);
    res.status(500).json({ error: "Failed to generate URLs" });
  }
});

export default router;
