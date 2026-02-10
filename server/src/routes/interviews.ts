import { Router } from "express";
import { ZodError } from "zod";
import {
  StartInterviewSchema,
  CompleteInterviewSchema,
  FailInterviewSchema,
} from "../schemas/meeting.js";
import {
  createMeeting,
  getMeeting,
  updateMeeting,
} from "../store/meetings.js";
import { listProjects } from "../store/projects.js";
import { getRecentMeetings } from "../store/meetings.js";
import { getSignedUrl } from "../interviews/signed-url.js";
import {
  buildInterviewSystemInstruction,
  buildFirstMessage,
  formatProjectSummaries,
  formatMeetingSummaries,
} from "../interviews/prompt.js";
import { postProcessInterview } from "../interviews/post-process.js";

const router = Router();

function formatZodError(err: ZodError) {
  return err.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

/**
 * POST /api/interviews/start
 *
 * Creates an interview meeting record, generates an ElevenLabs signed URL,
 * and returns the signed URL + prompt override + first message to the frontend.
 *
 * The frontend uses the signed URL to start an ElevenLabs Conversational AI session.
 */
router.post("/interviews/start", async (req, res) => {
  try {
    // Validate request body
    const parsed = StartInterviewSchema.parse(req.body);

    // Gather context for the system instruction
    let projectSummaries: string | undefined;
    let meetingSummaries: string | undefined;
    try {
      const projects = await listProjects();
      projectSummaries = formatProjectSummaries(projects);
    } catch {
      // Non-fatal: proceed without project context
    }
    try {
      const recentMeetings = await getRecentMeetings(3);
      meetingSummaries = formatMeetingSummaries(recentMeetings);
    } catch {
      // Non-fatal: proceed without meeting context
    }

    // Build the system instruction for prompt override
    const promptOverride = buildInterviewSystemInstruction(
      parsed.topic,
      parsed.context,
      projectSummaries,
      meetingSummaries,
    );

    // Generate ElevenLabs signed URL
    const signedUrl = await getSignedUrl();

    // Generate topic-specific first message
    const firstMessage = buildFirstMessage(parsed.topic);

    // Create meeting record in "running" state
    const meeting = await createMeeting(
      "interview",
      ["ceo", "ai-interviewer"],
      null,
      {
        topic: parsed.topic,
        context: parsed.context,
      },
    );

    console.log(
      `[interviews] Started interview #${meeting.meetingNumber} (${meeting.id}) — topic: "${parsed.topic}"`,
    );

    // Return signed URL, prompt override, and first message for the frontend
    res.json({
      meetingId: meeting.id,
      signedUrl,
      promptOverride,
      firstMessage,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: "Validation failed",
        details: formatZodError(err),
      });
      return;
    }
    if (err instanceof Error) {
      console.error("[interviews] Start failed:", err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    console.error("[interviews] Start failed:", err);
    res.status(500).json({ error: "Failed to start interview" });
  }
});

/**
 * POST /api/interviews/:id/complete
 *
 * Receives the assembled transcript from the frontend after the interview ends.
 * Saves the raw transcript immediately, then runs Claude post-processing.
 * If post-processing fails, the raw transcript is still preserved.
 */
router.post("/interviews/:id/complete", async (req, res) => {
  try {
    // Validate request body
    const parsed = CompleteInterviewSchema.parse(req.body);

    // Validate meeting exists and is a running interview
    let meeting;
    try {
      meeting = await getMeeting(req.params.id);
    } catch {
      res.status(404).json({ error: "Meeting not found" });
      return;
    }

    if (meeting.type !== "interview") {
      res.status(409).json({ error: "Meeting is not an interview" });
      return;
    }

    if (meeting.status !== "running") {
      res.status(409).json({ error: "Interview is not in running state" });
      return;
    }

    const durationMs = parsed.durationSeconds * 1000;

    // Save raw transcript immediately (in case post-processing fails)
    await updateMeeting(meeting.id, {
      transcript: parsed.transcript,
      interviewConfig: {
        ...meeting.interviewConfig!,
        durationSeconds: parsed.durationSeconds,
      },
    });

    console.log(
      `[interviews] Received transcript for interview #${meeting.meetingNumber} (${parsed.transcript.length} entries, ${parsed.durationSeconds}s)`,
    );

    // Run Claude post-processing
    try {
      const topic = meeting.interviewConfig?.topic || "Interview";
      const context = meeting.interviewConfig?.context;

      const result = await postProcessInterview(topic, context, parsed.transcript);

      // Update with full structured output
      await updateMeeting(meeting.id, {
        status: "completed",
        completedAt: new Date().toISOString(),
        durationMs,
        summary: result.summary,
        keyTakeaways: result.keyTakeaways,
        transcript: parsed.transcript, // Keep the original transcript, not Claude's copy
        decisions: result.decisions,
        actionItems: result.actionItems,
        mood: result.mood,
        nextMeetingTopics: result.nextMeetingTopics,
      });

      console.log(
        `[interviews] Interview #${meeting.meetingNumber} completed with summary`,
      );
    } catch (postProcessErr) {
      // Post-processing failed — save raw transcript without structured output
      console.error(
        "[interviews] Claude post-processing failed, saving raw transcript:",
        postProcessErr instanceof Error ? postProcessErr.message : postProcessErr,
      );

      await updateMeeting(meeting.id, {
        status: "completed",
        completedAt: new Date().toISOString(),
        durationMs,
        // transcript was already saved above
      });
    }

    res.json({
      meetingId: meeting.id,
      status: "completed",
    });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: "Validation failed",
        details: formatZodError(err),
      });
      return;
    }
    if (err instanceof Error) {
      console.error("[interviews] Complete failed:", err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    console.error("[interviews] Complete failed:", err);
    res.status(500).json({ error: "Failed to complete interview" });
  }
});

/**
 * POST /api/interviews/:id/fail
 *
 * Marks an interview as failed. Called when the WebSocket connection dies
 * unrecoverably or the user's browser closes mid-interview.
 *
 * This is a safety net — without it, a crashed interview would stay in
 * "running" state forever, blocking future meetings.
 */
router.post("/interviews/:id/fail", async (req, res) => {
  try {
    // Validate request body
    const parsed = FailInterviewSchema.parse(req.body);

    // Validate meeting exists
    let meeting;
    try {
      meeting = await getMeeting(req.params.id);
    } catch {
      res.status(404).json({ error: "Meeting not found" });
      return;
    }

    if (meeting.type !== "interview") {
      res.status(409).json({ error: "Meeting is not an interview" });
      return;
    }

    // Update meeting with failed status and partial transcript if provided
    const updates: Record<string, unknown> = {
      status: "failed",
      completedAt: new Date().toISOString(),
      error: parsed.error,
    };

    if (parsed.partialTranscript && parsed.partialTranscript.length > 0) {
      updates.transcript = parsed.partialTranscript;
    }

    await updateMeeting(meeting.id, updates);

    console.log(
      `[interviews] Interview #${meeting.meetingNumber} failed: ${parsed.error}`,
    );

    res.json({
      meetingId: meeting.id,
      status: "failed",
    });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: "Validation failed",
        details: formatZodError(err),
      });
      return;
    }
    if (err instanceof Error) {
      console.error("[interviews] Fail endpoint error:", err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    console.error("[interviews] Fail endpoint error:", err);
    res.status(500).json({ error: "Failed to mark interview as failed" });
  }
});

export default router;
