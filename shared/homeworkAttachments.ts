export const HOMEWORK_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const HOMEWORK_SUBMISSION_FILE_LIMIT = 5;

export const HOMEWORK_ALLOWED_FILE_TYPES: Record<string, readonly string[]> = {
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  gif: ["image/gif"],
  pdf: ["application/pdf"],
  doc: ["application/msword", "application/octet-stream"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ],
  ppt: ["application/vnd.ms-powerpoint", "application/octet-stream"],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/octet-stream",
  ],
  xls: ["application/vnd.ms-excel", "application/octet-stream"],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
  ],
  txt: ["text/plain", "application/octet-stream"],
  odt: ["application/vnd.oasis.opendocument.text", "application/octet-stream"],
};

export const HOMEWORK_FILE_ACCEPT = Object.keys(HOMEWORK_ALLOWED_FILE_TYPES)
  .map((extension) => `.${extension}`)
  .join(",");

export const HOMEWORK_MEDIA_URL =
  /^\/uploads\/homework-media\/((?:([0-9a-f-]{36})-)?[0-9a-f-]{36}\.([a-z0-9]+))$/i;

export interface HomeworkSubmissionAttachmentInput {
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export function homeworkFileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function isAllowedHomeworkFile(name: string, mimeType: string): boolean {
  const allowed = HOMEWORK_ALLOWED_FILE_TYPES[homeworkFileExtension(name)];
  return Boolean(allowed?.includes(mimeType));
}

export function parseHomeworkMediaUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return HOMEWORK_MEDIA_URL.test(trimmed) ? trimmed : null;
}

export function homeworkMediaOwnerId(url: string): string | null {
  return url.match(HOMEWORK_MEDIA_URL)?.[2] ?? null;
}

function cleanOriginalName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.replace(/\\/g, "/").split("/").pop()?.trim() ?? "";
  if (!name || name.length > 180 || /[\u0000-\u001f\u007f]/.test(name)) return null;
  return name;
}

export function parseHomeworkSubmissionAttachments(
  value: unknown,
  ownerUserId: string,
): HomeworkSubmissionAttachmentInput[] | null {
  if (!Array.isArray(value) || value.length > HOMEWORK_SUBMISSION_FILE_LIMIT) return null;
  const parsed: HomeworkSubmissionAttachmentInput[] = [];
  const seen = new Set<string>();

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") return null;
    const item = candidate as Record<string, unknown>;
    const url = parseHomeworkMediaUrl(item.url);
    const originalName = cleanOriginalName(item.originalName);
    const size = Number(item.size);
    if (
      !url
      || homeworkMediaOwnerId(url) !== ownerUserId
      || !originalName
      || !Number.isSafeInteger(size)
      || size <= 0
      || size > HOMEWORK_FILE_MAX_BYTES
      || seen.has(url)
    ) {
      return null;
    }
    const storedExtension = url.match(HOMEWORK_MEDIA_URL)?.[3]?.toLowerCase() ?? "";
    if (
      homeworkFileExtension(originalName) !== storedExtension
      || !HOMEWORK_ALLOWED_FILE_TYPES[storedExtension]
    ) {
      return null;
    }
    parsed.push({
      url,
      originalName,
      mimeType: HOMEWORK_ALLOWED_FILE_TYPES[storedExtension][0],
      size,
    });
    seen.add(url);
  }

  return parsed;
}
