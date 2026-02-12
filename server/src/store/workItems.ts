import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { WorkItemsFileSchema } from "../schemas/workItem.js";
import type { WorkItem } from "../schemas/workItem.js";

const WORK_ITEMS_DIR = join(import.meta.dirname, "../../../data/work-items");

async function ensureDir(): Promise<void> {
  await mkdir(WORK_ITEMS_DIR, { recursive: true });
}

export async function getWorkItems(slug: string): Promise<WorkItem[]> {
  try {
    const raw = await readFile(join(WORK_ITEMS_DIR, `${slug}.json`), "utf-8");
    const parsed = WorkItemsFileSchema.parse(JSON.parse(raw));
    return parsed.workItems;
  } catch {
    return []; // file doesn't exist yet — empty array
  }
}

export async function putWorkItems(slug: string, workItems: WorkItem[]): Promise<WorkItem[]> {
  await ensureDir();
  const data = { projectSlug: slug, workItems };
  await writeFile(join(WORK_ITEMS_DIR, `${slug}.json`), JSON.stringify(data, null, 2));
  return workItems;
}

export async function getAllWorkItems(): Promise<Array<{ projectSlug: string; workItems: WorkItem[] }>> {
  await ensureDir();
  const files = await readdir(WORK_ITEMS_DIR);
  const results: Array<{ projectSlug: string; workItems: WorkItem[] }> = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(WORK_ITEMS_DIR, file), "utf-8");
      const parsed = WorkItemsFileSchema.parse(JSON.parse(raw));
      results.push({ projectSlug: parsed.projectSlug, workItems: parsed.workItems });
    } catch {
      // skip corrupt files
    }
  }
  return results;
}
