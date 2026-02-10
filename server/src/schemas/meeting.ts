import { z } from "zod";

export const MeetingType = z.enum(["charter", "weekly", "custom", "interview"]);
export type MeetingType = z.infer<typeof MeetingType>;

/** All valid agent keys — used for participant validation on custom meetings */
export const VALID_AGENT_KEYS = new Set([
  "product-manager", "technical-architect", "product-designer",
  "frontend-developer", "backend-developer", "qa",
  "product-marketer", "product-researcher", "technical-researcher",
  "technical-writer", "data-analyst", "ai-engineer",
  "mobile-developer-1", "mobile-developer-2",
  "frontend-interactions", "frontend-responsive", "frontend-accessibility",
  "payments-engineer",
]);

export const MeetingStatus = z.enum(["running", "completed", "failed"]);
export type MeetingStatus = z.infer<typeof MeetingStatus>;

export const TranscriptEntrySchema = z.object({
  speaker: z.string(),
  role: z.string(),
  text: z.string(),
});

export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;

export const DecisionSchema = z.object({
  description: z.string(),
  rationale: z.string(),
  participants: z.array(z.string()),
});

export type Decision = z.infer<typeof DecisionSchema>;

export const ActionItemSchema = z.object({
  owner: z.string(),
  description: z.string(),
  priority: z.enum(["high", "medium", "low"]),
});

export type ActionItem = z.infer<typeof ActionItemSchema>;

export const InterviewConfigSchema = z.object({
  topic: z.string(),
  context: z.string().optional(),
  voiceName: z.string().optional(),
  durationSeconds: z.number().optional(),
  elevenLabsConversationId: z.string().optional(),
});

export type InterviewConfig = z.infer<typeof InterviewConfigSchema>;

export const MeetingSchema = z.object({
  id: z.string(),
  type: MeetingType,
  status: MeetingStatus,
  meetingNumber: z.number().int().positive(),
  scheduledAt: z.string().datetime().nullable(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  durationMs: z.number().nullable(),
  error: z.string().nullable(),
  summary: z.string().nullable(),
  keyTakeaways: z.array(z.string()).default([]),
  transcript: z.array(TranscriptEntrySchema).default([]),
  decisions: z.array(DecisionSchema).default([]),
  actionItems: z.array(ActionItemSchema).default([]),
  mood: z.string().nullable(),
  nextMeetingTopics: z.array(z.string()).default([]),
  participants: z.array(z.string()).default([]),
  instructions: z.string().nullable().default(null),
  interviewConfig: InterviewConfigSchema.nullable().default(null),
});

export type Meeting = z.infer<typeof MeetingSchema>;

export const RunMeetingSchema = z.object({
  type: MeetingType,
  agenda: z.string().optional(),
  participants: z.array(z.string()).min(2).max(6).optional(),
  instructions: z.string().min(1).optional(),
}).refine(
  (data) => {
    if (data.type === "custom") {
      return data.participants && data.participants.length >= 2 && data.instructions;
    }
    return true;
  },
  { message: "Custom meetings require participants (2-6) and instructions" }
);

export type RunMeetingInput = z.infer<typeof RunMeetingSchema>;

/** Validation schema for POST /api/interviews/start */
export const StartInterviewSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  context: z.string().optional(),
});

export type StartInterviewInput = z.infer<typeof StartInterviewSchema>;

/** Validation schema for POST /api/interviews/:id/complete */
export const CompleteInterviewSchema = z.object({
  transcript: z.array(TranscriptEntrySchema).min(1, "Transcript must not be empty"),
  durationSeconds: z.number().positive(),
});

export type CompleteInterviewInput = z.infer<typeof CompleteInterviewSchema>;

/** Validation schema for POST /api/interviews/:id/fail */
export const FailInterviewSchema = z.object({
  error: z.string().min(1, "Error message is required"),
  partialTranscript: z.array(TranscriptEntrySchema).optional(),
});

export type FailInterviewInput = z.infer<typeof FailInterviewSchema>;

/**
 * JSON Schema for the structured output from claude --json-schema.
 * Defines the shape of the meeting output that Claude produces.
 */
export const MeetingOutputJsonSchema = {
  type: "object",
  required: [
    "summary",
    "keyTakeaways",
    "transcript",
    "decisions",
    "actionItems",
    "mood",
    "nextMeetingTopics",
  ],
  properties: {
    summary: {
      type: "string",
      description: "A 2-3 sentence summary of the meeting.",
    },
    keyTakeaways: {
      type: "array",
      items: { type: "string" },
      description: "3-5 key takeaways from the meeting.",
    },
    transcript: {
      type: "array",
      items: {
        type: "object",
        required: ["speaker", "role", "text"],
        properties: {
          speaker: { type: "string", description: "Agent name (e.g. Thomas)" },
          role: { type: "string", description: "Agent role (e.g. Product Manager)" },
          text: { type: "string", description: "What they said" },
        },
      },
      description:
        "The full meeting transcript as a sequence of statements. Should have 20-40 entries showing natural back-and-forth discussion.",
    },
    decisions: {
      type: "array",
      items: {
        type: "object",
        required: ["description", "rationale", "participants"],
        properties: {
          description: { type: "string" },
          rationale: { type: "string" },
          participants: {
            type: "array",
            items: { type: "string" },
            description: "Names of agents who contributed to this decision.",
          },
        },
      },
      description: "Key decisions made during the meeting.",
    },
    actionItems: {
      type: "array",
      items: {
        type: "object",
        required: ["owner", "description", "priority"],
        properties: {
          owner: { type: "string", description: "Agent name responsible" },
          description: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
        },
      },
      description: "Action items assigned during the meeting.",
    },
    mood: {
      type: "string",
      description:
        "Overall meeting mood in 1-3 words (e.g. 'Energized and focused', 'Cautiously optimistic', 'Tense but productive').",
    },
    nextMeetingTopics: {
      type: "array",
      items: { type: "string" },
      description: "Topics to revisit in the next meeting.",
    },
  },
};
