import React, { useEffect, useState } from 'react';
import { VideoCard } from '../../components/video/VideoCard';
import { VideoPlaylists } from '../../components/video/VideoPlaylists';
import { Video, Search, Filter } from 'lucide-react';
import { apiGet, apiSend } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAllVideoProgress } from '../../hooks/useVideoProgress';
import type { VideoLesson } from '../../lib/video/types';

export default function StudentVideos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const { progressMap } = useAllVideoProgress();

  useEffect(() => {
    const loadVideos = async () => {
      setLoading(true); setLoadError(false);
      await apiSend('/api/videos/media-session', 'POST', {}).catch(() => undefined);
      try {
        const data = await apiGet<VideoLesson[]>('/api/videos');
        setVideos(Array.isArray(data) ? data : []);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    loadVideos();
  }, [reloadKey]);

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

      <VideoPlaylists />
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            aria-label="Search video lessons"
            placeholder="Search video lessons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="h-10 w-full md:w-[180px]" aria-label="Filter by subject">
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
      ) : loadError ? <div role="alert" className="rounded-xl border border-border bg-card p-6 text-card-foreground"><p>Could not load video lessons.</p><Button variant="outline" className="mt-3" onClick={() => setReloadKey(value => value + 1)}>Retry Lessons</Button></div> : filtered.length === 0 ? (
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(video => <VideoCard key={video.id} video={video} progress={progressMap[video.id]} />)}
        </div>
      )}
    </div>
  );
}
