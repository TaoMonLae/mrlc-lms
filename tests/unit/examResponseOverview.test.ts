import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildResponseOverview, type ResponseAttempt } from '../../src/lib/examResponseOverview';

test('response overview keeps ungraded writing separate from errors and excludes pending scores', () => {
  const attempts: ResponseAttempt[] = [
    { id: 'a', studentName: 'A', attemptNumber: 1, score: 8, totalMarks: 10, startedAt: '2026-11-02T01:00:00Z', completedAt: '2026-11-02T01:20:00Z', questions: [
      { id: 'q', number: 1, text: 'Choose', type: 'MCQ', correctAnswer: 'B', maxPoints: 1, studentAnswer: 'B', status: 'CORRECT', choiceLabels: ['A', 'B', 'C'] },
      { id: 'w', number: 2, text: 'Explain', type: 'ESSAY', correctAnswer: 'Model', maxPoints: 4, studentAnswer: 'Draft', status: 'PENDING' },
    ] },
    { id: 'b', studentName: 'B', attemptNumber: 1, score: null, totalMarks: 10, startedAt: '2026-11-02T01:00:00Z', completedAt: null, questions: [
      { id: 'q', number: 1, text: 'Choose', type: 'MCQ', correctAnswer: 'B', maxPoints: 1, studentAnswer: 'A', status: 'INCORRECT' },
      { id: 'w', number: 2, text: 'Explain', type: 'ESSAY', correctAnswer: 'Model', maxPoints: 4, studentAnswer: null, status: 'PENDING' },
    ] },
  ];
  const overview = buildResponseOverview(attempts);
  assert.equal(overview.averagePercent, 80);
  assert.equal(overview.medianPercent, 80);
  assert.equal(overview.averageSeconds, 1200);
  assert.equal(overview.pendingAttempts, 2);
  assert.deepEqual(overview.questions.map(q => [q.correct, q.incorrect, q.partial, q.pending]), [[1, 1, 0, 0], [0, 0, 0, 2]]);
  assert.deepEqual(overview.questions[0].distribution.map(row => [row.answer, row.count, row.correct]), [['A', 1, false], ['B', 1, true], ['C', 0, false]]);
});
