import express from "express";
import projectRoutes from "./routes/projects.js";
import sessionRoutes from "./routes/sessions.js";
import meetingRoutes from "./routes/meetings.js";
import docRoutes from "./routes/docs.js";
import { migrateFromTasksJson } from "./migrate.js";
import { recoverOrphanedSessions } from "./session/recovery.js";
import { sessionManager } from "./session/manager.js";
import { recoverStuckMeetings } from "./meetings/recovery.js";

const app = express();
const PORT = 3002;

app.use(express.json());

app.use("/api", projectRoutes);
app.use("/api/projects/:id/sessions", sessionRoutes);
app.use("/api", meetingRoutes);
app.use("/api", docRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

async function start() {
  await migrateFromTasksJson();
  await recoverOrphanedSessions();
  await recoverStuckMeetings();
  app.listen(PORT, () => {
    console.log(`TeamHQ server running on http://localhost:${PORT}`);
  });
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
