import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";
import { MeetingSchema } from "../schemas/meeting.js";
import type { Meeting, MeetingType } from "../schemas/meeting.js";

const DATA_DIR = join(import.meta.dirname, "../../../data/meetings");

async function ensureDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

function meetingPath(id: string): string {
  return join(DATA_DIR, `${id}.json`);
}

export async function createMeeting(
  type: MeetingType,
  participants?: string[],
  instructions?: string | null,
): Promise<Meeting> {
  await ensureDir();
  const count = await getMeetingCount();
  const now = new Date().toISOString();
  const meeting: Meeting = {
    id: uuidv4(),
    type,
    status: "running",
    meetingNumber: count + 1,
    scheduledAt: null,
    startedAt: now,
    completedAt: null,
    durationMs: null,
    error: null,
    summary: null,
    keyTakeaways: [],
    transcript: [],
    decisions: [],
    actionItems: [],
    mood: null,
    nextMeetingTopics: [],
    participants: participants || [],
    instructions: instructions || null,
  };
  await writeFile(meetingPath(meeting.id), JSON.stringify(meeting, null, 2));
  return meeting;
}

export async function getMeeting(id: string): Promise<Meeting> {
  const raw = await readFile(meetingPath(id), "utf-8");
  return MeetingSchema.parse(JSON.parse(raw));
}

export async function updateMeeting(
  id: string,
  updates: Partial<Meeting>
): Promise<Meeting> {
  const meeting = await getMeeting(id);
  const updated: Meeting = {
    ...meeting,
    ...updates,
    id: meeting.id,
    meetingNumber: meeting.meetingNumber,
    startedAt: meeting.startedAt,
  };
  await writeFile(meetingPath(id), JSON.stringify(updated, null, 2));
  return updated;
}

/**
 * List all meetings, newest first.
 * Strips transcript for lean payload.
 */
export async function listMeetings(): Promise<Omit<Meeting, "transcript">[]> {
  await ensureDir();
  const files = await readdir(DATA_DIR);
  const meetings: Meeting[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(DATA_DIR, file), "utf-8");
      meetings.push(MeetingSchema.parse(JSON.parse(raw)));
    } catch {
      // skip corrupt files
    }
  }
  meetings.sort(
    (a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
  return meetings.map(({ transcript, ...rest }) => rest);
}

export async function getLatestMeeting(): Promise<Meeting | null> {
  await ensureDir();
  const files = await readdir(DATA_DIR);
  const meetings: Meeting[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(DATA_DIR, file), "utf-8");
      meetings.push(MeetingSchema.parse(JSON.parse(raw)));
    } catch {
      // skip
    }
  }
  if (meetings.length === 0) return null;
  meetings.sort(
    (a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
  return meetings[0];
}

export async function getMeetingCount(): Promise<number> {
  await ensureDir();
  const files = await readdir(DATA_DIR);
  return files.filter((f) => f.endsWith(".json")).length;
}

export async function getRecentMeetings(limit: number): Promise<Meeting[]> {
  await ensureDir();
  const files = await readdir(DATA_DIR);
  const meetings: Meeting[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(DATA_DIR, file), "utf-8");
      meetings.push(MeetingSchema.parse(JSON.parse(raw)));
    } catch {
      // skip
    }
  }
  meetings.sort(
    (a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
  return meetings.slice(0, limit);
}
