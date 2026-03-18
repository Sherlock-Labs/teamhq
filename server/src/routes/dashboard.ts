import { Router } from "express";
import { listProjects } from "../store/projects.js";
import { getAllWorkItems } from "../store/workItems.js";
import { getRecentEvents, getEventsByDateRange } from "../store/eventLog.js";
import { listReviews } from "../store/reviews.js";
import { listHeartbeats } from "../store/heartbeats.js";
import type { EventEntry } from "../store/eventLog.js";

const router = Router();

// Agent roster (static — derived from .claude/agents/)
const AGENT_ROSTER = [
  "Thomas", "Andrei", "Robert", "Alice", "Jonah", "Sam", "Enzo",
  "Priya", "Suki", "Marco", "Nadia", "Yuki", "Kai", "Zara",
  "Leo", "Howard", "Ravi", "Derek", "Milo", "Morgan", "Atlas",
];

/**
 * GET /api/dashboard
 *
 * Single endpoint that aggregates all dashboard data.
 * Inspired by Paperclip's approach: system-derived metrics, not agent self-reports.
 */
router.get("/dashboard", async (_req, res) => {
  try {
    const [projects, allWorkItems, recentEvents, pendingReviewsList] = await Promise.all([
      listProjects(),
      getAllWorkItems(),
      getRecentEvents(30),
      listReviews({ status: "pending" }),
    ]);

    // --- Metrics ---
    const activeProject = projects.find((p) => p.status === "in-progress");
    const shippedCount = projects.filter((p) => p.status === "completed").length;

    // Flatten all work items to get in-progress count
    const allItems = allWorkItems.flatMap((wi) => wi.workItems);
    const inProgressCount = allItems.filter((i) => i.status === "in-progress").length;

    // Phase map — shared between header metric and active projects
    const phaseMap: Record<string, string> = {
      pm: "Scope", "technical-architect": "Architecture", arch: "Architecture",
      "product-designer": "Design", designer: "Design",
      "frontend-developer": "Frontend", fe: "Frontend",
      "backend-developer": "Backend", be: "Backend",
      qa: "QA", "code-reviewer": "Review",
    };

    // Determine current pipeline phase from active project
    let pipelinePhase = "Idle";
    let pipelineProject: string | null = null;
    if (activeProject) {
      pipelineProject = activeProject.name;
      const tasks = activeProject.pipeline?.tasks ?? [];
      if (Array.isArray(tasks) && tasks.length > 0) {
        // Walk through tasks to find current phase
        for (const task of tasks) {
          const t = task as Record<string, unknown>;
          if (t.status !== "completed") {
            const agent = (t.agent as string)?.toLowerCase() ?? "";
            pipelinePhase = phaseMap[agent] ?? "In Progress";
            break;
          }
        }
        if (tasks.every((t: Record<string, unknown>) => t.status === "completed")) {
          pipelinePhase = "Shipped";
        }
      } else {
        pipelinePhase = "Starting";
      }
    }

    // --- Charts (14-day data) ---
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const chartEvents = await getEventsByDateRange(
      fourteenDaysAgo.toISOString(),
      now.toISOString()
    );

    // Group events by date for charts
    const dayBuckets: Record<string, { events: typeof chartEvents; agents: Set<string> }> = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(now.getTime() - (13 - i) * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dayBuckets[key] = { events: [], agents: new Set() };
    }
    for (const event of chartEvents) {
      const key = event.timestamp.slice(0, 10);
      if (dayBuckets[key]) {
        dayBuckets[key].events.push(event);
        dayBuckets[key].agents.add(event.actor);
      }
    }

    const activityChart = Object.entries(dayBuckets).map(([date, bucket]) => ({
      date,
      count: bucket.events.length,
    }));

    const agentActivityChart = Object.entries(dayBuckets).map(([date, bucket]) => ({
      date,
      count: bucket.agents.size,
    }));

    // Tasks by status (current snapshot, not time series for v1)
    const tasksByStatus = {
      planned: allItems.filter((i) => i.status === "planned").length,
      inProgress: inProgressCount,
      completed: allItems.filter((i) => i.status === "completed").length,
      blocked: allItems.filter((i) => (i.status as string) === "blocked").length,
    };

    // --- Recent tasks (most recently updated) ---
    const recentTasks = allItems
      .filter((i) => i.status !== "completed")
      .slice(0, 15)
      .map((item) => {
        const parentProject = allWorkItems.find((wi) =>
          wi.workItems.some((i) => i.id === item.id)
        );
        return {
          id: item.id,
          title: item.title,
          status: item.status,
          owner: item.owner ?? null,
          project: parentProject?.projectSlug ?? "unknown",
        };
      });

    // --- Active agents (derived from recent events) ---
    const agentLastSeen: Record<string, { action: string; project?: string; timestamp: string }> = {};
    for (const event of recentEvents) {
      if (event.actor === "system") continue;
      if (!agentLastSeen[event.actor]) {
        agentLastSeen[event.actor] = {
          action: event.action,
          project: event.projectSlug,
          timestamp: event.timestamp,
        };
      }
    }
    const activeAgents = Object.entries(agentLastSeen)
      .slice(0, 6)
      .map(([name, info]) => ({
        name,
        lastAction: info.action,
        project: info.project ?? null,
        lastSeen: info.timestamp,
        status: isRecent(info.timestamp, 30) ? "active" : "idle",
      }));

    // --- Active pipelines (all in-progress projects with task progress) ---
    const activeProjects = projects
      .filter((p) => p.status === "in-progress")
      .map((p) => {
        const projectItems = allWorkItems.find((wi) => wi.projectSlug === p.slug);
        const items = projectItems?.workItems ?? [];
        const total = items.length;
        const done = items.filter((i) => i.status === "completed").length;
        const inProg = items.filter((i) => i.status === "in-progress").length;

        // Determine phase from pipeline tasks or work items
        let phase = "Starting";
        const tasks = p.pipeline?.tasks ?? [];
        if (Array.isArray(tasks) && tasks.length > 0) {
          for (const task of tasks) {
            const t = task as Record<string, unknown>;
            if (t.status !== "completed") {
              const agent = (t.agent as string)?.toLowerCase() ?? "";
              phase = phaseMap[agent] ?? "In Progress";
              break;
            }
          }
          if (tasks.every((t: Record<string, unknown>) => t.status === "completed")) {
            phase = "Shipped";
          }
        } else if (inProg > 0) {
          phase = "In Progress";
        }

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          phase,
          tasks: { total, completed: done, inProgress: inProg },
        };
      });

    // --- Recent completions (last 5 shipped projects) ---
    const recentCompletions = projects
      .filter((p) => p.status === "completed")
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        completedAt: p.updatedAt ?? null,
      }));

    // --- Response ---
    res.json({
      metrics: {
        pipeline: { phase: pipelinePhase, project: pipelineProject },
        shipped: shippedCount,
        inProgress: inProgressCount,
        teamSize: AGENT_ROSTER.length,
        pendingReviews: pendingReviewsList.length,
      },
      charts: {
        activity: activityChart,
        agentActivity: agentActivityChart,
        tasksByStatus,
      },
      activeProjects,
      recentCompletions,
      activeAgents,
      recentActivity: await enrichRecentActivity(recentEvents.slice(0, 20)),
      recentTasks,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

/**
 * GET /api/events
 * Raw event log access for debugging and the activity feed.
 */
router.get("/events", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const events = await getRecentEvents(limit);
    res.json(events);
  } catch (err) {
    console.error("Events error:", err);
    res.status(500).json({ error: "Failed to load events" });
  }
});

function isRecent(timestamp: string, minutesAgo: number): boolean {
  const t = new Date(timestamp).getTime();
  const cutoff = Date.now() - minutesAgo * 60 * 1000;
  return t > cutoff;
}

/**
 * Enrich recent events with heartbeat assessments and better descriptions.
 * Heartbeat events get expanded with the assessment summary and decision count.
 */
async function enrichRecentActivity(events: EventEntry[]) {
  // Load recent heartbeats for enrichment
  let heartbeats: Array<{ id: string; assessment?: string | null; decisions?: Array<{ action: string; status?: string }> }> = [];
  try {
    heartbeats = await listHeartbeats(10);
  } catch {}

  const heartbeatMap = new Map(heartbeats.map(h => [h.id, h]));

  return events.map((e) => {
    const base = {
      id: e.id,
      actor: e.actor,
      action: e.action,
      entityType: e.entityType,
      entityName: e.entityName,
      project: e.projectSlug ?? null,
      timestamp: e.timestamp,
      detail: null as string | null,
      decisions: null as Array<{ action: string; status?: string }> | null,
      icon: null as string | null,
    };

    // Enrich heartbeat events with assessment
    if (e.entityType === "agent" && e.entityName === "heartbeat" && e.entityId) {
      const hb = heartbeatMap.get(e.entityId);
      if (hb) {
        base.detail = hb.assessment?.replace(/\*\*/g, "").slice(0, 200) ?? null;
        base.decisions = (hb.decisions || []).slice(0, 5).map(d => ({
          action: d.action,
          status: d.status,
        }));
        base.icon = "heartbeat";
        // Simplify the action text
        base.action = "ran autonomous heartbeat";
      }
    }

    // Classify event types for icons
    if (e.action.includes("started working")) base.icon = "start";
    if (e.action.includes("completed task") || e.action.includes("completed")) base.icon = "complete";
    if (e.action.includes("failed")) base.icon = "error";
    if (e.action.includes("created project")) base.icon = "project";
    if (e.action.includes("updated work items")) base.icon = "tasks";
    if (e.action.includes("filed bug")) base.icon = "bug";

    return base;
  });
}

export default router;
