import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runHeartbeat } from "./heartbeatRunner.js";

const CONFIG_PATH = join(import.meta.dirname, "../../../data/heartbeat-config.json");

interface HeartbeatConfig {
  intervalMs: number;
  enabled: boolean;
}

const DEFAULT_CONFIG: HeartbeatConfig = {
  intervalMs: 5 * 60 * 1000, // 5 minutes
  enabled: true,
};

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let currentIntervalMs = DEFAULT_CONFIG.intervalMs;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;
let consecutiveFailures = 0;
const MAX_RETRY_DELAY_MS = 20 * 60 * 1000; // 20 min max backoff
const BASE_RETRY_DELAY_MS = 2 * 60 * 1000; // 2 min base

/**
 * Load persisted heartbeat config, or return defaults.
 */
export async function loadConfig(): Promise<HeartbeatConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save heartbeat config to disk.
 */
export async function saveConfig(config: Partial<HeartbeatConfig>): Promise<HeartbeatConfig> {
  const current = await loadConfig();
  const merged = { ...current, ...config };
  await writeFile(CONFIG_PATH, JSON.stringify(merged, null, 2));
  return merged;
}

/**
 * Calculate retry delay with exponential backoff.
 * 2m → 4m → 8m → 16m → 20m (capped)
 */
function getRetryDelay(): number {
  const delay = BASE_RETRY_DELAY_MS * Math.pow(2, consecutiveFailures - 1);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

/**
 * Schedule a retry after a failure.
 */
function scheduleRetry(): void {
  if (retryTimeout) clearTimeout(retryTimeout);
  const delay = getRetryDelay();
  const delayMin = Math.round(delay / 60000);
  console.log(`[heartbeat] Scheduling retry in ${delayMin}m (failure #${consecutiveFailures})`);

  retryTimeout = setTimeout(async () => {
    retryTimeout = null;
    console.log("[heartbeat] Retry triggered after failure");
    try {
      await runHeartbeat("cron");
      consecutiveFailures = 0; // Reset on success
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already running")) return; // Don't count as failure
      consecutiveFailures++;
      console.error(`[heartbeat] Retry failed (attempt #${consecutiveFailures}):`, msg);
      if (consecutiveFailures <= 5) {
        scheduleRetry();
      } else {
        console.error("[heartbeat] Max retries reached, waiting for next scheduled heartbeat");
        consecutiveFailures = 0;
      }
    }
  }, delay);
}

/**
 * Start the autonomous heartbeat cron.
 * Reads interval from persisted config, falls back to parameter.
 */
export async function startHeartbeatCron(defaultIntervalMs = 5 * 60 * 1000): Promise<void> {
  if (heartbeatInterval) {
    console.log("[heartbeat] Cron already running, skipping start");
    return;
  }

  const config = await loadConfig();
  currentIntervalMs = config.intervalMs || defaultIntervalMs;

  if (!config.enabled) {
    console.log("[heartbeat] Cron disabled in config, not starting");
    return;
  }

  heartbeatInterval = setInterval(async () => {
    console.log("[heartbeat] Autonomous heartbeat triggered by cron");
    try {
      await runHeartbeat("cron");
      consecutiveFailures = 0; // Reset on success
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already running")) return;
      consecutiveFailures++;
      console.error("[heartbeat] Cron heartbeat failed:", msg);
      // Schedule a retry with backoff
      if (consecutiveFailures <= 5) {
        scheduleRetry();
      }
    }
  }, currentIntervalMs);

  const intervalMinutes = Math.round(currentIntervalMs / 60000);
  console.log(
    `[heartbeat] Cron started — every ${intervalMinutes} minutes (${(intervalMinutes / 60).toFixed(1)} hours)`
  );
}

/**
 * Restart the cron with a new interval.
 */
export async function restartHeartbeatCron(): Promise<void> {
  stopHeartbeatCron();
  await startHeartbeatCron();
}

/**
 * Stop the autonomous heartbeat cron.
 */
export function stopHeartbeatCron(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log("[heartbeat] Cron stopped");
  }
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
  consecutiveFailures = 0;
}

/**
 * Get current cron status.
 */
export function getCronStatus(): { running: boolean; intervalMs: number; consecutiveFailures: number } {
  return {
    running: heartbeatInterval !== null,
    intervalMs: currentIntervalMs,
    consecutiveFailures,
  };
}
