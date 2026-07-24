/**
 * Video-related constants and configuration
 */

/**
 * Maximum file size for video uploads (2GB in bytes)
 */
export const MAX_VIDEO_FILE_SIZE = 2 * 1024 * 1024 * 1024;

/**
 * Maximum file size formatted for display
 */
export const MAX_VIDEO_FILE_SIZE_DISPLAY = '2GB';

/**
 * Videos larger than this are automatically compressed (re-encoded smaller)
 * in the background after upload, regardless of the 2GB ceiling above.
 */
export const AUTO_COMPRESS_VIDEO_FILE_SIZE = 250 * 1024 * 1024;

/**
 * Allowed MIME types for video uploads
 */
export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/x-flv',
  'video/x-ms-wmv',
  'video/mp2t', // .mts / .m2ts / .ts (AVCHD, transport stream)
  'video/x-m4v',
  'video/mpeg',
  'video/3gpp',
] as const;

/**
 * Allowed file extensions for video uploads. Non-web formats (.mts, .m2ts,
 * .avi, .mkv, .wmv, .flv, .mov, …) are transcoded to MP4 on the server so they
 * play directly in the browser.
 */
export const ALLOWED_VIDEO_EXTENSIONS = [
  '.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv',
  '.mts', '.m2ts', '.ts', '.m4v', '.mpg', '.mpeg', '.3gp',
] as const;

/**
 * Formats that browsers can play directly (no server transcode needed).
 */
export const WEB_NATIVE_VIDEO_EXTENSIONS = ['.mp4', '.webm'] as const;

/**
 * Auto-hide delay for video player controls (milliseconds)
 */
export const VIDEO_CONTROLS_AUTO_HIDE_DELAY = 3000;

/**
 * Debounce delay for saving video progress (milliseconds)
 */
export const VIDEO_PROGRESS_SAVE_DELAY = 2000;

/**
 * Progress threshold (percentage) to mark video as completed
 */
export const VIDEO_COMPLETION_THRESHOLD = 90;

/**
 * Minimum watch time (seconds) before showing "resume from" indicator
 */
export const VIDEO_RESUME_MIN_SECONDS = 5;

/**
 * YouTube thumbnail quality options
 */
export const YOUTUBE_THUMBNAIL_QUALITIES = {
  MAXRES: 'maxresdefault',
  HIGH: 'hqdefault',
  MEDIUM: 'mqdefault',
  STANDARD: 'sddefault',
} as const;

/**
 * Video playback speed options
 */
export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
