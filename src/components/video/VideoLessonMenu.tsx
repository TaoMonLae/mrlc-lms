import { Link } from 'react-router';
import { Eye, Edit2, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { VideoLesson } from '../../lib/video/types';

export function VideoLessonMenu({ video, onDelete }: { video: VideoLesson; onDelete: (id: string) => void }) {
  return <DropdownMenu>
    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-9 shrink-0" aria-label={`Manage ${video.title}`} />} nativeButton>
      <MoreVertical className="size-4" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem render={<Link to={`/videos/${video.id}`} />} nativeButton={false}><Eye className="size-4" />View Lesson</DropdownMenuItem>
      <DropdownMenuItem render={<Link to={`/videos/${video.id}/edit`} />} nativeButton={false}><Edit2 className="size-4" />Edit Lesson</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="text-destructive" onClick={() => onDelete(video.id)}><Trash2 className="size-4" />Delete Lesson</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
