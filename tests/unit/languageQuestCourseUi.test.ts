import assert from 'node:assert/strict';
import test from 'node:test';
import { coursePercent } from '../../src/lib/languageQuestCourseUi';

test('course progress stays within the visible zero-to-100 range', () => {
  assert.equal(coursePercent(2, 7), 29);
  assert.equal(coursePercent(9, 7), 100);
  assert.equal(coursePercent(-2, 7), 0);
});

test('course progress fails safely for empty or invalid totals', () => {
  assert.equal(coursePercent(0, 0), 0);
  assert.equal(coursePercent(2, Number.NaN), 0);
});
