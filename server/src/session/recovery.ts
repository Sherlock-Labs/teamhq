import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SESSIONS_DIR } from "../store/sessions.js";
import { clearActiveSession } from "../store/projects.js";

export async function recoverOrphanedSessions(): Promise<void> {
  let projectDirs: string[];
  try {
    projectDirs = await readdir(SESSIONS_DIR);
  } catch {
    // Sessions directory doesn't exist yet -- nothing to recover
    return;
  }

  let recovered = 0;

  for (const projectDir of projectDirs) {
    const dirPath = join(SESSIONS_DIR, projectDir);
    let files: string[];
    try {
      files = await readdir(dirPath);
    } catch {
      continue;
    }

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = join(dirPath, file);
      try {
        const raw = await readFile(filePath, "utf-8");
        const metadata = JSON.parse(raw);

        if (metadata.status === "running") {
          if (metadata.state === "idle" && metadata.cliSessionId) {
            // Session was idle between turns -- no process was running.
            // Mark as stopped (conservative) rather than failed.
            metadata.status = "stopped";
            metadata.error = "Server restarted between turns";
          } else {
            // Session was actively processing -- process is gone.
            metadata.status = "failed";
            metadata.error = "Server restarted while session was running";
          }
          metadata.state = "ended";
          metadata.endedAt = new Date().toISOString();
          metadata.pid = null;
          if (metadata.startedAt) {
            metadata.durationMs = Date.now() - new Date(metadata.startedAt).getTime();
          }
          await writeFile(filePath, JSON.stringify(metadata, null, 2));
          // Clear activeSessionId from the project so it's not stuck
          try { await clearActiveSession(metadata.projectId); } catch {}
          recovered++;
        }
      } catch {
        // Skip corrupt files
      }
    }
  }

  if (recovered > 0) {
    console.log(`Recovered ${recovered} orphaned session(s) from previous server run`);
  }
}
