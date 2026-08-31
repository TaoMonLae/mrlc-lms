import assert from 'node:assert/strict';
import test from 'node:test';
import {
  csvCell,
  layoutTimetableDay,
  occursOn,
  type TimetableEntry,
} from '../../src/lib/timetable';

function entry(overrides: Partial<TimetableEntry> = {}): TimetableEntry {
  return {
    id: overrides.id || 'slot-1',
    classId: 'class-1',
    className: 'GED A',
    subjectId: 'subject-1',
    subjectName: 'English',
    subjectColor: null,
    teacherId: 'teacher-1',
    teacherName: 'Teacher One',
    dayOfWeek: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    room: 'Room 1',
    recurrence: 'WEEKLY',
    scheduleType: 'CLASS',
    status: 'ACTIVE',
    ...overrides,
  };
}

test('one-off and effective-date records appear only in valid timetable windows', () => {
  const oneOff = entry({ recurrence: 'ONCE', eventDate: '2026-09-07' });
  assert.equal(occursOn(oneOff, new Date(2026, 8, 7)), true);
  assert.equal(occursOn(oneOff, new Date(2026, 8, 14)), false);

  const bounded = entry({ effectiveFrom: '2026-09-01', effectiveUntil: '2026-09-30' });
  assert.equal(occursOn(bounded, new Date(2026, 8, 14)), true);
  assert.equal(occursOn(bounded, new Date(2026, 9, 5)), false);
});

test('biweekly records alternate from their effective week', () => {
  const biweekly = entry({ recurrence: 'BIWEEKLY', effectiveFrom: '2026-09-07', effectiveUntil: '2026-12-31' });
  assert.equal(occursOn(biweekly, new Date(2026, 8, 7)), true);
  assert.equal(occursOn(biweekly, new Date(2026, 8, 14)), false);
  assert.equal(occursOn(biweekly, new Date(2026, 8, 21)), true);
});

test('overlapping entries receive lanes while adjacent entries reuse space', () => {
  const positioned = layoutTimetableDay([
    entry({ id: 'a', startTime: '09:00', endTime: '10:00' }),
    entry({ id: 'b', startTime: '09:30', endTime: '10:30' }),
    entry({ id: 'c', startTime: '10:30', endTime: '11:00' }),
  ]);
  assert.deepEqual(positioned.slice(0, 2).map(({ lane, lanes }) => ({ lane, lanes })), [
    { lane: 0, lanes: 2 },
    { lane: 1, lanes: 2 },
  ]);
  assert.deepEqual({ lane: positioned[2].lane, lanes: positioned[2].lanes }, { lane: 0, lanes: 1 });
});

test('CSV cells escape quotes, commas, and line breaks safely', () => {
  assert.equal(csvCell('English, "Level 2"\nRoom'), '"English, ""Level 2""\nRoom"');
});
