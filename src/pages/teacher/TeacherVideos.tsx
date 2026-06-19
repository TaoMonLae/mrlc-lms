import React, { useEffect, useState } from 'react';
import { fetchOrMock } from '../../lib/api';
import { Link } from 'react-router-dom';
import { Video, Plus, Search, Play, Clock, Edit2, Trash2, MoreVertical, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useUser } from '../../lib/permissions';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import type { VideoLesson } from '../videos/VideoList';

const MOCK_VIDEOS: VideoLesson[] = import.meta.env.DEV ? [
  {
    id: 'v1',
    title: 'Introduction to GED Mathematics',
    description: 'An overview of the key mathematical concepts for the GED exam.',
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
    description: 'Learn how to tackle reading comprehension passages in the GED RLA section.',
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
    description: 'Covers ecosystem dynamics, food webs, and biodiversity concepts.',
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
    description: 'A walkthrough of US government structure and civic concepts.',
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
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function TeacherVideos() {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [videos, setVideos] = useState<VideoLesson[]>([]);

  useEffect(() => {
    fetchOrMock<VideoLesson[]>('/api/videos', () => MOCK_VIDEOS).then((r) => setVideos(r.data));
  }, []);

  const filtered = videos.filter(v =>
    v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManage = (video: VideoLesson) =>
    video.uploadedById === user?.id || video.uploadedById === user?.teacherId;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Video Lessons</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Manage and share instructional videos with your students.</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
          render={<Link to="/videos/new" />}
          nativeButton={false}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Video
        </Button>
      </div>

      <div className="bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search video lessons..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl">
          <Video className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">No videos found</h3>
          <p className="text-slate-500 mt-1">Add a new video lesson to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(video => (
            <div
              key={video.id}
              className="group bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col"
            >
              <Link to={`/videos/${video.id}`} className="relative block bg-slate-900 aspect-video overflow-hidden">
                {video.thumbnailUrl ? (
                  <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
                    <Video className="h-10 w-10 text-slate-600" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                    <Play className="h-6 w-6 text-white fill-white" />
                  </div>
                </div>
                {video.duration && (
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-mono">
                    {formatDuration(video.duration)}
                  </span>
                )}
              </Link>

              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Link
                    to={`/videos/${video.id}`}
                    className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-1"
                  >
                    {video.title}
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />}
                      nativeButton={true}
                    >
                      <MoreVertical className="h-4 w-4 text-slate-400" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem render={<Link to={`/videos/${video.id}`} className="flex w-full" />} nativeButton={false}>
                        <Eye className="h-4 w-4 mr-2" /> View
                      </DropdownMenuItem>
                      {canManage(video) && (
                        <>
                          <DropdownMenuItem render={<Link to={`/videos/${video.id}/edit`} className="flex w-full" />} nativeButton={false}>
                            <Edit2 className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => toast.error('Delete not connected to API yet.')}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-300 line-clamp-2 mb-3 flex-1">
                  {video.description}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {video.subjectName && (
                    <Badge variant="secondary" className="text-xs font-normal">{video.subjectName}</Badge>
                  )}
                  {video.status === 'DRAFT' && (
                    <Badge variant="outline" className="text-xs border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400">Draft</Badge>
                  )}
                  {video.visibility === 'TEACHERS_ONLY' && (
                    <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300">Teachers Only</Badge>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-surface-raised/50 px-4 py-3 border-t border-slate-100 dark:border-surface-raised flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(video.createdAt))} ago
                </span>
                <span className="truncate max-w-[110px]">By {video.uploadedByName}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
