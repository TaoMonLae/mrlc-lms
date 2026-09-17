import React from 'react';
import { Link } from 'react-router';
import { Video, Play, BookOpen, Check, CheckSquare, Square } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { formatDuration, autoGenerateThumbnail } from '../../lib/video';
import type { VideoLesson, VideoProgress } from '../../lib/video/types';

interface VideoCardProps {
  video: VideoLesson; progress?: VideoProgress; isSelected?: boolean;
  onSelect?: (id: string) => void; showSelection?: boolean;
  showManageMenu?: boolean; canManage?: boolean; manageMenuContent?: React.ReactNode;
}
export function VideoCard({ video, progress, isSelected = false, onSelect, showSelection = false, showManageMenu = false, canManage = false, manageMenuContent }: VideoCardProps) {
  const thumbnail = autoGenerateThumbnail(video.videoUrl, video.thumbnailUrl || undefined);
  const [failedThumbnail, setFailedThumbnail] = React.useState<string | null>(null);
  const completed = Boolean(progress?.isCompleted);
  const percent = video.duration && progress ? Math.max(0, Math.min(100, (progress.currentPosition / video.duration) * 100)) : 0;
  return <article className={`group flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground transition-colors ${isSelected ? 'border-academic-teal ring-1 ring-academic-teal' : 'border-border hover:border-muted-foreground/40'}`}>
    <div className="relative aspect-video overflow-hidden bg-[#141a20]">
      <Link to={`/videos/${video.id}`} aria-label={`Watch ${video.title}`} className="block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white">
        {thumbnail && failedThumbnail !== thumbnail ? <img src={thumbnail} alt="" width={480} height={270} loading="lazy" className="h-full w-full object-cover" onError={() => setFailedThumbnail(thumbnail)} /> : <div className="flex h-full items-center justify-center"><Video className="size-10 text-white/30" /></div>}
        <div className="absolute inset-0 flex items-center justify-center"><span className="flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition-colors group-hover:bg-black/80"><Play className="ml-0.5 size-5 fill-current" /></span></div>
        {!!video.duration && <span className="absolute bottom-3 right-3 rounded bg-black/80 px-2 py-1 text-xs tabular-nums text-white">{formatDuration(video.duration)}</span>}
        {completed && <span className="absolute right-3 top-3 flex items-center gap-1 rounded bg-emerald-700 px-2 py-1 text-xs text-white"><Check className="size-3" />Completed</span>}
      </Link>
      {showSelection && onSelect && <button type="button" aria-label={`Select ${video.title}`} aria-pressed={isSelected} onClick={() => onSelect(video.id)} className="absolute left-3 top-3 flex size-9 items-center justify-center rounded-md border border-white/20 bg-black/70 text-white focus-visible:outline-2 focus-visible:outline-white">{isSelected ? <CheckSquare className="size-4" /> : <Square className="size-4" />}</button>}
    </div>
    <div className="flex flex-1 flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2"><h2 className="min-w-0 font-semibold leading-snug"><Link to={`/videos/${video.id}`} className="line-clamp-2 break-words hover:underline">{video.title}</Link></h2>{showManageMenu && canManage && manageMenuContent}</div>
      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{video.description || 'Open this lesson to start watching.'}</p>
      <div className="mt-auto flex flex-wrap gap-2">
        {video.isRequired && <Badge variant="outline" className="text-amber-700 dark:text-amber-300">Required{video.dueDate ? ` · ${format(new Date(video.dueDate), 'dd MMM')}` : ''}</Badge>}
        {video.subjectName && <Badge variant="secondary">{video.subjectName}</Badge>}
        {video.className && <Badge variant="outline"><BookOpen className="size-3" />{video.className}</Badge>}
        {video.status !== 'PUBLISHED' && <Badge variant="outline">{video.status === 'DRAFT' ? 'Draft' : 'Archived'}</Badge>}
        {video.visibility === 'TEACHERS_ONLY' && <Badge variant="outline">Teachers Only</Badge>}
      </div>
      {progress && !completed && percent > 0 && <div className="space-y-1.5"><p className="text-xs text-muted-foreground">{Math.round(percent)}% watched</p><div className="h-1 rounded-full bg-muted" role="progressbar" aria-label="Watch progress" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-academic-teal" style={{ width: `${percent}%` }} /></div></div>}
    </div>
    <footer className="flex flex-wrap justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground"><span className="min-w-0 truncate">By {video.uploadedByName}</span><time dateTime={video.createdAt}>{format(new Date(video.createdAt), 'dd MMM yyyy')}</time></footer>
  </article>;
}
