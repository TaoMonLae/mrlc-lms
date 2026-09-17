const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const isDomain = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

function sourceUrl(value: string): URL | null {
  try {
    // Share menus/clipboard tools sometimes append the video title to the URL.
    const url = new URL(value.trim().split(/\s+/)[0]);
    return ['https:', 'http:'].includes(url.protocol) ? url : null;
  } catch { return null; }
}
function isYouTube(url: URL) {
  return isDomain(url.hostname, 'youtube.com') || isDomain(url.hostname, 'youtube-nocookie.com') || url.hostname === 'youtu.be';
}
export function getYouTubeVideoId(value: string): string | null {
  const url = sourceUrl(value);
  if (!url || !isYouTube(url)) return null;
  const path = url.pathname.split('/').filter(Boolean);
  const candidate = url.hostname === 'youtu.be' ? path[0]
    : url.searchParams.get('v') || (['embed', 'shorts', 'live', 'v'].includes(path[0]) ? path[1] : null);
  // Also handle titles encoded into a watch query value rather than raw spaces.
  const id = candidate?.split(/\s+/)[0];
  return id && YOUTUBE_ID.test(id) ? id : null;
}
export function getVideoStartSeconds(value: string): number {
  const url = sourceUrl(value);
  const raw = url?.searchParams.get('start') || url?.searchParams.get('t') || url?.hash.match(/^#t=(.*)$/)?.[1] || '';
  if (/^\d+$/.test(raw)) return Math.min(Number(raw), 86400);
  const time = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return time && raw ? Math.min(Number(time[1] || 0) * 3600 + Number(time[2] || 0) * 60 + Number(time[3] || 0), 86400) : 0;
}
export function normalizeVideoSourceUrl(value: string): string {
  const id = getYouTubeVideoId(value);
  if (id) {
    const params = new URLSearchParams({ v: id });
    const start = getVideoStartSeconds(value);
    if (start) params.set('t', `${start}s`);
    return `https://www.youtube.com/watch?${params}`;
  }
  return value.trim();
}
export function isValidVideoSourceUrl(value: string): boolean {
  if (/^\/uploads\/videos\/[^/?#\s]+(?:\?[^\s]*)?$/.test(value) && !value.includes('..')) return true;
  const url = sourceUrl(value);
  if (!url) return false;
  if (isYouTube(url)) return Boolean(getYouTubeVideoId(value));
  // Non-provider links must be real URLs, not a URL followed by arbitrary text.
  return !/\s/.test(value.trim());
}
export function getVideoEmbedUrl(value: string): string | null {
  const id = getYouTubeVideoId(value);
  if (id) {
    const params = new URLSearchParams({ rel: '0', playsinline: '1' });
    const start = getVideoStartSeconds(value);
    if (start) params.set('start', String(start));
    return `https://www.youtube.com/embed/${id}?${params}`;
  }
  const url = sourceUrl(value);
  if (url && isDomain(url.hostname, 'vimeo.com')) {
    const id = url.pathname.split('/').filter(Boolean).pop();
    if (id && /^\d+$/.test(id)) {
      const params = new URLSearchParams();
      const hash = url.searchParams.get('h');
      if (hash && /^[A-Za-z0-9]+$/.test(hash)) params.set('h', hash);
      return `https://player.vimeo.com/video/${id}${params.size ? `?${params}` : ''}`;
    }
  }
  return null;
}
