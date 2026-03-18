import { Router } from "express";
import fs from "node:fs";
import path from "node:path";

const router = Router();

const dataDir = path.resolve(import.meta.dirname, "../../..", "data");
const pipelineIndexPath = path.join(dataDir, "pipeline-log", "index.json");
const projectsDir = path.join(dataDir, "projects");

router.get("/health", (_req, res) => {
  const checks = {
    server: true,
    dataDir: false,
    pipelineIndex: false,
    projectsDir: false,
  };

  // Check data/ directory exists and is readable
  try {
    fs.accessSync(dataDir, fs.constants.R_OK);
    checks.dataDir = true;
  } catch {
    // not readable
  }

  // Check data/pipeline-log/index.json is parseable JSON
  try {
    const raw = fs.readFileSync(pipelineIndexPath, "utf-8");
    JSON.parse(raw);
    checks.pipelineIndex = true;
  } catch {
    // missing or invalid JSON
  }

  // Check data/projects/ directory has files
  try {
    const files = fs.readdirSync(projectsDir);
    checks.projectsDir = files.length > 0;
  } catch {
    // directory missing or unreadable
  }

  const allPass = checks.dataDir && checks.pipelineIndex && checks.projectsDir;
  const anyPass = checks.dataDir || checks.pipelineIndex || checks.projectsDir;
  const status = allPass ? "healthy" : anyPass ? "degraded" : "unhealthy";

  res.json({
    status,
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
