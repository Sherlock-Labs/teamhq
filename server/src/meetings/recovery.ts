import { listMeetings, updateMeeting } from "../store/meetings.js";

const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes without completion = stuck
const SWEEP_INTERVAL_MS = 60 * 1000; // check every minute

/**
 * Recover meetings stuck in "running" status from a previous server session.
 * These meetings' claude processes are gone, so mark them as failed.
 */
export async function recoverStuckMeetings(): Promise<void> {
  // One-time startup sweep (catches anything from before this boot)
  await sweepStuckMeetings("server restart");

  // Periodic sweep (catches interviews where the client disappeared)
  setInterval(() => {
    sweepStuckMeetings("stuck for over 5 minutes").catch((err) =>
      console.error("[meeting-recovery] Periodic sweep error:", err)
    );
  }, SWEEP_INTERVAL_MS);
}

async function sweepStuckMeetings(reason: string): Promise<void> {
  try {
    const meetings = await listMeetings();
    const now = Date.now();
    const stuck = meetings.filter((m) => {
      if (m.status !== "running") return false;
      // On startup, recover all running meetings.
      // On periodic sweeps, only recover those older than the threshold.
      if (reason === "server restart") return true;
      const started = m.startedAt ? new Date(m.startedAt).getTime() : 0;
      return now - started > STUCK_THRESHOLD_MS;
    });

    for (const meeting of stuck) {
      console.log(
        `[meeting-recovery] Marking stuck meeting #${meeting.meetingNumber} (${meeting.id}) as failed (${reason})`
      );
      await updateMeeting(meeting.id, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: `Meeting was interrupted: ${reason}.`,
      });
    }

    if (stuck.length > 0) {
      console.log(
        `[meeting-recovery] Recovered ${stuck.length} stuck meeting(s)`
      );
    }
  } catch (err) {
    console.error("[meeting-recovery] Error recovering stuck meetings:", err);
  }
}
