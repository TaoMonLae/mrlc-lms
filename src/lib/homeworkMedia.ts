import { apiSend, authHeaders } from './api';

export const HOMEWORK_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const HOMEWORK_FILE_ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.pdf,.doc,.docx';

const allowedExtensions = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf', 'doc', 'docx']);

export function validateHomeworkFile(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!allowedExtensions.has(extension)) return 'Choose a PNG, JPG, WEBP, GIF, PDF or Word file';
  if (file.size > HOMEWORK_FILE_MAX_BYTES) return 'File must be 10 MB or smaller';
  return null;
}

export async function uploadHomeworkFile(file: File): Promise<string> {
  const validationError = validateHomeworkFile(file);
  if (validationError) throw new Error(validationError);

  const body = new FormData();
  body.append('file', file);
  const response = await fetch('/api/homework-media', { method: 'POST', headers: authHeaders(), body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Upload failed');
  return data.url;
}

export function isUploadedHomeworkMedia(url: string | null | undefined): boolean {
  return Boolean(url?.startsWith('/uploads/homework-media/'));
}

export async function removeUnusedHomeworkMedia(url: string | null | undefined): Promise<void> {
  if (!isUploadedHomeworkMedia(url)) return;
  await apiSend('/api/homework-media', 'DELETE', { url });
}
