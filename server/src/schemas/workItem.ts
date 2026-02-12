import { z } from "zod";

export const WorkItemStatus = z.enum(["planned", "in-progress", "completed", "deferred"]);
export const WorkItemPriority = z.enum(["high", "medium", "low"]);

export const WorkItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(200).default(""),
  status: WorkItemStatus.default("planned"),
  phase: z.string().default(""),
  owner: z.string().default(""),
  priority: WorkItemPriority.default("medium"),
});

export type WorkItem = z.infer<typeof WorkItemSchema>;

export const WorkItemsFileSchema = z.object({
  projectSlug: z.string(),
  workItems: z.array(WorkItemSchema).default([]),
});

export const PutWorkItemsBody = z.object({
  workItems: z.array(WorkItemSchema).min(0).max(200),
});
