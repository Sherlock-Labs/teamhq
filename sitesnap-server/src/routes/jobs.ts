/**
 * Job CRUD routes.
 *
 * GET    /api/jobs     — list jobs (paginated, filterable by status)
 * POST   /api/jobs     — create job (enforces free tier limit)
 * GET    /api/jobs/:id — job details
 * PUT    /api/jobs/:id — update job (name, address, status)
 * DELETE /api/jobs/:id — hard delete job + all photos from R2 + DB
 */
import { Router, type Response } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { jobs } from "../db/schema/jobs.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { eq, and, desc, lt, count, sql } from "drizzle-orm";
import { deleteObjectsByPrefix, buildJobPrefix } from "../services/r2.js";

const router = Router();

const FREE_TIER_JOB_LIMIT = 10;

const createJobSchema = z.object({
  name: z.string().min(1, "Job name is required").max(100, "Job name must be 100 characters or fewer"),
  address: z.string().max(500).nullable().optional(),
});

const updateJobSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(500).nullable().optional(),
  status: z.enum(["active", "archived"]).optional(),
});

/**
 * GET /api/jobs
 *
 * List all jobs for the authenticated user.
 * Query params:
 *   - status: "active" | "archived" (optional filter)
 *   - limit: number (default 20, max 50)
 *   - cursor: UUID of the last job from previous page
 *
 * Sorted by lastPhotoAt desc (most recent activity first),
 * falling back to createdAt desc for jobs with no photos.
 */
router.get("/", requireAuth, async (req, res: Response): Promise<void> => {
  const { dbUser } = req as AuthenticatedRequest;

  const statusFilter = req.query.status as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string | undefined;

  try {
    const conditions = [eq(jobs.userId, dbUser.id)];

    if (statusFilter === "active" || statusFilter === "archived") {
      conditions.push(eq(jobs.status, statusFilter));
    }

    if (cursor) {
      // Cursor-based pagination: get the cursor job's sort value
      const [cursorJob] = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, cursor))
        .limit(1);

      if (cursorJob) {
        const sortValue = cursorJob.lastPhotoAt || cursorJob.createdAt;
        conditions.push(
          lt(sql`COALESCE(${jobs.lastPhotoAt}, ${jobs.createdAt})`, sortValue)
        );
      }
    }

    const results = await db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(sql`COALESCE(${jobs.lastPhotoAt}, ${jobs.createdAt})`))
      .limit(limit + 1); // Fetch one extra to determine if there are more

    const hasMore = results.length > limit;
    const items = results.slice(0, limit);

    res.json({
      jobs: items.map((job) => ({
        id: job.id,
        name: job.name,
        address: job.address,
        status: job.status,
        photoCount: job.photoCount,
        lastPhotoAt: job.lastPhotoAt?.toISOString() ?? null,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      })),
      hasMore,
      cursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (error) {
    console.error("GET /api/jobs error:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

/**
 * POST /api/jobs
 *
 * Create a new job. Enforces the free tier limit server-side.
 * Returns 402 if a free-tier user has 10+ active jobs.
 */
router.post("/", requireAuth, async (req, res: Response): Promise<void> => {
  const { dbUser } = req as AuthenticatedRequest;

  const parsed = createJobSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
    });
    return;
  }

  try {
    // Free tier enforcement: count active jobs
    if (dbUser.plan === "free") {
      const [activeJobResult] = await db
        .select({ value: count() })
        .from(jobs)
        .where(and(eq(jobs.userId, dbUser.id), eq(jobs.status, "active")));

      const activeJobCount = activeJobResult?.value ?? 0;

      if (activeJobCount >= FREE_TIER_JOB_LIMIT) {
        res.status(402).json({
          error: "free_tier_exceeded",
          activeJobs: activeJobCount,
          limit: FREE_TIER_JOB_LIMIT,
          message: "Free tier limit reached. Subscribe to create unlimited jobs.",
        });
        return;
      }
    }

    const [newJob] = await db
      .insert(jobs)
      .values({
        userId: dbUser.id,
        name: parsed.data.name,
        address: parsed.data.address ?? null,
        status: "active",
      })
      .returning();

    res.status(201).json({
      job: {
        id: newJob.id,
        name: newJob.name,
        address: newJob.address,
        status: newJob.status,
        photoCount: newJob.photoCount,
        lastPhotoAt: null,
        createdAt: newJob.createdAt.toISOString(),
        updatedAt: newJob.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("POST /api/jobs error:", error);
    res.status(500).json({ error: "Failed to create job" });
  }
});

/**
 * GET /api/jobs/:id
 *
 * Get job details. Only returns jobs owned by the authenticated user.
 */
router.get("/:id", requireAuth, async (req, res: Response): Promise<void> => {
  const { dbUser } = req as AuthenticatedRequest;
  const jobId = req.params.id as string;

  try {
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, dbUser.id)))
      .limit(1);

    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    res.json({
      job: {
        id: job.id,
        name: job.name,
        address: job.address,
        status: job.status,
        photoCount: job.photoCount,
        lastPhotoAt: job.lastPhotoAt?.toISOString() ?? null,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("GET /api/jobs/:id error:", error);
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

/**
 * PUT /api/jobs/:id
 *
 * Update a job's name, address, or status.
 * Status change to "archived" frees up a free-tier slot.
 */
router.put("/:id", requireAuth, async (req, res: Response): Promise<void> => {
  const { dbUser } = req as AuthenticatedRequest;
  const jobId = req.params.id as string;

  const parsed = updateJobSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
    });
    return;
  }

  try {
    // Verify ownership
    const [existingJob] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, dbUser.id)))
      .limit(1);

    if (!existingJob) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.address !== undefined) updates.address = parsed.data.address;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;

    const [updated] = await db
      .update(jobs)
      .set(updates)
      .where(eq(jobs.id, jobId))
      .returning();

    res.json({
      job: {
        id: updated.id,
        name: updated.name,
        address: updated.address,
        status: updated.status,
        photoCount: updated.photoCount,
        lastPhotoAt: updated.lastPhotoAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("PUT /api/jobs/:id error:", error);
    res.status(500).json({ error: "Failed to update job" });
  }
});

/**
 * DELETE /api/jobs/:id
 *
 * Hard delete a job and all associated photos.
 * - Deletes all photo records from DB (cascade)
 * - Deletes all photo files from R2 (background task)
 * - Deletes the job record from DB
 *
 * This is irreversible.
 */
router.delete("/:id", requireAuth, async (req, res: Response): Promise<void> => {
  const { dbUser } = req as AuthenticatedRequest;
  const jobId = req.params.id as string;

  try {
    // Verify ownership
    const [existingJob] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, dbUser.id)))
      .limit(1);

    if (!existingJob) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    // Delete the job from DB (photos cascade-delete via FK constraint)
    await db.delete(jobs).where(eq(jobs.id, jobId));

    // Fire-and-forget: clean up R2 objects for this job
    const r2Prefix = buildJobPrefix(dbUser.clerkId, jobId);
    deleteObjectsByPrefix(r2Prefix).catch((err) =>
      console.error(`R2 cleanup failed for job ${jobId}:`, err)
    );

    res.status(200).json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/jobs/:id error:", error);
    res.status(500).json({ error: "Failed to delete job" });
  }
});

export default router;
