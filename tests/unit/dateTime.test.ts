import assert from 'node:assert/strict';
import test from 'node:test';
import { formatSchoolDate, formatSchoolTime, formatTimeZoneLabel } from '../../src/lib/dateTime';

const instant = new Date('2026-08-31T16:05:04.000Z');

test('school date formatting respects the configured zone and date order', () => {
  assert.equal(formatSchoolDate(instant, 'Asia/Kuala_Lumpur', 'DD/MM/YYYY'), '01/09/2026');
  assert.equal(formatSchoolDate(instant, 'Asia/Kuala_Lumpur', 'MM/DD/YYYY'), '09/01/2026');
  assert.equal(formatSchoolDate(instant, 'Asia/Kuala_Lumpur', 'YYYY-MM-DD'), '2026-09-01');
});

test('school clock supports 12-hour, 24-hour, and optional seconds', () => {
  assert.equal(formatSchoolTime(instant, 'Asia/Kuala_Lumpur', '24', true), '00:05:04');
  assert.equal(formatSchoolTime(instant, 'Asia/Kuala_Lumpur', '24', false), '00:05');
  assert.equal(formatSchoolTime(instant, 'Asia/Kuala_Lumpur', '12', false), '12:05 AM');
});

test('invalid time zones fail safely to UTC', () => {
  assert.equal(formatSchoolDate(instant, 'Not/A_Zone', 'YYYY-MM-DD'), '2026-08-31');
  assert.match(formatTimeZoneLabel('Not/A_Zone', instant), /^UTC · GMT/);
});
