/** State transitions for teacher controls. Persistence and auditing stay transactional. */
interface InvigilationAttempt {
  state: string;
  invalidatedAt?: Date | string | null;
  serverDeadline?: Date | string | null;
  effectiveDurationMinutes?: number | null;
  pausedAt?: Date | string | null;
  updatedAt?: Date | string;
  accumulatedPauseSeconds?: number;
}
export function invigilationChange(attempt: InvigilationAttempt, input: Record<string, unknown>, now = Date.now()) {
  const action = String(input.action || '').toUpperCase();
  const fail = (http: number, message: string): never => { throw Object.assign(new Error(message), { http }); };
  const active = ['IN_PROGRESS', 'PAUSED'].includes(attempt.state);
  const completed = ['SUBMITTED', 'AUTO_SUBMITTED', 'PENDING_GRADING', 'FINALIZED', 'RELEASED'].includes(attempt.state);
  if (attempt.invalidatedAt && !['INVALIDATE', 'INCIDENT_NOTE'].includes(action)) fail(409, 'This attempt has been voided');
  const minutes = (fallback?: number) => {
    const value = input.minutes === undefined ? fallback : input.minutes;
    const mins = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
    if (!Number.isInteger(mins) || mins < 1 || mins > 1440) fail(400, 'Minutes must be a whole number between 1 and 1440');
    return mins;
  };
  let data: Record<string, unknown> = {};
  const payload: Record<string, unknown> = { action };
  switch (action) {
    case 'FORCE_SUBMIT':
      if (!active && !completed) fail(409, 'Only an active attempt can be force submitted');
      break;
    case 'EXTRA_TIME': {
      if (!active) fail(409, 'Extra time can only be added to an active attempt');
      if (!attempt.serverDeadline) fail(409, 'This attempt has no time limit');
      const mins = minutes();
      data = { serverDeadline: new Date(new Date(attempt.serverDeadline).getTime() + mins * 60000), effectiveDurationMinutes: (attempt.effectiveDurationMinutes || 0) + mins };
      payload.minutes = mins;
      break;
    }
    case 'PAUSE':
      if (attempt.state !== 'IN_PROGRESS') fail(409, 'Only an in-progress attempt can be paused');
      if (attempt.serverDeadline && new Date(attempt.serverDeadline).getTime() <= now) fail(409, 'This attempt has run out of time. Submit it or grant extra time.');
      data = { state: 'PAUSED', pausedAt: new Date(now) };
      break;
    case 'RESUME': {
      if (attempt.state !== 'PAUSED') fail(409, 'Only a paused attempt can be resumed');
      const pausedSince = new Date(attempt.pausedAt || attempt.updatedAt || NaN).getTime();
      if (!Number.isFinite(pausedSince)) fail(409, 'The pause time is unavailable');
      const extra = Math.max(0, now - pausedSince);
      data = { state: 'IN_PROGRESS', pausedAt: null, accumulatedPauseSeconds: (attempt.accumulatedPauseSeconds || 0) + Math.floor(extra / 1000), serverDeadline: attempt.serverDeadline ? new Date(new Date(attempt.serverDeadline).getTime() + extra) : null };
      break;
    }
    case 'REOPEN': {
      if (!completed || attempt.state === 'RELEASED') fail(409, 'This attempt cannot be reopened');
      const mins = minutes(15);
      data = { state: 'IN_PROGRESS', isCompleted: false, autoSubmitted: false, pausedAt: null, submittedAt: null, completedAt: null, serverDeadline: new Date(now + mins * 60000), sessionToken: null };
      payload.minutes = mins;
      break;
    }
    case 'INVALIDATE':
      if (attempt.state === 'INVALIDATED') fail(409, 'This attempt has already been voided');
      data = { state: 'INVALIDATED', invalidatedAt: new Date(now), sessionToken: null };
      break;
    case 'INCIDENT_NOTE': {
      const note = typeof input.note === 'string' ? input.note.trim() : '';
      if (!note || note.length > 2000) fail(400, 'Enter an incident note between 1 and 2000 characters');
      payload.note = note;
      break;
    }
    default: fail(400, 'Unknown action');
  }
  return { action, data, payload };
}
