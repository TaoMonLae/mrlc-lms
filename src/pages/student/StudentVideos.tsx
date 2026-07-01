import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Video, Search, Filter, Play, Clock, BookOpen, Check, AlertTriangle } from 'lucide-react';
import { apiGet } from '../../lib/api';
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
import { formatDistanceToNow, format } from 'date-fns';
import { formatDuration } from '../../lib/video';
import { useAllVideoProgress } from '../../hooks/useVideoProgress';
import type { VideoLesson } from '../../lib/video/types';

export default function StudentVideos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const { progressMap } = useAllVideoProgress();

  useEffect(() => {
    apiGet<VideoLesson[]>('/api/videos')
      .then((d) => setVideos(Array.isArray(d) ? d : []))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, []);

  // Build unique subjects list with both ID and name for proper filtering
  const subjectsMap = React.useMemo(() => {
    const map = new Map<string, string>();
    videos.forEach(v => {
      if (v.subjectId && v.subjectName && !map.has(v.subjectId)) {
        map.set(v.subjectId, v.subjectName);
      }
    });
    return map;
  }, [videos]);

  const filtered = videos.filter(v => {
    const matchesSearch =
      v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = subjectFilter === 'All' || v.subjectId === subjectFilter;
    return matchesSearch && matchesSubject && v.status === 'PUBLISHED' && v.visibility !== 'TEACHERS_ONLY';
  });

  const hasActiveFilters = searchTerm !== '' || subjectFilter !== 'All';
  const hasNoVideos = videos.length === 0;

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
            {Array.from(subjectsMap.entries()).map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-slate-500">Loading videos...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="col-span-full py-20 text-center bg-white dark:bg-surface-indigo rounded-2xl border border-dashed border-slate-200 dark:border-surface-raised">
          <Video className="h-12 w-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {hasNoVideos ? 'No videos available yet' : 'No videos found'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {hasNoVideos
              ? 'Check back later for new video lessons from your teachers.'
              : 'Try adjusting your search or filter to find what you\'re looking for.'}
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearchTerm('');
                setSubjectFilter('All');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(video => {
            const progress = progressMap[video.id];
            const progressPercent = progress && video.duration
              ? Math.min(100, (progress.currentPosition / video.duration) * 100)
              : 0;

            return (
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
                  {/* Progress indicator */}
                  {progress?.isCompleted && (
                    <div className="absolute top-2 right-2 bg-green-600/90 text-white px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                      <Check className="h-2.5 w-2.5" />
                      Completed
                    </div>
                  )}
                  {progress && !progress.isCompleted && progressPercent > 0 && (
                    <div className="absolute top-2 right-2 bg-blue-600/90 text-white px-2 py-0.5 rounded text-[10px] font-medium">
                      {Math.round(progressPercent)}%
                    </div>
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
                  {video.isRequired && (
                    <Badge className="text-[9px] uppercase tracking-widest font-bold border-0 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 px-1.5 flex items-center gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Required{video.dueDate ? ` · ${format(new Date(video.dueDate), 'dd MMM')}` : ''}
                    </Badge>
                  )}
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

              {/* Progress bar */}
              {progress && !progress.isCompleted && progressPercent > 0 && (
                <div className="h-1 bg-slate-100 dark:bg-slate-700">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
              {progress?.isCompleted && (
                <div className="h-1 bg-green-500" />
              )}

              <div className="bg-slate-50 dark:bg-surface-raised/50 px-4 py-3 border-t border-slate-100 dark:border-surface-raised flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(video.createdAt))} ago
                </span>
                <span className="truncate max-w-[100px]">By {video.uploadedByName}</span>
              </div>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
