export function coursePercent(completedLessons: number, totalLessons: number) {
  if (!Number.isFinite(completedLessons) || !Number.isFinite(totalLessons) || totalLessons <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completedLessons / totalLessons) * 100)));
}
