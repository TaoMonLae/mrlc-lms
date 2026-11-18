import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isPlacementForm, PLACEMENT_GRACE_SECONDS, PLACEMENT_TIME_LIMIT_SECONDS, type PlacementForm } from '../shared/placementTest';

export interface PlacementAttempt {
  form: PlacementForm;
  startedAt: number;
  contact: string;
  nonce: string;
}

export const ATTEMPT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const encode = (value: string) => Buffer.from(value).toString('base64url');
const sign = (payload: string, secret: string) => createHmac('sha256', `placement-attempt:${secret}`).update(payload).digest('base64url');

export function contactKey(phone: string) {
  return phone.replace(/\D/g, '').replace(/^0+/, '').slice(-9);
}

export function createAttemptToken(input: { form: PlacementForm; contactNumber: string; now?: number }, secret: string) {
  const attempt: PlacementAttempt = { form: input.form, startedAt: input.now ?? Date.now(), contact: contactKey(input.contactNumber), nonce: randomBytes(9).toString('base64url') };
  const payload = encode(JSON.stringify(attempt));
  return { token: `${payload}.${sign(payload, secret)}`, attempt };
}

export function readAttemptToken(token: unknown, secret: string): PlacementAttempt | null {
  if (typeof token !== 'string' || token.length > 600) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const attempt = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as PlacementAttempt;
    if (!isPlacementForm(attempt.form) || typeof attempt.startedAt !== 'number' || typeof attempt.contact !== 'string' || typeof attempt.nonce !== 'string') return null;
    return attempt;
  } catch {
    return null;
  }
}

export function attemptTiming(attempt: PlacementAttempt, now = Date.now()) {
  const elapsedSeconds = Math.max(0, Math.round((now - attempt.startedAt) / 1000));
  return {
    elapsedSeconds,
    durationSeconds: Math.min(elapsedSeconds, PLACEMENT_TIME_LIMIT_SECONDS),
    overTime: elapsedSeconds > PLACEMENT_TIME_LIMIT_SECONDS + PLACEMENT_GRACE_SECONDS,
    expired: now - attempt.startedAt > ATTEMPT_MAX_AGE_MS || attempt.startedAt > now + 60_000,
  };
}
