import { test } from 'node:test';
import assert from 'node:assert/strict';
import { correctionData, scoreWithCorrectedKey } from '../../shared/examAnswerKey';

test('correction changes only the selected choice key and rejects invalid choices', () => {
  const question = { type: 'MCQ', options: ['Cold', 'Warm'], correctAnswer: '0' };
  assert.deepEqual(correctionData(question, { questionId: 'q', correctAnswers: ['1'] }), { correctAnswer: '1', correctAnswers: null });
  assert.throws(() => correctionData(question, { questionId: 'q', correctAnswers: ['2'] }), /belong/);
  assert.throws(() => correctionData(question, { questionId: 'q', correctAnswers: ['0', '1'] }), /exactly one/);
});

test('correction rescoring uses the key from the question and old frozen option labels', () => {
  const question = { type: 'MCQ', points: 5, options: ['Cold', 'Warm'], correctAnswer: '1', correctAnswers: null };
  const frozen = { points: 5, options: [{ key: 'Warm', text: 'Warm' }, { key: 'Cold', text: 'Cold' }], correctAnswer: 'Cold' };
  assert.deepEqual(scoreWithCorrectedKey(question, { selectedOptions: ['Warm'] }, frozen), { score: 5, correct: true, manual: false });
  assert.equal(scoreWithCorrectedKey(question, { selectedOptions: ['Cold'] }, frozen).score, 0);
});

test('drag correction keeps the word bank and rescores against frozen bank order', () => {
  const original = { type: 'DRAG_DROP', points: 3, options: { text: '{{b0}}', blanks: [{ id: 'b0', answer: 'old' }], distractors: ['new'] } };
  const data = correctionData(original, { questionId: 'q', blankAnswers: ['new'] });
  assert.deepEqual((data.options as any).blanks, [{ id: 'b0', answer: 'new' }]);
  assert.deepEqual((data.options as any).distractors, ['old']);
  assert.throws(() => correctionData(original, { questionId: 'q', blankAnswers: ['invented'] }), /word bank/);
  const frozen = { points: 3, scoringOptions: original.options };
  assert.deepEqual(scoreWithCorrectedKey({ ...original, ...data }, { selectedOptions: { b0: '1' } }, frozen), { score: 3, correct: true, manual: false });
});
