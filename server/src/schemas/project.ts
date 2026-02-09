import { z } from "zod";

export const ProjectStatus = z.enum(["planned", "in-progress", "completed"]);

export type ProjectStatus = z.infer<typeof ProjectStatus>;

export const NoteSchema = z.object({
  id: z.string(),
  content: z.string().min(1),
  createdAt: z.string().datetime(),
});

export type Note = z.infer<typeof NoteSchema>;

// Pipeline types — agent task entries from data/tasks/{slug}.json
export const PipelineTaskStatus = z.enum(["completed", "in-progress", "pending", "skipped"]);

export const PipelineTaskSchema = z.object({
  title: z.string(),
  agent: z.string(),
  role: z.string(),
  status: PipelineTaskStatus,
  subtasks: z.array(z.string()).default([]),
  filesChanged: z.array(z.string()).default([]),
  decisions: z.array(z.string()).default([]),
});

export type PipelineTask = z.infer<typeof PipelineTaskSchema>;

export const PipelineSchema = z.object({
  tasks: z.array(PipelineTaskSchema).default([]),
});

export type Pipeline = z.infer<typeof PipelineSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  slug: z.string().nullable().default(null),       // human-readable identifier, links to data/tasks/{slug}.json
  name: z.string().min(1),
  description: z.string(),
  status: ProjectStatus,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  // Phase 2 fields
  goals: z.string().default(""),
  constraints: z.string().default(""),
  brief: z.string().default(""),
  notes: z.array(NoteSchema).default([]),
  kickoffPrompt: z.string().nullable().default(null),
  activeSessionId: z.string().nullable().default(null),
  pipeline: PipelineSchema.default({ tasks: [] }),  // pipeline task history
});

export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional(),                      // if omitted, auto-generated from name
  description: z.string().optional().default(""),
  status: ProjectStatus.optional().default("planned"),
  goals: z.string().optional().default(""),
  constraints: z.string().optional().default(""),
  brief: z.string().optional().default(""),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  description: z.string().optional(),
  status: ProjectStatus.optional(),
  goals: z.string().optional(),
  constraints: z.string().optional(),
  brief: z.string().optional(),
});

export const CreateNoteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
});
