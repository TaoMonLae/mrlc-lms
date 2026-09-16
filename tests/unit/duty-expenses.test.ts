import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dutyExpenseIsNotFuture,
  dutyExpenseMatchesAssignmentDate,
  isBoardingStudent,
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
