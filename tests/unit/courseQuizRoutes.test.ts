import assert from 'node:assert/strict';
import test from 'node:test';
import { registerCourseRoutes } from '../../courseRoutes';
import { makeMrlcGedCourse } from '../../shared/mrlcGedCourseContent';

test('only an assigned school student starts a timed unit test; results remain in the course', async () => {
  const handlers = new Map<string, Function>();
  const app: any = {};
  for (const method of ['get', 'post', 'put', 'delete']) app[method] = (path: string, ...middleware: Function[]) => handlers.set(`${method} ${path}`, middleware.at(-1)!);
  const draft = makeMrlcGedCourse('math');
  const item = draft.modules[0].items[2];
  const attempts: any[] = [];
  const enrollment: any = { id: 'enrollment-a', studentId: 'student-a', classId: 'class-a', class: { name: 'GED A' }, version: { courseId: 'course-a', number: 1, syllabus: draft }, assignedAt: new Date(), progress: [] };
  const prisma: any = {
    student: { findUnique: async ({ where }: any) => where.userId === 'student-user' ? { id: 'student-a', userId: where.userId, classId: 'class-a', status: 'ACTIVE' } : null },
    courseEnrollment: { findFirst: async ({ where }: any) => where.studentId === enrollment.studentId && where.classId === enrollment.classId ? enrollment : null },
    courseQuizAttempt: {
      findFirst: async ({ where }: any) => attempts.filter(row => row.enrollmentId === where.enrollmentId && row.itemId === where.itemId).at(-1) ?? null,
      findMany: async ({ where }: any) => attempts.filter(row => row.enrollmentId === where.enrollmentId && row.submittedAt),
      create: async ({ data }: any) => { const row = { ...data, id: `attempt-${attempts.length + 1}`, startedAt: new Date(), submittedAt: null, answers: null, score: null, passed: null }; attempts.push(row); return row; },
      updateMany: async ({ where, data }: any) => { const row = attempts.find(candidate => candidate.id === where.id && !candidate.submittedAt); if (!row) return { count: 0 }; Object.assign(row, data); return { count: 1 }; },
      findUniqueOrThrow: async ({ where }: any) => attempts.find(row => row.id === where.id),
    },
  };
  registerCourseRoutes({ app, prisma, authMiddleware: (_req: any, _res: any, next: Function) => next(), canManageExamClass: async () => true, logger: { error: error => { throw error; } } });
  const call = async (method: 'get' | 'post', path: string, userId = 'student-user', body: any = {}) => {
    let code = 200, result: any;
    const response: any = { setHeader: () => {}, status: (value: number) => { code = value; return response; }, json: (value: any) => { result = value; } };
    await handlers.get(`${method} ${path}`)!({ params: { enrollmentId: enrollment.id, itemId: item.id }, user: { userId, role: 'STUDENT' }, body }, response);
    return { code, result };
  };
  const root = '/api/my-courses/:enrollmentId/quizzes/:itemId';
  assert.equal((await call('get', root, 'other-student')).code, 403);
  assert.equal((await call('get', root)).result.status, 'NOT_STARTED');
  assert.equal((await call('post', `${root}/submit`, 'student-user', { attemptNumber: 1, answers: {} })).code, 409);
  const started = await call('post', `${root}/start`);
  assert.equal(started.code, 201);
  assert.equal(started.result.questions.length, 5);
  assert.equal('answer' in started.result.questions[0], false);
  const same = await call('post', `${root}/start`);
  assert.equal(same.result.attemptNumber, 1);
  assert.equal(attempts.length, 1);
  const forbidden = await call('post', `${root}/submit`, 'student-user', { attemptNumber: 1, answers: { [item.questions![0].id]: 'invented choice' } });
  assert.equal(forbidden.code, 400);
  const answers = Object.fromEntries(item.questions!.map(q => [q.id, q.answer]));
  const submitted = await call('post', `${root}/submit`, 'student-user', { attemptNumber: 1, answers });
  assert.equal(submitted.result.score, 5);
  assert.equal(submitted.result.passed, true);
  assert.equal((await call('get', '/api/my-courses/:enrollmentId')).result.completedIds.includes(item.id), true);
  const studentSyllabus = (await call('get', '/api/my-courses/:enrollmentId')).result.syllabus;
  assert.equal(studentSyllabus.modules[0].items[2].questions, undefined);
  assert.equal((await call('post', `${root}/start`)).result.attemptNumber, 2);
  const stale = await call('post', `${root}/submit`, 'student-user', { attemptNumber: 1, answers });
  assert.equal(stale.code, 409);
  assert.equal(attempts[1].submittedAt, null);
  attempts[1].startedAt = new Date(Date.now() - (item.minutes + 1) * 60_000);
  const late = await call('post', `${root}/submit`, 'student-user', { attemptNumber: 2, answers });
  assert.equal(late.result.timedOut, true);
  assert.equal(late.result.score, 0);
  const record = (await call('get', '/api/my-courses/:enrollmentId')).result;
  assert.deepEqual(record.quizResults.map((row: any) => row.score), [5, 0]);
  assert.ok(record.completedIds.includes(item.id));
});
