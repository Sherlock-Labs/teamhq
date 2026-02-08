import express from "express";
import { WebSocketServer } from "ws";
import projectRoutes from "./routes/projects.js";
import sessionRoutes from "./routes/sessions.js";
import meetingRoutes from "./routes/meetings.js";
import docRoutes from "./routes/docs.js";
import voiceRoutes from "./routes/voice.js";
import { migrateFromTasksJson } from "./migrate.js";
import { recoverOrphanedSessions } from "./session/recovery.js";
import { sessionManager } from "./session/manager.js";
import { recoverStuckMeetings } from "./meetings/recovery.js";
import { handleVoiceConnection } from "./voice/transcribe.js";

const app = express();
const PORT = 3002;

app.use(express.json());

app.use("/api", projectRoutes);
app.use("/api/projects/:id/sessions", sessionRoutes);
app.use("/api", meetingRoutes);
app.use("/api", docRoutes);
app.use("/api", voiceRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

async function start() {
  await migrateFromTasksJson();
  await recoverOrphanedSessions();
  await recoverStuckMeetings();
  const server = app.listen(PORT, () => {
    console.log(`TeamHQ server running on http://localhost:${PORT}`);
  });

  // WebSocket server for voice transcription
  const wss = new WebSocketServer({ server, path: "/api/voice/transcribe" });
  wss.on("connection", handleVoiceConnection);
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Server shutting down, stopping all sessions...");
  await sessionManager.stopAll();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Server interrupted, stopping all sessions...");
  await sessionManager.stopAll();
  process.exit(0);
});

start();
