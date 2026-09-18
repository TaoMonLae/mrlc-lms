import assert from 'node:assert/strict';
import test from 'node:test';
import { examAvailability, teacherExamStatus } from '../../shared/examAvailability';
const now = Date.parse('2026-09-18T10:00:00Z');
const exam = { status: 'PUBLISHED', attemptLimit: 2, availableFrom: '2026-09-18T09:00:00Z', availableUntil: '2026-09-18T11:00:00Z' };
test('individual windows override both opening and closing times', () => {
  assert.equal(examAvailability(exam, { availableFromOverride: '2026-09-18T12:00:00Z' }, [], now).openNow, false);
  assert.equal(examAvailability({ ...exam, availableUntil: '2026-09-18T09:30:00Z' }, { availableUntilOverride: '2026-09-18T12:00:00Z' }, [], now).canStart, true);
});
test('completed attempts permit retakes; invalidated attempts do not consume the limit', () => {
  const attempts = [{ id: 'one', state: 'FINALIZED' }, { id: 'two', state: 'INVALIDATED' }];
  assert.equal(examAvailability(exam, null, attempts, now).canStart, true);
  assert.equal(examAvailability(exam, { attemptLimitOverride: 1 }, attempts, now).canStart, false);
});
test('resume remains available at the attempt limit but respects the server window', () => {
  const attempts = [{ id: 'one', state: 'FINALIZED', attemptNumber: 1 }, { id: 'two', state: 'PAUSED', attemptNumber: 2 }];
  assert.equal(examAvailability(exam, null, attempts, now).activeAttemptId, 'two');
  assert.equal(examAvailability(exam, null, attempts, now).canStart, true);
  assert.equal(examAvailability(exam, null, attempts, now + 7200000).canStart, false);
  assert.equal(examAvailability({ ...exam, allowLateStart: true }, null, attempts, now + 7200000).canStart, true);
  assert.equal(examAvailability({ ...exam, status: 'ARCHIVED' }, null, attempts, now).canStart, false);
});
test('teacher status distinguishes published, active and awaiting manual grades', () => {
  assert.equal(teacherExamStatus('PUBLISHED', []), 'PUBLISHED');
  assert.equal(teacherExamStatus('ACTIVE', [{ state: 'IN_PROGRESS', isCompleted: false, score: null }]), 'ACTIVE');
  assert.equal(teacherExamStatus('CLOSED', [{ state: 'PENDING_GRADING', isCompleted: true, score: null }]), 'NEEDS_GRADING');
  assert.equal(teacherExamStatus('PUBLISHED', [{ state: 'INVALIDATED', isCompleted: true, score: null }]), 'PUBLISHED');
  assert.equal(teacherExamStatus('DRAFT', []), 'DRAFT');
});
