import { createMeeting, updateMeeting, getMeetingCount } from "../store/meetings.js";
import { MeetingOutputJsonSchema } from "../schemas/meeting.js";
import type { Meeting, MeetingType } from "../schemas/meeting.js";
import { gatherMeetingContext } from "./context.js";
import { buildMeetingPrompt } from "./prompt.js";
import { runClaude } from "./claude-runner.js";

/**
 * Runs a full team meeting simulation.
 * Creates a meeting record, gathers context, builds prompt, calls Claude,
 * and updates the meeting with the structured output.
 */
export async function runMeeting(
  type: MeetingType,
  agenda?: string
): Promise<Meeting> {
  // Guard: first meeting must be charter
  if (type !== "charter") {
    const count = await getMeetingCount();
    if (count === 0) {
      throw new Error(
        "The first meeting must be a charter meeting. Run a charter meeting first to establish the team's mission and priorities."
      );
    }
  }

  // Create the meeting record in "running" state
  const meeting = await createMeeting(type);
  const startTime = Date.now();

  console.log(
    `[meeting-runner] Starting ${type} meeting #${meeting.meetingNumber} (${meeting.id})`
  );

  try {
    // Gather context
    const context = await gatherMeetingContext();

    // Build the prompt
    const prompt = buildMeetingPrompt(type, context, agenda);

    console.log(
      `[meeting-runner] Prompt built (${prompt.length} chars), calling Claude...`
    );

    // Call Claude with structured output
    const output = (await runClaude(prompt, {
      jsonSchema: MeetingOutputJsonSchema,
      timeoutMs: 600_000, // 10 minute timeout — meetings take a while
    })) as {
      summary: string;
      keyTakeaways: string[];
      transcript: Array<{ speaker: string; role: string; text: string }>;
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
    };

    const durationMs = Date.now() - startTime;

    console.log(
      `[meeting-runner] Meeting completed in ${Math.round(durationMs / 1000)}s`
    );

    // Update meeting with results
    return await updateMeeting(meeting.id, {
      status: "completed",
      completedAt: new Date().toISOString(),
      durationMs,
      summary: output.summary,
      keyTakeaways: output.keyTakeaways,
      transcript: output.transcript,
      decisions: output.decisions,
      actionItems: output.actionItems,
      mood: output.mood,
      nextMeetingTopics: output.nextMeetingTopics,
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error(`[meeting-runner] Meeting failed: ${errorMessage}`);

    // Update meeting with error
    return await updateMeeting(meeting.id, {
      status: "failed",
      completedAt: new Date().toISOString(),
      durationMs,
      error: errorMessage,
    });
  }
}
