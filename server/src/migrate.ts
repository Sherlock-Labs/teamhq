import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isDataDirEmpty, saveProjectDirect } from "./store/projects.js";
import type { Project } from "./schemas/project.js";

const TASKS_JSON_PATH = join(import.meta.dirname, "../../data/tasks.json");

interface LegacyProject {
  id: string;
  name: string;
  description: string;
  status: string;
  completedDate?: string;
  tasks?: unknown[];
}

function mapStatus(status: string): Project["status"] {
  if (status === "in-progress") return "in-progress";
  if (status === "completed") return "completed";
  return "planned";
}

function parseCompletedDate(completedDate?: string): string | null {
  if (!completedDate) return null;
  // completedDate is like "2025-01" or "2025-02" — parse to ISO
  const parts = completedDate.split("-");
  if (parts.length === 2) {
    return new Date(`${parts[0]}-${parts[1]}-01T00:00:00.000Z`).toISOString();
  }
  return new Date(completedDate).toISOString();
}

export async function migrateFromTasksJson(): Promise<void> {
  const empty = await isDataDirEmpty();
  if (!empty) {
    console.log("Migration: data/projects/ already has files, skipping.");
    return;
  }

  let raw: string;
  try {
    raw = await readFile(TASKS_JSON_PATH, "utf-8");
  } catch {
    console.log("Migration: data/tasks.json not found, skipping.");
    return;
  }

  const data = JSON.parse(raw) as { projects: LegacyProject[] };
  if (!data.projects || data.projects.length === 0) {
    console.log("Migration: no projects in tasks.json, skipping.");
    return;
  }

  const now = new Date().toISOString();

  for (const legacy of data.projects) {
    const completedAt = parseCompletedDate(legacy.completedDate);
    const project: Project = {
      id: legacy.id,
      name: legacy.name,
      description: legacy.description,
      status: mapStatus(legacy.status),
      createdAt: completedAt ?? now,
      updatedAt: now,
      completedAt,
      goals: "",
      constraints: "",
      brief: "",
      notes: [],
      kickoffPrompt: null,
      activeSessionId: null,
    };
    await saveProjectDirect(project);
    console.log(`Migration: created project "${project.name}" (${project.id})`);
  }

  console.log(`Migration: migrated ${data.projects.length} projects from tasks.json.`);
}
