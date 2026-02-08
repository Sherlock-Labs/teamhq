import { listMeetings, updateMeeting } from "../store/meetings.js";

/**
 * Recover meetings stuck in "running" status from a previous server session.
 * These meetings' claude processes are gone, so mark them as failed.
 */
export async function recoverStuckMeetings(): Promise<void> {
  try {
    const meetings = await listMeetings();
    const stuck = meetings.filter((m) => m.status === "running");

    for (const meeting of stuck) {
      console.log(
        `[meeting-recovery] Marking stuck meeting #${meeting.meetingNumber} (${meeting.id}) as failed`
      );
      await updateMeeting(meeting.id, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: "Meeting was interrupted by server restart.",
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
