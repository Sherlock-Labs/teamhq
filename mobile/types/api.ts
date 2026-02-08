// Types mirroring server/src/schemas/project.ts and session.ts

export type ProjectStatus = "planned" | "in-progress" | "completed";

export interface Note {
  id: string;
  content: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  goals: string;
  constraints: string;
  brief: string;
  notes: Note[];
  kickoffPrompt: string | null;
  activeSessionId: string | null;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  status?: ProjectStatus;
  goals?: string;
  constraints?: string;
  brief?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  goals?: string;
  constraints?: string;
  brief?: string;
}

export type SessionStatus =
  | "running"
  | "completed"
  | "failed"
  | "stopped"
  | "timed-out";

export interface SessionMetadata {
  id: string;
  projectId: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  eventCount: number;
  exitCode: number | null;
  error: string | null;
  pid: number | null;
  cliSessionId: string | null;
  turnCount: number;
  state: "processing" | "idle" | "ended";
}
