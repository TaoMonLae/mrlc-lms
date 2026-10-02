import assert from 'node:assert/strict';
import test from 'node:test';
import { freezeAttempt } from '../../examBank';

test('freezing a shuffled legacy MCQ preserves the correct option key, not its old index', () => {
  const question = {
    id: 'q1', type: 'MCQ', text: 'Pick beta', points: 2,
    options: ['Alpha', 'Beta', 'Gamma'], correctAnswer: '1',
  };
  const frozen = freezeAttempt([question], { shuffleQuestions: false, shuffleOptions: true }, 'fixed-seed').frozenContent[0];
  assert.deepEqual(frozen.correctAnswers, ['Beta']);
  assert.equal(frozen.correctAnswer, 'Beta');
  assert.equal(frozen.options.some((option: any) => option.correct !== undefined), false);
});

test('multi-answer delivery is independent from partial-credit scoring', () => {
  const question = {
    id: 'q2', type: 'MULTIPLE_CHOICE', text: 'Pick both', points: 2,
    options: ['A', 'B', 'C'], correctAnswers: ['A', 'C'], partialCredit: false,
  };
  const frozen = freezeAttempt([question], { shuffleQuestions: false, shuffleOptions: false }, 'fixed-seed').frozenContent[0];
  assert.equal(frozen.multipleSelection, true);
  assert.equal(frozen.partialCredit, false);
});

test('legacy multi-answer indexes are normalized before option shuffling', () => {
  const question = {
    id: 'q3', type: 'MULTIPLE_CHOICE', text: 'Pick two', points: 2,
    options: ['A', 'B', 'C'], correctAnswers: ['0', '2'], partialCredit: true,
  };
  const frozen = freezeAttempt([question], { shuffleQuestions: false, shuffleOptions: true }, 'another-seed').frozenContent[0];
  assert.deepEqual(frozen.correctAnswers, ['A', 'C']);
});

test('question assembly fails instead of delivering a partial paper after a database failure', async () => {
  const { composeQuestionSet } = await import('../../examBank');
  const fail = async () => { throw new Error('Database unavailable'); };
  const empty = async () => [];
  for (const source of ['question', 'examQuestion', 'examBlueprintRule']) {
    const db: any = {
      question: { findMany: empty }, examQuestion: { findMany: empty }, examBlueprintRule: { findMany: empty },
    };
    db[source].findMany = fail;
    await assert.rejects(() => composeQuestionSet(db, 'e1', 'seed'), /Database unavailable/);
  }
});

test('random rules require enough unused questions and propagate candidate lookup failures', async () => {
  const { composeQuestionSet } = await import('../../examBank');
  let lookupFails = false;
  const db = {
    question: { findMany: async ({ where }: any) => {
      if (where.examId) return [{ id: 'fixed', type: 'ESSAY' }];
      if (lookupFails) throw new Error('Candidate lookup failed');
      return [{ id: 'candidate' }];
    } },
    examQuestion: { findMany: async () => [] },
    examBlueprintRule: { findMany: async () => [{ count: 2 }] },
  };
  await assert.rejects(() => composeQuestionSet(db, 'e1', 'seed'), /Not enough approved questions/);
  lookupFails = true;
  await assert.rejects(() => composeQuestionSet(db, 'e1', 'seed'), /Candidate lookup failed/);
});
