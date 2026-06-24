import React from 'react';
import { Link } from 'react-router-dom';
import { Video, Play, Clock, BookOpen, Check, CheckSquare, Square } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { formatDuration } from '../../lib/video';
import type { VideoLesson, VideoProgress } from '../../lib/video/types';

/**
 * Props for the VideoCard component
 */
interface VideoCardProps {
  /** The video lesson data to display */
  video: VideoLesson;
  /** Optional progress data for showing watch progress */
  progress?: VideoProgress;
  /** Whether the card is selected in bulk selection mode */
  isSelected?: boolean;
  /** Callback when the card is selected/deselected */
  onSelect?: (id: string) => void;
  /** Whether to show the selection checkbox */
  showSelection?: boolean;
  /** Whether to show the management menu (edit/delete) */
  showManageMenu?: boolean;
  /** Whether the current user can manage this video */
  canManage?: boolean;
  /** React node for management menu actions */
  manageMenuContent?: React.ReactNode;
}

/**
 * Reusable video card component for displaying video lessons in a grid.
 * Shows thumbnail, title, duration, progress, and optional selection/management features.
 *
 * @example
 * ```tsx
 * <VideoCard
 *   video={video}
 *   progress={progressMap[video.id]}
 *   showSelection={true}
 *   isSelected={selectedIds.has(video.id)}
 *   onSelect={() => toggleSelection(video.id)}
 * />
 * ```
 */
export function VideoCard({
  video,
  progress,
  isSelected = false,
  onSelect,
  showSelection = false,
  showManageMenu = false,
  canManage = false,
  manageMenuContent,
}: VideoCardProps) {
  const progressPercent = progress && video.duration
    ? Math.min(100, (progress.currentPosition / video.duration) * 100)
    : 0;

  const isCompleted = progress?.isCompleted ?? false;

  return (
    <div
      className={`bg-white dark:bg-surface-indigo border rounded-xl overflow-hidden hover:shadow-md transition-shadow group flex flex-col ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50' : 'border-slate-200 dark:border-surface-raised'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative block bg-slate-900 aspect-video overflow-hidden">
        {/* Selection checkbox */}
        {showSelection && onSelect && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onSelect(video.id);
            }}
            className="absolute top-2 left-2 z-10 p-1 bg-black/50 rounded hover:bg-black/70 transition-colors"
            aria-label={`Select ${video.title}`}
          >
            {isSelected ? (
              <CheckSquare className="h-4 w-4 text-white" />
            ) : (
              <Square className="h-4 w-4 text-white/70" />
            )}
          </button>
        )}

        <Link to={`/videos/${video.id}`} className="block w-full h-full">
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
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
          {/* Progress indicators */}
          {isCompleted && (
            <div className="absolute top-2 right-2 bg-green-600/90 text-white px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
              <Check className="h-2.5 w-2.5" />
              Completed
            </div>
          )}
          {progress && !isCompleted && progressPercent > 0 && (
            <div className="absolute top-2 right-2 bg-blue-600/90 text-white px-2 py-0.5 rounded text-[10px] font-medium">
              {Math.round(progressPercent)}%
            </div>
          )}
        </Link>
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link
            to={`/videos/${video.id}`}
            className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-1"
          >
            {video.title}
          </Link>
          {showManageMenu && canManage && manageMenuContent}
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-300 line-clamp-2 mb-3 flex-1">
          {video.description}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {video.subjectName && (
            <Badge variant="secondary" className="text-xs font-normal">
              {video.subjectName}
            </Badge>
          )}
          {video.status === 'DRAFT' && (
            <Badge variant="outline" className="text-xs border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400">
              Draft
            </Badge>
          )}
          {video.visibility === 'TEACHERS_ONLY' && (
            <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300">
              Teachers Only
            </Badge>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {progress && !isCompleted && progressPercent > 0 && (
        <div className="h-1 bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
      {isCompleted && <div className="h-1 bg-green-500" />}

      {/* Footer */}
      <div className="bg-slate-50 dark:bg-surface-raised/50 px-4 py-3 border-t border-slate-100 dark:border-surface-raised flex items-center justify-between text-xs text-slate-500">
        <span className="truncate max-w-[130px]">By {video.uploadedByName}</span>
        <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
      </div>
    </div>
  );
}
