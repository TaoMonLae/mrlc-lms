/** A persisted, wall-clock timer. Closing a browser never pauses it. */
export const ESSAY_TIMER_EVENT = 'ESSAY_STARTED';
export const TIMED_ESSAY_TYPES = ['ESSAY', 'EXTENDED', 'WRITTEN'];
export type EssayTimer = {
  questionId: string;
  durationSeconds: number;
  started: boolean;
  remainingSeconds: number;
  deadline: string | null;
  serverTime: string;
};
export type EssayClockRecord = {
  questionId: string;
  durationSeconds: number;
  deadline: string;
  accumulatedPauseSeconds: number;
};

export function essayTimerConfig(settings: any, questions: { id: string; type: string }[]) {
  const durationSeconds = Math.max(0, Math.min(600, Math.floor(Number(settings?.essayMinutes) || 0))) * 60;
  const question = durationSeconds > 0 ? questions.find(q => TIMED_ESSAY_TYPES.includes(q.type)) : undefined;
  return question ? { questionId: question.id, durationSeconds } : null;
}

export function essayTimerState(config: { questionId: string; durationSeconds: number }, record: EssayClockRecord | null, attempt: any, now = Date.now()): EssayTimer {
  if (!record) return { ...config, started: false, remainingSeconds: config.durationSeconds, deadline: null, serverTime: new Date(now).toISOString() };
  const pauseSeconds = Math.max(0, (attempt.accumulatedPauseSeconds || 0) - record.accumulatedPauseSeconds);
  const deadline = new Date(record.deadline).getTime() + pauseSeconds * 1000;
  const clockNow = attempt.state === 'PAUSED' && attempt.pausedAt ? new Date(attempt.pausedAt).getTime() : now;
  return {
    questionId: record.questionId, durationSeconds: record.durationSeconds, started: true,
    remainingSeconds: Math.max(0, Math.ceil((deadline - clockNow) / 1000)),
    deadline: new Date(deadline).toISOString(), serverTime: new Date(now).toISOString(),
  };
}

export type EssayDisplayClock = { questionId: string; serverDeadline: number; localDeadline: number; roundTripMs: number };

/** Estimate the server offset once, then preserve the established countdown.
 * Slow heartbeats must not charge outbound/server processing time twice. Only
 * a faster sample refines the offset; deadline changes still apply pause credit.
 */
export function essayDisplayClock(timer: EssayTimer, localNow: number, requestElapsedMs = 0, previous: EssayDisplayClock | null = null): EssayDisplayClock | null {
  if (!timer.started || !timer.deadline) return null;
  const serverDeadline = new Date(timer.deadline).getTime();
  const roundTripMs = Math.max(0, requestElapsedMs);
  if (previous?.questionId === timer.questionId && previous.roundTripMs <= roundTripMs) {
    return { ...previous, serverDeadline, localDeadline: previous.localDeadline + serverDeadline - previous.serverDeadline };
  }
  // Midpoint clock-offset estimate does not assume a correct device wall clock.
  const localDeadline = localNow + serverDeadline - new Date(timer.serverTime).getTime() - roundTripMs / 2;
  return { questionId: timer.questionId, serverDeadline, localDeadline, roundTripMs };
}
