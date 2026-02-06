import { z } from "zod";

export const ProjectStatus = z.enum(["planned", "in-progress", "completed"]);

export type ProjectStatus = z.infer<typeof ProjectStatus>;

export const NoteSchema = z.object({
  id: z.string(),
  content: z.string().min(1),
  createdAt: z.string().datetime(),
});

export type Note = z.infer<typeof NoteSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
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
});

export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
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
