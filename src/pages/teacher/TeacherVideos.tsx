import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { VideoCard } from '../../components/video/VideoCard';
import { VideoLessonMenu } from '../../components/video/VideoLessonMenu';
import { Video, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '../../lib/permissions';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import type { VideoLesson } from '../../lib/video/types';

export default function TeacherVideos() {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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

  useEffect(() => {
    const loadVideos = async () => {
      setLoading(true); setLoadError(false);
      await apiSend('/api/videos/media-session', 'POST', {}).catch(() => undefined);
      try {
        const data = await apiGet<VideoLesson[]>('/api/videos');
        setVideos(Array.isArray(data) ? data : []);
      } catch {
        setLoadError(true);
      } finally { setLoading(false); }
    };
    loadVideos();
  }, [reloadKey]);

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
            aria-label="Search video lessons"
            placeholder="Search video lessons..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? <p role="status" className="py-12 text-center text-sm text-muted-foreground">Loading video lessons…</p> : loadError ? <div role="alert" className="rounded-xl border border-border bg-card p-6 text-card-foreground"><p>Could not load video lessons.</p><Button variant="outline" className="mt-3" onClick={() => setReloadKey(value => value + 1)}>Retry Lessons</Button></div> : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl">
          <Video className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">No videos found</h3>
          <p className="text-slate-500 mt-1">{searchTerm ? 'Try another title or clear your search.' : 'Add a new video lesson to get started.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(video => <VideoCard key={video.id} video={video} showManageMenu canManage={canManage(video)} manageMenuContent={<VideoLessonMenu video={video} onDelete={handleDelete} />} />)}
        </div>
      )}
    </div>
  );
}
