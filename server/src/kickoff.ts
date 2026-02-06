import type { Project } from "./schemas/project.js";

export function generateKickoffPrompt(project: Project): string {
  const sections: string[] = [];

  sections.push(`You have a new project to work on.`);
  sections.push(``);
  sections.push(`## Project: ${project.name}`);

  if (project.description) {
    sections.push(``);
    sections.push(`**Description:** ${project.description}`);
  }

  if (project.goals) {
    sections.push(``);
    sections.push(`**Goals:**`);
    sections.push(project.goals);
  }

  if (project.constraints) {
    sections.push(``);
    sections.push(`**Constraints:**`);
    sections.push(project.constraints);
  }

  if (project.brief) {
    sections.push(``);
    sections.push(`**Brief:**`);
    sections.push(project.brief);
  }

  sections.push(``);
  sections.push(`## How to Proceed`);
  sections.push(``);
  sections.push(`1. Spawn Thomas (PM) first. He will scope the work, write requirements, and define who else needs to be involved.`);
  sections.push(`2. Thomas will write requirements to docs/ and create tasks with dependencies.`);
  sections.push(`3. Follow Thomas's recommendations for who to spawn next (typically: Andrei for architecture, Robert for design, then Alice and Jonah for implementation, Enzo for QA).`);
  sections.push(`4. All work flows through Thomas first -- do not skip the PM.`);
  sections.push(``);
  sections.push(`## Team Reference`);
  sections.push(``);
  sections.push(`The agent definitions are in .claude/agents/:`);
  sections.push(`- product-manager.md (Thomas) -- PM, scopes work`);
  sections.push(`- technical-architect.md (Andrei) -- architecture decisions`);
  sections.push(`- product-designer.md (Robert) -- UI/UX design`);
  sections.push(`- frontend-developer.md (Alice) -- frontend implementation`);
  sections.push(`- backend-developer.md (Jonah) -- backend implementation`);
  sections.push(`- qa.md (Enzo) -- testing and validation`);

  return sections.join("\n");
}
