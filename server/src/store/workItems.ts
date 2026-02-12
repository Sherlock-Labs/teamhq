import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { WorkItemsFileSchema } from "../schemas/workItem.js";
import type { WorkItem } from "../schemas/workItem.js";

const WORK_ITEMS_DIR = join(import.meta.dirname, "../../../data/work-items");

async function ensureDir(): Promise<void> {
  await mkdir(WORK_ITEMS_DIR, { recursive: true });
}

export async function getWorkItems(slug: string): Promise<{ workItems: WorkItem[]; taskPrefix: string }> {
  try {
    const raw = await readFile(join(WORK_ITEMS_DIR, `${slug}.json`), "utf-8");
    const parsed = WorkItemsFileSchema.parse(JSON.parse(raw));
    return { workItems: parsed.workItems, taskPrefix: parsed.taskPrefix };
  } catch {
    return { workItems: [], taskPrefix: "" };
  }
}

export async function putWorkItems(slug: string, workItems: WorkItem[], taskPrefix?: string): Promise<WorkItem[]> {
  await ensureDir();
  // Preserve existing taskPrefix if not provided
  let prefix = taskPrefix ?? "";
  if (!taskPrefix) {
    try {
      const raw = await readFile(join(WORK_ITEMS_DIR, `${slug}.json`), "utf-8");
      const existing = WorkItemsFileSchema.parse(JSON.parse(raw));
      prefix = existing.taskPrefix;
    } catch {
      // no existing file
    }
  }
  const data = { projectSlug: slug, taskPrefix: prefix, workItems };
  await writeFile(join(WORK_ITEMS_DIR, `${slug}.json`), JSON.stringify(data, null, 2));
  return workItems;
}

export async function getAllWorkItems(): Promise<Array<{ projectSlug: string; taskPrefix: string; workItems: WorkItem[] }>> {
  await ensureDir();
  const files = await readdir(WORK_ITEMS_DIR);
  const results: Array<{ projectSlug: string; taskPrefix: string; workItems: WorkItem[] }> = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(WORK_ITEMS_DIR, file), "utf-8");
      const parsed = WorkItemsFileSchema.parse(JSON.parse(raw));
      results.push({ projectSlug: parsed.projectSlug, taskPrefix: parsed.taskPrefix, workItems: parsed.workItems });
    } catch {
      // skip corrupt files
    }
  }
  return results;
}
