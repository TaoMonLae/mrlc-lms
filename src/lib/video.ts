import { getYouTubeVideoId } from '../../shared/videoSource';
export { getVideoEmbedUrl, isValidVideoSourceUrl, normalizeVideoSourceUrl } from '../../shared/videoSource';

const DIRECT_VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v|avi|mkv|flv|wmv)(\?.*)?$/i;
export function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
export function formatDurationVerbose(seconds?: number): string {
  if (!seconds) return 'Unknown';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
}
export function isDirectVideoUrl(value: string): boolean {
  return Boolean(value && (value.startsWith('/uploads/videos/') || DIRECT_VIDEO_EXTENSIONS.test(value)));
}
export function getVideoPlaybackSrc(value: string): string { return value; }
export function getVideoThumbnailUrl(value: string): string | null {
  const id = getYouTubeVideoId(value);
  if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  try {
    const url = new URL(value);
    if (url.hostname === 'vimeo.com' || url.hostname.endsWith('.vimeo.com')) {
      const id = url.pathname.split('/').filter(Boolean).pop();
      if (id && /^\d+$/.test(id)) return `https://vumbnail.com/${id}.jpg`;
    }
  } catch { /* Unsupported or invalid source. */ }
  return null;
}
export function autoGenerateThumbnail(videoUrl: string, existingThumbnail?: string): string {
  return existingThumbnail || getVideoThumbnailUrl(videoUrl) || '';
}
