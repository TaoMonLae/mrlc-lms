const DIRECT_VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v|avi|mkv|flv|wmv)(\?.*)?$/i;

/**
 * Formats a duration in seconds to a readable time string.
 * @param seconds - The duration in seconds, or undefined/null
 * @returns A formatted time string in "h:mm:ss" or "mm:ss" format, or empty string if no duration
 * @example
 * formatDuration(90) // returns "1:30"
 * formatDuration(3661) // returns "1:01:01"
 * formatDuration() // returns ""
 */
export function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Formats a duration in seconds to a verbose text format.
 * @param seconds - The duration in seconds, or undefined/null
 * @returns A human-readable duration string like "1h 2m 3s" or "Unknown"
 * @example
 * formatDurationVerbose(90) // returns "1m 30s"
 * formatDurationVerbose(3661) // returns "1h 1m 1s"
 * formatDurationVerbose() // returns "Unknown"
 */
export function formatDurationVerbose(seconds?: number): string {
  if (!seconds) return 'Unknown';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

/**
 * Validates whether a value is a valid video source URL.
 * Supports uploaded video files, YouTube, Vimeo, and direct HTTP(S) URLs.
 * @param value - The URL string to validate
 * @returns true if the URL is a valid video source, false otherwise
 */
export function isValidVideoSourceUrl(value: string): boolean {
  if (!value) return false;
  if (value.startsWith('/uploads/videos/')) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Checks if a URL points to a direct video file (uploaded or direct link).
 * @param value - The URL string to check
 * @returns true if the URL is a direct video file, false otherwise
 */
export function isDirectVideoUrl(value: string): boolean {
  if (!value) return false;
  return value.startsWith('/uploads/videos/') || DIRECT_VIDEO_EXTENSIONS.test(value);
}

/**
 * Returns the playback source URL for a video.
 * Currently returns the input URL unchanged, but provides a hook for future transformations.
 * @param value - The video URL
 * @returns The same video URL
 */
export function getVideoPlaybackSrc(value: string): string {
  return value;
}

/**
 * Generates an embed URL for supported video platforms (YouTube, Vimeo).
 * @param value - The video URL to generate an embed URL for
 * @returns An embed URL string, or null if the platform is not supported
 * @example
 * getVideoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
 * // returns "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1&playsinline=1"
 */
export function getVideoEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id ? youtubeEmbed(id) : null;
    }

    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const id =
        url.searchParams.get('v') ||
        getPathId(url.pathname, ['embed', 'shorts', 'live', 'v']);
      return id ? youtubeEmbed(id) : null;
    }

    if (host.endsWith('vimeo.com')) {
      const id = url.pathname.split('/').filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Generates a YouTube embed URL with appropriate parameters.
 * @param id - The YouTube video ID
 * @returns A complete embed URL for YouTube's iframe player
 */
function youtubeEmbed(id: string): string {
  const cleanId = id.split('?')[0].split('&')[0];
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  });
  return `https://www.youtube.com/embed/${cleanId}?${params.toString()}`;
}

/**
 * Extracts an ID from a URL path using known prefix patterns.
 * @param pathname - The URL pathname
 * @param prefixes - Array of path prefixes to search for (e.g., ['embed', 'shorts'])
 * @returns The ID following the prefix, or null if not found
 */
function getPathId(pathname: string, prefixes: string[]): string | null {
  const parts = pathname.split('/').filter(Boolean);
  for (const prefix of prefixes) {
    const index = parts.indexOf(prefix);
    if (index !== -1 && parts[index + 1]) return parts[index + 1];
  }
  return null;
}

/**
 * Extracts a thumbnail URL for YouTube and Vimeo videos.
 * For YouTube, returns the high-quality (maxresdefault) thumbnail.
 * For Vimeo, returns a thumbnail from Vumbnail service.
 * @param videoUrl - The URL of the video
 * @returns A thumbnail URL string, or null if unavailable
 * @example
 * getVideoThumbnailUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
 * // returns "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
 */
export function getVideoThumbnailUrl(videoUrl: string): string | null {
  try {
    const url = new URL(videoUrl);
    const host = url.hostname.replace(/^www\./, '');

    // YouTube
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;
    }

    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const id =
        url.searchParams.get('v') ||
        getPathId(url.pathname, ['embed', 'shorts', 'live', 'v']);
      return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;
    }

    // Vimeo
    if (host.endsWith('vimeo.com')) {
      const id = url.pathname.split('/').filter(Boolean).pop();
      if (id) {
        // Vimeo thumbnails are fetched via oEmbed
        return `https://vumbnail.com/${id}.jpg`;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Auto-generates a thumbnail URL from a video URL when possible.
 * Checks for an existing thumbnail first, then attempts to extract from YouTube/Vimeo.
 * @param videoUrl - The URL of the video
 * @param existingThumbnail - An existing thumbnail URL to use if available
 * @returns A thumbnail URL string, or empty string if unavailable
 * @example
 * autoGenerateThumbnail("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
 * // returns "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
 * autoGenerateThumbnail("https://example.com/video.mp4", "https://example.com/thumb.jpg")
 * // returns "https://example.com/thumb.jpg"
 */
export function autoGenerateThumbnail(videoUrl: string, existingThumbnail?: string): string {
  // If thumbnail already exists, use it
  if (existingThumbnail) return existingThumbnail;

  // Try to get thumbnail from video service
  const autoThumbnail = getVideoThumbnailUrl(videoUrl);
  if (autoThumbnail) return autoThumbnail;

  // No auto-thumbnail available
  return '';
}

