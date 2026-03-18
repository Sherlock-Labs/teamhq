import { Router } from "express";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  listHeartbeats,
  getHeartbeat,
  getLatestHeartbeat,
} from "../store/heartbeats.js";
import { runHeartbeat, heartbeatEvents } from "../autonomy/heartbeatRunner.js";
import { loadConfig, saveConfig, restartHeartbeatCron, getCronStatus } from "../autonomy/cron.js";

const CEO_INBOX_PATH = join(import.meta.dirname, "../../../data/ceo-inbox.json");

async function loadDirectives(): Promise<Array<{ text: string; addedAt: string }>> {
  try {
    const raw = await readFile(CEO_INBOX_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveDirectives(directives: Array<{ text: string; addedAt: string }>): Promise<void> {
  await writeFile(CEO_INBOX_PATH, JSON.stringify(directives, null, 2));
}

const router = Router();

/**
 * GET /api/heartbeats
 * List recent heartbeat runs (most recent first).
 */
router.get("/heartbeats", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const runs = await listHeartbeats(limit);
    res.json(runs);
  } catch (err) {
    console.error("[heartbeats] List error:", err);
    res.status(500).json({ error: "Failed to list heartbeats" });
  }
});

/**
 * GET /api/heartbeats/latest
 * Get the most recent heartbeat run.
 */
router.get("/heartbeats/latest", async (_req, res) => {
  try {
    const latest = await getLatestHeartbeat();
    if (!latest) {
      res.status(404).json({ error: "No heartbeats found" });
      return;
    }
    res.json(latest);
  } catch (err) {
    console.error("[heartbeats] Latest error:", err);
    res.status(500).json({ error: "Failed to get latest heartbeat" });
  }
});

// --- Heartbeat Config ---

/**
 * GET /api/heartbeats/config
 * Get current heartbeat configuration and cron status.
 */
router.get("/heartbeats/config", async (_req, res) => {
  try {
    const config = await loadConfig();
    const status = getCronStatus();
    res.json({ ...config, cronRunning: status.running, consecutiveFailures: status.consecutiveFailures });
  } catch {
    res.status(500).json({ error: "Failed to load config" });
  }
});

/**
 * PUT /api/heartbeats/config
 * Update heartbeat configuration. Restarts cron if interval changes.
 */
router.put("/heartbeats/config", async (req, res) => {
  try {
    const { intervalMs, enabled } = req.body;
    const updates: Record<string, unknown> = {};
    if (typeof intervalMs === "number" && intervalMs >= 60000) {
      updates.intervalMs = intervalMs;
    }
    if (typeof enabled === "boolean") {
      updates.enabled = enabled;
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid fields to update. intervalMs (min 60000) or enabled (boolean)." });
      return;
    }
    const config = await saveConfig(updates);
    await restartHeartbeatCron();
    const status = getCronStatus();
    res.json({ ...config, cronRunning: status.running });
  } catch {
    res.status(500).json({ error: "Failed to update config" });
  }
});

/**
 * GET /api/heartbeats/stats
 * Aggregate stats across recent heartbeats.
 */
router.get("/heartbeats/stats", async (_req, res) => {
  try {
    const runs = await listHeartbeats(100);
    const completed = runs.filter(r => r.status === "completed");
    const failed = runs.filter(r => r.status === "failed");
    const durations = completed.filter(r => r.durationMs).map(r => r.durationMs!);
    const avgDurationMs = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
    const successRate = runs.length > 0 ? Math.round((completed.length / runs.length) * 100) : null;

    res.json({
      totalRuns: runs.length,
      completed: completed.length,
      failed: failed.length,
      running: runs.filter(r => r.status === "running").length,
      successRate,
      avgDurationMs,
      lastRunAt: runs[0]?.startedAt ?? null,
    });
  } catch {
    res.status(500).json({ error: "Failed to compute stats" });
  }
});

// --- CEO Inbox / Directives (must be before :id route) ---

router.get("/heartbeats/directives", async (_req, res) => {
  try {
    const directives = await loadDirectives();
    res.json(directives);
  } catch {
    res.status(500).json({ error: "Failed to load directives" });
  }
});

router.post("/heartbeats/directives", async (req, res) => {
  try {
    const text = req.body?.text?.trim();
    if (!text) { res.status(400).json({ error: "Text is required" }); return; }
    const directives = await loadDirectives();
    directives.push({ text, addedAt: new Date().toISOString() });
    await saveDirectives(directives);
    res.status(201).json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to add directive" });
  }
});

router.delete("/heartbeats/directives/:index", async (req, res) => {
  try {
    const idx = Number(req.params.index);
    const directives = await loadDirectives();
    if (idx < 0 || idx >= directives.length) { res.status(404).json({ error: "Not found" }); return; }
    directives.splice(idx, 1);
    await saveDirectives(directives);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to remove directive" });
  }
});

/**
 * GET /api/heartbeats/stream
 * SSE endpoint for live heartbeat output. Streams output chunks and status changes.
 */
router.get("/heartbeats/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Send initial keepalive
  res.write("event: connected\ndata: {}\n\n");

  const onOutput = (data: { heartbeatId: string; chunk: string }) => {
    res.write(`event: output\ndata: ${JSON.stringify(data)}\n\n`);
  };
  const onStatus = (data: { heartbeatId: string; status: string }) => {
    res.write(`event: status\ndata: ${JSON.stringify(data)}\n\n`);
  };

  heartbeatEvents.on("output", onOutput);
  heartbeatEvents.on("status", onStatus);

  // Keepalive every 30s to prevent proxy timeouts
  const keepalive = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 30000);

  req.on("close", () => {
    heartbeatEvents.off("output", onOutput);
    heartbeatEvents.off("status", onStatus);
    clearInterval(keepalive);
  });
});

/**
 * GET /api/heartbeats/:id
 * Get a specific heartbeat run with full details.
 */
router.get("/heartbeats/:id", async (req, res) => {
  try {
    const run = await getHeartbeat(req.params.id);
    if (!run) {
      res.status(404).json({ error: "Heartbeat not found" });
      return;
    }
    res.json(run);
  } catch (err) {
    console.error("[heartbeats] Get error:", err);
    res.status(500).json({ error: "Failed to get heartbeat" });
  }
});

/**
 * POST /api/heartbeats/trigger
 * Manually trigger a heartbeat run. Non-blocking — returns immediately
 * with the heartbeat ID, and the run continues in the background.
 */
router.post("/heartbeats/trigger", async (_req, res) => {
  try {
    // Start the heartbeat in the background
    const resultPromise = runHeartbeat("manual");

    // Give it a moment to create the record, then return the ID
    // We await briefly to get the initial record, but the full run continues
    const result = await Promise.race([
      resultPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
    ]);

    if (result) {
      // Completed very fast (unlikely but possible)
      res.json({ heartbeatId: result.id, status: result.status });
    } else {
      // Still running — get the latest running heartbeat
      const latest = await getLatestHeartbeat();
      if (latest && latest.status === "running") {
        res.status(202).json({
          heartbeatId: latest.id,
          status: "running",
          message: "Heartbeat triggered and running in background",
        });
      } else {
        res.status(202).json({
          status: "running",
          message: "Heartbeat triggered",
        });
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already running")) {
      res.status(409).json({ error: "A heartbeat is already running" });
      return;
    }
    console.error("[heartbeats] Trigger error:", err);
    res.status(500).json({ error: "Failed to trigger heartbeat" });
  }
});

export default router;
