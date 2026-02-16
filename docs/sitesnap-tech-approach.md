# SiteSnap -- Technical Approach

**Author:** Andrei (Technical Architect)
**Date:** 2026-02-16
**Status:** Final
**Repo:** `Sherlock-Labs/sitesnap` (to be created)

---

## 1. Architecture Overview

SiteSnap is a mobile-first Expo app with an Express backend on Railway. The client handles photo capture and compression; the server handles AI classification via Gemini multimodal, thumbnail generation via Sharp, comparison image compositing, and all billing/auth/storage orchestration. Photos are stored in Cloudflare R2 with direct client-to-R2 uploads via presigned URLs.

This is the first CAMERA-pipeline product. The photo infrastructure defined here -- R2 integration, presigned URL lifecycle, Sharp processing, Gemini multimodal classification -- becomes the shared foundation for CrackReport, WeldGrade, and HardHatCheck.

```
                         ┌──────────────────────────┐
                         │     Mobile Client         │
                         │     (Expo / RN)           │
                         │                           │
                         │  ┌─────────────────────┐  │
                         │  │ expo-camera          │  │
                         │  │ expo-image-picker    │  │
                         │  │ expo-image-manipulator│  │
                         │  │ (capture + compress) │  │
                         │  └─────────────────────┘  │
                         │  ┌─────────────────────┐  │
                         │  │ Zustand +            │  │
                         │  │ AsyncStorage         │  │
                         │  │ (active job state)   │  │
                         │  └─────────────────────┘  │
                         │  ┌─────────────────────┐  │
                         │  │ Upload Queue         │  │
                         │  │ (retry on failure)   │  │
                         │  └─────────────────────┘  │
                         │  ┌─────────────────────┐  │
                         │  │ @clerk/clerk-expo    │  │
                         │  │ (auth)               │  │
                         │  └─────────────────────┘  │
                         │  ┌─────────────────────┐  │
                         │  │ PostHog RN SDK       │  │
                         │  │ (analytics)          │  │
                         │  └─────────────────────┘  │
                         └────────────┬───────────────┘
                                      │ HTTPS (JWT in header)
                    ┌─────────────────┼──────────────────┐
                    │                 │                   │
                    │ (1) Get         │ (3) Confirm       │
                    │ presigned URL   │ upload + trigger   │
                    │                 │ classification    │
                    ▼                 ▼                   │
         ┌──────────────────────────────┐                │
         │     Express API              │                │
         │     (Railway)                │                │
         │                              │                │
         │  ┌────────────────────────┐  │                │
         │  │ @aws-sdk/client-s3     │  │                │
         │  │ @aws-sdk/s3-request-   │  │                │
         │  │ presigner              │  │                │
         │  │ (R2 presigned URLs)    │  │                │
         │  └────────────────────────┘  │                │
         │  ┌────────────────────────┐  │                │
         │  │ Sharp                  │  │                │
         │  │ (thumbnails + compare) │  │                │
         │  └────────────────────────┘  │                │
         │  ┌────────────────────────┐  │                │
         │  │ Gemini 2.0 Flash       │  │                │
         │  │ (multimodal classify)  │  │                │
         │  └────────────────────────┘  │                │
         └────────────┬─────────────────┘                │
                      │                                  │
         ┌────────────┼──────────┬──────────┐            │
         │            │          │          │            │
    ┌────▼────┐  ┌────▼────┐ ┌───▼───┐ ┌───▼───┐  ┌────▼────┐
    │ Railway │  │ Stripe  │ │ Loops │ │PostHog│  │   R2    │
    │Postgres │  │Managed  │ │(email)│ │(events│  │ (photos)│
    │         │  │Payments │ │       │ │server)│  │         │
    └─────────┘  └─────────┘ └───────┘ └───────┘  └─────────┘
```

**Key architectural principle:** Photos go directly from the client to R2 via presigned URLs. The Express server never proxies photo data -- it only generates presigned URLs and processes metadata. This keeps the API server lightweight and avoids bandwidth bottlenecks on Railway.

---

## 2. Monorepo Decision: Separate Camera-Products Repo

### ADR-001: Separate Monorepo for Camera Products

**Decision:** SiteSnap starts a NEW monorepo (`Sherlock-Labs/sitesnap`) separate from the VoiceNote Pro repo. The camera-products monorepo will house SiteSnap and later absorb CrackReport, WeldGrade, and HardHatCheck as sibling mobile apps sharing camera infrastructure packages.

**Rationale:**

The roadmap groups products by input modality:
- **Voice products** (VoiceNote Pro, QuoteVoice, DailyLog): share ElevenLabs Scribe, expo-av recording, audio streaming, local-first SQLite sync
- **Camera products** (SiteSnap, CrackReport, WeldGrade, HardHatCheck): share expo-camera, R2 upload pipeline, Sharp processing, photo timeline UI, presigned URL management

These two groups share almost nothing product-specific. The voice products have no R2 integration, no image processing, no camera UI. The camera products have no audio recording, no transcription, no local-first sync. What they DO share -- Clerk auth, Stripe Managed Payments, Express scaffold, PostHog, Loops -- is infrastructure boilerplate that is easy to duplicate across repos (and gets easier with each product because the patterns are proven).

Putting camera products in the voice monorepo would create a bloated workspace where 60% of the packages are irrelevant to any given product. Separate repos keep each workspace focused.

**When CrackReport ships (product #5):** It joins this monorepo as a new `apps/crackreport/` directory, importing `@sitesnap/shared`, `@sitesnap/camera`, and `@sitesnap/r2-client`. The Roboflow inference service becomes a new shared package (`@sitesnap/cv-inference`). The monorepo name can be renamed to something portfolio-level (e.g., `camera-products` or `trades-camera`) at that point if desired.

### Monorepo Structure

```
sitesnap/
├── package.json              # Root workspace config
├── tsconfig.base.json        # Shared TypeScript config
├── .env.example              # Template for env vars
├── CLAUDE.md                 # Dev conventions
├── README.md
│
├── packages/
│   ├── shared/               # Shared types, constants, utils
│   │   ├── package.json      # @sitesnap/shared
│   │   └── src/
│   │       ├── types/        # Job, Photo, User, Subscription types
│   │       ├── constants/    # Photo types, trade enums, limits
│   │       └── utils/        # Date formatting, file size helpers
│   │
│   ├── api-client/           # Typed API client for mobile <-> server
│   │   ├── package.json      # @sitesnap/api-client
│   │   └── src/
│   │       ├── client.ts     # Fetch wrapper with auth headers
│   │       ├── jobs.ts       # Job CRUD API calls
│   │       ├── photos.ts     # Photo upload/metadata API calls
│   │       ├── search.ts     # Search API calls
│   │       ├── compare.ts    # Comparison API calls
│   │       ├── billing.ts    # Stripe checkout/status calls
│   │       └── user.ts       # User profile calls
│   │
│   ├── camera/               # Camera + photo pipeline (REUSABLE)
│   │   ├── package.json      # @sitesnap/camera
│   │   └── src/
│   │       ├── capture.ts    # expo-camera + expo-image-picker wrapper
│   │       ├── compress.ts   # expo-image-manipulator compression
│   │       ├── upload.ts     # Presigned URL upload + retry queue
│   │       ├── exif.ts       # EXIF extraction (takenAt) + stripping
│   │       └── types.ts      # CaptureResult, CompressOptions, etc.
│   │
│   └── r2-client/            # R2 presigned URL + download helpers (REUSABLE)
│       ├── package.json      # @sitesnap/r2-client
│       └── src/
│           ├── presign.ts    # Server-side presigned URL generation
│           ├── download.ts   # Client-side URL refresh + caching helpers
│           └── types.ts      # R2Key, PresignedUrlResponse, etc.
│
├── server/                   # Express backend
│   ├── package.json          # @sitesnap/server
│   ├── tsconfig.json
│   ├── drizzle.config.ts
│   └── src/
│       ├── index.ts          # Express entry point
│       ├── db/
│       │   ├── index.ts      # Drizzle client setup
│       │   ├── schema/
│       │   │   ├── users.ts
│       │   │   ├── jobs.ts
│       │   │   ├── photos.ts
│       │   │   ├── subscriptions.ts
│       │   │   └── events.ts # Webhook dedup
│       │   └── migrations/
│       ├── routes/
│       │   ├── index.ts      # Route mounting
│       │   ├── jobs.ts       # Job CRUD
│       │   ├── photos.ts     # Photo upload URL, confirm, metadata
│       │   ├── search.ts     # Cross-job photo search
│       │   ├── compare.ts    # Comparison image generation
│       │   ├── user.ts       # Profile + subscription status
│       │   └── billing.ts    # Stripe Checkout session
│       ├── webhooks/
│       │   ├── clerk.ts      # Clerk user sync
│       │   └── stripe.ts     # Subscription lifecycle
│       ├── middleware/
│       │   ├── auth.ts       # Clerk auth helpers
│       │   └── rate-limit.ts # Photo upload rate limiting
│       └── services/
│           ├── r2.ts         # R2 client (S3-compatible) + presigned URL gen
│           ├── gemini.ts     # Gemini multimodal classification
│           ├── sharp.ts      # Thumbnail + comparison image generation
│           └── loops.ts      # Transactional email
│
├── mobile/                   # Expo app
│   ├── package.json          # @sitesnap/mobile
│   ├── app.json              # Expo config
│   ├── tsconfig.json
│   ├── app/                  # Expo Router (file-based routing)
│   │   ├── _layout.tsx       # Root layout (ClerkProvider, QueryClientProvider)
│   │   ├── index.tsx         # Redirect to /home or /(auth)
│   │   ├── (auth)/
│   │   │   ├── sign-in.tsx
│   │   │   └── sign-up.tsx
│   │   └── (app)/
│   │       ├── _layout.tsx   # Tab bar layout
│   │       ├── home/
│   │       │   └── index.tsx # Job list (home screen)
│   │       ├── jobs/
│   │       │   └── [id].tsx  # Job detail / photo timeline
│   │       ├── search.tsx    # Photo search
│   │       ├── compare.tsx   # Comparison preview + share
│   │       ├── profile.tsx   # Profile + subscription
│   │       └── upgrade.tsx   # Upgrade prompt
│   ├── components/
│   │   ├── CameraFAB.tsx     # Persistent floating camera button
│   │   ├── JobCard.tsx       # Job list item
│   │   ├── PhotoThumbnail.tsx# Cached thumbnail with shimmer loading
│   │   ├── PhotoTimeline.tsx # Grouped-by-date photo grid
│   │   ├── TypeBadge.tsx     # Color-coded classification badge
│   │   ├── TypeFilterChips.tsx# Filter chips with counts
│   │   ├── ComparisonPreview.tsx # Before/after side-by-side
│   │   ├── UploadQueue.tsx   # Upload status indicator + badge
│   │   ├── JobSelector.tsx   # "Which job?" bottom sheet
│   │   └── UpgradeSheet.tsx  # Upgrade prompt bottom sheet
│   └── lib/
│       ├── camera.ts         # Camera + picker integration (uses @sitesnap/camera)
│       ├── upload.ts         # Upload queue manager (uses @sitesnap/camera)
│       ├── store.ts          # Zustand store (active job, upload queue)
│       ├── auth.ts           # Clerk token provider + API client
│       └── image-cache.ts    # expo-image cache config + URL refresh
│
└── docs/
    └── api.md                # API contract reference
```

### Workspace Configuration

```json
// Root package.json
{
  "name": "sitesnap",
  "private": true,
  "workspaces": [
    "packages/*",
    "server",
    "mobile"
  ],
  "scripts": {
    "dev:server": "cd server && npm run dev",
    "build:server": "cd server && npm run build",
    "db:migrate": "cd server && npx drizzle-kit migrate",
    "db:generate": "cd server && npx drizzle-kit generate"
  }
}
```

### What Future Camera Products Inherit

When CrackReport (product #5) starts, it gets:
- `@sitesnap/shared` -- types and constants (extended with crack-specific types)
- `@sitesnap/api-client` -- typed fetch wrapper (extended with inspection endpoints)
- `@sitesnap/camera` -- expo-camera capture, compression, upload queue, EXIF handling
- `@sitesnap/r2-client` -- presigned URL generation, URL refresh, caching helpers
- The Express scaffold (middleware, webhooks, auth, rate limiting)
- The Clerk + Stripe integration (identical pattern)
- The R2 bucket structure and presigned URL lifecycle
- The Sharp thumbnail pipeline

CrackReport adds:
- Roboflow inference integration (new `@sitesnap/cv-inference` package)
- Gemini report generation prompt (instead of classification)
- PDF report generation via pdf-lib
- Bounding box annotation overlay on photos

**Estimated savings:** 3-4 days per camera product after SiteSnap ships.

---

## 3. Camera Pipeline Architecture

This is the core new infrastructure. Every decision here affects all four camera products.

### ADR-002: Client-Side Compression Before Upload

**Decision:** Compress photos on the client before uploading to R2. Target: 2048px max on longest edge, JPEG quality 80%, resulting in ~200-500KB per photo.

**Rationale:**
- Contractors are on cellular connections at job sites. Uploading 3-5MB original photos on LTE would be slow and unreliable.
- 2048px is more than enough resolution for AI classification (Gemini works well at 1024px) and for the before/after comparison output (1080x1080px).
- Compressing client-side saves R2 storage costs (5-10x smaller files).
- expo-image-manipulator handles this natively with a single API call -- no custom compression code needed.

### Photo Capture Flow

```
1. User taps Camera FAB
   → If no active job: show JobSelector bottom sheet
   → If active job: proceed to step 2

2. Camera opens (expo-camera) OR gallery opens (expo-image-picker)
   → User takes/selects photo
   → Returns URI of original photo on device

3. Client-side processing (immediate, < 500ms target)
   a. Read EXIF data (takenAt from DateTimeOriginal, GPS if present)
   b. Compress via expo-image-manipulator:
      - Resize to max 2048px on longest edge (maintain aspect ratio)
      - JPEG quality 0.8
      - Returns new URI + dimensions + file size
   c. Generate client-side photoId (UUID v4)

4. Upload to R2 (direct, via presigned URL)
   a. POST /api/jobs/:jobId/photos/upload-url
      → Request: { photoId, contentType: "image/jpeg" }
      → Response: { uploadUrl, r2Key }
   b. PUT to uploadUrl (presigned R2 URL) with compressed JPEG body
   c. On success: proceed to step 5
   d. On failure: add to upload retry queue (see Section 3.2)

5. Confirm upload + trigger classification
   POST /api/jobs/:jobId/photos
   → Request: { r2Key, photoId, takenAt, width, height, sizeBytes }
   → Response: { photo: { id, type: "pending", ... } }

6. Photo appears in timeline immediately with shimmer/loading state

7. Server-side (async, non-blocking):
   a. Download original from R2
   b. Generate 400px thumbnail via Sharp
   c. Upload thumbnail to R2 (thumbs/ prefix)
   d. Send image to Gemini 2.0 Flash for classification
   e. Update photo record with classification result
   f. Client polls or receives push update with classification

8. Timeline photo resolves: shimmer -> type badge fade-in
```

### 3.1 EXIF Handling

**On capture (client-side):**
- Extract `DateTimeOriginal` for the `takenAt` field. If not present (screenshots, edited photos), use current timestamp.
- Extract GPS coordinates only for sorting/grouping if we add address auto-detect in v2. Do NOT store GPS in the database in v1.
- expo-image-manipulator strips EXIF by default during compression. This is what we want -- no metadata leaks in stored photos.

**On share (client-side):**
- Photos are already EXIF-stripped from compression. No additional stripping needed.
- Comparison images are generated server-side by Sharp, which does not embed EXIF.

### 3.2 Upload Retry Queue

Failed uploads are common on cellular connections. The retry queue ensures no photos are lost.

```typescript
// mobile/lib/store.ts (Zustand)
interface UploadQueueItem {
  photoId: string;
  jobId: string;
  localUri: string;      // Compressed photo URI on device
  takenAt: string;       // ISO timestamp
  width: number;
  height: number;
  sizeBytes: number;
  retryCount: number;    // 0, 1, 2, 3
  status: "pending" | "uploading" | "failed";
  createdAt: string;
}
```

**Retry strategy:**
1. On upload failure, add item to queue with `status: "failed"`, `retryCount: 0`
2. Auto-retry when `@react-native-community/netinfo` reports connectivity restored
3. Retry with exponential backoff: 5s, 15s, 45s
4. After 3 failed retries, stop auto-retrying. Show "Photo couldn't upload. Tap to retry." in the UI.
5. Manual retry available indefinitely (user taps the retry icon)
6. Queue persists across app restarts via AsyncStorage (Zustand persist middleware)

**CameraFAB badge:** Shows a small count badge when items are in the upload queue (e.g., "3" means 3 photos pending upload). Dismisses when queue is empty.

### 3.3 Concurrent Uploads

The camera FAB is never disabled. Users can take photos faster than they upload. The upload queue processes items sequentially (one at a time) to avoid saturating a cellular connection. Each new photo is added to the queue and processed in order.

**Why sequential, not parallel:** On a weak cellular connection, parallel uploads compete for bandwidth and all fail. Sequential uploads are more reliable -- each photo gets the full available bandwidth. At ~300KB per photo on LTE, sequential upload takes 1-3 seconds per photo. Even at 5 photos per minute (fast shooting), the queue drains faster than it fills.

---

## 4. Cloudflare R2 Integration

### ADR-003: Single R2 Bucket with User-Scoped Keys

**Decision:** One R2 bucket for all SiteSnap photos. Objects are scoped by `clerkUserId` in the key path. All access via presigned URLs -- no public access.

**Rationale:**
- One bucket is simpler to manage than per-user buckets. R2 has no per-bucket cost.
- User-scoped key paths prevent accidental cross-user access at the storage level (belt + suspenders with the API auth).
- Presigned URLs with short expiry ensure photos are private even if someone discovers a key path.

### Bucket Configuration

**Bucket name:** `sitesnap-photos` (or `sherlock-photos` if we want a portfolio-level bucket later -- decision: start with `sitesnap-photos`, merge later if needed)

**CORS configuration:**
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Note: CORS `AllowedOrigins: ["*"]` is acceptable because R2 access is controlled entirely by presigned URL signatures, not origin. The wildcard allows uploads from any Expo development or production environment without maintaining an origin list.

### Object Key Structure

```
{clerkUserId}/
  jobs/
    {jobId}/
      {photoId}.jpg           # Original (compressed, max 2048px)
      thumbs/
        {photoId}.jpg         # Thumbnail (400px wide)
      comparisons/
        {comparisonId}.jpg    # Generated comparison images
```

**Key design decisions:**
- `clerkUserId` at the root scopes all data by user. Clean deletion path when a user deletes their account.
- `jobId` groups photos by job. Clean deletion path when a user deletes a job.
- `photoId` is a UUID generated client-side before upload. This avoids a server round-trip to get an ID before uploading.
- Thumbnails live under `thumbs/` within the job directory. Same key structure, easy to derive from the original key.
- Comparison images are cached in R2 so re-sharing doesn't regenerate. Keyed by a deterministic `comparisonId` derived from the two photo IDs.

### Presigned URL Lifecycle

**Upload URLs (PUT):**
- Generated by `POST /api/jobs/:jobId/photos/upload-url`
- Expire after 5 minutes (plenty of time for a single photo upload, even on slow connections)
- Scoped to the specific R2 key (user cannot upload to arbitrary paths)
- Content-Type constrained to `image/jpeg`

**Download URLs (GET):**
- Generated on-demand when the client requests photo lists or detail views
- Expire after 1 hour
- The client caches these URLs locally and refreshes them transparently when they expire
- Thumbnail URLs and original URLs are generated separately (client only requests originals when entering full-screen view)

### Presigned URL Generation (Server-Side)

```typescript
// server/src/services/r2.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,          // https://<account>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function generateUploadUrl(r2Key: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: r2Key,
    ContentType: "image/jpeg",
  });
  return getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes
}

export async function generateDownloadUrl(r2Key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: r2Key,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
}
```

### URL Refresh Strategy (Client-Side)

The client tracks URL expiration and refreshes transparently:

1. API responses include `thumbnailUrl` and `originalUrl` with their expiration timestamps
2. The client stores these in memory (not persisted -- URLs are cheap to regenerate)
3. Before displaying an image, check if the URL expires within 5 minutes
4. If expiring soon, request a fresh URL from `GET /api/photos/:id/url`
5. expo-image handles caching of the actual image bytes on disk -- the URL is just a temporary access token

### Storage Cost Projections

| Users | Photos/month | Storage Growth/month | Cumulative (6mo) | Monthly Cost |
|-------|-------------|---------------------|-------------------|-------------|
| 100 | 7,500 | 2.25 GB | 13.5 GB | $0.20 |
| 500 | 37,500 | 11.25 GB | 67.5 GB | $1.01 |
| 1,000 | 75,000 | 22.5 GB | 135 GB | $2.03 |

At $0.015/GB/month for R2 storage and zero egress fees, photo storage is negligible. Even at 1,000 users after 6 months, storage costs are ~$2/month. The free tier covers the first 10GB.

---

## 5. Server-Side Image Processing (Sharp)

### ADR-004: Sharp for All Image Processing

**Decision:** Use Sharp on the Express server for thumbnail generation and comparison image compositing. No separate image processing service in v1.

**Rationale:**
- Sharp is the fastest Node.js image processing library (backed by libvips). Resize operations take <100ms. Composite operations take <500ms.
- Running Sharp on the Express server avoids the operational overhead of a separate microservice. At v1 scale, the Express server has plenty of headroom.
- If Sharp becomes a bottleneck at scale, it's straightforward to extract into a dedicated Railway service later. The service boundary is clean: `server/src/services/sharp.ts` already isolates all image operations.

### Thumbnail Generation

Triggered on photo upload confirmation (`POST /api/jobs/:jobId/photos`):

```typescript
// server/src/services/sharp.ts
import sharp from "sharp";

export async function generateThumbnail(
  originalBuffer: Buffer
): Promise<Buffer> {
  return sharp(originalBuffer)
    .resize(400, null, { withoutEnlargement: true }) // 400px wide, maintain aspect
    .jpeg({ quality: 80 })
    .toBuffer();
}
```

**Flow:**
1. Client confirms upload via `POST /api/jobs/:jobId/photos`
2. Server downloads original from R2 (one GET request)
3. Server generates 400px thumbnail via Sharp (<100ms)
4. Server uploads thumbnail to R2 (`{userId}/jobs/{jobId}/thumbs/{photoId}.jpg`)
5. Server updates photo record with `thumbnailR2Key`
6. Server triggers Gemini classification (async, see Section 6)

Steps 2-6 happen in a background task (fire-and-forget from the API response). The API returns immediately after step 1 with `{ photo: { id, type: "pending" } }`. The client shows a shimmer loading state until classification completes.

### Comparison Image Generation

Triggered by `POST /api/photos/compare`:

```typescript
export async function generateComparison(
  beforeBuffer: Buffer,
  afterBuffer: Buffer,
  jobName: string,
  businessName: string | null
): Promise<Buffer> {
  const CANVAS_SIZE = 1080;
  const HALF = CANVAS_SIZE / 2;
  const LABEL_HEIGHT = 40;
  const HEADER_HEIGHT = 50;
  const FOOTER_HEIGHT = 40;

  // Resize both photos to fill their half (center-crop)
  const beforeResized = await sharp(beforeBuffer)
    .resize(HALF, CANVAS_SIZE, { fit: "cover", position: "center" })
    .toBuffer();

  const afterResized = await sharp(afterBuffer)
    .resize(HALF, CANVAS_SIZE, { fit: "cover", position: "center" })
    .toBuffer();

  // Generate label overlays as SVG text
  const beforeLabel = generateLabelSvg("BEFORE", HALF, LABEL_HEIGHT);
  const afterLabel = generateLabelSvg("AFTER", HALF, LABEL_HEIGHT);
  const headerSvg = generateHeaderSvg(jobName, CANVAS_SIZE, HEADER_HEIGHT);
  const footerSvg = generateFooterSvg(businessName, CANVAS_SIZE, FOOTER_HEIGHT);
  const watermarkSvg = generateWatermarkSvg(120, 20);

  return sharp({
    create: {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite([
      { input: beforeResized, left: 0, top: 0 },
      { input: afterResized, left: HALF, top: 0 },
      { input: beforeLabel, left: 0, top: CANVAS_SIZE - LABEL_HEIGHT - 60 },
      { input: afterLabel, left: HALF, top: CANVAS_SIZE - LABEL_HEIGHT - 60 },
      { input: headerSvg, left: 0, top: 0 },
      { input: footerSvg, left: 0, top: CANVAS_SIZE - FOOTER_HEIGHT },
      { input: watermarkSvg, left: CANVAS_SIZE - 130, top: CANVAS_SIZE - 25 },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
}
```

**Comparison output spec:**
- 1080x1080px square (Instagram/Facebook optimized)
- Left half: "before" photo, center-cropped to fill
- Right half: "after" photo, center-cropped to fill
- "BEFORE" / "AFTER" labels in bold white text on semi-transparent dark background
- Job name at the top (header bar)
- Business name at the bottom (footer bar, if set in profile)
- "Made with SiteSnap" watermark in bottom-right corner
- JPEG quality 90 (higher than thumbnails -- this is a shareable marketing image)

**Caching:** The comparison image is uploaded to R2 at `{userId}/jobs/{jobId}/comparisons/{comparisonId}.jpg` where `comparisonId = hash(beforePhotoId + afterPhotoId)`. Subsequent requests for the same pair return the cached version. Cache is invalidated if either source photo is deleted.

**Performance target:** < 3 seconds from API call to image returned. Sharp composite operations on 1080px images typically complete in 200-500ms. The bottleneck is downloading the two source photos from R2 (~500ms each on Railway's internal network). Total: ~1.5s. Well within the 3-second target.

---

## 6. Gemini Multimodal Classification

### ADR-005: Async Classification, Photo Always Saves First

**Decision:** Photo classification is asynchronous. The photo is persisted to R2 and the database immediately on upload confirmation. Gemini classification runs in the background and updates the photo record when complete. Classification failure never causes data loss.

**Rationale:**
- The user's photo must never be blocked or lost because of an AI service outage
- Async classification keeps the upload confirmation response fast (<500ms)
- If Gemini is down or slow, photos accumulate as `unclassified` and the user can classify manually
- This pattern scales naturally -- at high volume, classification can be moved to a queue without changing the client

### Gemini Integration

**Model:** Gemini 2.0 Flash (`gemini-2.0-flash`)
**SDK:** `@google/generative-ai`
**Output mode:** JSON mode (`responseMimeType: "application/json"`, `responseSchema`)

```typescript
// server/src/services/gemini.ts
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const CLASSIFICATION_PROMPT = `Analyze this job site photo taken by a contractor. Classify the photo type and describe what you see.

Classification rules:
- "before": Empty or clean room, undamaged surface, area before work has started. The space looks untouched or in original condition.
- "after": Finished work, painted surface, installed fixture, completed job. The space looks polished and done.
- "progress": Active work in progress, partially completed, mid-demolition. Tools and materials visible in a work zone.
- "issue": Damage, defect, problem being documented. Crack, leak, rot, stain, mold, broken component.
- "material": Building materials, supplies, product labels, hardware. Items staged for use or being inventoried.
- "measurement": Tape measure visible, level readings, dimensions written or marked. Documentation of sizes and distances.

If you are not confident in the classification, return a lower confidence score. A low-confidence correct answer is better than a high-confidence wrong one.`;

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    type: {
      type: SchemaType.STRING,
      enum: ["before", "after", "progress", "issue", "material", "measurement"],
    },
    confidence: {
      type: SchemaType.NUMBER,
      description: "Classification confidence from 0.0 to 1.0",
    },
    scene: {
      type: SchemaType.STRING,
      description: "Brief description of what is in the photo",
    },
    trade: {
      type: SchemaType.STRING,
      description: "Detected trade category",
    },
  },
  required: ["type", "confidence", "scene", "trade"],
};

export async function classifyPhoto(imageBuffer: Buffer): Promise<ClassificationResult> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const result = await model.generateContent([
    CLASSIFICATION_PROMPT,
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBuffer.toString("base64"),
      },
    },
  ]);

  const parsed = JSON.parse(result.response.text());

  // Apply confidence threshold
  if (parsed.confidence < 0.6) {
    return { ...parsed, type: "unclassified" };
  }

  return parsed;
}
```

### Classification Flow (Server-Side)

```
POST /api/jobs/:jobId/photos (upload confirmation)
  → Insert photo record (type: "pending", classification: null)
  → Return { photo } immediately to client
  → Fire-and-forget background task:
      1. Download original from R2
      2. Generate thumbnail (Sharp) → upload to R2
      3. Send to Gemini for classification (10s timeout)
      4. If Gemini succeeds: update photo with type, confidence, scene, trade
      5. If Gemini fails/timeout: update photo with type: "unclassified"
      6. Update job.lastPhotoAt and job.photoCount
```

### Client Polling for Classification

The client needs to know when classification completes. Two options:

**Option A: Short polling (chosen for v1)**
- After upload confirmation, the client polls `GET /api/jobs/:jobId/photos` every 2 seconds for 10 seconds
- If the photo's `type` changes from `"pending"` to anything else, stop polling and update the UI
- If still `"pending"` after 10 seconds, stop polling and show a "classifying..." state
- The next time the user scrolls or pull-to-refreshes, the photo will have its classification

**Why not WebSocket/SSE:** Adds infrastructure complexity (sticky sessions on Railway, connection management on mobile). For a single photo classification that takes 1-3 seconds, short polling for 10 seconds is simple and effective. Revisit if we add real-time features in v2.

### Confidence Threshold Strategy

- **>= 0.6:** Accept classification. Show type badge.
- **< 0.6:** Mark as `unclassified`. Show neutral badge with "Tap to classify" hint.
- **Gemini failure:** Mark as `unclassified`. No error shown to user -- the photo is saved, they can classify manually.

The 0.6 threshold is conservative. We would rather show "unclassified" and let the user pick than show a wrong classification and erode trust. We track `photo_reclassified` events in PostHog to measure accuracy and tune the threshold over time.

### Cost Analysis

| Scenario | Photos/day/user | Monthly cost/user | % of $5/mo revenue |
|----------|----------------|-------------------|---------------------|
| Light use | 10 | $0.06 | 1.2% |
| Average use | 20 | $0.12 | 2.4% |
| Heavy use | 50 | $0.30 | 6.0% |
| Rate limit (100/day) | 100 | $0.60 | 12.0% |

At average use, Gemini classification costs 2.4% of revenue. Even heavy users are well under 10%. The 100 photos/day rate limit caps the worst case at $0.60/user/month.

---

## 7. Data Model (Postgres)

### Server Schema (Drizzle ORM)

```typescript
// server/src/db/schema/users.ts
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  businessName: text("business_name"),
  trade: text("trade"),  // general | plumbing | electrical | hvac | roofing | painting | other
  plan: text("plan").notNull().default("free"),  // free | pro
  stripeCustomerId: text("stripe_customer_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

```typescript
// server/src/db/schema/jobs.ts
import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),           // Max 100 chars (enforced in API)
  address: text("address"),
  status: text("status").notNull().default("active"),  // active | archived
  photoCount: integer("photo_count").notNull().default(0),
  lastPhotoAt: timestamp("last_photo_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("jobs_user_updated").on(table.userId, table.updatedAt),
  index("jobs_user_status").on(table.userId, table.status),
]);
```

```typescript
// server/src/db/schema/photos.ts
import { pgTable, uuid, text, real, integer, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { jobs } from "./jobs";

export const photos = pgTable("photos", {
  id: uuid("id").primaryKey(),  // Client-generated UUID (created before upload)
  jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  r2Key: text("r2_key").notNull(),
  thumbnailR2Key: text("thumbnail_r2_key"),
  type: text("type").notNull().default("pending"),
  // pending | before | after | progress | issue | material | measurement | unclassified
  confidence: real("confidence"),
  scene: text("scene"),
  trade: text("trade"),
  width: integer("width"),
  height: integer("height"),
  sizeBytes: integer("size_bytes"),
  takenAt: timestamp("taken_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("photos_job_taken").on(table.jobId, table.takenAt),
  index("photos_user_type").on(table.userId, table.type),
  index("photos_user_taken").on(table.userId, table.takenAt),
]);
```

```typescript
// server/src/db/schema/subscriptions.ts
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  status: text("status").notNull(),  // active | canceled | past_due
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

```typescript
// server/src/db/schema/events.ts
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const processedEvents = pgTable("processed_events", {
  eventId: text("event_id").primaryKey(),
  source: text("source").notNull(),  // clerk | stripe
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});
```

### Key Indexes

| Index | Purpose |
|-------|---------|
| `jobs_user_updated` | Home screen job list sorted by most recent activity |
| `jobs_user_status` | Fast count of active jobs for free tier enforcement |
| `photos_job_taken` | Job timeline (photos within a job, sorted by date) |
| `photos_user_type` | Cross-job search by type |
| `photos_user_taken` | Cross-job search by date range |

### Cascade Deletes

`photos.jobId` has `onDelete: "cascade"`. When a job is deleted, all associated photos are automatically removed from the database. The R2 objects (originals + thumbnails) are cleaned up in the job deletion handler via a background task that lists and deletes all objects under `{userId}/jobs/{jobId}/`.

---

## 8. API Design

### Auth Pattern: Mobile JWT

Same pattern as VoiceNote Pro. `@clerk/clerk-expo` provides JWT via `getToken()`. Server reads it from `Authorization: Bearer <token>` header using `clerkMiddleware()` from `@clerk/express`.

### API Contract

All endpoints require `Authorization: Bearer <clerk_jwt>` unless noted. All responses are JSON.

#### User & Profile

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/me` | User profile + plan + active job count + subscription status | Required |
| `PUT` | `/api/me` | Update profile (businessName, trade) | Required |

#### Jobs

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/jobs` | List jobs. Params: `?status=active|archived&limit=20&cursor={id}`. Sorted by lastPhotoAt desc. | Required |
| `POST` | `/api/jobs` | Create job (name, address). Enforces free tier limit server-side. Returns 402 if at limit. | Required |
| `GET` | `/api/jobs/:id` | Job details with photo count | Required |
| `PUT` | `/api/jobs/:id` | Update job (name, address, status). Status change to "archived" frees a slot. | Required |
| `DELETE` | `/api/jobs/:id` | Hard delete job + all photos from R2 + DB. Irreversible. | Required |

#### Photos

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/jobs/:id/photos` | Photos for a job. Params: `?type=before&limit=20&cursor={id}`. Sorted by takenAt desc. Returns thumbnailUrl + originalUrl with expiration. | Required |
| `POST` | `/api/jobs/:id/photos/upload-url` | Generate presigned R2 upload URL. Request: `{ photoId, contentType }`. Response: `{ uploadUrl, r2Key }`. | Required |
| `POST` | `/api/jobs/:id/photos` | Confirm upload + trigger classification. Request: `{ r2Key, photoId, takenAt, width, height, sizeBytes }`. | Required |
| `PUT` | `/api/photos/:id` | Update photo (manual type override). | Required |
| `DELETE` | `/api/photos/:id` | Delete photo from R2 (original + thumbnail) and DB. | Required |
| `GET` | `/api/photos/:id/url` | Refresh presigned URLs for a photo. Returns `{ thumbnailUrl, originalUrl, expiresAt }`. | Required |

#### Search

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/photos/search` | Search across all jobs. Params: `?q={jobName}&type={type}&dateFrom={iso}&dateTo={iso}&limit=20&cursor={id}`. | Required |

#### Comparison

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/photos/compare` | Generate comparison image. Request: `{ beforePhotoId, afterPhotoId }`. Returns JPEG image (Content-Type: image/jpeg). Checks R2 cache first. | Required |

#### Billing

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/billing/checkout` | Create Stripe Checkout session for $5/mo. Returns `{ checkoutUrl }`. | Required |
| `GET` | `/api/billing/status` | Subscription status. Returns `{ plan, status, currentPeriodEnd }`. | Required |

#### Webhooks

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/webhooks/clerk` | Clerk user sync (user.created → create DB user) | Clerk signature |
| `POST` | `/api/webhooks/stripe` | Subscription lifecycle events | Stripe signature |

#### Health

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/health` | Health check | None |

### Free Tier Enforcement

Server-side on `POST /api/jobs`:

1. Count active jobs for user: `SELECT COUNT(*) FROM jobs WHERE user_id = $1 AND status = 'active'`
2. If count >= 10 and user plan is "free", return `402 Payment Required`:
   ```json
   { "error": "free_tier_exceeded", "activeJobs": 10, "limit": 10 }
   ```
3. The client also tracks this locally for immediate UI feedback, but the server is the authority.

**Note:** Archived jobs do NOT count. Users can archive finished jobs to free up slots without subscribing.

### Rate Limiting

| Endpoint | Limit | Key |
|----------|-------|-----|
| `POST /api/jobs/:id/photos/upload-url` | 100/day per user | Clerk userId |
| `POST /api/jobs/:id/photos` | 100/day per user | Clerk userId |
| `POST /api/photos/compare` | 20/hour per user | Clerk userId |
| `POST /api/billing/checkout` | 3/minute per user | Clerk userId |

Use `express-rate-limit` with a store that tracks daily counts. The 100 photos/day limit is the primary abuse prevention. Comparison generation is rate-limited separately because it's more compute-intensive (Sharp composite + 2 R2 downloads).

---

## 9. Client-Side Architecture

### ADR-006: Zustand + AsyncStorage for State, No Local SQLite

**Decision:** Use Zustand with AsyncStorage persistence for client-side state. No local SQLite database.

**Rationale:**

SiteSnap does NOT need local-first architecture. Unlike VoiceNote Pro (where notes are created and useful offline), SiteSnap photos require a network connection to upload to R2 and be classified. A photo that exists only on the device is not useful -- it has no classification, no thumbnail, no searchability.

The only client-side state that needs persistence is:
- **Active job ID** (one UUID)
- **Upload retry queue** (array of pending uploads)
- **User profile/plan cache** (for instant free tier UI checks)

This fits comfortably in Zustand + AsyncStorage. Adding expo-sqlite + Drizzle + a sync engine for this would be significant over-engineering.

**What about offline viewing?** expo-image caches thumbnails and originals on disk automatically. Users can browse previously loaded photos without a network connection. The image cache IS the offline viewing solution. No SQLite needed.

### Zustand Store

```typescript
// mobile/lib/store.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SiteSnapStore {
  // Active job
  activeJobId: string | null;
  setActiveJob: (jobId: string | null) => void;

  // Upload queue
  uploadQueue: UploadQueueItem[];
  addToQueue: (item: UploadQueueItem) => void;
  updateQueueItem: (photoId: string, updates: Partial<UploadQueueItem>) => void;
  removeFromQueue: (photoId: string) => void;

  // User cache
  userPlan: "free" | "pro";
  activeJobCount: number;
  setUserInfo: (plan: string, count: number) => void;
}

export const useSiteSnapStore = create<SiteSnapStore>()(
  persist(
    (set) => ({
      activeJobId: null,
      setActiveJob: (jobId) => set({ activeJobId: jobId }),

      uploadQueue: [],
      addToQueue: (item) =>
        set((state) => ({ uploadQueue: [...state.uploadQueue, item] })),
      updateQueueItem: (photoId, updates) =>
        set((state) => ({
          uploadQueue: state.uploadQueue.map((item) =>
            item.photoId === photoId ? { ...item, ...updates } : item
          ),
        })),
      removeFromQueue: (photoId) =>
        set((state) => ({
          uploadQueue: state.uploadQueue.filter((item) => item.photoId !== photoId),
        })),

      userPlan: "free",
      activeJobCount: 0,
      setUserInfo: (plan, count) =>
        set({ userPlan: plan as "free" | "pro", activeJobCount: count }),
    }),
    {
      name: "sitesnap-store",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### Image Caching with expo-image

expo-image (by Expo) provides disk-based image caching out of the box. It is the recommended image component for Expo apps.

```typescript
// mobile/components/PhotoThumbnail.tsx
import { Image } from "expo-image";

export function PhotoThumbnail({ thumbnailUrl }: { thumbnailUrl: string }) {
  return (
    <Image
      source={{ uri: thumbnailUrl }}
      style={styles.thumbnail}
      contentFit="cover"
      cachePolicy="disk"        // Cache to disk for offline viewing
      placeholder={blurhash}     // Blurhash placeholder during load
      transition={200}           // 200ms fade-in on load
    />
  );
}
```

**Cache behavior:**
- expo-image caches by URL. When a presigned URL changes (expiration), the image is re-fetched.
- To prevent unnecessary re-downloads, we use `cachePolicy: "disk"` which caches based on the URL path (ignoring query params like the presigned signature).
- This means `{userId}/jobs/{jobId}/thumbs/{photoId}.jpg` is cached once, regardless of presigned URL rotation. The cache key is stable.

---

## 10. Payments: Stripe Managed Payments

### Same Pattern as VoiceNote Pro

The Stripe integration is identical to VoiceNote Pro's approach (documented in VoiceNote Pro tech approach Section 9). Key points:

- **Stripe Managed Payments** -- Stripe is merchant of record, handles tax/fraud/disputes
- **Checkout via WebView** -- `expo-web-browser` opens Stripe Checkout URL
- **Deep link return** -- `sitesnap://checkout-success` and `sitesnap://checkout-cancel`
- **Webhook for activation** -- `checkout.session.completed` fires async, updates subscription in DB
- **Price difference** -- $5/month (vs. VoiceNote Pro's $7/month). Different Stripe Price ID.

```json
// app.json
{
  "expo": {
    "scheme": "sitesnap"
  }
}
```

### Apple App Store Considerations

Same decision pending from Thomas as VoiceNote Pro: External Purchase Link vs. RevenueCat IAP. At $5/month, Apple's 30% cut is $1.50, leaving $3.50 net. The Stripe Checkout flow works for both options.

---

## 11. Infrastructure

### Railway Deployment

**Services:**
1. **Express API** -- Node.js service, auto-deploys from GitHub
2. **Railway Postgres** -- managed database, internal networking

**Environment Variables (Railway):**

```
# Clerk
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...    # $5/month price ID

# Gemini
GEMINI_API_KEY=...

# Cloudflare R2
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=sitesnap-photos

# Loops
LOOPS_API_KEY=...

# PostHog
POSTHOG_API_KEY=phx_...

# App
APP_SCHEME=sitesnap
PORT=3001

# Database (auto-injected by Railway)
DATABASE_URL=postgresql://...
```

### Expo Build & Distribution

Same pattern as VoiceNote Pro: EAS Build for iOS and Android builds, EAS Submit for store submission.

### CI/CD

Manual for v1:
- Server: push to `main` on GitHub, Railway auto-deploys
- Mobile: `eas build` + `eas submit` from local machine

---

## 12. Security

### Photo Privacy

- All photos are private by default. No public R2 bucket access.
- All photo access is via presigned URLs with short expiration (1 hour for downloads).
- Photos are scoped by `userId` in both the R2 key path and the database. Every query includes `WHERE user_id = $1`.
- EXIF data (including GPS) is stripped during client-side compression. No location metadata is stored or shared.
- Shared comparison images have EXIF stripped by Sharp (server-side generation).

### API Key Protection

- Gemini, R2, Clerk, and Stripe secrets are server-side only
- The client only has the Clerk publishable key (designed to be public)

### Webhook Security

- Clerk webhooks verified via `verifyWebhook()` from `@clerk/express/webhooks`
- Stripe webhooks verified via `stripe.webhooks.constructEvent()`
- Both webhook routes use `express.raw()` for raw body access
- Idempotent webhook handlers via `processedEvents` table

### Rate Limiting

- 100 photos/day per user (prevents abuse of both R2 storage and Gemini API)
- 20 comparisons/hour per user (prevents Sharp compute abuse)
- Rate limits enforced server-side only -- client limits are informational

### Job Deletion

Hard delete of a job removes:
1. All photo records from Postgres (cascade delete)
2. All photo files from R2 (background task lists and deletes all objects under `{userId}/jobs/{jobId}/`)
3. The job record from Postgres

This is irreversible. The UI requires explicit confirmation: "Delete this job and all its photos? This can't be undone."

---

## 13. Shared Infrastructure Reuse from VoiceNote Pro

| Component | Reuse Status | Notes |
|-----------|-------------|-------|
| Expo app shell (navigation, splash) | **Copy + adapt** | New branding (SiteSnap), new tab structure (Home, Search, Profile) |
| Clerk auth (`@clerk/clerk-expo`) | **Identical pattern** | Same hooks, same JWT flow, same webhook handler |
| Express scaffold (Railway, middleware) | **Copy + extend** | Add R2, Sharp, photo routes. Same middleware ordering. |
| Railway Postgres + Drizzle ORM | **Same setup, new schema** | New tables (jobs, photos). Same Drizzle patterns. |
| Stripe Managed Payments | **Same pattern, different price** | $5/mo instead of $7/mo. Same Checkout flow. |
| PostHog mobile SDK | **Same integration, new events** | New event names for photo/job actions |
| Loops email | **Same templates** | Welcome + subscription confirmation |
| Free tier gating (server-enforced) | **Different logic** | Job count vs. note count. Reuse the enforcement pattern, change the counter. |
| Zustand + AsyncStorage | **Same setup** | Different state shape (active job vs. notes) |
| expo-web-browser (Stripe Checkout) | **Identical** | Same deep link pattern |
| Webhook dedup (processedEvents) | **Identical** | Same table, same pattern |

### What is NOT Reused

| Component | Why |
|-----------|-----|
| ElevenLabs Scribe v2 | No voice features |
| expo-av (audio recording) | No audio |
| expo-sqlite + Drizzle (local DB) | No local-first architecture needed |
| Sync engine | No offline creation |
| pdf-lib (PDF generation) | No PDF reports in v1 |
| RecordButton, Waveform, NoteCard | Voice-specific UI components |

---

## 14. Tech Stack Summary

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| **Mobile framework** | Expo (React Native) | SDK 52+ with Expo Router |
| **Mobile routing** | Expo Router | File-based routing |
| **Photo capture** | expo-camera + expo-image-picker | Managed workflow |
| **Image compression** | expo-image-manipulator | 2048px max, JPEG 80% |
| **Image display** | expo-image | Disk caching, blurhash placeholders |
| **State management** | Zustand + AsyncStorage | Active job, upload queue, user cache |
| **Mobile auth** | @clerk/clerk-expo | JWT in Authorization header |
| **Mobile payments** | expo-web-browser + Stripe Checkout | Managed Payments (Checkout required) |
| **Mobile analytics** | posthog-react-native | Batch event uploads |
| **Connectivity** | @react-native-community/netinfo | Upload retry trigger |
| **Backend** | Express (Node.js) | TypeScript, Railway |
| **Server auth** | @clerk/express | clerkMiddleware() + requireAuth() |
| **Server DB** | Railway Postgres + Drizzle ORM | With migrations via drizzle-kit |
| **AI classification** | Gemini 2.0 Flash multimodal | @google/generative-ai, JSON mode |
| **Image processing** | Sharp | Thumbnails (400px) + comparison compositing (1080px) |
| **Photo storage** | Cloudflare R2 | S3-compatible, presigned URLs, zero egress |
| **R2 SDK** | @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner | S3-compatible SDK for R2 |
| **Payments** | Stripe Managed Payments | stripe npm package |
| **Email** | Loops | REST API |
| **Hosting** | Railway | Auto-deploy from GitHub |

---

## 15. File List with Change Impact Classification

This is a greenfield project (new repo). All files are **New**.

### Server Files

| File | Classification | Description |
|------|---------------|-------------|
| `server/src/index.ts` | **New** | Express entry point with middleware ordering |
| `server/src/db/index.ts` | **New** | Drizzle client setup for Postgres |
| `server/src/db/schema/users.ts` | **New** | Users table |
| `server/src/db/schema/jobs.ts` | **New** | Jobs table |
| `server/src/db/schema/photos.ts` | **New** | Photos table |
| `server/src/db/schema/subscriptions.ts` | **New** | Subscriptions table |
| `server/src/db/schema/events.ts` | **New** | Webhook dedup table |
| `server/src/routes/index.ts` | **New** | Route mounting |
| `server/src/routes/jobs.ts` | **New** | Job CRUD with free tier enforcement |
| `server/src/routes/photos.ts` | **New** | Photo upload URL, confirm, metadata, delete |
| `server/src/routes/search.ts` | **New** | Cross-job photo search |
| `server/src/routes/compare.ts` | **New** | Comparison image generation |
| `server/src/routes/user.ts` | **New** | Profile + subscription status |
| `server/src/routes/billing.ts` | **New** | Stripe Checkout session |
| `server/src/webhooks/clerk.ts` | **New** | Clerk user sync webhook |
| `server/src/webhooks/stripe.ts` | **New** | Stripe subscription webhook |
| `server/src/middleware/auth.ts` | **New** | Clerk auth helpers |
| `server/src/middleware/rate-limit.ts` | **New** | Rate limiting per user |
| `server/src/services/r2.ts` | **New** | R2 client + presigned URL generation |
| `server/src/services/gemini.ts` | **New** | Gemini multimodal classification |
| `server/src/services/sharp.ts` | **New** | Thumbnail + comparison generation |
| `server/src/services/loops.ts` | **New** | Transactional email |
| `server/package.json` | **New** | Server package config |
| `server/tsconfig.json` | **New** | Server TypeScript config |
| `server/drizzle.config.ts` | **New** | Drizzle migration config |

### Mobile Files

| File | Classification | Description |
|------|---------------|-------------|
| `mobile/app/_layout.tsx` | **New** | Root layout (ClerkProvider, QueryClient) |
| `mobile/app/index.tsx` | **New** | Entry redirect |
| `mobile/app/(auth)/sign-in.tsx` | **New** | Custom Clerk sign-in |
| `mobile/app/(auth)/sign-up.tsx` | **New** | Custom Clerk sign-up |
| `mobile/app/(app)/_layout.tsx` | **New** | Tab bar layout |
| `mobile/app/(app)/home/index.tsx` | **New** | Job list (home screen) |
| `mobile/app/(app)/jobs/[id].tsx` | **New** | Job detail / photo timeline |
| `mobile/app/(app)/search.tsx` | **New** | Photo search |
| `mobile/app/(app)/compare.tsx` | **New** | Comparison preview + share |
| `mobile/app/(app)/profile.tsx` | **New** | Profile + subscription |
| `mobile/app/(app)/upgrade.tsx` | **New** | Upgrade prompt |
| `mobile/components/CameraFAB.tsx` | **New** | Persistent floating camera button |
| `mobile/components/JobCard.tsx` | **New** | Job list item |
| `mobile/components/PhotoThumbnail.tsx` | **New** | Cached thumbnail with shimmer |
| `mobile/components/PhotoTimeline.tsx` | **New** | Grouped-by-date photo grid |
| `mobile/components/TypeBadge.tsx` | **New** | Color-coded classification badge |
| `mobile/components/TypeFilterChips.tsx` | **New** | Filter chips with counts |
| `mobile/components/ComparisonPreview.tsx` | **New** | Before/after side-by-side |
| `mobile/components/UploadQueue.tsx` | **New** | Upload status indicator |
| `mobile/components/JobSelector.tsx` | **New** | "Which job?" bottom sheet |
| `mobile/components/UpgradeSheet.tsx` | **New** | Upgrade bottom sheet |
| `mobile/lib/camera.ts` | **New** | Camera + picker integration |
| `mobile/lib/upload.ts` | **New** | Upload queue manager |
| `mobile/lib/store.ts` | **New** | Zustand store |
| `mobile/lib/auth.ts` | **New** | Clerk token provider + API client |
| `mobile/lib/image-cache.ts` | **New** | expo-image cache config |
| `mobile/app.json` | **New** | Expo config |
| `mobile/package.json` | **New** | Mobile package config |
| `mobile/tsconfig.json` | **New** | Mobile TypeScript config |

### Shared Packages

| File | Classification | Description |
|------|---------------|-------------|
| `packages/shared/src/types/job.ts` | **New** | Job type definition |
| `packages/shared/src/types/photo.ts` | **New** | Photo type definition |
| `packages/shared/src/types/user.ts` | **New** | User type definition |
| `packages/shared/src/constants/photo-types.ts` | **New** | Photo type enum, colors, labels |
| `packages/shared/src/constants/trades.ts` | **New** | Trade enum |
| `packages/shared/src/constants/limits.ts` | **New** | Free tier limits, rate limits, timeouts |
| `packages/shared/package.json` | **New** | Shared package config |
| `packages/camera/src/capture.ts` | **New** | Camera + picker wrapper |
| `packages/camera/src/compress.ts` | **New** | Image compression |
| `packages/camera/src/upload.ts` | **New** | Upload with retry |
| `packages/camera/src/exif.ts` | **New** | EXIF extraction + stripping |
| `packages/camera/package.json` | **New** | Camera package config |
| `packages/r2-client/src/presign.ts` | **New** | Server-side presigned URL gen |
| `packages/r2-client/src/download.ts` | **New** | Client-side URL refresh |
| `packages/r2-client/package.json` | **New** | R2 client package config |
| `packages/api-client/src/client.ts` | **New** | Typed fetch wrapper |
| `packages/api-client/src/jobs.ts` | **New** | Job API calls |
| `packages/api-client/src/photos.ts` | **New** | Photo API calls |
| `packages/api-client/src/search.ts` | **New** | Search API calls |
| `packages/api-client/src/compare.ts` | **New** | Compare API calls |
| `packages/api-client/src/billing.ts` | **New** | Billing API calls |
| `packages/api-client/src/user.ts` | **New** | User API calls |
| `packages/api-client/package.json` | **New** | API client package config |

### Root Config

| File | Classification | Description |
|------|---------------|-------------|
| `package.json` | **New** | Root workspace config |
| `tsconfig.base.json` | **New** | Shared TypeScript config |
| `.env.example` | **New** | Environment variable template |
| `CLAUDE.md` | **New** | Dev conventions |
| `README.md` | **New** | Project documentation |

---

## 16. Build Plan

### Day 1: Foundation + Camera Pipeline Core

| Who | What |
|-----|------|
| **Andrei** (Arch) | This doc. Project setup (Expo + Express monorepo). R2 bucket creation + CORS config. Drizzle schema definitions. |
| **Kai** (AI) | Gemini multimodal classification prompt engineering. Test with sample job site photos. Optimize structured JSON output schema. Validate confidence threshold strategy. |

### Day 2: Backend + Payments + Design (Parallel)

| Who | What |
|-----|------|
| **Robert** (Designer) | Design spec: home screen, job creation modal, camera FAB, photo timeline, comparison generator, search, empty states, upgrade prompt, type badges |
| **Jonah** (BE) | Express API: Clerk webhook, user CRUD, job CRUD with free tier enforcement, presigned URL generation (`r2.ts`), photo upload confirmation, thumbnail generation pipeline (`sharp.ts`), Gemini classification integration (`gemini.ts`) |
| **Howard** (Payments) | Stripe product/price setup ($5/mo), Checkout session endpoint, webhook handlers for subscription lifecycle. Light work -- same pattern as VoiceNote Pro with a different price. |
| **Priya** (Marketer) | App Store listing copy, one-liner pitch for Facebook groups, before/after comparison marketing angle |

### Day 3-4: Backend Completion + Design Spec Finalized

| Who | What |
|-----|------|
| **Jonah** (BE) | Photo search API, comparison image generation endpoint (`sharp.ts` composite), photo deletion (R2 cleanup), job deletion (cascade + R2 cleanup), rate limiting |
| **Robert** (Designer) | Finalize design spec. All screens with interaction states. Hand off to Zara. |

### Day 5-7: Mobile Implementation

| Who | What |
|-----|------|
| **Zara** (Mobile) | Expo app: Clerk auth screens, home screen (job list + active job indicator), job creation modal, camera FAB + expo-camera integration, photo compression pipeline, R2 upload via presigned URLs, upload retry queue, job photo timeline with type badges + filter chips, full-screen photo viewer |

### Day 8-9: Features + Polish

| Who | What |
|-----|------|
| **Zara** (Mobile) | Before/after comparison generator (selection mode + preview + share), photo search screen, upgrade prompt, profile screen, native share sheet integration, pull-to-refresh, infinite scroll pagination |

### Day 9: Design Review

| Who | What |
|-----|------|
| **Robert** (Designer) | Lightweight visual review of Zara's implementation against design spec. Flag any design drift. |

### Day 10: QA + Docs (Parallel)

| Who | What |
|-----|------|
| **Enzo** (QA) | Full test pass: auth flows, job CRUD (create, edit, archive, delete), photo capture + upload + classification, upload retry queue, comparison generation + share, free tier gating (10 jobs), payment flow, photo search, edge cases (no connection, Gemini down, R2 timeout) |
| **Nadia** (Writer) | App Store description, brief FAQ, privacy policy (photo storage, AI classification, data handling) |
| **Zara** (Mobile) | Bug fixes from QA |

### Day 11: Ship

- Submit to Apple App Store
- Enzo final sign-off
- Post-launch monitoring

---

## 17. Open Questions for Thomas

1. **Apple IAP vs. External Purchase Link:** Same decision as VoiceNote Pro. At $5/month, Apple's 30% cut is $1.50, leaving $3.50 net in year 1. Stripe Checkout flow works for both options.

2. **Portfolio-level R2 bucket naming:** Should we use `sitesnap-photos` (product-specific) or `sherlock-photos` (portfolio-level, shared across future camera products)? Product-specific is simpler now; portfolio-level avoids a migration later. Recommendation: start with `sitesnap-photos`, rename if/when CrackReport ships and a shared bucket makes sense.

---

## 18. Decisions Made

| # | Decision | Rationale |
|---|----------|-----------|
| ADR-001 | Separate camera-products monorepo (not in VoiceNote repo) | Voice and camera products share infrastructure boilerplate but no product-specific code. Separate repos keep workspaces focused. |
| ADR-002 | Client-side compression before upload (2048px, JPEG 80%) | Cellular connections at job sites demand small uploads. 2048px is sufficient for AI classification and comparison output. |
| ADR-003 | Single R2 bucket with user-scoped keys | Simpler than per-user buckets. Presigned URLs control access. Key paths enable clean deletion. |
| ADR-004 | Sharp on the Express server (no separate service) | Sharp is fast enough for v1 volume. Clean service boundary in `services/sharp.ts` enables extraction later. |
| ADR-005 | Async classification -- photo always saves first | Classification failure never causes data loss. Users can classify manually if Gemini is down. |
| ADR-006 | Zustand + AsyncStorage -- no local SQLite | SiteSnap photos require network for upload + classification. Local-first architecture is unnecessary overhead. expo-image cache handles offline viewing. |
| N/A | Direct-to-R2 upload via presigned URLs | Express server never proxies photo bytes. Keeps API server lightweight. |
| N/A | Sequential upload queue (not parallel) | More reliable on weak cellular connections. One photo at a time gets full bandwidth. |
| N/A | Short polling for classification status (not WebSocket) | Simpler infrastructure. Classification takes 1-3 seconds. Polling for 10 seconds is sufficient. |
| N/A | expo-image for thumbnail caching (not custom cache) | Built-in disk caching, blurhash placeholders, transition animations. No custom cache layer needed. |
| N/A | 0.6 confidence threshold (conservative) | Rather show "unclassified" than a wrong classification. Track reclassifications in PostHog to tune over time. |

---

*Technical approach written by Andrei (Technical Architect) for Sherlock Labs. February 2026.*
