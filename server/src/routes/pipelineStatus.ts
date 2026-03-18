import { Router } from "express";
import fs from "node:fs";
import path from "node:path";

const router = Router();

const dataDir = path.resolve(import.meta.dirname, "../../..", "data");
const pipelineDir = path.join(dataDir, "pipeline-log");
const pipelineIndexPath = path.join(pipelineDir, "index.json");
const reviewsDir = path.join(dataDir, "reviews");

interface PipelineTask {
  agent: string;
  role?: string;
  status: string;
}

interface PipelineProject {
  slug: string;
  name: string;
  status: string | null;
  taskCount: number;
  completedTasks: number;
  currentPhase: string | null;
  agents: string[];
}

function readPipelineIndex(): string[] {
  try {
    const raw = fs.readFileSync(pipelineIndexPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function readPipelineProject(slug: string): PipelineProject | null {
  try {
    const filePath = path.join(pipelineDir, `${slug}.json`);
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    const tasks: PipelineTask[] = data.tasks || [];
    const completedTasks = tasks.filter((t) => t.status === "completed").length;

    // Current phase = first non-completed task's agent/role
    const currentTask = tasks.find((t) => t.status !== "completed");
    const currentPhase = currentTask
      ? currentTask.role || currentTask.agent
      : null;

    const agents = [...new Set(tasks.map((t) => t.agent))];

    return {
      slug,
      name: data.name || slug,
      status: data.status || (completedTasks === tasks.length && tasks.length > 0 ? "completed" : "in-progress"),
      taskCount: tasks.length,
      completedTasks,
      currentPhase,
      agents,
    };
  } catch {
    return null;
  }
}

function countPendingReviews(): number {
  try {
    const files = fs.readdirSync(reviewsDir).filter((f) => f.endsWith(".json"));
    let count = 0;
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(reviewsDir, file), "utf-8");
        const review = JSON.parse(raw);
        if (review.status === "pending") count++;
      } catch {
        // skip unreadable files
      }
    }
    return count;
  } catch {
    return 0;
  }
}

router.get("/pipeline-status", (_req, res) => {
  const slugs = readPipelineIndex();
  const projects = slugs
    .map(readPipelineProject)
    .filter((p): p is PipelineProject => p !== null);

  const active = projects.filter(
    (p) => p.status === "in-progress" || p.status === "active",
  );
  const recentCompleted = projects
    .filter((p) => p.status === "completed" || (p.completedTasks === p.taskCount && p.taskCount > 0))
    .slice(-5)
    .reverse();
  const pendingReviews = countPendingReviews();

  res.json({
    active,
    recentCompleted,
    pendingReviews,
    totalProjects: projects.length,
    timestamp: new Date().toISOString(),
  });
});

export default router;
