import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { loadYouTubeAPI, youtubeErrorMessage, type YouTubePlayer } from '../../lib/youtubePlayer';
import { getVideoEmbedUrl, getVideoStartSeconds } from '../../../shared/videoSource';
export interface LessonPlayerHandle { seek(seconds: number): void; currentTime(): number; }
export const YouTubeLessonPlayer = forwardRef<LessonPlayerHandle, {
  source: string; title: string; startPosition?: number; track: boolean;
  onProgress: (position: number, completed: boolean, duration?: number) => void;
  onFlush: (position: number, completed: boolean, duration?: number) => void;
}>(({ source, title, startPosition = 0, track, onProgress, onFlush }, ref) => {
  const iframe = useRef<HTMLIFrameElement>(null); const player = useRef<YouTubePlayer | null>(null);
  const callbacks = useRef({ onProgress, onFlush, track }); callbacks.current = { onProgress, onFlush, track };
  const [error, setError] = useState('');
  const url = new URL(getVideoEmbedUrl(source)!);
  url.searchParams.set('enablejsapi', '1'); url.searchParams.set('origin', window.location.origin);
  if (startPosition > 0) url.searchParams.set('start', String(Math.floor(startPosition)));
  const initialSrc = useRef(url.toString());
  useImperativeHandle(ref, () => ({ seek: seconds => { player.current?.seekTo(seconds, true); }, currentTime: () => player.current?.getCurrentTime() ?? startPosition }));
  useEffect(() => {
    let active = true; let interval: ReturnType<typeof setInterval> | undefined;
    const flush = (completed = false) => {
      const p = player.current;
      if (p && callbacks.current.track && p.getCurrentTime() > 0) callbacks.current.onFlush(p.getCurrentTime(), completed, p.getDuration());
    };
    loadYouTubeAPI().then(api => {
      if (!active || !iframe.current) return;
      player.current = new api.Player(iframe.current, { events: {
        onReady: ({ target }) => {
          if (!active) return;
          setError('');
          const resume = startPosition || getVideoStartSeconds(source);
          if (resume > 0) target.seekTo(Math.min(resume, Math.max(0, target.getDuration() - 0.25) || resume), true);
          if (interval) clearInterval(interval);
          interval = setInterval(() => {
            if (target.getPlayerState() === 1 && callbacks.current.track) callbacks.current.onProgress(target.getCurrentTime(), false, target.getDuration());
          }, 1000);
        },
        onStateChange: ({ data }) => { if (active && (data === 2 || data === 0)) flush(data === 0); },
        onError: ({ data }) => { if (active) setError(youtubeErrorMessage(data)); },
      } });
    }).catch(error => { if (active) setError(error.message); });
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    const onPageHide = () => flush();
    document.addEventListener('visibilitychange', onHide); window.addEventListener('pagehide', onPageHide);
    return () => { active = false; flush(); if (interval) clearInterval(interval); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', onPageHide); player.current?.destroy(); player.current = null; };
  }, [source]);
  return <div className="relative h-full w-full"><iframe ref={iframe} src={initialSrc.current} title={title} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
    {error && <div role="alert" className="absolute inset-x-0 top-0 bg-destructive px-4 py-3 text-sm text-white">{error}</div>}
  </div>;
});
YouTubeLessonPlayer.displayName = 'YouTubeLessonPlayer';
