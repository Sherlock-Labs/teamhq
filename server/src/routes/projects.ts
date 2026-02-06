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
import { generateKickoffPrompt } from "../kickoff.js";
import { ZodError } from "zod";

const router = Router();

function formatZodError(err: ZodError) {
  return err.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

// List all projects (strip notes and kickoffPrompt for lean payload)
router.get("/projects", async (_req, res) => {
  try {
    const projects = await listProjects();
    const summaries = projects.map(({ notes, kickoffPrompt, activeSessionId, ...rest }) => ({
      ...rest,
      activeSessionId,
    }));
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

export default router;
