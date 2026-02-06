import { Router } from "express";
import {
  createProject,
  getProject,
  updateProject,
  deleteProject,
  listProjects,
} from "../store/projects.js";
import { CreateProjectSchema, UpdateProjectSchema } from "../schemas/project.js";
import { ZodError } from "zod";

const router = Router();

function formatZodError(err: ZodError) {
  return err.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

// List all projects
router.get("/projects", async (_req, res) => {
  try {
    const projects = await listProjects();
    res.json({ projects });
  } catch (err) {
    console.error("Error listing projects:", err);
    res.status(500).json({ error: "Failed to list projects" });
  }
});

// Create a project
router.post("/projects", async (req, res) => {
  try {
    const parsed = CreateProjectSchema.parse(req.body);
    const project = await createProject(parsed.name, parsed.description, parsed.status);
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

// Get a single project
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
    // Check if it's a not-found error (file read failure)
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

export default router;
