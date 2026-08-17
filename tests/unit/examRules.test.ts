import assert from 'node:assert/strict';
import test from 'node:test';
import { effectiveExamDurationMinutes, examAccommodationValidationError, examAttemptIsExpired } from '../../shared/examRules';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../shared/examScheduleTime';

test('timed attempts expire at the server deadline while paused attempts stay frozen', () => {
  const deadline = '2026-08-17T10:00:00.000Z';
  assert.equal(examAttemptIsExpired({ serverDeadline: deadline, state: 'IN_PROGRESS' }, Date.parse(deadline)), true);
  assert.equal(examAttemptIsExpired({ serverDeadline: deadline, state: 'IN_PROGRESS' }, Date.parse(deadline) - 1), false);
  assert.equal(examAttemptIsExpired({ serverDeadline: deadline, state: 'PAUSED' }, Date.parse(deadline) + 60_000), false);
});

test('exam accommodations cannot create negative or unreasonable durations', () => {
  assert.equal(effectiveExamDurationMinutes(60, { extraTimePercent: 50, extraTimeMinutes: 15 }), 105);
  assert.match(examAccommodationValidationError({ extraTimePercent: -1 }) || '', /between 0 and 1000/);
  assert.match(examAccommodationValidationError({ extraTimeMinutes: 1.5 }) || '', /whole number/);
  assert.equal(examAccommodationValidationError({ extraTimePercent: 25, extraTimeMinutes: 10 }), null);
});

test('schedule datetime values round-trip without shifting the selected local time', () => {
  const localValue = '2026-08-17T09:30';
  assert.equal(toDateTimeLocalValue(localValue), localValue);
  const iso = fromDateTimeLocalValue(localValue);
  assert.ok(iso);
  assert.equal(toDateTimeLocalValue(iso), localValue);
});
