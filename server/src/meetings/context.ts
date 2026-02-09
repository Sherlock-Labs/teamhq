import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { listProjects } from "../store/projects.js";
import { getRecentMeetings } from "../store/meetings.js";
import type { Meeting } from "../schemas/meeting.js";
import type { Project } from "../schemas/project.js";

const AGENTS_DIR = join(import.meta.dirname, "../../../.claude/agents");
const DOCS_DIR = join(import.meta.dirname, "../../../docs");

/** Core team agents to include in meetings */
const CORE_AGENTS = [
  "product-manager",
  "technical-architect",
  "product-designer",
  "frontend-developer",
  "backend-developer",
  "qa",
];

export interface MeetingContext {
  agentPersonalities: Record<string, string>;
  projects: Project[];
  previousMeetings: Meeting[];
  recentDocs: Record<string, string>;
}

/**
 * Gathers context for a custom meeting — loads agent personalities
 * only for the specified participants instead of CORE_AGENTS.
 */
export async function gatherCustomMeetingContext(
  participants: string[]
): Promise<MeetingContext> {
  const [agentPersonalities, projects, previousMeetings, recentDocs] =
    await Promise.all([
      loadAgentPersonalitiesForParticipants(participants),
      loadProjects(),
      loadPreviousMeetings(),
      loadRecentDocs(),
    ]);

  return { agentPersonalities, projects, previousMeetings, recentDocs };
}

/**
 * Gathers all context needed for a meeting prompt.
 */
export async function gatherMeetingContext(): Promise<MeetingContext> {
  const [agentPersonalities, projects, previousMeetings, recentDocs] =
    await Promise.all([
      loadAgentPersonalities(),
      loadProjects(),
      loadPreviousMeetings(),
      loadRecentDocs(),
    ]);

  return { agentPersonalities, projects, previousMeetings, recentDocs };
}

async function loadAgentPersonalities(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const agentName of CORE_AGENTS) {
    try {
      const content = await readFile(
        join(AGENTS_DIR, `${agentName}.md`),
        "utf-8"
      );
      result[agentName] = content;
    } catch {
      // Agent file missing — skip
    }
  }
  return result;
}

async function loadAgentPersonalitiesForParticipants(
  participants: string[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const agentName of participants) {
    try {
      const content = await readFile(
        join(AGENTS_DIR, `${agentName}.md`),
        "utf-8"
      );
      result[agentName] = content;
    } catch {
      // Agent file missing — skip
    }
  }
  return result;
}

async function loadProjects(): Promise<Project[]> {
  try {
    return await listProjects();
  } catch {
    return [];
  }
}

async function loadPreviousMeetings(): Promise<Meeting[]> {
  try {
    return await getRecentMeetings(3);
  } catch {
    return [];
  }
}

async function loadRecentDocs(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  try {
    const files = await readdir(DOCS_DIR);
    const mdFiles = files.filter((f) => f.endsWith(".md")).slice(0, 10);
    for (const file of mdFiles) {
      try {
        const content = await readFile(join(DOCS_DIR, file), "utf-8");
        // Truncate long docs to keep prompt size manageable
        result[file] = content.length > 2000 ? content.slice(0, 2000) + "\n...(truncated)" : content;
      } catch {
        // skip unreadable files
      }
    }
  } catch {
    // docs dir may not exist
  }
  return result;
}
