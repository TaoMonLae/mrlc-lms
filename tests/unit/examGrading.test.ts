import assert from 'node:assert/strict';
import test from 'node:test';
import { manualGradeScores } from '../../shared/examGrading';
import { registerExamPhase2Routes } from '../../examPhase2';
const criteria = [{ id: 'c1', maxScore: 3 }, { id: 'c2', maxScore: 2 }];
test('blank rubric marks stay ungraded in drafts; explicit zero is a grade', () => {
  assert.equal(manualGradeScores({ status: 'IN_REVIEW', criterionScores: { c1: 0, c2: '' } }, 5, criteria).score, null);
  assert.throws(() => manualGradeScores({ status: 'GRADED', criterionScores: { c1: 0 } }, 5, criteria), /every rubric/);
  assert.equal(manualGradeScores({ status: 'GRADED', criterionScores: { c1: 0, c2: 0 } }, 5, criteria).score, 0);
});
test('rubric totals are calculated from valid criteria and cannot exceed attempt marks', () => {
  assert.equal(manualGradeScores({ score: 99, criterionScores: { c1: 2, c2: 1 } }, 100, criteria).score, 3);
  assert.throws(() => manualGradeScores({ criterionScores: { c1: 4, c2: 1 } }, 5, criteria), /between/);
  assert.throws(() => manualGradeScores({ criterionScores: { stale: 2 } }, 5, criteria), /changed/);
});
test('invalid numeric values and unexplained overrides fail; decimals and zero work', () => {
  for (const score of ['abc', true, [], {}, ' ', -1, 6, Infinity]) assert.throws(() => manualGradeScores({ score }, 5));
  assert.throws(() => manualGradeScores({ status: 'GRADED', score: '' }, 5), /Enter a score/);
  assert.throws(() => manualGradeScores({ scoreOverride: 0 }, 5), /reason/);
  assert.equal(manualGradeScores({ status: 'GRADED', score: 0.5 }, 5).score, 0.5);
});
function harness(overrides: any = {}) {
  const routes = new Map<string, Function>(); const app: any = {};
  for (const method of ['get', 'post', 'patch', 'put', 'delete']) app[method] = (path: string, ...handlers: Function[]) => routes.set(`${method} ${path}`, handlers.at(-1)!);
  let written: any;
  const prisma: any = {
    examAttempt: { findUnique: async () => ({ id: 'a1', examId: 'e1', state: 'PENDING_GRADING' }) },
    examAnswer: { findUnique: async () => ({ maxPoints: 5 }) },
    manualGrade: { findFirst: async () => ({ id: 'g1', score: 2, inlineFeedback: ['keep'], secondMarkerId: 'teacher2' }), updateMany: async ({ data }: any) => { written = data; return { count: 1 }; }, findUnique: async () => ({ id: 'g1', ...written }) },
    ...overrides,
  };
  registerExamPhase2Routes({ app, prisma, authMiddleware: () => {}, createAuditLog: async () => {}, logger: { error() {}, warn() {}, info() {} }, canManageExamClass: async () => true });
  return { written: () => written, invoke: async (method = 'post', path = '/api/grading/:attemptId/:questionId', body: any = {}) => {
    let status = 200, data: any; const res: any = { status(n: number) { status = n; return res; }, json(d: any) { data = d; } };
    await routes.get(`${method} ${path}`)!({ user: { userId: 'teacher1', role: 'ADMIN' }, params: { attemptId: 'a1', questionId: 'q1', gradeId: 'g1' }, body, query: {}, headers: {} }, res);
    return { status, data };
  } };
}
test('partial grade saves preserve unseen feedback and second-marker identity', async () => {
  const h = harness(); assert.equal((await h.invoke('post', '/api/grading/:attemptId/:questionId', { score: 0, status: 'GRADED' })).status, 200);
  assert.equal(h.written().score, 0); assert.equal('inlineFeedback' in h.written(), false); assert.equal('secondMarkerId' in h.written(), false);
});
test('grading rejects invalidated attempts and foreign rubrics without writes', async () => {
  const h = harness({ examAttempt: { findUnique: async () => ({ state: 'INVALIDATED' }) } });
  assert.equal((await h.invoke()).status, 409); assert.equal(h.written(), undefined);
  const other = harness({ gradingRubric: { findUnique: async () => ({ examId: 'other' }) } });
  assert.equal((await other.invoke('post', '/api/grading/:attemptId/:questionId', { rubricId: 'r1' })).status, 400); assert.equal(other.written(), undefined);
});
test('grading queue batches answers, uses frozen prompt, and excludes invalid attempts', async () => {
  let scope: any; let reads = 0;
  const h = harness({ manualGrade: { findMany: async (args: any) => { scope = args.where; return [{ attemptId: 'a1', questionId: 'q1', question: { text: 'Edited' }, attempt: { frozenContent: [{ id: 'q1', text: 'Original' }] } }]; } }, examAnswer: { findMany: async () => { reads++; return [{ attemptId: 'a1', questionId: 'q1', maxPoints: 5, answerText: 'Response' }]; } } });
  const { data } = await h.invoke('get', '/api/grading/queue');
  assert.equal(reads, 1); assert.equal(data[0].question.text, 'Original'); assert.equal(data[0].answer.maxPoints, 5); assert.ok(scope.attempt.state.notIn.includes('INVALIDATED'));
});
test('missing grading tables return unavailable instead of a false empty queue', async () => {
  const h = harness({ manualGrade: { findMany: async () => { throw { code: 'P2021' }; } } });
  assert.equal((await h.invoke('get', '/api/grading/queue')).status, 503);
});
test('finalization acquires attempt lock first and rejects invalidated attempts', async () => {
  let gradeWrites = 0;
  const h = harness({
    exam: { findUnique: async () => ({ id: 'e1', classId: 'class1' }) },
    manualGrade: { findUnique: async () => ({ attempt: { examId: 'e1' } }) },
    $transaction: async (fn: any) => fn({ manualGrade: { findUnique: async () => ({ id: 'g1', attemptId: 'a1', score: 2 }), updateMany: async () => { gradeWrites++; return { count: 1 }; } }, examAttempt: { updateMany: async ({ where }: any) => { assert.equal(where.state.in.includes('INVALIDATED'), false); return { count: 0 }; } } }),
  });
  assert.equal((await h.invoke('post', '/api/grading/:gradeId/finalize')).status, 409); assert.equal(gradeWrites, 0);
});
test('the last finalized mark recomputes the total without hiding already released results', async () => {
  let attemptData: any; const order: string[] = [];
  const grade = { id: 'g1', attemptId: 'a1', questionId: 'q1', score: 0, scoreOverride: null };
  const h = harness({
    exam: { findUnique: async () => ({ id: 'e1', classId: 'class1' }) },
    manualGrade: { findUnique: async () => ({ attempt: { examId: 'e1' } }) },
    $transaction: async (fn: any) => fn({
      manualGrade: { findUnique: async () => grade, updateMany: async () => { order.push('grade'); return { count: 1 }; }, update: async () => {}, count: async () => 0 },
      examAttempt: { updateMany: async () => { order.push('attempt'); return { count: 1 }; }, findUnique: async () => ({ state: 'RELEASED' }), update: async ({ data }: any) => { attemptData = data; } },
      examAnswer: { findUnique: async () => ({ maxPoints: 5 }), updateMany: async ({ data }: any) => { assert.equal(data.pointsAwarded, 0); }, findMany: async () => [{ pointsAwarded: 0 }, { pointsAwarded: 3 }] },
    }),
  });
  const result = await h.invoke('post', '/api/grading/:gradeId/finalize');
  assert.equal(result.status, 200); assert.equal(result.data.attemptFinalized, true);
  assert.deepEqual(order, ['attempt', 'grade']); assert.equal(attemptData.score, 3); assert.equal(attemptData.state, 'RELEASED'); assert.equal(attemptData.gradingStatus, 'COMPLETE');
});
