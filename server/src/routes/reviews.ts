import { Router } from "express";
import { ZodError } from "zod";
import { formatZodError } from "./utils.js";
import {
  CreateReviewSchema,
  UpdateReviewSchema,
  VALID_GATES,
} from "../schemas/review.js";
import {
  createReview,
  getReview,
  updateReview,
  listReviews,
} from "../store/reviews.js";

const router = Router();

/**
 * GET /api/reviews
 * List all reviews. Optional query params:
 *   ?status=pending|approved|changes-requested|not-applicable
 *   ?projectSlug=review-gates
 */
router.get("/reviews", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const projectSlug = req.query.projectSlug as string | undefined;

    // Validate status filter if provided
    if (
      status &&
      !["pending", "approved", "changes-requested", "not-applicable"].includes(status)
    ) {
      res.status(400).json({
        error: "Invalid status filter",
        details: [
          {
            field: "status",
            message:
              "Must be one of: pending, approved, changes-requested, not-applicable",
          },
        ],
      });
      return;
    }

    const reviews = await listReviews({
      status: status || undefined,
      projectSlug: projectSlug || undefined,
    });
    res.json({ reviews });
  } catch (err) {
    console.error("Error listing reviews:", err);
    res.status(500).json({ error: "Failed to list reviews" });
  }
});

/**
 * GET /api/reviews/:id
 * Get a single review by ID.
 */
router.get("/reviews/:id", async (req, res) => {
  try {
    const review = await getReview(req.params.id);
    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }
    res.json(review);
  } catch (err) {
    console.error("Error getting review:", err);
    res.status(500).json({ error: "Failed to get review" });
  }
});

/**
 * POST /api/reviews
 * Create a review (called by heartbeat when a gate is reached).
 * Body: { projectId, projectSlug, projectName, gate, agent, summary, deliverables }
 */
router.post("/reviews", async (req, res) => {
  try {
    const parsed = CreateReviewSchema.parse(req.body);

    // Validate gate name
    if (!VALID_GATES.includes(parsed.gate as any)) {
      res.status(400).json({
        error: "Invalid gate name",
        details: [
          {
            field: "gate",
            message: `Must be one of: ${VALID_GATES.join(", ")}`,
          },
        ],
      });
      return;
    }

    const review = await createReview(parsed);
    res.status(201).json(review);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: "Validation failed",
        details: formatZodError(err),
      });
      return;
    }
    console.error("Error creating review:", err);
    res.status(500).json({ error: "Failed to create review" });
  }
});

/**
 * PATCH /api/reviews/:id
 * Update review status (approve or request changes).
 * Body: { status: "approved" | "changes-requested", feedback?: string }
 */
router.patch("/reviews/:id", async (req, res) => {
  try {
    // Check that the review exists first
    const existing = await getReview(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    // Only pending or changes-requested reviews can be acted on
    if (existing.status !== "pending" && existing.status !== "changes-requested") {
      res.status(409).json({
        error: `Cannot update review with status "${existing.status}". Only pending or changes-requested reviews can be updated.`,
      });
      return;
    }

    const parsed = UpdateReviewSchema.parse(req.body);

    const updated = await updateReview(req.params.id, {
      status: parsed.status,
      feedback: parsed.feedback ?? existing.feedback,
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: "Validation failed",
        details: formatZodError(err),
      });
      return;
    }
    console.error("Error updating review:", err);
    res.status(500).json({ error: "Failed to update review" });
  }
});

export default router;
