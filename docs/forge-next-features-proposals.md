# Forge v2 — Next Feature Proposals

**Author:** Thomas (PM)
**Date:** 2026-03-18
**Purpose:** Two one-paragraph proposals for the CEO to prioritize between as the next full-pipeline Forge feature after command palette ships.

---

## Option A: Embeddable Roadmap Views

Let users embed read-only, live-updating views of their roadmaps into external tools — Notion pages, Confluence wikis, internal dashboards, investor decks. The user copies an embed snippet (iframe or script tag) from the share menu, pastes it into their tool, and the roadmap renders in a compact, read-only format that stays in sync with the source. This is a distribution play: it puts Forge roadmaps where stakeholders already live, instead of requiring them to visit the Forge app. Backend: a new public embed endpoint that serves a stripped-down, read-only view (no auth required, inherits the roadmap's sharing settings). Frontend: a responsive embed renderer that works at any container width. Jonah estimates the backend as straightforward; the frontend is a focused build for Alice. No new data model — it reads from the existing roadmap/view/item schemas.

## Option B: Status Updates with Stakeholder Digests

Let roadmap owners post periodic status updates on their roadmaps — "Sprint 12 complete, 3 items shipped, 2 slipped to next sprint" — with an optional email digest to stakeholders. The roadmap becomes a living communication tool, not just a planning artifact. Users write a short update (plain text or markdown), tag which items changed, and optionally trigger a digest email to viewers. This is a retention play: it gives users a reason to return to Forge weekly, and it gives their stakeholders a reason to care about the roadmap. New data model (status updates table), new API (CRUD + email dispatch via Loops), new UI (update composer, timeline of past updates, digest settings). Fuller pipeline scope than embeddable views — likely needs Andrei, Robert, Jonah, and Alice.

---

**Thomas's recommendation:** Ship embeddable views first. It's smaller scope, has clear distribution value (Forge roadmaps appearing inside other tools = organic exposure), and doesn't require a new data model. Status updates is the stronger retention feature but it's a bigger build — save it for the next cycle.
