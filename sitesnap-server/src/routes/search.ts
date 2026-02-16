/**
 * Photo search route.
 *
 * GET /api/photos/search — search photos across all jobs
 */
import { Router, type Response } from "express";
import { db } from "../db/index.js";
import { photos } from "../db/schema/photos.js";
import { jobs } from "../db/schema/jobs.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { eq, and, desc, lt, gte, lte, ilike, sql } from "drizzle-orm";
import { generateDownloadUrl } from "../services/r2.js";

const router = Router();

/**
 * Escape SQL LIKE/ILIKE wildcard characters in user input.
 * Prevents users from injecting % or _ to force full table scans.
 */
function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

const VALID_PHOTO_TYPES = [
  "before", "after", "progress", "issue", "material", "measurement", "unclassified",
] as const;

/**
 * GET /api/photos/search
 *
 * Search photos across all of the authenticated user's jobs.
 * Query params:
 *   - q: search by job name (substring match, case-insensitive)
 *   - type: filter by photo type
 *   - dateFrom: ISO datetime (inclusive)
 *   - dateTo: ISO datetime (inclusive)
 *   - limit: page size (default 20, max 50)
 *   - cursor: UUID of last photo from previous page
 */
router.get("/", requireAuth, async (req, res: Response): Promise<void> => {
  const { dbUser } = req as AuthenticatedRequest;

  const q = req.query.q as string | undefined;
  const typeFilter = req.query.type as string | undefined;
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string | undefined;

  try {
    const conditions: ReturnType<typeof eq>[] = [eq(photos.userId, dbUser.id)];

    // Filter by photo type
    if (typeFilter && VALID_PHOTO_TYPES.includes(typeFilter as (typeof VALID_PHOTO_TYPES)[number])) {
      conditions.push(eq(photos.type, typeFilter));
    }

    // Filter by date range
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      if (!isNaN(fromDate.getTime())) {
        conditions.push(gte(photos.takenAt, fromDate));
      }
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      if (!isNaN(toDate.getTime())) {
        conditions.push(lte(photos.takenAt, toDate));
      }
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

    // Build query with optional job name filter
    let results;
    if (q && q.trim().length > 0) {
      // Join with jobs table to filter by job name
      results = await db
        .select({
          photo: photos,
          jobName: jobs.name,
        })
        .from(photos)
        .innerJoin(jobs, eq(photos.jobId, jobs.id))
        .where(and(...conditions, ilike(jobs.name, `%${escapeLikePattern(q.trim())}%`)))
        .orderBy(desc(photos.takenAt), desc(photos.id))
        .limit(limit + 1);
    } else {
      results = await db
        .select({
          photo: photos,
          jobName: jobs.name,
        })
        .from(photos)
        .innerJoin(jobs, eq(photos.jobId, jobs.id))
        .where(and(...conditions))
        .orderBy(desc(photos.takenAt), desc(photos.id))
        .limit(limit + 1);
    }

    const hasMore = results.length > limit;
    const items = results.slice(0, limit);

    // Generate presigned URLs
    const photosWithUrls = await Promise.all(
      items.map(async (item) => {
        let thumbnailUrl: string | null = null;
        let originalUrl: string | null = null;

        try {
          if (item.photo.thumbnailR2Key) {
            thumbnailUrl = await generateDownloadUrl(item.photo.thumbnailR2Key);
          }
          originalUrl = await generateDownloadUrl(item.photo.r2Key);
        } catch (err) {
          console.error(`Failed to generate URLs for photo ${item.photo.id}:`, err);
        }

        return {
          id: item.photo.id,
          jobId: item.photo.jobId,
          jobName: item.jobName,
          type: item.photo.type,
          confidence: item.photo.confidence,
          scene: item.photo.scene,
          trade: item.photo.trade,
          takenAt: item.photo.takenAt.toISOString(),
          thumbnailUrl,
          originalUrl,
        };
      })
    );

    res.json({
      photos: photosWithUrls,
      hasMore,
      cursor: hasMore ? items[items.length - 1].photo.id : null,
    });
  } catch (error) {
    console.error("GET /api/photos/search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
