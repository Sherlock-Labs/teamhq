# Roadmap Tool v2 — Visual Themes Backend Implementation Notes

**Author:** Jonah (BE)
**Date:** March 18, 2026
**Status:** Ready to apply (Forge repo not available locally)
**Work Item:** RT-37c
**Inputs:** `docs/roadmap-tool-v2-themes-requirements.md`, `docs/roadmap-tool-v2-themes-tech-approach.md`

---

## Summary

The backend changes for visual themes are minimal — 3 new columns on the `roadmaps` table, a Drizzle schema update, validation on the existing PATCH endpoint, and verifying the Socket.IO broadcast includes the new fields. No new endpoints, no new dependencies.

This doc contains the exact code changes to apply in the Forge repo.

---

## 1. Database Migration

Create `server/src/db/migrations/XXXX_add_theme_columns.ts`:

```sql
ALTER TABLE roadmaps
  ADD COLUMN theme_name   TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN accent_color TEXT,
  ADD COLUMN dark_mode    TEXT NOT NULL DEFAULT 'system'
    CHECK (dark_mode IN ('light', 'dark', 'system'));
```

If using Drizzle Kit to generate migrations, the schema change (step 2) will produce this automatically via `npx drizzle-kit generate`.

---

## 2. Drizzle Schema Update

In `server/src/db/schema.ts`, add to the `roadmaps` table definition:

```typescript
// Add these three columns to the roadmaps pgTable definition
themeName:   text('theme_name').notNull().default('default'),
accentColor: text('accent_color'),
darkMode:    text('dark_mode').notNull().default('system'),
```

---

## 3. Shared Types Update

In `shared/src/types.ts`, extend the `Roadmap` interface:

```typescript
export interface Roadmap {
  // ... existing fields ...
  themeName: string;
  accentColor: string | null;
  darkMode: 'light' | 'dark' | 'system';
}
```

---

## 4. Validation Schema

In `shared/src/validation.ts`, add:

```typescript
import { z } from 'zod';

export const VALID_THEME_NAMES = ['default', 'clean', 'bold', 'minimal', 'corporate', 'startup'] as const;

export const ThemeSettingsSchema = z.object({
  themeName: z.enum(VALID_THEME_NAMES).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g. #6366F1)').nullable().optional(),
  darkMode: z.enum(['light', 'dark', 'system']).optional(),
});
```

Then merge `ThemeSettingsSchema` into the existing roadmap update schema. If the roadmap PATCH route uses a Zod schema for body validation, extend it:

```typescript
// In the existing UpdateRoadmapSchema (or equivalent)
const UpdateRoadmapSchema = existingSchema.merge(ThemeSettingsSchema);
```

---

## 5. PATCH /api/v1/roadmaps/:id Route Changes

In `server/src/routes/roadmaps.ts`, the PATCH handler should:

1. Accept `themeName`, `accentColor`, and `darkMode` in the request body (already handled if using the merged schema above)
2. Pass the validated fields through to the database update

```typescript
// In the PATCH handler, after validation:
const updateData: Partial<Roadmap> = {};

if (parsed.name !== undefined) updateData.name = parsed.name;
// ... existing fields ...
if (parsed.themeName !== undefined) updateData.themeName = parsed.themeName;
if (parsed.accentColor !== undefined) updateData.accentColor = parsed.accentColor;
if (parsed.darkMode !== undefined) updateData.darkMode = parsed.darkMode;

const updated = await db
  .update(roadmaps)
  .set(updateData)
  .where(eq(roadmaps.id, roadmapId))
  .returning();
```

---

## 6. GET Response

No changes needed. The three new columns are part of the Drizzle schema, so `SELECT *` / `.select()` queries on the `roadmaps` table will include `themeName`, `accentColor`, and `darkMode` automatically in:

- `GET /api/v1/roadmaps/:id`
- `GET /api/v1/shared/:token`
- Any other endpoint returning roadmap data

---

## 7. Socket.IO Broadcast

Verify the existing `roadmap-updated` event in the PATCH handler broadcasts the full updated roadmap object. If it does, the three new fields flow through automatically:

```typescript
// This should already exist in the PATCH handler:
io.to(`roadmap:${roadmapId}`).emit('roadmap-updated', {
  roadmapId,
  changes: updateData,  // includes themeName, accentColor, darkMode
  changedBy: userId,
});
```

If the broadcast sends only specific fields, add `themeName`, `accentColor`, and `darkMode` to the changes object.

---

## 8. Validation Details

| Field | Type | Constraint | Error |
|-------|------|-----------|-------|
| `themeName` | `string` | Must be one of: `default`, `clean`, `bold`, `minimal`, `corporate`, `startup` | "Invalid enum value" |
| `accentColor` | `string \| null` | Must match `/^#[0-9A-Fa-f]{6}$/` or be `null` | "Must be a valid hex color (e.g. #6366F1)" |
| `darkMode` | `string` | Must be one of: `light`, `dark`, `system` | "Invalid enum value" |

All fields are optional on PATCH — only provided fields are updated.

---

## 9. Testing Checklist

```bash
# 1. Run migration
npx drizzle-kit push  # or npx drizzle-kit migrate

# 2. Verify default values on existing roadmaps
curl http://localhost:3001/api/v1/roadmaps/:id
# Should include: "themeName": "default", "accentColor": null, "darkMode": "system"

# 3. Update theme
curl -X PATCH http://localhost:3001/api/v1/roadmaps/:id \
  -H "Content-Type: application/json" \
  -d '{"themeName": "bold", "accentColor": "#E11D48", "darkMode": "dark"}'
# Should return updated roadmap with new theme values

# 4. Validate bad input
curl -X PATCH http://localhost:3001/api/v1/roadmaps/:id \
  -H "Content-Type: application/json" \
  -d '{"themeName": "nonexistent"}'
# Should return 400

curl -X PATCH http://localhost:3001/api/v1/roadmaps/:id \
  -H "Content-Type: application/json" \
  -d '{"accentColor": "not-a-color"}'
# Should return 400

curl -X PATCH http://localhost:3001/api/v1/roadmaps/:id \
  -H "Content-Type: application/json" \
  -d '{"darkMode": "auto"}'
# Should return 400

# 5. Clear accent override
curl -X PATCH http://localhost:3001/api/v1/roadmaps/:id \
  -H "Content-Type: application/json" \
  -d '{"accentColor": null}'
# Should return roadmap with accentColor: null
```

---

## 10. Estimated Scope

~30 minutes when the Forge repo is available. The changes are mechanical:
- 1 migration file (or `drizzle-kit push`)
- 3 lines in schema.ts
- 3 lines in types.ts
- ~10 lines in validation.ts
- ~5 lines in roadmaps route handler
- Verify Socket.IO broadcast (likely 0 changes needed)
