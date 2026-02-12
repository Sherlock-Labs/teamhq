import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";
import { SessionMetadataSchema } from "../schemas/session.js";
import type { SessionMetadata, SessionEvent } from "../schemas/session.js";

const SESSIONS_DIR = join(import.meta.dirname, "../../../data/sessions");

function sessionDir(projectId: string): string {
  return join(SESSIONS_DIR, projectId);
}

function metadataPath(projectId: string, sessionId: string): string {
  return join(SESSIONS_DIR, projectId, `${sessionId}.json`);
}

function eventLogPath(projectId: string, sessionId: string): string {
  return join(SESSIONS_DIR, projectId, `${sessionId}.ndjson`);
}

export async function createSessionFiles(
  projectId: string
): Promise<{ sessionId: string; metadataPath: string; eventLogPath: string }> {
  const sessionId = uuidv4();
  const dir = sessionDir(projectId);
  await mkdir(dir, { recursive: true });

  const meta: SessionMetadata = {
    id: sessionId,
    projectId,
    status: "running",
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationMs: null,
    eventCount: 0,
    exitCode: null,
    error: null,
    pid: null,
    cliSessionId: null,
    turnCount: 1,
    state: "processing",
  };

  const mPath = metadataPath(projectId, sessionId);
  const ePath = eventLogPath(projectId, sessionId);

  await writeFile(mPath, JSON.stringify(meta, null, 2));
  await writeFile(ePath, "");

  return { sessionId, metadataPath: mPath, eventLogPath: ePath };
}

export async function getSessionMetadata(
  projectId: string,
  sessionId: string
): Promise<SessionMetadata> {
  const raw = await readFile(metadataPath(projectId, sessionId), "utf-8");
  return SessionMetadataSchema.parse(JSON.parse(raw));
}

export async function listSessions(projectId: string): Promise<SessionMetadata[]> {
  const dir = sessionDir(projectId);
  try {
    const files = await readdir(dir);
    const sessions: SessionMetadata[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await readFile(join(dir, file), "utf-8");
        sessions.push(SessionMetadataSchema.parse(JSON.parse(raw)));
      } catch {
        // Skip corrupt files
      }
    }
    return sessions.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function readEventLog(
  projectId: string,
  sessionId: string,
  offset: number = 0
): Promise<SessionEvent[]> {
  const path = eventLogPath(projectId, sessionId);
  try {
    const raw = await readFile(path, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    return lines.slice(offset).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

export async function getWorkLog(projectId: string, offset: number = 0) {
  const sessions = await listSessions(projectId);
  // listSessions returns descending — sort ascending by startedAt
  sessions.sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  );

  const allEvents: (SessionEvent & { sessionId: string; sessionIndex: number })[] = [];

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const events = await readEventLog(projectId, session.id);
    for (const event of events) {
      allEvents.push({
        ...event,
        sessionId: session.id,
        sessionIndex: i,
      });
    }
  }

  const totalEvents = allEvents.length;
  const sliced = offset > 0 ? allEvents.slice(offset) : allEvents;

  const sessionSummaries = sessions.map((s) => ({
    id: s.id,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    durationMs: s.durationMs,
    status: s.status,
    eventCount: s.eventCount,
  }));

  return { events: sliced, sessions: sessionSummaries, totalEvents };
}

export { metadataPath, eventLogPath, SESSIONS_DIR };
