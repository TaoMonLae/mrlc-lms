type WindowDate = Date | string | null;
interface AvailabilityExam {
  status: string;
  availableFrom?: WindowDate;
  availableUntil?: WindowDate;
  allowLateStart?: boolean;
  attemptLimit: number;
}
interface AssignmentOverride {
  availableFromOverride?: WindowDate;
  availableUntilOverride?: WindowDate;
  attemptLimitOverride?: number | null;
}
interface AvailabilityAttempt { id: string; state: string; attemptNumber?: number }

/** The same scheduling and attempt rules for both student entry points. */
export function examAvailability(exam: AvailabilityExam, assignment: AssignmentOverride | null | undefined, attempts: AvailabilityAttempt[], now = Date.now()) {
  const availableFrom = assignment?.availableFromOverride ?? exam.availableFrom ?? null;
  const availableUntil = assignment?.availableUntilOverride ?? exam.availableUntil ?? null;
  const attemptLimit = assignment?.attemptLimitOverride ?? exam.attemptLimit;
  const attemptsUsed = attempts.filter(a => a.state !== 'INVALIDATED').length;
  const activeAttemptId = [...attempts].sort((a, b) => (b.attemptNumber ?? 0) - (a.attemptNumber ?? 0))
    .find(a => ['IN_PROGRESS', 'PAUSED'].includes(a.state))?.id ?? null;
  const published = ['PUBLISHED', 'ACTIVE', 'SCHEDULED'].includes(exam.status);
  const upcoming = Boolean(availableFrom && now < new Date(availableFrom).getTime());
  const closed = Boolean(availableUntil && now > new Date(availableUntil).getTime() && !exam.allowLateStart);
  const openNow = published && !upcoming && !closed;
  return { availableFrom, availableUntil, attemptLimit, attemptsUsed, activeAttemptId, openNow,
    canStart: openNow && Boolean(activeAttemptId || attemptsUsed < attemptLimit), upcoming, closed };
}

export function teacherExamStatus(status: string, attempts: { state?: string; isCompleted: boolean; score: number | null }[]) {
  if (status === 'DRAFT' || status === 'ARCHIVED') return status;
  const completed = attempts.filter(a => a.isCompleted && a.state !== 'INVALIDATED');
  if (completed.some(a => a.score == null)) return 'NEEDS_GRADING';
  if (attempts.some(a => ['IN_PROGRESS', 'PAUSED'].includes(a.state || ''))) return 'ACTIVE';
  if (completed.length) return 'GRADED';
  return status;
}
