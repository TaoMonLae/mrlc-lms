export interface TimedExamAttempt {
  serverDeadline?: Date | string | null;
  state?: string | null;
}

export interface ExamAccommodationInput {
  extraTimePercent?: number | null;
  extraTimeMinutes?: number | null;
}

export function examAttemptIsExpired(attempt: TimedExamAttempt, now = Date.now()): boolean {
  if (!attempt.serverDeadline || attempt.state === 'PAUSED') return false;
  const deadline = new Date(attempt.serverDeadline).getTime();
  return Number.isFinite(deadline) && now >= deadline;
}

export function effectiveExamDurationMinutes(baseMinutes: number, accommodation?: ExamAccommodationInput | null): number {
  let minutes = baseMinutes;
  if (accommodation?.extraTimePercent) minutes += (baseMinutes * accommodation.extraTimePercent) / 100;
  if (accommodation?.extraTimeMinutes) minutes += accommodation.extraTimeMinutes;
  return Math.max(1, Math.round(minutes));
}

export function examAccommodationValidationError(input: ExamAccommodationInput): string | null {
  const percent = input.extraTimePercent;
  const minutes = input.extraTimeMinutes;
  if (percent != null && (!Number.isFinite(percent) || percent < 0 || percent > 1000)) {
    return 'Extra time percent must be between 0 and 1000';
  }
  if (minutes != null && (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440)) {
    return 'Extra time minutes must be a whole number between 0 and 1440';
  }
  return null;
}
