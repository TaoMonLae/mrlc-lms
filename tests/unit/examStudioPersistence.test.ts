import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveStudioQuestions } from '../../shared/examStudioPersistence';
function fixture() {
  const rows = new Map<string, any>([['q1', { id: 'q1', examId: 'exam', sectionId: 'section', negativePoints: 2 }], ['q2', { id: 'q2', examId: 'exam' }], ['foreign', { id: 'foreign', examId: 'other' }]]);
  return { rows, tx: { question: {
    findMany: async ({ where }: any) => [...rows.values()].filter(q => q.examId === where.examId),
    deleteMany: async ({ where }: any) => { for (const [id, q] of rows) if (q.examId === where.examId && !where.id.notIn.includes(id)) rows.delete(id); },
    update: async ({ where, data }: any) => { rows.set(where.id, { ...rows.get(where.id), ...data }); },
    create: async ({ data }: any) => { rows.set(`new-${rows.size}`, data); },
  } } };
}
test('Studio saves retain question identity and scoring metadata while removing deleted rows', async () => {
  const { rows, tx } = fixture();
  await saveStudioQuestions(tx, 'exam', [{ id: 'q1', questionText: 'Edited', points: 5, type: 'MCQ', choices: ['A', 'B'], correctAnswer: '1' }]);
  assert.equal(rows.get('q1').sectionId, 'section'); assert.equal(rows.get('q1').negativePoints, 2);
  assert.equal(rows.get('q1').text, 'Edited'); assert.equal(rows.has('q2'), false);
  assert.equal(rows.get('foreign').examId, 'other');
});
test('foreign question IDs create new rows and never modify another exam', async () => {
  const { rows, tx } = fixture(); await saveStudioQuestions(tx, 'exam', [{ id: 'foreign', questionText: 'New' }]);
  assert.deepEqual(rows.get('foreign'), { id: 'foreign', examId: 'other' });
  assert.equal([...rows.values()].filter(q => q.examId === 'exam').length, 1);
});
test('duplicate persisted IDs are rejected before deleting or updating questions', async () => {
  const { rows, tx } = fixture(); await assert.rejects(() => saveStudioQuestions(tx, 'exam', [{ id: 'q1' }, { id: 'q1' }]), /cannot appear twice/);
  assert.equal(rows.size, 3);
});
