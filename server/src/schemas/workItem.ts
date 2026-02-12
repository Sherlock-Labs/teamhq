import { z } from "zod";

export const WorkItemStatus = z.enum(["planned", "in-progress", "completed", "deferred"]);
export const WorkItemPriority = z.enum(["high", "medium", "low"]);

export const WorkItemType = z.enum(["task", "bug", "feature"]);

export const WorkItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(200).default(""),
  description: z.string().default(""),
  status: WorkItemStatus.default("planned"),
  phase: z.string().default(""),
  owner: z.string().default(""),
  priority: WorkItemPriority.default("medium"),
  createdBy: z.string().default(""),
  type: WorkItemType.default("task"),
  metadata: z.record(z.string()).default({}),
});

export type WorkItem = z.infer<typeof WorkItemSchema>;

export const WorkItemsFileSchema = z.object({
  projectSlug: z.string(),
  taskPrefix: z.string().default(""),
  workItems: z.array(WorkItemSchema).default([]),
});

export const PutWorkItemsBody = z.object({
  workItems: z.array(WorkItemSchema).min(0).max(200),
});
