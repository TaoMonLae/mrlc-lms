import assert from 'node:assert/strict';
import test from 'node:test';
import { formatVolunteerIssueDate, formatVolunteerSignedAt } from '../../shared/volunteerDocumentDates';

test('volunteer issue dates use explicit day, month name and year', () => {
  assert.equal(formatVolunteerIssueDate('2026-10-30'), '30 October 2026');
  assert.equal(formatVolunteerIssueDate('2024-02-29'), '29 February 2024');
  assert.equal(formatVolunteerIssueDate('2000-02-29'), '29 February 2000');
  assert.equal(formatVolunteerIssueDate('2026-10-30T01:30:00Z'), '30 October 2026');
});

test('timestamps use the Malaysian calendar at midnight and year boundaries', () => {
  assert.equal(formatVolunteerIssueDate('2026-10-29T15:59:59.999Z'), '29 October 2026');
  assert.equal(formatVolunteerIssueDate('2026-10-29T16:00:00.000Z'), '30 October 2026');
  assert.equal(formatVolunteerIssueDate('2026-12-31T16:00:00Z'), '1 January 2027');
  assert.equal(formatVolunteerIssueDate('2026-10-30T00:30:00+09:00'), '29 October 2026');
  assert.equal(formatVolunteerIssueDate('2026-10-29T18:30:00-07:00'), '30 October 2026');
});

test('invalid or ambiguous calendar dates never roll over or use browser guessing', () => {
  for (const value of [
    '2025-02-29', '1900-02-29', '2026-02-30', '2026-04-31', '2026-00-10', '2026-13-01',
    '2026-10-00', '2026-10-32', '0000-01-01', '2026-1-01', '30/10/2026', '10/30/2026',
    'October 30, 2026', '2026-10', '2026-10-30T01:30:00', '2026-02-30T01:30:00Z',
    '2026-10-30T24:00:00Z', '2026-10-30T01:60:00Z', '2026-10-30T01:30:60Z',
    '2026-10-30T01:30:00+24:00', '2026-10-30T01:30:00+08:60', 'not a date', ' ',
  ]) {
    assert.equal(formatVolunteerIssueDate(value), 'Date unavailable', value);
    assert.equal(formatVolunteerSignedAt(value), 'Date unavailable', value);
  }
  assert.equal(formatVolunteerIssueDate(), 'Set when issued');
  assert.equal(formatVolunteerIssueDate(null), 'Set when issued');
  assert.equal(formatVolunteerIssueDate(''), 'Set when issued');
});

test('signature dates include unambiguous Malaysian 24-hour time', () => {
  assert.equal(formatVolunteerSignedAt('2026-10-30T01:30:00Z'), '30 October 2026, 09:30 MYT');
  assert.equal(formatVolunteerSignedAt('2026-10-29T16:00:00.000Z'), '30 October 2026, 00:00 MYT');
  assert.equal(formatVolunteerSignedAt('2026-10-30T09:30:00+08:00'), '30 October 2026, 09:30 MYT');
  assert.equal(formatVolunteerSignedAt('2026-10-30T09:30+08:00'), '30 October 2026, 09:30 MYT');
  assert.equal(formatVolunteerSignedAt('2026-10-30'), 'Date unavailable');
  assert.equal(formatVolunteerSignedAt(), 'Date unavailable');
  assert.equal(formatVolunteerSignedAt(null), 'Date unavailable');
  assert.equal(formatVolunteerSignedAt(''), 'Date unavailable');
});

test('calendar dates and timestamp rendering are independent of the host timezone', () => {
  const previousZone = process.env.TZ;
  try {
    for (const zone of ['UTC', 'Pacific/Honolulu', 'Asia/Tokyo', 'America/Los_Angeles']) {
      process.env.TZ = zone;
      assert.equal(formatVolunteerIssueDate('2026-10-30'), '30 October 2026', zone);
      assert.equal(formatVolunteerIssueDate('2026-10-29T16:30:00Z'), '30 October 2026', zone);
      assert.equal(formatVolunteerSignedAt('2026-10-29T16:30:00Z'), '30 October 2026, 00:30 MYT', zone);
    }
  } finally {
    if (previousZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousZone;
  }
});
