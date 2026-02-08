import { z } from "zod";

export const SessionStatus = z.enum([
  "running",
  "completed",
  "failed",
  "stopped",
  "timed-out",
]);

export type SessionStatus = z.infer<typeof SessionStatus>;

export const RunnerState = z.enum(["processing", "idle", "ended"]);

export type RunnerState = z.infer<typeof RunnerState>;

export const SessionEventType = z.enum([
  "assistant_text",
  "tool_use",
  "tool_result",
  "system",
  "error",
  "turn_start",
  "turn_end",
  "waiting_for_input",
  "user_message",
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
  cliSessionId: z.string().nullable().default(null),
  turnCount: z.number().default(1),
  state: RunnerState.default("processing"),
});

export type SessionMetadata = z.infer<typeof SessionMetadataSchema>;
