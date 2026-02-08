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
  sections.push(`## Instructions`);
  sections.push(``);
  sections.push(`Hand this project to Thomas (PM) to scope and manage. He will decide who to involve and in what order. Follow CLAUDE.md and the agent definitions for workflow and team details.`);

  return sections.join("\n");
}
