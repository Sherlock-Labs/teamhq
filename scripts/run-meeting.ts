/**
 * Standalone script to trigger a team meeting via the TeamHQ API.
 *
 * Usage:
 *   npx tsx scripts/run-meeting.ts charter
 *   npx tsx scripts/run-meeting.ts weekly
 *   npx tsx scripts/run-meeting.ts weekly "Discuss the new auth feature"
 *
 * Cron (every 4 hours):
 *   0 *​/4 * * * cd /path/to/teamhq && npx tsx scripts/run-meeting.ts weekly >> data/meetings/cron.log 2>&1
 */

const API_BASE = "http://localhost:3002/api/meetings";

async function main() {
  const type = process.argv[2];
  const agenda = process.argv[3];

  if (!type || !["charter", "weekly"].includes(type)) {
    console.error("Usage: npx tsx scripts/run-meeting.ts <charter|weekly> [agenda]");
    process.exit(1);
  }

  console.log(`[${new Date().toISOString()}] Starting ${type} meeting...`);

  try {
    // Trigger the meeting
    const body: Record<string, string> = { type };
    if (agenda) body.agenda = agenda;

    const runRes = await fetch(`${API_BASE}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!runRes.ok) {
      const err = await runRes.json();
      console.error(`Failed to start meeting: ${err.error || runRes.statusText}`);
      process.exit(1);
    }

    console.log("Meeting started, waiting for completion...");

    // Poll for completion
    let completed = false;
    for (let i = 0; i < 180; i++) {
      // 15 minute max wait (180 * 5s)
      await new Promise((r) => setTimeout(r, 5000));

      const listRes = await fetch(API_BASE);
      if (!listRes.ok) continue;

      const data = await listRes.json();
      const running = data.meetings.some(
        (m: { status: string }) => m.status === "running"
      );

      if (!running) {
        // Find the most recent meeting
        const latest = data.meetings[0];
        if (latest) {
          console.log(`\nMeeting #${latest.meetingNumber} completed!`);
          console.log(`Status: ${latest.status}`);
          if (latest.summary) console.log(`Summary: ${latest.summary}`);
          if (latest.mood) console.log(`Mood: ${latest.mood}`);
          if (latest.durationMs) {
            const secs = Math.round(latest.durationMs / 1000);
            console.log(`Duration: ${Math.floor(secs / 60)}m ${secs % 60}s`);
          }
          if (latest.status === "failed" && latest.error) {
            console.error(`Error: ${latest.error}`);
          }
        }
        completed = true;
        break;
      }
    }

    if (!completed) {
      console.error("Meeting timed out after 15 minutes.");
      process.exit(1);
    }
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
