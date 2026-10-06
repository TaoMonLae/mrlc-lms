import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExamReviewQuestions } from '../../shared/examReview';

test('review uses the corrected key in canonical order while showing the student’s shuffled choice', () => {
  const answers = [{ questionId: 'q1', selectedOptions: ['Cold'], answerText: null, isCorrect: false, pointsAwarded: 0 }];
  const frozen = [{ id: 'q1', text: 'Which is warmer?', type: 'MCQ', points: 2, options: [{ key: 'Warm', text: 'Warm' }, { key: 'Cold', text: 'Cold' }], correctAnswer: 'Cold' }];
  const current = [{ id: 'q1', type: 'MCQ', options: ['Cold', 'Warm'], correctAnswer: '1', answerKeyCorrectedAt: new Date() }];
  const [result] = buildExamReviewQuestions(answers, frozen, current) as any[];
  assert.equal(result.studentAnswer, 'Cold');
  assert.equal(result.correctAnswer, 'Warm');
  assert.equal(result.status, 'INCORRECT');
  assert.equal(result.answerKeyCorrected, true);
});

test('a corrected index is resolved against canonical options even when option keys look numeric', () => {
  const frozen = [{ id: 'q', text: 'Choose', type: 'MCQ', points: 1, options: [{ key: '1', text: 'First' }, { key: '0', text: 'Second' }], correctAnswer: '0' }];
  const current = [{ id: 'q', type: 'MCQ', options: [{ value: '1', text: 'First' }, { value: '0', text: 'Second' }], correctAnswer: '1', answerKeyCorrectedAt: new Date() }];
  const [result] = buildExamReviewQuestions([{ questionId: 'q', answerText: '1', isCorrect: false, pointsAwarded: 0 }], frozen, current) as any[];
  assert.equal(result.correctAnswer, 'Second');
});

test('review distinguishes manual grading from objective errors', () => {
  const frozen = [
    { id: 'essay', text: 'Explain', type: 'ESSAY', points: 5, correctAnswer: 'Model' },
    { id: 'mcq', text: 'Choose', type: 'MCQ', points: 1, options: [{ key: 'A', text: 'A' }], correctAnswer: 'A' },
  ];
  const answers = [
    { questionId: 'essay', answerText: 'Student response', pointsAwarded: null, isCorrect: null },
    { questionId: 'mcq', answerText: 'A', pointsAwarded: 1, isCorrect: true },
  ];
  const result = buildExamReviewQuestions(answers, frozen, []) as any[];
  assert.equal(result[0].status, 'PENDING');
  assert.equal(result[0].studentAnswer, 'Student response');
  assert.equal(result[1].status, 'CORRECT');
});

test('review shows each drag-and-drop blank against a corrected answer', () => {
  const frozenOptions = { text: '{{b0}}', blanks: [{ id: 'b0', answer: 'old' }], distractors: ['new'] };
  const frozen = [{ id: 'drag', text: 'Fill blank', type: 'DRAG_DROP', points: 2, scoringOptions: frozenOptions }];
  const current = [{ id: 'drag', type: 'DRAG_DROP', options: { ...frozenOptions, blanks: [{ id: 'b0', answer: 'new' }] }, answerKeyCorrectedAt: new Date() }];
  const answers = [{ questionId: 'drag', selectedOptions: { b0: '1' }, isCorrect: true, pointsAwarded: 2 }];
  const [result] = buildExamReviewQuestions(answers, frozen, current) as any[];
  assert.equal(result.blankRows[0].correct, 'new');
  assert.equal(result.blankRows[0].student, 'new');
  assert.equal(result.status, 'CORRECT');
});
