import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";

const DATA_DIR = join(import.meta.dirname, "../../../data/heartbeats");

export interface HeartbeatDecision {
  action: string;
  reasoning: string;
  agent?: string;
  status: "planned" | "executed" | "skipped";
}

export interface StateSnapshot {
  activeProjects: number;
  totalTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  staleTasks: number;
  recentEvents: number;
  agentsActive: number;
}

export interface HeartbeatRun {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: "running" | "completed" | "failed";
  trigger: "cron" | "manual";
  stateSnapshot: StateSnapshot;
  assessment: string | null;
  decisions: HeartbeatDecision[];
  actionsLog: string[];
  error: string | null;
  durationMs: number | null;
  rawOutput?: string;
}

async function ensureDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

function heartbeatPath(id: string): string {
  return join(DATA_DIR, `${id}.json`);
}

export async function createHeartbeat(trigger: "cron" | "manual"): Promise<HeartbeatRun> {
  await ensureDir();
  const run: HeartbeatRun = {
    id: uuidv4(),
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: "running",
    trigger,
    stateSnapshot: {
      activeProjects: 0,
      totalTasks: 0,
      inProgressTasks: 0,
      blockedTasks: 0,
      staleTasks: 0,
      recentEvents: 0,
      agentsActive: 0,
    },
    assessment: null,
    decisions: [],
    actionsLog: [],
    error: null,
    durationMs: null,
  };
  await writeFile(heartbeatPath(run.id), JSON.stringify(run, null, 2));
  return run;
}

export async function updateHeartbeat(
  id: string,
  updates: Partial<Omit<HeartbeatRun, "id">>
): Promise<HeartbeatRun> {
  const run = await getHeartbeat(id);
  if (!run) {
    throw new Error(`Heartbeat ${id} not found`);
  }
  const updated = { ...run, ...updates };
  await writeFile(heartbeatPath(id), JSON.stringify(updated, null, 2));
  return updated;
}

export async function getHeartbeat(id: string): Promise<HeartbeatRun | null> {
  try {
    const raw = await readFile(heartbeatPath(id), "utf-8");
    return JSON.parse(raw) as HeartbeatRun;
  } catch {
    return null;
  }
}

export async function listHeartbeats(limit = 20): Promise<HeartbeatRun[]> {
  await ensureDir();
  const files = await readdir(DATA_DIR);
  const runs: HeartbeatRun[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(DATA_DIR, file), "utf-8");
      runs.push(JSON.parse(raw) as HeartbeatRun);
    } catch {
      // skip corrupt files
    }
  }

  // Sort by startedAt descending (most recent first)
  runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  return runs.slice(0, limit);
}

export async function getLatestHeartbeat(): Promise<HeartbeatRun | null> {
  const runs = await listHeartbeats(1);
  return runs[0] ?? null;
}
