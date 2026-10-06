import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { ArrowLeft, Edit2, ExternalLink, RotateCcw, Users, CheckCircle2, AlertTriangle, PlayCircle, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions, useUser } from '../../lib/permissions';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getVideoEmbedUrl, getVideoPlaybackSrc, isDirectVideoUrl, normalizeVideoSourceUrl, isValidVideoSourceUrl } from '../../lib/video';
import { apiGet } from '../../lib/api';
import { useVideoProgress } from '../../hooks/useVideoProgress';
import { VideoPlayerControls } from '../../components/VideoPlayerControls';
import { VIDEO_RESUME_MIN_SECONDS } from '../../lib/video/constants';
import type { VideoLesson, VideoAnalytics } from '../../lib/video/types';
import { getYouTubeVideoId } from '../../../shared/videoSource';
import { YouTubeLessonPlayer, type LessonPlayerHandle } from '../../components/video/YouTubeLessonPlayer';
import { VideoLearningWorkspace } from '../../components/video/VideoLearningWorkspace';
import { VideoLessonSidebar } from '../../components/video/VideoLessonSidebar';
import { VideoPlaylists } from '../../components/video/VideoPlaylists';
import '../../components/video/video-learning.css';

export default function VideoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { isAdmin, isTeacher } = usePermissions();

  const [video, setVideo] = useState<VideoLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<VideoAnalytics | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeRef = useRef<LessonPlayerHandle>(null);
  const playerFrameRef = useRef<HTMLDivElement>(null);
  const [noteCapture, setNoteCapture] = useState({ sequence: 0, seconds: 0 });
  const restoredVideoRef = useRef<string | null>(null);

  // Enable progress tracking for students and teachers (not admins)
  const shouldTrackProgress = !isAdmin;
  const {
    progress,
    saveProgress,
    saveProgressImmediate,
    startPosition,
    isCompleted,
    loading: progressLoading,
    error: progressError,
  } = useVideoProgress({
    videoId: id || '',
    enabled: shouldTrackProgress && !!video,
    duration: video?.duration,
  });

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true); setVideo(null); setAnalytics(null); setNoteCapture({ sequence: 0, seconds: 0 });
    const fetchVideo = async () => {
      try {
        const v = await apiGet<VideoLesson>(`/api/videos/${id}`, { signal: controller.signal });
        if (v.videoUrl.startsWith('/uploads/videos/')) {
          const token = sessionStorage.getItem('auth_token');
          await fetch('/api/videos/media-session', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        }
        if (controller.signal.aborted) return;
        setVideo(v);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Error fetching video:', error);
        if ((error as Error).message !== 'Request failed (404)') {
          toast.error('Failed to load video');
        }
        setVideo(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchVideo();
    return () => controller.abort();
  }, [id]);

  // Teachers/admins: load watch analytics for the intended audience.
  useEffect(() => {
    if (!id || !(isAdmin || isTeacher)) return;
    let active = true;
    const loadAnalytics = () => {
      apiGet<VideoAnalytics>(`/api/videos/${id}/analytics`)
        .then((data) => {
          if (active) setAnalytics(data);
        })
        .catch(() => {});
    };
    loadAnalytics();
    const interval = window.setInterval(loadAnalytics, 15_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [id, isAdmin, isTeacher]);

  // Uploaded videos in a non-web format are transcoded to MP4 in the background;
  // poll until the file is ready so we can show "Converting…" instead of a
  // broken player right after upload.
  const [transcode, setTranscode] = useState<'checking' | 'ready' | 'processing' | 'failed'>('checking');
  const [playbackRevision, setPlaybackRevision] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);
  useEffect(() => {
    const url = video?.videoUrl || '';
    setPlaybackError(false);
    if (!url.startsWith('/uploads/videos/')) { setTranscode('ready'); return; }
    const file = url.split('/').pop();
    if (!file) return;
    // Do not mount <video> until this check completes. Mounting it while a
    // background conversion is still running requests a missing file and some
    // browsers retain that failed response after the file becomes available.
    setTranscode('checking');
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      try {
        const s = await apiGet<{ ready: boolean; failed: boolean }>(
          `/api/videos/transcode-status?file=${encodeURIComponent(file)}`
        );
        if (!active) return;
        if (s.ready) {
          setPlaybackRevision(Date.now());
          setTranscode('ready');
          return;
        }
        if (s.failed) { setTranscode('failed'); return; }
        setTranscode('processing');
        timer = setTimeout(check, 4000);
      } catch {
        // A transient status error is not evidence that a background output is
        // ready. Retry instead of mounting a player with a potentially missing
        // source file.
        if (active) {
          setTranscode('checking');
          timer = setTimeout(check, 4000);
        }
      }
    };
    check();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [video?.videoUrl]);

  // Set up video element event listeners for progress tracking
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !shouldTrackProgress) return;

    const handleTimeUpdate = () => {
      if (videoEl.duration && videoEl.currentTime > 0) {
        saveProgress(videoEl.currentTime, false, videoEl.duration);
      }
    };

    const handlePause = () => {
      if (videoEl.currentTime > 0) {
        saveProgressImmediate(videoEl.currentTime, isCompleted, videoEl.duration);
      }
    };

    const handleEnded = () => {
      saveProgressImmediate(videoEl.duration || 0, true, videoEl.duration);
      toast.success('Video completed! 🎉');
    };

    videoEl.addEventListener('timeupdate', handleTimeUpdate);
    videoEl.addEventListener('pause', handlePause);
    videoEl.addEventListener('ended', handleEnded);

    return () => {
      videoEl.removeEventListener('timeupdate', handleTimeUpdate);
      videoEl.removeEventListener('pause', handlePause);
      videoEl.removeEventListener('ended', handleEnded);
    };
  }, [shouldTrackProgress, saveProgress, saveProgressImmediate, isCompleted, transcode, playbackRevision, video?.videoUrl, playbackError]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (
      !id
      || !videoEl
      || progressLoading
      || restoredVideoRef.current === id
    ) {
      return;
    }

    const restorePosition = () => {
      if (startPosition > 0) {
        const latestPlayablePosition = Number.isFinite(videoEl.duration)
          ? Math.max(0, videoEl.duration - 0.25)
          : startPosition;
        videoEl.currentTime = Math.min(startPosition, latestPlayablePosition);
      }
      restoredVideoRef.current = id;
      videoEl.removeEventListener('loadedmetadata', restorePosition);
    };

    if (videoEl.readyState >= 1) {
      restorePosition();
    } else {
      videoEl.addEventListener('loadedmetadata', restorePosition);
    }

    return () => {
      videoEl.removeEventListener('loadedmetadata', restorePosition);
    };
  }, [id, progressLoading, startPosition, transcode, playbackRevision]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-muted-foreground">Loading video...</span>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-foreground">Video not found</h2>
        <Button variant="link" onClick={() => navigate('/videos')} className="mt-2">Back to Video Lessons</Button>
      </div>
    );
  }

  // Students cannot view teachers-only content even via direct URL
  if (!isAdmin && !isTeacher && video.visibility === 'TEACHERS_ONLY') {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground mt-1 text-sm">This video is only available to teachers.</p>
        <Button variant="link" onClick={() => navigate('/videos')} className="mt-2">Back to Video Lessons</Button>
      </div>
    );
  }

  const canManage = isAdmin || (isTeacher && (video.uploadedById === user?.id || video.uploadedById === user?.teacherId));
  const embedUrl = getVideoEmbedUrl(video.videoUrl);
  const isYouTube = !!getYouTubeVideoId(video.videoUrl);
  const originalUrl = normalizeVideoSourceUrl(video.videoUrl);
  const safeOriginalUrl = isValidVideoSourceUrl(originalUrl) ? originalUrl : null;
  const backPath = isAdmin ? '/videos' : isTeacher ? '/teacher/videos' : '/student/videos';
  const isDirectVideo = !embedUrl && isDirectVideoUrl(video.videoUrl);
  const supportsTimestamps = isYouTube || isDirectVideo;
  const rawPlaybackSrc = getVideoPlaybackSrc(video.videoUrl);
  const playbackSrc = video.videoUrl.startsWith('/uploads/videos/') && playbackRevision
    ? `${rawPlaybackSrc}${rawPlaybackSrc.includes('?') ? '&' : '?'}ready=${playbackRevision}`
    : rawPlaybackSrc;
  const currentPlaybackTime = () => isYouTube ? youtubeRef.current?.currentTime() ?? 0 : videoRef.current?.currentTime ?? 0;
  const seekToLesson = (seconds: number) => {
    if (isYouTube) youtubeRef.current?.seek(seconds);
    else if (videoRef.current) videoRef.current.currentTime = seconds;
    else { toast.info('Timestamp navigation is available for YouTube and uploaded videos.'); return; }
    if (window.matchMedia('(max-width: 767px)').matches) playerFrameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const takeNote = () => setNoteCapture((previous) => ({ sequence: previous.sequence + 1, seconds: Math.max(0, Math.floor(currentPlaybackTime())) }));

  return (
    <div className="video-lesson-layout mx-auto max-w-[1200px] min-w-0 space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 text-muted-foreground hover:text-foreground"
          render={<Link to={backPath} />}
          nativeButton={false}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Video Lessons
        </Button>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            render={<Link to={`/videos/${video.id}/edit`} />}
            nativeButton={false}
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
      </div>
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-academic-teal">Video lesson{video.subjectName ? ` · ${video.subjectName}` : ''}</p>
        <h1 className="break-words text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{video.title}</h1>
        <p className="text-sm text-muted-foreground">By {video.uploadedByName}</p>
      </header>
      <div className="video-lesson-grid min-w-0">
      <div className="min-w-0 space-y-5">
      {/* Video Player */}
      <div ref={playerFrameRef} className="video-lesson-player-frame relative aspect-video min-h-[200px] w-full scroll-mt-24 overflow-hidden rounded-sm border border-border bg-black group" aria-label="Lesson video player">
        {isYouTube && shouldTrackProgress && progressLoading ? <p className="flex h-full items-center justify-center text-sm text-white">Loading saved position…</p> : isYouTube ? <YouTubeLessonPlayer
          key={`${video.id}-${playbackRevision}`} ref={youtubeRef} source={video.videoUrl} title={video.title}
          track={shouldTrackProgress} startPosition={startPosition} onProgress={saveProgress} onFlush={saveProgressImmediate}
        /> : embedUrl ? (
          <iframe
            key={`${embedUrl}-${playbackRevision}`}
            src={embedUrl}
            title={video.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : isDirectVideo && (transcode === 'checking' || transcode === 'processing') ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center text-white/80">
            <RotateCcw className="h-8 w-8 animate-spin text-white/60" />
            <div>
              <p className="font-semibold text-white">Converting video for web playback…</p>
              <p className="mt-1 text-xs text-white/60">This runs once after upload. Large files may take a few minutes — this page updates automatically.</p>
            </div>
          </div>
        ) : isDirectVideo && transcode === 'failed' ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-white/80">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
            <p className="font-semibold text-white">This video couldn’t be converted for playback.</p>
            <p className="text-xs text-white/60">Try re-uploading it as an MP4 file.</p>
          </div>
        ) : isDirectVideo && playbackError ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center text-white/80">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
            <div>
              <p className="font-semibold text-white">The converted video could not be loaded.</p>
              <p className="mt-1 text-xs text-white/60">The file may be incomplete or use an unsupported codec. Try converting it again.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setPlaybackError(false); setPlaybackRevision(Date.now()); }}>
              Retry playback
            </Button>
          </div>
        ) : isDirectVideo ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              src={playbackSrc}
              playsInline
              preload="metadata"
              onError={() => setPlaybackError(true)}
              onClick={(e) => {
                const video = e.currentTarget;
                if (video.paused) {
                  video.play().catch(() => toast.error('Could not start playback. Please try again.'));
                } else {
                  video.pause();
                }
              }}
            >
              {video.captionsUrl && (
                <track kind="subtitles" src={video.captionsUrl} srcLang="en" label="English" default />
              )}
            </video>
            {/* Custom Controls */}
            <VideoPlayerControls
              videoRef={videoRef}
              duration={video.duration || undefined}
              onProgress={(currentTime) => {
                saveProgress(currentTime, false, videoRef.current?.duration);
              }}
            />
            {/* Resume indicator */}
            {startPosition > VIDEO_RESUME_MIN_SECONDS && !isCompleted && (
              <div className="absolute top-4 left-4 bg-black/80 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 backdrop-blur-sm">
                <RotateCcw className="h-3 w-3" />
                Resuming from {Math.floor(startPosition / 60)}:{String(Math.floor(startPosition % 60)).padStart(2, '0')}
              </div>
            )}
            {isCompleted && (
              <div className="absolute top-4 right-4 bg-green-600/90 text-white px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm">
                ✓ Completed
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <p className="text-sm">Preview not available for this URL.</p>
            {safeOriginalUrl && <a
              href={safeOriginalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-400 hover:underline text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              Open in new tab
            </a>}
          </div>
        )}
      </div>
      {progressError && <p role="alert" className="text-xs text-destructive">{progressError}</p>}
      {embedUrl && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground">
        <p className="text-xs text-muted-foreground">Trouble playing? Retry the player or open the original video.</p>
        <Button variant="outline" size="sm" onClick={() => setPlaybackRevision(value => value + 1)}><RotateCcw className="size-4" />Retry Player</Button>
      </div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <p className="text-xs leading-5 text-muted-foreground">{supportsTimestamps ? 'Save a thought from the exact moment you are watching.' : 'Keep a private note or ask a question about this lesson.'}</p>
        <Button type="button" onClick={takeNote} className="min-h-11 bg-academic-gold font-bold text-academic-navy-deep hover:bg-academic-gold/85">
          <StickyNote className="size-4" /> {supportsTimestamps ? 'Take note at current time' : 'Write a note'}
        </Button>
      </div>
      </div>
      <VideoLessonSidebar key={video.id} video={video} canManage={canManage} userId={user?.id}
        seek={seekToLesson} currentTime={currentPlaybackTime} captureRequest={noteCapture}
        originalUrl={safeOriginalUrl} embedUrl={embedUrl} isYouTube={isYouTube} supportsTimestamps={supportsTimestamps} />
      </div>

      {/* Watch analytics (teachers/admins) */}
      <VideoLearningWorkspace key={video.id} video={video} canManage={canManage} watched={isCompleted} seek={seekToLesson} />
      <VideoPlaylists currentVideoId={video.id} />
      {canManage && analytics && (
        <div className="bg-card border border-border rounded-sm p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Watch analytics
              <span className="text-xs font-normal text-muted-foreground">
                ({analytics.scope === 'class' ? 'assigned class' : 'all students'})
              </span>
            </h2>
            {analytics.total > 0 && (
              <span className="text-sm font-medium text-muted-foreground">
                {analytics.completed}/{analytics.total} completed ({Math.round((analytics.completed / analytics.total) * 100)}%)
              </span>
            )}
          </div>

          {/* Summary chips */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/10 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{analytics.completed}</p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">Completed</p>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 p-3 text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{analytics.inProgress}</p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">In progress</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{analytics.notStarted}</p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">Not started</p>
            </div>
          </div>

          {analytics.isRequired && analytics.dueDate && (
            <p className={`text-xs font-medium ${analytics.overdue ? 'text-rose-600' : 'text-muted-foreground'}`}>
              {analytics.overdue ? 'Past due' : 'Due'} {format(new Date(analytics.dueDate), 'dd MMM yyyy')}
              {analytics.overdue && analytics.notStarted + analytics.inProgress > 0 &&
                ` · ${analytics.notStarted + analytics.inProgress} student(s) have not finished`}
            </p>
          )}

          {/* Roster */}
          {analytics.total === 0 ? (
            <p className="text-sm text-muted-foreground">No students in this audience yet.</p>
          ) : (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="px-4 py-2.5">Student</th>
                    <th className="px-4 py-2.5">Progress</th>
                    <th className="px-4 py-2.5">Last watched</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analytics.roster.map((r) => (
                    <tr key={r.studentId} className="hover:bg-muted/50">
                      <td className="px-4 py-2.5 font-medium text-foreground">{r.name}</td>
                      <td className="px-4 py-2.5">
                        {r.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold"><CheckCircle2 className="h-3.5 w-3.5" /> Completed</span>
                        ) : r.status === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-semibold"><PlayCircle className="h-3.5 w-3.5" /> {r.percent}%</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not started</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">
                        {r.lastWatchedAt ? format(new Date(r.lastWatchedAt), 'dd MMM, HH:mm') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
