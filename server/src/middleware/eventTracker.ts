import type { Request, Response, NextFunction } from "express";
import { logEvent } from "../store/eventLog.js";

/**
 * Express middleware that automatically logs mutations (POST, PUT, PATCH, DELETE)
 * to the event log. This is the Paperclip-inspired "observe, don't ask" pattern —
 * the system records what agents do without requiring them to self-report.
 *
 * Hooks into res.json() to capture the response and log after success.
 */
export function eventTracker(req: Request, res: Response, next: NextFunction): void {
  // Only track mutations
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    next();
    return;
  }

  // Skip health checks and non-API routes
  if (!req.originalUrl.startsWith("/api")) {
    next();
    return;
  }

  // Intercept res.json to capture the response
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    // Only log successful mutations (2xx)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const event = parseEventFromRequest(req, body);
      if (event) {
        // Fire and forget — don't block the response
        logEvent(event).catch(() => {});
      }
    }
    return originalJson(body);
  };

  next();
}

interface ParsedEvent {
  actor: string;
  action: string;
  entityType: "project" | "work-item" | "pipeline-task" | "session" | "agent";
  entityId: string;
  entityName: string;
  projectSlug?: string;
  details?: Record<string, unknown>;
}

function parseEventFromRequest(req: Request, body: unknown): ParsedEvent | null {
  const url = req.originalUrl;
  const method = req.method;
  const b = body as Record<string, unknown>;

  // Detect actor from request headers or body
  const actor = detectActor(req);

  // --- Project mutations ---
  if (url.match(/^\/api\/projects\/?$/) && method === "POST") {
    return {
      actor,
      action: "created project",
      entityType: "project",
      entityId: (b?.id as string) ?? "",
      entityName: (b?.name as string) ?? "Unknown",
      projectSlug: (b?.slug as string) ?? undefined,
    };
  }

  const projectMatch = url.match(/^\/api\/projects\/([^/]+)\/?$/);
  if (projectMatch) {
    if (method === "PUT" || method === "PATCH") {
      const statusChanged = req.body?.status;
      const action = statusChanged
        ? `updated project status to ${statusChanged}`
        : "updated project";
      return {
        actor,
        action,
        entityType: "project",
        entityId: projectMatch[1],
        entityName: (b?.name as string) ?? projectMatch[1],
        projectSlug: (b?.slug as string) ?? undefined,
        details: statusChanged ? { status: statusChanged } : undefined,
      };
    }
    if (method === "DELETE") {
      return {
        actor,
        action: "deleted project",
        entityType: "project",
        entityId: projectMatch[1],
        entityName: projectMatch[1],
      };
    }
  }

  // --- Work item mutations ---
  const workItemMatch = url.match(/^\/api\/projects\/([^/]+)\/work-items\/?$/);
  if (workItemMatch && method === "PUT") {
    const items = Array.isArray(b?.workItems) ? b.workItems as Record<string, unknown>[] : [];
    const completed = items.filter((i) => i.status === "completed").length;
    const inProgress = items.filter((i) => i.status === "in-progress").length;
    return {
      actor,
      action: `updated work items (${completed} completed, ${inProgress} in progress)`,
      entityType: "work-item",
      entityId: workItemMatch[1],
      entityName: `work items for ${workItemMatch[1]}`,
      projectSlug: workItemMatch[1],
      details: { totalItems: items.length, completed, inProgress },
    };
  }

  // --- Session mutations ---
  const sessionMatch = url.match(/^\/api\/projects\/([^/]+)\/sessions/);
  if (sessionMatch) {
    if (method === "POST" && url.endsWith("/sessions")) {
      return {
        actor,
        action: "started agent session",
        entityType: "session",
        entityId: (b?.id as string) ?? "",
        entityName: (b?.agentName as string) ?? "agent session",
        projectSlug: sessionMatch[1],
        details: { agentName: b?.agentName },
      };
    }
  }

  // --- Bug reports ---
  if (url.match(/^\/api\/bug-reports/) && method === "POST") {
    return {
      actor,
      action: "filed bug report",
      entityType: "work-item",
      entityId: (b?.id as string) ?? "",
      entityName: (b?.title as string) ?? "bug report",
    };
  }

  return null;
}

/**
 * Try to detect who is making the request.
 * Agents can set X-Agent-Name header. Falls back to "system".
 */
function detectActor(req: Request): string {
  // Check for agent identity header
  const agentHeader = req.headers["x-agent-name"];
  if (typeof agentHeader === "string" && agentHeader.trim()) {
    return agentHeader.trim();
  }

  // Check request body for owner/agent fields
  const body = req.body;
  if (body?.owner && typeof body.owner === "string") {
    return body.owner;
  }

  // Check for work item updates with owner changes
  if (Array.isArray(body?.workItems)) {
    const owners = new Set<string>();
    for (const item of body.workItems) {
      if (item?.owner && typeof item.owner === "string") {
        owners.add(item.owner);
      }
    }
    if (owners.size === 1) {
      return [...owners][0];
    }
  }

  return "system";
}
