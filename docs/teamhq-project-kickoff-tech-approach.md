# TeamHQ Project Kickoff - Technical Approach

## Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Kickoff prompt | Server-side template, no AI | Simple string interpolation. Deterministic, instant, no API keys needed. |
| Detail view | Expanded card inline | Not a modal, not a side panel. Click a card, it expands in place to show all fields. Consistent with the Phase 1 card pattern. |
| New fields on Project | `goals`, `constraints`, `brief`, `notes`, `kickoffPrompt` | All optional strings except `notes` (array) and `kickoffPrompt` (auto-generated). |
| Notes storage | Embedded in the project JSON file | Notes are part of the project object, not separate files. Low volume, always read together. |
| Frontend | Still vanilla JS | Extend `js/projects.js` with detail view, kickoff modal, and notes section. |
| Migration | Default missing fields to empty values on read | No migration script. Zod schema uses `.default()` so old project files parse cleanly. |

---

## 1. Data Model Changes

### Updated Project Schema

Add five new fields to the existing `ProjectSchema`:

```typescript
import { z } from "zod";

export const ProjectStatus = z.enum(["planned", "in-progress", "completed"]);

export const NoteSchema = z.object({
  id: z.string(),
  content: z.string().min(1),
  createdAt: z.string().datetime(),
});

export type Note = z.infer<typeof NoteSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  status: ProjectStatus,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  // Phase 2 fields
  goals: z.string().default(""),
  constraints: z.string().default(""),
  brief: z.string().default(""),
  notes: z.array(NoteSchema).default([]),
  kickoffPrompt: z.string().nullable().default(null),
});
```

**Key decisions:**

- All new string fields use `.default("")` so existing project JSON files (which lack these fields) parse without error. No migration script needed.
- `notes` defaults to `[]`. Notes are embedded in the project object, not stored separately.
- `kickoffPrompt` defaults to `null`. It gets populated when "Start Work" is called and stored for reference.
- The `NoteSchema` is a nested object with `id`, `content`, and `createdAt`. Notes are identified by UUID for deletion.

### Updated Create/Update Schemas

```typescript
export const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
  status: ProjectStatus.optional().default("planned"),
  goals: z.string().optional().default(""),
  constraints: z.string().optional().default(""),
  brief: z.string().optional().default(""),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  description: z.string().optional(),
  status: ProjectStatus.optional(),
  goals: z.string().optional(),
  constraints: z.string().optional(),
  brief: z.string().optional(),
});

export const CreateNoteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
});
```

### Why Embed Notes in the Project File

- Notes are always read alongside the project (the detail view shows both).
- Volume is low — a project might have 5-20 notes.
- Separate note files would add filesystem complexity for no benefit.
- The project JSON file is the single source of truth for all project data.

---

## 2. API Changes

### Updated Existing Endpoints

The existing CRUD endpoints change minimally:

**`POST /api/projects`** — now accepts `goals`, `constraints`, `brief` as optional string fields in the body. Same behavior otherwise.

**`PATCH /api/projects/:id`** — now accepts `goals`, `constraints`, `brief` as optional string fields. Same behavior otherwise.

**`GET /api/projects`** — response shape unchanged. Each project in the array now includes the new fields. The list endpoint does **not** include `notes` or `kickoffPrompt` to keep the list payload small. Those are only returned by the single-project endpoint.

**`GET /api/projects/:id`** — returns the full project including `goals`, `constraints`, `brief`, `notes`, and `kickoffPrompt`.

### List Endpoint: Exclude Heavy Fields

The `GET /api/projects` list endpoint should strip `notes` and `kickoffPrompt` from each project before returning. These fields are only needed in the detail view (fetched via `GET /api/projects/:id`), and including them in the list would bloat the payload as notes accumulate.

Implementation: in the route handler, map each project to omit `notes` and `kickoffPrompt`:

```typescript
router.get("/projects", async (_req, res) => {
  const projects = await listProjects();
  const summaries = projects.map(({ notes, kickoffPrompt, ...rest }) => rest);
  res.json({ projects: summaries });
});
```

### New Endpoints

#### `POST /api/projects/:id/start`

Generates the kickoff prompt, sets the project status to `in-progress`, and returns the prompt.

**Behavior:**
1. Read the project. Return 404 if not found.
2. If the project status is already `in-progress` or `completed`, return the existing `kickoffPrompt` without regenerating. (Idempotent — calling start twice doesn't overwrite the prompt.)
3. Generate the kickoff prompt from the template (see section 3).
4. Update the project: set `status` to `in-progress`, set `kickoffPrompt` to the generated text, set `updatedAt` to now.
5. Return the updated project.

**Request:** No body required.

**Response: `200 OK`**
```json
{
  "id": "...",
  "name": "...",
  "kickoffPrompt": "You have a new project to work on...",
  "status": "in-progress",
  ...
}
```

**Error: `404 Not Found`** — project doesn't exist.

**Design note:** The endpoint is intentionally idempotent. If the CEO clicks "Start Work" twice, the second call returns the same prompt. To regenerate the prompt (e.g., after editing the brief), the CEO would edit the project, then call start again — but only if the status is reset to `planned` first. For Phase 2 simplicity, we don't add a "regenerate" action. The CEO can copy the existing prompt, or manually set status back to `planned` and click "Start Work" again.

#### `POST /api/projects/:id/notes`

Add a progress note to a project.

**Request body:**
```json
{
  "content": "Thomas has scoped the requirements. Andrei is working on tech approach."
}
```

**Behavior:**
1. Read the project. Return 404 if not found.
2. Validate the request body with `CreateNoteSchema`.
3. Create a `Note` object with a UUID, the content, and the current timestamp.
4. Prepend the note to the project's `notes` array (newest first).
5. Update `updatedAt` and write the project file.
6. Return the created note.

**Response: `201 Created`**
```json
{
  "id": "note-uuid",
  "content": "Thomas has scoped the requirements...",
  "createdAt": "2025-02-06T15:00:00.000Z"
}
```

**Error: `400 Bad Request`** — content is empty.

#### `DELETE /api/projects/:id/notes/:noteId`

Remove a progress note from a project.

**Behavior:**
1. Read the project. Return 404 if project not found.
2. Find the note by `noteId` in the `notes` array. Return 404 if note not found.
3. Remove the note from the array.
4. Update `updatedAt` and write the project file.
5. Return 204.

**Response: `204 No Content`**

**Error: `404 Not Found`** — project or note doesn't exist.

---

## 3. Kickoff Prompt Generation

**Decision: Server-side template. No AI involved.**

The kickoff prompt is a string template filled with project data. It's deterministic, instant, and requires no API keys or external calls. The template lives in the server code, not in a separate file.

### Template

```typescript
function generateKickoffPrompt(project: Project): string {
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
  sections.push(`## How to Proceed`);
  sections.push(``);
  sections.push(`1. Spawn Thomas (PM) first. He will scope the work, write requirements, and define who else needs to be involved.`);
  sections.push(`2. Thomas will write requirements to docs/ and create tasks with dependencies.`);
  sections.push(`3. Follow Thomas's recommendations for who to spawn next (typically: Andrei for architecture, Robert for design, then Alice and Jonah for implementation, Enzo for QA).`);
  sections.push(`4. All work flows through Thomas first -- do not skip the PM.`);
  sections.push(``);
  sections.push(`## Team Reference`);
  sections.push(``);
  sections.push(`The agent definitions are in .claude/agents/:`);
  sections.push(`- product-manager.md (Thomas) -- PM, scopes work`);
  sections.push(`- technical-architect.md (Andrei) -- architecture decisions`);
  sections.push(`- product-designer.md (Robert) -- UI/UX design`);
  sections.push(`- frontend-developer.md (Alice) -- frontend implementation`);
  sections.push(`- backend-developer.md (Jonah) -- backend implementation`);
  sections.push(`- qa.md (Enzo) -- testing and validation`);

  return sections.join("\n");
}
```

**Why not AI-generated:** The prompt's job is to relay project context to the team lead verbatim. There's nothing creative about it — it's a structured handoff document. Using AI would add latency, nondeterminism, and a dependency on an API key, all for something that's better served by a template.

**Where this function lives:** In a new file `server/src/kickoff.ts`. The route handler in `projects.ts` calls it.

### Handling Empty Fields

The template conditionally includes sections. If `goals` is empty, the "Goals" section is omitted entirely. If a project has only a name and description, the prompt is shorter but still functional. The requirements spec says "Start Work" should prompt the CEO to fill in fields if they're empty, but that's a frontend concern — the backend generates whatever it has.

---

## 4. Store Changes

### Updated `createProject`

The `createProject` function in `store/projects.ts` needs to accept and store the new fields:

```typescript
export async function createProject(
  data: {
    name: string;
    description: string;
    status: Project["status"];
    goals: string;
    constraints: string;
    brief: string;
  }
): Promise<Project> {
  await ensureDir();
  const now = new Date().toISOString();
  const project: Project = {
    id: uuidv4(),
    name: data.name,
    description: data.description,
    status: data.status,
    createdAt: now,
    updatedAt: now,
    completedAt: data.status === "completed" ? now : null,
    goals: data.goals,
    constraints: data.constraints,
    brief: data.brief,
    notes: [],
    kickoffPrompt: null,
  };
  await writeFile(projectPath(project.id), JSON.stringify(project, null, 2));
  return project;
}
```

### Updated `updateProject`

The `updateProject` function needs to accept the new fields:

```typescript
export async function updateProject(
  id: string,
  updates: Partial<Pick<Project, "name" | "description" | "status" | "goals" | "constraints" | "brief">>
): Promise<Project> {
  // ... same pattern as before, spread updates onto existing project
}
```

### New Store Functions

```typescript
export async function addNote(projectId: string, content: string): Promise<Note> {
  const project = await getProject(projectId);
  const note: Note = {
    id: uuidv4(),
    content,
    createdAt: new Date().toISOString(),
  };
  project.notes.unshift(note);
  project.updatedAt = new Date().toISOString();
  await writeFile(projectPath(projectId), JSON.stringify(project, null, 2));
  return note;
}

export async function deleteNote(projectId: string, noteId: string): Promise<void> {
  const project = await getProject(projectId);
  const idx = project.notes.findIndex((n) => n.id === noteId);
  if (idx === -1) throw new Error("Note not found");
  project.notes.splice(idx, 1);
  project.updatedAt = new Date().toISOString();
  await writeFile(projectPath(projectId), JSON.stringify(project, null, 2));
}

export async function startProject(projectId: string, kickoffPrompt: string): Promise<Project> {
  const project = await getProject(projectId);
  project.status = "in-progress";
  project.kickoffPrompt = kickoffPrompt;
  project.updatedAt = new Date().toISOString();
  await writeFile(projectPath(projectId), JSON.stringify(project, null, 2));
  return project;
}
```

---

## 5. Frontend Approach

### Still Vanilla JS

The frontend remains plain JavaScript in `js/projects.js`. No framework change. The Phase 2 additions are:

1. **Expandable project detail view** — clicking a project card expands it inline to show all fields
2. **Updated create/edit form** — add goals, constraints, brief fields
3. **"Start Work" button** — visible on planned projects, triggers the kickoff flow
4. **Kickoff prompt modal** — displays the generated prompt with a copy-to-clipboard button
5. **Progress notes section** — visible on in-progress projects within the expanded detail view

### Detail View: Expanded Card

**Decision: Inline expansion, not a modal or side panel.**

When the CEO clicks a project card, it expands to reveal the full detail view below the card header. This is the same expand/collapse pattern from the original Phase 1 task history (the `.project-card__details` pattern in the CSS). It reuses existing patterns and keeps the user in context.

The expanded detail view shows:
- Name, description, status (already visible in collapsed state)
- Goals, constraints, brief (new fields, displayed as labeled sections)
- "Start Work" button (if status is `planned`)
- Kickoff prompt (if generated, with copy button)
- Progress notes (if status is `in-progress`, with add-note form)
- Edit and delete buttons (moved from card header to detail view, or kept in both)

**Data fetching:** The list endpoint (`GET /api/projects`) returns project summaries without notes or kickoffPrompt. When the CEO expands a card, the frontend fetches the full project from `GET /api/projects/:id` to populate the detail view. This keeps the initial page load fast.

### "Start Work" Flow

1. CEO clicks "Start Work" button on a planned project's expanded detail view.
2. If goals and brief are both empty, show a warning: "This project has no goals or brief. The kickoff prompt will have limited context. Continue anyway?" with "Fill in Details" and "Start Anyway" buttons.
3. Frontend calls `POST /api/projects/:id/start`.
4. On success, the response includes the full updated project with `kickoffPrompt`.
5. Open a modal showing the kickoff prompt text in a read-only textarea/code block.
6. The modal has a "Copy to Clipboard" button that copies the prompt text.
7. Close the modal. The card now shows "In Progress" status.

### Progress Notes UI

Within the expanded detail view of an in-progress project:
- A section titled "Progress Notes" with a simple text input and "Add Note" button.
- Below: a list of notes in reverse chronological order, each showing content, timestamp, and a delete button (small "x" or trash icon).
- Adding a note: call `POST /api/projects/:id/notes`, optimistically prepend to list, roll back on failure.
- Deleting a note: confirmation not required (notes are lightweight), call `DELETE /api/projects/:id/notes/:noteId`, optimistically remove, roll back on failure.

### Updated Create/Edit Form

The existing modal form adds three new fields below "Description":
- **Goals** — textarea, placeholder "What does success look like?"
- **Constraints** — textarea, placeholder "Any boundaries or limitations?"
- **Brief** — larger textarea, placeholder "Detailed description of what to build and why"

All optional. The form layout stays single-column. The modal may need to scroll on smaller viewports with the additional fields.

### Copy to Clipboard

Use the `navigator.clipboard.writeText()` API. It's supported in all modern browsers. On success, change the button text to "Copied!" for 2 seconds, then revert. On failure, fall back to selecting the text in the textarea so the user can Ctrl+C.

---

## 6. Migration: No Script Needed

**Decision: Handle missing fields at the Zod schema level with `.default()` values.**

The existing project JSON files (from Phase 1) don't have `goals`, `constraints`, `brief`, `notes`, or `kickoffPrompt`. When the server reads these files, `ProjectSchema.parse()` fills in the defaults:

- `goals` → `""`
- `constraints` → `""`
- `brief` → `""`
- `notes` → `[]`
- `kickoffPrompt` → `null`

The next time the project is updated and saved, the file will include the new fields. No explicit migration step is needed.

This approach works because:
- Zod's `.default()` fills missing fields during `parse()`.
- Existing projects are functionally valid — they just have empty new fields.
- No risk of data loss or corruption.

---

## 7. File Structure Changes

```
server/src/
  index.ts                    # No changes
  routes/
    projects.ts               # Add /start, /notes, /notes/:noteId routes
  schemas/
    project.ts                # Add NoteSchema, update ProjectSchema, add CreateNoteSchema
  store/
    projects.ts               # Add addNote, deleteNote, startProject functions; update createProject/updateProject signatures
  kickoff.ts                  # New: generateKickoffPrompt template function
  migrate.ts                  # No changes
```

Frontend:
```
js/
  projects.js                 # Extend with detail view, kickoff flow, notes UI
index.html                    # Add kickoff prompt modal markup
css/styles.css                # Add styles for detail view, notes, kickoff modal
```

---

## 8. Key Technical Notes for the Team

### For Jonah (Backend)

- **Schema changes are additive.** Add new fields with `.default()` values. Existing JSON files will parse without error.
- **`createProject` signature change.** It currently takes `(name, description, status)` as separate args. Refactor to take a single data object since we now have 6 fields. See section 4 for the new signature.
- **`POST /api/projects/:id/start` is idempotent.** If the project already has a kickoff prompt, return it without regenerating. Only generate on the first call (when transitioning from `planned` to `in-progress`).
- **Strip `notes` and `kickoffPrompt` from the list endpoint.** These are only needed in the detail view. Keep the list payload lean.
- **The kickoff template function is in `server/src/kickoff.ts`.** It takes a `Project` and returns a string. No async, no side effects, pure function.
- **Note deletion doesn't need confirmation on the backend.** The frontend may or may not confirm — that's Alice's call. The API just deletes.

### For Alice (Frontend)

- **The detail view is an expansion of the existing project card.** Reuse the `.project-card__details` expand/collapse pattern from the Phase 1 CSS.
- **Fetch the full project when expanding a card.** The list data doesn't include notes or kickoff prompt. Call `GET /api/projects/:id` on expand.
- **The kickoff prompt modal is a new modal, separate from the create/edit modal.** It contains a read-only display of the prompt text and a copy button.
- **The create/edit form modal gains three new textarea fields.** The modal will be taller — make sure it scrolls gracefully on mobile.
- **"Start Work" button placement:** inside the expanded detail view, only visible when status is `planned`. After clicking, the project transitions to `in-progress` and the kickoff modal opens.
- **Notes UI is simple:** an input + button for adding, a list of notes with timestamps and delete buttons. Keep it lightweight.

### For Robert (Designer)

- **The expanded detail view needs a clear layout** for: name/status at top, then description, goals, constraints, brief as labeled sections, then the action area ("Start Work" or kickoff prompt display), then progress notes at the bottom.
- **The kickoff prompt modal** should display the prompt in a monospace font (it's a markdown-ish document) with a prominent "Copy to Clipboard" button.
- **Notes UI:** each note should show a relative timestamp ("2 hours ago" or just the date) and a subtle delete affordance. Keep the add-note input inline, not in a modal.
- **The "Start Work" button** should be visually distinct — this is the primary action on a planned project. Use the indigo accent color, make it prominent.
- **Empty state for brief fields:** when goals/constraints/brief are empty on the detail view, show placeholder text like "No goals set" in muted color, not blank space.
