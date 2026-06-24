import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Clock, BookOpen, Calendar, ExternalLink, RotateCcw } from 'lucide-react';
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
import type { VideoLesson } from '../../lib/video/types';

export default function VideoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { isAdmin, isTeacher } = usePermissions();

  const [video, setVideo] = useState<VideoLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Enable progress tracking for students and teachers (not admins)
  const shouldTrackProgress = !isAdmin;
  const {
    progress,
    saveProgress,
    saveProgressImmediate,
    startPosition,
    isCompleted,
  } = useVideoProgress({ videoId: id || '', enabled: shouldTrackProgress && !!id });

  useEffect(() => {
    if (!id) return;
    const fetchVideo = async () => {
      try {
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

  // Set up video element event listeners for progress tracking
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !shouldTrackProgress) return;

    const handleTimeUpdate = () => {
      if (videoEl.duration && videoEl.currentTime > 0) {
        saveProgress(videoEl.currentTime);
      }
    };

    const handlePause = () => {
      if (videoEl.currentTime > 0) {
        saveProgressImmediate(videoEl.currentTime, isCompleted);
      }
    };

    const handleEnded = () => {
      saveProgressImmediate(videoEl.duration || 0, true);
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

  // Set initial video time from saved progress
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || startPosition === 0) return;

    // Wait for video metadata to load before seeking
    const handleLoadedMetadata = () => {
      if (startPosition > 0) {
        videoEl.currentTime = startPosition;
      }
      videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };

    if (videoEl.readyState >= 1) {
      // Metadata already loaded
      videoEl.currentTime = startPosition;
    } else {
      videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    return () => {
      videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [startPosition]);

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
  const playbackSrc = getVideoPlaybackSrc(video.videoUrl);

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
        ) : isDirectVideo ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              src={playbackSrc}
              onClick={(e) => {
                const video = e.currentTarget;
                if (video.paused) {
                  video.play();
                } else {
                  video.pause();
                }
              }}
            />
            {/* Custom Controls */}
            <VideoPlayerControls
              videoRef={videoRef}
              duration={video.duration || undefined}
              onProgress={saveProgress}
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
    </div>
  );
}
