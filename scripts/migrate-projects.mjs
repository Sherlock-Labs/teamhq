/**
 * migrate-projects.mjs
 *
 * One-time migration script for the Project Consolidation effort.
 * Links existing projects to their data/tasks/{slug}.json files by setting
 * the `slug` field, and creates new project entries for task files that
 * have no matching project.
 *
 * Idempotent and additive-only — safe to run multiple times.
 *
 * Usage: node scripts/migrate-projects.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const ROOT = join(import.meta.dirname, '..');
const PROJECTS_DIR = join(ROOT, 'data', 'projects');
const TASKS_DIR = join(ROOT, 'data', 'tasks');
const INDEX_PATH = join(TASKS_DIR, 'index.json');

// Ensure projects directory exists
mkdirSync(PROJECTS_DIR, { recursive: true });

// --- Helpers ---

function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function readJSON(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function writeJSON(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

// --- Load existing projects ---

const projectFiles = readdirSync(PROJECTS_DIR).filter(f => f.endsWith('.json'));
const projectsByFilename = new Map(); // filename (without .json) -> project data
const projectsByName = new Map();     // lowercase name -> { filename, data }

for (const file of projectFiles) {
  const path = join(PROJECTS_DIR, file);
  const data = readJSON(path);
  const key = file.replace('.json', '');
  projectsByFilename.set(key, { path, data });

  // Index by lowercase name for fuzzy matching
  const nameLower = (data.name || '').toLowerCase().trim();
  if (nameLower) {
    projectsByName.set(nameLower, { filename: key, path, data });
  }
}

// --- Load task index ---

if (!existsSync(INDEX_PATH)) {
  console.log('No data/tasks/index.json found. Nothing to migrate.');
  process.exit(0);
}

const slugIndex = readJSON(INDEX_PATH);

// --- Counters ---

let updated = 0;
let matchedByName = 0;
let created = 0;
let skipped = 0;

// --- Process each slug ---

for (const slug of slugIndex) {
  const tasksFilePath = join(TASKS_DIR, `${slug}.json`);

  if (!existsSync(tasksFilePath)) {
    console.log(`  SKIP: ${slug} — no tasks file found`);
    skipped++;
    continue;
  }

  const tasksData = readJSON(tasksFilePath);

  // Case 1: Project file exists with slug as filename (e.g., data/projects/ost-tool.json)
  if (projectsByFilename.has(slug)) {
    const entry = projectsByFilename.get(slug);
    if (entry.data.slug === slug) {
      console.log(`  SKIP: ${slug} — already has slug set`);
      skipped++;
      continue;
    }

    // Add slug field (and pipeline default if missing)
    entry.data.slug = slug;
    if (!entry.data.pipeline) {
      entry.data.pipeline = { tasks: [] };
    }
    writeJSON(entry.path, entry.data);
    console.log(`  UPDATED: ${slug} — added slug to existing project file`);
    updated++;
    continue;
  }

  // Case 2: Match by name — scan UUID-named project files
  const taskNameLower = (tasksData.name || '').toLowerCase().trim();
  if (taskNameLower && projectsByName.has(taskNameLower)) {
    const entry = projectsByName.get(taskNameLower);

    if (entry.data.slug === slug) {
      console.log(`  SKIP: ${slug} — matched by name "${tasksData.name}", already has slug`);
      skipped++;
      continue;
    }

    entry.data.slug = slug;
    if (!entry.data.pipeline) {
      entry.data.pipeline = { tasks: [] };
    }
    writeJSON(entry.path, entry.data);
    console.log(`  MATCHED BY NAME: ${slug} — matched project "${entry.data.name}" (${entry.filename}), added slug`);
    matchedByName++;
    continue;
  }

  // Case 3: No match — create new project entry
  const now = new Date().toISOString();
  let completedAt = null;

  if (tasksData.status === 'completed' && tasksData.completedDate) {
    // completedDate is "YYYY-MM" format — use first of month
    completedAt = new Date(`${tasksData.completedDate}-01T00:00:00.000Z`).toISOString();
  } else if (tasksData.status === 'completed') {
    completedAt = now;
  }

  // Use slug as the project ID for these legacy entries (more readable than random UUIDs)
  const projectId = slug;
  const newProject = {
    id: projectId,
    slug: slug,
    name: tasksData.name || slug,
    description: tasksData.description || '',
    status: tasksData.status || 'planned',
    createdAt: completedAt || now,
    updatedAt: completedAt || now,
    completedAt: completedAt,
    goals: '',
    constraints: '',
    brief: '',
    notes: [],
    kickoffPrompt: null,
    activeSessionId: null,
    pipeline: { tasks: [] },
  };

  const newPath = join(PROJECTS_DIR, `${projectId}.json`);
  writeJSON(newPath, newProject);
  console.log(`  CREATED: ${slug} — new project entry from tasks file`);
  created++;
}

// --- Summary ---

console.log('\n--- Migration Summary ---');
console.log(`  Updated:        ${updated}`);
console.log(`  Matched by name: ${matchedByName}`);
console.log(`  Created:        ${created}`);
console.log(`  Skipped:        ${skipped}`);
console.log(`  Total processed: ${slugIndex.length}`);
