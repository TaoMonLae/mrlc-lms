import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Video, Play, Clock, MoreVertical, Edit2, Trash2, Eye, BookOpen } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePermissions, useUser } from '../../lib/permissions';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export interface VideoLesson {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  classId?: string;
  className?: string;
  subjectId?: string;
  subjectName?: string;
  visibility: 'ALL' | 'STUDENTS' | 'TEACHERS_ONLY';
  status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
}

const MOCK_VIDEOS: VideoLesson[] = import.meta.env.DEV ? [
  {
    id: 'v1',
    title: 'Introduction to GED Mathematics',
    description: 'An overview of the key mathematical concepts you will need for the GED exam.',
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
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function VideoList() {
  const { user } = useUser();
  const { isAdmin, isTeacher } = usePermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredVideos = MOCK_VIDEOS.filter(v => {
    if (!isAdmin && !isTeacher) {
      if (v.visibility === 'TEACHERS_ONLY') return false;
      if (v.status !== 'PUBLISHED') return false;
    }
    const matchesSearch =
      v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.description ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = subjectFilter === 'ALL' || v.subjectName === subjectFilter;
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesSubject && matchesStatus;
  });

  const canManage = (video: VideoLesson) => {
    if (isAdmin) return true;
    if (isTeacher && (video.uploadedById === user?.id || video.uploadedById === user?.teacherId)) return true;
    return false;
  };

  const handleDelete = (id: string) => {
    toast.error('Delete not connected to API yet.');
  };

  const subjects = Array.from(new Set(MOCK_VIDEOS.map(v => v.subjectName).filter(Boolean)));

  return (
    <div className="space-y-6 max-w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Video Lessons</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Browse and manage instructional video content.</p>
        </div>
        {(isAdmin || isTeacher) && (
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
            render={<Link to="/videos/new" />}
            nativeButton={false}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Video
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by title or description..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex w-full md:w-auto gap-3">
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[160px]">
              <div className="flex items-center gap-2">
                <Filter className="h-3 w-3" />
                <SelectValue placeholder="Subject" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Subjects</SelectItem>
              {subjects.map(s => (
                <SelectItem key={s} value={s!}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(isAdmin || isTeacher) && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {filteredVideos.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm">
          <Video className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">No videos found</h3>
          <p className="text-slate-500 mt-1">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden hover:shadow-md transition-shadow group flex flex-col"
            >
              {/* Thumbnail */}
              <Link to={`/videos/${video.id}`} className="relative block bg-slate-900 aspect-video overflow-hidden">
                {video.thumbnailUrl ? (
                  <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
                    <Video className="h-10 w-10 text-slate-500" />
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

              {/* Info */}
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Link to={`/videos/${video.id}`} className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-1">
                    {video.title}
                  </Link>
                  {canManage(video) && (
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
                        <DropdownMenuItem render={<Link to={`/videos/${video.id}/edit`} className="flex w-full" />} nativeButton={false}>
                          <Edit2 className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(video.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-300 line-clamp-2 mb-3 flex-1">
                  {video.description}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {video.subjectName && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      {video.subjectName}
                    </Badge>
                  )}
                  {video.status === 'DRAFT' && (
                    <Badge variant="outline" className="text-xs font-normal border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400">
                      Draft
                    </Badge>
                  )}
                  {video.visibility === 'TEACHERS_ONLY' && (
                    <Badge variant="outline" className="text-xs font-normal border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300">
                      Teachers Only
                    </Badge>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-surface-raised/50 px-4 py-3 border-t border-slate-100 dark:border-surface-raised flex items-center justify-between text-xs text-slate-500">
                <span className="truncate max-w-[130px]">By {video.uploadedByName}</span>
                <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
