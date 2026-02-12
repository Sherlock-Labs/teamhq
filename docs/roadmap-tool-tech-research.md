# Roadmap Tool — Technical Research

**Author:** Marco (Technical Researcher)
**Date:** February 10, 2026
**Status:** Complete

---

## 1. Research Scope

The CEO wants to build a full 1:1 replica of Roadmunk (now "Strategic Roadmaps" by Tempo) — a roadmap visualization and planning tool. This document evaluates how to build the core visualization engine: the interactive timeline where users create, drag, resize, and organize roadmap items across swimlanes and time.

The timeline visualization IS the product. Everything else (data storage, collaboration, exports) is secondary to getting this right.

---

## 2. Roadmunk Product Analysis

### What Is Roadmunk?

Roadmunk (rebranded as Tempo Strategic Roadmaps in 2024) is a cloud-based product roadmap tool. The domain `roadmunk.com` now redirects to `tempo.io/products/roadmaps`. It was acquired by Tempo Software and integrated into their Atlassian ecosystem suite.

**Tech Stack (confirmed via job postings and site inspection):**
- **Frontend:** React + TypeScript
- **Backend:** Node.js
- **State management:** Redux
- **Cloud:** AWS
- **Integration:** Deep Jira/Atlassian ecosystem ties

### Core Visualization: Two View Types

**1. Timeline View (our primary target)**
- Horizontal time axis (weeks, months, quarters, years) with adjustable scale
- Items rendered as horizontal colored bars spanning start-to-end date ranges
- Bars organized in rows/streams — multiple items per stream, drag to new stream to avoid overlap
- Pivot headers group items thematically along the horizontal axis
- Milestones rendered as icons (diamonds, flags) at specific dates
- Time slider for zooming in/out on the time range
- Drag items to move dates, resize edges to change duration
- Layout themes: "Compact" vs "Original" density modes
- Color coding by category, theme, status, or custom field

**2. Swimlane View**
- Non-date-oriented "no-dates roadmap" layout
- Items grouped into horizontal swimlanes by category (team, department, theme)
- More agile/kanban-oriented — good for when exact dates aren't the point

**Data Model (from documentation):**
- **Roadmap** — top-level container
- **Items** — core entity with start/end dates, category, fields, progress
- **Sub-Items** — nested under parent items (hierarchy)
- **Milestones** — date markers, multiple types
- **Fields** — fully customizable properties (dropdowns, dates, text, etc.)
- **Linked Items** — dependency relationships between items
- **Views** — saved configurations (Timeline, Swimlane, Table, Portfolio)

Sources:
- https://www.tempo.io/products/roadmaps
- https://help.tempo.io/roadmaps/latest/getting-started-in-the-timeline-view
- https://help.tempo.io/roadmaps/latest/strategic-roadmaps-101-roadmapping-basics
- https://www.dimmo.ai/products/Roadmunk

---

## 3. Timeline/Gantt Visualization Libraries — Full Evaluation

### 3.1 Bryntum Gantt

| Criterion | Details |
|-----------|---------|
| **Rendering** | Custom JS rendering engine (DOM-based, optimized) |
| **Interactivity** | Drag/move, resize, dependency lines, undo/redo, inline editing |
| **Features** | Critical path, resource management, baselines, summary rows, constraints, milestones, virtual scrolling |
| **Framework support** | React, Angular, Vue, vanilla JS |
| **License** | Commercial — starts at $900/dev, Small Team $2,820 (3 devs) |
| **Bundle size** | Large (~1MB+, proprietary bundle) |
| **Maintenance** | Actively maintained, dedicated company, SLA support |
| **Visual quality** | Best-in-class UX and visual appearance per multiple comparison guides |
| **Suitability** | Enterprise-grade PM tools. Massive overkill for a roadmap tool — it's a full Gantt/scheduling engine |

**Verdict:** Too expensive, too heavy, wrong abstraction. We want a roadmap timeline, not a full project scheduling engine with critical path analysis. The $900+/dev license is a non-starter for a product we're building from scratch.

### 3.2 DHTMLX Gantt

| Criterion | Details |
|-----------|---------|
| **Rendering** | Pure JavaScript DOM rendering, 8 predefined skins |
| **Interactivity** | Drag/move, resize, multi-select drag, inline keyboard editing |
| **Features** | Auto-scheduling, critical path, resource management, export (PDF/PNG/Excel/MS Project), smart rendering for large datasets |
| **License** | GPL v2.0 (free, open source Standard), PRO from $699 |
| **npm downloads** | ~19,500/week |
| **GitHub stars** | ~1,750 (GPL version) |
| **Bundle size** | Moderate |
| **Maintenance** | v9.1.1 (2 months ago), actively maintained |
| **Suitability** | Full-featured Gantt for PM apps |

**Verdict:** Strong library for a project management Gantt chart, but same problem as Bryntum — it's a Gantt engine, not a roadmap visualization. The visual style is very "PM tool" (left task grid + right Gantt area). Bending this into a Roadmunk-style roadmap would mean fighting against the library's opinions. The GPL license on the free version also forces open-sourcing our code unless we pay for PRO.

### 3.3 Frappe Gantt

| Criterion | Details |
|-----------|---------|
| **Rendering** | SVG-based |
| **Interactivity** | Drag to move tasks, resize for duration, dependency arrows |
| **Features** | Multiple view modes (Day, Week, Month, Year), progress bars, holiday/weekend highlighting, zero dependencies |
| **License** | MIT (fully permissive) |
| **npm downloads** | ~51,000/week (highest in category) |
| **GitHub stars** | ~5,800 |
| **Bundle size** | Small (~30KB) |
| **Last updated** | v1.0.4 (4 months ago) |
| **Limitations** | No milestones, no swimlanes, no grouping, no virtual scrolling, limited customization, SVG makes complex styling harder, can't render empty chart |

**Verdict:** Clean, lightweight, MIT-licensed — but too basic. No swimlanes, no milestones, no grouping. These are fundamental to a Roadmunk-style roadmap. We'd be building 70% of the features ourselves on top of a library that was designed for simple Gantt charts. The SVG rendering also becomes a limitation for deep customization.

### 3.4 Vis-Timeline

| Criterion | Details |
|-----------|---------|
| **Rendering** | DOM-based (HTML elements positioned absolutely) |
| **Interactivity** | Drag/move, resize, create by double-click, create range by ctrl+drag, multi-select, zoom/pan |
| **Features** | Auto-scaling time axis (ms to years), point events and ranges, grouping/subgrouping, stacking, custom time markers, nested groups |
| **License** | Apache-2.0 OR MIT (dual license) |
| **GitHub stars** | ~2,400 |
| **Releases** | 86 releases, v8.5.0 (Dec 2025) |
| **Open issues** | 263 |
| **Contributors** | 186+ |
| **Bundle size** | Large (depends on moment.js, vis-data) |

**Verdict:** Closest existing library to what we need. It has groups (analogous to swimlanes), range items, stacking, and built-in drag/resize. However: DOM-based rendering means potential performance issues with many items, it depends on moment.js (heavy), 263 open issues suggests maintenance challenges, and the visual style is utilitarian — getting to Roadmunk's polish level would require heavy CSS work. The grouping system could map to swimlanes, but it's not designed for the specific "product roadmap" visual pattern.

### 3.5 SVAR React Gantt

| Criterion | Details |
|-----------|---------|
| **Rendering** | DOM-based (React components) |
| **Interactivity** | Drag/move, resize, dependency management, zoom, hotkeys |
| **Features** | Configurable time scales (hours to stages), hierarchical subtasks, toolbar/context menus, task sorting, tooltips, localization |
| **License** | MIT (open source), PRO edition for advanced features |
| **GitHub stars** | ~86 |
| **Last update** | Active (v2.5, Jan 2026) |
| **PRO features** | Auto-scheduling, baselines, critical path, export (PDF/PNG/Excel/MS Project) |
| **Performance** | 10,000 task demo |

**Verdict:** Modern React-first Gantt, but still young (86 stars). The Gantt pattern (left grid + right timeline) doesn't match a roadmap layout. PRO lock on export features is a concern. Not enough community or track record yet.

### 3.6 @melfore/konva-timeline (Canvas-based)

| Criterion | Details |
|-----------|---------|
| **Rendering** | HTML5 Canvas via Konva + react-konva |
| **Interactivity** | Drag/move tasks across resources, resize, area selection, hover callbacks |
| **Features** | Resource grouping, completion percentage, task connections/dependencies, customizable resolution (5min to hours), timezone/DST handling, custom renderers |
| **License** | MIT |
| **GitHub stars** | 73 |
| **Releases** | 104 (v2.0.5, Jan 2026) |
| **Commits** | 685 |
| **Maturity** | Active development, TypeScript-first |

**Verdict:** Interesting Canvas-based approach with good interactive features. However, it's designed for scheduling/resource management (think calendar/planner), not roadmap visualization. The resource-centric model doesn't map cleanly to roadmap swimlanes with date-range bars. Small community.

### 3.7 shadcn Gantt Component

| Criterion | Details |
|-----------|---------|
| **Rendering** | React DOM components |
| **Interactivity** | Drag to reschedule, resize edges, infinite scroll |
| **Features** | Multiple zoom levels (day to quarter), milestone markers, today indicator, sidebar with item list |
| **License** | Open source (shadcn ecosystem) |
| **Installation** | `npx shadcn@latest add` |

**Verdict:** New, fits the shadcn ecosystem, correct visual pattern (horizontal bars on timeline). However: it's a component, not a library — limited in scope and customization depth. Good for inspiration but not a production foundation for a full roadmap tool.

---

## 4. Library Comparison Matrix

| Library | Rendering | License | Swimlanes | Drag/Resize | Milestones | Perf (large) | Visual Quality | Roadmap Fit |
|---------|-----------|---------|-----------|-------------|------------|--------------|----------------|-------------|
| Bryntum | Custom DOM | Commercial ($900+) | Yes | Yes | Yes | Excellent | Excellent | Medium |
| DHTMLX | DOM | GPL/$699 | Partial | Yes | Yes | Good | Good | Medium |
| Frappe Gantt | SVG | MIT | No | Yes | No | Poor | Good | Low |
| vis-timeline | DOM | MIT/Apache | Yes (groups) | Yes | Partial | Medium | Fair | Medium |
| SVAR Gantt | DOM (React) | MIT/PRO | No | Yes | Yes | Good | Good | Low |
| konva-timeline | Canvas | MIT | Yes (resources) | Yes | No | Good | Fair | Low |
| shadcn Gantt | DOM (React) | Open | No | Yes | Yes | Unknown | Good | Medium |
| **Custom (React + SVG/Canvas)** | **SVG or Canvas** | **Ours** | **Yes** | **Yes** | **Yes** | **Controllable** | **Controllable** | **High** |

---

## 5. The Custom Build Approach

### Why None of the Libraries Fit

Every existing library has the same fundamental problem: **they're Gantt chart engines, not roadmap visualization tools.** The visual pattern is different:

**Gantt Chart Pattern:**
- Left panel: task grid with names, dates, progress
- Right panel: horizontal bars on timeline
- Focus: project scheduling, dependencies, critical path
- Visual: utilitarian, information-dense

**Roadmap Pattern (what Roadmunk does):**
- Full-width timeline visualization
- Horizontal colored bars grouped into themed swimlanes
- Focus: strategic communication, presentation-ready
- Visual: clean, colorful, "boardroom-ready"
- Items: rounded bars with labels, color-coded by category
- Milestones: icons/diamonds at specific dates
- Compact and spacious layout modes

Forcing a Gantt library into a roadmap shape means fighting the library. We'd spend more time overriding defaults than building features.

### Recommended Approach: Custom React + SVG

Build the timeline visualization as a custom React component using SVG for the rendering layer.

**Why SVG over Canvas:**
1. **DOM integration** — SVG elements are DOM nodes, so they work with React's reconciliation, event system, and dev tools
2. **CSS styling** — SVG supports CSS classes, variables, and design tokens directly. Critical for matching our design system
3. **Accessibility** — SVG elements can have `role`, `aria-label`, and be tab-navigable. Canvas is an accessibility black box
4. **Text rendering** — SVG handles text natively with full CSS font control. Canvas text is primitive
5. **Export** — SVG can be directly exported to PDF via libraries like jsPDF, or rasterized to PNG via html2canvas
6. **Interaction** — SVG elements fire native DOM events (click, mousedown, mousemove). No hit-testing math required
7. **Debugging** — Inspect SVG elements in browser DevTools just like HTML

**Why NOT Canvas:**
- Canvas is faster for 10,000+ items, but a typical roadmap has 50-200 items. SVG handles this easily
- Canvas requires manual hit-testing for mouse events on shapes
- Canvas text rendering is primitive (no wrapping, no CSS)
- Canvas is inaccessible to screen readers without extra ARIA work
- If we ever hit SVG performance limits (very unlikely for roadmap scale), we can optimize specific views to Canvas later

**Why NOT a D3.js wrapper:**
- D3 is a low-level visualization toolkit, not a component library
- D3's enter/update/exit pattern conflicts with React's rendering model
- Using D3 within React means either giving up React control of the DOM, or using D3 only for math (scales, axes) — in which case we're building custom anyway
- We'd use D3's scale functions (`d3-scale`, `d3-time`) for date-to-pixel math, but render with React + SVG directly

### Architecture Sketch

```
┌─────────────────────────────────────────────────────┐
│  RoadmapTimeline (root component)                   │
│  ┌───────────────────────────────────────────────┐  │
│  │  TimeAxis (SVG)                               │  │
│  │  [Jan 2026] [Feb] [Mar] [Apr] [May] [Jun]    │  │
│  ├───────────────────────────────────────────────┤  │
│  │  Swimlane: "Product"                          │  │
│  │  ┌──────────┐ ┌────────────────┐              │  │
│  │  │ Item A   │ │ Item B         │              │  │
│  │  └──────────┘ └────────────────┘              │  │
│  ├───────────────────────────────────────────────┤  │
│  │  Swimlane: "Engineering"                      │  │
│  │  ┌───────────────────┐    ┌─────┐             │  │
│  │  │ Item C            │    │  D  │             │  │
│  │  └───────────────────┘    └─────┘             │  │
│  ├───────────────────────────────────────────────┤  │
│  │  Swimlane: "Design"                           │  │
│  │       ◆ Milestone       ┌──────────┐          │  │
│  │                         │ Item E   │          │  │
│  │                         └──────────┘          │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Component tree:**
- `RoadmapTimeline` — root, manages state, zoom level, viewport
- `TimeAxis` — renders the date header (months, quarters, years)
- `SwimLane` — a labeled row group containing items
- `RoadmapItem` — a draggable, resizable colored bar (SVG `<rect>` + `<text>`)
- `Milestone` — a diamond/icon marker at a date
- `DependencyLine` — SVG path connecting linked items
- `TodayMarker` — vertical line at current date
- `TimeSlider` — zoom/pan controls

**Key libraries to use (not for visualization — for math and interaction):**
- `d3-scale` + `d3-time` — date-to-pixel coordinate math, time intervals
- `d3-zoom` / custom — pan and zoom behavior
- React `useRef` + `useState` — drag state management
- `date-fns` or `luxon` — date manipulation (avoid moment.js — too heavy)

---

## 6. Data Model Design

Based on Roadmunk's documented structure and roadmap tool conventions:

```typescript
// Core entities

interface Roadmap {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RoadmapItem {
  id: string;
  roadmapId: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  color: string;            // hex color or theme token
  category: string;         // maps to swimlane grouping
  status: 'planned' | 'in-progress' | 'done';
  progress?: number;        // 0-100
  parentId?: string;        // for sub-items
  order: number;            // vertical position within swimlane
  fields: Record<string, any>; // custom fields
}

interface Milestone {
  id: string;
  roadmapId: string;
  title: string;
  date: Date;
  type: 'diamond' | 'flag' | 'star';
  color: string;
  swimlane?: string;        // optional lane association
}

interface Dependency {
  id: string;
  sourceItemId: string;
  targetItemId: string;
  type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish';
}

interface View {
  id: string;
  roadmapId: string;
  name: string;
  type: 'timeline' | 'swimlane' | 'table';
  config: {
    timeRange: { start: Date; end: Date };
    zoom: 'week' | 'month' | 'quarter' | 'year';
    groupBy: string;        // field to group into swimlanes
    colorBy: string;        // field to determine bar color
    filters: Filter[];
    layout: 'compact' | 'spacious';
  };
}

interface Filter {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'in';
  value: any;
}
```

**Key patterns from the research:**
- Items are flexible with custom fields — the data model should be extensible
- Views are saved configurations, not separate data — same items, different presentations
- Swimlanes are dynamically generated from a "group by" field, not predefined containers
- Dependencies are lightweight connections (not scheduling constraints)
- Milestones are separate from items — they mark dates, not durations

---

## 7. Drag-and-Drop Editing on Timelines

### How It Works (Implementation Pattern)

For a React + SVG approach, drag/resize follows this pattern:

**Moving an item (change dates):**
1. `onMouseDown` on the bar — record start position, item's current dates
2. `onMouseMove` (on SVG container) — calculate pixel delta, convert to date delta using the inverse of the time scale
3. Snap to grid (nearest day, week, or month depending on zoom level)
4. Update item's `startDate` and `endDate` by the delta
5. `onMouseUp` — commit the change, fire callback

**Resizing an item (change duration):**
1. Render invisible "handles" at left and right edges of the bar (wider hit area)
2. `onMouseDown` on handle — record which edge and start position
3. `onMouseMove` — move only the start or end date
4. Snap to grid
5. `onMouseUp` — commit

**Snapping:**
- Convert mouse pixel position to date using `d3-scale` inverse
- Round to nearest snap unit (day boundary, week start, month start)
- Configurable snap granularity based on zoom level

**Libraries that support this natively:**
- Bryntum, DHTMLX, SVAR — all have built-in drag/resize (but we'd be paying for a whole library just for this)
- vis-timeline — built-in but limited customization
- Frappe Gantt — basic drag/resize in SVG

**For custom build:** This is 200-300 lines of React code using `useRef` for drag state and `d3-scale` for coordinate math. Not complex — the math is straightforward (pixel offset / pixels-per-day = day offset).

---

## 8. Export Capabilities

### Client-Side Export

**SVG to PNG:**
- Use `html2canvas` to rasterize the SVG timeline to a canvas, then `.toDataURL('image/png')`
- Alternative: Use the native `SVG.toDataURL()` approach — serialize SVG to string, draw onto canvas, export
- Resolution control: scale the SVG viewBox before rasterizing for high-DPI exports

**SVG to PDF:**
- `jsPDF` + `svg2pdf.js` — converts SVG directly to PDF vector graphics (crisp at any zoom)
- Alternative: `html2canvas` → canvas → `jsPDF.addImage()` (raster, not as crisp)
- Best approach: server-side Puppeteer for pixel-perfect PDF that matches the screen exactly

**Presentation Mode:**
- Full-screen CSS mode with hidden UI chrome
- Keyboard arrow navigation between time periods
- This is pure CSS/JS — no export library needed

**Share Links:**
- Generate a read-only URL with the current view configuration encoded (view ID + optional auth token)
- Server renders the roadmap with editing disabled

### Server-Side Export (higher fidelity)

**Puppeteer PDF/PNG:**
- Render the roadmap page in headless Chromium
- `page.pdf()` for PDF, `page.screenshot()` for PNG
- Handles all CSS, fonts, and SVG perfectly
- Can set custom viewport dimensions for specific output sizes (letter, A4, widescreen)

---

## 9. Open-Source Reference Implementations

| Project | Description | Relevance |
|---------|-------------|-----------|
| **[Frappe Gantt](https://github.com/frappe/gantt)** (5.8k stars) | SVG-based Gantt chart, MIT. Clean codebase to study SVG bar rendering, drag/resize, and date-axis generation | High — study the SVG rendering patterns |
| **[react-timeline-gantt](https://github.com/guiqui/react-timeline-gantt)** | React Gantt with virtual rendering. Drag/resize with date snapping | Medium — React drag patterns |
| **[konva-timeline](https://github.com/melfore/konva-timeline)** (73 stars) | Canvas-based timeline with React. Resource grouping, drag, resize | Medium — Canvas approach reference |
| **[Roadmapper](https://github.com/csgoh/roadmapper)** | Python "Roadmap as Code" library. Generates roadmap images from code | Low — wrong tech, but good for understanding the visual pattern |
| **[Ganttilla](https://github.com/ocadotechnology/ganttilla)** | JSON-to-roadmap visualization tool | Low — static output, no interactivity |
| **[shadcn Gantt](https://www.shadcn.io/components/gantt)** | React Gantt component in shadcn ecosystem. Drag, resize, zoom, milestones | Medium — modern React patterns, correct visual style |

**Most useful for reference:** Frappe Gantt's SVG rendering code and the shadcn Gantt component's React architecture.

---

## 10. Performance Considerations

### Scale Expectations

A typical product roadmap has:
- 5-15 swimlanes
- 20-200 items
- 0-20 milestones
- 1-2 year time range visible

This is well within SVG performance limits. SVG handles thousands of elements without issue on modern browsers. Performance only degrades at 5,000+ interactive elements.

### If We Ever Hit Limits

- **Virtual rendering** — only render items visible in the viewport (same pattern as virtual scrolling in lists)
- **Level-of-detail** — at far zoom levels, collapse items into summary bars
- **Canvas fallback** — for specific high-density views, render to Canvas instead of SVG
- **Web Workers** — offload layout calculations (item positioning, overlap detection) to a worker thread

### What the Existing Libraries Do

- **Bryntum:** Virtual scrolling + optimized DOM rendering
- **DHTMLX:** "Smart rendering" — only renders visible tasks, dynamically loads data
- **Syncfusion:** Row virtualization + timeline virtualization (renders 3x viewport width, loads on scroll)
- **GSTC:** Handles 100k+ tasks via virtual scrolling

We won't need any of this for v1. A simple React + SVG implementation will handle 500+ items without optimization.

---

## 11. YouTube Research Summary

Direct video search returned primarily documentation and support pages rather than development tutorials. Key findings from the available Roadmunk demo/tutorial content:

**How users interact with Roadmunk:**
- Create a roadmap from templates or blank
- Add items by clicking/typing inline
- Drag items horizontally to change dates
- Drag items vertically to different streams/rows
- Resize bar edges to adjust duration
- Use time slider to zoom in/out
- Switch between Timeline and Swimlane views
- Color-code items by category, status, or custom field
- Export for presentations

**How similar tools are built (from dev tutorials):**
- Timeline charts follow a "4-step" pattern: create web page, add scripts, set data, configure visualization
- D3.js approach: use `d3-scale` for time axis, render `<rect>` elements for bars, use `d3-drag` for interaction
- The KronoGraph SDK offers both JavaScript and React implementations with Storybook examples
- React + SVG with native event handlers is the most common approach for custom timeline tools

Sources:
- https://learn.roadmunk.com/getting-started-with-roadmapping/
- https://help.tempo.io/roadmaps/latest/getting-started-in-the-timeline-view
- https://learn.roadmunk.com/timeline-views/

---

## 12. Recommendation

### Primary Approach: Custom React + SVG Timeline

**Build the visualization engine from scratch using React components rendering SVG.**

**Rationale:**

1. **No existing library matches the product.** Every Gantt library is designed for project management scheduling, not strategic roadmap visualization. The visual pattern, interaction model, and data model are all different enough that any library would need heavy modification.

2. **SVG gives us full design control.** The visualization IS the product — we need pixel-perfect control over every bar, color, label, and interaction. SVG elements are CSS-styleable DOM nodes that integrate with our design system tokens.

3. **The implementation is tractable.** A roadmap timeline is simpler than a Gantt chart — no critical path, no auto-scheduling, no resource leveling. The core rendering is: bars on a time axis grouped into swimlanes. The drag/resize math is straightforward with `d3-scale`.

4. **Performance is not a concern at roadmap scale.** 50-200 items in SVG is trivial. No virtual scrolling needed for v1.

5. **Zero licensing cost or lock-in.** MIT-licensed utilities (`d3-scale`, `d3-time`, `date-fns`) for the math, everything else is ours.

6. **Accessibility and export come free with SVG.** SVG elements support ARIA attributes natively. SVG exports cleanly to PDF and PNG.

**Supporting libraries (all MIT/permissive):**
- `d3-scale` — time-to-pixel coordinate mapping
- `d3-time` — time interval calculations (month boundaries, quarter starts)
- `date-fns` — lightweight date manipulation (replaces moment.js)
- `html2canvas` or `svg2pdf.js` — client-side export
- React's built-in event system — drag/resize handling

**What to study from existing code:**
- Frappe Gantt's SVG bar rendering and date-axis generation
- shadcn Gantt's React component architecture and zoom levels
- vis-timeline's grouping/stacking algorithm for overlap prevention

**Estimated complexity:** The core timeline renderer (time axis + swimlanes + draggable bars + milestones) is a focused frontend build — the kind of thing Alice can implement in a few days given a clear design spec from Robert. The drag/resize interaction is well-understood React pattern code.

### What NOT To Do

- Do NOT use Bryntum or DHTMLX — expensive licenses, wrong abstraction, Gantt-not-roadmap
- Do NOT use Frappe Gantt — too basic, no swimlanes/milestones, would need to rebuild most features
- Do NOT use Canvas — premature optimization, loses CSS integration and accessibility
- Do NOT use D3 for rendering — conflicts with React's DOM management, use D3 only for math utilities
- Do NOT over-engineer v1 — start with Timeline view only, add Swimlane view as a fast follow

---

## 13. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SVG performance with 500+ items | Low | Medium | Virtual rendering (only render visible items) — standard React pattern |
| Drag/resize feels janky | Medium | High | Use `requestAnimationFrame`, throttle state updates, preview ghost element during drag |
| Date snapping edge cases (DST, timezones) | Medium | Medium | Use `date-fns` or `luxon` for all date math, test with UTC internally |
| Export fidelity (PDF/PNG doesn't match screen) | Low | Medium | Puppeteer server-side rendering as fallback for high-fidelity export |
| Item overlap/stacking algorithm complexity | Medium | Medium | Start with simple vertical stacking (no overlap), add compact mode later |

---

## Appendix: Library Quick-Reference

| Library | npm | Stars | License | Best For |
|---------|-----|-------|---------|----------|
| Bryntum Gantt | N/A (direct) | N/A | Commercial | Enterprise PM tools |
| DHTMLX Gantt | 19.5k/wk | 1.7k | GPL/Commercial | PM apps with scheduling |
| Frappe Gantt | 51k/wk | 5.8k | MIT | Simple, lightweight Gantt |
| vis-timeline | ~10k/wk (est) | 2.4k | MIT/Apache | Generic timeline visualization |
| SVAR React Gantt | Low | 86 | MIT/PRO | React Gantt with modern DX |
| konva-timeline | Low | 73 | MIT | Canvas-based scheduling |
| Syncfusion Gantt | N/A | N/A | Free community / Commercial | Enterprise with virtual scrolling |
| react-svg-timeline | Low | Low | MIT | Simple SVG event timeline |
