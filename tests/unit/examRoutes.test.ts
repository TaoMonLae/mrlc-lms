import assert from 'node:assert/strict';
import test from 'node:test';
import { registerExamPhase2Routes } from '../../examPhase2';
function harness(overrides: any = {}) {
  const handlers = new Map<string, Function>();
  const app: any = {};
  for (const method of ['get', 'post', 'patch', 'put', 'delete']) app[method] = (path: string, ...args: Function[]) => handlers.set(`${method} ${path}`, args.at(-1)!);
  let transactions = 0;
  const prisma: any = {
    student: { findUnique: async () => ({ id: 's1', classId: 'c1' }) },
    examAttempt: { findUnique: async () => ({ id: 'a1', studentId: 's1', state: 'IN_PROGRESS', sessionToken: 'token', serverDeadline: new Date(Date.now() + 60000) }) },
    $transaction: async () => { transactions++; throw new Error('Unexpected mutation'); },
    ...overrides,
  };
  registerExamPhase2Routes({ app, prisma, authMiddleware: () => {}, createAuditLog: async () => {}, logger: { error: () => {}, warn: () => {}, info: () => {} }, canManageExamClass: async () => true });
  return { transactions: () => transactions, invoke: async (method: string, path: string, body: any = {}) => {
    let status = 200, data: any;
    const res: any = { status: (n: number) => { status = n; return res; }, json: (d: any) => { data = d; return res; } };
    await handlers.get(`${method} ${path}`)!({ user: { userId: 'u1', role: 'STUDENT' }, params: { attemptId: 'a1', examId: 'e1' }, body, query: {}, headers: {} }, res);
    return { status, data };
  } };
}
test('stale client expiry reconciles with the server deadline without finalizing', async () => {
  const h = harness();
  const result = await h.invoke('post', '/api/attempts/:attemptId/submit', { sessionToken: 'token', autoSubmit: true, answers: [] });
  assert.equal(result.status, 200);
  assert.equal(result.data.ok, false);
  assert.ok(result.data.remainingSeconds > 0);
  assert.equal(h.transactions(), 0);
});
test('expiry reconciliation still rejects other sessions', async () => {
  const h = harness();
  const result = await h.invoke('post', '/api/attempts/:attemptId/submit', { sessionToken: 'stale', autoSubmit: true, answers: [] });
  assert.equal(result.status, 409);
  assert.equal(result.data.error, 'SESSION_CONFLICT');
  assert.equal(h.transactions(), 0);
});
test('availability endpoint applies assignment limits and excludes classmates not assigned', async () => {
  const exam = { id: 'e1', title: 'Assigned', status: 'PUBLISHED', attemptLimit: 1, availableUntil: new Date(Date.now() - 60000) };
  const h = harness({
    examAssignment: { findMany: async () => [{ examId: 'e1', exam, attemptLimitOverride: 3, availableUntilOverride: new Date(Date.now() + 60000) }] },
    exam: { findMany: async () => [{ id: 'e2', title: 'Someone else', status: 'PUBLISHED', attemptLimit: 1, _count: { assignments: 1 } }] },
    examAttempt: { findMany: async () => [{ id: 'a1', examId: 'e1', state: 'FINALIZED' }] },
  });
  const { status, data } = await h.invoke('get', '/api/exam2/available');
  assert.equal(status, 200);
  assert.equal(data.length, 1);
  assert.equal(data[0].id, 'e1');
  assert.equal(data[0].canStart, true);
  assert.equal(data[0].attemptLimit, 3);
});


test('starting fails closed if assignment permissions cannot be loaded', async () => {
  const h = harness({
    exam: { findUnique: async () => ({ id: 'e1', status: 'PUBLISHED', classId: 'c1' }) },
    examAssignment: { findUnique: async () => { throw new Error('Database unavailable'); } },
  });
  const result = await h.invoke('post', '/api/exam2/:examId/start');
  assert.equal(result.status, 500);
  assert.equal(h.transactions(), 0);
});

test('released results retain written and single-choice answers alongside empty selectedOptions', async () => {
  const h = harness({
    examAttempt: { findUnique: async () => ({ id: 'a1', studentId: 's1', examId: 'e1', state: 'FINALIZED', score: 5, exam: { totalMarks: 10 }, answers: [
      { questionId: 'essay', answerText: 'Water evaporates.', selectedOptions: [] },
      { questionId: 'choice', answerText: 'Mercury', selectedOptions: [] },
      { questionId: 'multi', answerText: '', selectedOptions: ['Earth', 'Mars'] },
    ] }) },
    examResultPolicy: { findUnique: async () => ({ releaseMode: 'IMMEDIATE', showTeacherFeedback: true }) },
    manualGrade: { findMany: async () => [] },
    question: { findMany: async () => [
      { id: 'essay', type: 'ESSAY', text: 'Explain evaporation.' },
      { id: 'choice', type: 'MCQ', options: ['Mercury', 'Earth'] },
      { id: 'multi', type: 'HOTSPOT', options: ['Earth', 'Mars'] },
    ] },
  });
  const { status, data } = await h.invoke('get', '/api/attempts/:attemptId/result');
  assert.equal(status, 200);
  assert.deepEqual(data.questions.map((q: any) => q.yourAnswer), ['Water evaporates.', 'Mercury', 'Earth, Mars']);
  assert.ok(data.questions.every((q: any) => !('correctAnswer' in q)));
});

test('result-policy database failures do not release marks or answers', async () => {
  const h = harness({
    examAttempt: { findUnique: async () => ({ id: 'a1', studentId: 's1', examId: 'e1', state: 'FINALIZED', score: 10, exam: {}, answers: [] }) },
    examResultPolicy: { findUnique: async () => { throw new Error('Database unavailable'); } },
  });
  const { status, data } = await h.invoke('get', '/api/attempts/:attemptId/result');
  assert.equal(status, 500);
  assert.equal(data.released, undefined);
  assert.equal(data.score, undefined);
  assert.equal(data.questions, undefined);
});

for (const state of ['INVALIDATED', 'IN_PROGRESS', 'PAUSED', 'PENDING_GRADING']) {
  test(`scheduled release does not expose ${state} attempts`, async () => {
    const h = harness({
      examAttempt: { findUnique: async () => ({ id: 'a1', studentId: 's1', examId: 'e1', state, isCompleted: true, exam: {}, answers: [] }) },
      examResultPolicy: { findUnique: async () => ({ releaseMode: 'SCHEDULED', releaseAt: new Date(0), showCorrectAnswers: true }) },
    });
    const { status, data } = await h.invoke('get', '/api/attempts/:attemptId/result');
    assert.equal(status, 200);
    assert.equal(data.released, false);
    assert.equal(data.questions, undefined);
  });
}

for (const minutes of [null, 0, 30]) {
  test(`starting a ${minutes ?? 'null'}-minute exam preserves its timing policy`, async () => {
    let created: any;
    const exam = { id: 'e1', classId: 'c1', status: 'PUBLISHED', durationMinutes: minutes, attemptLimit: 1, gracePeriodMinutes: 2 };
    const tx: any = {
      examAttempt: {
        findMany: async () => [],
        create: async ({ data }: any) => { created = { id: 'new-attempt', ...data }; return created; },
      },
      question: { findMany: async () => [{ id: 'q1', type: 'MCQ', text: 'Choose', points: 1, options: ['A', 'B'], correctAnswer: '0' }] },
      examQuestion: { findMany: async () => [] },
      examBlueprintRule: { findMany: async () => [] },
      attemptEvent: { create: async () => ({}) },
    };
    const h = harness({
      exam: { findUnique: async () => exam },
      examAssignment: { findUnique: async () => null, count: async () => 0 },
      examAttempt: { findFirst: async () => null },
      examAccommodation: { findMany: async () => [] },
      examAnswer: { findMany: async () => [] },
      $transaction: async (fn: any) => fn(tx),
    });
    const { status, data } = await h.invoke('post', '/api/exam2/:examId/start');
    assert.equal(status, 201);
    if (minutes) {
      assert.equal(created.effectiveDurationMinutes, 30);
      assert.equal(created.serverDeadline.getTime() - created.startedAt.getTime(), 32 * 60000);
      assert.ok(data.attempt.remainingSeconds > 0);
    } else {
      assert.equal(created.serverDeadline, null);
      assert.equal(created.effectiveDurationMinutes, null);
      assert.equal(data.attempt.remainingSeconds, 0);
    }
  });
}

test('submission atomically saves and scores restored answers against the frozen paper', async () => {
  const { freezeAttempt } = await import('../../examBank');
  const original = { id: 'q1', type: 'MCQ', text: 'Pick beta', points: 4, options: ['Alpha', 'Beta'], correctAnswer: '1' };
  const frozen = freezeAttempt([original], { shuffleOptions: true }, 'seed').frozenContent;
  const rows = new Map<string, any>();
  const attempt: any = { id: 'a1', studentId: 's1', examId: 'e1', state: 'IN_PROGRESS', sessionToken: 'token', selectedQuestionIds: ['q1'], frozenContent: frozen, exam: { negativeMarking: false, questions: [] }, answers: [] };
  let finalSnapshot: any;
  const tx: any = {
    examAttempt: {
      updateMany: async () => ({ count: 1 }),
      findUnique: async () => ({ ...attempt, answers: [...rows.values()] }),
      update: async ({ data }: any) => Object.assign(attempt, data),
    },
    examAnswer: {
      findMany: async () => [...rows.values()],
      upsert: async ({ where, create, update }: any) => {
        const id = where.attemptId_questionId.questionId;
        rows.set(id, rows.has(id) ? { ...rows.get(id), ...update } : create);
      },
    },
    question: { findMany: async () => [{ ...original, points: 100, correctAnswer: '0' }] },
    attemptSnapshot: { create: async ({ data }: any) => { if (data.reason === 'FINAL') finalSnapshot = data; } },
    attemptEvent: { create: async () => ({}) },
  };
  const h = harness({ examAttempt: { findUnique: async () => attempt }, $transaction: async (fn: any) => fn(tx) });
  const result = await h.invoke('post', '/api/attempts/:attemptId/submit', { sessionToken: 'token', answers: [{ questionId: 'q1', answerText: 'Beta', selectedOptions: [] }] });
  assert.equal(result.status, 200);
  assert.equal(result.data.state, 'SUBMITTED');
  assert.equal(attempt.score, 4);
  assert.equal(rows.get('q1').pointsAwarded, 4);
  assert.equal(rows.get('q1').isCorrect, true);
  assert.equal(finalSnapshot.answers[0].answerText, 'Beta');
  assert.equal(attempt.sessionToken, null);
});
