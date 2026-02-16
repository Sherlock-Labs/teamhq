# SiteSnap -- Design Spec

**Author:** Robert (Product Designer)
**Date:** 2026-02-16
**Status:** Final
**Depends on:** `sitesnap-requirements.md`, `sitesnap-tech-approach.md`, `sitesnap-ai-patterns.md`

---

## 1. Design Principles

These five principles govern every decision in this spec. When trade-offs arise, prioritize from top to bottom.

1. **Dirty-hands fast.** The user is on a job site, hands caked in drywall dust or paint, squinting in full sun. Every primary action is one tap on a large target. If it requires two hands, precision, or reading small text, redesign it.

2. **Camera is king.** The camera FAB is the fastest path in the app. One tap to open, one tap to shoot. Everything else -- browsing, searching, comparing -- is secondary to the capture speed. Never slow down the camera path.

3. **Timeline is the product.** The chronological photo stream grouped by date with color-coded type badges is the core value. It must feel fast, scannable, and filterable. If a contractor can't find their "before" photo in under 10 seconds, the design has failed.

4. **Professional, not corporate.** This is a tool for people who build things. The aesthetic is a quality work instrument: sturdy, confident, no-nonsense. No cartoon illustrations, no rounded-everything, no pastel whimsy. Think Leica viewfinder, not Instagram filter.

5. **Comparison is the viral loop.** The before/after comparison generator must produce an output that looks more polished than what a contractor would make in Canva. Every shared comparison is a SiteSnap ad. The output quality is marketing.

---

## 2. Design System

### 2.1 Color Palette

SiteSnap uses a dark-neutral base with a slate-blue accent for professional credibility. Dark backgrounds reduce glare on bright job sites, make photos pop against the chrome, and feel "tool-like." The accent is a cool, authoritative blue-gray -- not construction orange (too on-the-nose, too similar to safety gear, and competing with VoiceNote Pro's orange). Blue-gray reads as "precision instrument."

Photo type badges use a distinct, colorblind-friendly palette where each type is identifiable by hue AND luminance difference, not hue alone.

#### Core Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg-primary` | `#0C0E12` | App background |
| `--color-bg-card` | `#161920` | Cards, list items, bottom sheets |
| `--color-bg-elevated` | `#1C2028` | Headers, tab bar, modals |
| `--color-bg-input` | `#1C2028` | Text input backgrounds |
| `--color-bg-hover` | `#242830` | Press/hover state backgrounds |
| `--color-accent` | `#4F8EF7` | Primary actions, active states, CTAs (blue-500) |
| `--color-accent-hover` | `#3A75DE` | Pressed accent (blue-600) |
| `--color-accent-muted` | `rgba(79, 142, 247, 0.12)` | Accent tint backgrounds |
| `--color-text-primary` | `#F0F2F5` | Headings, body text |
| `--color-text-secondary` | `#8B95A5` | Timestamps, metadata, labels |
| `--color-text-tertiary` | `#5A6475` | Placeholder text, disabled text |
| `--color-border` | `#252A33` | Card borders, dividers |
| `--color-border-strong` | `#353B47` | Active borders, focus rings |

#### Photo Type Badge Colors

These six colors are chosen for maximum distinguishability under colorblind simulation (protanopia, deuteranopia, tritanopia). Each pair differs in both hue and luminance.

| Type | Background | Text | Mnemonic |
|------|-----------|------|----------|
| Before | `rgba(59, 130, 246, 0.15)` | `#60A5FA` | Blue -- "starting state" |
| After | `rgba(34, 197, 94, 0.15)` | `#4ADE80` | Green -- "done, success" |
| Progress | `rgba(245, 158, 11, 0.15)` | `#FBBF24` | Amber -- "in motion" |
| Issue | `rgba(239, 68, 68, 0.15)` | `#F87171` | Red -- "problem, alert" |
| Material | `rgba(168, 85, 247, 0.15)` | `#C084FC` | Purple -- "supplies" |
| Measurement | `rgba(20, 184, 166, 0.15)` | `#2DD4BF` | Teal -- "precision" |
| Unclassified | `rgba(107, 114, 128, 0.15)` | `#9CA3AF` | Gray -- "pending" |
| Pending | `rgba(107, 114, 128, 0.10)` | `#6B7280` | Dim gray -- "processing" |

#### Status Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-status-active` | `#22C55E` | Active job indicator (green dot) |
| `--color-status-success` | `#22C55E` | Success toasts, upload complete |
| `--color-status-error` | `#EF4444` | Error states, failed operations |
| `--color-status-warning` | `#F59E0B` | Upload retry, degraded states |

#### Contrast Ratios (verified)

| Pair | Ratio | Passes |
|------|-------|--------|
| `--color-text-primary` on `--color-bg-primary` | 16.1:1 | AAA |
| `--color-text-secondary` on `--color-bg-primary` | 5.8:1 | AA |
| `--color-accent` on `--color-bg-primary` | 5.4:1 | AA |
| `--color-text-primary` on `--color-bg-card` | 13.2:1 | AAA |
| `--color-accent` on `--color-bg-card` | 4.6:1 | AA |
| Badge text (blue `#60A5FA`) on `--color-bg-card` | 6.2:1 | AA |
| Badge text (green `#4ADE80`) on `--color-bg-card` | 8.5:1 | AAA |
| Badge text (amber `#FBBF24`) on `--color-bg-card` | 9.4:1 | AAA |
| Badge text (red `#F87171`) on `--color-bg-card` | 5.3:1 | AA |
| Badge text (purple `#C084FC`) on `--color-bg-card` | 5.6:1 | AA |
| Badge text (teal `#2DD4BF`) on `--color-bg-card` | 8.9:1 | AAA |

### 2.2 Typography

System font stack: San Francisco on iOS, Roboto on Android. No custom fonts. System fonts render fastest, respect platform conventions, and are optimized per OS for screen legibility.

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `--text-title` | 24px | 700 (Bold) | 1.2 | Screen titles |
| `--text-heading` | 20px | 600 (Semibold) | 1.3 | Section headings, date group labels |
| `--text-body-lg` | 17px | 400 (Regular) | 1.5 | Job names, primary content |
| `--text-body` | 15px | 400 (Regular) | 1.5 | Body text, descriptions |
| `--text-label` | 13px | 600 (Semibold) | 1.4 | Uppercase labels, filter chip text |
| `--text-caption` | 12px | 500 (Medium) | 1.4 | Timestamps, badge text, metadata |
| `--text-overline` | 11px | 600 (Semibold) | 1.2 | Section overlines (uppercase, letter-spacing: 1px) |

**Rules:**
- No text smaller than 12px anywhere. Job site conditions make small text unreadable.
- Job names use `--text-body-lg` (17px) -- these are the primary identifiers, they must be scannable.
- Uppercase labels always use `letter-spacing: 1px` for improved legibility at small sizes.
- Scene descriptions from AI use `--text-body` (15px) in `--color-text-secondary`.

### 2.3 Spacing Scale

4px base unit. All spacing uses these tokens. No arbitrary pixel values.

| Token | Value | Common Use |
|-------|-------|------------|
| `--space-1` | 4px | Tight inline gaps, badge inner padding |
| `--space-2` | 8px | Icon-to-label gap, badge horizontal padding |
| `--space-3` | 12px | Input padding, list item horizontal padding |
| `--space-4` | 16px | Standard gaps, card content padding |
| `--space-5` | 20px | Section gaps within a screen |
| `--space-6` | 24px | Card padding, major element gaps |
| `--space-8` | 32px | Screen edge horizontal padding |
| `--space-10` | 40px | Large separation, modal content padding |
| `--space-12` | 48px | Minimum touch target dimension |
| `--space-14` | 56px | Header height, large button height |
| `--space-16` | 64px | Camera FAB diameter |

### 2.4 Border and Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Badges, type pills, filter chips |
| `--radius-md` | 8px | Buttons, inputs, photo thumbnails |
| `--radius-lg` | 12px | Cards, bottom sheets |
| `--radius-xl` | 16px | Modal corners |
| `--radius-full` | 9999px | Circular elements (FAB, active job dot), pill badges |

### 2.5 Shadows

Minimal shadows. The dark background provides natural depth through color layering (`bg-primary` < `bg-card` < `bg-elevated`). Shadows used only for floating elements.

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.3)` | Subtle lift |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` | Cards, bottom sheets |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.5)` | Modals, overlays |
| `--shadow-fab` | `0 4px 16px rgba(79,142,247,0.35)` | Camera FAB resting glow |
| `--shadow-fab-active` | `0 2px 8px rgba(79,142,247,0.25)` | Camera FAB pressed state |

### 2.6 Icon Style

Outlined icons (not filled), 24px default size, 2px stroke weight. Use Lucide React Native (consistent with team stack). Icons are `--color-text-secondary` by default, `--color-text-primary` when active/selected, `--color-accent` for primary actions.

---

## 3. Navigation Structure

### Tab Bar (Bottom Navigation)

Two tabs plus the Camera FAB. The FAB is NOT a tab -- it is a floating action that overlaps the tab bar. The tab bar is minimal because SiteSnap has one primary task: take photos and browse them.

```
+---------------------------------------------+
|                                             |
|              [Screen Content]               |
|                                             |
|                                             |
|              +------------+                 |
|              |   CAMERA   | <-- FAB         |
|              |     [ ]    |                 |
|              +------------+                 |
|                                             |
|   [Jobs]                         [Profile]  |
|   Home                              Me      |
|                                             |
+---------------------------------------------+
```

**Tab bar spec:**
- Height: 84px (includes safe area inset on iOS)
- Background: `--color-bg-elevated`
- Border-top: 1px solid `--color-border`
- Tab items: icon (24px) + label (`--text-caption`, 12px, medium weight)
- Active tab: icon + label in `--color-accent`
- Inactive tab: icon + label in `--color-text-tertiary`
- Touch target per tab: minimum 72px wide, full height (minimum 48px above safe area)

**Camera FAB (center position):**
- Size: 64px diameter (circle)
- Background: `--color-accent`
- Icon: Camera, 28px, white (`#FFFFFF`)
- Shadow: `--shadow-fab`
- Position: Centered horizontally, bottom edge sits 12px above the tab bar top edge (overlapping)
- Touch target: 72px diameter (8px invisible padding around the visual button)
- Badge: Upload queue count, positioned top-right of FAB (see Section 5.3)
- The FAB is visible on ALL screens within the app layout (Home, Job Detail, Search, Profile) -- it is global

**Tab icons:**
- Home (Jobs): `Home` icon from Lucide (house outline)
- Profile (Me): `User` icon from Lucide (person outline)

### Navigation Flow (Expo Router)

```
app/
+-- _layout.tsx          -> Root: ClerkProvider, QueryClientProvider, PostHogProvider
+-- index.tsx            -> Redirect: signed in -> (app), else -> (auth)
+-- (auth)/
|   +-- sign-in.tsx      -> Clerk sign-in
|   +-- sign-up.tsx      -> Clerk sign-up
+-- (app)/
    +-- _layout.tsx      -> Tab bar layout (2 tabs + FAB)
    +-- home/
    |   +-- index.tsx    -> Job list (home screen)
    +-- jobs/
    |   +-- [id].tsx     -> Job detail / photo timeline
    +-- search.tsx       -> Photo search
    +-- compare.tsx      -> Comparison preview + share
    +-- profile.tsx      -> Profile + settings + subscription
    +-- upgrade.tsx      -> Upgrade prompt (modal presentation)
```

**Navigation rules:**
- Home screen is the default tab. It shows the job list.
- Tapping a job pushes to `jobs/[id]` (Job Detail). Back arrow returns to Home.
- Search is accessed from a search icon in the Home screen header. Pushes to `search`.
- Compare is pushed from Job Detail when generating a comparison. Not directly accessible.
- Profile is the second tab. Shows settings and subscription status.
- Upgrade is presented as a modal overlay from anywhere the free-tier gate triggers.

---

## 4. Screen Specifications

### 4.1 Home Screen (Job List)

**Purpose:** Primary landing screen after auth. Shows all jobs sorted by most recent activity. The active job is highlighted. This is where the user orients before going to a job site.

**Layout:**
```
+---------------------------------------------+
|  SiteSnap              [Search]  [Profile]  |
|                                             |
|  7 of 10 jobs               [+ New Job]    |
|                                             |
|  * Johnson Bathroom Remodel                 |
|    123 Oak St  -  12 photos  -  2:34 PM     |
|                                             |
|  Chen Kitchen Remodel                       |
|    456 Elm Ave  -  8 photos  -  Yesterday   |
|                                             |
|  Martinez Deck Repair                       |
|    789 Pine Rd  -  23 photos  -  Feb 14     |
|                                             |
|  Garcia Drywall Patch                       |
|    No address  -  5 photos  -  Feb 12       |
|                                             |
|                                             |
|              [CAMERA FAB]                   |
|  [Jobs]                         [Profile]   |
+---------------------------------------------+
```

The `*` denotes the active job indicator (green dot).

**Header:**
- Height: 56px (plus safe area inset)
- Background: `--color-bg-elevated`
- Left: "SiteSnap" -- `--text-body-lg` (17px), semibold, `--color-text-primary`
- Right: Search icon (24px, `--color-text-secondary`, touch target 48x48px) and Profile icon (24px, `--color-text-secondary`, touch target 48x48px). 8px gap between icons.

**Free tier indicator (below header):**
- Visible only for free-tier users
- Layout: Row, space-between
- Left: "7 of 10 jobs" -- `--text-caption` (12px), `--color-text-secondary`
- Right: "+ New Job" button
- Padding: `--space-4` (16px) horizontal, `--space-3` (12px) vertical

**"+ New Job" button:**
- Height: 36px
- Background: `--color-accent`
- Text: "+ New Job", `--text-label` (13px), semibold, white
- Padding: 0 `--space-4` (16px)
- Border-radius: `--radius-md` (8px)
- Press state: background `--color-accent-hover`, scale(0.97), 100ms

**Job Card (`.job-card`):**
- Background: `--color-bg-card`
- Border: 1px solid `--color-border`
- Border-radius: `--radius-lg` (12px)
- Padding: `--space-4` (16px)
- Margin-bottom: `--space-3` (12px)
- Layout: Column
- Row 1: Job name + active indicator
  - Active job indicator: 8px diameter circle, `--color-status-active` (#22C55E), positioned 4px left of job name. Only visible on the active job.
  - Job name: `--text-body-lg` (17px), semibold, `--color-text-primary`. Truncate with ellipsis at 1 line.
  - Chevron-right icon: 16px, `--color-text-tertiary`, right-aligned
- Row 2: Address + photo count + last activity
  - Gap of `--space-1` (4px) below Row 1
  - Address (or "No address"): `--text-caption` (12px), `--color-text-secondary`. Truncate at 1 line.
  - Separator: " -- " (en dash with spaces) in `--color-text-tertiary`
  - Photo count: "12 photos", `--text-caption` (12px), `--color-text-secondary`
  - Separator: " -- "
  - Last activity: relative timestamp ("2:34 PM", "Yesterday", "Feb 14"), `--text-caption` (12px), `--color-text-secondary`

**Job Card interaction states:**
- Default: as specified above
- Press: background `--color-bg-hover`, 100ms transition
- Swipe left: reveals "Archive" action (amber background, white text, 80px wide). Confirm via alert dialog: "Archive this job? You can find it in Archived Jobs." with "Archive" and "Cancel" buttons.
- Long press: no action (swipe handles archive)

**Archived jobs section:**
- Below the active job list, a collapsible section
- Trigger: "Archived (3)" link in `--text-label` (13px), `--color-text-secondary`, with a chevron-down icon
- When expanded, shows archived job cards with same layout but dimmed (opacity 0.6)
- Swipe left on archived card reveals "Unarchive" action (green background, white text)

**Scroll behavior:**
- FlatList with pull-to-refresh
- Pull-to-refresh indicator: native iOS spinner in `--color-accent`
- Content inset bottom: 100px (to clear tab bar + FAB)

**Sort order:** Jobs sorted by `lastPhotoAt` descending (most recent activity first). Jobs with no photos sort by `createdAt` descending.

#### 4.1.1 Home Screen -- Empty State (First Launch)

```
+---------------------------------------------+
|  SiteSnap              [Search]  [Profile]  |
|                                             |
|                                             |
|                                             |
|              [camera icon]                  |
|              48px, --color-text-tertiary     |
|                                             |
|         No jobs yet.                        |
|         Tap "+ New Job" to start            |
|         organizing your job site photos.    |
|                                             |
|         [+ Create First Job]                |
|                                             |
|                                             |
|                                             |
|              [CAMERA FAB]                   |
|  [Jobs]                         [Profile]   |
+---------------------------------------------+
```

- Center-aligned vertically and horizontally within the content area
- Icon: `Camera` from Lucide, 48px, `--color-text-tertiary`
- Heading: "No jobs yet." -- `--text-body-lg` (17px), medium weight, `--color-text-primary`. 16px below icon.
- Subtext: "Tap '+ New Job' to start organizing your job site photos." -- `--text-body` (15px), `--color-text-secondary`, center-aligned, max-width 260px. 8px below heading.
- CTA button: "+ Create First Job" -- same spec as "+ New Job" button but wider (auto-width with 24px horizontal padding), centered. 24px below subtext.

#### 4.1.2 Home Screen -- Loading State

- Show 4 skeleton job cards while the job list loads
- Skeleton card: same dimensions as JobCard. `--color-bg-card` background. Two animated shimmer bars inside:
  - Bar 1: 60% width, 14px height, `--radius-sm` (job name placeholder)
  - Bar 2: 40% width, 10px height, `--radius-sm` (metadata placeholder), 8px below bar 1
- Shimmer animation: linear gradient sweep from left to right, `--color-bg-hover` highlight, 1.5s duration, infinite loop
- Pull-to-refresh is available during loading state (for retry)

#### 4.1.3 Home Screen -- Error State

- If the job list fails to load: replace content area with centered error message
- Icon: `AlertCircle` from Lucide, 32px, `--color-status-error`
- Text: "Couldn't load jobs. Pull to retry." -- `--text-body` (15px), `--color-text-secondary`, center-aligned
- Pull-to-refresh triggers reload

---

### 4.2 Job Creation Modal

**Purpose:** Create a new job in under 5 seconds. Two fields, one required. Appears as a bottom sheet modal.

**Trigger:** Tapping "+ New Job" on the Home screen. If the free-tier user has 10 active jobs, show the Upgrade Prompt (Section 4.8) instead.

**Layout:**
```
+---------------------------------------------+
|                                             |
|         [dim overlay, tap to close]         |
|                                             |
+---------------------------------------------+
|  New Job                            [X]     |
|                                             |
|  JOB NAME *                                 |
|  +---------------------------------------+  |
|  |  e.g. Johnson Bathroom Remodel        |  |
|  +---------------------------------------+  |
|                                             |
|  ADDRESS (OPTIONAL)                         |
|  +---------------------------------------+  |
|  |  e.g. 123 Oak Street                  |  |
|  +---------------------------------------+  |
|                                             |
|  +---------------------------------------+  |
|  |            Create Job                 |  |
|  +---------------------------------------+  |
|                                             |
|  [safe area bottom padding]                 |
+---------------------------------------------+
```

**Bottom sheet spec:**
- Presentation: Slides up from bottom. Overlay behind is `rgba(0,0,0,0.5)`, tapping overlay dismisses.
- Background: `--color-bg-elevated`
- Border-radius: `--radius-xl` (16px) on top-left and top-right, 0 on bottom
- Padding: `--space-6` (24px) top, `--space-8` (32px) horizontal, safe area bottom
- Drag handle: 36px wide, 4px tall, `--color-border-strong`, centered, `--radius-full`, 8px above content

**Header:**
- "New Job" -- `--text-heading` (20px), semibold, `--color-text-primary`
- Close button (X icon): 24px, `--color-text-secondary`, touch target 48x48px, right-aligned

**Form fields:**

Label style: `--text-overline` (11px), semibold, uppercase, `letter-spacing: 1px`, `--color-text-secondary`. 8px margin-bottom.

Input style:
- Height: 52px (larger for thumb usability)
- Background: `--color-bg-input`
- Border: 1px solid `--color-border`
- Border-radius: `--radius-md` (8px)
- Text: `--text-body-lg` (17px), `--color-text-primary`
- Placeholder: `--text-body-lg` (17px), `--color-text-tertiary`
- Padding: 0 `--space-4` (16px)
- Gap between fields: `--space-5` (20px)

Input interaction states:
- Focus: border-color `--color-accent`, shadow `0 0 0 3px var(--color-accent-muted)`
- Error: border-color `--color-status-error`, error message below in `--text-caption` (12px), `--color-status-error`, 4px below input
- Error message for empty job name: "Job name is required"

**"Create Job" button:**
- Full width
- Height: 52px
- Background: `--color-accent`
- Text: "Create Job", `--text-body-lg` (17px), semibold, white
- Border-radius: `--radius-md` (8px)
- Margin-top: `--space-6` (24px)
- Press state: background `--color-accent-hover`, scale(0.98), 100ms
- Loading state: text replaced by a white spinner (20px), background remains `--color-accent`, pointer-events disabled
- Disabled state: opacity 0.5, pointer-events none (only disabled during loading)

**Success behavior:** Modal slides down, job appears at top of Home screen list with active job indicator (green dot). Brief haptic feedback (light impact).

**Error states:**
- Server error: inline error message below the button: "Couldn't create job. Try again." in `--text-body` (15px), `--color-status-error`. Button re-enables.
- Network error: "No connection. Check your signal and try again." Same positioning.
- Slow save (5s+): Button text changes to spinner + "Still saving..." in white. Remains loading state.
- Timeout (10s): Loading stops, error: "Couldn't save. Check your connection and try again."
- User input is ALWAYS preserved on error -- never clear the fields.

**Max length:** Job name input has a 100-character limit. Show character count in `--text-caption` only when 80+ characters ("85/100") in `--color-text-secondary`, aligned right below the input.

---

### 4.3 Camera FAB and Photo Capture

**Purpose:** The fastest path to documenting a job. One tap to open camera, one tap to shoot. The FAB is persistent across all app screens.

#### 4.3.1 Camera FAB Component

The Camera FAB is a global floating action button that appears on every screen within the authenticated app layout.

**Visual spec:**
- Size: 64px diameter circle
- Background: `--color-accent` (`#4F8EF7`)
- Icon: `Camera` from Lucide, 28px, white
- Shadow: `--shadow-fab` (`0 4px 16px rgba(79,142,247,0.35)`)
- Position: Centered horizontally, overlapping the tab bar. Bottom edge of FAB sits 12px above the top edge of the tab bar.
- Z-index: Above all content, above tab bar

**Upload queue badge:**
- Position: Top-right of FAB, offset so center of badge sits at the 1 o'clock position of the circle
- Size: 20px diameter minimum (expands for 2+ digits)
- Background: `--color-status-warning` (`#F59E0B`)
- Text: `--text-overline` (11px), bold, white, center-aligned
- Border: 2px solid `--color-bg-elevated` (creates visual separation from FAB)
- Shows count of items in upload queue (pending + uploading + failed)
- Hidden when queue is empty (0 items)
- Animate in: scale from 0 to 1, 200ms, ease-out

**Interaction states:**
- Default: as specified
- Press: background `--color-accent-hover`, shadow `--shadow-fab-active`, scale(0.93), 100ms. Haptic feedback (medium impact).
- During upload: FAB remains fully interactive. Badge shows queue count. The FAB is NEVER disabled.

#### 4.3.2 Camera Capture Flow

**Tap FAB when an active job is set:**
1. Camera view opens immediately (expo-camera, full-screen)
2. Camera view UI:
   - Viewfinder: Full-bleed camera preview
   - Top bar: Transparent gradient overlay (black 50% to transparent), 60px tall. Contains:
     - Close button (X): top-left, 24px icon, white, touch target 48x48px
     - Flash toggle: top-right, `Zap` icon (off) / `ZapOff` icon (on), white, touch target 48x48px
   - Bottom bar: `--color-bg-primary` with 80% opacity, 120px tall. Contains:
     - Gallery picker: bottom-left, 44x44px rounded square showing last camera roll photo thumbnail, border 2px white, `--radius-md`. Touch target 48x48px. Opens expo-image-picker.
     - Shutter button: center, 72px outer ring (3px white border), 60px inner circle (white fill). Touch target: full 72px.
     - Active job label: bottom-right area, "Johnson Bathroom..." truncated, `--text-caption` (12px), white, max-width 100px. Visual reminder of where photos are going.
3. Shutter button press: inner circle shrinks to 54px (scale 0.9), 50ms, then rebounds. Flash animation: full-screen white overlay at 80% opacity, fades to 0 in 150ms. Haptic feedback (light impact).
4. After capture: Photo is immediately compressed and added to upload queue. Camera stays open for the next shot. No preview step -- speed over review.

**Shutter button interaction states:**
- Default: 72px outer ring (white border), 60px inner circle (white fill)
- Press: inner circle scale(0.9), 50ms. Flash overlay.
- Release: inner circle scale(1.0), 100ms, ease-out

**Tap FAB when NO active job is set:**

A bottom sheet appears instead of the camera:

```
+---------------------------------------------+
|                                             |
|         [dim overlay]                       |
|                                             |
+---------------------------------------------+
|  Which job are you working on?        [X]   |
|                                             |
|  Johnson Bathroom Remodel                   |
|  123 Oak St                                 |
|                                             |
|  Chen Kitchen Remodel                       |
|  456 Elm Ave                                |
|                                             |
|  Martinez Deck Repair                       |
|  789 Pine Rd                                |
|                                             |
|  + New Job                                  |
|                                             |
+---------------------------------------------+
```

**Job Selector bottom sheet:**
- Same bottom sheet styling as Job Creation Modal (bg-elevated, top-radius, drag handle)
- Title: "Which job are you working on?" -- `--text-heading` (20px), semibold
- Close button: X icon, top-right
- Job list: Scrollable, each row is 56px tall, full-width tap target
  - Job name: `--text-body-lg` (17px), `--color-text-primary`
  - Address: `--text-caption` (12px), `--color-text-secondary`, 2px below name
  - Press state: `--color-bg-hover` background
  - Tapping a job sets it as active, closes the sheet, and opens the camera
- "+ New Job" row: at bottom of list, accent color icon (`Plus` from Lucide, 20px) + text "New Job" in `--color-accent`, `--text-body-lg` (17px), medium weight. Tapping opens Job Creation Modal.

**Camera permission denied:**
- If expo-camera permission is denied, show inline content in the camera view area:
  - Icon: `CameraOff` from Lucide, 48px, `--color-text-tertiary`
  - Text: "Camera access needed to take job site photos." -- `--text-body` (15px), `--color-text-secondary`, center-aligned
  - Button: "Open Settings" -- same spec as secondary button (outlined, `--color-text-primary` text, `--color-border` border). Opens iOS Settings via Linking.openSettings().

---

### 4.4 Job Detail / Photo Timeline

**Purpose:** The core screen. Shows all photos for a job in reverse-chronological order, grouped by date, with type badges and filter chips. This is where the contractor finds the photo they need.

**Layout:**
```
+---------------------------------------------+
|  <- Johnson Bathroom Remodel      [...]     |
|                                             |
|  123 Oak St  -  12 photos                   |
|                                             |
|  [All] [Before 4] [After 3] [Progress 2]   |
|  [Issue 1] [Material 1] [Measurement 1]    |
|                                             |
|  TODAY                                      |
|  +--------+ +--------+ +--------+          |
|  | [photo]| | [photo]| | [photo]|          |
|  | AFTER  | | PROGR. | | MATER. |          |
|  | 2:34PM | | 2:30PM | | 2:15PM |          |
|  +--------+ +--------+ +--------+          |
|                                             |
|  YESTERDAY                                  |
|  +--------+ +--------+ +--------+          |
|  | [photo]| | [photo]| | [photo]|          |
|  | BEFORE | | BEFORE | | ISSUE  |          |
|  | 3:45PM | | 3:40PM | | 3:20PM |          |
|  +--------+ +--------+ +--------+          |
|  +--------+ +--------+                     |
|  | [photo]| | [photo]|                     |
|  | PROGR. | | MEASUR.|                     |
|  | 2:10PM | | 1:55PM |                     |
|  +--------+ +--------+                     |
|                                             |
|              [CAMERA FAB]                   |
|  [Jobs]                         [Profile]   |
+---------------------------------------------+
```

**Header:**
- Height: 56px (plus safe area)
- Background: `--color-bg-elevated`
- Back arrow: `ChevronLeft` icon, 24px, `--color-text-secondary`, touch target 48x48px
- Job name: `--text-body-lg` (17px), semibold, `--color-text-primary`, truncate with ellipsis
- Overflow menu (...): `MoreHorizontal` icon, 24px, `--color-text-secondary`, touch target 48x48px

**Overflow menu options (presented as action sheet):**
- "Set as Active Job" (if not already active) -- `--color-text-primary`
- "Edit Job" -- `--color-text-primary`. Opens edit modal (same layout as creation, pre-filled).
- "Compare Photos" -- `--color-accent`. Enters comparison selection mode.
- "Archive Job" -- `--color-text-secondary`
- "Delete Job" -- `--color-status-error`

**Subheader (below job name):**
- Address (if present) + separator + photo count
- `--text-caption` (12px), `--color-text-secondary`
- Padding: `--space-4` (16px) horizontal, `--space-2` (8px) vertical
- Example: "123 Oak St -- 12 photos"
- If no address: "12 photos" only

**Filter chips row:**
- Horizontal scroll (ScrollView horizontal)
- Padding: `--space-4` (16px) horizontal
- Gap between chips: `--space-2` (8px)
- "All" chip is always first and selected by default

**Filter chip spec (`.type-filter-chip`):**
- Height: 32px
- Border-radius: `--radius-full` (9999px, pill shape)
- Padding: 0 `--space-3` (12px)
- Text: `--text-label` (13px), medium weight
- Inactive: background transparent, border 1px solid `--color-border`, text `--color-text-secondary`
- Active: background = type badge background color at 100% (not the 15% muted), text = type badge text color, border color matches text
- Active "All" chip: background `--color-accent-muted`, text `--color-accent`, border `--color-accent`
- Each chip shows count: "Before (4)". Count in same color as text.
- Multiple chips can be active simultaneously (tapping "All" deselects all type filters)
- Press state: opacity 0.7, 100ms

**Date group header:**
- Text: Relative date ("TODAY", "YESTERDAY") or formatted date ("FEB 14"), `--text-overline` (11px), semibold, uppercase, `letter-spacing: 1px`, `--color-text-secondary`
- Padding: `--space-5` (20px) top, `--space-3` (12px) bottom, `--space-4` (16px) horizontal

**Photo grid:**
- Layout: 3 columns, equal width, gap `--space-1` (4px)
- Each thumbnail is square (width = (screen width - 32px padding - 8px gaps) / 3)
- Grid padding: `--space-4` (16px) horizontal

**Photo thumbnail spec (`.photo-thumbnail`):**
- Aspect ratio: 1:1 (square, center-cropped)
- Border-radius: `--radius-md` (8px)
- Image: loaded from thumbnail URL via expo-image, `contentFit: "cover"`, `cachePolicy: "disk"`
- Placeholder: blurhash or solid `--color-bg-card`
- Image fade-in: 200ms transition on load

**Type badge (on thumbnail):**
- Position: Bottom-left of thumbnail, 6px from edges
- Background: type badge background color (from Section 2.1 table)
- Text: type name abbreviated (e.g., "BEFORE", "AFTER", "PROG.", "ISSUE", "MATER.", "MEAS."), `--text-overline` (11px), semibold, uppercase, type badge text color
- Padding: 3px 6px
- Border-radius: `--radius-sm` (6px)

**Timestamp (on thumbnail):**
- Position: Bottom-right of thumbnail, 6px from edges
- Text: time only (e.g., "2:34 PM"), `--text-overline` (11px), medium weight, white
- Text shadow: `0 1px 3px rgba(0,0,0,0.8)` for legibility over photos

**Photo thumbnail interaction states:**
- Default: as specified
- Press: scale(0.95), 100ms. Opens full-screen photo viewer.
- Long press on type badge: opens type picker to manually reclassify. See Section 4.4.4.

#### 4.4.1 Photo -- Shimmer Loading State (Upload In Progress)

When a photo is uploading and/or being classified, it appears in the timeline immediately with a loading state.

- Thumbnail area: `--color-bg-card` background with animated shimmer gradient (same as skeleton loading)
- Badge area: shows "PENDING" badge in dim gray (`--color-text-tertiary`), pulsing opacity (0.5 to 1.0, 1.5s cycle)
- Once the thumbnail is available from R2 (after upload completes and thumbnail is generated), the shimmer fades out and the image fades in (200ms)
- Once classification completes, the "PENDING" badge crossfades to the actual type badge (150ms)

#### 4.4.2 Photo -- Upload Failed State

- Thumbnail area: `--color-bg-card` background
- Overlay: circular retry icon (`RotateCcw` from Lucide, 24px, white) centered on the thumbnail, with a semi-transparent dark scrim behind it (`rgba(0,0,0,0.6)`)
- Badge: "RETRY" in `--color-status-warning` text on warning-muted background
- Tapping the thumbnail triggers manual retry of the upload

#### 4.4.3 Full-Screen Photo Viewer

Tapping a thumbnail opens the full-screen viewer.

**Layout:**
```
+---------------------------------------------+
|  [X]                         [Share] [...]  |
|                                             |
|                                             |
|                                             |
|                                             |
|           [Full-resolution photo]           |
|           (pinch to zoom, pan)              |
|                                             |
|                                             |
|                                             |
|                                             |
|  [AFTER]  Today, 2:34 PM                   |
|  Finished bathroom with new tile and        |
|  chrome fixtures installed                  |
+---------------------------------------------+
```

**Spec:**
- Background: `#000000` (pure black for photo viewing)
- Presentation: Full-screen modal, slides up. Status bar hidden.
- Close button (X): top-left, 24px, white, touch target 48x48px
- Share button: top-right, `Share2` icon, 24px, white, touch target 48x48px. Opens native share sheet with the full-resolution photo (EXIF stripped).
- Overflow (...): `MoreHorizontal` icon, 24px, white, touch target 48x48px. Options: "Delete Photo" (red text, confirmation alert).
- Photo: Full-width, centered vertically. Support pinch-to-zoom (2x to 5x) and pan when zoomed. Use expo-image or react-native-gesture-handler for gesture support.
- Info bar at bottom: `--color-bg-elevated` at 90% opacity, 80px tall, padding `--space-4` (16px)
  - Type badge: same spec as thumbnail badge but slightly larger -- `--text-caption` (12px) text
  - Timestamp: "Today, 2:34 PM" -- `--text-caption` (12px), `--color-text-secondary`, 8px right of badge
  - Scene description (from AI): `--text-body` (15px), `--color-text-secondary`, below badge/timestamp with 4px gap. 2 lines max, truncate with ellipsis.
- Swipe left/right: navigate to adjacent photos in the same job (or filtered set). Horizontal page animation, 300ms, ease.
- Tap photo: toggle info bar and controls visibility (fade in/out 200ms). When hidden, the photo is full-screen with no chrome.
- Swipe down: dismiss viewer (interactive spring animation, velocity-based threshold)

#### 4.4.4 Manual Type Reclassification

Long-pressing a type badge (on thumbnail or in full-screen viewer) opens a type picker.

**Type picker (bottom sheet):**
- Title: "Classify Photo" -- `--text-heading` (20px), semibold
- 7 options in a vertical list (6 types + "Unclassified"), each row:
  - Height: 52px
  - Left: type badge (same color scheme as thumbnails)
  - Center: type name, `--text-body-lg` (17px), `--color-text-primary`
  - Right: checkmark if currently selected, `--color-accent`
  - Press state: `--color-bg-hover`
- Tapping a type immediately updates the badge and sends `PUT /api/photos/:id` with the new type
- Dismiss: tap outside, swipe down, or tap X

#### 4.4.5 Job Detail -- Empty State

```
+---------------------------------------------+
|  <- Johnson Bathroom Remodel      [...]     |
|                                             |
|  123 Oak St  -  0 photos                    |
|                                             |
|                                             |
|              [camera icon]                  |
|                                             |
|         No photos yet.                      |
|         Tap the camera button to            |
|         start documenting this job.         |
|                                             |
|                                             |
|              [CAMERA FAB]                   |
|  [Jobs]                         [Profile]   |
+---------------------------------------------+
```

- Same empty state styling as Home screen empty state
- Icon: `Camera` from Lucide, 48px, `--color-text-tertiary`
- Heading: "No photos yet." -- `--text-body-lg` (17px), medium, `--color-text-primary`
- Subtext: "Tap the camera button to start documenting this job." -- `--text-body` (15px), `--color-text-secondary`
- No CTA button -- the Camera FAB is the action

#### 4.4.6 Job Detail -- Filter Empty State

When a type filter is active but no photos match:

- Centered in the grid area
- Text: 'No [type] photos in this job.' (e.g., "No issue photos in this job.") -- `--text-body` (15px), `--color-text-secondary`
- No icon, no button. The filter chips above remain interactive for the user to change their filter.

#### 4.4.7 Job Detail -- Loading State

- Filter chips: show "All" chip only, others appear as they load
- Photo grid: show 6 skeleton squares (2 rows of 3) with shimmer animation
- Same shimmer spec as Home screen skeleton cards

#### 4.4.8 Job Detail -- Error State

- Icon: `AlertCircle`, 32px, `--color-status-error`
- Text: "Couldn't load photos. Pull to retry." -- `--text-body` (15px), `--color-text-secondary`
- Pull-to-refresh available

**Pagination:**
- Photos load in batches of 20
- On scroll near bottom (200px threshold), load next batch
- Loading indicator: small spinner (20px, `--color-accent`) centered below the last row of photos
- No "load more" button -- infinite scroll only

---

### 4.5 Before/After Comparison Generator

**Purpose:** The viral feature. Generates a professional-looking 1080x1080 side-by-side comparison image for sharing on Facebook, Instagram, and messaging.

#### 4.5.1 Selection Mode

Triggered from the Job Detail overflow menu ("Compare Photos") or a dedicated "Compare" button in the filter chip area.

**Compare button placement:** After the filter chips, at the far right of the horizontal scroll. Styled differently from filter chips:
- Icon: `Columns` from Lucide, 16px
- Text: "Compare", `--text-label` (13px), medium
- Background: transparent
- Border: 1px dashed `--color-border-strong`
- Border-radius: `--radius-full`
- Height: 32px
- Padding: 0 `--space-3` (12px)
- Press: `--color-bg-hover`

**Selection mode behavior:**
- Header changes: Back arrow becomes "Cancel" text button (`--color-text-secondary`). Title changes to "Select Photos". Overflow menu hidden.
- Instruction banner appears below filter chips:
  - Background: `--color-accent-muted`
  - Text: "Tap a BEFORE photo, then tap an AFTER photo" -- `--text-body` (15px), `--color-accent`, center-aligned
  - Height: 40px
  - Border-radius: `--radius-md` (8px)
  - Margin: `--space-3` (12px) horizontal, `--space-2` (8px) vertical
- Photo thumbnails become tappable for selection (not for opening the full-screen viewer)
- "Generate" button appears at the bottom (see below)

**Selected photo overlay:**
- Overlay: `rgba(79, 142, 247, 0.3)` (accent at 30%)
- Numbered circle: top-left of thumbnail, 28px diameter circle, `--color-accent` background, white bold text ("1" or "2"), `--text-label` (13px)
- "1" = BEFORE, "2" = AFTER
- Tapping a selected photo deselects it (overlay + number removed)

**"Generate" button (bottom floating):**
- Position: Fixed to bottom of screen, above tab bar, centered
- Width: screen width minus 64px (32px margin each side)
- Height: 52px
- Border-radius: `--radius-md` (8px)
- Disabled state (fewer than 2 photos selected): background `--color-bg-hover`, text `--color-text-tertiary`, "Select 2 Photos" text
- Enabled state (both photos selected): background `--color-accent`, text white, "Generate Comparison" text, `--text-body-lg` (17px), semibold
- Press: `--color-accent-hover`, scale(0.98)
- Shadow: `--shadow-md`

#### 4.5.2 Comparison Preview Screen

After tapping "Generate," the app navigates to the comparison preview screen.

**Layout:**
```
+---------------------------------------------+
|  <- Comparison                              |
|                                             |
|  +---------------------------------------+  |
|  |                                       |  |
|  |   BEFORE        |        AFTER        |  |
|  |                  |                     |  |
|  |   [left photo]   |   [right photo]    |  |
|  |                  |                     |  |
|  |                                       |  |
|  |  Johnson Bathroom Remodel             |  |
|  |                        Mike's Repairs |  |
|  |                  Made with SiteSnap   |  |
|  +---------------------------------------+  |
|                                             |
|  +------------------+ +------------------+  |
|  |   Share          | |   Save           |  |
|  +------------------+ +------------------+  |
|                                             |
+---------------------------------------------+
```

**Header:**
- Back arrow + "Comparison" title
- Standard header spec

**Comparison image preview:**
- Aspect ratio: 1:1 (square)
- Width: screen width minus 32px (16px margin each side)
- Border-radius: `--radius-md` (8px)
- Shadow: `--shadow-md`
- Displays the server-generated 1080x1080 comparison image

**Comparison image spec (server-generated, 1080x1080px):**
- Canvas: 1080x1080px, black background
- Left half (540px): "before" photo, center-cropped to fill
- Right half (540px): "after" photo, center-cropped to fill
- Center divider: 2px vertical line, white at 50% opacity
- "BEFORE" label: Bottom-left area of left half, white bold text (32px), semi-transparent dark pill background (`rgba(0,0,0,0.6)`), padding 8px 16px, 40px from bottom, 20px from left
- "AFTER" label: Bottom-right area of right half, same styling, 40px from bottom, 20px from right edge of right half
- Job name header: Top of image, full width, `rgba(0,0,0,0.5)` background, 50px tall. White text (24px, semibold), center-aligned, vertically centered in the bar.
- Business name footer: Bottom of image, full width, `rgba(0,0,0,0.5)` background, 40px tall. Business name left-aligned with 20px padding, white text (16px). "Made with SiteSnap" right-aligned with 20px padding, white text (12px, medium). If no business name set, footer shows only "Made with SiteSnap" right-aligned.
- Watermark: "Made with SiteSnap" is ALWAYS present (free and paid tiers). This is the viral loop.

**Action buttons (below image):**
- Layout: Two buttons in a row, equal width, `--space-3` (12px) gap
- Height: 52px
- Border-radius: `--radius-md` (8px)

- "Share" button: Background `--color-accent`, icon `Share2` (20px, white) + text "Share" in white, `--text-body-lg` (17px), semibold
- "Save" button: Background `--color-bg-card`, border 1px `--color-border`, icon `Download` (20px, `--color-text-primary`) + text "Save" in `--color-text-primary`, `--text-body-lg` (17px), medium

- Share press: `--color-accent-hover`, scale(0.98). Opens native share sheet (UIActivityViewController) with the comparison image.
- Save press: `--color-bg-hover`, scale(0.98). Saves to camera roll via expo-media-library. On success: brief toast "Saved to camera roll" (see Toast spec in Section 6).

#### 4.5.3 Comparison -- Loading State

While the server generates the comparison image:

- Image area: `--color-bg-card` background, 1:1 aspect ratio
- Center: spinner (32px, `--color-accent`) + text "Creating your comparison..." below, `--text-body` (15px), `--color-text-secondary`, 12px below spinner
- Share/Save buttons: disabled (opacity 0.5)

#### 4.5.4 Comparison -- Error State

- Image area: `--color-bg-card` background
- Center: `AlertCircle` icon (32px, `--color-status-error`) + "Couldn't create comparison. Try again." text, `--text-body` (15px), `--color-text-secondary`
- Below: "Retry" button -- secondary style, `--text-body` (15px), `--color-accent` text, transparent background, border 1px `--color-accent`. Touch target 48px tall.

---

### 4.6 Search Screen

**Purpose:** Find any photo across all jobs in under 10 seconds. Search by job name, filter by type, filter by date range.

**Layout:**
```
+---------------------------------------------+
|  <- Search                                  |
|                                             |
|  +---------------------------------------+  |
|  |  Search jobs...                       |  |
|  +---------------------------------------+  |
|                                             |
|  [Before] [After] [Progress] [Issue] ...    |
|                                             |
|  Date range:  [Feb 1] -- [Feb 16]          |
|                                             |
|  Johnson Bathroom Remodel                   |
|  +--------+ +--------+ +--------+          |
|  | [photo]| | [photo]| | [photo]|          |
|  | AFTER  | | BEFORE | | PROGR. |          |
|  +--------+ +--------+ +--------+          |
|                                             |
|  Chen Kitchen Remodel                       |
|  +--------+ +--------+                     |
|  | [photo]| | [photo]|                     |
|  | ISSUE  | | MATER. |                     |
|  +--------+ +--------+                     |
|                                             |
|              [CAMERA FAB]                   |
|  [Jobs]                         [Profile]   |
+---------------------------------------------+
```

**Header:**
- Back arrow + "Search" title
- Standard header spec

**Search input:**
- Same input styling as Job Creation form (52px height, bg-input, etc.)
- Placeholder: "Search jobs..." in `--color-text-tertiary`
- Left icon: `Search` from Lucide, 20px, `--color-text-tertiary`, inside the input
- Right icon: `X` (clear), 20px, `--color-text-secondary`, visible only when text is entered. Tapping clears input.
- Auto-focus on screen open (keyboard appears immediately)
- Search triggers on 300ms debounce after user stops typing
- Padding: `--space-4` (16px) horizontal

**Type filter chips:**
- Same spec as Job Detail filter chips (Section 4.4)
- Below search input with `--space-3` (12px) gap
- No "All" chip in search -- all types shown by default when no chips are active

**Date range picker:**
- Layout: Row with "Date range:" label + two date inputs + "--" separator
- Label: `--text-label` (13px), `--color-text-secondary`
- Date inputs: 100px wide, 36px tall, `--color-bg-input`, border 1px `--color-border`, `--radius-md`. Text: `--text-caption` (12px), `--color-text-primary`. Placeholder: "Start" / "End". Tapping opens native date picker.
- Clear button: small X icon appears to the right when any date is set
- Gap: `--space-3` (12px) between elements
- Padding: `--space-4` (16px) horizontal, `--space-2` (8px) vertical

**Results display:**
- Grouped by job name
- Job name header: `--text-label` (13px), semibold, `--color-text-secondary`, uppercase, `letter-spacing: 0.5px`. Padding: `--space-4` (16px) top, `--space-2` (8px) bottom.
- Photo grid: Same 3-column layout as Job Detail (Section 4.4)
- Each thumbnail shows: photo, type badge, and is tappable to open full-screen viewer within the photo's job context
- Results paginated at 20, infinite scroll

#### 4.6.1 Search -- Default State (No Query)

When the search screen opens with no query entered:

- Below the filters area: "Recent Photos" section heading (`--text-label`, 13px, `--color-text-secondary`, uppercase)
- Show the 12 most recent photos across all jobs in a 3-column grid
- Each thumbnail includes a small job name label below it: `--text-caption` (12px), `--color-text-secondary`, 1 line, truncate

#### 4.6.2 Search -- No Results

- Centered in the results area
- Icon: `SearchX` from Lucide, 32px, `--color-text-tertiary`
- Text: "No photos match your search." -- `--text-body` (15px), `--color-text-secondary`

#### 4.6.3 Search -- Loading State

- Skeleton grid: 6 skeleton squares (2 rows of 3) with shimmer animation
- Shows below active filters

---

### 4.7 Profile / Settings

**Purpose:** Set business name (used in comparison watermarks), select trade, view subscription status, sign out.

**Layout:**
```
+---------------------------------------------+
|  Profile                                    |
|                                             |
|  BUSINESS INFO                              |
|  +---------------------------------------+  |
|  | Business Name                         |  |
|  | Mike's Home Repairs                   |  |
|  +---------------------------------------+  |
|  +---------------------------------------+  |
|  | Trade                                 |  |
|  | General                          [v]  |  |
|  +---------------------------------------+  |
|                                             |
|  SUBSCRIPTION                               |
|  +---------------------------------------+  |
|  | Free Plan                             |  |
|  | 7 of 10 active jobs                   |  |
|  |                   [Upgrade to Pro ->]  |  |
|  +---------------------------------------+  |
|                                             |
|  ACCOUNT                                    |
|  +---------------------------------------+  |
|  | mike@email.com                        |  |
|  +---------------------------------------+  |
|  +---------------------------------------+  |
|  | Sign Out                              |  |
|  +---------------------------------------+  |
|                                             |
|              [CAMERA FAB]                   |
|  [Jobs]                         [Profile]   |
+---------------------------------------------+
```

**Header:**
- "Profile" -- `--text-title` (24px), bold, `--color-text-primary`
- Left-aligned, padding `--space-8` (32px) horizontal

**Section labels:**
- `--text-overline` (11px), semibold, uppercase, `letter-spacing: 1px`, `--color-text-secondary`
- Padding: `--space-5` (20px) top, `--space-2` (8px) bottom, `--space-4` (16px) horizontal

**Setting rows:**
- Background: `--color-bg-card`
- Border: 1px solid `--color-border` (top and bottom, creating grouped list appearance)
- First row in group: `border-top-left-radius: --radius-lg`, `border-top-right-radius: --radius-lg`
- Last row in group: `border-bottom-left-radius: --radius-lg`, `border-bottom-right-radius: --radius-lg`
- Height: 52px (expandable for multi-line content)
- Padding: `--space-4` (16px) horizontal
- Layout: Column (label above, value below) or Row (label left, value right)

**Business Name row:**
- Label: "Business Name" -- `--text-caption` (12px), `--color-text-secondary`
- Value: `--text-body-lg` (17px), `--color-text-primary`. If empty, placeholder: "Add business name" in `--color-text-tertiary`
- Tapping opens edit mode: inline text input replaces the value. "Done" button appears in header.
- This name appears on comparison image watermarks.

**Trade picker row:**
- Label: "Trade" -- `--text-caption` (12px), `--color-text-secondary`
- Value: Current trade, `--text-body-lg` (17px), `--color-text-primary`
- Right: Chevron down, 16px, `--color-text-tertiary`
- Tapping opens a native picker (ActionSheet on iOS) with options: General, Plumbing, Electrical, HVAC, Roofing, Painting, Other. Cancel at bottom.

**Subscription section:**
- Shows current plan name: "Free Plan" or "Pro Plan" -- `--text-body-lg` (17px), semibold, `--color-text-primary`
- For free tier: "7 of 10 active jobs" -- `--text-body` (15px), `--color-text-secondary`
- "Upgrade to Pro" link: `--text-body` (15px), `--color-accent`, with right arrow icon. Tapping opens Upgrade Prompt (Section 4.8).
- For Pro: "Active subscription" + "Renews Feb 28" -- `--text-body` (15px), `--color-text-secondary`. No upgrade link. "Manage Subscription" link in `--color-text-secondary` (opens Stripe customer portal or Apple subscription settings).

**Account section:**
- Email: `--text-body` (15px), `--color-text-primary`. Read-only.
- "Sign Out" row: text in `--color-status-error`, left-aligned. Tapping shows confirmation alert: "Sign out of SiteSnap?" with "Sign Out" (red) and "Cancel" buttons.

---

### 4.8 Upgrade Prompt

**Purpose:** Convert free-tier users who hit the 10 active job limit. This is the paywall. It must be clear, honest, and not annoying. One value prop, one price, one button.

**Trigger:** Appears when a free-tier user with 10 active jobs taps "+ New Job." Also accessible from Profile.

**Presentation:** Full-screen modal (slides up from bottom).

**Layout:**
```
+---------------------------------------------+
|                                       [X]   |
|                                             |
|                                             |
|              [unlock icon]                  |
|                                             |
|         You've hit the limit.               |
|                                             |
|         10 of 10 active jobs used.          |
|         Upgrade to keep creating jobs.      |
|                                             |
|                                             |
|   +---------------------------------------+ |
|   |  Unlimited active jobs                | |
|   |  Unlimited photos per job             | |
|   |  Before/after comparisons             | |
|   |  Search across all jobs               | |
|   +---------------------------------------+ |
|                                             |
|                                             |
|         $4.99/month                         |
|                                             |
|   +---------------------------------------+ |
|   |         Subscribe                     | |
|   +---------------------------------------+ |
|                                             |
|           Maybe Later                       |
|                                             |
|   Tip: Archive finished jobs to free up     |
|   slots without upgrading.                  |
|                                             |
+---------------------------------------------+
```

**Spec:**
- Background: `--color-bg-primary`
- Close button (X): top-right, 24px, `--color-text-secondary`, touch target 48x48px
- Icon: `Unlock` from Lucide, 48px, `--color-accent`
- Headline: "You've hit the limit." -- `--text-title` (24px), bold, `--color-text-primary`, center-aligned. 24px below icon.
- Sub-headline: "10 of 10 active jobs used." -- `--text-body-lg` (17px), `--color-text-secondary`, center-aligned. 8px below headline.
- Body: "Upgrade to keep creating jobs." -- `--text-body` (15px), `--color-text-secondary`, center-aligned. 4px below sub-headline.

**Value prop list:**
- Background: `--color-bg-card`
- Border: 1px solid `--color-border`
- Border-radius: `--radius-lg` (12px)
- Padding: `--space-4` (16px)
- Margin: `--space-6` (24px) top, `--space-8` (32px) horizontal
- Each item: checkmark icon (`Check` from Lucide, 18px, `--color-status-success`) + text (`--text-body` 15px, `--color-text-primary`), gap `--space-2` (8px), row height 36px
- Items: "Unlimited active jobs", "Unlimited photos per job", "Before/after comparisons", "Search across all jobs"
- Note: Search and comparisons are NOT gated -- they work on free tier too. But listing them reinforces value.

**Price:**
- "$4.99/month" -- `--text-heading` (20px), semibold, `--color-text-primary`, center-aligned. `--space-6` (24px) below value prop card.
- Note: $4.99 is the Apple IAP price point (Apple rounds $5.00 to $4.99 in many regions).

**Subscribe button:**
- Full width (minus 32px margins)
- Height: 56px (larger than standard -- this is the primary conversion CTA)
- Background: `--color-accent`
- Text: "Subscribe", `--text-body-lg` (17px), bold, white
- Border-radius: `--radius-md` (8px)
- Margin-top: `--space-5` (20px)
- Press: `--color-accent-hover`, scale(0.98)
- Loading state: white spinner, button disabled, while Apple IAP sheet processes
- On success: "You're all set! Unlimited jobs unlocked." toast (see Section 6), modal auto-dismisses after 1.5s, returns to Job Creation flow.

**"Maybe Later" link:**
- `--text-body` (15px), `--color-text-secondary`, center-aligned
- 16px below Subscribe button
- Tap: dismisses modal, returns to previous screen

**Tip text:**
- "Tip: Archive finished jobs to free up slots without upgrading." -- `--text-caption` (12px), `--color-text-tertiary`, center-aligned, max-width 260px
- 24px below "Maybe Later"
- This is intentionally helpful, not pushy. We want the user to either upgrade OR use the free tier effectively. Both outcomes are good.

**Apple IAP flow:**
- Tapping "Subscribe" triggers Apple's native In-App Purchase sheet (via RevenueCat or expo-iap / StoreKit). The native sheet overlays the app.
- On successful purchase: the app receives a receipt, sends it to the backend for verification, backend updates user plan to "pro."
- On cancellation/failure: Apple's native sheet handles error display. The upgrade prompt remains visible.

---

### 4.9 Auth Screens (Clerk)

**Purpose:** Get the user signed up and into the app in under 2 minutes. No onboarding, no tutorial, no feature tour.

**Sign Up layout:**
```
+---------------------------------------------+
|  <-                                         |
|                                             |
|           Create your account               |
|                                             |
|  +---------------------------------------+  |
|  |  Email                                |  |
|  +---------------------------------------+  |
|                                             |
|  +---------------------------------------+  |
|  |  Password                             |  |
|  +---------------------------------------+  |
|                                             |
|  +---------------------------------------+  |
|  |         Continue                      |  |
|  +---------------------------------------+  |
|                                             |
|  ------------ or -------------------------  |
|                                             |
|  +---------------------------------------+  |
|  |  G  Continue with Google              |  |
|  +---------------------------------------+  |
|                                             |
|       Already have an account? Sign in      |
+---------------------------------------------+
```

**Spec:**
- Background: `--color-bg-primary`
- Back arrow: 24px, `--color-text-secondary`, touch target 48x48px
- Heading: `--text-heading` (20px), semibold, `--color-text-primary`, center-aligned
- Input fields: 52px height, `--color-bg-input`, border 1px `--color-border`, `--radius-md`. Label above (when focused, floats). Text: `--text-body-lg` (17px). Same focus/error states as Job Creation inputs.
- "Continue" button: Same as "Create Job" button spec (full width, 52px, accent, etc.)
- Social button: 52px height, `--color-bg-card`, border 1px `--color-border`, `--radius-md`. Google "G" logo 20px, text "Continue with Google" in `--text-body` (15px), medium, `--color-text-primary`.
- Divider: horizontal line `--color-border` with "or" text centered in `--text-caption` (12px), `--color-text-tertiary`
- "Already have an account? Sign in" -- `--text-body` (15px), "Sign in" in `--color-accent`

**Sign In** uses the same layout with "Welcome back" heading.

**Post-auth:** Immediately navigate to Home screen. If first-time user, show empty state. No intermediate screens.

**Loading state during auth:** "Continue" button shows spinner. Social button shows spinner replacing the icon. Both disabled during processing.

**"Setting up your account..." interstitial:**
- After auth succeeds, if backend user creation is needed: full-screen centered spinner (32px, `--color-accent`) + "Setting up your account..." text, `--text-body` (15px), `--color-text-secondary`
- Maximum 3 seconds. If backend creation fails after retries: error message "Couldn't set up your account. Check your connection and try again." with "Retry" button.

---

## 5. Component Specifications

### 5.1 TypeBadge Component

Used on photo thumbnails, in the full-screen viewer, and in search results.

**Props:** `type` (before | after | progress | issue | material | measurement | unclassified | pending)

**Spec:**
- Layout: inline-flex, align-center
- Height: auto (sized by content)
- Padding: 3px 6px
- Border-radius: `--radius-sm` (6px)
- Background: type-specific background color (Section 2.1 table)
- Text: type name, `--text-overline` (11px), semibold, uppercase, type-specific text color
- Abbreviated labels: "BEFORE", "AFTER", "PROG.", "ISSUE", "MATER.", "MEAS.", "UNCLASS.", "PENDING"

### 5.2 TypeFilterChips Component

Horizontal scrollable row of filter chips used in Job Detail and Search.

**Props:** `types` (array of { type, count }), `activeTypes` (array of active type strings), `onToggle` (callback)

**Spec:**
- Container: horizontal ScrollView, showsHorizontalScrollIndicator: false
- Content padding: `--space-4` (16px) horizontal
- Gap between chips: `--space-2` (8px)
- Each chip per Section 4.4 filter chip spec
- Accessible: each chip has `accessibilityRole: "button"`, `accessibilityState: { selected }`, `accessibilityLabel: "[Type] filter, [count] photos"`

### 5.3 CameraFAB Component

Global floating camera button. Spec detailed in Section 4.3.1.

**Props:** `uploadQueueCount` (number), `onPress` (callback)

**Accessible:** `accessibilityRole: "button"`, `accessibilityLabel: "Take photo"`. When queue has items: `accessibilityLabel: "Take photo, [count] photos uploading"`

### 5.4 JobCard Component

List item for the Home screen.

**Props:** `job` (Job object), `isActive` (boolean), `onPress`, `onArchive`

**Spec:** Per Section 4.1 job card definition.

**Accessible:** `accessibilityRole: "button"`, `accessibilityLabel: "[Job name], [photo count] photos, [last activity]"`. If active: append ", active job" to label.

### 5.5 PhotoThumbnail Component

Grid item for photo timelines and search results.

**Props:** `photo` (Photo object), `size` (number, in pixels), `onPress`, `onLongPressBadge`

**Spec:** Per Section 4.4 photo thumbnail definition. Uses expo-image with `cachePolicy: "disk"`, `contentFit: "cover"`, `transition: 200`.

**Accessible:** `accessibilityRole: "image"`, `accessibilityLabel: "[Type] photo, [date]"`. If scene description available: append ", [scene]".

### 5.6 UpgradeSheet Component

The full-screen upgrade prompt.

**Props:** `activeJobCount` (number), `jobLimit` (number), `onSubscribe`, `onDismiss`

**Spec:** Per Section 4.8.

### 5.7 JobSelector Component

Bottom sheet for choosing which job to assign photos to.

**Props:** `jobs` (array of Job objects), `onSelect` (callback with jobId), `onCreateNew` (callback)

**Spec:** Per Section 4.3.2 "No active job" flow.

### 5.8 ComparisonPreview Component

Displays the generated comparison image with share/save actions.

**Props:** `imageUri` (string), `isLoading` (boolean), `error` (string | null), `onShare`, `onSave`, `onRetry`

**Spec:** Per Section 4.5.2.

---

## 6. Shared Patterns

### 6.1 Toast Notifications

Brief feedback messages for successful actions.

**Spec:**
- Position: Top of screen, below safe area, centered horizontally
- Width: auto (sized to content), max 80% of screen width
- Height: 44px
- Background: `--color-bg-elevated`
- Border: 1px solid `--color-border-strong`
- Border-radius: `--radius-lg` (12px)
- Shadow: `--shadow-md`
- Text: `--text-body` (15px), `--color-text-primary`, center-aligned
- Icon (optional): 18px, left of text, 8px gap
- Padding: 0 `--space-4` (16px)
- Animation: slide down from top + fade in (200ms, ease-out). Auto-dismiss after 2.5 seconds (slide up + fade out, 200ms, ease-in).

**Toast types:**
- Success: `Check` icon in `--color-status-success`. Example: "Saved to camera roll", "Job archived", "You're all set! Unlimited jobs unlocked."
- Error: `AlertCircle` icon in `--color-status-error`. Example: "Couldn't save. Try again."
- Info: `Info` icon in `--color-accent`. Example: "Photo reclassified as Before."

### 6.2 Confirmation Alerts

Used for destructive actions (delete, archive).

**Use native Alert.alert() on iOS** for maximum platform feel. Not custom modals.

- Title: short imperative ("Delete this job?")
- Message: consequence description ("This will delete all photos in this job. This can't be undone.")
- Destructive button: "Delete" in red (destructive style)
- Cancel button: "Cancel" (cancel style, bold on iOS)

**Where used:**
- Archive job: "Archive this job?" / "You can find it in Archived Jobs." / "Archive" + "Cancel"
- Delete job: "Delete this job and all its photos?" / "This can't be undone." / "Delete" (red) + "Cancel"
- Delete photo: "Delete this photo?" / "This can't be undone." / "Delete" (red) + "Cancel"
- Sign out: "Sign out of SiteSnap?" / no message / "Sign Out" (red) + "Cancel"

### 6.3 Bottom Sheet Pattern

Used for Job Creation, Job Selector, Type Picker, and any future modal forms.

**Consistent spec:**
- Overlay: `rgba(0,0,0,0.5)`, tap to dismiss
- Background: `--color-bg-elevated`
- Border-radius: `--radius-xl` (16px) on top corners only
- Drag handle: 36px wide, 4px tall, `--color-border-strong`, centered, `--radius-full`, 8px above content
- Animation: slide up 300ms, ease-out (enter). Slide down 200ms, ease-in (exit). Overlay fades in/out 200ms.
- Swipe down to dismiss: velocity-based threshold (swipe fast enough = dismiss regardless of position; drag below 50% = dismiss, above 50% = snap back)
- Keyboard: bottom sheet adjusts height to avoid keyboard. Uses KeyboardAvoidingView or equivalent.

### 6.4 Skeleton Loading Pattern

Used for job list, photo grid, and search results while data loads.

**Spec:**
- Shape: matches the element it replaces (rectangular for cards, square for photos)
- Background: `--color-bg-card`
- Shimmer: animated linear gradient overlay sweeping left-to-right
  - Start: `rgba(255,255,255,0)` at 0%
  - Middle: `rgba(255,255,255,0.05)` at 50%
  - End: `rgba(255,255,255,0)` at 100%
  - Duration: 1.5s, infinite loop
  - Use `react-native-reanimated` for performant animation
- Corner radius: matches the element it replaces

### 6.5 Pull-to-Refresh Pattern

Used on Home screen, Job Detail, and Search results.

**Spec:**
- Indicator: native iOS RefreshControl, tint color `--color-accent`
- Trigger distance: system default (~80px pull)
- On trigger: refetch the relevant data query
- Release: content snaps back with spring animation

---

## 7. Accessibility

### 7.1 Screen Reader Support

- All screens use semantic heading hierarchy (accessibilityRole: "header" for screen titles and section headers)
- All interactive elements have descriptive `accessibilityLabel` values (specified per component)
- Decorative icons use `accessibilityElementsHidden: true` (or `importantForAccessibility: "no"`)
- Photo thumbnails include type and date in their labels. Scene descriptions from AI are included when available.
- Type badge colors are NEVER the only indicator of type. The text label always accompanies the color.
- Upload queue badge announces count changes via `accessibilityLiveRegion: "polite"`

### 7.2 Touch Targets

Every interactive element has a minimum touch target of 44x44px:
- Tab bar items: 72px wide, 48px+ tall
- Camera FAB: 72px diameter (8px invisible padding on 64px visual)
- Header icons: 48x48px touch targets on 24px visual icons
- Job cards: full-width, 60px+ tall
- Photo thumbnails: grid cells are ~110px+, well above minimum
- Filter chips: 32px height, but wrapped in a 44px touch target area (6px vertical padding)
- Buttons: minimum 48px tall on all interactive buttons (52-56px in practice)

### 7.3 Motion Sensitivity

- Shimmer animations: disabled when `prefers-reduced-motion` is active. Show static placeholder instead.
- Page transitions: respect system reduced-motion setting via react-native-reanimated's `reducedMotion` config
- Camera flash animation: skipped under reduced-motion
- Toast slide animations: replaced with instant fade (0ms slide, 200ms opacity) under reduced-motion

### 7.4 Color and Contrast

- All text meets WCAG AA contrast ratios (verified in Section 2.1)
- Photo type is identified by text label AND color (never color alone)
- Error states use icon + text + border color (never color alone)
- Active job indicator (green dot) is accompanied by being listed first and having the word "Active" in screen reader label

---

## 8. Animations and Transitions

### 8.1 Navigation Transitions

| Transition | Animation | Duration | Easing |
|-----------|-----------|----------|--------|
| Home -> Job Detail | Push right (iOS native) | 300ms | ease |
| Home -> Search | Push right | 300ms | ease |
| Job Detail -> Compare | Push right | 300ms | ease |
| Any -> Upgrade | Slide up (modal) | 300ms | ease-out |
| Bottom sheet open | Slide up | 300ms | ease-out |
| Bottom sheet close | Slide down | 200ms | ease-in |
| Full-screen photo open | Expand from thumbnail (shared element) | 250ms | ease-out |
| Full-screen photo close | Shrink to thumbnail or swipe-down spring | 200ms | ease-in |
| Toast appear | Slide down + fade in | 200ms | ease-out |
| Toast dismiss | Slide up + fade out | 200ms | ease-in |

### 8.2 Micro-interactions

| Element | Trigger | Animation | Duration |
|---------|---------|-----------|----------|
| Button press | touchStart | scale(0.97-0.98), bg change | 100ms |
| FAB press | touchStart | scale(0.93), shadow change | 100ms |
| Shutter press | touchStart | inner scale(0.9), flash overlay | 50ms press, 150ms flash |
| Photo upload complete | Thumbnail loads | Shimmer fade out, image fade in | 200ms |
| Classification complete | Type badge appears | Crossfade from "PENDING" to type | 150ms |
| Upload queue badge appear | Count goes from 0 to 1+ | Scale from 0 to 1 | 200ms, ease-out |
| Upload queue badge disappear | Count goes to 0 | Scale from 1 to 0 | 150ms, ease-in |
| Comparison selection | Photo tapped | Overlay fade in + number scale in | 150ms |
| Filter chip toggle | Chip tapped | Background color transition | 150ms |
| Swipe-to-archive | Swipe left | Reveal animation, spring back or complete | 200ms |
| Job card appear (new job) | Job created | Slide in from top + fade in | 250ms |

### 8.3 Reduced Motion

When `AccessibilityInfo.isReduceMotionEnabled` is true:
- All scale animations: removed (instant state change)
- Slide transitions: replaced with fade (200ms)
- Shimmer: disabled (static placeholder)
- Camera flash: disabled
- Shared element photo transition: replaced with fade
- Toast: instant appear/disappear (no slide)

---

## 9. Responsive Considerations

SiteSnap is mobile-only (Expo/React Native). There is no web or tablet-specific layout. However, the design accommodates different phone sizes.

### 9.1 Phone Size Adaptations

| Element | Small Phone (SE, < 375px width) | Standard (375-414px) | Large (> 414px) |
|---------|----------------------------------|----------------------|-----------------|
| Photo grid columns | 3 | 3 | 3 |
| Photo thumbnail size | ~105px | ~115px | ~125px |
| Job card padding | 12px | 16px | 16px |
| Header text | 17px (no change) | 17px | 17px |
| Camera bottom bar | 100px (tighter) | 120px | 120px |

### 9.2 Safe Area Handling

- Top safe area: respected on all screens via `SafeAreaView` or Expo Router layout
- Bottom safe area: respected in tab bar (84px includes inset), bottom sheets, and floating buttons
- Notch/Dynamic Island: content insets from top, no overlap with status bar

### 9.3 Landscape

- Not supported. Lock to portrait orientation in `app.json`:
  ```json
  { "expo": { "orientation": "portrait" } }
  ```
- Rationale: job site use is one-handed, portrait. Supporting landscape doubles the testing surface for minimal user benefit.

---

## 10. Dark Mode

SiteSnap is dark-mode only. There is no light mode toggle.

**Rationale:**
- Dark backgrounds reduce screen glare on bright job sites (better outdoor legibility)
- Dark chrome makes photos pop (the content, not the UI, should draw the eye)
- Matches the "professional tool" aesthetic (VoiceNote Pro also uses dark mode)
- One mode = half the design/testing surface area = ships faster

All tokens in Section 2.1 are designed for dark mode. If a light mode is added in v2, create a parallel token set and swap via a ThemeProvider context.

---

## 11. Key Design Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Blue-gray accent over construction orange | Orange competes with VoiceNote Pro's identity. Blue-gray reads as "precision instrument" and pairs better with the colorful type badges. It also avoids blending with real construction safety gear in photos. |
| 2 | Dark-mode only | Outdoor legibility, photo-centric UI, ships faster with one mode. Aligns with VoiceNote Pro precedent. |
| 3 | 3-column photo grid (not 2 or 4) | 3 columns is the sweet spot: thumbnails are large enough to identify content at a glance (~115px), but enough photos are visible to make the timeline feel scannable. 2 columns wastes space. 4 columns makes thumbnails too small for sunlight. |
| 4 | No camera preview step | Speed is paramount. After shutter press, the photo goes directly to the upload queue. No "use this photo?" confirmation. If the photo is bad, delete it from the timeline (easy). This keeps the camera path at "one tap open, one tap shoot" with no interruptions. |
| 5 | Type badges as colored pills on thumbnails | Type must be visible at the grid level (not only in detail view). Colored pills on the corner of each thumbnail provide at-a-glance classification without obscuring the photo content. |
| 6 | Comparison as a server-generated image | Client-side composition would require heavy image processing on the phone. Server-side Sharp generates a consistent, high-quality 1080x1080 result every time, cached in R2 for re-sharing without regeneration. The 1-3 second wait is acceptable for a "create marketing content" flow. |
| 7 | Apple IAP for payments (not external purchase link) | CEO decision. Apple IAP is the default purchase mechanism for iOS apps. Avoids App Store rejection risk and provides native purchase UI. Net revenue at $4.99 after Apple's 30% cut: ~$3.49 in year 1 (15% in year 2+). |
| 8 | Gemini 3.0 Flash Preview for AI classification | CEO decision. Uses the newer model for improved classification accuracy. Model name configured via GEMINI_MODEL_NAME env var for easy updates. |
| 9 | Product-specific R2 bucket (sitesnap-photos) | CEO decision. Simpler isolation between products. Each camera product gets its own bucket. Can consolidate later if needed. |
| 10 | Portrait lock, no landscape | One-handed job site use. Portrait lock halves the testing surface. No user scenario justifies landscape for a photo organization tool on a phone. |
| 11 | Tab bar with 2 tabs + FAB (not 3+ tabs) | Minimal navigation = less cognitive load. Home and Profile are the only persistent destinations. Search is contextual (accessed from header). The camera FAB is the only action that needs to be globally accessible. |
| 12 | "Maybe Later" + archive tip on upgrade prompt | Not pushy. Gives the user a genuine free alternative (archiving). Builds trust. Contractors who feel pressured churn; contractors who feel respected upgrade when ready. |

---

## 12. Screen Flow Summary

```
[Launch]
  |
  v
[Signed in?] --no--> [Auth: Sign Up / Sign In]
  |                          |
  |                          v (on success)
  v (yes)                    |
[Home Screen] <--------------+
  |
  +-- [+ New Job] --> (at limit?) --yes--> [Upgrade Prompt]
  |                       |
  |                       no
  |                       v
  |                  [Job Creation Modal]
  |                       |
  |                       v (success)
  |                  [Home Screen, new job at top]
  |
  +-- [Tap job card] --> [Job Detail / Photo Timeline]
  |                          |
  |                          +-- [Tap photo] --> [Full-Screen Viewer]
  |                          |                      |
  |                          |                      +-- [Share] --> Native Share Sheet
  |                          |                      +-- [Long press badge] --> Type Picker
  |                          |
  |                          +-- [Compare] --> [Selection Mode]
  |                          |                      |
  |                          |                      +-- [Generate] --> [Comparison Preview]
  |                          |                                            |
  |                          |                                            +-- [Share] --> Native Share Sheet
  |                          |                                            +-- [Save] --> Camera Roll
  |                          |
  |                          +-- [Overflow: Edit] --> Edit Job Modal
  |                          +-- [Overflow: Archive] --> Confirm Alert
  |                          +-- [Overflow: Delete] --> Confirm Alert
  |
  +-- [Search icon] --> [Search Screen]
  |                          |
  |                          +-- [Tap result] --> [Full-Screen Viewer in job context]
  |
  +-- [Camera FAB] --> (active job?) --no--> [Job Selector Bottom Sheet]
  |                       |                      |
  |                       yes                    +-- [Select job or create new]
  |                       v                      |
  |                  [Camera View]  <------------+
  |                       |
  |                       v (capture)
  |                  [Photo compressed + queued for upload]
  |                  [Camera stays open for next shot]
  |
  +-- [Profile tab] --> [Profile / Settings]
                            |
                            +-- [Upgrade to Pro] --> [Upgrade Prompt]
                            +-- [Sign Out] --> [Auth screens]
```

---

*Design spec written by Robert (Product Designer) for Sherlock Labs. February 2026. Incorporates CEO decisions: Apple IAP payments, sitesnap-photos R2 bucket, Gemini 3.0 Flash Preview.*
