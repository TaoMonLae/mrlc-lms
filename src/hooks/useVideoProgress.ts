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
  /** Saved duration, used until browser media metadata is available */
  duration?: number | null;
}

interface PendingVideoProgress {
  currentPosition: number;
  isCompleted: boolean;
  duration?: number;
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
export function useVideoProgress({
  videoId,
  enabled = true,
  duration,
}: UseVideoProgressOptions) {
  const [progress, setProgress] = useState<VideoProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<PendingVideoProgress | null>(null);
  const mountedRef = useRef(true);

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

  const buildPayload = useCallback(
    (
      position: number,
      completed: boolean,
      mediaDuration?: number,
    ): PendingVideoProgress => {
      const resolvedDuration = Number.isFinite(mediaDuration) && Number(mediaDuration) > 0
        ? Math.round(Number(mediaDuration))
        : Number.isFinite(duration) && Number(duration) > 0
          ? Math.round(Number(duration))
          : undefined;
      return {
        currentPosition: Number.isFinite(position)
          ? Math.max(0, Math.round(position))
          : 0,
        isCompleted: completed,
        ...(resolvedDuration ? { duration: resolvedDuration } : {}),
      };
    },
    [duration],
  );

  const sendProgress = useCallback(
    async (payload: PendingVideoProgress, updateState = true) => {
      try {
        const updated = await apiSend<VideoProgress>(
          `/api/videos/${videoId}/progress`,
          'POST',
          payload,
        );
        if (updateState && mountedRef.current) setProgress(updated);
      } catch (error) {
        console.warn('Failed to save video progress:', error);
      }
    },
    [videoId],
  );

  const flushPending = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const pending = pendingSaveRef.current;
    pendingSaveRef.current = null;
    if (pending) void sendProgress(pending);
  }, [sendProgress]);

  const saveProgress = useCallback(
    (position: number, completed = false, mediaDuration?: number) => {
      if (!enabled || !videoId) return;
      pendingSaveRef.current = buildPayload(position, completed, mediaDuration);
      if (!saveTimeoutRef.current) {
        saveTimeoutRef.current = setTimeout(flushPending, VIDEO_PROGRESS_SAVE_DELAY);
      }
    },
    [videoId, enabled, buildPayload, flushPending],
  );

  const saveProgressImmediate = useCallback(
    (position: number, completed = false, mediaDuration?: number) => {
      if (!enabled || !videoId) return;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      pendingSaveRef.current = null;
      void sendProgress(buildPayload(position, completed, mediaDuration));
    },
    [videoId, enabled, buildPayload, sendProgress],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      const pending = pendingSaveRef.current;
      pendingSaveRef.current = null;
      if (pending) void sendProgress(pending, false);
    };
  }, [sendProgress]);

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
