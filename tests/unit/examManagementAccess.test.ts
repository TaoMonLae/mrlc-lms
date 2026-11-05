import assert from 'node:assert/strict';
import test from 'node:test';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import express from 'express';
import { registerExamPhase2Routes } from '../../examPhase2';
import { registerExamBankRoutes } from '../../examBank';

test('exam access follows the stored exam, including child and shared-bank writes', async () => {
  const app = express();
  const exam = { id: 'e1', classId: 'c1', status: 'DRAFT', _count: { attempts: 0 }, ownerId: 'owner', editorIds: [] as string[], sections: [], stimuli: [], questionGroups: [], questions: [], rubrics: [], examQuestions: [], blueprintRules: [] };
  let writes = 0;
  let cloneOwner: string | undefined;
  let questionScope: any;
  let gradeScope: any;
  let gradeInclude: any;
  const foreignExam = { ...exam, id: 'e2', ownerId: 'other-owner' };
  const prisma = {
    exam: { findUnique: async ({ where }: any) => where.id === 'e2' ? foreignExam : exam, findMany: async () => [exam] },
    examSection: { findUnique: async ({ where }: any) => ({ examId: where.id === 'foreign-section' ? 'e2' : exam.id }), update: async () => { writes++; return {}; } },
    question: {
      findUnique: async () => ({ id: 'bank-item', examId: null }),
      findMany: async ({ where }: any) => { questionScope = where; return []; },
      count: async () => 0,
    },
    examQuestion: { findUnique: async () => ({ examId: exam.id }), findMany: async () => [] },
    examBlueprintRule: { findMany: async () => [] },
    examAttempt: { findUnique: async () => ({ examId: exam.id }) },
    manualGrade: {
      findUnique: async () => ({ attempt: { examId: exam.id } }),
      findMany: async ({ where, include }: any) => { gradeScope = where; gradeInclude = include; return []; },
    },
    teacher: { findUnique: async () => ({ id: 't1', classes: [{ classId: 'c1' }] }) },
    subjectTeacher: { findMany: async () => [{ subjectId: 'subject1' }] },
    student: { findUnique: async () => ({ classId: exam.classId }) },
    $transaction: (fn: Function) => fn({ exam: { findUnique: async () => exam, create: async ({ data }: any) => {
      cloneOwner = data.ownerId;
      assert.equal(data.editorIds, undefined);
      return { id: 'copy', ...data };
    } } }),
  };
  const deps = {
    app, prisma,
    authMiddleware: ((req, _res, next) => { (req as any).user = { userId: req.headers['x-user'], role: 'TEACHER' }; next(); }) as express.RequestHandler,
    canManageExamClass: async (actor: { userId: string }) => actor.userId !== 'outside',
    createAuditLog: async () => {},
    logger: { error() {}, warn() {}, info() {} },
  };
  registerExamPhase2Routes(deps);
  registerExamBankRoutes(deps);

  function request(method: string, url: string, actor = 'colleague', body: Record<string, unknown> = {}) {
    return new Promise<number>((resolve, reject) => {
      const socket = new Socket();
      Object.defineProperty(socket, 'remoteAddress', { value: '127.0.0.1' });
      const req = new IncomingMessage(socket) as any;
      req.method = method; req.url = url; req.headers = { 'x-user': actor }; req.body = body;
      const res = new ServerResponse(req) as any;
      res.json = () => { res.emit('finish'); resolve(res.statusCode); return res; };
      app(req, res, reject);
    });
  }

  assert.equal(await request('GET', '/api/exams/e1/preview'), 200);
  assert.equal(await request('GET', '/api/exams/e1/preview', 'outside'), 403);
  for (const [method, url] of [
    ['PUT', '/api/exams/e1/schedule'], ['POST', '/api/exams/e1/assignments'],
    ['PUT', '/api/sections/s1'], ['POST', '/api/attempts/a1/invigilate'],
    ['POST', '/api/grading/g1/finalize'], ['POST', '/api/exams/e1/clone'],
    ['DELETE', '/api/exam-questions/link1'], ['PUT', '/api/question-bank/bank-item'],
    ['POST', '/api/question-bank/bank-item/approve'], ['POST', '/api/accommodations'],
  ]) {
    const body = { ownerId: 'colleague', editorIds: ['colleague'], studentId: 's1', examId: 'e1' };
    assert.equal(await request(method, url, 'colleague', body), 403, url);
  }
  assert.equal(await request('PUT', '/api/sections/foreign-section', 'owner', { examId: 'e1' }), 403);
  assert.equal(await request('POST', '/api/exams/e1/question-groups', 'owner', { sectionId: 'foreign-section' }), 400);
  assert.equal(await request('POST', '/api/exams/e1/questions', 'owner', { questionId: 'q1', sectionId: 'foreign-section' }), 400);
  assert.equal(await request('PUT', '/api/exams/e1/questions/reorder', 'owner', { order: [{ id: 'foreign-link', displayOrder: 0 }] }), 403);
  assert.equal(await request('GET', '/api/question-bank'), 200);
  assert.equal(questionScope.examId, null);
  assert.deepEqual(questionScope.OR, [{ subjectId: { in: ['subject1'] } }, { subjectId: null }]);
  assert.equal(await request('GET', '/api/grading/queue?examId=e2'), 200);
  assert.equal(gradeScope.attempt.examId, 'e2');
  assert.deepEqual(gradeInclude.attempt.include.student.select, {
    id: true, studentCode: true, user: { select: { firstName: true, lastName: true } },
  });
  assert.deepEqual(gradeScope.attempt.exam, { classId: { in: ['c1'] }, OR: [{ ownerId: 'colleague' }, { editorIds: { has: 'colleague' } }] });
  assert.equal(writes, 0);
  assert.equal(await request('PUT', '/api/sections/s1', 'owner'), 200);
  exam.editorIds.push('colleague', 'outside');
  assert.equal(await request('PUT', '/api/sections/s1'), 200);
  assert.equal(await request('PUT', '/api/sections/s1', 'outside'), 403);
  assert.equal(await request('POST', '/api/exams/e1/clone', 'colleague', { ownerId: 'someone-else', editorIds: ['outside'] }), 201);
  assert.equal(cloneOwner, 'colleague');
  exam._count.attempts = 1;
  assert.equal(await request('PUT', '/api/sections/s1', 'owner'), 409);
  assert.equal(await request('POST', '/api/exams/e1/questions', 'owner', { questionId: 'q1' }), 409);
  assert.equal(await request('POST', '/api/exams/e1/stimuli', 'owner'), 409);
  exam._count.attempts = 0;
  exam.status = 'PUBLISHED';
  assert.equal(await request('PUT', '/api/sections/s1', 'owner'), 409);
  assert.equal(await request('POST', '/api/exams/e1/blueprint', 'owner'), 409);
  assert.equal(await request('PUT', '/api/exams/e1/schedule', 'colleague', { status: 'DRAFT' }), 403);
  exam.editorIds = [];
  assert.equal(await request('PUT', '/api/sections/s1'), 403);
  assert.equal(writes, 2);
});
