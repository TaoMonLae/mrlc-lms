import assert from 'node:assert/strict';
import test from 'node:test';
import { registerExamPhase2Routes } from '../../examPhase2';
import { Prisma } from '@prisma/client';

function harness(prisma: any) {
  const routes = new Map<string, Function>();
  const app: any = {};
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    app[method] = (path: string, ...handlers: Function[]) => routes.set(`${method} ${path}`, handlers.at(-1)!);
  }
  registerExamPhase2Routes({ app, prisma, authMiddleware() {}, createAuditLog: async () => {}, canManageExamClass: async () => true, logger: { error() {}, warn() {}, info() {} } });
  return async (method: string, path: string, body: any = {}) => {
    let status = 200;
    let data: any;
    const res: any = { status(value: number) { status = value; return res; }, json(value: any) { data = value; return res; } };
    await routes.get(`${method} ${path}`)!({ user: { userId: 'teacher', role: 'ADMIN' }, params: { id: 'exam', attemptId: 'attempt' }, body, query: {}, headers: {} }, res);
    return { status, data };
  };
}

for (const state of ['INVALIDATED', 'NOT_STARTED']) {
  test(`force submit cannot turn ${state} into an unscored completed attempt`, async () => {
    let writes = 0;
    const invoke = harness({ examAttempt: {
      findUnique: async () => ({ id: 'attempt', state }),
      update: async () => { writes++; },
    }, attemptEvent: { create: async () => {} } });
    const result = await invoke('post', '/api/attempts/:attemptId/invigilate', { action: 'FORCE_SUBMIT' });
    assert.equal(result.status, 409);
    assert.equal(writes, 0);
  });
}

for (const failedRead of ['assignments', 'attempts']) {
  test(`invigilator ${failedRead} failures do not look like an empty live session`, async () => {
    const read = async (key: string) => { if (key === failedRead) throw new Error('Database unavailable'); return []; };
    const invoke = harness({
      examAssignment: { findMany: () => read('assignments') },
      examAttempt: { findMany: () => read('attempts') },
      exam: { findUnique: async () => ({ classId: 'class' }) },
      student: { findMany: async () => [] },
    });
    const result = await invoke('get', '/api/exams/:id/invigilator');
    assert.equal(result.status, 500);
    assert.equal(result.data.students, undefined);
  });
}

test('unassigned class exams include students who have not started and detect missing check-ins', async () => {
  const students = [{ id: 's1', user: { firstName: 'Ada', lastName: 'Lee' } }, { id: 's2', user: { firstName: 'Bo', lastName: 'Win' } }];
  const invoke = harness({
    examAssignment: { findMany: async () => [] },
    exam: { findUnique: async () => ({ classId: 'class' }) },
    student: { findMany: async () => students },
    examAttempt: { findMany: async () => [{ id: 'a1', studentId: 's1', student: students[0], state: 'IN_PROGRESS', attemptNumber: 1, startedAt: new Date(Date.now() - 120_000), lastSavedAt: null }] },
    attemptEvent: { findFirst: async () => null },
  });
  const { status, data } = await invoke('get', '/api/exams/:id/invigilator');
  assert.equal(status, 200);
  assert.equal(data.summary.notStarted, 1);
  assert.equal(data.summary.disconnected, 1);
  assert.equal(data.students.find((student: any) => student.studentId === 's2').state, 'NOT_STARTED');
});

test('reopening an attempt clears old rubric marks and feedback with its score', async () => {
  let reset: any;
  const invoke = harness({
    examAttempt: { findUnique: async () => ({ id: 'attempt', state: 'FINALIZED', updatedAt: new Date() }) },
    $transaction: async (fn: Function) => fn({
      examAttempt: { updateMany: async () => ({ count: 1 }) },
      examAnswer: { updateMany: async () => {} },
      manualGrade: { updateMany: async ({ data }: any) => { reset = data; } },
    }),
    attemptEvent: { create: async () => {} },
  });
  const { status } = await invoke('post', '/api/attempts/:attemptId/invigilate', { action: 'REOPEN' });
  assert.equal(status, 200);
  for (const field of ['score', 'scoreOverride', 'overallComment', 'secondMarkerScore', 'moderationComment', 'overrideReason']) {
    assert.equal(reset[field], null, `${field} should be reset`);
  }
  assert.equal(reset.criterionScores, Prisma.DbNull);
  assert.equal(reset.inlineFeedback, Prisma.DbNull);
});
