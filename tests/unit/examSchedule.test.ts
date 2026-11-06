import assert from 'node:assert/strict';
import test from 'node:test';
import { examScheduleUpdate } from '../../shared/examSchedule';

test('schedule edits validate supplied dates against the existing other boundary', () => {
  const current = { availableFrom: '2026-11-05T01:00:00Z', availableUntil: '2026-11-05T03:00:00Z' };
  assert.throws(() => examScheduleUpdate({ availableUntil: '2026-11-05T00:00:00Z' }, current), /after/);
  assert.throws(() => examScheduleUpdate({ availableFrom: '2026-11-05T04:00:00Z' }, current), /after/);
  assert.deepEqual(examScheduleUpdate({ availableUntil: null }, current), { availableUntil: null });
  assert.deepEqual(examScheduleUpdate({ shuffleOptions: true }, current), { shuffleOptions: true });
});
test('schedule inputs reject malformed values instead of resetting attempt limits or enabling flags', () => {
  for (const input of [{ attemptLimit: 'bad' }, { attemptLimit: '' }, { gracePeriodMinutes: -1 }, { durationMinutes: 'bad' }, { requiresAccessCode: 'false' }, { availableFrom: 'bad' }]) {
    assert.throws(() => examScheduleUpdate(input, {}));
  }
  assert.deepEqual(examScheduleUpdate({ durationMinutes: null, attemptLimit: '2', passMark: '' }, {}), { durationMinutes: null, attemptLimit: 2, passMark: null });
  assert.throws(() => examScheduleUpdate({ passMark: 10 }, { totalMarks: 5 }), /total/);
  assert.deepEqual(examScheduleUpdate({ ownerId: 'forged', editorIds: ['forged'] }, {}), {});
});
