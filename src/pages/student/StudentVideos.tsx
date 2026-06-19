import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Video, Search, Filter, Play, Clock, BookOpen } from 'lucide-react';
import { fetchOrMock } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import type { VideoLesson } from '../videos/VideoList';

const STUDENT_VIDEOS: VideoLesson[] = [
  {
    id: 'v1',
    title: 'Introduction to GED Mathematics',
    description: 'An overview of the key mathematical concepts you will need for the GED exam, including algebra, geometry, and data analysis.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 1845,
    subjectName: 'Mathematics',
    visibility: 'ALL',
    status: 'PUBLISHED',
    uploadedById: 'u1',
    uploadedByName: 'Admin User',
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
];

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function StudentVideos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [videos, setVideos] = useState<VideoLesson[]>([]);

  useEffect(() => {
    // Live in production; mock fallback only in dev (on error or empty).
    fetchOrMock<VideoLesson[]>('/api/videos', STUDENT_VIDEOS).then((r) => setVideos(r.data));
  }, []);

  const subjects = Array.from(new Set(videos.map(v => v.subjectName).filter(Boolean)));

  const filtered = videos.filter(v => {
    const matchesSearch =
      v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = subjectFilter === 'All' || v.subjectName === subjectFilter;
    return matchesSearch && matchesSubject && v.status === 'PUBLISHED' && v.visibility !== 'TEACHERS_ONLY';
  });

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Video className="h-6 w-6 text-aubergine-600" />
            Video Lessons
          </h1>
          <p className="text-sm text-slate-500 mt-1">Watch recorded lessons and instructional videos from your teachers.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search video lessons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-[180px] h-10">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5" />
              <SelectValue placeholder="All Subjects" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Subjects</SelectItem>
            {subjects.map(s => (
              <SelectItem key={s} value={s!}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="col-span-full py-20 text-center bg-white dark:bg-surface-indigo rounded-2xl border border-dashed border-slate-200 dark:border-surface-raised">
          <Video className="h-12 w-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No videos found</h3>
          <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(video => (
            <Link
              key={video.id}
              to={`/videos/${video.id}`}
              className="group bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col"
            >
              {/* Thumbnail */}
              <div className="relative bg-slate-900 aspect-video overflow-hidden">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-aubergine-900 to-slate-900">
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
              </div>

              {/* Info */}
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-aubergine-600 dark:group-hover:text-aubergine-400 transition-colors text-sm mb-2">
                  {video.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-300 line-clamp-2 mb-3 flex-1">
                  {video.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {video.subjectName && (
                    <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-bold border-none bg-aubergine-50 text-aubergine-700 dark:bg-aubergine-900/30 dark:text-aubergine-400 px-1.5">
                      {video.subjectName}
                    </Badge>
                  )}
                  {video.className && (
                    <Badge variant="outline" className="text-[9px] flex items-center gap-0.5 px-1.5">
                      <BookOpen className="h-2.5 w-2.5" />
                      {video.className}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-surface-raised/50 px-4 py-3 border-t border-slate-100 dark:border-surface-raised flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(video.createdAt))} ago
                </span>
                <span className="truncate max-w-[100px]">By {video.uploadedByName}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
