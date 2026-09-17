export interface YouTubePlayer {
  getCurrentTime(): number; getDuration(): number; getPlayerState(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void; playVideo(): void; destroy(): void;
}
export interface YouTubeAPI {
  Player: new (element: HTMLIFrameElement, options: { events: {
    onReady: (event: { target: YouTubePlayer }) => void;
    onStateChange: (event: { target: YouTubePlayer; data: number }) => void;
    onError: (event: { data: number }) => void;
  } }) => YouTubePlayer;
}
declare global { interface Window { YT?: YouTubeAPI; onYouTubeIframeAPIReady?: () => void; } }
let pending: Promise<YouTubeAPI> | null = null;
export function loadYouTubeAPI(): Promise<YouTubeAPI> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => { document.querySelector('script[data-youtube-api]')?.remove(); pending = null; reject(new Error('YouTube controls could not load. Retry or open the original video.')); }, 15000);
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      try { previous?.(); } finally { if (window.YT?.Player) resolve(window.YT); }
    };
    let script = document.querySelector<HTMLScriptElement>('script[data-youtube-api]');
    if (!script) {
      script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api'; script.dataset.youtubeApi = 'true'; document.head.append(script);
    }
    script.onerror = () => { clearTimeout(timeout); script?.remove(); pending = null; reject(new Error('YouTube controls were blocked. Retry or open the original video.')); };
  });
  return pending;
}
export function youtubeErrorMessage(code: number) {
  if (code === 100) return 'This video was removed or is private. Ask your teacher for another video.';
  if (code === 101 || code === 150) return 'The owner does not allow this video to play inside websites. Open the original video.';
  if (code === 153) return 'YouTube could not identify this website. Check browser privacy settings or open the original video.';
  return 'YouTube could not play this video. Retry the player or open the original video.';
}
