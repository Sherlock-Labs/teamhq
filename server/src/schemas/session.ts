import { z } from "zod";

export const SessionStatus = z.enum([
  "running",
  "completed",
  "failed",
  "stopped",
  "timed-out",
]);

export type SessionStatus = z.infer<typeof SessionStatus>;

export const SessionEventType = z.enum([
  "assistant_text",
  "tool_use",
  "tool_result",
  "system",
  "error",
]);

export type SessionEventType = z.infer<typeof SessionEventType>;

export const SessionEventSchema = z.object({
  id: z.number(),
  timestamp: z.string().datetime(),
  type: SessionEventType,
  data: z.record(z.unknown()),
});

export type SessionEvent = z.infer<typeof SessionEventSchema>;

export const SessionMetadataSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  status: SessionStatus,
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  durationMs: z.number().nullable(),
  eventCount: z.number(),
  exitCode: z.number().nullable(),
  error: z.string().nullable(),
  pid: z.number().nullable(),
});

export type SessionMetadata = z.infer<typeof SessionMetadataSchema>;
