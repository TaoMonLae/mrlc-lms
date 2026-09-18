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
