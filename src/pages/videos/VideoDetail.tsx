import React from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Clock, BookOpen, Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissions, useUser } from '../../lib/permissions';
import { format } from 'date-fns';
import type { VideoLesson } from './VideoList';

const MOCK_VIDEOS: VideoLesson[] = import.meta.env.DEV ? [
  {
    id: 'v1',
    title: 'Introduction to GED Mathematics',
    description: 'An overview of the key mathematical concepts you will need for the GED exam. Topics covered include algebra, geometry, data analysis, and problem solving strategies. This lesson is designed for students who are just starting their GED preparation journey.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 1845,
    subjectName: 'Mathematics',
    visibility: 'ALL',
    status: 'PUBLISHED',
    uploadedById: 'u1',
    uploadedByName: 'System User',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: 'v2',
    title: 'Reading Comprehension Strategies',
    description: 'Learn how to tackle reading comprehension passages in the GED RLA section. We cover strategies for identifying main ideas, inferencing, and analyzing author tone.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 2310,
    subjectName: 'English Language Arts',
    visibility: 'STUDENTS',
    status: 'PUBLISHED',
    uploadedById: 't1',
    uploadedByName: 'Ms. Naw Htwe',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
  {
    id: 'v3',
    title: 'Science: Ecosystems & Biodiversity',
    description: 'Covers ecosystem dynamics, food webs, and biodiversity concepts for GED Science.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 3020,
    subjectName: 'Science',
    className: 'Pre-GED Class A',
    visibility: 'ALL',
    status: 'PUBLISHED',
    uploadedById: 't2',
    uploadedByName: 'Mr. Saw Htoo',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
  },
  {
    id: 'v4',
    title: 'Social Studies: US Government Overview',
    description: 'A walkthrough of US government structure and civic concepts for GED prep.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 2760,
    subjectName: 'Social Studies',
    visibility: 'TEACHERS_ONLY',
    status: 'DRAFT',
    uploadedById: 'u1',
    uploadedByName: 'System User',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
] : [];

function formatDuration(seconds?: number): string {
  if (!seconds) return 'Unknown';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // YouTube
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let videoId = u.searchParams.get('v');
      if (!videoId && u.hostname === 'youtu.be') videoId = u.pathname.slice(1);
      if (videoId) return `https://www.youtube.com/embed/${videoId}?rel=0`;
    }
    // Vimeo
    if (u.hostname.includes('vimeo.com')) {
      const videoId = u.pathname.split('/').pop();
      if (videoId) return `https://player.vimeo.com/video/${videoId}`;
    }
  } catch {}
  return null;
}

export default function VideoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { isAdmin, isTeacher } = usePermissions();

  const video = MOCK_VIDEOS.find(v => v.id === id);

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
  const embedUrl = getEmbedUrl(video.videoUrl);
  const isDirectVideo = !embedUrl && (video.videoUrl.endsWith('.mp4') || video.videoUrl.endsWith('.webm'));

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
      <div className="bg-black rounded-xl overflow-hidden aspect-video w-full shadow-lg">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={video.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : isDirectVideo ? (
          <video controls className="w-full h-full" src={video.videoUrl} />
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
                    {formatDuration(video.duration)}
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
