import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { VideoCard } from '../../components/video/VideoCard';
import { VideoPlaylists } from '../../components/video/VideoPlaylists';
import { VideoLessonMenu } from '../../components/video/VideoLessonMenu';
import { Plus, Search, Filter, Video, Trash2, CheckSquare, Square, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePermissions, useUser } from '../../lib/permissions';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import type { VideoLesson } from '../../lib/video/types';

export default function VideoList() {
  const { user } = useUser();
  const { isAdmin, isTeacher } = usePermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        await apiSend('/api/videos/media-session', 'POST', {}).catch(() => undefined);
        const data = await apiGet<VideoLesson[]>('/api/videos');
        setVideos(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching videos:', error);
        toast.error('Failed to load videos');
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const filteredVideos = videos.filter(v => {
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

  const hasActiveFilters = searchTerm !== '' || subjectFilter !== 'ALL' || statusFilter !== 'ALL';
  const hasNoVideos = videos.length === 0;

  const canManage = (video: VideoLesson) => {
    if (isAdmin) return true;
    if (isTeacher && (video.uploadedById === user?.id || video.uploadedById === user?.teacherId)) return true;
    return false;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;
    try {
      await apiSend(`/api/videos/${id}`, 'DELETE');
      setVideos(prev => prev.filter(v => v.id !== id));
      toast.success('Video deleted');
    } catch {
      toast.error('Failed to delete video');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // "Select all" only concerns the lessons currently shown. Selections hidden
  // by a filter must not make the toggle look complete (or clear everything).
  const allVisibleSelected = filteredVideos.length > 0 && filteredVideos.every(v => selectedIds.has(v.id));
  const toggleAll = () => {
    setSelectedIds(allVisibleSelected ? new Set() : new Set(filteredVideos.map(v => v.id)));
  };

  const plural = (count: number) => `${count} video${count === 1 ? '' : 's'}`;

  // Run one request per selected lesson and report partial failures honestly:
  // lessons that succeeded are updated on screen, the rest stay selected so the
  // action can be retried.
  const runBulk = async (action: (id: string) => Promise<unknown>) => {
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(ids.map(id => action(id)));
    const succeeded = new Set(ids.filter((_, index) => results[index].status === 'fulfilled'));
    const failed = ids.filter(id => !succeeded.has(id));
    setSelectedIds(new Set(failed));
    return { succeeded, failed };
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${plural(selectedIds.size)}?`)) return;

    const { succeeded, failed } = await runBulk(id => apiSend(`/api/videos/${id}`, 'DELETE'));
    if (succeeded.size) setVideos(prev => prev.filter(v => !succeeded.has(v.id)));
    if (failed.length) toast.error(`${plural(failed.length)} could not be deleted`);
    else toast.success(`${plural(succeeded.size)} deleted`);
  };

  const setBulkStatus = async (status: 'ARCHIVED' | 'PUBLISHED') => {
    if (selectedIds.size === 0) return;
    const verb = status === 'ARCHIVED' ? 'archived' : 'published';
    const { succeeded, failed } = await runBulk(id => apiSend(`/api/videos/${id}`, 'PUT', { status }));
    if (succeeded.size) setVideos(prev => prev.map(v => (succeeded.has(v.id) ? { ...v, status } : v)));
    if (failed.length) toast.error(`${plural(failed.length)} could not be ${verb}`);
    else toast.success(`${plural(succeeded.size)} ${verb}`);
  };

  const handleBulkArchive = () => setBulkStatus('ARCHIVED');
  const handleBulkPublish = () => setBulkStatus('PUBLISHED');

  const subjects = Array.from(new Set(videos.map(v => v.subjectName).filter(Boolean)));

  return (
    <div className="space-y-6 max-w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Video Lessons</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse and manage instructional video content.</p>
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

      {/* Bulk actions bar */}
      <VideoPlaylists videos={videos} />
      {selectedIds.size > 0 && (isAdmin || isTeacher) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
            {selectedIds.size} video{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleBulkPublish}>
              Publish
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkArchive}>
              <Archive className="h-4 w-4 mr-1" />
              Archive
            </Button>
            <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="bg-card p-4 rounded-sm border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center">
        {(isAdmin || isTeacher) && (
          <button
            type="button"
            onClick={toggleAll}
            aria-pressed={allVisibleSelected}
            disabled={filteredVideos.length === 0}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {allVisibleSelected ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            <span>Select All</span>
          </button>
        )}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search video lessons"
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Loading videos...</span>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-sm shadow-sm">
          <Video className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-foreground">
            {hasNoVideos ? 'No videos yet' : 'No videos found'}
          </h3>
          <p className="text-muted-foreground mt-1">
            {hasNoVideos
              ? 'Add your first video lesson to get started.'
              : 'Try adjusting your filters or search query.'}
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearchTerm('');
                setSubjectFilter('ALL');
                setStatusFilter('ALL');
              }}
            >
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map(video => <VideoCard key={video.id} video={video} showSelection={isAdmin || isTeacher} isSelected={selectedIds.has(video.id)} onSelect={toggleSelection} showManageMenu canManage={canManage(video)} manageMenuContent={<VideoLessonMenu video={video} onDelete={handleDelete} />} />)}
        </div>
      )}
    </div>
  );
}
