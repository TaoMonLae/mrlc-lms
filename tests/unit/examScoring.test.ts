import assert from 'node:assert/strict';
import test from 'node:test';
import { scoreExamObjective } from '../../shared/examScoring';

test('weighted selections cannot earn extra credit by repeating one option', () => {
  const result = scoreExamObjective({
    type: 'MULTIPLE_CHOICE', points: 10, partialCredit: true,
    correctAnswers: ['a', 'b'], optionWeights: { a: 0.5, b: 0.5 },
  }, { selectedOptions: ['a', 'a'] });
  assert.deepEqual(result, { score: 5, correct: false, manual: false });
});

test('non-partial weighted questions require the exact correct set', () => {
  const question = {
    type: 'MULTIPLE_CHOICE', points: 4, partialCredit: false,
    correctAnswers: ['a', 'b'], optionWeights: { a: 1, b: 1, wrong: 0 },
  };
  assert.equal(scoreExamObjective(question, { selectedOptions: ['a'] }).score, 0);
  assert.equal(scoreExamObjective(question, { selectedOptions: ['a', 'b', 'wrong'] }).score, 0);
  assert.deepEqual(scoreExamObjective(question, { selectedOptions: ['a', 'b'] }), { score: 4, correct: true, manual: false });
});

test('drag and drop tiles can only be placed once', () => {
  const question = {
    type: 'DRAG_DROP', points: 2, partialCredit: true,
    options: { blanks: [{ id: '1', answer: 'same' }, { id: '2', answer: 'same' }], distractors: [] },
  };
  assert.deepEqual(scoreExamObjective(question, { selectedOptions: { '1': '0', '2': '0' } }), { score: 0, correct: false, manual: false });
  assert.deepEqual(scoreExamObjective(question, { selectedOptions: { '1': '0', '2': '1' } }), { score: 2, correct: true, manual: false });
});

test('numeric tolerance, negative marking, and manual answers retain their behavior', () => {
  assert.equal(scoreExamObjective({ type: 'NUMERIC', points: 2, correctAnswer: '10', numericTolerance: 0.2 }, { answerText: '10.1' }).score, 2);
  assert.equal(scoreExamObjective({ type: 'TRUE_FALSE', points: 2, correctAnswer: 'true', negativePoints: 0.5 }, { answerText: 'false' }).score, -0.5);
  assert.deepEqual(scoreExamObjective({ type: 'ESSAY', points: 6 }, { answerText: 'response' }), { score: 0, correct: null, manual: true });
});
