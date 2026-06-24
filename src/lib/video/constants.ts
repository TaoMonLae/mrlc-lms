/**
 * Video-related constants and configuration
 */

/**
 * Maximum file size for video uploads (500MB in bytes)
 */
export const MAX_VIDEO_FILE_SIZE = 500 * 1024 * 1024;

/**
 * Maximum file size formatted for display
 */
export const MAX_VIDEO_FILE_SIZE_DISPLAY = '500MB';

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
] as const;

/**
 * Allowed file extensions for video uploads
 */
export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv'] as const;

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
