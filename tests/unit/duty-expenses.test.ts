import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dutyExpenseIsNotFuture,
  dutyExpenseMatchesAssignmentDate,
  isBoardingStudent,
  dutyExpenseRosterEligible,
  dutyExpenseAssignmentEligible,
  dutyExpenseToday,
} from '../../shared/dutyExpenses';

test('only boarding students are eligible for duty expense submissions', () => {
  assert.equal(isBoardingStudent('BOARDING'), true);
  assert.equal(isBoardingStudent('DAY'), false);
  assert.equal(isBoardingStudent(undefined), false);
});

test('a duty expense must use the assigned duty date', () => {
  const dutyDate = new Date('2026-09-16T00:00:00.000Z');
  assert.equal(dutyExpenseMatchesAssignmentDate('2026-09-16', dutyDate), true);
  assert.equal(dutyExpenseMatchesAssignmentDate('2026-09-15', dutyDate), false);
  assert.equal(dutyExpenseMatchesAssignmentDate('not-a-date', dutyDate), false);
});

test('future duty expenses are rejected', () => {
  const now = new Date('2026-09-16T12:00:00.000Z');
  assert.equal(dutyExpenseIsNotFuture('2026-09-16', now), true);
  assert.equal(dutyExpenseIsNotFuture('2026-09-15', now), true);
  assert.equal(dutyExpenseIsNotFuture('2026-09-17', now), false);
});

test('students can submit during active duties and after roster completion, never drafts or archives', () => {
  for (const status of ['PUBLISHED', 'ACTIVE', 'COMPLETED']) assert.equal(dutyExpenseRosterEligible(status), true);
  for (const status of ['DRAFT', 'ARCHIVED', 'UNKNOWN']) assert.equal(dutyExpenseRosterEligible(status), false);
  for (const status of ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED']) assert.equal(dutyExpenseAssignmentEligible(status), true);
  for (const status of ['ABSENT', 'EXCUSED', 'CANCELLED']) assert.equal(dutyExpenseAssignmentEligible(status), false);
});

test('school midnight allows today even when the server is still on yesterday in UTC', () => {
  const now = new Date('2026-09-15T16:01:00Z');
  assert.equal(dutyExpenseToday(now), '2026-09-16');
  assert.equal(dutyExpenseIsNotFuture('2026-09-16', now), true);
  assert.equal(dutyExpenseIsNotFuture('2026-09-17', now), false);
});

test('date-only duty matching is independent of server timezone and rejects impossible dates', () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = 'America/Los_Angeles';
    assert.equal(dutyExpenseMatchesAssignmentDate('2026-09-16', new Date('2026-09-16T00:00:00Z')), true);
    assert.equal(dutyExpenseIsNotFuture('2026-02-30', new Date('2026-09-16')), false);
    assert.equal(dutyExpenseMatchesAssignmentDate('2026-02-30', '2026-03-02'), false);
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});
