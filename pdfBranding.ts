import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const BRANDING_ASSET_DIR = process.env.BRANDING_ASSET_DIR
  || path.join(process.cwd(), "data", "branding");
const BRANDING_URL_PREFIX = "/uploads/branding/";

/**
 * Load an uploaded school logo and normalize it to PNG for PDFKit.
 *
 * The branding uploader accepts PNG, JPEG, WEBP, GIF, and SVG, while PDFKit
 * only embeds PNG/JPEG reliably. Sharp gives every supported upload format the
 * same PDF behavior and bounds the decoded image before it reaches PDFKit.
 */
export async function loadPdfLogo(
  logoUrl: string | null | undefined,
  assetDir = BRANDING_ASSET_DIR,
): Promise<Buffer | null> {
  if (!logoUrl?.startsWith(BRANDING_URL_PREFIX)) return null;
  const filename = logoUrl.slice(BRANDING_URL_PREFIX.length).split(/[?#]/, 1)[0];
  if (!filename || filename !== path.basename(filename)) return null;

  try {
    const input = await fs.readFile(path.join(assetDir, filename));
    return await sharp(input, { animated: false, limitInputPixels: 40_000_000 })
      .rotate()
      .resize(512, 512, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

/**
 * Draw the configured logo or a neutral school-initial fallback.
 */
export function drawPdfLogo(
  doc: PDFKit.PDFDocument,
  logo: Buffer | null,
  schoolName: string | null | undefined,
  x: number,
  y: number,
  size: number,
): void {
  if (logo) {
    doc.image(logo, x, y, {
      fit: [size, size],
      align: "center",
      valign: "center",
    });
    return;
  }

  doc.roundedRect(x, y, size, size, 6).fill("#f1f5f9");
  doc.font("Helvetica-Bold").fontSize(Math.max(16, Math.round(size * 0.45))).fillColor("#94a3b8")
    .text((schoolName || "S").charAt(0).toUpperCase(), x, y + size * 0.24, {
      width: size,
      align: "center",
    });
  doc.fillColor("#000000");
}
