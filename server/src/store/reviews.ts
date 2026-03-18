import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";
import type { Review, CreateReviewInput } from "../schemas/review.js";

const DATA_DIR = join(import.meta.dirname, "../../../data/reviews");

async function ensureDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

function reviewPath(id: string): string {
  return join(DATA_DIR, `${id}.json`);
}

/**
 * Create a new review record.
 * Called by the heartbeat when a pipeline gate is reached.
 */
export async function createReview(input: CreateReviewInput): Promise<Review> {
  await ensureDir();
  const now = new Date().toISOString();
  const review: Review = {
    id: uuidv4(),
    projectId: input.projectId,
    projectSlug: input.projectSlug,
    projectName: input.projectName,
    gate: input.gate,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    deliverables: input.deliverables,
    agent: input.agent,
    summary: input.summary,
    feedback: null,
  };
  await writeFile(reviewPath(review.id), JSON.stringify(review, null, 2));
  return review;
}

/**
 * Get a single review by ID. Returns null if not found.
 */
export async function getReview(id: string): Promise<Review | null> {
  try {
    const raw = await readFile(reviewPath(id), "utf-8");
    return JSON.parse(raw) as Review;
  } catch {
    return null;
  }
}

/**
 * Update a review record with partial updates.
 * Automatically sets updatedAt. Sets resolvedAt when status becomes approved or not-applicable.
 */
export async function updateReview(
  id: string,
  updates: Partial<Pick<Review, "status" | "feedback">>,
): Promise<Review> {
  const review = await getReview(id);
  if (!review) {
    throw new Error(`Review ${id} not found`);
  }

  const now = new Date().toISOString();
  const updated: Review = {
    ...review,
    ...updates,
    updatedAt: now,
  };

  // Set resolvedAt when transitioning to a terminal status
  if (updates.status === "approved" || updates.status === "not-applicable") {
    updated.resolvedAt = now;
  }

  await writeFile(reviewPath(id), JSON.stringify(updated, null, 2));
  return updated;
}

/**
 * List all reviews with optional filters.
 * Reads all files in data/reviews/, applies filters, sorts by createdAt descending.
 * At the expected volume (<50 files), this is efficient enough.
 */
export async function listReviews(filter?: {
  status?: string;
  projectSlug?: string;
}): Promise<Review[]> {
  await ensureDir();
  const files = await readdir(DATA_DIR);
  const reviews: Review[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(DATA_DIR, file), "utf-8");
      const review = JSON.parse(raw) as Review;

      // Apply filters
      if (filter?.status && review.status !== filter.status) continue;
      if (filter?.projectSlug && review.projectSlug !== filter.projectSlug) continue;

      reviews.push(review);
    } catch {
      // Skip corrupt files
    }
  }

  // Sort by createdAt descending (most recent first)
  reviews.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return reviews;
}

/**
 * Get all pending or changes-requested reviews for a specific project.
 * Convenience wrapper used by the heartbeat to check if a gate blocks progress.
 */
export async function getPendingReviewsForProject(
  projectSlug: string,
): Promise<Review[]> {
  await ensureDir();
  const files = await readdir(DATA_DIR);
  const reviews: Review[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(DATA_DIR, file), "utf-8");
      const review = JSON.parse(raw) as Review;

      if (
        review.projectSlug === projectSlug &&
        (review.status === "pending" || review.status === "changes-requested")
      ) {
        reviews.push(review);
      }
    } catch {
      // Skip corrupt files
    }
  }

  return reviews;
}
