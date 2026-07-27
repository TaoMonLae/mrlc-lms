import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Clock, BookOpen, Calendar, ExternalLink, RotateCcw, Users, CheckCircle2, AlertTriangle, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissions, useUser } from '../../lib/permissions';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getVideoEmbedUrl, getVideoPlaybackSrc, isDirectVideoUrl, formatDurationVerbose } from '../../lib/video';
import { apiGet } from '../../lib/api';
import { useVideoProgress } from '../../hooks/useVideoProgress';
import { VideoPlayerControls } from '../../components/VideoPlayerControls';
import { VIDEO_RESUME_MIN_SECONDS } from '../../lib/video/constants';
import type { VideoLesson, VideoAnalytics } from '../../lib/video/types';

export default function VideoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { isAdmin, isTeacher } = usePermissions();

  const [video, setVideo] = useState<VideoLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<VideoAnalytics | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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
  } = useVideoProgress({
    videoId: id || '',
    enabled: shouldTrackProgress && !!id,
    duration: video?.duration,
  });

  useEffect(() => {
    if (!id) return;
    const fetchVideo = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        await fetch('/api/videos/media-session', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const v = await apiGet<VideoLesson>(`/api/videos/${id}`);
        setVideo(v);
      } catch (error) {
        console.error('Error fetching video:', error);
        if ((error as Error).message !== 'Request failed (404)') {
          toast.error('Failed to load video');
        }
        setVideo(null);
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
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
  }, [shouldTrackProgress, saveProgress, saveProgressImmediate, isCompleted]);

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
        <span className="ml-3 text-slate-500">Loading video...</span>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Video not found</h2>
        <Button variant="link" onClick={() => navigate('/videos')} className="mt-2">Back to Video Lessons</Button>
      </div>
    );
  }

  // Students cannot view teachers-only content even via direct URL
  if (!isAdmin && !isTeacher && video.visibility === 'TEACHERS_ONLY') {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Access Denied</h2>
        <p className="text-slate-500 mt-1 text-sm">This video is only available to teachers.</p>
        <Button variant="link" onClick={() => navigate('/videos')} className="mt-2">Back to Video Lessons</Button>
      </div>
    );
  }

  const canManage = isAdmin || (isTeacher && (video.uploadedById === user?.id || video.uploadedById === user?.teacherId));
  const embedUrl = getVideoEmbedUrl(video.videoUrl);
  const isDirectVideo = !embedUrl && isDirectVideoUrl(video.videoUrl);
  const rawPlaybackSrc = getVideoPlaybackSrc(video.videoUrl);
  const playbackSrc = video.videoUrl.startsWith('/uploads/videos/') && playbackRevision
    ? `${rawPlaybackSrc}${rawPlaybackSrc.includes('?') ? '&' : '?'}ready=${playbackRevision}`
    : rawPlaybackSrc;

  return (
    <div className="space-y-6 max-w-[900px] mx-auto pb-10">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          render={<Link to="/videos" />}
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

      {/* Video Player */}
      <div className="bg-black rounded-xl overflow-hidden aspect-video w-full shadow-lg relative group">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={video.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
              onError={() => setPlaybackError(true)}
              onClick={(e) => {
                const video = e.currentTarget;
                if (video.paused) {
                  video.play();
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
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-400">
            <p className="text-sm">Preview not available for this URL.</p>
            <a
              href={video.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-400 hover:underline text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              Open in new tab
            </a>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{video.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>By {video.uploadedByName}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(video.createdAt), 'dd MMM yyyy')}
              </span>
              {video.duration && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDurationVerbose(video.duration)}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {video.isRequired && (
              <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-0 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Required{video.dueDate ? ` · due ${format(new Date(video.dueDate), 'dd MMM')}` : ''}
              </Badge>
            )}
            {video.subjectName && (
              <Badge variant="secondary">{video.subjectName}</Badge>
            )}
            {video.className && (
              <Badge variant="outline" className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {video.className}
              </Badge>
            )}
            {video.visibility === 'TEACHERS_ONLY' && (
              <Badge variant="outline" className="border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300">
                Teachers Only
              </Badge>
            )}
            {video.status === 'DRAFT' && (
              <Badge variant="outline" className="border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400">
                Draft
              </Badge>
            )}
          </div>
        </div>

        {video.description && (
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-surface-raised pt-4">
            {video.description}
          </p>
        )}

        <div className="border-t border-slate-100 dark:border-surface-raised pt-4">
          <a
            href={video.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline w-fit"
          >
            <ExternalLink className="h-4 w-4" />
            Open original link
          </a>
        </div>
      </div>

      {/* Watch analytics (teachers/admins) */}
      {canManage && analytics && (
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="h-4 w-4" /> Watch analytics
              <span className="text-xs font-normal text-slate-400">
                ({analytics.scope === 'class' ? 'assigned class' : 'all students'})
              </span>
            </h2>
            {analytics.total > 0 && (
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {analytics.completed}/{analytics.total} completed ({Math.round((analytics.completed / analytics.total) * 100)}%)
              </span>
            )}
          </div>

          {/* Summary chips */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/10 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{analytics.completed}</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Completed</p>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 p-3 text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{analytics.inProgress}</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">In progress</p>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-surface-raised/40 p-3 text-center">
              <p className="text-2xl font-bold text-slate-500 dark:text-slate-300">{analytics.notStarted}</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Not started</p>
            </div>
          </div>

          {analytics.isRequired && analytics.dueDate && (
            <p className={`text-xs font-medium ${analytics.overdue ? 'text-rose-600' : 'text-slate-500'}`}>
              {analytics.overdue ? 'Past due' : 'Due'} {format(new Date(analytics.dueDate), 'dd MMM yyyy')}
              {analytics.overdue && analytics.notStarted + analytics.inProgress > 0 &&
                ` · ${analytics.notStarted + analytics.inProgress} student(s) have not finished`}
            </p>
          )}

          {/* Roster */}
          {analytics.total === 0 ? (
            <p className="text-sm text-slate-400">No students in this audience yet.</p>
          ) : (
            <div className="overflow-x-auto border border-slate-100 dark:border-surface-raised rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-surface-raised/50 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="px-4 py-2.5">Student</th>
                    <th className="px-4 py-2.5">Progress</th>
                    <th className="px-4 py-2.5">Last watched</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {analytics.roster.map((r) => (
                    <tr key={r.studentId} className="hover:bg-slate-50 dark:hover:bg-surface-raised/40">
                      <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{r.name}</td>
                      <td className="px-4 py-2.5">
                        {r.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold"><CheckCircle2 className="h-3.5 w-3.5" /> Completed</span>
                        ) : r.status === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-semibold"><PlayCircle className="h-3.5 w-3.5" /> {r.percent}%</span>
                        ) : (
                          <span className="text-xs text-slate-400">Not started</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">
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
