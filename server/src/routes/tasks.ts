import { Router } from "express";
import { listProjects } from "../store/projects.js";
import { getAllWorkItems } from "../store/workItems.js";

const router = Router();

router.get("/tasks", async (_req, res) => {
  try {
    // 1. Get all projects — build slug → { id, name, slug } map
    const projects = await listProjects();
    const slugMap: Record<string, { id: string; name: string; slug: string; taskPrefix?: string }> = {};
    for (const p of projects) {
      if (p.slug) {
        slugMap[p.slug] = { id: p.id, name: p.name, slug: p.slug };
      }
    }

    // 2. Read all work-items files
    const allFiles = await getAllWorkItems();

    // 3. Flatten and attach project info
    const tasks = [];
    for (const file of allFiles) {
      const project = slugMap[file.projectSlug];
      if (!project) continue; // orphaned work-items file — skip
      // Attach taskPrefix to project info
      const projectWithPrefix = { ...project, taskPrefix: file.taskPrefix || "" };
      for (const item of file.workItems) {
        tasks.push({ ...item, project: projectWithPrefix });
      }
    }

    res.json({ tasks });
  } catch (err) {
    console.error("Error fetching all tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

export default router;
