import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { registerExamPhase2Routes } from '../../examPhase2';

test('Express grading routes save, finalize a zero mark, and reject later edits', async () => {
  const app = express();
  let grade: any = { id: 'g1', attemptId: 'a1', questionId: 'q1', score: null, isFinalized: false };
  let attempt: any = { id: 'a1', examId: 'e1', state: 'PENDING_GRADING' };
  let answer: any = { maxPoints: 5, pointsAwarded: null };
  const prisma: any = {
    exam: { findUnique: async () => ({ id: 'e1', classId: 'class1' }) },
    examAttempt: {
      findUnique: async ({ where }: any) => where.id === 'a1' ? attempt : null,
      updateMany: async () => ({ count: 1 }),
      update: async ({ data }: any) => { attempt = { ...attempt, ...data }; return attempt; },
    },
    examAnswer: {
      findUnique: async () => answer,
      updateMany: async ({ data }: any) => { answer = { ...answer, ...data }; return { count: 1 }; },
      findMany: async () => [answer, { pointsAwarded: 3 }],
    },
    manualGrade: {
      findFirst: async () => grade,
      findUnique: async ({ where }: any) => where.id === 'g1' ? { ...grade, attempt } : null,
      updateMany: async ({ data }: any) => { if (grade.isFinalized) return { count: 0 }; grade = { ...grade, ...data }; return { count: 1 }; },
      update: async ({ data }: any) => { grade = { ...grade, ...data }; return grade; },
      count: async () => grade.isFinalized ? 0 : 1,
    },
    $transaction: async (fn: any) => fn(prisma),
  };
  registerExamPhase2Routes({
    app, prisma,
    authMiddleware: (req, _res, next) => { (req as any).user = { userId: 'teacher1', role: req.headers['x-test-role'] || 'TEACHER' }; next(); },
    createAuditLog: async () => {}, logger: { error() {}, warn() {}, info() {} },
    canManageExamClass: async () => true,
  });
  // Exercise Express route matching and every middleware without opening a port.
  const post = (path: string, body = {}, role = 'TEACHER') => new Promise<{ status: number; data: any }>((resolve, reject) => {
    const socket = new Socket();
    Object.defineProperty(socket, 'remoteAddress', { value: '127.0.0.1' });
    const req = new IncomingMessage(socket) as any;
    req.method = 'POST'; req.url = `/api/grading/${path}`; req.body = body;
    req.headers = { 'x-test-role': role };
    const res = new ServerResponse(req) as any;
    res.json = (data: any) => { res.emit('finish'); resolve({ status: res.statusCode, data }); return res; };
    app(req, res, reject);
  });
  assert.equal((await post('g1/finalize', {}, 'STUDENT')).status, 403);
  assert.equal((await post('a1/q1', { score: 0, status: 'GRADED' })).status, 200);
  const finalized = await post('g1/finalize');
  assert.equal(finalized.status, 200, JSON.stringify(finalized.data));
  assert.equal(grade.isFinalized, true);
  assert.equal(answer.pointsAwarded, 0);
  assert.equal(attempt.score, 3);
  assert.equal(attempt.state, 'FINALIZED');
  assert.equal((await post('a1/q1', { score: 5 })).status, 409);
  assert.equal((await post('g1/finalize')).status, 409);
});
