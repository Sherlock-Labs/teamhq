import { listHeartbeats, updateHeartbeat } from "../store/heartbeats.js";

/**
 * Recover heartbeats stuck in "running" status from a previous server session.
 * Called on startup — any running heartbeat means the process was killed mid-flight.
 */
export async function recoverStuckHeartbeats(): Promise<void> {
  try {
    const heartbeats = await listHeartbeats(20);
    const stuck = heartbeats.filter((h) => h.status === "running");

    for (const h of stuck) {
      console.log(`[heartbeat-recovery] Marking stuck heartbeat ${h.id} as failed (server restart)`);
      await updateHeartbeat(h.id, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: "Heartbeat was interrupted: server restart.",
      });
    }

    if (stuck.length > 0) {
      console.log(`[heartbeat-recovery] Recovered ${stuck.length} stuck heartbeat(s)`);
    }
  } catch (err) {
    console.error("[heartbeat-recovery] Error recovering stuck heartbeats:", err);
  }
}
