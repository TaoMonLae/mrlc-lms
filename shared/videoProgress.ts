export const VIDEO_COMPLETION_THRESHOLD = 90;

export function normalizeVideoDuration(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.max(1, Math.round(value));
}

export function videoWatchPercent(
  currentPosition: number,
  duration: number | null,
  isCompleted = false,
): number {
  if (isCompleted) return 100;
  const safeDuration = normalizeVideoDuration(duration);
  if (!safeDuration || !Number.isFinite(currentPosition)) return 0;
  const safePosition = Math.max(0, Math.min(safeDuration, currentPosition));
  return Math.min(100, Math.round((safePosition / safeDuration) * 100));
}

export function resolveVideoProgressUpdate(input: {
  currentPosition: number;
  reportedDuration?: number | null;
  storedDuration?: number | null;
  isCompleted: boolean;
  previousPosition?: number | null;
  wasCompleted?: boolean;
}) {
  const duration = normalizeVideoDuration(input.reportedDuration)
    ?? normalizeVideoDuration(input.storedDuration);
  const submittedPosition = Number.isFinite(input.currentPosition)
    ? Math.max(0, Math.round(input.currentPosition))
    : 0;
  const previousPosition = Number.isFinite(input.previousPosition)
    ? Math.max(0, Math.round(input.previousPosition ?? 0))
    : 0;
  const currentPosition = duration
    ? Math.min(duration, Math.max(previousPosition, submittedPosition))
    : Math.max(previousPosition, submittedPosition);
  const percent = videoWatchPercent(currentPosition, duration);
  const reachedCompletionThreshold = duration
    ? (currentPosition / duration) * 100 >= VIDEO_COMPLETION_THRESHOLD
    : false;
  const isCompleted = Boolean(
    input.wasCompleted
    || input.isCompleted
    || reachedCompletionThreshold,
  );

  return {
    currentPosition,
    duration,
    percent: isCompleted ? 100 : percent,
    isCompleted,
  };
}
