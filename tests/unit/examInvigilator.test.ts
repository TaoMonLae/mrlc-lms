import assert from 'node:assert/strict';
import test from 'node:test';
import { registerExamPhase2Routes } from '../../examPhase2';
import { Prisma } from '@prisma/client';
import { invigilationChange } from '../../lib/examInvigilation';

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
      attemptEvent: { create: async () => {} },
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

test('explicit assignments do not hide an existing attempt after a student is unassigned', async () => {
  const ada = { id: 's1', user: { firstName: 'Ada' } };
  const bo = { id: 's2', user: { firstName: 'Bo' } };
  const startedAt = new Date();
  const invoke = harness({
    examAssignment: { findMany: async () => [{ studentId: ada.id, student: ada }] },
    examAttempt: { findMany: async () => [{ id: 'a2', studentId: bo.id, student: bo, state: 'IN_PROGRESS', startedAt, events: [{ type: 'RECONNECT', createdAt: startedAt }] }] },
  });
  const { data, status } = await invoke('get', '/api/exams/:id/invigilator');
  assert.equal(status, 200);
  assert.equal(data.students.length, 2);
  assert.equal(data.summary.inProgress, 1);
  assert.equal(data.students[1].lastActivity.type, 'RECONNECT');
  assert.equal(data.students[1].lastCheckInAt, startedAt);
});

const now = Date.parse('2026-11-05T02:00:00Z');
for (const minutes of [null, true, '', 'abc', 0, -1, 1.5, 1441]) {
  test(`invalid extra time and reopen minutes are rejected: ${JSON.stringify(minutes)}`, () => {
    for (const [action, state] of [['EXTRA_TIME', 'IN_PROGRESS'], ['REOPEN', 'FINALIZED']]) {
      assert.throws(() => invigilationChange({ state, serverDeadline: new Date(now + 60000) }, { action, minutes }, now), (error: any) => error.http === 400);
    }
  });
}
test('extra time extends the existing deadline and does not impose a time limit on untimed work', () => {
  const { data } = invigilationChange({ state: 'PAUSED', serverDeadline: new Date(now), effectiveDurationMinutes: 30 }, { action: 'EXTRA_TIME', minutes: 10 }, now);
  assert.equal((data.serverDeadline as Date).getTime(), now + 600000);
  assert.equal(data.effectiveDurationMinutes, 40);
  assert.throws(() => invigilationChange({ state: 'IN_PROGRESS' }, { action: 'EXTRA_TIME', minutes: 10 }, now), /no time limit/);
});
test('resume compensates exactly once and never subtracts time for a future pause timestamp', () => {
  const { data } = invigilationChange({ state: 'PAUSED', pausedAt: new Date(now - 60000), serverDeadline: new Date(now + 60000), accumulatedPauseSeconds: 10 }, { action: 'RESUME' }, now);
  assert.equal((data.serverDeadline as Date).getTime(), now + 120000);
  assert.equal(data.accumulatedPauseSeconds, 70);
  assert.equal(data.pausedAt, null);
  assert.throws(() => invigilationChange({ ...data, state: String(data.state) }, { action: 'RESUME' }, now), /paused attempt/);
  const future = invigilationChange({ state: 'PAUSED', pausedAt: new Date(now + 60000), serverDeadline: new Date(now + 60000) }, { action: 'RESUME' }, now);
  assert.equal((future.data.serverDeadline as Date).getTime(), now + 60000);
});
test('expired attempts cannot be frozen and reopened attempts clear old pause and auto-submit flags', () => {
  assert.throws(() => invigilationChange({ state: 'IN_PROGRESS', serverDeadline: new Date(now) }, { action: 'PAUSE' }, now), /run out of time/);
  const { data } = invigilationChange({ state: 'AUTO_SUBMITTED' }, { action: 'REOPEN' }, now);
  assert.equal(data.autoSubmitted, false);
  assert.equal(data.pausedAt, null);
  assert.equal(data.sessionToken, null);
  assert.equal((data.serverDeadline as Date).getTime(), now + 900000);
});
test('incident notes are required, bounded, trimmed and cannot include arbitrary event data', () => {
  for (const note of [undefined, '', '   ', 'x'.repeat(2001)]) assert.throws(() => invigilationChange({ state: 'IN_PROGRESS' }, { action: 'INCIDENT_NOTE', note }), /incident note/);
  assert.deepEqual(invigilationChange({ state: 'IN_PROGRESS' }, { action: 'INCIDENT_NOTE', note: '  Student disconnected  ', unexpected: true }).payload, { action: 'INCIDENT_NOTE', note: 'Student disconnected' });
});
test('void timestamps prevent stale states from reopening an invalidated attempt', () => {
  for (const action of ['REOPEN', 'FORCE_SUBMIT']) assert.throws(() => invigilationChange({ state: 'FINALIZED', invalidatedAt: new Date() }, { action }), /voided/);
});

test('concurrent invigilation changes return conflict without recording a successful action', async () => {
  let events = 0;
  const invoke = harness({
    examAttempt: { findUnique: async () => ({ state: 'IN_PROGRESS', updatedAt: new Date(), serverDeadline: new Date(now + 60000) }) },
    $transaction: async (fn: Function) => fn({ examAttempt: { updateMany: async () => ({ count: 0 }) }, attemptEvent: { create: async () => { events++; } } }),
  });
  const { status } = await invoke('post', '/api/attempts/:attemptId/invigilate', { action: 'EXTRA_TIME', minutes: 10 });
  assert.equal(status, 409);
  assert.equal(events, 0);
});
test('pause state and its actor event are committed together or rolled back together', async () => {
  let state = 'IN_PROGRESS';
  const invoke = harness({
    examAttempt: { findUnique: async () => ({ state, updatedAt: new Date() }) },
    $transaction: async (fn: Function) => {
      const before = state;
      try { return await fn({ examAttempt: { updateMany: async ({ data }: any) => { state = data.state; return { count: 1 }; } }, attemptEvent: { create: async () => { throw new Error('Event unavailable'); } } }); }
      catch (error) { state = before; throw error; }
    },
  });
  const { status } = await invoke('post', '/api/attempts/:attemptId/invigilate', { action: 'PAUSE' });
  assert.equal(status, 500);
  assert.equal(state, 'IN_PROGRESS');
});
test('force submission reports a conflict if another invigilator voided the attempt first', async () => {
  const invoke = harness({
    examAttempt: { findUnique: async () => ({ state: 'IN_PROGRESS' }) },
    $transaction: async (fn: Function) => fn({ examAttempt: { updateMany: async () => ({ count: 0 }), findUnique: async () => ({ state: 'INVALIDATED', invalidatedAt: new Date() }) } }),
  });
  const { status } = await invoke('post', '/api/attempts/:attemptId/invigilate', { action: 'FORCE_SUBMIT' });
  assert.equal(status, 409);
});

test('force submission scores saved work and records the teacher event in the same transaction', async () => {
  const events: any[] = [];
  let submitted: any;
  const attempt = { id: 'attempt', state: 'IN_PROGRESS', exam: { questions: [] }, answers: [] };
  const invoke = harness({
    examAttempt: { findUnique: async () => attempt },
    $transaction: async (fn: Function) => fn({
      examAttempt: { updateMany: async () => ({ count: 1 }), findUnique: async () => attempt, update: async ({ data }: any) => { submitted = data; return { ...attempt, ...data }; } },
      attemptSnapshot: { create: async () => ({}) },
      attemptEvent: { create: async ({ data }: any) => { events.push(data); } },
    }),
  });
  const { status } = await invoke('post', '/api/attempts/:attemptId/invigilate', { action: 'FORCE_SUBMIT' });
  assert.equal(status, 200);
  assert.equal(submitted.state, 'AUTO_SUBMITTED');
  assert.equal(submitted.sessionToken, null);
  assert.equal(events.find(event => event.type === 'FORCE_SUBMIT').actorId, 'teacher');
});
