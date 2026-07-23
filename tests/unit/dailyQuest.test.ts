import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateDailyQuestStreak,
  canUseDailyQuest,
  dailyQuestDayKey,
  dailyQuestPoints,
  seededDailyQuestShuffle,
} from '../../shared/dailyQuest';

test('Daily Quest is restricted to student and teacher accounts', () => {
  assert.equal(canUseDailyQuest('STUDENT'), true);
  assert.equal(canUseDailyQuest('TEACHER'), true);
  for (const role of ['ADMIN', 'STAFF', 'ACCOUNTANT', 'CASE_WORKER', 'LIBRARIAN']) {
    assert.equal(canUseDailyQuest(role), false, `${role} should not have Daily Quest access`);
  }
});

test('Daily Quest uses the Kuala Lumpur calendar day', () => {
  assert.equal(dailyQuestDayKey(new Date('2026-07-22T16:30:00Z')), '2026-07-23');
});

test('Daily Quest calculates current and best streaks across gaps', () => {
  assert.deepEqual(
    calculateDailyQuestStreak(
      ['2026-07-17', '2026-07-18', '2026-07-21', '2026-07-22'],
      '2026-07-23',
    ),
    { current: 2, best: 2 },
  );
  assert.deepEqual(
    calculateDailyQuestStreak(
      ['2026-07-17', '2026-07-18', '2026-07-19', '2026-07-21'],
      '2026-07-23',
    ),
    { current: 0, best: 3 },
  );
});

test('Daily Quest completion XP rewards accuracy and challenge mode', () => {
  assert.equal(dailyQuestPoints('RELAXED', 2, 3), 40);
  assert.equal(dailyQuestPoints('STANDARD', 5, 5), 70);
  assert.equal(dailyQuestPoints('CHALLENGE', 6, 7), 90);
  assert.equal(dailyQuestPoints('STANDARD', 99, 5), 70);
});

test('Daily Quest shuffling is deterministic without mutating the source', () => {
  const source = ['a', 'b', 'c', 'd', 'e'];
  const first = seededDailyQuestShuffle(source, 'student:2026-07-23:STANDARD');
  const second = seededDailyQuestShuffle(source, 'student:2026-07-23:STANDARD');

  assert.deepEqual(first, second);
  assert.deepEqual(source, ['a', 'b', 'c', 'd', 'e']);
  assert.notDeepEqual(first, source);
});
