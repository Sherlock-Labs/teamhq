import { Router } from "express";
import { listMeetings, getMeeting, getMeetingCount } from "../store/meetings.js";
import { RunMeetingSchema } from "../schemas/meeting.js";
import { runMeeting } from "../meetings/runner.js";
import { ZodError } from "zod";

const router = Router();

function formatZodError(err: ZodError) {
  return err.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

// List all meetings (lean, no transcript)
router.get("/meetings", async (_req, res) => {
  try {
    const meetings = await listMeetings();
    res.json({ meetings });
  } catch (err) {
    console.error("Error listing meetings:", err);
    res.status(500).json({ error: "Failed to list meetings" });
  }
});

// Get a single meeting (full payload including transcript)
router.get("/meetings/:id", async (req, res) => {
  try {
    const meeting = await getMeeting(req.params.id);
    res.json(meeting);
  } catch {
    res.status(404).json({ error: "Meeting not found" });
  }
});

// Trigger a new meeting
router.post("/meetings/run", async (req, res) => {
  try {
    const parsed = RunMeetingSchema.parse(req.body);

    // Validate charter-first guard BEFORE sending 202
    if (parsed.type !== "charter") {
      const count = await getMeetingCount();
      if (count === 0) {
        res.status(400).json({
          error:
            "The first meeting must be a charter meeting. Run a charter meeting first to establish the team's mission and priorities.",
        });
        return;
      }
    }

    // Check if another meeting is already running
    const existing = await listMeetings();
    const hasRunning = existing.some((m) => m.status === "running");
    if (hasRunning) {
      res.status(409).json({
        error: "A meeting is already in progress. Wait for it to complete.",
      });
      return;
    }

    // All validation passed — return 202 and run in background
    res.status(202).json({
      message: `Starting ${parsed.type} meeting...`,
      type: parsed.type,
    });

    // Run meeting asynchronously (don't await)
    runMeeting(parsed.type, parsed.agenda).catch((err) => {
      console.error("[meeting-route] Background meeting failed:", err);
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
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("Error starting meeting:", err);
    res.status(500).json({ error: "Failed to start meeting" });
  }
});

export default router;
