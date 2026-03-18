import { listProjects } from "../store/projects.js";
import { getAllWorkItems } from "../store/workItems.js";
import { getRecentEvents } from "../store/eventLog.js";
import { listReviews } from "../store/reviews.js";
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { StateSnapshot } from "../store/heartbeats.js";

const PROJECT_ROOT = join(import.meta.dirname, "../../..");
const CEO_INBOX_PATH = join(PROJECT_ROOT, "data/ceo-inbox.json");

interface CeoDirective {
  text: string;
  addedAt: string;
}

async function loadCeoInbox(): Promise<CeoDirective[]> {
  try {
    const raw = await readFile(CEO_INBOX_PATH, "utf-8");
    return JSON.parse(raw) as CeoDirective[];
  } catch {
    return [];
  }
}

/**
 * Gather the full team state into a structured markdown string
 * and a numeric snapshot for the heartbeat record.
 */
export async function gatherState(): Promise<{
  stateMarkdown: string;
  ceoInboxMarkdown: string;
  snapshot: StateSnapshot;
}> {
  const [projects, allWorkItems, recentEvents, ceoInbox, pendingReviews] = await Promise.all([
    listProjects(),
    getAllWorkItems(),
    getRecentEvents(50),
    loadCeoInbox(),
    listReviews({ status: "pending" }),
  ]);
  // Also fetch changes-requested reviews for the state
  const changesRequestedReviews = await listReviews({ status: "changes-requested" });

  // Flatten all work items
  const allItems = allWorkItems.flatMap((wi) => wi.workItems);

  // Stale tasks: in-progress but not recently mentioned in events
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentTaskIds = new Set(
    recentEvents
      .filter((e) => new Date(e.timestamp).getTime() > twentyFourHoursAgo)
      .map((e) => e.entityId)
  );
  const inProgressItems = allItems.filter((i) => i.status === "in-progress");
  const staleItems = inProgressItems.filter((i) => !recentTaskIds.has(i.id));
  const blockedItems = allItems.filter((i) => i.status === "deferred");

  // Active agents from recent events (last 2 hours)
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  const activeAgents = new Set(
    recentEvents
      .filter(
        (e) =>
          e.actor !== "system" &&
          new Date(e.timestamp).getTime() > twoHoursAgo
      )
      .map((e) => e.actor)
  );

  const snapshot: StateSnapshot = {
    activeProjects: projects.filter((p) => p.status === "in-progress").length,
    totalTasks: allItems.length,
    inProgressTasks: inProgressItems.length,
    blockedTasks: blockedItems.length,
    staleTasks: staleItems.length,
    recentEvents: recentEvents.length,
    agentsActive: activeAgents.size,
  };

  // Build markdown
  const lines: string[] = [];

  // Projects
  lines.push("## Projects");
  if (projects.length === 0) {
    lines.push("No projects found.");
  } else {
    for (const p of projects) {
      lines.push(
        `- **${p.name}** [${p.status}] — ${p.description || "No description"}`
      );
    }
  }
  lines.push("");

  // Work items by project
  lines.push("## Work Items");
  if (allWorkItems.length === 0) {
    lines.push("No work items found.");
  } else {
    for (const wi of allWorkItems) {
      if (wi.workItems.length === 0) continue;
      lines.push(`### ${wi.projectSlug}`);
      for (const item of wi.workItems) {
        const ownerStr = item.owner ? ` (owner: ${item.owner})` : "";
        lines.push(`- [${item.status}] ${item.id}: ${item.title}${ownerStr}`);
      }
      lines.push("");
    }
  }

  // Blocked tasks
  if (blockedItems.length > 0) {
    lines.push("## Blocked Tasks");
    for (const item of blockedItems) {
      lines.push(`- ${item.id}: ${item.title} — ${item.description || "no details"}`);
    }
    lines.push("");
  }

  // Stale tasks
  if (staleItems.length > 0) {
    lines.push("## Stale Tasks (in-progress, no activity in 24h)");
    for (const item of staleItems) {
      const ownerStr = item.owner ? ` (owner: ${item.owner})` : "";
      lines.push(`- ${item.id}: ${item.title}${ownerStr}`);
    }
    lines.push("");
  }

  // Recent events
  lines.push("## Recent Events (last 50)");
  if (recentEvents.length === 0) {
    lines.push("No recent events.");
  } else {
    for (const e of recentEvents.slice(0, 30)) {
      lines.push(
        `- [${e.timestamp}] ${e.actor}: ${e.action} on ${e.entityName}${e.projectSlug ? ` (${e.projectSlug})` : ""}`
      );
    }
  }
  lines.push("");

  // Pending Reviews (pipeline gates)
  const allActiveReviews = [...pendingReviews, ...changesRequestedReviews];
  if (allActiveReviews.length > 0) {
    lines.push("## Pending Review Gates");
    lines.push("**IMPORTANT: These reviews block pipeline advancement. Do NOT advance tasks past the gated phase until the review is approved.**");
    lines.push("");
    for (const review of allActiveReviews) {
      const gateLabel = review.gate.replace(/^after/, "After ");
      lines.push(`- **${review.projectName}** — Gate: ${gateLabel} [${review.status}]`);
      lines.push(`  - Agent: ${review.agent} | Summary: ${review.summary}`);
      if (review.deliverables.length > 0) {
        lines.push(`  - Deliverables: ${review.deliverables.map(d => d.path).join(", ")}`);
      }
      if (review.feedback) {
        lines.push(`  - CEO Feedback: ${review.feedback}`);
      }
    }
    lines.push("");
  }

  // Summary stats
  lines.push("## Summary");
  lines.push(`- Active projects: ${snapshot.activeProjects}`);
  lines.push(`- Total tasks: ${snapshot.totalTasks}`);
  lines.push(`- In progress: ${snapshot.inProgressTasks}`);
  lines.push(`- Blocked: ${snapshot.blockedTasks}`);
  lines.push(`- Stale (>24h): ${snapshot.staleTasks}`);
  lines.push(`- Recent events: ${snapshot.recentEvents}`);
  lines.push(`- Agents active (last 2h): ${snapshot.agentsActive}`);

  // CEO inbox
  let ceoInboxMarkdown = "";
  if (ceoInbox.length > 0) {
    const ceoLines: string[] = [];
    for (const d of ceoInbox) {
      ceoLines.push(`- [${d.addedAt}] ${d.text}`);
    }
    ceoInboxMarkdown = ceoLines.join("\n");
  } else {
    ceoInboxMarkdown = "No pending CEO directives.";
  }

  return {
    stateMarkdown: lines.join("\n"),
    ceoInboxMarkdown,
    snapshot,
  };
}
