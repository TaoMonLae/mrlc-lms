import { apiSend, authHeaders } from './api';
import {
  HOMEWORK_FILE_ACCEPT,
  HOMEWORK_FILE_MAX_BYTES,
  HOMEWORK_SUBMISSION_FILE_LIMIT,
  validateHomeworkFile,
} from '../../shared/homeworkAttachments';

export {
  HOMEWORK_FILE_ACCEPT,
  HOMEWORK_FILE_MAX_BYTES,
  HOMEWORK_SUBMISSION_FILE_LIMIT,
  validateHomeworkFile,
};

export interface HomeworkUploadedFile {
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export async function uploadHomeworkFile(file: File): Promise<HomeworkUploadedFile> {
  const validationError = validateHomeworkFile(file);
  if (validationError) throw new Error(validationError);

  const body = new FormData();
  body.append('file', file);
  const response = await fetch('/api/homework-media', { method: 'POST', headers: authHeaders(), body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Upload failed');
  return {
    url: data.url,
    originalName: data.originalName || file.name,
    mimeType: data.mimeType || file.type || 'application/octet-stream',
    size: Number(data.size) || file.size,
  };
}

export function isUploadedHomeworkMedia(url: string | null | undefined): boolean {
  return Boolean(url?.startsWith('/uploads/homework-media/'));
}

export async function removeUnusedHomeworkMedia(url: string | null | undefined): Promise<void> {
  if (!isUploadedHomeworkMedia(url)) return;
  await apiSend('/api/homework-media', 'DELETE', { url });
}

export function formatHomeworkFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isHomeworkImage(file: Pick<HomeworkUploadedFile, 'mimeType' | 'url'>): boolean {
  return file.mimeType.startsWith('image/')
    || /\.(?:png|jpe?g|webp|gif)$/i.test(file.url);
}
