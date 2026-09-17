import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiGet, apiSend } from '../../lib/api';
import { getVideoEmbedUrl, getVideoPlaybackSrc, isDirectVideoUrl, isValidVideoSourceUrl } from '../../lib/video';
import { getYouTubeVideoId } from '../../../shared/videoSource';
import { YouTubeLessonPlayer } from './YouTubeLessonPlayer';
export function VideoSourcePreview({ source }: { source: string }) {
  const [open, setOpen] = useState(false); const [message, setMessage] = useState(''); const [checking, setChecking] = useState(false);
  useEffect(() => { setOpen(false); setMessage(''); }, [source]);
  const check = async () => {
    setMessage(''); setChecking(true);
    try {
      if (source.startsWith('/uploads/videos/')) {
        await apiSend('/api/videos/media-session', 'POST');
        const status = await apiGet<{ ready: boolean; failed: boolean }>(`/api/videos/transcode-status?file=${encodeURIComponent(source.split('/').pop()!)}`);
        if (!status.ready) { setMessage(status.failed ? 'Conversion failed. Upload an MP4 replacement.' : 'The upload is still converting. Try the preview again when ready.'); return; }
      }
      setOpen(true);
    } catch (e: any) { setMessage(e.message); } finally { setChecking(false); }
  };
  const embed = getVideoEmbedUrl(source || '');
  return <div className="space-y-2 rounded-lg border border-border bg-card p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">Playback Check</p><Button type="button" size="sm" variant="outline" disabled={!isValidVideoSourceUrl(source || '') || checking} onClick={() => open ? setOpen(false) : check()}>{checking ? 'Checking…' : open ? 'Close Preview' : 'Preview Playback'}</Button></div><p className="text-xs text-muted-foreground">Play the preview before publishing. Embed restrictions and browser blocking can differ for each viewer; this is not a guarantee of availability.</p>{message && <p role="alert" className="text-sm text-destructive">{message}</p>}{open && <div key={source} className="aspect-video min-h-[200px] overflow-hidden rounded-md bg-black">{getYouTubeVideoId(source) ? <YouTubeLessonPlayer source={source} title="Video playback preview" track={false} onProgress={() => {}} onFlush={() => {}} /> : embed ? <iframe title="Video playback preview" src={embed} className="h-full w-full" referrerPolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : isDirectVideoUrl(source) ? <video className="h-full w-full" controls playsInline src={getVideoPlaybackSrc(source)} onError={() => setMessage('Preview could not play. Check the URL, conversion status, or format.')} /> : <p className="p-4 text-sm text-white">This URL has no supported embedded player.</p>}</div>}</div>;
}
