/**
 * Server-side image processing with Sharp.
 *
 * Two operations:
 * 1. Thumbnail generation (400px wide) on photo upload confirmation
 * 2. Comparison image compositing (1080x1080) for before/after sharing
 */
import sharp from "sharp";

/**
 * Generate a 400px-wide JPEG thumbnail from an original photo buffer.
 * Used on upload confirmation to create the timeline display image.
 */
export async function generateThumbnail(originalBuffer: Buffer): Promise<Buffer> {
  return sharp(originalBuffer)
    .resize(400, null, { withoutEnlargement: true }) // 400px wide, maintain aspect
    .jpeg({ quality: 80 })
    .toBuffer();
}

/**
 * Generate an SVG text label overlay.
 */
function generateLabelSvg(text: string, width: number, height: number): Buffer {
  const svg = `<svg width="${width}" height="${height}">
    <rect x="0" y="0" width="${width}" height="${height}" fill="rgba(0,0,0,0.6)" />
    <text x="${width / 2}" y="${height / 2 + 6}" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${text}</text>
  </svg>`;
  return Buffer.from(svg);
}

/**
 * Generate the header bar SVG with the job name.
 */
function generateHeaderSvg(jobName: string, width: number, height: number): Buffer {
  // Truncate long job names to prevent overflow
  const displayName = jobName.length > 40 ? jobName.substring(0, 37) + "..." : jobName;
  const svg = `<svg width="${width}" height="${height}">
    <rect x="0" y="0" width="${width}" height="${height}" fill="rgba(0,0,0,0.7)" />
    <text x="${width / 2}" y="${height / 2 + 6}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${escapeXml(displayName)}</text>
  </svg>`;
  return Buffer.from(svg);
}

/**
 * Generate the footer bar SVG with the business name.
 */
function generateFooterSvg(businessName: string | null, width: number, height: number): Buffer {
  const displayName = businessName || "";
  const svg = `<svg width="${width}" height="${height}">
    <rect x="0" y="0" width="${width}" height="${height}" fill="rgba(0,0,0,0.7)" />
    <text x="${width / 2}" y="${height / 2 + 5}" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="white" text-anchor="middle" dominant-baseline="middle">${escapeXml(displayName)}</text>
  </svg>`;
  return Buffer.from(svg);
}

/**
 * Generate the "Made with SiteSnap" watermark SVG.
 */
function generateWatermarkSvg(width: number, height: number): Buffer {
  const svg = `<svg width="${width}" height="${height}">
    <text x="${width / 2}" y="${height / 2 + 4}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="rgba(255,255,255,0.7)" text-anchor="middle" dominant-baseline="middle">Made with SiteSnap</text>
  </svg>`;
  return Buffer.from(svg);
}

/**
 * Escape special XML characters for safe SVG embedding.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generate a 1080x1080 before/after comparison image.
 *
 * Layout:
 * - Left half: "before" photo, center-cropped to fill
 * - Right half: "after" photo, center-cropped to fill
 * - "BEFORE" / "AFTER" labels on semi-transparent dark background
 * - Job name at the top (header bar)
 * - Business name at the bottom (footer bar)
 * - "Made with SiteSnap" watermark in bottom-right corner
 */
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

  // Generate overlay SVGs
  const beforeLabel = generateLabelSvg("BEFORE", HALF, LABEL_HEIGHT);
  const afterLabel = generateLabelSvg("AFTER", HALF, LABEL_HEIGHT);
  const headerSvg = generateHeaderSvg(jobName, CANVAS_SIZE, HEADER_HEIGHT);
  const footerSvg = generateFooterSvg(businessName, CANVAS_SIZE, FOOTER_HEIGHT);
  const watermarkSvg = generateWatermarkSvg(140, 20);

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
      { input: watermarkSvg, left: CANVAS_SIZE - 150, top: CANVAS_SIZE - 25 },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
}
