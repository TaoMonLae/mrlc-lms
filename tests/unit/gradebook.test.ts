import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_GRADE_ITEM_MARKS,
  isGradeCategory,
  normalizeGradeItemTitle,
  parseCategoryWeight,
  parseGradeItemDate,
  parseGradeItemMaxMarks,
  parseGradeMarks,
} from '../../shared/gradebook';

test('grade item titles are trimmed and bounded', () => {
  assert.equal(normalizeGradeItemTitle('  Algebra Quiz 1  '), 'Algebra Quiz 1');
  assert.equal(normalizeGradeItemTitle('   '), null);
  assert.equal(normalizeGradeItemTitle('x'.repeat(121)), null);
});

test('grade item maximum marks must be positive, finite, and reasonably bounded', () => {
  assert.equal(parseGradeItemMaxMarks('100'), 100);
  assert.equal(parseGradeItemMaxMarks('2.5'), 2.5);
  assert.equal(parseGradeItemMaxMarks(0), null);
  assert.equal(parseGradeItemMaxMarks(-1), null);
  assert.equal(parseGradeItemMaxMarks('not-a-number'), null);
  assert.equal(parseGradeItemMaxMarks(MAX_GRADE_ITEM_MARKS + 1), null);
});

test('grade marks distinguish an empty mark from an invalid mark', () => {
  assert.equal(parseGradeMarks('', 100), null);
  assert.equal(parseGradeMarks('74.5', 100), 74.5);
  assert.equal(parseGradeMarks('-1', 100), undefined);
  assert.equal(parseGradeMarks('101', 100), undefined);
  assert.equal(parseGradeMarks('not-a-number', 100), undefined);
});

test('category weights accept only whole percentages between zero and one hundred', () => {
  assert.equal(parseCategoryWeight('20'), 20);
  assert.equal(parseCategoryWeight(0), 0);
  assert.equal(parseCategoryWeight(20.5), null);
  assert.equal(parseCategoryWeight(-1), null);
  assert.equal(parseCategoryWeight(101), null);
});

test('categories and dates reject unsupported values', () => {
  assert.equal(isGradeCategory('QUIZ'), true);
  assert.equal(isGradeCategory('PROJECT'), false);
  assert.equal(parseGradeItemDate('2026-08-06')?.toISOString(), '2026-08-06T00:00:00.000Z');
  assert.equal(parseGradeItemDate('not-a-date'), null);
});
