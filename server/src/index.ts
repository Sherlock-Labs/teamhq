import dotenv from "dotenv";
import express from "express";
import https from "node:https";
import fs from "node:fs";
import path from "path";

dotenv.config({ path: path.resolve(import.meta.dirname, "../../.env") });
import { WebSocketServer } from "ws";
import projectRoutes from "./routes/projects.js";
import sessionRoutes from "./routes/sessions.js";
import meetingRoutes from "./routes/meetings.js";
import interviewRoutes from "./routes/interviews.js";
import docRoutes from "./routes/docs.js";
import taskRoutes from "./routes/tasks.js";
import voiceRoutes from "./routes/voice.js";
import bugReportRoutes from "./routes/bugReports.js";
import dashboardRoutes from "./routes/dashboard.js";
import heartbeatRoutes from "./routes/heartbeats.js";
import reviewRoutes from "./routes/reviews.js";
import healthRoutes from "./routes/health.js";
import pipelineStatusRoutes from "./routes/pipelineStatus.js";
import { eventTracker } from "./middleware/eventTracker.js";
import { startHeartbeatCron, stopHeartbeatCron } from "./autonomy/cron.js";
import { migrateFromTasksJson } from "./migrate.js";
import { recoverOrphanedSessions } from "./session/recovery.js";
import { sessionManager } from "./session/manager.js";
import { recoverStuckMeetings } from "./meetings/recovery.js";
import { recoverStuckHeartbeats } from "./autonomy/recovery.js";
import { handleVoiceConnection } from "./voice/transcribe.js";

const app = express();
const HTTP_PORT = 3002;
const HTTPS_PORT = 3003;

// Tailscale HTTPS certs (provisioned via `tailscale cert`)
const certsDir = path.resolve(import.meta.dirname, "../certs");
const certFiles = {
  cert: path.join(certsDir, "thinkcentre.tail560767.ts.net.crt"),
  key: path.join(certsDir, "thinkcentre.tail560767.ts.net.key"),
};
const hasTlsCerts =
  fs.existsSync(certFiles.cert) && fs.existsSync(certFiles.key);

app.use(express.json({ limit: "5mb" }));

// Enable CORS for all routes to help with screenshot capture
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// Automatic event tracking — observes all mutations, no agent self-report needed
app.use(eventTracker);

// Serve static frontend files from project root
const projectRoot = path.resolve(import.meta.dirname, "../..");
app.use(express.static(projectRoot));

app.use("/api", dashboardRoutes);
app.use("/api", projectRoutes);
app.use("/api/projects/:id/sessions", sessionRoutes);
app.use("/api", meetingRoutes);
app.use("/api", interviewRoutes);
app.use("/api", docRoutes);
app.use("/api", taskRoutes);
app.use("/api", voiceRoutes);
app.use("/api", bugReportRoutes);
app.use("/api", heartbeatRoutes);
app.use("/api", reviewRoutes);
app.use("/api", healthRoutes);
app.use("/api", pipelineStatusRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

async function start() {
  await migrateFromTasksJson();
  await recoverOrphanedSessions();
  await recoverStuckMeetings();
  await recoverStuckHeartbeats();

  // Start autonomous heartbeat cron (every hour — Thomas runs team meeting, decides work, executes)
  await startHeartbeatCron(60 * 60 * 1000);

  // Always start HTTP for localhost
  const httpServer = app.listen(HTTP_PORT, () => {
    console.log(`TeamHQ server running on http://localhost:${HTTP_PORT}`);
  });

  // WebSocket on HTTP server
  const wss = new WebSocketServer({ server: httpServer, path: "/api/voice/transcribe" });
  wss.on("connection", handleVoiceConnection);

  // Start HTTPS if Tailscale certs are available
  if (hasTlsCerts) {
    const tlsServer = https.createServer(
      {
        cert: fs.readFileSync(certFiles.cert),
        key: fs.readFileSync(certFiles.key),
      },
      app,
    );

    // WebSocket on HTTPS server too
    const wssSecure = new WebSocketServer({ server: tlsServer, path: "/api/voice/transcribe" });
    wssSecure.on("connection", handleVoiceConnection);

    tlsServer.listen(HTTPS_PORT, () => {
      console.log(`TeamHQ HTTPS running on https://thinkcentre.tail560767.ts.net:${HTTPS_PORT}`);
    });
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Server shutting down, stopping all sessions...");
  stopHeartbeatCron();
  await sessionManager.stopAll();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Server interrupted, stopping all sessions...");
  stopHeartbeatCron();
  await sessionManager.stopAll();
  process.exit(0);
});

start();
