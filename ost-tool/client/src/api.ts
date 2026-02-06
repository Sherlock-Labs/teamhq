import type { Session, PerspectiveInfo } from "./types";

const BASE = "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

export function createSession(
  goal: string,
  context: string,
): Promise<Session> {
  return request("/sessions", {
    method: "POST",
    body: JSON.stringify({ goal, context }),
  });
}

export function getSession(id: string): Promise<Session> {
  return request(`/sessions/${id}`);
}

export function generateOST(sessionId: string): Promise<Session> {
  return request(`/sessions/${sessionId}/generate-ost`, {
    method: "POST",
  });
}

export function getPerspectives(): Promise<PerspectiveInfo[]> {
  return request("/perspectives");
}

export function runDebate(
  sessionId: string,
  solutionIds: string[],
  perspectiveIds: string[],
): Promise<Session> {
  return request(`/sessions/${sessionId}/debate`, {
    method: "POST",
    body: JSON.stringify({ solutionIds, perspectiveIds }),
  });
}

export function getRecommendation(sessionId: string): Promise<Session> {
  return request(`/sessions/${sessionId}/recommend`, {
    method: "POST",
  });
}
