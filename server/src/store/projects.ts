import { readFile, writeFile, readdir, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";
import { ProjectSchema } from "../schemas/project.js";
import type { Project } from "../schemas/project.js";

const DATA_DIR = join(import.meta.dirname, "../../../data/projects");

async function ensureDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

function projectPath(id: string): string {
  return join(DATA_DIR, `${id}.json`);
}

export async function createProject(
  name: string,
  description: string,
  status: Project["status"]
): Promise<Project> {
  await ensureDir();
  const now = new Date().toISOString();
  const project: Project = {
    id: uuidv4(),
    name,
    description,
    status,
    createdAt: now,
    updatedAt: now,
    completedAt: status === "completed" ? now : null,
  };
  await writeFile(projectPath(project.id), JSON.stringify(project, null, 2));
  return project;
}

export async function getProject(id: string): Promise<Project> {
  const raw = await readFile(projectPath(id), "utf-8");
  return ProjectSchema.parse(JSON.parse(raw));
}

export async function updateProject(
  id: string,
  updates: Partial<Pick<Project, "name" | "description" | "status">>
): Promise<Project> {
  const project = await getProject(id);
  const now = new Date().toISOString();

  const updated: Project = {
    ...project,
    ...updates,
    id: project.id,
    createdAt: project.createdAt,
    updatedAt: now,
    completedAt: resolveCompletedAt(project, updates),
  };

  await writeFile(projectPath(id), JSON.stringify(updated, null, 2));
  return updated;
}

function resolveCompletedAt(
  existing: Project,
  updates: Partial<Pick<Project, "status">>
): string | null {
  if (!updates.status) return existing.completedAt;
  if (updates.status === "completed") {
    return existing.completedAt ?? new Date().toISOString();
  }
  return null;
}

export async function deleteProject(id: string): Promise<void> {
  // Verify it exists first
  await getProject(id);
  await unlink(projectPath(id));
}

const STATUS_ORDER: Record<string, number> = {
  "in-progress": 0,
  "planned": 1,
  "completed": 2,
};

export async function listProjects(): Promise<Project[]> {
  await ensureDir();
  const files = await readdir(DATA_DIR);
  const projects: Project[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(DATA_DIR, file), "utf-8");
      projects.push(ProjectSchema.parse(JSON.parse(raw)));
    } catch {
      // skip corrupt files
    }
  }
  return projects.sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export async function isDataDirEmpty(): Promise<boolean> {
  await ensureDir();
  const files = await readdir(DATA_DIR);
  return files.filter((f) => f.endsWith(".json")).length === 0;
}

export async function saveProjectDirect(project: Project): Promise<void> {
  await ensureDir();
  await writeFile(projectPath(project.id), JSON.stringify(project, null, 2));
}
