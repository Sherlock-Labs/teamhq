#!/usr/bin/env node
/**
 * Seeds the team memory database with existing project knowledge.
 * Run: node scripts/seed-memory.mjs
 *
 * Spawns the mcp-memory-libsql server as a child process,
 * sends JSON-RPC messages over stdio, then exits.
 */

import { spawn } from "child_process";
import { createInterface } from "readline";

// ── MCP Client ──────────────────────────────────────────────
let requestId = 0;
let child;
let rl;
const pending = new Map();

function startServer() {
  child = spawn("npx", ["-y", "mcp-memory-libsql"], {
    env: {
      ...process.env,
      LIBSQL_URL: "file:data/memory/team-memory.db",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  rl = createInterface({ input: child.stdout });
  rl.on("line", (line) => {
    try {
      const msg = JSON.parse(line);
      if (msg.id != null && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    } catch {}
  });

  child.stderr.on("data", () => {}); // suppress stderr noise
}

function send(method, params = {}) {
  const id = ++requestId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    child.stdin.write(msg + "\n");
  });
}

async function callTool(name, args) {
  return send("tools/call", { name, arguments: args });
}

async function initialize() {
  await send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "seed-script", version: "1.0.0" },
  });
  await send("notifications/initialized", {});
}

// ── Seed Data ───────────────────────────────────────────────

const projects = [
  {
    name: "TeamHQ Landing Page",
    entityType: "project",
    observations: [
      "Static single-page site introducing the AI product team",
      "Stack: plain HTML + CSS, no frameworks, no build step",
      "Completed January 2025",
      "First project shipped by the team",
      "Features: hero section, 6 agent cards, 'How It Works' 4-step section",
      "CSS custom properties for all design tokens",
      "Mobile-first responsive: 3 breakpoints (640px, 1024px)",
      "System font stack initially, Google Fonts Inter added during redesign",
      "Lesson: plain HTML/CSS is sufficient for informational pages — don't reach for a framework",
    ],
  },
  {
    name: "OST Tool",
    entityType: "project",
    observations: [
      "Full-stack Opportunity Solution Tree tool with AI-generated trees, debates, and recommendations",
      "Stack: Vite + React frontend, Express + TypeScript backend, Claude CLI integration",
      "Completed February 2025",
      "Uses React Flow for interactive tree visualization",
      "Claude CLI integration via child process with --output-format json and --json-schema",
      "Three debater personalities: optimist, skeptic, pragmatist",
      "npm workspaces monorepo with /server and /client packages",
      "Zod for request/response validation of AI-generated JSON",
      "In-memory session store — no database needed for single-user tool",
      "Lesson: React Flow saved weeks vs building D3 from scratch",
      "Lesson: Zod is essential for validating AI-generated JSON at runtime",
    ],
  },
  {
    name: "TeamHQ Redesign",
    entityType: "project",
    observations: [
      "Redesigned landing page: dark theme, sticky nav bar, Tools section",
      "Stack: same plain HTML/CSS, no framework migration",
      "Completed February 2025",
      "Zinc-scale dark palette: zinc-950 bg, zinc-900 cards, zinc-800 borders",
      "Indigo-500 accents with indigo-400 hover states",
      "Positioned TeamHQ as central hub, not just informational page",
      "Tools section above Team Roster to emphasize shipped work",
      "Border-color hover instead of box-shadow — shadows invisible on dark backgrounds",
      "CSS-only smooth scroll, no JavaScript scroll libraries",
      "Lesson: dark theme redesign was a simple CSS variable swap thanks to design tokens",
    ],
  },
  {
    name: "Task History",
    entityType: "project",
    observations: [
      "Added Tasks section to landing page with expandable project cards and subtask breakdowns",
      "Stack: vanilla JS (IIFE), fetch API, CSS grid-template-rows animation",
      "Completed February 2025",
      "First JavaScript added to the landing page",
      "Accordion pattern: one card expanded at a time",
      "Data-driven: loads from data/tasks.json via Fetch API",
      "CSS grid-template-rows for smooth expand/collapse — no JS height calculation needed",
      "Single delegated event listener on container for performance",
      "Progressive enhancement: noscript fallback for JS-disabled browsers",
      "Lesson: CSS grid-template-rows animation is cleaner than JS height calculation — use it everywhere",
      "Lesson: template literals over createElement for readable DOM generation",
    ],
  },
  {
    name: "OST Recommendation Redesign",
    entityType: "project",
    observations: [
      "Redesigned OST recommendation page to reduce color overload and surface debater reasoning",
      "Status: in-progress (frontend complete, awaiting QA)",
      "Reduced 15+ hues to 3 accents: indigo (primary), emerald (positive), red (negative)",
      "Replaced hover-only tooltips with expandable accordion sections",
      "XOR expand-all/collapse-all toggle pattern",
      "Pure frontend change — no backend modifications",
      "Lesson: too many colors create cognitive overload — limit accents to 3 max",
    ],
  },
  {
    name: "Phase 3a Live Agent Progress",
    entityType: "project",
    observations: [
      "Live agent session execution from browser with streaming activity log",
      "Status: in-progress (frontend and backend complete, awaiting QA)",
      "SSE (Server-Sent Events) over WebSocket — unidirectional, simpler, auto-reconnects",
      "NDJSON append-only files for event storage — cheap writes, easy replay",
      "SessionRunner spawns Claude CLI as child process with stream-json output",
      "SessionManager singleton enforces concurrency limits: 1 per project, 3 global",
      "Server restart recovery: scans for orphaned 'running' sessions on startup",
      "5 event types: assistant_text, tool_use, tool_result, system, error",
      "Auto-scroll with scroll-lock detection and 'Jump to latest' button",
      "30-minute session timeout, 5000 event limit with auto-termination",
      "Lesson: SSE with EventSource is far simpler than WebSocket for unidirectional streaming",
      "Lesson: NDJSON is perfect for streaming event logs — append-only, easy replay with offset",
      "Lesson: --verbose flag required when using claude -p with --output-format stream-json",
    ],
  },
  {
    name: "TeamHQ Mobile App",
    entityType: "project",
    observations: [
      "Voice-first mobile companion app for the CEO",
      "Stack: React Native + Expo (SDK 54), expo-router, TanStack Query, Zustand, Reanimated",
      "Status: in-progress (Zara's screens complete, Leo's components pending)",
      "Voice recording with silence detection (2s detect + 3s countdown auto-stop)",
      "WebSocket streaming for voice transcription",
      "LLM-powered project name extraction from voice transcripts",
      "Project list with stagger animations, status filter chips, pull-to-refresh with haptics",
      "Zara created functional stubs for Leo's shared components following exact interface contracts",
      "Used React Native Modal (not Expo Router modal) for voice overlay — transient interaction",
      "Optimistic updates on useAddNote, standard invalidation for other mutations",
      "Lesson: create stubs matching the interface contract to unblock parallel work",
      "Lesson: useRef for recording state to avoid stale closures in audio stream callbacks",
    ],
  },
  {
    name: "SherlockPDF",
    entityType: "project",
    observations: [
      "Unified PDF toolkit SaaS with Stripe billing",
      "Client-side PDF processing: pdf-lib and pdf.js via CDN, 100% in browser",
      "Single-file tools pattern: each tool is one index.html with embedded CSS/JS",
      "Privacy by default — files never leave the browser",
      "Tools: PDF splitter, PDF combiner (with SortableJS drag-and-drop)",
    ],
  },
];

const patterns = [
  {
    name: "dark-theme-tokens",
    entityType: "pattern",
    observations: [
      "CSS custom properties for all colors: zinc-950 bg, zinc-900 cards, zinc-800 borders",
      "Indigo-500 primary accent, indigo-400 hover state",
      "Emerald for positive/success, red for negative/error, yellow for warning",
      "WCAG AA contrast ratios for all text on dark backgrounds",
      "Border-color hover instead of box-shadow on dark backgrounds",
      "Defined in skills/development/css-dark-theme.md",
      "Used by: TeamHQ Redesign, OST Tool, Task History, SherlockPDF",
    ],
  },
  {
    name: "express-api-scaffold",
    entityType: "pattern",
    observations: [
      "Express 5 + TypeScript + tsx for hot reloads",
      "Zod schemas for request/response validation",
      "JSON file storage: one file per entity in data/ directory",
      "NDJSON for append-only event logs",
      "Routes organized by domain (projects.ts, sessions.ts)",
      "Used by: OST Tool backend, TeamHQ backend, SherlockPDF backend",
    ],
  },
  {
    name: "css-grid-accordion",
    entityType: "pattern",
    observations: [
      "Expand/collapse animation using CSS grid-template-rows: 0fr → 1fr",
      "GPU-accelerated, no JavaScript height calculation needed",
      "Container has overflow: hidden on the inner wrapper",
      "Works with any content height",
      "Used in: Task History cards, OST Recommendation debater rows, Phase 3a tool results",
      "Preferred over JS-based height animation team-wide",
    ],
  },
  {
    name: "vanilla-js-iife",
    entityType: "pattern",
    observations: [
      "Wrap all page JS in an IIFE with 'use strict'",
      "No globals, no external dependencies",
      "Fetch API for data loading, template literals for DOM generation",
      "Single delegated event listener on container element",
      "Progressive enhancement: noscript fallback",
      "Used for: TeamHQ landing page interactivity (tasks, projects)",
      "Defined in skills/development/vanilla-js-patterns.md",
    ],
  },
  {
    name: "npm-workspaces-monorepo",
    entityType: "pattern",
    observations: [
      "Root package.json with workspaces: ['server', 'client'] (or similar)",
      "concurrently runs both dev servers from one npm run dev",
      "Vite proxy forwards /api to Express during development",
      "Shared node_modules at root reduces disk usage",
      "Used by: OST Tool, TeamHQ (server + landing page)",
    ],
  },
  {
    name: "single-file-tool",
    entityType: "pattern",
    observations: [
      "Each tool is one index.html with embedded CSS, JS, and CDN libraries",
      "No package.json, no build step, no framework",
      "Libraries loaded via CDN (pdf-lib, pdf.js, SortableJS)",
      "Delete the directory to remove the tool completely",
      "Used by: SherlockPDF tools (splitter, combiner)",
      "Documented in ADR-007",
    ],
  },
  {
    name: "sse-streaming",
    entityType: "pattern",
    observations: [
      "Server-Sent Events for unidirectional real-time data",
      "Native EventSource API on client — handles reconnection automatically",
      "Last-Event-ID header for replay-from-offset",
      "15-second heartbeat to keep connection alive",
      "Fan-out via Node EventEmitter for multiple tabs",
      "Preferred over WebSocket when data flows one direction",
      "Used by: Phase 3a live agent progress",
    ],
  },
  {
    name: "claude-cli-integration",
    entityType: "pattern",
    observations: [
      "Spawn claude as child process with -p flag for non-interactive mode",
      "--output-format stream-json for streaming, --output-format json for batch",
      "--json-schema flag for structured AI output validated with Zod",
      "--verbose flag REQUIRED when using -p with stream-json",
      "--dangerously-skip-permissions for automated execution (single-user only)",
      "readline for parsing NDJSON stdout line-by-line",
      "Used by: OST Tool (batch), Phase 3a (streaming)",
    ],
  },
  {
    name: "react-native-expo-scaffold",
    entityType: "pattern",
    observations: [
      "Expo SDK 54 with expo-router for file-based routing",
      "TanStack Query for server state, Zustand for client state",
      "Reanimated for animations, Gesture Handler for touch",
      "Design tokens in lib/tokens.ts matching web design system",
      "API wrapper in lib/api.ts with configurable base URL from settings store",
      "Hooks pattern: useProjects, useProject, useSessions for data fetching",
      "Used by: TeamHQ Mobile App",
      "Documented in skills/development/react-native-expo.md",
    ],
  },
  {
    name: "xor-toggle",
    entityType: "pattern",
    observations: [
      "Expand All / Collapse All with individual override behavior",
      "Global boolean + Set<string> for individual overrides",
      "Clicking global toggle resets override set",
      "Clicking individual item toggles it in the override set",
      "Item is expanded if: (globalExpanded XOR item-in-overrideSet)",
      "Used in: OST Recommendation Redesign debater accordions",
    ],
  },
];

const decisions = [
  {
    name: "ADR-001 Plain HTML/CSS for landing page",
    entityType: "decision",
    observations: [
      "No framework for the landing page — plain HTML, CSS, and vanilla JS",
      "React, Astro, and Tailwind rejected as overkill for a single static page",
      "CSS custom properties for theming — dark theme redesign was a simple variable swap",
      "Status: Accepted",
    ],
  },
  {
    name: "ADR-002 Express TypeScript for all backends",
    entityType: "decision",
    observations: [
      "Express 5 + TypeScript + tsx for every backend service",
      "Same stack across projects to reduce context-switching",
      "Fastify rejected (team preference), Hono (less ecosystem), Python (context-switching cost)",
      "Status: Accepted",
    ],
  },
  {
    name: "ADR-003 JSON file storage over database",
    entityType: "decision",
    observations: [
      "One JSON file per entity on disk, no database",
      "Sufficient for single-user, low-volume tools",
      "SQLite rejected (native dependency complexity), PostgreSQL (overkill)",
      "NDJSON for append-only event logs",
      "Status: Accepted",
    ],
  },
  {
    name: "ADR-004 Client-side PDF processing",
    entityType: "decision",
    observations: [
      "PDF tools run 100% in the browser using pdf-lib and pdf.js via CDN",
      "No server, no file uploads — privacy by default",
      "Server-side processing rejected (privacy/latency), WebAssembly (complexity)",
      "Status: Accepted",
    ],
  },
  {
    name: "ADR-005 Vite React for interactive tools",
    entityType: "decision",
    observations: [
      "React only when interactivity demands it (OST tool's tree visualization)",
      "Vanilla JS for everything else — landing page, PDF tools",
      "Minimum required technology per tool",
      "Status: Accepted",
    ],
  },
  {
    name: "ADR-006 npm workspaces for full-stack",
    entityType: "decision",
    observations: [
      "Co-locate frontend and backend with npm workspaces",
      "One npm run dev starts both via concurrently",
      "Vite proxy handles /api routing in development",
      "Separate repos rejected (coordination overhead), Turborepo/Nx (overkill)",
      "Status: Accepted",
    ],
  },
  {
    name: "ADR-007 Single-file tools pattern",
    entityType: "decision",
    observations: [
      "Standalone browser tools are a single index.html with embedded CSS/JS and CDN libraries",
      "No build step, no framework, no package.json",
      "Delete directory to remove tool completely",
      "Status: Accepted",
    ],
  },
  {
    name: "ADR-008 Unified SaaS stack",
    entityType: "decision",
    observations: [
      "Supabase recommended: auth + Postgres + storage + edge functions in one platform",
      "Stripe sync engine eliminates webhook-sync code",
      "$25/month starting cost",
      "Clerk + Neon + Vercel is upgrade path if multi-product auth becomes painful",
      "Convex (lock-in), PocketBase (single maintainer), Firebase (NoSQL mismatch) rejected",
      "Status: Proposed (not yet implemented)",
    ],
  },
];

const components = [
  {
    name: "ProjectCard",
    entityType: "component",
    observations: [
      "Expandable project card with header, description, status badge, and accordion details",
      "Used on TeamHQ landing page (vanilla JS) and Mobile App (React Native)",
      "Web version: vanilla JS with CSS grid-template-rows animation",
      "Mobile version: React Native with Reanimated FadeInUp stagger",
      "Active session indicator: green pulsing dot",
    ],
  },
  {
    name: "AccordionList",
    entityType: "component",
    observations: [
      "Expandable list with one-at-a-time behavior",
      "Uses CSS grid-template-rows: 0fr/1fr for animation",
      "Used in Task History, OST Recommendation debater rows",
      "Keyboard accessible: tab to headers, enter/space to toggle",
      "aria-expanded and aria-hidden attributes for screen readers",
    ],
  },
  {
    name: "VoiceRecordingOverlay",
    entityType: "component",
    observations: [
      "Full-screen modal for voice recording in mobile app",
      "5 states: Recording, Review, Creating, Error, Permission Denied",
      "Waveform visualizer with 40 bars driven by audio level",
      "Live transcript with auto-scroll and blinking cursor",
      "Silence detection: 2s detect + 3s countdown auto-stop",
      "Built by Zara, located at mobile/components/voice/VoiceRecordingOverlay.tsx",
    ],
  },
  {
    name: "SessionLog",
    entityType: "component",
    observations: [
      "Terminal-like session log for Phase 3a live agent progress",
      "Dark zinc-950 background with monospace text",
      "5 event renderers: assistant_text (streaming + blinking cursor), tool_use, tool_result (collapsed), system, error",
      "Auto-scroll with scroll-lock detection (50px threshold)",
      "'Jump to latest' sticky button with gradient overlay",
      "MAX_RENDERED_EVENTS: 500 for DOM performance",
      "Built by Alice, located in js/projects.js",
    ],
  },
  {
    name: "RecommendationView",
    entityType: "component",
    observations: [
      "OST tool recommendation page with ranked solutions and debater reasoning",
      "3-color accent system: indigo, emerald, red",
      "Expandable debater accordion with XOR toggle pattern",
      "Built by Alice, located at ost-tool/client/src/components/RecommendationView.tsx",
    ],
  },
];

const lessons = [
  {
    name: "design-tokens-enable-theming",
    entityType: "lesson",
    observations: [
      "CSS custom properties for all colors made the dark theme redesign trivial",
      "Swapping a few root variables changed the entire page — zero component changes",
      "Always use design tokens, even for 'simple' pages — future you will thank you",
      "Learned during: TeamHQ Redesign",
    ],
  },
  {
    name: "css-grid-over-js-for-animation",
    entityType: "lesson",
    observations: [
      "grid-template-rows: 0fr to 1fr is cleaner than JS height calculation for expand/collapse",
      "GPU-accelerated, works with any content height, less code",
      "Team adopted this as standard pattern after Task History project",
      "Learned during: Task History, used in all subsequent accordion UIs",
    ],
  },
  {
    name: "sse-over-websocket-for-unidirectional",
    entityType: "lesson",
    observations: [
      "SSE with native EventSource is far simpler than WebSocket for server-to-client streaming",
      "Browser handles reconnection automatically with Last-Event-ID",
      "Only use WebSocket when you need bidirectional communication",
      "Learned during: Phase 3a Live Agent Progress",
    ],
  },
  {
    name: "zod-essential-for-ai-output",
    entityType: "lesson",
    observations: [
      "AI-generated JSON can have subtle structural issues that break at runtime",
      "Zod provides runtime type safety — catches malformed responses before they hit business logic",
      "Use Zod schemas for every AI output, no exceptions",
      "Learned during: OST Tool backend development",
    ],
  },
  {
    name: "stub-interfaces-for-parallel-work",
    entityType: "lesson",
    observations: [
      "Create functional stubs matching the exact interface contract to unblock parallel work",
      "Zara created stubs for Leo's shared components so screens could be built immediately",
      "The polished versions are drop-in replacements because interfaces match exactly",
      "Learned during: TeamHQ Mobile App development",
    ],
  },
  {
    name: "limit-accent-colors",
    entityType: "lesson",
    observations: [
      "Too many colors create cognitive overload — limit accents to 3 max beyond neutrals",
      "OST recommendation page had 15+ hues competing; reduced to indigo/emerald/red",
      "Neutral badges are cleaner than per-persona colored badges",
      "Learned during: OST Recommendation Redesign",
    ],
  },
  {
    name: "ndjson-for-event-logs",
    entityType: "lesson",
    observations: [
      "NDJSON (newline-delimited JSON) is perfect for streaming event storage",
      "Append-only writes are cheap, replay-from-offset is trivial with line counting",
      "Human-readable for debugging, no database needed",
      "Learned during: Phase 3a backend implementation",
    ],
  },
  {
    name: "useref-for-callback-state",
    entityType: "lesson",
    observations: [
      "Use useRef instead of useState for state accessed in audio/stream callbacks",
      "Callbacks capture stale closure values — ref.current always has latest value",
      "Critical for recording state tracking in voice features",
      "Learned during: TeamHQ Mobile App voice recording",
    ],
  },
];

// ── Relations ───────────────────────────────────────────────

const relations = [
  // Projects → Patterns
  { source: "TeamHQ Landing Page", target: "vanilla-js-iife", type: "uses" },
  { source: "TeamHQ Landing Page", target: "dark-theme-tokens", type: "uses" },
  { source: "OST Tool", target: "express-api-scaffold", type: "uses" },
  { source: "OST Tool", target: "npm-workspaces-monorepo", type: "uses" },
  { source: "OST Tool", target: "claude-cli-integration", type: "uses" },
  { source: "TeamHQ Redesign", target: "dark-theme-tokens", type: "uses" },
  { source: "Task History", target: "vanilla-js-iife", type: "uses" },
  { source: "Task History", target: "css-grid-accordion", type: "uses" },
  { source: "OST Recommendation Redesign", target: "css-grid-accordion", type: "uses" },
  { source: "OST Recommendation Redesign", target: "xor-toggle", type: "uses" },
  { source: "Phase 3a Live Agent Progress", target: "express-api-scaffold", type: "uses" },
  { source: "Phase 3a Live Agent Progress", target: "sse-streaming", type: "uses" },
  { source: "Phase 3a Live Agent Progress", target: "claude-cli-integration", type: "uses" },
  { source: "Phase 3a Live Agent Progress", target: "css-grid-accordion", type: "uses" },
  { source: "TeamHQ Mobile App", target: "react-native-expo-scaffold", type: "uses" },
  { source: "SherlockPDF", target: "single-file-tool", type: "uses" },
  { source: "SherlockPDF", target: "express-api-scaffold", type: "uses" },

  // Projects → Decisions
  { source: "TeamHQ Landing Page", target: "ADR-001 Plain HTML/CSS for landing page", type: "decided_in" },
  { source: "OST Tool", target: "ADR-005 Vite React for interactive tools", type: "decided_in" },
  { source: "OST Tool", target: "ADR-006 npm workspaces for full-stack", type: "decided_in" },
  { source: "SherlockPDF", target: "ADR-004 Client-side PDF processing", type: "decided_in" },
  { source: "SherlockPDF", target: "ADR-007 Single-file tools pattern", type: "decided_in" },

  // Components → Projects
  { source: "ProjectCard", target: "Task History", type: "built_for" },
  { source: "ProjectCard", target: "TeamHQ Mobile App", type: "built_for" },
  { source: "AccordionList", target: "Task History", type: "built_for" },
  { source: "SessionLog", target: "Phase 3a Live Agent Progress", type: "built_for" },
  { source: "RecommendationView", target: "OST Tool", type: "built_for" },
  { source: "VoiceRecordingOverlay", target: "TeamHQ Mobile App", type: "built_for" },

  // Lessons → Projects
  { source: "design-tokens-enable-theming", target: "TeamHQ Redesign", type: "learned_from" },
  { source: "css-grid-over-js-for-animation", target: "Task History", type: "learned_from" },
  { source: "sse-over-websocket-for-unidirectional", target: "Phase 3a Live Agent Progress", type: "learned_from" },
  { source: "zod-essential-for-ai-output", target: "OST Tool", type: "learned_from" },
  { source: "stub-interfaces-for-parallel-work", target: "TeamHQ Mobile App", type: "learned_from" },
  { source: "limit-accent-colors", target: "OST Recommendation Redesign", type: "learned_from" },
  { source: "ndjson-for-event-logs", target: "Phase 3a Live Agent Progress", type: "learned_from" },
  { source: "useref-for-callback-state", target: "TeamHQ Mobile App", type: "learned_from" },
];

// ── Main ────────────────────────────────────────────────────

async function main() {
  console.log("Starting MCP server...");
  startServer();

  // Wait for server to be ready
  await new Promise((r) => setTimeout(r, 3000));

  console.log("Initializing MCP connection...");
  await initialize();

  const allEntities = [...projects, ...patterns, ...decisions, ...components, ...lessons];

  console.log(`\nSeeding ${allEntities.length} entities...`);

  // Create entities in batches to avoid overwhelming the server
  const batchSize = 5;
  for (let i = 0; i < allEntities.length; i += batchSize) {
    const batch = allEntities.slice(i, i + batchSize);
    try {
      await callTool("create_entities", { entities: batch });
      console.log(
        `  Created: ${batch.map((e) => e.name).join(", ")}`
      );
    } catch (err) {
      console.error(`  Error creating batch: ${err.message}`);
    }
  }

  console.log(`\nSeeding ${relations.length} relations...`);

  // Create relations in batches
  for (let i = 0; i < relations.length; i += batchSize) {
    const batch = relations.slice(i, i + batchSize);
    try {
      await callTool("create_relations", { relations: batch });
      console.log(
        `  Linked: ${batch.map((r) => `${r.source} --${r.type}--> ${r.target}`).join(", ")}`
      );
    } catch (err) {
      console.error(`  Error creating relations: ${err.message}`);
    }
  }

  // Verify
  console.log("\nVerifying...");
  try {
    const result = await callTool("read_graph", {});
    const content = result?.content?.[0]?.text;
    if (content) {
      const graph = JSON.parse(content);
      console.log(`  Entities: ${graph.entities?.length ?? 0}`);
      console.log(`  Relations: ${graph.relations?.length ?? 0}`);
    }
  } catch (err) {
    console.error(`  Verification error: ${err.message}`);
  }

  console.log("\nDone! Shutting down MCP server...");
  child.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  child?.kill();
  process.exit(1);
});
