import { z } from "zod";

export const ReviewStatus = z.enum([
  "pending",
  "approved",
  "changes-requested",
  "not-applicable",
]);

export type ReviewStatus = z.infer<typeof ReviewStatus>;

export const DeliverableSchema = z.object({
  type: z.enum(["doc", "code", "qa-report"]),
  path: z.string().min(1),
  title: z.string().min(1),
});

export type Deliverable = z.infer<typeof DeliverableSchema>;

export const ReviewSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().min(1),
  projectSlug: z.string().min(1),
  projectName: z.string().min(1),
  gate: z.string().min(1),
  status: ReviewStatus,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
  deliverables: z.array(DeliverableSchema),
  agent: z.string().min(1),
  summary: z.string().min(1),
  feedback: z.string().nullable(),
});

export type Review = z.infer<typeof ReviewSchema>;

/** Validation schema for POST /api/reviews — creating a review */
export const CreateReviewSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  projectSlug: z.string().min(1, "projectSlug is required"),
  projectName: z.string().min(1, "projectName is required"),
  gate: z.string().min(1, "gate is required"),
  agent: z.string().min(1, "agent is required"),
  summary: z.string().min(1, "summary is required"),
  deliverables: z.array(DeliverableSchema).min(1, "At least one deliverable is required"),
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

/** Valid gate names — the fixed set of pipeline checkpoints */
export const VALID_GATES = [
  "afterResearch",
  "afterRequirements",
  "afterArchitecture",
  "afterDesign",
  "afterBackend",
  "afterFrontend",
  "afterQA",
] as const;

export type GateName = (typeof VALID_GATES)[number];

/** Validation schema for PATCH /api/reviews/:id — updating review status */
export const UpdateReviewSchema = z.object({
  status: z.enum(["approved", "changes-requested"]),
  feedback: z.string().optional(),
}).refine(
  (data) => {
    if (data.status === "changes-requested" && !data.feedback) {
      return false;
    }
    return true;
  },
  { message: "Feedback is required when requesting changes", path: ["feedback"] },
);

export type UpdateReviewInput = z.infer<typeof UpdateReviewSchema>;
