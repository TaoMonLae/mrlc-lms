import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyticsSelectedValues,
  analyzeDistractorResponses,
  hasAnalyticsResponse,
  normalizeAnalyticsOptions,
} from '../../shared/examAnalytics';

test('analytics treats empty text, arrays, and matching objects as blank', () => {
  assert.equal(hasAnalyticsResponse('', null), false);
  assert.equal(hasAnalyticsResponse('   ', []), false);
  assert.equal(hasAnalyticsResponse(null, {}), false);
  assert.equal(hasAnalyticsResponse(null, { blank1: '' }), false);
  assert.equal(hasAnalyticsResponse('Executive', null), true);
  assert.equal(hasAnalyticsResponse(null, ['executive']), true);
  assert.equal(hasAnalyticsResponse(null, { blank1: 'executive' }), true);
});

test('selected option arrays are normalized without duplicates', () => {
  assert.deepEqual(analyticsSelectedValues(null, ['executive', 'executive', ' judicial ']), ['executive', 'judicial']);
  assert.deepEqual(analyticsSelectedValues(' Executive ', null), ['Executive']);
});

test('object options preserve stable values and teacher-facing labels', () => {
  assert.deepEqual(normalizeAnalyticsOptions([
    { value: 'leg', text: 'Legislative' },
    { id: 'exec', label: 'Executive' },
    'Judicial',
  ]), [
    { value: 'leg', label: 'Legislative' },
    { value: 'exec', label: 'Executive' },
    { value: 'Judicial', label: 'Judicial' },
  ]);
});

test('distractor analysis resolves option values and does not flag used object options', () => {
  const result = analyzeDistractorResponses({
    options: [
      { value: 'leg', text: 'Legislative' },
      { value: 'exec', text: 'Executive' },
      { value: 'jud', text: 'Judicial' },
    ],
    correctAnswer: 'leg',
    correctAnswers: null,
    incorrectSelections: [['exec'], ['Judicial']],
    responseCount: 4,
  });
  assert.deepEqual(result.distractorRates, { Executive: 0.25, Judicial: 0.25 });
  assert.equal(result.hasUnusedDistractor, false);
});

test('distractor analysis includes unselected options at zero percent', () => {
  const result = analyzeDistractorResponses({
    options: ['Legislative', 'Executive', 'Judicial'],
    correctAnswer: 'Legislative',
    correctAnswers: null,
    incorrectSelections: [['Executive']],
    responseCount: 5,
  });
  assert.deepEqual(result.distractorRates, { Executive: 0.2, Judicial: 0 });
  assert.equal(result.hasUnusedDistractor, true);
});
