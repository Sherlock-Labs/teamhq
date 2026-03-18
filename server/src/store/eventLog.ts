import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";

// Resolve to project root/data/ — works regardless of how tsx resolves paths
const PROJECT_ROOT = join(import.meta.dirname, "../../..");
const DATA_DIR = join(PROJECT_ROOT, "data");
const EVENT_LOG_PATH = join(DATA_DIR, "event-log.json");
const MAX_EVENTS = 500;

export interface EventEntry {
  id: string;
  timestamp: string;
  /** Who performed the action — agent name, "system", or "ceo" */
  actor: string;
  /** What happened */
  action: string;
  /** What was acted on */
  entityType: "project" | "work-item" | "pipeline-task" | "session" | "agent";
  /** ID or slug of the entity */
  entityId: string;
  /** Human-readable entity name */
  entityName: string;
  /** Parent project slug (if applicable) */
  projectSlug?: string;
  /** Additional context */
  details?: Record<string, unknown>;
}

let eventCache: EventEntry[] | null = null;

async function ensureDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

async function loadEvents(): Promise<EventEntry[]> {
  if (eventCache) return eventCache;
  try {
    const raw = await readFile(EVENT_LOG_PATH, "utf-8");
    eventCache = JSON.parse(raw) as EventEntry[];
    return eventCache;
  } catch {
    eventCache = [];
    return eventCache;
  }
}

async function saveEvents(events: EventEntry[]): Promise<void> {
  await ensureDir();
  // Keep only the most recent MAX_EVENTS
  const trimmed = events.slice(-MAX_EVENTS);
  eventCache = trimmed;
  await writeFile(EVENT_LOG_PATH, JSON.stringify(trimmed, null, 2));
}

/**
 * Log an event. This is the core function — called automatically by
 * middleware and explicitly by stores when mutations happen.
 */
export async function logEvent(entry: Omit<EventEntry, "id" | "timestamp">): Promise<EventEntry> {
  const event: EventEntry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  const events = await loadEvents();
  events.push(event);
  await saveEvents(events);
  return event;
}

/**
 * Get recent events, most recent first.
 */
export async function getRecentEvents(limit = 50): Promise<EventEntry[]> {
  const events = await loadEvents();
  return events.slice(-limit).reverse();
}

/**
 * Get events for a specific project.
 */
export async function getProjectEvents(projectSlug: string, limit = 50): Promise<EventEntry[]> {
  const events = await loadEvents();
  return events
    .filter((e) => e.projectSlug === projectSlug)
    .slice(-limit)
    .reverse();
}

/**
 * Get events for a specific actor (agent).
 */
export async function getActorEvents(actor: string, limit = 50): Promise<EventEntry[]> {
  const events = await loadEvents();
  return events
    .filter((e) => e.actor.toLowerCase() === actor.toLowerCase())
    .slice(-limit)
    .reverse();
}

/**
 * Get events within a date range (for charts).
 */
export async function getEventsByDateRange(startDate: string, endDate: string): Promise<EventEntry[]> {
  const events = await loadEvents();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return events.filter((e) => {
    const t = new Date(e.timestamp).getTime();
    return t >= start && t <= end;
  });
}
