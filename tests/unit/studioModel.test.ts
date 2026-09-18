import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromBackend, toBackend } from '../../src/pages/exams/studioModel';

test('Studio preserves legacy choice types and resolves text or numeric answer keys', () => {
  for (const correctAnswer of ['1', 'Mars']) {
    const q = fromBackend({ id: 'q', text: 'Which planet?', type: 'MULTIPLE_CHOICE', points: 3, options: ['Earth', 'Mars'], correctAnswer }, 0);
    assert.deepEqual(q.options.map(o => o.c), [false, true]);
    assert.equal(toBackend(q).type, 'MULTIPLE_CHOICE');
    assert.equal(toBackend(q).correctAnswer, '1');
  }
});
test('Studio saves the edited multi-select key without restoring stale original answers', () => {
  const q = fromBackend({ type: 'HOTSPOT', text: 'Choose', options: ['A', 'B', 'C'], correctAnswers: ['A', 'C'], partialCredit: false }, 0);
  assert.deepEqual(q.options.map(o => o.c), [true, false, true]);
  q.options[0].c = false; q.options[1].c = true;
  const saved = toBackend(q);
  assert.deepEqual(saved.correctAnswers, ['1', '2']);
  assert.equal(saved.partialCredit, false);
});
test('Studio retains manually graded types, feedback, passages and images', () => {
  for (const type of ['SHORT_ANSWER', 'ESSAY', 'WRITTEN', 'EXTENDED']) {
    const saved = toBackend(fromBackend({ id: 'q', type, text: 'Explain', points: 7, correctAnswer: 'Rubric', explanation: 'Feedback', passageText: 'Passage', imageUrl: '/image.png' }, 0));
    assert.equal(saved.type, type); assert.equal(saved.correctAnswer, 'Rubric');
    assert.equal(saved.explanation, 'Feedback'); assert.equal(saved.passageText, 'Passage'); assert.equal(saved.imageUrl, '/image.png');
  }
});
test('Studio drag blanks follow passage order and serialize punctuation in answers safely', () => {
  const q = fromBackend({ type: 'DRAG_DROP', text: 'Prompt', options: { text: '{{two}} then {{one}}', blanks: [{ id: 'one', answer: 'a]]b' }, { id: 'two', answer: 'First' }], distractors: ['Decoy'] }, partialCredit: true }, 0);
  assert.deepEqual(q.options.map(o => o.t), ['First', 'a]]b', 'Decoy']);
  const saved = toBackend(q);
  assert.deepEqual((saved.choices as any).blanks, [{ id: 'b0', answer: 'First' }, { id: 'b1', answer: 'a]]b' }]);
  assert.equal(saved.partialCredit, true);
});
test('Studio recognizes boolean answer text and never invents a missing answer key', () => {
  const q = fromBackend({ type: 'TRUE_FALSE', correctAnswer: 'false' }, 0);
  assert.deepEqual(q.options.map(o => o.c), [false, true]);
  q.options.forEach(o => o.c = false);
  assert.equal(toBackend(q).correctAnswer, null);
});

test('readiness rejects incomplete keys, duplicate options and unmatched drag blanks', async () => {
  const { questionIssue } = await import('../../src/pages/exams/studioModel');
  const q = fromBackend({ text: 'Choose', type: 'MCQ', points: 5, options: ['Same', 'Same'], correctAnswer: '0' }, 0);
  assert.match(questionIssue(q)!, /distinct/);
  q.options[1].t = 'Different'; assert.equal(questionIssue(q), null);
  q.options[0].c = false; assert.match(questionIssue(q)!, /correct answer/);
  q.uiType = 'DRAG'; q.options[0].c = true; assert.match(questionIssue(q)!, /blank/);
  q.text = 'Choose ___'; assert.equal(questionIssue(q), null);
});

test('numeric option labels cannot turn one correct answer into two', () => {
  const q = fromBackend({ type: 'MCQ', options: ['1', '2', '3'], correctAnswer: '1' }, 0);
  assert.deepEqual(q.options.map(o => o.c), [false, true, false]);
  q.uiType = 'HOTSPOT'; q.options[2].c = true;
  assert.deepEqual(toBackend(q).correctAnswers, ['1', '2']);
});
