import { Router } from "express";
import {
  createProject,
  getProject,
  updateProject,
  deleteProject,
  listProjects,
  startProject,
  addNote,
  deleteNote,
} from "../store/projects.js";
import { CreateProjectSchema, UpdateProjectSchema, CreateNoteSchema } from "../schemas/project.js";
import type { Pipeline } from "../schemas/project.js";
import { generateKickoffPrompt } from "../kickoff.js";
import { ZodError } from "zod";
import { formatZodError } from "./utils.js";
import { PutWorkItemsBody } from "../schemas/workItem.js";
import { getWorkItems, putWorkItems } from "../store/workItems.js";
import { getWorkLog } from "../store/sessions.js";

const router = Router();

// --- Pipeline stats helper ---

function computePipelineStats(pipeline: Pipeline): {
  taskCount: number;
  fileCount: number;
  decisionCount: number;
  agents: string[];
} {
  const agentSet = new Set<string>();
  let fileCount = 0;
  let decisionCount = 0;

  for (const task of pipeline.tasks) {
    agentSet.add(task.agent.toLowerCase());
    fileCount += task.filesChanged.length;
    decisionCount += task.decisions.length;
  }

  return {
    taskCount: pipeline.tasks.length,
    fileCount,
    decisionCount,
    agents: Array.from(agentSet),
  };
}

// List all projects (strip notes, kickoffPrompt, and full pipeline.tasks for lean payload)
router.get("/projects", async (_req, res) => {
  try {
    const projects = await listProjects();
    const summaries = projects.map(({ notes, kickoffPrompt, pipeline, ...rest }) => {
      // Precompute pipeline stats for list view
      const pipelineStats = computePipelineStats(pipeline);
      return {
        ...rest,
        pipeline: pipelineStats,
      };
    });
    res.json({ projects: summaries });
  } catch (err) {
    console.error("Error listing projects:", err);
    res.status(500).json({ error: "Failed to list projects" });
  }
});

// Create a project
router.post("/projects", async (req, res) => {
  try {
    const parsed = CreateProjectSchema.parse(req.body);
    const project = await createProject(parsed);
    res.status(201).json(project);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "Validation failed", details: formatZodError(err) });
      return;
    }
    console.error("Error creating project:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// Get a single project (full payload including notes and kickoffPrompt)
router.get("/projects/:id", async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    res.json(project);
  } catch {
    res.status(404).json({ error: "Project not found" });
  }
});

// Update a project
router.patch("/projects/:id", async (req, res) => {
  try {
    const parsed = UpdateProjectSchema.parse(req.body);
    const project = await updateProject(req.params.id, parsed);
    res.json(project);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "Validation failed", details: formatZodError(err) });
      return;
    }
    if (err instanceof Error && err.message.includes("ENOENT")) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    console.error("Error updating project:", err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

// Delete a project
router.delete("/projects/:id", async (req, res) => {
  try {
    await deleteProject(req.params.id);
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Project not found" });
  }
});

// Start work on a project (generate kickoff prompt, set status to in-progress)
router.post("/projects/:id/start", async (req, res) => {
  try {
    const project = await getProject(req.params.id);

    // Idempotent: if already started, return existing prompt
    if (project.status !== "planned") {
      res.json(project);
      return;
    }

    const kickoffPrompt = generateKickoffPrompt(project);
    const updated = await startProject(req.params.id, kickoffPrompt);
    res.json(updated);
  } catch (err) {
    if (err instanceof Error && err.message.includes("ENOENT")) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    console.error("Error starting project:", err);
    res.status(500).json({ error: "Failed to start project" });
  }
});

// Add a note to a project
router.post("/projects/:id/notes", async (req, res) => {
  try {
    const parsed = CreateNoteSchema.parse(req.body);
    const note = await addNote(req.params.id, parsed.content);
    res.status(201).json(note);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "Validation failed", details: formatZodError(err) });
      return;
    }
    if (err instanceof Error && err.message.includes("ENOENT")) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    console.error("Error adding note:", err);
    res.status(500).json({ error: "Failed to add note" });
  }
});

// Delete a note from a project
router.delete("/projects/:id/notes/:noteId", async (req, res) => {
  try {
    await deleteNote(req.params.id, req.params.noteId);
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error && err.message.includes("ENOENT")) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (err instanceof Error && err.message === "Note not found") {
      res.status(404).json({ error: "Note not found" });
      return;
    }
    console.error("Error deleting note:", err);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

// Get work items for a project
router.get("/projects/:id/work-items", async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    if (!project.slug) {
      res.json({ workItems: [] });
      return;
    }
    const result = await getWorkItems(project.slug);
    res.json({ workItems: result.workItems, taskPrefix: result.taskPrefix });
  } catch {
    res.status(404).json({ error: "Project not found" });
  }
});

// Replace all work items for a project
router.put("/projects/:id/work-items", async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    if (!project.slug) {
      res.status(400).json({ error: "Project has no slug" });
      return;
    }
    const parsed = PutWorkItemsBody.parse(req.body);
    const saved = await putWorkItems(project.slug, parsed.workItems);
    res.json({ workItems: saved });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "Validation failed", details: formatZodError(err) });
      return;
    }
    if (err instanceof Error && err.message.includes("ENOENT")) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    console.error("Error handling work items:", err);
    res.status(500).json({ error: "Failed to process work items" });
  }
});

// Get aggregated work log for a project (all sessions merged chronologically)
router.get("/projects/:id/work-log", async (req, res) => {
  try {
    await getProject(req.params.id);
  } catch {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  try {
    const offset = parseInt(req.query.offset as string) || 0;
    const workLog = await getWorkLog(req.params.id, offset);
    res.json(workLog);
  } catch (err) {
    console.error("Error fetching work log:", err);
    res.status(500).json({ error: "Failed to fetch work log" });
  }
});

export default router;
