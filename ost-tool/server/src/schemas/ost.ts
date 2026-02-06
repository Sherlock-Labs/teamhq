import { z } from "zod";

// --- OST Tree ---

export const OSTNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["outcome", "opportunity", "solution", "experiment"]),
  label: z.string(),
  description: z.string(),
  parentId: z.string().nullable(),
  children: z.array(z.string()),
});

export type OSTNode = z.infer<typeof OSTNodeSchema>;

export const OSTTreeSchema = z.object({
  nodes: z.array(OSTNodeSchema),
});

export type OSTTree = z.infer<typeof OSTTreeSchema>;

// JSON Schema version for claude --json-schema
export const ostTreeJsonSchema = {
  type: "object",
  properties: {
    nodes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: {
            type: "string",
            enum: ["outcome", "opportunity", "solution", "experiment"],
          },
          label: { type: "string" },
          description: { type: "string" },
          parentId: { type: ["string", "null"] },
          children: { type: "array", items: { type: "string" } },
        },
        required: ["id", "type", "label", "description", "parentId", "children"],
      },
    },
  },
  required: ["nodes"],
};

// --- Debate Result ---

export const DebateResultSchema = z.object({
  perspective: z.string(),
  assessment: z.string(),
  score: z.number().min(1).max(10),
  keyInsight: z.string(),
  topArguments: z.array(z.string()),
  risks: z.array(z.string()),
});

export type DebateResult = z.infer<typeof DebateResultSchema>;

export const debateResultJsonSchema = {
  type: "object",
  properties: {
    perspective: { type: "string" },
    assessment: { type: "string" },
    score: { type: "number", minimum: 1, maximum: 10 },
    keyInsight: { type: "string" },
    topArguments: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
  },
  required: ["perspective", "assessment", "score", "keyInsight", "topArguments", "risks"],
};

// --- Recommendation ---

export const SolutionImpactSchema = z.object({
  solutionId: z.string(),
  solutionLabel: z.string(),
  impactScore: z.number().min(1).max(10),
  impactRationale: z.string(),
});

export type SolutionImpact = z.infer<typeof SolutionImpactSchema>;

export const RecommendationSchema = z.object({
  recommendation: z.string(),
  rationale: z.string(),
  risks: z.array(z.string()),
  firstSteps: z.array(z.string()),
  deprioritize: z.array(z.string()),
  confidence: z.number().min(1).max(10),
  solutionImpacts: z.array(SolutionImpactSchema),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

export const recommendationJsonSchema = {
  type: "object",
  properties: {
    recommendation: { type: "string" },
    rationale: { type: "string" },
    risks: { type: "array", items: { type: "string" } },
    firstSteps: { type: "array", items: { type: "string" } },
    deprioritize: { type: "array", items: { type: "string" } },
    confidence: { type: "number", minimum: 1, maximum: 10 },
    solutionImpacts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          solutionId: { type: "string" },
          solutionLabel: { type: "string" },
          impactScore: { type: "number", minimum: 1, maximum: 10 },
          impactRationale: { type: "string" },
        },
        required: ["solutionId", "solutionLabel", "impactScore", "impactRationale"],
      },
    },
  },
  required: [
    "recommendation",
    "rationale",
    "risks",
    "firstSteps",
    "deprioritize",
    "confidence",
    "solutionImpacts",
  ],
};

// --- Session ---

export const SessionSchema = z.object({
  id: z.string(),
  goal: z.string(),
  context: z.string(),
  createdAt: z.string(),
  ost: OSTTreeSchema.optional(),
  selectedSolutions: z.array(z.string()).optional(),
  debate: z.array(DebateResultSchema).optional(),
  recommendation: RecommendationSchema.optional(),
});

export type Session = z.infer<typeof SessionSchema>;
