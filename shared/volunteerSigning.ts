import crypto from 'node:crypto';
import sharp from 'sharp';
import type { VolunteerDocumentPayload, VolunteerSigningStatus } from './volunteerDocuments';

export class VolunteerSigningError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** Accept raster bytes only; never fetch a URL supplied by a client. */
export async function normalizeVolunteerMark(value: unknown, kind: 'signature' | 'chop'): Promise<string> {
  const label = kind === 'signature' ? 'Signature' : 'School chop';
  if (typeof value !== 'string' || value.length > Math.ceil(2 * 1024 * 1024 / 3) * 4 + 100) {
    throw new VolunteerSigningError(`${label} must be a PNG, JPEG or WebP image no larger than 2 MB.`);
  }
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new VolunteerSigningError(`${label} must be uploaded as a PNG, JPEG or WebP image.`);
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 2 * 1024 * 1024 || bytes.toString('base64') !== match[2]) {
    throw new VolunteerSigningError(`${label} contains invalid image data or exceeds 2 MB.`);
  }
  try {
    const metadata = await sharp(bytes, { limitInputPixels: 4_000_000 }).metadata();
    if (!['png', 'jpeg', 'webp'].includes(metadata.format || '') || metadata.format !== match[1]
      || !metadata.width || !metadata.height || (metadata.pages || 1) !== 1) {
      throw new Error('Unsupported raster');
    }
    const normalized = await sharp(bytes, { limitInputPixels: 4_000_000 })
      .rotate().resize({ width: kind === 'signature' ? 1200 : 800, height: kind === 'signature' ? 400 : 800,
        fit: 'inside', withoutEnlargement: true }).ensureAlpha().png({ compressionLevel: 9 }).toBuffer();
    if (normalized.length > 1024 * 1024) throw new Error('Image too large after normalization');
    const { data, info } = await sharp(normalized).raw().toBuffer({ resolveWithObject: true });
    let ink = 0; let left = info.width; let right = 0; let top = info.height; let bottom = 0;
    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        const i = (y * info.width + x) * 4;
        const alpha = data[i + 3] / 255;
        if (alpha > 0.1 && Math.max(255 - data[i], 255 - data[i + 1], 255 - data[i + 2]) * alpha > 20) {
          ink += 1; left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
      }
    }
    if (ink < 32 || right - left < 12 || bottom - top < 4 || ink / (info.width * info.height) > 0.98) {
      throw new VolunteerSigningError(`${label} is blank or does not contain a clear visible mark.`);
    }
    return `data:image/png;base64,${normalized.toString('base64')}`;
  } catch (error) {
    if (error instanceof VolunteerSigningError) throw error;
    throw new VolunteerSigningError(`${label} could not be read. Use a single PNG, JPEG or WebP image up to 4 megapixels.`);
  }
}

function canonical(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, canonical(item)]),
  );
  return value;
}

export interface VolunteerSigningContent {
  id: string; documentNumber: string; type: string; recipientName: string; role: string;
  fromMonth: string; toMonth: string; issueDate: Date | string; payload: unknown;
  signatoryUserId?: string | null; organizationSignatoryUserId?: string | null;
}

/** Bind consent to the immutable issued content, not mutable status/download counters. */
export function volunteerContentHash(document: VolunteerSigningContent): string {
  return crypto.createHash('sha256').update(JSON.stringify(canonical({
    id: document.id, documentNumber: document.documentNumber, type: document.type,
    recipientName: document.recipientName, role: document.role,
    fromMonth: document.fromMonth, toMonth: document.toMonth,
    issueDate: new Date(document.issueDate).toISOString(), payload: document.payload,
    signatoryUserId: document.signatoryUserId || null,
    organizationSignatoryUserId: document.organizationSignatoryUserId || null,
  }))).digest('hex');
}

export function volunteerSigningStatus(document: VolunteerSigningContent & {
  signatures?: { slot: string; signerUserId: string; contentHash: string }[];
}): VolunteerSigningStatus {
  const payload = document.payload as VolunteerDocumentPayload;
  // Only genuinely pre-signing records receive the legacy exemption. A new
  // record whose payload version is changed or unknown must fail closed.
  if (payload.version === 1 && !document.signatoryUserId && !document.organizationSignatoryUserId
    && !document.signatures?.length) return 'NOT_REQUESTED';
  if (payload.version !== 2) return 'PENDING';
  const contentHash = volunteerContentHash(document);
  const signed = (slot: string, userId?: string | null) => Boolean(userId && document.signatures?.some(signature =>
    signature.slot === slot && signature.signerUserId === userId && signature.contentHash === contentHash));
  return signed('SCHOOL', document.signatoryUserId)
    && (!payload.organizationSignatory || signed('ORGANIZATION', document.organizationSignatoryUserId)) ? 'SIGNED' : 'PENDING';
}
