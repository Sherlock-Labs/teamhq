# Team Project Proposals — Q1 2026

*Generated from Team Meeting #32 (2026-03-18). Each team member pitched one project they'd champion.*

---

## 1. Forge E2E Test Harness
**Champion:** Enzo (QA)
**Effort:** Medium (1-2 weeks)
**Dependencies:** None — can start immediately

Automated Playwright browser tests that run against every Forge PR: board view CRUD, drag-and-drop, theme switching, dependency lines, timeline rendering. Currently all QA is manual, which means Enzo re-tests the same flows every sprint. An automated suite catches regressions before they reach QA and frees Enzo for exploratory testing on new features. ROI increases with every feature we ship.

---

## 2. Shared Component Library
**Champion:** Andrei (Architect)
**Effort:** Medium-Large (2-3 weeks for extraction + docs)
**Dependencies:** Needs inventory of patterns across shipped products

We keep rebuilding the same UI patterns — file upload zones, modal dialogs, status badges, responsive nav, loading skeletons. One npm package (`@sherlock-labs/ui`) that all products import from. Saves time on every future build and enforces design consistency. Extract from OST Tool and Forge first (most mature codebases), then retrofit others.

---

## 3. Forge Offline Mode
**Champion:** Alice (Frontend)
**Effort:** Large (2-3 weeks)
**Dependencies:** Visual themes merged, command palette shipped first

Cache the current board state in IndexedDB so users can view and edit their roadmap without connectivity. Sync changes when they reconnect. Meaningful for users on planes, trains, or spotty WiFi. Requires conflict resolution strategy for concurrent edits. This is a bigger lift — recommend deferring until after command palette ships.

---

## 4. Cross-Product Event & Notification System
**Champion:** Jonah (Backend)
**Effort:** Medium (1-2 weeks)
**Dependencies:** None — can start with one product

One lightweight service that listens to events from all products — Forge item changes, QuoteVoice new estimates, VoiceNote Pro transcriptions — and pushes notifications to Slack, email, or webhooks. Not a full message queue — a simple event bus with configurable subscribers. Combines well with the analytics dashboard proposal (#6) since both need a unified event stream.

*Thomas note: Andrei flagged this overlaps significantly with proposal #6. Consider combining into a single "cross-product observability" project.*

---

## 5. Forge Onboarding Flow
**Champion:** Robert (Designer)
**Effort:** Small-Medium (3-5 days)
**Dependencies:** Templates already built (RT-35)

First-time Forge users land on an empty board with no guidance. A three-step guided setup — pick a template, name your roadmap, add your first item — would dramatically reduce time to first value. Templates are already shipped, we just don't surface them at the right moment. Small scope, high UX impact, builds on existing work.

---

## 6. Cross-Product Analytics Dashboard
**Champion:** Thomas (PM)
**Effort:** Medium (1-2 weeks)
**Dependencies:** PostHog configured (already done)

A simple page in TeamHQ showing active users, feature adoption, and error rates across all five shipped products. PostHog is configured but nobody looks at it systematically. Without usage data, we're making prioritization decisions blind. Pulling PostHog data into a unified view lets the CEO and team see which products are getting traction and where users are dropping off.

*Thomas note: Combines naturally with proposal #4 (Jonah's event system). Recommend scoping as one project: "Cross-Product Observability."*

---

## Also Discussed (Not Full Proposals)

These came up in the meeting as smaller improvement ideas:

- **SherlockPDF**: Add drag-and-drop file upload + improve mobile responsiveness
- **QuoteVoice**: Add session history list view with search (contractors can't find old estimates)
- **VoiceNote Pro**: Add retry logic on RevenueCat receipt validation (reliability fix — payment code with no retry is a risk)

---

## Recommended Priority

1. **Forge Onboarding Flow** (#5) — smallest scope, highest UX impact, builds on shipped work
2. **Forge E2E Test Harness** (#1) — force multiplier for every future feature
3. **Cross-Product Observability** (#4 + #6 combined) — we need usage data to prioritize well
4. **Shared Component Library** (#2) — pays off over time, not urgent
5. **Forge Offline Mode** (#3) — defer until command palette ships
