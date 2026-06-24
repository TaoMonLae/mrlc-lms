const DIRECT_VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v|avi|mkv|flv|wmv)(\?.*)?$/i;

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

export function isDirectVideoUrl(value: string): boolean {
  if (!value) return false;
  return value.startsWith('/uploads/videos/') || DIRECT_VIDEO_EXTENSIONS.test(value);
}

export function getVideoPlaybackSrc(value: string): string {
  return value;
}

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

function youtubeEmbed(id: string): string {
  const cleanId = id.split('?')[0].split('&')[0];
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  });
  return `https://www.youtube.com/embed/${cleanId}?${params.toString()}`;
}

function getPathId(pathname: string, prefixes: string[]): string | null {
  const parts = pathname.split('/').filter(Boolean);
  for (const prefix of prefixes) {
    const index = parts.indexOf(prefix);
    if (index !== -1 && parts[index + 1]) return parts[index + 1];
  }
  return null;
}
