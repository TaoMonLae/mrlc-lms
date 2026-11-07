import assert from 'node:assert/strict';
import test from 'node:test';
import { essayTimerConfig, essayTimerState, essayDisplayClock, ESSAY_TIMER_EVENT } from '../../shared/examEssayTimer';
import { registerExamPhase2Routes } from '../../examPhase2';
import { invigilationChange } from '../../lib/examInvigilation';

const start = Date.UTC(2026, 10, 7, 10);
const config = { questionId: 'essay', durationSeconds: 60 };
const record = { ...config, deadline: new Date(start + 60_000).toISOString(), accumulatedPauseSeconds: 30 };
const attempt = { state: 'IN_PROGRESS', accumulatedPauseSeconds: 30 };

test('only the first long answer in the frozen order receives a configured timer', () => {
  const questions = [{ id: 'mcq', type: 'MCQ' }, { id: 'essay', type: 'EXTENDED' }, { id: 'other', type: 'ESSAY' }];
  assert.deepEqual(essayTimerConfig({ essayMinutes: 1 }, questions), config);
  for (const essayMinutes of [0, -1, 'bad', undefined]) assert.equal(essayTimerConfig({ essayMinutes }, questions), null);
  assert.equal(essayTimerConfig({ essayMinutes: 1 }, [{ id: 'q', type: 'MCQ' }]), null);
});

test('unopened essays keep their full allowance; started blank essays run while the page is closed', () => {
  assert.equal(essayTimerState(config, null, attempt, start + 25_000).remainingSeconds, 60);
  assert.equal(essayTimerState(config, record, attempt, start + 25_000).remainingSeconds, 35);
  assert.equal(essayTimerState(config, record, attempt, start + 61_000).remainingSeconds, 0);
});

test('only approved pause intervals extend the essay clock, not earlier pauses or ordinary breaks', () => {
  const paused = { ...attempt, state: 'PAUSED', pausedAt: new Date(start + 10_000) };
  assert.equal(essayTimerState(config, record, paused, start + 500_000).remainingSeconds, 50);
  const resumed = { ...paused, ...invigilationChange(paused, { action: 'RESUME' }, start + 130_000).data };
  assert.equal(essayTimerState(config, record, resumed, start + 135_000).remainingSeconds, 45);
  assert.equal(essayTimerState(config, record, attempt, start + 135_000).remainingSeconds, 0);
});

test('slow heartbeats preserve the countdown without charging outbound latency twice', () => {
  const initial = essayDisplayClock(essayTimerState(config, record, attempt, start), start, 0)!;
  const slow = essayTimerState(config, record, attempt, start + 55_000);
  assert.equal(essayDisplayClock(slow, start + 55_000, 10_000, initial)!.localDeadline, start + 60_000);
  assert.equal(essayDisplayClock(slow, start + 70_000, 25_000, initial)!.localDeadline, start + 60_000);
});

test('display clock handles device offset, faster samples, and server pause compensation', () => {
  const timer = essayTimerState(config, record, attempt, start + 1_000);
  const offsetNow = start + 1_100 + 3_600_000;
  const initial = essayDisplayClock(timer, offsetNow, 200)!;
  assert.equal(initial.localDeadline, start + 60_000 + 3_600_000);
  const paused = essayTimerState(config, record, { ...attempt, accumulatedPauseSeconds: 150 }, start + 121_000);
  assert.equal(essayDisplayClock(paused, offsetNow + 120_000, 300, initial)!.localDeadline, initial.localDeadline + 120_000);
  assert.equal(essayDisplayClock(timer, offsetNow, 0, initial)!.roundTripMs, 0);
  assert.equal(essayDisplayClock(essayTimerState(config, null, attempt, start), offsetNow), null);
});

function harness() {
  const handlers = new Map<string, Function>();
  const app: any = {};
  for (const method of ['get', 'post', 'patch', 'put', 'delete']) app[method] = (path: string, ...args: Function[]) => handlers.set(`${method} ${path}`, args.at(-1)!);
  const current: any = {
    id: 'a1', examId: 'e1', studentId: 's1', state: 'IN_PROGRESS', sessionToken: 'token', accumulatedPauseSeconds: 0,
    serverDeadline: new Date(Date.now() + 3_600_000), questionOrder: ['mcq', 'essay'],
    frozenContent: [{ id: 'mcq', type: 'MCQ' }, { id: 'essay', type: 'ESSAY' }],
    exam: { id: 'e1', settings: { essayMinutes: 1 }, questions: [] },
  };
  const events: any[] = [];
  const answers: any[] = [];
  let writes = 0;
  let claimFails = false;
  let lock: Promise<unknown> = Promise.resolve();
  const prisma: any = {
    student: { findUnique: async () => ({ id: 's1' }) },
    examAttempt: {
      findUnique: async () => ({ ...current }),
      updateMany: async ({ where }: any) => {
        if (claimFails || where.state !== current.state || where.sessionToken !== current.sessionToken) return { count: 0 };
        writes++; return { count: 1 };
      },
    },
    examAnswer: {
      findUnique: async () => answers.find(a => a.questionId === 'essay') ?? null,
      findMany: async () => answers,
    },
    attemptEvent: {
      findFirst: async ({ where }: any) => events.find(e => e.type === where.type) ?? null,
      create: async ({ data }: any) => { const event = { ...data, createdAt: new Date() }; events.push(event); return event; },
    },
    $transaction: (fn: any) => { const result = lock.then(() => fn(prisma)); lock = result.catch(() => {}); return result; },
  };
  registerExamPhase2Routes({ app, prisma, authMiddleware: () => {}, createAuditLog: async () => {}, logger: { error: () => {}, warn: () => {}, info: () => {} }, canManageExamClass: async () => true });
  return { current, events, answers, writes: () => writes, failClaim: () => { claimFails = true; }, invoke: async (method: string, path: string, body: any = { sessionToken: 'token' }) => {
    let status = 200, data: any;
    const res: any = { status: (n: number) => { status = n; return res; }, json: (d: any) => { data = d; return res; } };
    await handlers.get(`${method} ${path}`)!({ user: { userId: 'u1', role: 'STUDENT' }, params: { attemptId: 'a1' }, body, headers: { 'x-exam-session': 'token' } }, res);
    return { status, data };
  } };
}
const begin = '/api/attempts/:attemptId/essay/start';
const state = '/api/attempts/:attemptId/state';

test('opening an essay persists its start even with no answer or unload save; repeated/concurrent opens do not reset it', async () => {
  const h = harness();
  const unopened = await h.invoke('get', state);
  assert.equal(unopened.data.attempt.essayTimer.started, false);
  assert.equal(h.events.length, 0);
  const responses = await Promise.all([h.invoke('post', begin), h.invoke('post', begin)]);
  assert.ok(responses.every(r => r.status === 200 && r.data.essayTimer.started));
  assert.equal(h.events.length, 1);
  assert.equal(h.events[0].type, ESSAY_TIMER_EVENT);
  assert.equal(responses[0].data.essayTimer.deadline, responses[1].data.essayTimer.deadline);
  h.events[0].payload.deadline = new Date(Date.now() + 30_000).toISOString();
  const recovered = await h.invoke('get', state);
  assert.ok(recovered.data.attempt.essayTimer.remainingSeconds <= 30);
  h.events[0].payload.deadline = new Date(Date.now() - 1000).toISOString();
  assert.equal((await h.invoke('get', state)).data.attempt.essayTimer.remainingSeconds, 0);
  assert.equal(h.events.length, 1);
});

test('legacy saved zero/positive seconds migrate once without retroactive downtime penalties', async () => {
  for (const used of [0, 20, 60]) {
    const h = harness();
    h.answers.push({ questionId: 'essay', timeSpentSeconds: used, updatedAt: new Date(0) });
    const result = await h.invoke('get', state);
    assert.equal(result.status, 200);
    assert.equal(result.data.attempt.essayTimer.started, true);
    assert.equal(result.data.attempt.essayTimer.remainingSeconds, 60 - used);
    assert.equal(h.events.length, 1);
    h.answers[0].timeSpentSeconds = 0;
    assert.equal((await h.invoke('post', begin)).data.essayTimer.deadline, result.data.attempt.essayTimer.deadline);
  }
});

test('heartbeat returns fresh pause compensation even if pause and resume occurred between polls', async () => {
  const h = harness();
  const started = await h.invoke('post', begin);
  h.current.accumulatedPauseSeconds = 120;
  const result = await h.invoke('post', '/api/attempts/:attemptId/save', { sessionToken: 'token', answers: [] });
  assert.equal(result.status, 200);
  assert.equal(new Date(result.data.essayTimer.deadline).getTime() - new Date(started.data.essayTimer.deadline).getTime(), 120_000);
});

test('unauthorized, paused, expired and raced starts cannot create timer events', async () => {
  for (const mode of ['owner', 'session', 'paused', 'expired', 'changed']) {
    const h = harness();
    if (mode === 'owner') h.current.studentId = 'other';
    if (mode === 'session') h.current.sessionToken = 'other';
    if (mode === 'paused') h.current.state = 'PAUSED';
    if (mode === 'expired') h.current.serverDeadline = new Date(Date.now() - 1000);
    if (mode === 'changed') h.failClaim();
    const result = await h.invoke('post', begin);
    assert.equal(result.status, mode === 'owner' ? 403 : 409, mode);
    assert.equal(h.events.length, 0, mode);
    assert.equal(h.writes(), 0, mode);
  }
});
