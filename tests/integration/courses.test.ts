import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { makeMrlcGedCourse } from '../../shared/mrlcGedCourseContent';
import { registerCourseRoutes } from '../../courseRoutes';
import { newCourseDraft, type CourseDraft } from '../../shared/courses';

const url = process.env.COURSE_TEST_DATABASE_URL;
// This test can only write to its disposable local database on a dedicated port.
const enabled = Boolean(url && new URL(url).hostname === '127.0.0.1' && new URL(url).port === '55441' && new URL(url).pathname === '/mrlc_course_test');
test('course authoring, approval, assignments and progress against PostgreSQL', { skip: !enabled }, async t => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) });
  const app = express(); app.use(express.json());
  const users: Record<string, string> = {};
  const canManage = async (actor: any, classId: string) => actor.role === 'ADMIN' || !!await db.classTeacher.findFirst({ where: { classId, teacher: { userId: actor.userId } } });
  registerCourseRoutes({ app, prisma: db, authMiddleware: (req, _res, next) => { const role = String(req.headers['x-fixture-role']); (req as any).user = { role: role === 'OUTSIDER' ? 'STUDENT' : role, userId: users[role], externalLearner: role === 'OUTSIDER' }; next(); }, canManageExamClass: canManage, logger: { error: (...args) => console.error(...args) } });
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
  const call = async (role: string, path: string, method = 'GET', body?: any, status = 200) => {
    const response = await fetch(`${baseUrl}${path}`, { method, headers: { 'Content-Type': 'application/json', 'x-fixture-role': role }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const json = await response.json(); assert.equal(response.status, status, JSON.stringify(json)); return json;
  };
  try {
    for (const role of ['ADMIN', 'TEACHER', 'STUDENT', 'OTHER_STUDENT', 'OUTSIDER']) users[role] = (await db.user.create({ data: { email: `${randomUUID()}@example.test`, firstName: role, lastName: 'Course fixture', role: role.includes('STUDENT') || role === 'OUTSIDER' ? 'STUDENT' : role as 'ADMIN' | 'TEACHER', isExternalLearner: role === 'OUTSIDER' } })).id;
    const classroom = await db.class.create({ data: { name: 'Course fixture A', level: 'GED', academicYear: '2026' } });
    const otherClass = await db.class.create({ data: { name: 'Course fixture B', level: 'GED', academicYear: '2026' } });
    const teacher = await db.teacher.create({ data: { teacherCode: randomUUID(), userId: users.TEACHER } });
    await db.classTeacher.create({ data: { teacherId: teacher.id, classId: classroom.id } });
    const student = await db.student.create({ data: { userId: users.STUDENT, studentCode: randomUUID(), classId: classroom.id } });
    const video = await db.videoLesson.create({ data: { title: 'Course video', videoUrl: 'https://example.test/video', classId: classroom.id, uploadedById: users.TEACHER, uploadedByName: 'Fixture', visibility: 'STUDENTS' } });
    const value: CourseDraft = { ...newCourseDraft(), title: 'Original course', summary: 'Learn with an explanation and example.', objectives: 'Explain a ratio.', modules: [{ id: 'module-one', title: 'Ratios', outcomes: 'Compare two quantities.', items: [{ id: 'text-one', title: 'Read the example', kind: 'TEXT', content: 'An original example.', minutes: 10, resourceId: '', url: '', source: '' }, { id: 'video-one', title: 'Watch the example', kind: 'VIDEO', content: '', minutes: 10, resourceId: video.id, url: '', source: '' }] }] };
    let course = await call('TEACHER', '/api/courses', 'POST', value, 201);
    const root = `/api/courses/${course.id}`;
    await t.test('real revision checks protect two tabs from lost edits', async () => {
      const responses = await Promise.all([1, 2].map(n => fetch(`${baseUrl}${root}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-fixture-role': 'TEACHER' }, body: JSON.stringify({ revision: 1, draft: { ...value, title: `Concurrent edit ${n}` } }) })));
      assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
      course = await call('TEACHER', root); assert.equal(course.revision, 2);
    });
    await t.test('teacher submits, admin reviews, and the snapshot is immutable', async () => {
      await call('TEACHER', `${root}/assign`, 'POST', { revision: course.revision, classId: classroom.id }, 400);
      await call('TEACHER', `${root}/submit`, 'POST', { revision: course.revision });
      course = await call('TEACHER', root);
      await call('TEACHER', `${root}/review`, 'POST', { revision: course.revision, decision: 'APPROVE' }, 403);
      await call('ADMIN', `${root}/review`, 'POST', { revision: course.revision, decision: 'APPROVE' });
      course = await call('TEACHER', root); assert.equal(course.publishedVersion, 1);
      assert.equal(await db.courseVersion.count({ where: { courseId: course.id } }), 1);
    });
    let enrollment: any;
    await t.test('assignment is class-scoped, idempotent and visible only to its student', async () => {
      await call('TEACHER', `${root}/assign`, 'POST', { revision: course.revision, classId: otherClass.id }, 403);
      const assigned = await call('TEACHER', `${root}/assign`, 'POST', { revision: course.revision, classId: classroom.id }); assert.equal(assigned.assigned, 1);
      course = await call('TEACHER', root);
      const duplicate = await call('TEACHER', `${root}/assign`, 'POST', { revision: course.revision, classId: classroom.id }); assert.equal(duplicate.assigned, 0);
      const list = await call('STUDENT', '/api/my-courses'); assert.equal(list.length, 1); enrollment = list[0];
      await call('OUTSIDER', '/api/my-courses', 'GET', undefined, 403);
      await call('STUDENT', root, 'GET', undefined, 403);
    });
    await t.test('manual lessons save, but video completion must have a trusted record', async () => {
      const path = `/api/my-courses/${enrollment.id}`;
      await call('STUDENT', `${path}/complete`, 'POST', { itemId: 'video-one', completed: true }, 400);
      const textDone = await call('STUDENT', `${path}/complete`, 'POST', { itemId: 'text-one' }); assert.deepEqual(textDone.completedIds, ['text-one']);
      await db.videoProgress.create({ data: { userId: users.STUDENT, videoId: video.id, currentPosition: 600, isCompleted: true } });
      assert.deepEqual(new Set((await call('STUDENT', path)).completedIds), new Set(['text-one', 'video-one']));
      await db.videoLesson.update({ where: { id: video.id }, data: { status: 'DRAFT' } });
      const revoked = await call('STUDENT', path); assert.deepEqual(revoked.completedIds, ['text-one']); assert.deepEqual(revoked.unavailableIds, ['video-one']);
      await db.videoLesson.update({ where: { id: video.id }, data: { status: 'PUBLISHED' } });
    });
    await t.test('new draft does not change an assigned syllabus, and class transfer revokes access', async () => {
      course = await call('TEACHER', root);
      await call('TEACHER', root, 'PUT', { revision: course.revision, draft: { ...value, title: 'A new draft title' } });
      const original = await call('STUDENT', `/api/my-courses/${enrollment.id}`); assert.notEqual(original.syllabus.title, 'A new draft title');
      await db.student.update({ where: { id: student.id }, data: { classId: otherClass.id } });
      assert.deepEqual(await call('STUDENT', '/api/my-courses'), []);
      await call('STUDENT', `/api/my-courses/${enrollment.id}`, 'GET', undefined, 404);
      await db.student.update({ where: { id: student.id }, data: { classId: classroom.id } });
    });
    await t.test('archive hides assignments, restoration retains previous progress', async () => {
      course = await call('TEACHER', root);
      await call('ADMIN', `${root}/archive`, 'POST', { revision: course.revision, archived: true });
      assert.deepEqual(await call('STUDENT', '/api/my-courses'), []);
      course = await call('ADMIN', root);
      await call('ADMIN', `${root}/archive`, 'POST', { revision: course.revision, archived: false });
      assert.equal((await call('STUDENT', `/api/my-courses/${enrollment.id}`)).completedIds.length, 2);
    });
    await t.test('reassignment after a class transfer retains progress for the same approved syllabus', async () => {
      const textOnly = { ...value, title: 'Shared reading course', modules: value.modules.map(m => ({ ...m, items: m.items.filter(i => i.kind === 'TEXT') })) };
      const shared = await call('TEACHER', '/api/courses', 'POST', textOnly, 201);
      const path = `/api/courses/${shared.id}`;
      await call('TEACHER', `${path}/submit`, 'POST', { revision: 1 });
      await call('ADMIN', `${path}/review`, 'POST', { revision: 2, decision: 'APPROVE' });
      await call('TEACHER', `${path}/assign`, 'POST', { revision: 3, classId: classroom.id });
      const [first] = await db.courseEnrollment.findMany({ where: { version: { courseId: shared.id } } });
      await call('STUDENT', `/api/my-courses/${first.id}/complete`, 'POST', { itemId: 'text-one' });
      await db.student.update({ where: { id: student.id }, data: { classId: otherClass.id } });
      const reassigned = await call('ADMIN', `${path}/assign`, 'POST', { revision: 4, classId: otherClass.id });
      assert.equal(reassigned.assigned, 1);
      const resumed = await call('STUDENT', `/api/my-courses/${first.id}`);
      assert.deepEqual(resumed.completedIds, ['text-one']);
      assert.equal(await db.courseEnrollment.count({ where: { version: { courseId: shared.id } } }), 1);
      await db.course.delete({ where: { id: shared.id } });
    });
    await t.test('independent unit test records course attempts and limits access', async () => {
      const syllabus = makeMrlcGedCourse('math');
      const local = await call('TEACHER', '/api/courses', 'POST', syllabus, 201);
      const path = `/api/courses/${local.id}`;
      await call('TEACHER', path + '/submit', 'POST', { revision: 1 });
      await call('ADMIN', path + '/review', 'POST', { revision: 2, decision: 'APPROVE' });
      await call('TEACHER', path + '/assign', 'POST', { revision: 3, classId: classroom.id });
      const [assigned] = await db.courseEnrollment.findMany({ where: { version: { courseId: local.id } } });
      const unit = syllabus.modules[0].items[2];
      const route = `/api/my-courses/${assigned.id}/quizzes/${unit.id}`;
      await call('OUTSIDER', route, 'GET', undefined, 403);
      const started = await call('STUDENT', route + '/start', 'POST', {}, 201);
      assert.equal(started.questions.length, 5);
      assert.ok(!('answer' in started.questions[0]));
      const answers = Object.fromEntries(unit.questions!.map(q => [q.id, q.answer]));
      const scored = await call('STUDENT', route + '/submit', 'POST', { attemptNumber: started.attemptNumber, answers });
      assert.equal(scored.score, 5);
      const [report] = await call('TEACHER', path + '/report');
      assert.equal(report.assessments[0].passed, true);
      const learner = await call('STUDENT', `/api/my-courses/${assigned.id}`);
      assert.ok(learner.completedIds.includes(unit.id));
      assert.equal(learner.syllabus.modules[0].items[2].questions, undefined);
      await db.course.delete({ where: { id: local.id } });
    });
    await db.course.delete({ where: { id: course.id } });
    await db.videoLesson.delete({ where: { id: video.id } });
    await db.student.delete({ where: { id: student.id } });
    await db.classTeacher.deleteMany({ where: { teacherId: teacher.id } });
    await db.teacher.delete({ where: { id: teacher.id } });
    await db.class.deleteMany({ where: { id: { in: [classroom.id, otherClass.id] } } });
    await db.user.deleteMany({ where: { id: { in: Object.values(users) } } });
  } finally {
    server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); await db.$disconnect();
  }
});
