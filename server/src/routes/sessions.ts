import { Router, Request, Response } from "express";
import { unlink } from "node:fs/promises";
import { getProject, startProject, setActiveSession, clearActiveSession } from "../store/projects.js";
import { createSessionFiles, getSessionMetadata, listSessions, readEventLog } from "../store/sessions.js";
import { generateKickoffPrompt } from "../kickoff.js";
import { createRunner } from "../session/runner.js";
import { sessionManager } from "../session/manager.js";
import type { SessionEvent, SessionMetadata } from "../schemas/session.js";

const router = Router({ mergeParams: true });

// Helper to get the parent projectId from merged params
function getProjectId(req: Request): string {
  return (req.params as Record<string, string>).id;
}

function getSessionId(req: Request): string {
  return (req.params as Record<string, string>).sessionId;
}

// POST /api/projects/:id/sessions -- Start a new session
router.post("/", async (req: Request, res: Response) => {
  const projectId = getProjectId(req);

  try {
    // 1. Validate project exists
    let project;
    try {
      project = await getProject(projectId);
    } catch {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // 2. If status is "planned", transition to "in-progress" first
    if (project.status === "planned") {
      const kickoffPrompt = generateKickoffPrompt(project);
      project = await startProject(projectId, kickoffPrompt);
    }

    // 3. Ensure kickoff prompt exists (generate if missing for in-progress projects)
    if (!project.kickoffPrompt) {
      const kickoffPrompt = generateKickoffPrompt(project);
      project = await startProject(projectId, kickoffPrompt);
    }

    // 5. Create session files
    const { sessionId, metadataPath, eventLogPath } = await createSessionFiles(projectId);

    // 6. Get the kickoff prompt
    const prompt = project.kickoffPrompt!;

    // 7. Create and start the runner
    const runner = createRunner({
      sessionId,
      projectId,
      prompt,
      metadataPath,
      eventLogPath,
      timeoutMs: 1_800_000, // 30 minutes
      workingDirectory: process.cwd(),
    });

    // 4+ Register session ownership atomically before starting work
    const startCheck = sessionManager.tryStartSession(sessionId, projectId, runner);
    if (!startCheck.ok) {
      await Promise.all([
        unlink(metadataPath).catch(() => {}),
        unlink(eventLogPath).catch(() => {}),
      ]);
      const code = startCheck.reason?.includes("already running") ? 409 : 429;
      res.status(code).json({ error: startCheck.reason });
      return;
    }

    // 8. Set activeSessionId on project and start the runner
    try {
      await setActiveSession(projectId, sessionId);
      runner.start();
    } catch (err) {
      // Rollback: unregister session and clear activeSessionId
      sessionManager.stopSession(sessionId);
      try { await clearActiveSession(projectId); } catch {}
      try {
        await Promise.all([
          unlink(metadataPath).catch(() => {}),
          unlink(eventLogPath).catch(() => {}),
        ]);
      } catch {}
      throw err;
    }

    // 9. On session end, clear activeSessionId
    runner.on("end", async () => {
      try {
        await clearActiveSession(projectId);
      } catch (err) {
        console.error("Failed to clear activeSessionId:", err);
      }
    });

    // 10. Return session metadata (from runner to avoid disk read race)
    const metadata = runner.getMetadata();
    res.status(201).json(metadata);
  } catch (err) {
    if (res.headersSent) return;
    const message = err instanceof Error ? err.message : "Failed to start session";
    console.error("Error starting session:", err);
    res.status(500).json({ error: "Failed to start session", detail: message });
  }
});

// GET /api/projects/:id/sessions -- List sessions for a project
router.get("/", async (req: Request, res: Response) => {
  const projectId = getProjectId(req);
  try {
    const sessions = await listSessions(projectId);
    res.json({ sessions });
  } catch (err) {
    console.error("Error listing sessions:", err);
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

// GET /api/projects/:id/sessions/:sessionId -- Get session metadata
router.get("/:sessionId", async (req: Request, res: Response) => {
  const projectId = getProjectId(req);
  const sessionId = getSessionId(req);
  try {
    const metadata = await getSessionMetadata(projectId, sessionId);
    res.json(metadata);
  } catch {
    res.status(404).json({ error: "Session not found" });
  }
});

// GET /api/projects/:id/sessions/:sessionId/events -- SSE event stream
router.get("/:sessionId/events", async (req: Request, res: Response) => {
  const projectId = getProjectId(req);
  const sessionId = getSessionId(req);

  // Validate session exists
  let metadata: SessionMetadata;
  try {
    metadata = await getSessionMetadata(projectId, sessionId);
  } catch {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Determine offset for reconnection
  const queryOffset = parseInt(req.query.offset as string);
  const headerOffset = parseInt(req.headers["last-event-id"] as string);
  const offset =
    Number.isNaN(queryOffset)
      ? Number.isNaN(headerOffset)
        ? 0
        : headerOffset + 1
      : queryOffset;

  // Replay existing events from NDJSON
  const existingEvents = await readEventLog(projectId, sessionId, offset);
  for (const event of existingEvents) {
    res.write(`id: ${event.id}\nevent: session_event\ndata: ${JSON.stringify(event)}\n\n`);
  }

  // If session is not running, send done and close
  if (metadata.status !== "running") {
    res.write(
      `event: session_done\ndata: ${JSON.stringify({ status: metadata.status, durationMs: metadata.durationMs })}\n\n`
    );
    res.end();
    return;
  }

  // Session is running -- subscribe to live events
  const runner = sessionManager.getRunner(sessionId);
  if (!runner) {
    // Runner not found but status is "running" -- stale state
    res.write(`event: session_done\ndata: ${JSON.stringify({ status: "failed" })}\n\n`);
    res.end();
    return;
  }

  const onEvent = (event: SessionEvent) => {
    if (event.id >= offset) {
      res.write(`id: ${event.id}\nevent: session_event\ndata: ${JSON.stringify(event)}\n\n`);
    }
  };

  const onEnd = (finalMetadata: SessionMetadata) => {
    res.write(
      `event: session_done\ndata: ${JSON.stringify({ status: finalMetadata.status, durationMs: finalMetadata.durationMs })}\n\n`
    );
    res.end();
  };

  runner.on("event", onEvent);
  runner.once("end", onEnd);

  // Heartbeat every 15 seconds
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 15_000);

  // Cleanup on client disconnect
  req.on("close", () => {
    runner.off("event", onEvent);
    runner.off("end", onEnd);
    clearInterval(heartbeat);
  });
});

// POST /api/projects/:id/sessions/:sessionId/message -- Send a follow-up message
router.post("/:sessionId/message", async (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  const { message } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  if (message.length > 100_000) {
    res.status(400).json({ error: "Message too long (max 100,000 characters)" });
    return;
  }

  const runner = sessionManager.getRunner(sessionId);
  if (!runner) {
    res.status(404).json({ error: "Session not found or not active" });
    return;
  }

  try {
    runner.sendMessage(message.trim());
    res.status(202).json({
      turnNumber: runner.sessionTurnCount,
      state: "processing",
    });
  } catch (err) {
    res.status(409).json({
      error: err instanceof Error ? err.message : "Cannot send message",
    });
  }
});

// POST /api/projects/:id/sessions/:sessionId/stop -- Stop a running session
router.post("/:sessionId/stop", async (req: Request, res: Response) => {
  const projectId = getProjectId(req);
  const sessionId = getSessionId(req);

  // Validate session exists
  let metadata: SessionMetadata;
  try {
    metadata = await getSessionMetadata(projectId, sessionId);
  } catch {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (metadata.status !== "running") {
    res.status(409).json({ error: "Session is not running" });
    return;
  }

  const stopped = sessionManager.stopSession(sessionId);
  if (!stopped) {
    res.status(409).json({ error: "Session is not tracked (may have already ended)" });
    return;
  }

  // Wait briefly for the process to exit and metadata to update
  await new Promise((resolve) => setTimeout(resolve, 500));

  const updated = await getSessionMetadata(projectId, sessionId);
  res.json(updated);
});

export default router;
