import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiSend } from '../lib/api';
import { VIDEO_PROGRESS_SAVE_DELAY } from '../lib/video/constants';
import type { VideoProgress } from '../lib/video/types';

/**
 * Custom error class for video-related errors
 */
export class VideoProgressError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'VideoProgressError';
  }
}

interface UseVideoProgressOptions {
  /** The ID of the video to track progress for */
  videoId: string;
  /** Whether progress tracking is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Custom hook for managing video progress tracking and persistence.
 * Automatically saves watch progress with debouncing to avoid excessive API calls.
 *
 * @param options - Configuration options
 * @returns Object containing progress state and save functions
 * @returns progress - Current progress data, or null if no progress exists
 * @returns loading - Whether progress is being loaded
 * @returns saveProgress - Function to save progress with debouncing (2 second delay)
 * @returns saveProgressImmediate - Function to save progress immediately without debouncing
 * @returns startPosition - The position (in seconds) to resume from
 * @returns isCompleted - Whether the video has been marked as completed
 *
 * @example
 * ```tsx
 * function VideoPlayer({ videoId }) {
 *   const { progress, saveProgress, startPosition } = useVideoProgress({ videoId });
 *
 *   // Resume from last position
 *   useEffect(() => {
 *     if (videoRef.current && startPosition > 0) {
 *       videoRef.current.currentTime = startPosition;
 *     }
 *   }, [startPosition]);
 *
 *   // Track progress during playback
 *   const handleTimeUpdate = () => {
 *     saveProgress(videoRef.current.currentTime);
 *   };
 * ```
 */
export function useVideoProgress({ videoId, enabled = true }: UseVideoProgressOptions) {
  const [progress, setProgress] = useState<VideoProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch progress on mount
  useEffect(() => {
    if (!enabled || !videoId) {
      setLoading(false);
      return;
    }

    apiGet<VideoProgress>(`/api/videos/${videoId}/progress`)
      .then((data) => {
        setProgress(data);
      })
      .catch((error) => {
        // Silently handle missing progress (first time watching)
        console.debug('No existing progress found for video:', videoId);
        setProgress(null);
      })
      .finally(() => setLoading(false));
  }, [videoId, enabled]);

  // Save progress with debouncing
  const saveProgress = useCallback(
    (position: number, completed = false) => {
      if (!enabled || !videoId) return;

      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce save to avoid too many API calls
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const updated = await apiSend<VideoProgress>(`/api/videos/${videoId}/progress`, 'POST', {
            currentPosition: Math.round(position),
            isCompleted: completed,
          });
          setProgress(updated);
        } catch (error) {
          // Don't interrupt user experience for progress save failures
          console.warn('Failed to save video progress:', error);
        }
      }, VIDEO_PROGRESS_SAVE_DELAY);
    },
    [videoId, enabled]
  );

  // Force immediate save (for when video is paused or completed)
  const saveProgressImmediate = useCallback(
    (position: number, completed = false) => {
      if (!enabled || !videoId) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      apiSend<VideoProgress>(`/api/videos/${videoId}/progress`, 'POST', {
        currentPosition: Math.round(position),
        isCompleted: completed,
      })
        .then((updated) => setProgress(updated))
        .catch((error) => {
          // Log but don't interrupt the user
          console.warn('Failed to save video progress immediately:', error);
        });
    },
    [videoId, enabled]
  );

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    progress,
    loading,
    saveProgress,
    saveProgressImmediate,
    startPosition: progress?.currentPosition ?? 0,
    isCompleted: progress?.isCompleted ?? false,
  };
}

// Hook to get all video progress for the current user
export function useAllVideoProgress() {
  const [progressMap, setProgressMap] = useState<Record<string, VideoProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<VideoProgress[]>('/api/videos/progress')
      .then((data) => {
        const map = data.reduce((acc, p) => {
          acc[p.videoId] = p;
          return acc;
        }, {} as Record<string, VideoProgress>);
        setProgressMap(map);
      })
      .catch((error) => {
        console.warn('Failed to load video progress:', error);
        setProgressMap({});
      })
      .finally(() => setLoading(false));
  }, []);

  return { progressMap, loading };
}
