import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Video, Play, Clock, MoreVertical, Edit2, Trash2, Eye, BookOpen, CheckSquare, Square, Archive, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { formatDuration } from '../../lib/video';
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

  const toggleAll = () => {
    if (selectedIds.size === filteredVideos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVideos.map(v => v.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} video${selectedIds.size > 1 ? 's' : ''}?`)) return;

    try {
      await Promise.all(Array.from(selectedIds).map(id => apiSend(`/api/videos/${id}`, 'DELETE')));
      setVideos(prev => prev.filter(v => !selectedIds.has(v.id)));
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} video${selectedIds.size > 1 ? 's' : ''} deleted`);
    } catch {
      toast.error('Failed to delete some videos');
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;

    try {
      await Promise.all(Array.from(selectedIds).map(id =>
        apiSend(`/api/videos/${id}`, 'PUT', { status: 'ARCHIVED' })
      ));
      setVideos(prev => prev.map(v =>
        selectedIds.has(v.id) ? { ...v, status: 'ARCHIVED' as const } : v
      ));
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} video${selectedIds.size > 1 ? 's' : ''} archived`);
    } catch {
      toast.error('Failed to archive some videos');
    }
  };

  const handleBulkPublish = async () => {
    if (selectedIds.size === 0) return;

    try {
      await Promise.all(Array.from(selectedIds).map(id =>
        apiSend(`/api/videos/${id}`, 'PUT', { status: 'PUBLISHED' })
      ));
      setVideos(prev => prev.map(v =>
        selectedIds.has(v.id) ? { ...v, status: 'PUBLISHED' as const } : v
      ));
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} video${selectedIds.size > 1 ? 's' : ''} published`);
    } catch {
      toast.error('Failed to publish some videos');
    }
  };

  const subjects = Array.from(new Set(videos.map(v => v.subjectName).filter(Boolean)));

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

      {/* Bulk actions bar */}
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

      <div className="bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex flex-col md:flex-row gap-4 items-center">
        {(isAdmin || isTeacher) && (
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            {selectedIds.size === filteredVideos.length && filteredVideos.length > 0 ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            <span>Select All</span>
          </button>
        )}
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-slate-500">Loading videos...</span>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm">
          <Video className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">
            {hasNoVideos ? 'No videos yet' : 'No videos found'}
          </h3>
          <p className="text-slate-500 mt-1">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className={`bg-white dark:bg-surface-indigo border rounded-xl overflow-hidden hover:shadow-md transition-shadow group flex flex-col ${
                selectedIds.has(video.id) ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50' : 'border-slate-200 dark:border-surface-raised'
              }`}
            >
              {/* Thumbnail with checkbox overlay */}
              <div className="relative block bg-slate-900 aspect-video overflow-hidden">
                {(isAdmin || isTeacher) && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSelection(video.id);
                    }}
                    className="absolute top-2 left-2 z-10 p-1 bg-black/50 rounded hover:bg-black/70 transition-colors"
                  >
                    {selectedIds.has(video.id) ? (
                      <CheckSquare className="h-4 w-4 text-white" />
                    ) : (
                      <Square className="h-4 w-4 text-white/70" />
                    )}
                  </button>
                )}
                <Link to={`/videos/${video.id}`} className="block w-full h-full">
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
              </div>

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
                  {video.isRequired && (
                    <Badge className="text-xs bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-0 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Required{video.dueDate ? ` · ${format(new Date(video.dueDate), 'dd MMM')}` : ''}
                    </Badge>
                  )}
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
