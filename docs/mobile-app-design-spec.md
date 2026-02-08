# TeamHQ Mobile App — Design Specification

**Author:** Robert (Product Designer)
**Date:** 2026-02-07
**Status:** Final
**Upstream:** `docs/mobile-app-requirements.md` (Thomas), `docs/mobile-app-tech-approach.md` (Andrei), `docs/mobile-app-voice-prompt-design.md` (Kai), `skills/development/mobile-component-patterns.md`, `skills/development/mobile-animations.md`
**Unblocks:** Zara (voice flow, project screens), Leo (shared components, team, settings, animations)

---

## 1. Design Foundations

### 1.1 Design Principles

1. **Voice-forward** — The mic FAB is the gravitational center of the app. Everything else supports the voice-to-project loop.
2. **Glanceable** — Status visible at a glance via color, badges, and typography hierarchy. No hunting.
3. **Dark and focused** — Dark zinc backgrounds reduce visual noise. Content stands out; chrome fades away.
4. **Platform-native** — Respect iOS and Android conventions. No forcing one platform's patterns onto the other.
5. **Minimal** — Every element earns its space. If it doesn't help the CEO command or monitor, it doesn't belong in Phase 1.

### 1.2 Color System

All colors map to the tokens defined in `lib/tokens.ts` (from `skills/development/mobile-component-patterns.md`), which mirror the web `tokens.css` values.

#### Backgrounds

| Token | Hex | Usage |
|-------|-----|-------|
| `bgPrimary` | `#09090b` | Screen backgrounds, root surfaces |
| `bgCard` | `#18181b` | Cards, list items, input backgrounds |
| `bgCardHover` | `#27272a` | Pressed state on cards, secondary surfaces |

#### Text

| Token | Hex | Usage |
|-------|-----|-------|
| `textPrimary` | `#fafafa` | Headings, project names, primary content |
| `textSecondary` | `#a1a1aa` | Descriptions, timestamps, secondary labels |
| `textMuted` | `#71717a` | Placeholders, disabled text, inactive tab labels |

#### Accent

| Token | Hex | Usage |
|-------|-----|-------|
| `accent` | `#818cf8` | Active tab indicator, links, secondary buttons, informational badges |
| `accentHover` | `#6366f1` | Primary buttons (background), active states, Mic FAB background |

#### Borders

| Token | Hex | Usage |
|-------|-----|-------|
| `border` | `#27272a` | Card borders, dividers, input borders |
| `borderHover` | `#3f3f46` | Focused input borders, hover-state borders |

#### Status Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `statusPlanned` | `#818cf8` (indigo-400) | "Planned" status badge |
| `statusInProgress` | `#facc15` (yellow-400) | "In Progress" status badge |
| `statusCompleted` | `#4ade80` (green-400) | "Completed" status badge |
| `statusRunning` | `#4ade80` (green-400) | Active session indicator |
| `statusFailed` | `#f87171` (red-400) | Failed session, error states |
| `statusTimedOut` | `#fbbf24` (amber-400) | Timed-out session badge |

#### Voice Overlay Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `voiceOverlayBg` | `#09090b` at 98% opacity | Modal backdrop |
| `waveformActive` | `#818cf8` (indigo-400) | Waveform bars while recording |
| `waveformIdle` | `#3f3f46` (zinc-700) | Waveform bars when idle |
| `transcriptText` | `#fafafa` | Live transcript text |
| `transcriptCursor` | `#818cf8` | Blinking cursor at end of live transcript |

### 1.3 Typography

Font: **Inter** — loaded via `expo-font`. Matches the web app.

| Style | Font | Size (px) | Weight | Token | Usage |
|-------|------|-----------|--------|-------|-------|
| Screen Title | Inter-SemiBold | 24 | 600 | `text2xl` | Screen headers ("Projects", "Team", "Settings") |
| Section Header | Inter-SemiBold | 20 | 600 | `textXl` | Section headings within a screen |
| Card Title | Inter-Medium | 16 | 500 | `textBase` | Project name, agent name |
| Body | Inter-Regular | 14 | 400 | `textSm` | Descriptions, notes, body text |
| Caption | Inter-Regular | 12 | 400 | `textXs` | Timestamps, metadata, badge labels |
| Button Label | Inter-Medium | 14 | 500 | `textSm` | Button text |
| Tab Label | Inter-Medium | 10 | 500 | — (custom) | Bottom tab bar labels |
| Transcript Live | Inter-Regular | 18 | 400 | `textLg` | Live transcription text in voice overlay |
| Transcript Review | Inter-Regular | 16 | 400 | `textBase` | Editable transcript in review state |

**Line heights:**
- Headings: 1.2 (`leadingTight`)
- Body: 1.5 (`leadingNormal`)
- Transcript: 1.625 (`leadingRelaxed`) — more breathing room for readability

### 1.4 Spacing System

Derived from `tokens.ts`. All values in logical pixels.

| Token | Value | Common Usage |
|-------|-------|--------------|
| `space1` | 4 | Tight internal padding (badge padding-vertical) |
| `space2` | 8 | Small gaps (between badge icon and label, between stacked captions) |
| `space3` | 12 | Button padding vertical, small component margins |
| `space4` | 16 | Screen horizontal padding, card internal padding, standard spacing |
| `space5` | 20 | Section gaps within a card |
| `space6` | 24 | Card padding, section margins |
| `space8` | 32 | Between major sections |
| `space10` | 40 | Large section separations |
| `space12` | 48 | Screen top/bottom padding |

**Screen padding:** `space4` (16px) horizontal on all screens. Consistent gutter.

### 1.5 Border Radii

| Token | Value | Usage |
|-------|-------|-------|
| `radiusSm` | 6 | Badges, small pills |
| `radiusMd` | 8 | Buttons, inputs |
| `radiusLg` | 12 | Cards, list items |
| `radiusXl` | 16 | Voice overlay modal, bottom sheets |
| `radiusFull` | 9999 | Mic FAB, avatar circles, round badges |

### 1.6 Shadows

Only used on elevated surfaces (FAB, modals). Cards use border-only separation, not shadows — consistent with the web app's flat dark theme.

| Element | iOS Shadow | Android Elevation |
|---------|-----------|-------------------|
| Mic FAB | `shadowColor: #000, shadowOffset: {0, 4}, shadowOpacity: 0.3, shadowRadius: 12` | `elevation: 8` |
| Voice Modal | `shadowColor: #000, shadowOffset: {0, -4}, shadowOpacity: 0.25, shadowRadius: 16` | `elevation: 16` |
| Cards | No shadow — use `borderWidth: 1, borderColor: tokens.border` | No elevation |

### 1.7 Iconography

Use `@expo/vector-icons` with the **Ionicons** set as the primary icon family. They are visually clean, have consistent weights, and cover all our needs.

| Context | Icon | Name |
|---------|------|------|
| Projects Tab | House | `home-outline` / `home` |
| Team Tab | People | `people-outline` / `people` |
| Settings Tab | Gear | `settings-outline` / `settings` |
| Mic FAB | Microphone | `mic` |
| Stop Recording | Stop circle | `stop-circle` |
| Back | Chevron left | `chevron-back` |
| Edit | Pencil | `create-outline` |
| Add Note | Plus circle | `add-circle-outline` |
| Session Running | Radio button on | `radio-button-on` (for pulsing dot) |
| Error | Alert circle | `alert-circle-outline` |
| Connection OK | Checkmark circle | `checkmark-circle` |
| Connection Failed | Close circle | `close-circle` |
| Refresh | Refresh | `refresh` |
| Filter | Funnel | `funnel-outline` |

Active tab icons use the filled variant; inactive use outline. Size: 24px for tab icons, 20px for inline icons.

---

## 2. Screen Specifications

### 2.1 Project List (Home Tab)

The home screen. Shows all projects and provides the primary voice creation entry point.

#### Layout Structure

```
┌──────────────────────────────────┐
│ ▸ Safe Area Top                  │
│                                  │
│  Projects              [filter]  │  ← Screen title + filter icon
│                                  │
│  ┌─ Filter Chips ──────────────┐ │
│  │ (All) Planned  In Progress  │ │  ← Horizontally scrollable
│  │ Completed                   │ │
│  └─────────────────────────────┘ │
│                                  │
│  ┌─ Project Card ──────────────┐ │
│  │ Project Name                │ │
│  │ [In Progress]    2h ago     │ │  ← Status badge + timestamp
│  │                             │ │
│  │ Brief excerpt text that     │ │
│  │ truncates after 2 lines...  │ │
│  └─────────────────────────────┘ │
│                                  │
│  ┌─ Project Card ──────────────┐ │
│  │ ...                         │ │
│  └─────────────────────────────┘ │
│                                  │
│  ┌─ Project Card ──────────────┐ │
│  │ ...                         │ │
│  └─────────────────────────────┘ │
│                                  │
│                          ┌─────┐ │
│                          │ 🎤  │ │  ← Mic FAB
│                          └─────┘ │
│ ┌──────────────────────────────┐ │
│ │  🏠 Projects  👥 Team  ⚙ Set │ │  ← Tab Bar
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

#### Screen Title

- Text: "Projects"
- Style: `text2xl` (24px), Inter-SemiBold, `textPrimary`
- Position: Top-left, below safe area, with `space4` horizontal padding
- No header bar/chrome — just the title text directly on the background. Keeps it minimal.

#### Status Filter

- Component: Horizontal `ScrollView` of chip buttons, not wrapping
- Chips: "All", "Planned", "In Progress", "Completed"
- Default selection: "All"
- Active chip: `accentHover` (#6366f1) background, `textPrimary` text
- Inactive chip: `bgCardHover` (#27272a) background, `textSecondary` text
- Chip shape: `radiusFull` (pill), padding `space1` vertical, `space3` horizontal
- Font: Inter-Medium, `textXs` (12px)
- Spacing: `space2` (8px) gap between chips
- Position: Below screen title, `space4` (16px) margin top
- Haptic: Light impact on chip selection

#### Project Card

- Background: `bgCard` (#18181b)
- Border: 1px `border` (#27272a)
- Border radius: `radiusLg` (12px)
- Padding: `space4` (16px)
- Margin between cards: `space3` (12px)
- Pressed state: Background transitions to `bgCardHover` (#27272a), scale to 0.98 with `springs.snappy`

**Card content (top to bottom):**

1. **Project Name** — Inter-Medium, `textBase` (16px), `textPrimary`. Single line, truncate with ellipsis.
2. **Row: Status Badge + Timestamp** — Flexbox row, space-between, margin-top `space2` (8px)
   - Status badge (see component spec below)
   - Timestamp: Inter-Regular, `textXs` (12px), `textMuted`. Relative format: "2h ago", "Yesterday", "Jan 15"
3. **Brief Excerpt** — Inter-Regular, `textSm` (14px), `textSecondary`, margin-top `space3` (12px). Max 2 lines, truncate with ellipsis. If no brief, omit this element entirely (don't show empty space).

**Active session indicator:** If the project has an active session, show a small pulsing green dot (6px diameter, `statusRunning` color) to the left of the project name. The dot pulses with `withRepeat(withSequence(withTiming(0.4, {duration: 1000}), withTiming(1, {duration: 1000})))` opacity animation.

#### Pull-to-Refresh

- Use `RefreshControl` on the `FlatList`
- Tint color: `accent` (#818cf8)
- Background: `bgPrimary`
- Haptic: Medium impact on pull threshold
- Triggers `queryClient.invalidateQueries(["projects"])`

#### Empty State

Shown when the API returns zero projects.

- Centered vertically in the scroll area (not the full screen — account for header and tab bar)
- Icon: `folder-open-outline` (Ionicons), 48px, `textMuted` color
- Title: "No projects yet" — Inter-Medium, `textLg` (18px), `textPrimary`
- Subtitle: "Tap the microphone to create your first project" — Inter-Regular, `textSm` (14px), `textSecondary`, max-width 240px, centered
- Gap between icon and title: `space4`
- Gap between title and subtitle: `space2`

#### Loading State

- Show skeleton cards (3 placeholder cards) while data loads
- Skeleton card: Same dimensions as a real project card, with animated gradient shimmer
- Shimmer: `bgCard` to `bgCardHover` to `bgCard`, horizontal sweep, 1.5s duration, `withRepeat`
- Three skeleton cards, vertically stacked with same `space3` gap as real cards

#### Error State

- Centered vertically, same as empty state layout
- Icon: `cloud-offline-outline` (Ionicons), 48px, `statusFailed` color
- Title: "Couldn't load projects" — Inter-Medium, `textLg`, `textPrimary`
- Subtitle: Error message from the API (or "Check your connection and try again" if network error) — Inter-Regular, `textSm`, `textSecondary`
- Retry button: Secondary style (outlined), "Try Again" label, margin-top `space6`

#### Accessibility

- Screen title: `accessibilityRole="header"`
- Filter chips: `accessibilityRole="button"`, `accessibilityState={{ selected: isActive }}`
- Project cards: `accessibilityRole="button"`, `accessibilityLabel` includes project name, status, and timestamp (e.g., "Mobile App, In Progress, updated 2 hours ago")
- Mic FAB: `accessibilityLabel="Create project with voice"`, `accessibilityHint="Double tap to start recording a voice project brief"`
- Pull-to-refresh: `accessibilityLabel="Pull to refresh projects"`
- Empty state: Content is accessible via screen reader in reading order

---

### 2.2 Project Detail

Accessed by tapping a project card. Shows full project information, notes, and sessions.

#### Layout Structure

```
┌──────────────────────────────────┐
│ ▸ Safe Area Top                  │
│                                  │
│  ← Back        [Edit]           │  ← Navigation header
│                                  │
│  Project Name Here               │  ← Title
│  [In Progress]                   │  ← Status badge
│                                  │
│  ─── Description ──────────────  │
│  Project description text that   │
│  can be multiple lines long...   │
│                                  │
│  ─── Brief ────────────────────  │
│  The full project brief from     │
│  the voice transcript or manual  │
│  entry...                        │
│                                  │
│  ─── Goals ────────────────────  │
│  - Goal one                      │
│  - Goal two                      │
│                                  │
│  ─── Constraints ──────────────  │
│  - Constraint one                │
│                                  │
│  ─── Notes (3) ──────── [+] ──  │  ← Add note button
│  ┌─ Note Card ─────────────────┐ │
│  │ Note text here...           │ │
│  │ 2h ago                      │ │
│  └─────────────────────────────┘ │
│                                  │
│  ─── Sessions (2) ─────────────  │
│  ┌─ Session Card ──────────────┐ │
│  │ ● Running      12m elapsed  │ │  ← Green pulsing dot
│  └─────────────────────────────┘ │
│  ┌─ Session Card ──────────────┐ │
│  │ ✓ Completed    45m          │ │
│  └─────────────────────────────┘ │
│                                  │
│  [ ▶ Start New Session ]         │  ← Full-width button
│                                  │
│ ▸ Safe Area Bottom               │
└──────────────────────────────────┘
```

#### Navigation Header

- Back button: Chevron-back icon (24px) + "Projects" text, `accent` color, left-aligned
- Edit button: `create-outline` icon (20px), `accent` color, right-aligned
- Row is flush with screen horizontal padding (`space4`)
- Height: 44px (minimum tap target)
- iOS: Back button uses system back gesture (swipe from left edge). The chevron is just visual confirmation.
- Android: Back button tappable. System back button also works.

#### Project Header

- Project name: Inter-SemiBold, `text2xl` (24px), `textPrimary`, margin-top `space4`
- Status badge: Below project name, margin-top `space2`
- If an active session exists, show the pulsing green dot inline with the status badge

#### Content Sections

Each section follows this pattern:

- Section label: Inter-SemiBold, `textSm` (14px), `textMuted`, uppercase, letter-spacing 0.5px
- Divider: 1px line, `border` color, full width, margin-bottom `space3`
- Content: Inter-Regular, `textSm` (14px), `textSecondary`, `leadingRelaxed`
- Section spacing: `space6` (24px) between sections

**Description** — Full project description. Rendered as plain text.

**Brief** — Full project brief (the original voice transcript or manual entry). Rendered as plain text. Can be long — no truncation.

**Goals** — Rendered as a bulleted list if present. Each goal on its own line with a bullet character. If empty, section is hidden entirely.

**Constraints** — Same rendering as goals. Hidden if empty.

#### Notes Section

- Section label includes count: "Notes (3)"
- Add note button: `add-circle-outline` icon (20px), `accent` color, positioned at the right end of the section label row
- Tapping add note opens a bottom sheet with a `TextInput` and "Add Note" button

**Note card:**
- Background: `bgCard`
- Border: 1px `border`
- Border radius: `radiusMd` (8px)
- Padding: `space3` (12px)
- Note text: Inter-Regular, `textSm`, `textSecondary`
- Timestamp: Inter-Regular, `textXs`, `textMuted`, margin-top `space2`
- Cards separated by `space2` (8px)
- Most recent note at top

**Add Note Bottom Sheet:**
- Background: `bgCard`
- Border-top-radius: `radiusXl` (16px)
- Handle bar: 36px wide, 4px tall, `bgCardHover`, centered, `radiusFull`, margin-top `space2`
- TextInput: Multi-line, min-height 80px, `bgPrimary` background, 1px `border` border, `radiusMd`, padding `space3`, `textPrimary` text, placeholder "Add a note..." in `textMuted`
- "Add Note" primary button: Full width, below the input, margin-top `space3`
- Keyboard avoidance: Sheet adjusts with keyboard. Use `KeyboardAvoidingView`.
- Dismiss: Drag down or tap outside

#### Sessions Section

- Section label includes count: "Sessions (2)"
- Sessions listed in reverse chronological order (most recent first)

**Session card:**
- Background: `bgCard`
- Border: 1px `border`
- Border radius: `radiusMd` (8px)
- Padding: `space3` (12px)
- Row layout: Status indicator + status label on the left, duration on the right
- Status indicator: Small colored dot (8px) or icon
  - Running: Green pulsing dot (`statusRunning`), label "Running", Inter-Medium
  - Completed: Checkmark icon (`statusCompleted`), label "Completed"
  - Failed: X icon (`statusFailed`), label "Failed"
  - Timed Out: Clock icon (`statusTimedOut`), label "Timed Out"
- Duration: Inter-Regular, `textXs`, `textMuted` — "12m elapsed" for running, "45m" for completed
- Cards separated by `space2`

#### Start Session Button

- Position: Below sessions section, `space6` margin-top, full width
- Style: Primary button (see component spec)
- Label: "Start New Session"
- Icon: Play icon (`play-outline`), 16px, to the left of the label
- Tapping shows a confirmation dialog: "Start a new session on [Project Name]?" with "Cancel" and "Start" buttons
- After confirmation: calls `POST /api/projects/:id/sessions`, shows brief loading state on the button, then refreshes session list
- If a session is already running: Button label changes to "Session Running", button is disabled (opacity 0.5), pulsing green dot in the button

#### Edit Project

Tapping the edit button opens a full-screen modal (or pushed screen) with:

- Editable fields: Project name (TextInput), status (picker/segmented control), description (multi-line TextInput)
- "Save" primary button and "Cancel" text button in the header
- Form validation: Name is required (non-empty)
- On save: `PATCH /api/projects/:id` with the changed fields

#### Loading State

- Skeleton layout matching the populated screen structure
- Shimmer on: project name (one line), badge, description block (3 lines), brief block (4 lines)

#### Error State

- Same centered error pattern as Project List
- Retry button fetches the project again

#### Accessibility

- Back button: `accessibilityLabel="Go back to projects"`
- Edit button: `accessibilityLabel="Edit project"`
- Section labels: `accessibilityRole="header"`
- Active session dot: `accessibilityLabel="Session is currently running"`
- Notes add button: `accessibilityLabel="Add a note"`, `accessibilityHint="Opens a text input to add a note to this project"`
- Start session button: `accessibilityHint="Double tap to start a new AI team session"`
- Confirmation dialog: Focus traps within the dialog, `accessibilityRole="alert"`

---

### 2.3 Voice Recording Overlay (Modal)

This is the app's killer feature. The voice overlay is a full-screen modal triggered by the Mic FAB. It has four states: **Recording**, **Review**, **Creating**, and **Error**.

#### 2.3.1 Mic FAB (Idle State)

The entry point. Always visible on the Projects tab.

**Position:** Bottom-right corner, `space4` (16px) from right edge, `space4` (16px) above the tab bar.

**Size:** 56px diameter circle.

**Appearance:**
- Background: `accentHover` (#6366f1)
- Icon: `mic` (Ionicons), 24px, white (#ffffff)
- Shadow: iOS `shadowColor: #6366f1, shadowOffset: {0, 4}, shadowOpacity: 0.4, shadowRadius: 12`, Android `elevation: 8`
- The shadow uses the accent color for a subtle glow effect

**Idle animation:** Gentle breathing scale animation. `withRepeat(withSequence(withTiming(1.04, {duration: 2000}), withTiming(1, {duration: 2000})))`. Subtle — draws the eye without being distracting. Respect `useReducedMotion`: skip the breathing if enabled.

**Pressed state:** Scale to 0.9 with `springs.snappy`. On release, scale back to 1.

**Tap action:** Begins the voice recording flow. Opens the voice overlay modal.

#### 2.3.2 Recording State

Triggered when the user taps the Mic FAB. Full-screen modal overlays the current screen.

**Modal entry animation:**
- Backdrop: `bgPrimary` at 98% opacity, fades in over 200ms (`withTiming`)
- Content: Slides up from the FAB position with `springs.gentle`. The mic icon scales up and moves to center as the modal opens.
- If reduced motion: No slide, just opacity fade in 150ms

**Layout:**

```
┌──────────────────────────────────┐
│ ▸ Safe Area Top                  │
│                                  │
│            [Cancel]              │  ← Top-right, text button
│                                  │
│                                  │
│                                  │
│       ╭───────────────╮          │
│       │   Waveform    │          │
│       │  Visualizer   │          │
│       │  |||||||||||   │          │
│       ╰───────────────╯          │
│                                  │
│      0:12                        │  ← Duration counter, centered
│                                  │
│  "I want to build a landing      │  ← Live transcript
│   page for our new product.      │
│   It should have a hero..."▎     │  ← Blinking cursor
│                                  │
│                                  │
│                                  │
│          ┌────────┐              │
│          │  ■ ■   │              │  ← Stop button
│          │  Stop   │              │
│          └────────┘              │
│                                  │
│ ▸ Safe Area Bottom               │
└──────────────────────────────────┘
```

**Cancel button:**
- Position: Top-right, `space4` from right edge, `space2` below safe area
- Style: Text-only, "Cancel" in Inter-Medium, `textSm`, `accent` color
- Action: Stops recording, discards audio, dismisses modal with reverse animation
- Haptic: Light impact on tap

**Waveform Visualizer:**
- Position: Centered horizontally, upper-third of the modal
- Size: 280px wide, 80px tall
- Visualization: 40 vertical bars, each 4px wide, `space1` (4px) gap between bars
- Bar height: Driven by `audioLevel` (0-1) from `useVoiceRecording` hook, mapped to 4px min height, 80px max height
- Active color: `waveformActive` (#818cf8)
- Bars animate their height with `withSpring(targetHeight, springs.snappy)` per audio chunk (~480ms intervals)
- When idle/silence: Bars settle to minimum height (4px), color fades to `waveformIdle` (#3f3f46)
- Bars have `radiusFull` top cap (rounded tops)
- Reduced motion: Bars jump to target height without spring, still update per chunk

**Duration counter:**
- Position: Centered, `space4` below the waveform
- Format: "M:SS" (e.g., "0:12", "1:05")
- Style: Inter-Medium, `textLg` (18px), `textMuted`
- Updates every second

**Live transcript:**
- Position: Centered horizontally, below duration, `space8` margin-top
- Width: Full screen width minus `space6` (24px) padding on each side
- Style: Inter-Regular, `textLg` (18px), `transcriptText` (#fafafa), `leadingRelaxed` (1.625), centered text alignment
- Text appears word-by-word or phrase-by-phrase as partial transcripts arrive from the WebSocket
- New text fades in with `FadeIn.duration(150)` per word/phrase chunk
- Blinking cursor: `transcriptCursor` (#818cf8) vertical bar (2px wide, 20px tall), blinks with `withRepeat(withSequence(withTiming(0, {duration: 500}), withTiming(1, {duration: 500})))` opacity. Positioned at the end of the last word.
- Max visible lines: 6 lines. If transcript exceeds this, auto-scroll to show the most recent text. Older text scrolls up and fades.
- If no text yet (first few moments of recording): Show placeholder "Listening..." in `textMuted`, italic, pulsing opacity

**Stop button:**
- Position: Centered, bottom third of the modal
- Size: 64px diameter circle
- Background: `statusFailed` (#f87171) — red signals "stop"
- Icon: `stop` (Ionicons), 28px, white
- Label: "Stop" below the button, Inter-Medium, `textXs`, `textMuted`, `space2` margin-top
- Pressed state: Scale 0.9, opacity 0.85
- Haptic: Medium impact on tap

**Auto-stop behavior (silence detection):**
- After 2 seconds of continuous silence (audio level below 0.05 threshold), show a visual countdown
- Countdown visualization: A thin circular progress ring (2px stroke, `accent` color) around the stop button that completes over 3 seconds
- If speech resumes during countdown: Cancel the countdown, ring disappears with `FadeOut.duration(150)`
- If countdown completes: Auto-stop recording (same as tapping stop)
- Total: 2s silence detection + 3s visual countdown = 5s of silence before auto-stop
- The stop button is always tappable — auto-stop is a convenience, not a replacement

#### 2.3.3 Review State

Shown after recording stops (whether manually or via auto-stop). The transcription is complete and the CEO can review/edit before creating the project.

**Transition from Recording:**
- Waveform fades out with `FadeOutDown.duration(200)`
- Duration counter fades out
- Stop button fades out
- Transcript repositions to the top with `withSpring(targetY, springs.gentle)`
- Review UI elements fade in with `FadeInUp.delay(100).duration(200)`
- Total transition time: ~400ms

**Layout:**

```
┌──────────────────────────────────┐
│ ▸ Safe Area Top                  │
│                                  │
│  [Re-record]         [Cancel]    │  ← Action buttons
│                                  │
│  Project Name                    │  ← Label
│  ┌─────────────────────────────┐ │
│  │ Mobile Push Notifications   │ │  ← Auto-filled, editable
│  └─────────────────────────────┘ │
│                                  │
│  Transcript                      │  ← Label
│  ┌─────────────────────────────┐ │
│  │ Build a push notification   │ │  ← Full transcript, editable
│  │ system for the mobile app.  │ │
│  │ Push notifications when a   │ │
│  │ session finishes, and also  │ │
│  │ when it fails. Jonah should │ │
│  │ build the backend part.     │ │
│  └─────────────────────────────┘ │
│                                  │
│                                  │
│  ┌─────────────────────────────┐ │
│  │      Create & Go  ▶        │ │  ← Primary CTA
│  └─────────────────────────────┘ │
│                                  │
│  ┌─────────────────────────────┐ │
│  │      Save Draft             │ │  ← Secondary action
│  └─────────────────────────────┘ │
│                                  │
│ ▸ Safe Area Bottom               │
└──────────────────────────────────┘
```

**Top action buttons:**
- "Re-record" — left side, text button, `accent` color. Tapping discards current transcript and returns to Recording state.
- "Cancel" — right side, text button, `accent` color. Dismisses the entire modal.

**Project Name field:**
- Label: "Project Name" — Inter-Medium, `textSm`, `textMuted`, margin-bottom `space2`
- Input: Single-line `TextInput`
  - Background: `bgCard`
  - Border: 1px `border`, `radiusMd`
  - Padding: `space3` horizontal, `space3` vertical
  - Text: Inter-Medium, `textBase`, `textPrimary`
  - Placeholder: "Generating name..." while extraction is loading, in `textMuted`, italic
  - When extraction completes: Auto-fills with the extracted project name. Brief highlight animation — border flashes `accent` for 300ms then returns to `border`.
  - CEO can tap and edit the name at any time

**Transcript field:**
- Label: "Transcript" — Inter-Medium, `textSm`, `textMuted`, margin-bottom `space2`
- Input: Multi-line `TextInput`
  - Background: `bgCard`
  - Border: 1px `border`, `radiusMd`
  - Padding: `space3`
  - Text: Inter-Regular, `textBase`, `textPrimary`, `leadingRelaxed`
  - Min height: 120px
  - Max height: Screen height * 0.4 (scrollable within the input if longer)
  - Pre-filled with the final transcript from the recording
  - Fully editable — CEO can fix transcription errors

**Keyboard avoidance:** When the CEO taps into either field, the keyboard slides up and the content adjusts. Use `KeyboardAvoidingView` with `behavior="padding"` on iOS, `behavior="height"` on Android.

**Create & Go button:**
- Style: Primary button (full width)
- Label: "Create & Go" with a play icon (`play` 16px) on the right
- Action: Creates the project using the extracted/edited data, then immediately starts a session
- The button is enabled as soon as the transcript exists (extraction is optional — if it hasn't completed, use the transcript as-is with a heuristic name)

**Save Draft button:**
- Style: Secondary button (full width, outlined)
- Label: "Save Draft"
- Action: Creates the project without starting a session. Navigates to the Project Detail screen.
- Margin-top: `space3` below Create & Go

**Extraction loading state:**
- While `POST /api/voice/extract` is in-flight: Project Name field shows "Generating name..." placeholder
- A subtle loading indicator (small spinner, 16px, `accent` color) appears next to the "Project Name" label
- The transcript field is already populated and editable — the CEO is not blocked

**Extraction failure:**
- If extraction fails or times out: Project Name field shows placeholder "Enter a project name"
- No error message needed — the extraction is a convenience, not a requirement. The CEO can type a name manually.
- The transcript is always available regardless of extraction status

#### 2.3.4 Creating State

Brief transition state while the project and session are being created.

**Layout:**
- The "Create & Go" (or "Save Draft") button transitions to a loading state
- Button label replaced with a spinner (16px, white) and "Creating..." text
- Button is disabled during this state
- All other fields become non-editable (subtle opacity reduction to 0.7)
- If "Create & Go": After project + session creation succeeds, modal dismisses and navigates to the Project Detail screen showing the new session
- If "Save Draft": After project creation succeeds, modal dismisses and navigates to the Project Detail screen

**Animation on success:**
- Modal content fades out with `FadeOut.duration(200)`
- Brief moment (200ms) of blank modal
- Modal backdrop fades out over 200ms
- Simultaneously, the Project Detail screen loads underneath

**Total time budget: <5 seconds** (Thomas's acceptance criteria). The creating state should feel brief — loading spinner visible for 2-4 seconds typically.

#### 2.3.5 Error State

Shown when something goes wrong during recording or transcription.

**Transcription connection error (WebSocket fails):**
- Shown inline, below the waveform area
- Message card: `bgCard` background, 1px `statusFailed` border, `radiusMd`, `space3` padding
- Icon: `alert-circle` (20px, `statusFailed`) on the left
- Text: "Transcription unavailable. You can still record — add text manually after." Inter-Regular, `textSm`, `textSecondary`
- The recording continues — audio is captured even without live transcription
- On stop: Go to Review state with an empty transcript field for manual entry

**Network error during project creation:**
- Shown in the Creating state
- Button returns to normal state
- Error banner slides in from the top: `bgCard` background, 1px `statusFailed` left border (4px wide accent border), `space3` padding
- Text: "Couldn't create the project. Check your connection and try again." — Inter-Regular, `textSm`, `statusFailed`
- "Try Again" text button below the error, `accent` color
- The form remains editable — no data is lost

**Microphone permission denied:**
- Shown immediately when the modal opens (if permission was denied)
- Centered content:
  - Icon: `mic-off-outline` (48px, `textMuted`)
  - Title: "Microphone Access Needed" — Inter-Medium, `textLg`, `textPrimary`
  - Subtitle: "TeamHQ needs microphone access to transcribe your voice. You can enable it in Settings." — Inter-Regular, `textSm`, `textSecondary`, centered, max-width 280px
  - "Open Settings" primary button — opens the system Settings app to the app's permission page
  - "Enter Text Instead" secondary button — goes directly to Review state with empty transcript for manual entry

#### 2.3.6 Voice Overlay Accessibility

- Modal: `accessibilityViewIsModal={true}` to trap focus
- Waveform: `accessibilityLabel="Audio waveform visualization"`, `accessibilityRole="image"`
- Live transcript: `accessibilityLiveRegion="polite"` — screen reader announces new transcript text as it arrives, without interrupting
- Duration: `accessibilityLiveRegion="polite"`, announces at 10-second intervals (not every second)
- Stop button: `accessibilityLabel="Stop recording"`, `accessibilityHint="Double tap to stop recording and review your transcript"`
- Cancel: `accessibilityLabel="Cancel recording and discard"`
- Auto-stop countdown: Announce "Recording will stop in 3 seconds" via `AccessibilityInfo.announceForAccessibility()`
- Reduced motion: All decorative animations (waveform spring, cursor blink, breathing FAB) are skipped. Functional animations (modal open/close, state transitions) use simple opacity fades at 150ms.

---

### 2.4 Team Roster (Team Tab)

Informational screen showing all 14 agents (12 core + 2 mobile developers).

#### Layout Structure

```
┌──────────────────────────────────┐
│ ▸ Safe Area Top                  │
│                                  │
│  Team                            │  ← Screen title
│                                  │
│  ┌──────────┐  ┌──────────┐     │
│  │ [Avatar] │  │ [Avatar] │     │  ← 2-column grid
│  │ Thomas   │  │ Robert   │     │
│  │ Product  │  │ Product  │     │
│  │ Manager  │  │ Designer │     │
│  └──────────┘  └──────────┘     │
│                                  │
│  ┌──────────┐  ┌──────────┐     │
│  │ [Avatar] │  │ [Avatar] │     │
│  │ Andrei   │  │ Alice    │     │
│  │ Tech.    │  │ Front-End│     │
│  │ Architect│  │ Developer│     │
│  └──────────┘  └──────────┘     │
│                                  │
│  ... (scrollable)                │
│                                  │
│ ┌──────────────────────────────┐ │
│ │  🏠 Projects  👥 Team  ⚙ Set │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

#### Screen Title

- Text: "Team"
- Style: Same as Projects screen title (`text2xl`, Inter-SemiBold, `textPrimary`)
- Subtitle: "14 agents" — Inter-Regular, `textSm`, `textSecondary`, below the title, `space1` margin-top

#### Agent Grid

- Layout: 2-column grid using `FlatList` with `numColumns={2}`
- Gap between columns: `space3` (12px)
- Gap between rows: `space3` (12px)
- Horizontal padding: `space4` (16px) — matching screen padding

**Agent Card:**
- Background: `bgCard`
- Border: 1px `border`
- Border radius: `radiusLg` (12px)
- Padding: `space4` (16px)
- Width: (screen width - 2 * `space4` - `space3`) / 2 — each card takes half the available width
- Alignment: Center-aligned content

**Card content (top to bottom):**

1. **Avatar** — 56px diameter circle. Pre-rasterized PNG from `assets/avatars/`. `radiusFull` clip. Centered horizontally.
2. **Name** — Inter-Medium, `textBase` (16px), `textPrimary`, centered, margin-top `space3`
3. **Role** — Inter-Regular, `textXs` (12px), `textSecondary`, centered, margin-top `space1`. Max 2 lines if role is long.

**Pressed state:** Card background transitions to `bgCardHover`, slight scale to 0.97 with `springs.snappy`.

**Tap action:** Opens an agent detail bottom sheet.

#### Agent Detail Bottom Sheet

Opened by tapping an agent card. Shows more detail about the agent.

**Sheet specs:**
- Snap point: 40% of screen height (single position, not multi-snap)
- Background: `bgCard`
- Border-top-radius: `radiusXl` (16px)
- Handle: 36px wide, 4px tall, `bgCardHover`, centered
- Backdrop: Semi-transparent black, opacity 0.4
- Dismiss: Drag down below threshold, tap backdrop, or swipe down

**Content layout:**
- Avatar: 72px diameter, centered, `space4` below handle
- Name: Inter-SemiBold, `textXl` (20px), `textPrimary`, centered, `space3` below avatar
- Role: Inter-Medium, `textSm` (14px), `accent` color, centered, `space1` below name
- Description: Inter-Regular, `textSm` (14px), `textSecondary`, `leadingRelaxed`, centered, max-width 300px, `space4` below role. One-sentence description of what this agent does.

**Enter animation:** `springs.gentle` slide up from bottom, backdrop fade in 200ms

#### Agent Order

Display agents in this order (matching the team hierarchy):

1. Thomas (PM)
2. Robert (Designer)
3. Andrei (Architect)
4. Alice (Front-End Dev)
5. Jonah (Back-End Dev)
6. Zara (Mobile Dev)
7. Leo (Mobile Dev)
8. Enzo (QA)
9. Kai (AI Engineer)
10. Suki (Market Researcher)
11. Marco (Tech Researcher)
12. Priya (Marketer)
13. Nadia (Writer)
14. Yuki (Analyst)

#### Layout Animations

Cards enter with staggered `FadeInUp` animation:
- Each card delays by `index * 50ms`
- Spring config: `damping: 20, stiffness: 200`
- Reduced motion: No stagger, instant appear

#### Accessibility

- Agent cards: `accessibilityRole="button"`, `accessibilityLabel` includes name and role (e.g., "Thomas, Product Manager")
- `accessibilityHint="Double tap to see more about this agent"`
- Grid: `accessibilityRole="list"`
- Bottom sheet: `accessibilityViewIsModal={true}`, focus trapped within

---

### 2.5 Settings (Settings Tab)

Configuration screen for the API connection and service health.

#### Layout Structure

```
┌──────────────────────────────────┐
│ ▸ Safe Area Top                  │
│                                  │
│  Settings                        │  ← Screen title
│                                  │
│  ─── Connection ───────────────  │
│                                  │
│  API Base URL                    │
│  ┌─────────────────────────────┐ │
│  │ http://localhost:3002       │ │  ← TextInput
│  └─────────────────────────────┘ │
│                                  │
│  [ Test Connection ]    ● OK     │  ← Button + status dot
│                                  │
│  Voxtral Transcription           │
│  ● Reachable (120ms)             │  ← Health status
│                                  │
│  ─── Network Help ─────────────  │
│                                  │
│  To connect from your phone:     │
│  • On same WiFi: Use your Mac's  │
│    local IP (e.g. 192.168.1.x)   │
│  • From anywhere: Use Tailscale  │
│    hostname (e.g. mac.tailnet)   │
│                                  │
│  ─── About ────────────────────  │
│                                  │
│  TeamHQ Mobile  v1.0.0           │
│                                  │
│ ┌──────────────────────────────┐ │
│ │  🏠 Projects  👥 Team  ⚙ Set │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

#### Screen Title

- Text: "Settings"
- Style: Same as other screen titles

#### Connection Section

**API Base URL field:**
- Label: "API Base URL" — Inter-Medium, `textSm`, `textMuted`
- Input: Single-line `TextInput`
  - Background: `bgCard`
  - Border: 1px `border`, `radiusMd`
  - Padding: `space3`
  - Text: Inter-Regular, `textBase`, `textPrimary`
  - Keyboard type: `url`
  - Auto-capitalize: none
  - Auto-correct: off
  - Default value: `http://localhost:3002`
  - On change: Debounced save to AsyncStorage (500ms debounce)

**Test Connection button:**
- Style: Secondary button (outlined)
- Label: "Test Connection"
- Position: Below the URL field, `space3` margin-top
- Status indicator: Small dot (10px diameter) to the right of the button
  - While testing: `accent` color, pulsing opacity animation
  - Success: `statusCompleted` (#4ade80) with "Connected" label
  - Failure: `statusFailed` (#f87171) with "Failed" label
- Haptic: Success or error notification haptic based on result

**Voxtral health:**
- Label: "Voxtral Transcription" — Inter-Medium, `textSm`, `textMuted`
- Status row (below label, `space2` margin-top):
  - Dot: 10px, color based on status
  - Text: "Reachable (120ms)" or "Unreachable" — Inter-Regular, `textSm`, `textSecondary`
- Auto-checked on screen load (calls `GET /api/voice/health`)
- Refresh: Pull-to-refresh on the settings scroll view re-checks both connection and Voxtral status

#### Network Help Section

- Section label: "Network Help"
- Content: Two bullet points explaining WiFi and Tailscale options
- Text: Inter-Regular, `textSm`, `textSecondary`, `leadingRelaxed`
- This is static informational text, not interactive

#### About Section

- "TeamHQ Mobile" — Inter-Medium, `textSm`, `textPrimary`
- Version: "v1.0.0" — Inter-Regular, `textXs`, `textMuted`

#### Accessibility

- URL input: `accessibilityLabel="API base URL"`, `accessibilityHint="Enter the URL of your TeamHQ server"`
- Test button: `accessibilityLabel="Test connection to API"`
- Status dots: `accessibilityLabel` includes the status text (e.g., "Connection status: connected")
- Voxtral status: `accessibilityLabel="Voxtral transcription service status: reachable, 120 milliseconds latency"`

---

### 2.6 Bottom Tab Bar

The persistent navigation element across all main screens.

#### Specs

- Background: `bgPrimary` (#09090b)
- Top border: 1px `border` (#27272a)
- Height: Platform default (49px iOS, 56px Android) plus safe area bottom inset

**Tab items (left to right):**

| Tab | Icon (inactive) | Icon (active) | Label |
|-----|-----------------|---------------|-------|
| Projects | `home-outline` | `home` | "Projects" |
| Team | `people-outline` | `people` | "Team" |
| Settings | `settings-outline` | `settings` | "Settings" |

- Active icon color: `accent` (#818cf8)
- Active label color: `accent`
- Inactive icon color: `textMuted` (#71717a)
- Inactive label color: `textMuted`
- Icon size: 24px
- Label: Inter-Medium, 10px
- Tab switching: Haptic light impact

**Mic FAB relationship:** The FAB floats above the tab bar on the Projects tab only. When switching to Team or Settings, the FAB is not visible (it belongs to the Projects tab context). When switching back to Projects, the FAB reappears with `FadeInUp.duration(200)`.

#### Platform Differences

- **iOS:** Standard bottom tab bar with safe area handling (extra padding below for home indicator). Uses the system blur effect if desired, but for simplicity and dark theme consistency, use opaque `bgPrimary`.
- **Android:** Standard bottom tab bar. No blur. Extra bottom padding for Android navigation bar.

---

## 3. Component Specifications

### 3.1 Status Badge

Used on project cards and project detail to show project status.

```
┌────────────────┐
│ ● In Progress  │
└────────────────┘
```

**Variants:**

| Status | Dot Color | Text Color | Background |
|--------|-----------|------------|------------|
| Planned | `statusPlanned` (#818cf8) | `statusPlanned` | `rgba(129, 140, 248, 0.1)` |
| In Progress | `statusInProgress` (#facc15) | `statusInProgress` | `rgba(250, 204, 21, 0.1)` |
| Completed | `statusCompleted` (#4ade80) | `statusCompleted` | `rgba(74, 222, 128, 0.1)` |

**Structure:**
- Container: `radiusFull` (pill shape), padding `space1` (4px) vertical, `space2` (8px) horizontal
- Dot: 6px diameter circle, solid fill, left-aligned
- Text: Inter-Medium, `textXs` (12px), `space2` (8px) gap from dot
- Background: Translucent tint of the status color (10% opacity)

### 3.2 Button

Two variants: Primary and Secondary.

**Primary:**
- Background: `accentHover` (#6366f1)
- Text: white (#ffffff), Inter-Medium, `textSm` (14px)
- Padding: `space3` (12px) vertical, `space6` (24px) horizontal
- Border radius: `radiusMd` (8px)
- Pressed: opacity 0.85, scale 0.98 with `springs.snappy`
- Disabled: opacity 0.5, no press effect
- Full-width variant: `alignSelf: "stretch"`

**Secondary:**
- Background: transparent
- Border: 1px `border` (#27272a)
- Text: `textPrimary` (#fafafa), Inter-Medium, `textSm`
- Same padding, radius, and press behavior as primary
- Pressed: background transitions to `bgCardHover`

**Loading state (both variants):**
- Label replaced with `ActivityIndicator` (16px, white for primary, `accent` for secondary) + "Loading..." text
- Button disabled during loading

### 3.3 Card

Base card container used across the app.

- Background: `bgCard` (#18181b)
- Border: 1px `border` (#27272a)
- Border radius: `radiusLg` (12px)
- Padding: `space4` (16px) — default, can be overridden per use case
- No shadow (flat dark theme)

**Pressable card (for list items):**
- Wraps content in `Pressable`
- Pressed state: Background `bgCardHover`, scale 0.98 with `springs.snappy`
- `accessibilityRole="button"`

### 3.4 TextInput

Styled input field used across settings, project edit, and voice review.

- Background: `bgCard` (#18181b)
- Border: 1px `border` (#27272a)
- Border radius: `radiusMd` (8px)
- Padding: `space3` (12px)
- Text: Inter-Regular, `textBase` (16px), `textPrimary`
- Placeholder: `textMuted` (#71717a)
- Focused border: `borderHover` (#3f3f46)
- Cursor color: `accent` (#818cf8)
- Selection color: `rgba(129, 140, 248, 0.3)`

**Multi-line variant:**
- `multiline={true}`
- `textAlignVertical="top"`
- Min height specified per use case
- `scrollEnabled={true}` when content exceeds max height

### 3.5 Loading Skeleton

Placeholder that mimics content shape while data loads.

- Background: `bgCard` (#18181b)
- Shimmer: Linear gradient sweep from `bgCard` through `bgCardHover` back to `bgCard`
- Direction: Left to right
- Duration: 1.5s per sweep
- Animation: `withRepeat(withTiming)` on `translateX` of a gradient overlay
- Corner radius matches the element being shimmed
- Reduced motion: Static `bgCard` rectangle, no shimmer animation

### 3.6 Confirmation Dialog

Used before destructive or significant actions (start session, stop session).

- Overlay: Semi-transparent black (#000 at 50% opacity)
- Dialog: `bgCard` background, `radiusXl` (16px), centered on screen
- Width: Screen width - 2 * `space10` (max 320px)
- Padding: `space6` (24px)
- Title: Inter-SemiBold, `textLg` (18px), `textPrimary`, centered
- Message: Inter-Regular, `textSm` (14px), `textSecondary`, centered, `space3` below title
- Buttons: Row, space-between, `space6` margin-top
  - Cancel: Text button, `textMuted`
  - Confirm: Primary button style, label varies per context
- Enter: `FadeIn.duration(150)` for overlay, `FadeInUp.springify()` for dialog
- Exit: `FadeOut.duration(150)` for both
- `accessibilityViewIsModal={true}`, focus trap

---

## 4. Animation Specifications

### 4.1 Spring Configs

Use the presets from `skills/development/mobile-animations.md`:

```ts
export const springs = {
  snappy: { damping: 20, stiffness: 300, mass: 0.8 },   // Buttons, toggles, small presses
  gentle: { damping: 20, stiffness: 180, mass: 1 },      // Cards, modals, state transitions
  bouncy: { damping: 12, stiffness: 200, mass: 0.8 },    // Success celebrations (use sparingly)
  heavy:  { damping: 25, stiffness: 150, mass: 1.2 },    // Full-screen transitions, voice modal
};
```

### 4.2 Enter/Exit Animations

| Element | Enter | Exit |
|---------|-------|------|
| Project card (list) | `FadeInUp.delay(index * 30).springify().damping(20)` | `FadeOutLeft.duration(200)` |
| Agent card (grid) | `FadeInUp.delay(index * 50).springify().damping(20)` | None (static) |
| Voice modal | `FadeIn.duration(200)` backdrop + content slides up with `springs.heavy` | Reverse: content slides down, backdrop fades |
| Bottom sheet | `springs.gentle` translate up | Drag to dismiss with velocity-aware snap |
| Error banner | `FadeInDown.duration(200)` | `FadeOutUp.duration(150)` |
| Skeleton shimmer | `withRepeat(withTiming(1, {duration: 1500}))` | Crossfade to real content `FadeIn.duration(200)` |
| Filter chip selection | Instant color change, no animation | — |
| Tab switch | Cross-fade, 200ms | — |
| Mic FAB (idle breathing) | `withRepeat(withSequence(withTiming(1.04, {duration: 2000}), withTiming(1, {duration: 2000})))` | — |
| Mic FAB (recording pulse) | `withRepeat(withSequence(withTiming(1.15, {duration: 600}), withTiming(1, {duration: 600})))` | Returns to idle breathing on modal open |

### 4.3 Gesture Interactions

| Interaction | Gesture | Behavior |
|-------------|---------|----------|
| Pull-to-refresh | Vertical pan (FlatList built-in) | System refresh control with custom tint color |
| Card press | Tap | Scale 0.98, `springs.snappy`, background color change |
| Bottom sheet dismiss | Vertical pan | Drag down past threshold, velocity-aware |
| Back navigation (iOS) | Horizontal swipe from left edge | System-provided by Expo Router |
| Swipe between tabs | Horizontal pan | Not enabled — tabs use tap only (prevents accidental swipes during scrolling) |

### 4.4 Reduced Motion Behavior

When `useReducedMotion()` returns `true`:

| Animation | Reduced Behavior |
|-----------|-----------------|
| List stagger (FadeInUp) | Instant appear, no delay or spring |
| Card press scale | Instant scale, no spring |
| Voice modal open/close | Simple opacity fade, 150ms |
| Waveform bars | Instant height change, no spring |
| FAB breathing | Disabled (static) |
| Cursor blink | Solid cursor, no blink |
| Skeleton shimmer | Static rectangle, no animation |
| Loading spinners | Kept (functional, not decorative) |
| Progress rings | Kept (functional) |

---

## 5. Platform-Specific Notes

### 5.1 iOS

- **Navigation:** Use iOS back swipe gesture (left edge). Expo Router enables this by default for stack screens.
- **Safe area:** Extra top padding for Dynamic Island / notch. Extra bottom padding for home indicator. Use `react-native-safe-area-context`.
- **Haptics:** Use `expo-haptics` for pull-to-refresh (medium), button taps (light), tab switches (light), successful actions (notification success), errors (notification error).
- **Status bar:** Light content (white text) — `<StatusBar style="light" />`. On the voice modal, keep light since the modal is also dark.
- **Keyboard:** `behavior="padding"` on `KeyboardAvoidingView`.
- **Scroll indicators:** Use default iOS-style scroll indicators (they match the dark theme).
- **Font rendering:** iOS renders Inter slightly heavier than Android. No adjustment needed — the visual difference is minimal.

### 5.2 Android

- **Navigation:** System back button works for all stack screens. The back chevron is tappable (no edge swipe on Android).
- **Safe area:** Top padding for status bar. Bottom padding for navigation bar (gesture or button). Use `react-native-safe-area-context`.
- **Haptics:** Same as iOS but use `expo-haptics`. Android haptic patterns differ slightly but the API is the same.
- **Status bar:** Translucent, light content. `<StatusBar style="light" translucent backgroundColor="transparent" />`.
- **Keyboard:** `behavior="height"` on `KeyboardAvoidingView`.
- **Elevation:** Use `elevation` instead of iOS shadow properties on the Mic FAB and voice modal.
- **Ripple effect:** Android `Pressable` shows a ripple by default on press. Keep it — it's platform-native. Configure `android_ripple={{ color: 'rgba(129, 140, 248, 0.15)' }}` for the accent-colored ripple.
- **`removeClippedSubviews`:** Enable on `FlatList` for Android (performance optimization, can cause issues on iOS).

### 5.3 Screen Size Handling

The app must work across the full phone size range:

| Device | Width | Notes |
|--------|-------|-------|
| iPhone SE (3rd gen) | 375pt | Smallest. Cards should not feel cramped. |
| iPhone 16 | 393pt | Reference size for design. |
| iPhone 16 Pro Max | 430pt | Widest iOS. Agent grid cards get more breathing room. |
| Small Android | 360dp | Similar to SE. Test card truncation. |
| Large Android | 412dp+ | Similar to Pro Max. |

**Key breakpoints:**
- Below 375px width: Agent grid drops to single column. (Unlikely on modern phones but handle it.)
- 375px+: Two-column agent grid (default).

All text uses dynamic sizing from tokens — no text should overflow or clip on any supported size. Test truncation on SE-size screens.

---

## 6. Interaction Flows

### 6.1 Voice-to-Project Flow (Happy Path)

This is the core interaction loop. Every step should feel smooth and fast.

```
1. CEO is on the Projects tab
   → Sees the Mic FAB breathing gently in the bottom-right

2. CEO taps the Mic FAB
   → Haptic: medium impact
   → FAB scales down (springs.snappy)
   → Voice overlay modal opens (springs.heavy slide up + fade in)
   → Audio permission requested (if first time — system dialog)
   → WebSocket connects to /api/voice/transcribe
   → Server sends { type: "ready" }
   → Recording starts automatically

3. CEO speaks their project brief
   → Waveform visualizer responds to audio levels
   → Live transcript text streams in word-by-word
   → Duration counter ticks up
   → Cursor blinks at the end of the transcript

4. CEO stops speaking
   → Silence detection kicks in after 2 seconds
   → Circular countdown ring appears around stop button (3 seconds)
   → CEO can also tap stop manually at any time

5. Recording stops
   → Transition to Review state (~400ms)
   → Full transcript displayed in editable field
   → POST /api/voice/extract fires in background
   → "Generating name..." placeholder in project name field

6. Extraction completes (~1-3 seconds)
   → Project name auto-fills with extracted name
   → Border highlight flash on the name field (300ms)
   → CEO reviews/edits the transcript and name

7. CEO taps "Create & Go"
   → Haptic: medium impact
   → Button transitions to loading state ("Creating...")
   → POST /api/projects with the form data
   → POST /api/projects/:id/sessions with the new project ID
   → Both calls complete (<5 seconds total)

8. Project created + session started
   → Voice overlay dismisses (fade out)
   → Navigate to Project Detail screen
   → Session appears with "Running" indicator (green pulsing dot)
   → The team pipeline runs autonomously from here
```

### 6.2 Voice Flow with Errors

```
Scenario A: Voxtral unreachable
1. CEO taps Mic FAB
2. WebSocket connect fails
3. Error message: "Transcription unavailable. You can still record..."
4. Recording continues (audio captured, no live transcript)
5. On stop: Review state with empty transcript, manual entry
6. CEO types brief manually, taps Create & Go

Scenario B: Network error during creation
1. CEO taps "Create & Go"
2. POST /api/projects fails (network error)
3. Error banner slides in: "Couldn't create the project..."
4. Form remains editable — nothing lost
5. CEO taps "Try Again" — retries the API call

Scenario C: Mic permission denied
1. CEO taps Mic FAB
2. Modal opens, checks permission — denied
3. Permission denied state shown
4. CEO taps "Open Settings" → goes to system settings
5. OR CEO taps "Enter Text Instead" → Review state with empty transcript
```

### 6.3 Project Detail Flow

```
1. CEO taps a project card on the Projects tab
   → Card press animation (scale 0.98)
   → Navigate to Project Detail (stack push)
   → Screen loads with skeleton, then data

2. CEO scrolls through project info
   → Sees description, brief, goals, constraints
   → Sees notes with timestamps
   → Sees session history

3. CEO taps "Add Note" (+ button)
   → Bottom sheet slides up with text input
   → CEO types a note
   → Taps "Add Note" button
   → Note appears immediately (optimistic update)
   → Sheet dismisses

4. CEO taps "Start New Session"
   → Confirmation dialog: "Start a new session?"
   → CEO taps "Start"
   → Button shows loading state
   → Session starts → "Running" indicator appears
```

---

## 7. Data & Content Specifications

### 7.1 Agent Roster Data

Hardcoded in `lib/constants.ts`. Not fetched from API.

| Name | Role | Description | Avatar File |
|------|------|-------------|-------------|
| Thomas | Product Manager | Translates CEO vision into prioritized, scoped work items. Owns the backlog. | `thomas.png` |
| Robert | Product Designer | Designs user flows, wireframes, and interaction specs. Usability over aesthetics. | `robert.png` |
| Andrei | Technical Architect | Defines system architecture, tech stack, and conventions. Build-vs-buy decisions. | `andrei.png` |
| Alice | Front-End Developer | Implements UIs, components, and client-side logic. Partners with Robert. | `alice.png` |
| Jonah | Back-End Developer | Builds APIs, services, and data models. Thinks in systems and failure modes. | `jonah.png` |
| Zara | Mobile Developer | Builds React Native mobile apps. Expert in native feel and performance. | `zara.png` |
| Leo | Mobile Developer | Builds React Native mobile apps. Expert in animations and micro-interactions. | `leo.png` |
| Enzo | QA Engineer | Tests everything — happy paths, edge cases, error states. QA is the release gate. | `enzo.png` |
| Kai | AI Engineer | Designs prompts, optimizes AI integrations, advises on Claude usage. | `kai.png` |
| Suki | Market Researcher | Researches competitors, market trends, and user patterns. Actionable insights. | `suki.png` |
| Marco | Technical Researcher | Evaluates libraries, reads API docs, produces technical research briefs. | `marco.png` |
| Priya | Product Marketer | Writes positioning, product copy, and feature announcements. Thinks in headlines. | `priya.png` |
| Nadia | Technical Writer | Writes user guides, maintains READMEs, keeps documentation current. | `nadia.png` |
| Yuki | Data Analyst | Analyzes project data, identifies patterns, produces metrics reports. | `yuki.png` |

### 7.2 Timestamp Formatting

Use relative time formatting for all timestamps:

| Age | Format | Example |
|-----|--------|---------|
| < 1 minute | "Just now" | "Just now" |
| 1-59 minutes | "Xm ago" | "5m ago" |
| 1-23 hours | "Xh ago" | "2h ago" |
| 1-6 days | "Xd ago" | "3d ago" |
| 7+ days | "MMM D" (month abbreviation + day) | "Jan 15" |
| Different year | "MMM D, YYYY" | "Dec 20, 2025" |

### 7.3 Status Labels

| API Status Value | Display Label | Notes |
|------------------|---------------|-------|
| `planned` | "Planned" | Default for new projects |
| `in-progress` | "In Progress" | Session has been started |
| `completed` | "Completed" | Manually marked by the CEO |
| `running` | "Running" | Active session (session status) |
| `completed` | "Completed" | Finished session (session status) |
| `failed` | "Failed" | Session errored out |
| `timed-out` | "Timed Out" | Session exceeded time limit |

---

## 8. Handoff Notes for Implementation

### For Zara (Data & Voice Flow)

Zara owns the screens that handle data and the voice pipeline. Key implementation notes:

1. **Project List screen** — Use `FlatList` with `getItemLayout` since project cards have a consistent height. Status filter is client-side (filter the `useProjects()` data, don't re-fetch).
2. **Project Detail** — Use a `ScrollView` (not FlatList). The content sections are heterogeneous, not a uniform list.
3. **Voice overlay** — Use React Native `<Modal>` component, not Expo Router modal. This is a transient interaction, not a route.
4. **Live transcript rendering** — Accumulate partial transcripts from the WebSocket. Each new `{ type: "transcript" }` message appends to the string. Render the full string, not individual chunks.
5. **Extraction flow** — Fire `POST /api/voice/extract` as soon as recording stops. While it's in-flight, the CEO can already see and edit the transcript. The project name field auto-fills when extraction completes.
6. **"Create & Go"** — Two sequential API calls: `POST /api/projects` then `POST /api/projects/:id/sessions`. If the first succeeds but the second fails, the project still exists — navigate to project detail and show the error.
7. **Silence detection** — Track audio levels from `@mykin-ai/expo-audio-stream`. If level < 0.05 for 2 seconds, start the visual countdown (3 seconds). If speech resumes, cancel. If countdown completes, call `stopRecording()`.

### For Leo (Components, Team, Settings & Polish)

Leo owns the shared component library and the visual polish. Key notes:

1. **Start with the token file** (`lib/tokens.ts`) and animation presets (`lib/animation.ts`). These are the foundation everything else builds on.
2. **Shared components first** — Button, Card, Badge, LoadingScreen, ErrorScreen, EmptyScreen. Zara depends on these.
3. **MicFAB** — Build the visual component with the `onPress`, `isRecording`, and `audioLevel` prop interface. Zara wires it to the recording logic.
4. **WaveformVisualizer** — 40 bars, driven by a single `audioLevel` (0-1) prop. Leo is responsible for distributing the level across bars with some randomized variation to look organic. Use `useSharedValue` per bar.
5. **Skeleton loading** — A reusable `Skeleton` component that takes width, height, and border radius. The shimmer animation is shared.
6. **Team roster** — Static data from `lib/constants.ts`. No API call. FlatList with `numColumns={2}`.
7. **Settings** — Zustand store for API URL, persisted with AsyncStorage. The "Test Connection" button calls `GET /api/projects` and shows pass/fail.
8. **Tab bar** — Standard Expo Router `Tabs` configuration. Active color: `accent`. Inactive: `textMuted`.
9. **Agent detail bottom sheet** — Use the bottom sheet pattern from `skills/development/mobile-animations.md`. Single snap point at 40% screen height.
10. **Stagger animations** — Project list cards stagger by 30ms each, agent grid cards by 50ms each. Both use `FadeInUp.springify()`.

### Shared Contract (Zara/Leo Interface)

Components Leo builds that Zara consumes:

```tsx
// MicFAB
interface MicFABProps {
  onPress: () => void;
  isRecording: boolean;
  audioLevel?: number;  // 0-1
}

// WaveformVisualizer
interface WaveformVisualizerProps {
  audioLevel: number;   // 0-1, updated per audio chunk
  isActive: boolean;
}

// Button
interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

// Card
interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Badge (Status)
interface BadgeProps {
  status: "planned" | "in-progress" | "completed";
}

// LoadingScreen, ErrorScreen, EmptyScreen
interface LoadingScreenProps {}
interface ErrorScreenProps {
  message: string;
  onRetry?: () => void;
}
interface EmptyScreenProps {
  title: string;
  description?: string;
  icon?: string;
  action?: React.ReactNode;
}

// Skeleton
interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
}

// ConfirmDialog
interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```

Leo delivers these component interfaces on day one (they can have stub implementations). Zara imports and uses them immediately. Leo fills in the visual polish in parallel.
