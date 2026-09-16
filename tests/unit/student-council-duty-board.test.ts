import assert from 'node:assert/strict';
import test from 'node:test';
import { dutyDateIsWithinRoster, rosterDateKeys } from '../../shared/cookingDutyBoard';
import { isStudentCouncilRole, parseStudentCouncilRole, studentCouncilRoleLabel } from '../../shared/studentCouncil';

test('student council roles use stable values and corrected labels', () => {
  assert.equal(isStudentCouncilRole('PRESIDENT'), true);
  assert.equal(isStudentCouncilRole('LIBRIAN'), false);
  assert.equal(studentCouncilRoleLabel('LIBRARIAN'), 'Librarian');
  assert.equal(studentCouncilRoleLabel('HOSTEL_MONITOR_BOYS'), "Boys' Hostel Monitor");
  assert.equal(parseStudentCouncilRole("Boys' Hostel Monitor"), 'HOSTEL_MONITOR_BOYS');
  assert.equal(parseStudentCouncilRole('Vice President'), 'VICE_PRESIDENT');
});

test('cooking duty dates stay inside their roster window', () => {
  assert.equal(dutyDateIsWithinRoster('2026-09-16', '2026-09-15', '2026-09-21'), true);
  assert.equal(dutyDateIsWithinRoster('2026-09-22', '2026-09-15', '2026-09-21'), false);
});

test('cooking duty board includes every roster date in order', () => {
  assert.deepEqual(rosterDateKeys('2026-09-15', '2026-09-18'), [
    '2026-09-15',
    '2026-09-16',
    '2026-09-17',
    '2026-09-18',
  ]);
});
