import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";
import { SessionSchema } from "./schemas/ost.js";
import type { Session } from "./schemas/ost.js";

const DATA_DIR = join(import.meta.dirname, "../../data/sessions");

async function ensureDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

function sessionPath(id: string): string {
  return join(DATA_DIR, `${id}.json`);
}

export async function createSession(
  goal: string,
  context: string
): Promise<Session> {
  await ensureDir();
  const session: Session = {
    id: uuidv4(),
    goal,
    context,
    createdAt: new Date().toISOString(),
  };
  await writeFile(sessionPath(session.id), JSON.stringify(session, null, 2));
  return session;
}

export async function getSession(id: string): Promise<Session> {
  const raw = await readFile(sessionPath(id), "utf-8");
  return SessionSchema.parse(JSON.parse(raw));
}

export async function updateSession(
  id: string,
  updates: Partial<Session>
): Promise<Session> {
  const session = await getSession(id);
  const updated = { ...session, ...updates, id: session.id };
  await writeFile(sessionPath(id), JSON.stringify(updated, null, 2));
  return updated;
}

export async function listSessions(): Promise<Session[]> {
  await ensureDir();
  const files = await readdir(DATA_DIR);
  const sessions: Session[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(DATA_DIR, file), "utf-8");
      sessions.push(SessionSchema.parse(JSON.parse(raw)));
    } catch {
      // skip corrupt files
    }
  }
  return sessions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
