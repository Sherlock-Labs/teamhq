import { runClaude } from "../meetings/claude-runner.js";
import { MeetingOutputJsonSchema } from "../schemas/meeting.js";
import type { TranscriptEntry } from "../schemas/meeting.js";
import { buildPostProcessPrompt } from "./prompt.js";

/**
 * Output shape from Claude post-processing. Matches MeetingOutputJsonSchema.
 */
export interface InterviewPostProcessResult {
  summary: string;
  keyTakeaways: string[];
  transcript: TranscriptEntry[];
  decisions: Array<{
    description: string;
    rationale: string;
    participants: string[];
  }>;
  actionItems: Array<{
    owner: string;
    description: string;
    priority: "high" | "medium" | "low";
  }>;
  mood: string;
  nextMeetingTopics: string[];
}

/**
 * Runs Claude post-processing on an interview transcript.
 *
 * Produces the same structured output as other meeting types:
 * summary, keyTakeaways, decisions, actionItems, mood, nextMeetingTopics, transcript.
 *
 * Uses the existing runClaude() infrastructure and MeetingOutputJsonSchema.
 */
export async function postProcessInterview(
  topic: string,
  context: string | undefined,
  transcript: TranscriptEntry[],
): Promise<InterviewPostProcessResult> {
  const transcriptText = transcript
    .map((t) => `${t.speaker} (${t.role}): ${t.text}`)
    .join("\n");

  const prompt = buildPostProcessPrompt(topic, context, transcriptText);

  console.log(
    `[interview-post-process] Running Claude on ${transcript.length} transcript entries...`,
  );

  const result = (await runClaude(prompt, {
    jsonSchema: MeetingOutputJsonSchema,
    timeoutMs: 120_000, // 2 minute timeout
  })) as InterviewPostProcessResult;

  console.log("[interview-post-process] Claude post-processing complete");

  return result;
}
