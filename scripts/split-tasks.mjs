import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const src = join(import.meta.dirname, '..', 'data', 'tasks.json');
const destDir = join(import.meta.dirname, '..', 'data', 'tasks');

mkdirSync(destDir, { recursive: true });

const data = JSON.parse(readFileSync(src, 'utf-8'));
const index = [];

for (const project of data.projects) {
  const dest = join(destDir, `${project.id}.json`);
  writeFileSync(dest, JSON.stringify(project, null, 2) + '\n');
  index.push(project.id);
  console.log(`  wrote ${project.id}.json`);
}

writeFileSync(join(destDir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log(`\nSplit ${data.projects.length} projects into data/tasks/`);
console.log(`Index written to data/tasks/index.json`);
