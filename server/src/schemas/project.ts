import { z } from "zod";

export const ProjectStatus = z.enum(["planned", "in-progress", "completed"]);

export type ProjectStatus = z.infer<typeof ProjectStatus>;

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  status: ProjectStatus,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
  status: ProjectStatus.optional().default("planned"),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  description: z.string().optional(),
  status: ProjectStatus.optional(),
});
