# SiteSnap -- Requirements

**Author:** Thomas (PM)
**Date:** 2026-02-15
**Status:** Final
**Repo:** `Sherlock-Labs/sitesnap` (to be created)
**One-liner:** Job site photo auto-organizer that files itself -- no folders, no tags, no typing.

---

## 1. Product Summary

SiteSnap is a mobile app for solo contractors and handypeople that automatically organizes job site photos by job, date, and type (before/after/progress/issue/material/measurement) using AI classification. Users take photos; the app files them. When a customer disputes work or the contractor wants to find the "before" photo from three months ago, they find it in under 10 seconds.

**This is Product #3 in the trades micro SaaS portfolio and the first CAMERA-pipeline product.** SiteSnap introduces new infrastructure not present in VoiceNote Pro or QuoteVoice: photo capture via expo-camera, Cloudflare R2 storage with presigned URLs, server-side thumbnail generation with Sharp, and Gemini 2.0 Flash multimodal classification. This camera pipeline becomes the foundation for CrackReport, WeldGrade, and HardHatCheck.

The killer feature is the **before/after comparison generator** -- contractors already share these on Facebook constantly. SiteSnap turns that existing behavior into a one-tap viral distribution loop with a "Made with SiteSnap" watermark on every shared image.

**Price:** $5/month (unlimited jobs) | Free tier: 10 active jobs, unlimited photos per job
**Platform:** iOS first (Expo/React Native), Android fast-follow
**AI cost per photo:** ~$0.0002 (Gemini 2.0 Flash multimodal classification)

---

## 2. Target User

**Primary:** Mike, 38, solo general contractor / handyperson. Licensed, 6 years experience, ~$90K/year. Works alone or with one sub. Runs 2-3 jobs per day (small repairs, bathroom remodels, deck work, drywall). Takes 5-15 photos per job on his iPhone. Has 6,200 photos in his camera roll and can never find the one he needs. Lost a $400 dispute last year because he couldn't find the photo proving the work was completed. Posts before/after photos on his Facebook business page weekly.

**What he'd pay for:** An app that auto-files job photos so he can find any photo from any job in under 10 seconds. If it also generated shareable before/after comparisons for his Facebook page, he'd pay $5/month without thinking. He won't pay $19/month for CompanyCam -- that's for guys with crews and office managers.

**Key insight:** The problem is not taking photos -- contractors already take plenty. The problem is organizing and finding them later. SiteSnap solves retrieval, not capture.

---

## 3. In Scope (v1)

1. Job creation (name + optional address, two fields, 5 seconds)
2. Photo capture with AI auto-classification via Gemini 2.0 Flash (before/after/progress/issue/material/measurement)
3. Auto-assign photos to active job (one tap to set active job; all photos go there)
4. Job photo timeline (chronological, grouped by date, type badges, filterable)
5. Before/after comparison generator with branded sharing
6. Photo search across all jobs (by type, date range, job name)
7. Share to social / messaging (native share sheet, EXIF-stripped)
8. Free tier gating (10 active jobs, unlimited photos per job)
9. Clerk auth (email + password, Google OAuth, single-user)
10. Photo storage on Cloudflare R2 (presigned URLs, thumbnails, private by default)
11. User profile with business name (for comparison watermarks)
12. PostHog analytics (key events)
13. Loops welcome email + subscription confirmation
14. Stripe Managed Payments ($5/month subscription)

---

## 4. Out of Scope (Deferred)

These are explicitly deferred to v2+. Do not build them:

- Team/crew features (multi-user access to the same job -- CompanyCam territory)
- Video capture (photos only)
- PDF report generation (before/after comparison image is the v1 "report")
- Customer portal (sharing a live job photo gallery with the homeowner)
- Offline photo capture with sync (significant local storage + conflict resolution work)
- Integration with other tools (QuickBooks, Jobber, Google Calendar)
- AI description generation (having AI write a description of what's in each photo)
- Bulk import from camera roll (importing existing photos and classifying retroactively)
- Android QA polish (Expo builds both, but v1 QA targets iOS; Android fast-follow)
- Timelapse generation from progress photos
- GPS/address auto-detect from photo EXIF
- Push notification reminders ("you haven't taken photos today")

---

## 5. User Stories & Acceptance Criteria

### US-1: Create a Job

**As a** contractor starting work at a new customer's home,
**I want to** create a job in under 5 seconds,
**So that** I have a place to organize all the photos I take there.

**Acceptance Criteria:**

- [ ] From the home screen, tapping "+ New Job" opens a creation modal
- [ ] Modal has two fields: **Job Name** (required, e.g., "Johnson Bathroom Remodel") and **Address** (optional, plain text)
- [ ] On submit, the job is created and automatically set as the **active job** (green dot indicator on home screen)
- [ ] The new job appears at the top of the home screen job list
- [ ] If the user submits with an empty job name, inline validation error: "Job name is required"
- [ ] A free-tier user with 10 active jobs who taps "+ New Job" sees the upgrade prompt instead of the creation modal
- [ ] Archived/completed jobs do NOT count toward the 10-job free tier limit
- [ ] Job name max length: 100 characters

**Interaction States:**

Loading & Async Operations:
- [ ] "Create" button shows spinner and is disabled while the job is being saved (prevents double-submit)
- [ ] On success, modal closes and job appears at the top of the list with the active job indicator
- [ ] On success, focus returns to the home screen job list

Error States:
- [ ] On save failure (server error), inline error near the form: "Couldn't create job. Try again." User input is preserved.
- [ ] On network failure, inline error: "No connection. Check your signal and try again." User input is preserved.
- [ ] There is a clear retry path (user taps "Create" again)

Timeout & Connectivity:
- [ ] If the save takes longer than 5 seconds, show "Still saving..." (remain in loading state)
- [ ] If the save times out at 10 seconds, show error: "Couldn't save. Check your connection and try again."

---

### US-2: Photo Capture with Auto-Classification

**As a** contractor on a job site,
**I want to** take a photo and have it automatically classified by type,
**So that** I don't have to manually tag or organize anything.

**Acceptance Criteria:**

- [ ] A persistent camera FAB (floating action button) is always visible at the bottom of the screen
- [ ] Tapping the FAB opens the device camera (via expo-camera) for photo capture
- [ ] User can also select an existing photo from the camera roll (via expo-image-picker)
- [ ] After capture/selection, the photo is compressed client-side to max 2048px on the longest edge (JPEG, ~200-500KB) before upload
- [ ] The compressed photo is uploaded to Cloudflare R2 via a presigned upload URL obtained from the backend
- [ ] On upload completion, the backend sends the photo to Gemini 2.0 Flash for classification
- [ ] Gemini returns structured JSON: `type` (before/after/progress/issue/material/measurement), `confidence` (0.0-1.0), `scene` (brief description), `trade` (detected trade category)
- [ ] If `confidence < 0.6`, the photo is marked as `unclassified` and the user can manually assign a type
- [ ] The classified photo appears in the active job's timeline with a type badge within 3 seconds of upload completing
- [ ] If no active job is set when the user taps the camera FAB, they are prompted to select or create a job first
- [ ] Long-pressing a type badge on any photo opens a picker to manually change the classification
- [ ] The server generates a 400px thumbnail alongside the original for timeline display
- [ ] Per-user rate limit: 100 photos/day (server-enforced). On hitting the limit: "Daily photo limit reached. Resets tomorrow."

**Interaction States:**

Loading & Async Operations:
- [ ] While the photo is uploading and being classified, its thumbnail appears in the timeline with a subtle shimmer/loading overlay
- [ ] On successful classification, the shimmer resolves to the type badge with a brief fade-in
- [ ] Allow concurrent uploads -- the camera FAB is never disabled due to an in-progress upload

Error States:
- [ ] On classification failure (Gemini error, timeout), the photo still saves with type `unclassified`. User can manually assign type. No data loss.
- [ ] On upload failure (network), the photo is queued locally with a retry indicator (circular arrow icon). Auto-retries when connection returns.
- [ ] If a queued photo cannot be uploaded after 3 auto-retries, show: "Photo couldn't upload. Tap to retry." Manual retry available.
- [ ] Camera permission denied: show inline message with "Open Settings" button

Disabled States:
- [ ] Camera FAB is always tappable (no disabled state for uploads in progress)
- [ ] Camera FAB shows a small badge count when photos are queued for upload (e.g., "3" means 3 pending)

---

### US-3: Auto-Assign to Active Job

**As a** contractor working on a specific job,
**I want** all my photos to automatically go to the right job,
**So that** I don't have to think about filing while I'm working.

**Acceptance Criteria:**

- [ ] A job can be set as "active" by tapping it on the home screen and selecting "Set Active"
- [ ] The active job is indicated by a green dot next to its name on the home screen
- [ ] Only one job can be active at a time
- [ ] All photos taken while a job is active are automatically assigned to that job
- [ ] The active job persists across app sessions (stored in AsyncStorage)
- [ ] Switching the active job does not move previously assigned photos -- they stay with their original job
- [ ] If no job is active and the user taps the camera FAB, a bottom sheet appears: "Which job are you working on?" with the job list and a "+ New Job" option

---

### US-4: Job Photo Timeline

**As a** contractor reviewing a past job,
**I want to** see all photos for that job organized by date and type,
**So that** I can quickly find the specific photo I need.

**Acceptance Criteria:**

- [ ] Tapping a job on the home screen opens the job detail screen with a photo timeline
- [ ] Photos are displayed in reverse-chronological order, grouped by date (e.g., "Feb 15", "Feb 14")
- [ ] Each photo thumbnail shows: the image, a type badge (color-coded), and a timestamp
- [ ] Type filter chips appear at the top of the timeline (Before, After, Progress, Issue, Material, Measurement)
- [ ] Tapping a filter chip shows only photos of that type; chip shows count (e.g., "Before (4)")
- [ ] Multiple type filters can be active simultaneously (additive filtering)
- [ ] Tapping a photo opens a full-screen viewer; swipe left/right to navigate through photos in the job
- [ ] Full-screen viewer shows type badge, date/time, and scene description (from AI)
- [ ] Photos load in paginated batches of 20 with infinite scroll
- [ ] Pull-to-refresh reloads the timeline

**Interaction States:**

Loading & Async Operations:
- [ ] While photos load, show skeleton placeholder thumbnails (gray rectangles with shimmer)
- [ ] On pagination load (scrolling to load more), show a small spinner at the bottom of the list

Error States:
- [ ] On load failure: "Couldn't load photos. Pull to retry." with pull-to-refresh
- [ ] On individual photo load failure (broken R2 URL), show a placeholder with a broken-image icon

Empty & Zero States:
- [ ] Job with no photos: illustration + "No photos yet. Tap the camera button to start documenting this job."
- [ ] Filter with no matching photos: "No [type] photos in this job."

---

### US-5: Before/After Comparison Generator

**As a** contractor who wants to show off my work,
**I want to** generate a professional-looking before/after comparison from two photos,
**So that** I can share it on Facebook and impress potential customers.

This is the viral feature. Every shared comparison is a SiteSnap ad.

**Acceptance Criteria:**

- [ ] On the job detail screen, a "Compare" button enters selection mode
- [ ] Selection mode shows instructions: "Tap a BEFORE photo, then tap an AFTER photo"
- [ ] Selected photos get a numbered overlay (1 = before, 2 = after)
- [ ] User can deselect a photo by tapping it again
- [ ] "Generate" button enables only when both photos are selected
- [ ] Tapping "Generate" sends both photo IDs to the backend comparison endpoint
- [ ] The backend generates a 1080x1080px (square) side-by-side comparison image using Sharp:
  - Left half: "before" photo, cropped to fill
  - Right half: "after" photo, cropped to fill
  - "BEFORE" and "AFTER" labels in bold white text with dark semi-transparent background
  - Job name at the top
  - Contractor's business name at the bottom (from user profile)
  - Small "Made with SiteSnap" watermark in the bottom corner
- [ ] Preview screen shows the generated comparison image
- [ ] "Share" button opens the native OS share sheet with the comparison image
- [ ] "Save" button saves the comparison to the device's camera roll
- [ ] The comparison image is cached on the device for re-sharing without regeneration
- [ ] Shared images have EXIF data stripped (no GPS metadata in shared photos)
- [ ] The "Made with SiteSnap" watermark is present on all tiers (free and paid) -- this is the viral loop, not a paywall feature

**Interaction States:**

Loading & Async Operations:
- [ ] While the comparison image is being generated server-side, show a loading spinner on the preview area with "Creating your comparison..."
- [ ] "Generate" button is disabled during generation (prevents double-submit)
- [ ] On success, the comparison image fades in on the preview screen

Error States:
- [ ] On generation failure: "Couldn't create comparison. Try again." with a "Retry" button
- [ ] On network failure: "No connection. Try again when you have signal."
- [ ] Original photos are never affected by comparison generation failures

---

### US-6: Photo Search

**As a** contractor looking for a specific photo,
**I want to** search across all my jobs by type, date, or job name,
**So that** I can find any photo in under 10 seconds.

**Acceptance Criteria:**

- [ ] Search is accessible from the home screen via a search icon in the header
- [ ] Search screen has: a text input for job name search, type filter chips, and a date range picker
- [ ] Text search filters by job name (substring match, case-insensitive)
- [ ] Type filter chips work the same as in the job timeline (additive)
- [ ] Date range picker filters photos by `takenAt` timestamp
- [ ] Results display in a grid layout with: photo thumbnail, job name label, type badge, date
- [ ] Tapping a result opens the photo in full-screen within its job context
- [ ] Results are paginated (20 per page) with infinite scroll

**Interaction States:**

Loading & Async Operations:
- [ ] While search results load, show skeleton grid placeholders
- [ ] Search triggers on 300ms debounce after the user stops typing (not on every keystroke)

Empty & Zero States:
- [ ] No results: "No photos match your search."
- [ ] No search entered yet: show recent photos across all jobs as a default view

---

### US-7: Share to Social / Messaging

**As a** contractor,
**I want to** share individual photos or comparison images with one tap,
**So that** I can post to Facebook, text to a customer, or save to my camera roll.

**Acceptance Criteria:**

- [ ] "Share" button is available on the full-screen photo viewer and on the comparison preview
- [ ] Tapping "Share" opens the native OS share sheet (iOS UIActivityViewController)
- [ ] Shared individual photos have EXIF data stripped (GPS removed for privacy)
- [ ] Shared comparison images include the business name watermark and "Made with SiteSnap" watermark
- [ ] The share sheet targets include: Facebook, Instagram, iMessage, Save to Camera Roll, Copy, and any installed share-capable app

---

### US-8: Free Tier Gating

**As a** free user,
**I want** to use the full product for my first 10 jobs,
**So that** I can evaluate it before committing to $5/month.

This is a fundamentally different gating model from VoiceNote Pro (10 notes/month, consumable and resetting). SiteSnap gates on active job count -- persistent and accumulating. A solo contractor averaging 5 jobs/month hits the limit in month 2, at which point they're hooked on the auto-organization.

**Acceptance Criteria:**

- [ ] Free tier allows up to 10 **active** jobs. Unlimited photos per job.
- [ ] The limit is enforced server-side (client checks are informational only)
- [ ] **Archived/completed jobs do NOT count toward the 10-job limit.** Users can archive finished jobs to free up slots.
- [ ] When a free-tier user with 10 active jobs taps "+ New Job," they see the upgrade prompt instead of the creation modal
- [ ] Upgrade prompt shows: current job count ("10 of 10 active jobs used"), price ("$5/month"), value prop ("Unlimited jobs, unlimited photos"), "Subscribe" CTA button, and "Maybe Later" dismiss link
- [ ] Subscribing removes the job limit immediately
- [ ] Subscription status is verified server-side on app launch and before each job creation attempt
- [ ] Existing jobs and photos remain fully accessible (view, search, share, compare) even after hitting the limit
- [ ] Users can archive jobs from the home screen to free up slots without subscribing
- [ ] Job count is visible on the home screen for free-tier users (e.g., "7 of 10 jobs" -- subtle, in the header)
- [ ] Stripe Managed Payments handles the checkout flow (Stripe is merchant of record)

**Interaction States:**

Loading & Async Operations:
- [ ] During Stripe checkout, the app shows a loading/processing state until the payment flow completes or is dismissed
- [ ] On successful purchase: "You're all set! Unlimited jobs unlocked." then return to job creation flow
- [ ] On returning from Stripe, re-check subscription status via API before allowing job creation

Error States:
- [ ] If payment fails, Stripe handles the error UI within its checkout flow
- [ ] If subscription status can't be verified (network issues), allow photo capture on existing jobs but block new job creation until status is confirmed. Err on the side of not blocking an active work session.

---

### US-9: User Auth & Profile

**As a** new user,
**I want** a fast first experience,
**So that** I can start documenting my job in under 2 minutes from download.

**Acceptance Criteria:**

- [ ] First launch shows Clerk sign-up/sign-in screen. No onboarding tutorial -- the app is self-explanatory.
- [ ] Auth methods: email + password, Google OAuth (via `@clerk/clerk-expo`)
- [ ] After auth, user lands on the home screen (empty state: "No jobs yet. Create your first job to start organizing your photos.")
- [ ] User profile accessible from a settings/profile icon on the home screen
- [ ] Profile fields: **Business Name** (optional, used in comparison watermarks), **Trade** (optional picker: General, Plumbing, Electrical, HVAC, Roofing, Painting, Other)
- [ ] No multi-step onboarding, no feature tour, no email confirmation required before use

**Interaction States:**

Loading & Async Operations:
- [ ] Clerk sign-up/sign-in shows standard Clerk component loading states
- [ ] After auth, show brief "Setting up your account..." while the user record is created on the backend

Error States:
- [ ] If sign-up/sign-in fails, Clerk handles the error UI within its components
- [ ] If backend user creation fails, retry silently up to 3 times, then: "Couldn't set up your account. Check your connection and try again."

---

### US-10: Photo Storage & Bandwidth

**As a** contractor on a job site with spotty cellular service,
**I want** photo uploads to be fast and reliable,
**So that** taking photos doesn't slow me down.

This is critical infrastructure. SiteSnap is a photo-heavy app used on cellular connections at job sites. Every decision should minimize bandwidth and maximize perceived speed.

**Acceptance Criteria:**

- [ ] Photos are compressed client-side before upload: max 2048px on longest edge, JPEG quality 80%, targeting ~200-500KB per photo
- [ ] The compression happens immediately after capture, before the upload begins
- [ ] Uploads use presigned URLs from R2 (direct client-to-R2 upload, no proxy through the Express server)
- [ ] The upload flow: (1) client requests presigned URL from backend, (2) client uploads compressed photo directly to R2, (3) client confirms upload to backend, (4) backend triggers classification + thumbnail generation
- [ ] Server generates a 400px thumbnail using Sharp on upload confirmation. Thumbnail stored in R2 alongside the original.
- [ ] Timeline views load thumbnails only (400px). Full-resolution originals load only when the user taps into full-screen view.
- [ ] Thumbnails are aggressively cached on-device using expo-image (or equivalent) to minimize repeated downloads
- [ ] R2 presigned URLs for downloads expire after 1 hour. The app refreshes URLs transparently when they expire (user never sees a broken image due to expiration).
- [ ] Photo R2 key structure: `{clerkUserId}/jobs/{jobId}/{photoId}.jpg` (originals), `{clerkUserId}/jobs/{jobId}/thumbs/{photoId}.jpg` (thumbnails)
- [ ] All photo access is via presigned URLs -- photos are private by default, never publicly accessible
- [ ] On upload failure, the photo is queued locally and auto-retried when connection returns. Photos are never lost due to network issues.

---

### US-11: Job Management

**As a** contractor managing multiple active jobs,
**I want to** view, edit, archive, and search my jobs,
**So that** my job list stays organized as I take on new work.

**Acceptance Criteria:**

- [ ] Home screen shows all jobs sorted by most recent activity (most recent first)
- [ ] Each job card shows: job name, address (if set), photo count, date of last photo, active job indicator (green dot)
- [ ] Tapping a job opens the job detail/photo timeline (US-4)
- [ ] Swipe-to-archive on job cards with confirmation: "Archive this job? You can find it in Archived Jobs."
- [ ] Archived jobs are accessible via an "Archived" tab or filter on the home screen
- [ ] Archived jobs can be unarchived (restored to active) at any time
- [ ] Job name and address can be edited from the job detail screen
- [ ] Deleting a job is available from the job detail screen settings (not swipe -- too destructive for swipe). Confirmation: "Delete this job and all its photos? This can't be undone."
- [ ] Deleting a job removes all associated photos from R2 and the database (hard delete)

**Interaction States:**

Loading & Async Operations:
- [ ] Job list loads from server on app open. Show skeleton cards while loading.
- [ ] Pull-to-refresh on the home screen reloads the job list.

Empty & Zero States:
- [ ] No jobs (first launch): "No jobs yet. Tap '+ New Job' to start organizing your job site photos."
- [ ] No archived jobs: "No archived jobs."

Error States:
- [ ] On job list load failure: "Couldn't load jobs. Pull to retry."
- [ ] On archive/delete failure: "Couldn't update job. Try again." Action is not applied.

---

## 6. Technical Constraints

These inform Andrei's tech approach. Non-negotiable unless Andrei identifies a blocking technical issue.

- **Expo (React Native)** -- standard team stack. Must support iOS and Android. Managed workflow.
- **expo-camera** for photo capture, **expo-image-picker** for camera roll selection. Both are mature in managed workflow.
- **Gemini 2.0 Flash** (multimodal) for photo classification. Calls go through the backend, never directly from the client. Structured JSON output mode. Classify type, confidence, scene description, trade category.
- **Cloudflare R2** for photo storage. S3-compatible SDK. Presigned URLs for upload and download. Zero egress fees. **This is new infrastructure -- not used in VoiceNote Pro.** Needs bucket creation, CORS configuration, presigned URL generation in the Express API.
- **Sharp** (Node.js, server-side) for thumbnail generation (400px) and comparison image generation (1080x1080px). Runs on Railway alongside the Express API.
- **Clerk** for auth. `@clerk/clerk-expo` with sign-in/sign-up. JWT in Authorization header. Single-user (no orgs in v1). Shared pattern from VoiceNote Pro.
- **Stripe Managed Payments** for billing. Stripe is merchant of record. $5/month subscription. Shared pattern from VoiceNote Pro.
- **Express on Railway** for backend API. Railway Postgres + Drizzle ORM for data.
- **PostHog** mobile SDK for analytics (`posthog-react-native`).
- **Loops** for transactional email (welcome, subscription confirmation).
- **Zustand** for client-side state management. Active job state persisted with AsyncStorage.
- **No offline photo capture.** Photos require an upload to R2 + classification. Failed uploads are queued locally with auto-retry -- this is a retry queue, not an offline mode.
- **Performance targets:**
  - Camera open: < 1 second from FAB tap to camera ready
  - Photo compression: < 500ms (client-side, before upload)
  - Photo upload (compressed, ~300KB): < 3 seconds on LTE
  - Classification (server-side Gemini call): < 2 seconds
  - End-to-end (tap photo -> classified in timeline): < 5 seconds on LTE
  - Thumbnail load in timeline: < 500ms from cache, < 2 seconds on first load
  - Comparison image generation (server-side): < 3 seconds
  - App launch to usable: < 3 seconds

---

## 7. Data Model (Reference)

Provided for Andrei and Jonah. Final schema is Andrei's call.

### Users
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| clerkUserId | TEXT | Unique, from Clerk |
| email | TEXT | |
| businessName | TEXT | Nullable. Used in comparison watermarks. |
| trade | TEXT | Nullable. general, plumbing, electrical, hvac, roofing, painting, other |
| plan | TEXT | free, pro. Default: free |
| stripeCustomerId | TEXT | Nullable |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

### Jobs
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| userId | UUID | FK -> users |
| name | TEXT | Required. Max 100 chars. |
| address | TEXT | Nullable |
| status | TEXT | active, archived. Default: active |
| photoCount | INTEGER | Default 0. Denormalized for fast display. |
| lastPhotoAt | TIMESTAMP | Nullable. For sort-by-recent-activity. |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

### Photos
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| jobId | UUID | FK -> jobs |
| userId | UUID | FK -> users |
| r2Key | TEXT | R2 object key for original |
| thumbnailR2Key | TEXT | R2 object key for 400px thumbnail |
| type | TEXT | before, after, progress, issue, material, measurement, unclassified |
| confidence | FLOAT | Nullable. AI classification confidence (0.0-1.0) |
| scene | TEXT | Nullable. AI-generated scene description |
| trade | TEXT | Nullable. AI-detected trade category |
| width | INTEGER | Original photo dimensions |
| height | INTEGER | |
| sizeBytes | INTEGER | Compressed file size |
| takenAt | TIMESTAMP | From EXIF data or upload time |
| createdAt | TIMESTAMP | |

### Subscriptions
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| userId | UUID | FK -> users |
| stripeSubscriptionId | TEXT | Unique |
| status | TEXT | active, canceled, past_due |
| currentPeriodEnd | TIMESTAMP | |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

### Relationships
```
Users (1) --> (many) Jobs
Jobs (1) --> (many) Photos
Users (1) --> (0..1) Subscriptions
```

### Key Indexes
- `jobs_userId_updatedAt` -- home screen job list performance
- `photos_jobId_takenAt` -- job timeline performance
- `photos_userId_type` -- cross-job search by type
- `photos_userId_takenAt` -- cross-job search by date

---

## 8. API Endpoints (Reference)

Provided for Andrei and Jonah. Final API design is Andrei's call.

### Auth Webhooks
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/webhooks/clerk | Clerk webhook handler (user.created -> create DB user) |
| POST | /api/webhooks/stripe | Stripe webhook handler (subscription lifecycle events) |

### User Profile
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/me | Get current user profile + subscription status + active job count |
| PUT | /api/me | Update user profile (businessName, trade) |

### Jobs
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/jobs | List all jobs for current user (paginated, sorted by lastPhotoAt desc) |
| POST | /api/jobs | Create a new job (name, address). Enforces free tier limit server-side. |
| GET | /api/jobs/:id | Get job details with photo count |
| PUT | /api/jobs/:id | Update job (name, address, status) |
| DELETE | /api/jobs/:id | Hard delete job + all associated photos from R2 and DB |

### Photos
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/jobs/:id/photos | List photos for a job (paginated, 20/page, filterable by type) |
| POST | /api/jobs/:id/photos/upload-url | Generate presigned R2 upload URL. Returns `{ uploadUrl, r2Key }`. |
| POST | /api/jobs/:id/photos | Confirm photo upload + trigger AI classification. Input: `{ r2Key, takenAt, width, height, sizeBytes }`. Backend enqueues classification + thumbnail generation. |
| PUT | /api/photos/:id | Update photo metadata (manual type override) |
| DELETE | /api/photos/:id | Delete photo from R2 (original + thumbnail) and DB |

### Search
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/photos/search | Search photos across all jobs. Query params: `q` (job name), `type`, `dateFrom`, `dateTo`. Paginated. |

### Comparison
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/photos/compare | Generate comparison image. Input: `{ beforePhotoId, afterPhotoId }`. Returns the generated image (JPEG). |

### Billing
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/billing/checkout | Create Stripe Checkout session for $5/mo subscription |
| GET | /api/billing/status | Get current subscription status |

All endpoints except webhooks require Clerk authentication via `clerkMiddleware()`.

---

## 9. AI Integration

### Model

**Gemini 2.0 Flash** via the Google AI SDK (`@google/generative-ai`). Structured JSON output mode.

### Classification Prompt

```
Analyze this job site photo taken by a contractor. Return JSON with:
{
  "type": "before" | "after" | "progress" | "issue" | "material" | "measurement",
  "confidence": 0.0-1.0,
  "scene": "brief description of what's in the photo (e.g., 'bathroom with demolished tile and exposed plumbing')",
  "trade": "detected trade category (e.g., 'plumbing', 'electrical', 'general', 'roofing', 'painting', 'hvac')"
}

Classification rules:
- "before": empty/clean room, undamaged surface, area before work started
- "after": finished work, painted surface, installed fixture, completed job
- "progress": active work in progress, partially completed, mid-demolition
- "issue": damage, defect, problem to document (crack, leak, rot, stain)
- "material": building materials, supplies, product labels, hardware
- "measurement": tape measure, level readings, dimensions visible

If you are not confident in the classification, return a lower confidence score. Never guess -- a low-confidence correct answer is better than a high-confidence wrong one.
```

### Input/Output

- **Input:** JPEG image (max 2048px, ~200-500KB) + classification prompt
- **Output:** Structured JSON with type, confidence, scene, trade
- **Latency:** 1-2 seconds per classification

### Cost per Action

- Input: ~1,290 tokens (image) + ~150 tokens (prompt) = ~1,440 tokens = $0.000144
- Output: ~100 tokens = $0.00004
- **Total per photo: ~$0.0002**
- At 20 photos/day per active user: **$0.12/user/month**
- At 50 photos/day (heavy user): **$0.30/user/month**

### Fallback Strategy

- If Gemini is unavailable, the photo saves with type `unclassified`. User can manually assign. The photo is not blocked on AI.
- No client-side AI -- all classification is server-side.
- The Gemini call is asynchronous from the photo save. The photo is always persisted to R2 first, then classification runs. Classification failure never causes data loss.

### Rate Limits

- Per-user: 100 photos/day (server-enforced, prevents abuse)
- Gemini API: use the paid tier ($0.10/1M input tokens) for 60 RPM. At 1,000 users * 20 photos/day, peak load is ~14 classifications/minute -- well within limits.

---

## 10. New Infrastructure (CAMERA Pipeline)

**These components are NEW -- not inherited from VoiceNote Pro or QuoteVoice.** Andrei and Jonah need to build them from scratch for SiteSnap. They become shared infrastructure for CrackReport, WeldGrade, and HardHatCheck.

### Cloudflare R2 Integration
- **Bucket setup:** One bucket for all SiteSnap photos. CORS configured to allow uploads from the Expo app.
- **Presigned URL generation:** Server-side using the S3-compatible `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`. Generate short-lived upload URLs (5-minute expiry) and download URLs (1-hour expiry).
- **Object key structure:** `{clerkUserId}/jobs/{jobId}/{photoId}.jpg` (originals), `{clerkUserId}/jobs/{jobId}/thumbs/{photoId}.jpg` (thumbnails).
- **Access pattern:** All reads/writes via presigned URLs. No public bucket access. No CDN in v1.
- **Cost:** Zero egress (R2 has no egress fees). Storage: $0.015/GB/month. At 100 users * 75 photos/month * 300KB = 2.25GB/month growth.

### Server-Side Image Processing (Sharp)
- **Thumbnail generation:** On photo upload confirmation, server downloads the original from R2, generates a 400px-wide JPEG thumbnail, uploads the thumbnail back to R2.
- **Comparison image generation:** On compare request, server downloads both photos from R2, composites a 1080x1080 side-by-side image with labels and watermarks using Sharp, returns the result.
- **Sharp runs on the Express server (Railway).** No separate image processing service in v1.

### expo-camera + expo-image-picker
- **expo-camera:** Native camera capture within the app. Standard managed-workflow module.
- **expo-image-picker:** Selecting existing photos from the camera roll.
- **Client-side compression:** After capture/selection, compress to 2048px max / JPEG 80% using expo-image-manipulator before upload. This keeps uploads under 500KB on average.

### Gemini 2.0 Flash (Multimodal)
- **New usage pattern.** VoiceNote Pro uses Gemini for text structuring. SiteSnap uses Gemini for image classification -- different input modality, different prompt, different output schema.
- **The Google AI SDK (`@google/generative-ai`) already exists in the team stack** from VoiceNote Pro. The new part is sending image data (base64 or inline data) along with the prompt.

---

## 11. Shared Components from VoiceNote Pro

**These already exist and should be reused, not rebuilt:**

| Component | Source | Notes |
|-----------|--------|-------|
| Expo app shell (navigation, splash) | VoiceNote Pro | Adapt for SiteSnap branding |
| Clerk auth (`@clerk/clerk-expo`) | VoiceNote Pro | Identical pattern. Single-user, no orgs. |
| Express API scaffold (Railway, middleware, health check) | VoiceNote Pro | Extend with photo/job endpoints |
| Railway Postgres + Drizzle ORM | VoiceNote Pro | New tables (jobs, photos) but same setup |
| Stripe Managed Payments (checkout, webhook, status) | VoiceNote Pro | Same pattern, $5/mo instead of $7/mo |
| PostHog mobile SDK | VoiceNote Pro | New events but same integration |
| Loops email (welcome, subscription) | VoiceNote Pro | Same transactional templates |
| Free tier gating (server-enforced) | VoiceNote Pro | **Different gating model** (job count vs. note count). Reuse the enforcement pattern but change the logic. |
| Zustand + AsyncStorage | VoiceNote Pro | Reuse for active job state |

---

## 12. PostHog Events

Track these events for product analytics:

| Event | Properties | When |
|-------|-----------|------|
| `signup_completed` | `method` (email/google) | After Clerk auth + backend user creation |
| `job_created` | `jobId`, `hasAddress` | On job creation |
| `job_archived` | `jobId`, `photoCount` | On job archive |
| `photo_taken` | `jobId`, `source` (camera/gallery) | On photo capture/selection |
| `photo_classified` | `jobId`, `type`, `confidence`, `trade` | On successful AI classification |
| `photo_reclassified` | `photoId`, `fromType`, `toType` | On manual type override |
| `comparison_generated` | `jobId`, `beforePhotoId`, `afterPhotoId` | On comparison image creation |
| `comparison_shared` | `jobId`, `shareTarget` | On share sheet action completed |
| `photo_shared` | `photoId`, `shareTarget` | On individual photo shared |
| `search_performed` | `hasQuery`, `hasTypeFilter`, `hasDateFilter`, `resultCount` | On search execution |
| `upgrade_prompt_shown` | `activeJobCount` | When free-tier user hits limit |
| `subscription_started` | | On successful Stripe checkout |
| `subscription_canceled` | | On Stripe cancellation webhook |

---

## 13. Pipeline Order

1. **Thomas (PM)** -- requirements (this document) [DONE]
2. **Andrei (Arch)** + **Kai (AI)** -- tech approach (parallel). Andrei focuses on R2 integration, Sharp pipeline, and API design. Kai focuses on Gemini multimodal classification prompt and structured output.
3. **Parallel phase (after Andrei finishes):**
   - **Robert (Designer)** -- design spec (home screen, job timeline, camera flow, comparison generator, search, empty states, upgrade prompt)
   - **Jonah (BE)** -- Express backend: job CRUD, photo upload flow (presigned URLs), Gemini classification, thumbnail generation, comparison endpoint, billing
   - **Howard (Payments)** -- Stripe product/price setup ($5/mo), Checkout session, webhook handlers
   - **Priya (Marketer)** -- App Store listing copy, one-liner pitch for Facebook groups
4. **Zara (Mobile)** -- Expo app: Clerk auth, home screen, camera capture + upload pipeline, job timeline, comparison generator, search, share. **After Robert's design spec AND Jonah's backend.**
5. **Robert (Designer)** -- lightweight design review against implementation
6. **Enzo (QA)** + **Nadia (Writer)** -- parallel. Enzo: full test pass (auth, job CRUD, photo upload/classification, comparison, free tier, payments). Nadia: App Store description, brief FAQ, privacy policy.
7. **Yuki (Analyst)** -- retrospective after first week of live data

**Agents NOT needed for v1:** Suki (research done), Marco (research done), Alice (no web frontend -- mobile only), Leo (Zara handles mobile alone for v1 scope), Nina (no complex animations), Soren (mobile-only, no responsive web), Amara (iOS/Android native a11y via default RN components), Derek (Clerk/Stripe/R2 handled by Jonah), Milo (Railway deploy is straightforward), Sam (Jonah handles BE alone), Ravi (strategy complete).

---

## 14. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Gemini classification accuracy is poor for edge cases | Medium | Medium | Allow manual override. Track accuracy via user corrections (`photo_reclassified` events). If confidence < 0.6, mark as unclassified. Improve prompt based on correction patterns. |
| Photo upload fails on poor cellular connections | Medium | High | Queue failed uploads locally with auto-retry (3 attempts). Show upload status. Compress aggressively (2048px max, JPEG 80%). Photos are never lost. |
| R2 presigned URL expiration causes broken images | Low | Medium | Use 1-hour download URLs. Refresh transparently on scroll. Cache thumbnails on-device with expo-image. |
| Expo managed workflow limits native camera access | Low | Low | expo-camera is mature and handles 95% of use cases. If blocked, eject to bare workflow. |
| R2 storage costs grow unexpectedly | Low | Low | R2 has zero egress fees. Storage at $0.015/GB is cheap. At 1,000 users, ~7GB/month growth = ~$0.10/month additional. Free tier covers first 10GB. |
| Sharp thumbnail/comparison generation is slow on Railway | Low | Medium | Sharp is fast for basic operations (resize, composite). If bottlenecked, move image processing to a dedicated Railway service. |
| Apple App Store rejection | Low | High | Standard Expo app. Clear camera permission rationale. Compliant privacy policy. |
| Low willingness to pay at $5/month | Medium | Medium | Free tier is generous (10 jobs). Conversion happens when they hit the limit and are hooked. 10-job limit designed to be hit after ~2 months. |
| Contractors don't change habits (keep using camera roll) | Medium | Medium | Distribution through Facebook trade groups. Before/after share feature creates visible social proof. "What app is that?" comments drive organic growth. |

---

## 15. Success Metrics

### Month 1 (Post-Launch)

| Metric | Target | How Measured |
|--------|--------|-------------|
| App downloads | 200 | App Store Connect + Google Play Console |
| Signups (completed auth) | 150 | Clerk dashboard |
| Activation (first job + first photo) | 100 (67% of signups) | PostHog: `job_created` + `photo_taken` |
| Photos classified | 5,000 | DB: photos table count |
| Comparisons generated | 50 | PostHog: `comparison_generated` |
| Comparisons shared | 25 | PostHog: `comparison_shared` |
| Paid conversions | 10 ($50 MRR) | Stripe dashboard |

### Month 3

| Metric | Target | How Measured |
|--------|--------|-------------|
| MAU | 300 | PostHog |
| Paid subscribers | 40 ($200 MRR) | Stripe |
| 30-day retention | 50% | PostHog cohort |
| Photos/user/month (active) | 60+ | DB query |
| Organic referrals (shared comparisons) | 100+/month | PostHog: `comparison_shared` |
| App Store rating | 4.5+ stars | App Store Connect |

### North Star Metric

**Photos classified per week.** This is the core value loop: contractors are using SiteSnap as their default photo tool on job sites. If this grows week-over-week, retention, conversion, and revenue follow.

---

## 16. Key Decisions

1. **Gemini over Roboflow for classification.** Gemini multimodal ($0.0002/photo) is cheaper and more flexible than a dedicated CV model for general photo classification. It handles the variety of job site photos (different trades, conditions, angles) without custom training. Roboflow is reserved for specialized detection (cracks, welds, PPE) in later products.

2. **No offline mode in v1.** Offline photo capture with sync is significant engineering (local SQLite, conflict resolution, background upload). For v1, failed uploads queue locally and auto-retry when connection returns. This is a retry queue, not full offline support. Contractors usually have cell signal. V2 if user feedback demands it.

3. **10-job free tier limit (persistent, not consumable).** Different from VoiceNote Pro's 10 notes/month. Jobs accumulate; users archive finished jobs to free slots. This creates a natural upgrade moment at ~2 months for an active contractor. Archived jobs don't count, so the user always has a free escape valve.

4. **iOS-first.** Expo builds for both platforms, but v1 QA and polish target iOS. Contractors skew iPhone (especially younger ones entering trades). Android fast-follow within 1-2 weeks.

5. **SiteSnap watermark on all comparisons, all tiers.** Free marketing. Every shared comparison is an ad. This is the viral loop. Not a premium unlock.

6. **No PDF reports in v1.** The before/after comparison image is the MVP of "show your work." PDF reports with full photo galleries come in v2.

7. **Direct-to-R2 upload via presigned URLs.** Photos go directly from the client to R2, not proxied through the Express server. This avoids bandwidth bottlenecks on the API server and keeps uploads fast. The Express server only handles presigned URL generation and classification triggers.

8. **Server-side classification only.** No on-device AI. Keeps the mobile app lightweight, avoids model download, and lets us improve the prompt without app updates.

---

*Requirements written by Thomas (PM). Grounded in the SiteSnap scope doc, trades roadmap, Suki's market research, and Marco's technical research. SiteSnap is the first CAMERA-pipeline product -- build the foundation right and CrackReport, WeldGrade, and HardHatCheck ship faster.*
