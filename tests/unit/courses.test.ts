import assert from 'node:assert/strict';
import test from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { courseDraftSchema, courseExternalUrl, courseProgress, courseReadiness, courseResourceHref, GED_COURSE_TEMPLATES, newCourseDraft, type CourseDraft, type CourseItem } from '../../shared/courses';
import { courseExamCompleted, inspectCourseResources, registerCourseRoutes } from '../../courseRoutes';
import { validCourseReturn } from '../../src/lib/courseReturn';

const item = (patch: Partial<CourseItem> = {}): CourseItem => ({ id: 'lesson', title: 'Explain a ratio', kind: 'TEXT', content: 'Compare two quantities using the same units.', resourceId: '', url: '', source: '', minutes: 15, ...patch });
const draft = (items = [item()]): CourseDraft => ({ ...newCourseDraft(), title: 'Ratios', summary: 'Solve ratio problems.', objectives: 'Represent a ratio and explain it.', modules: [{ id: 'module', title: 'Ratios', outcomes: 'Explain the relationship between two quantities.', items }] });

test('GED templates are editable, independent outlines and cannot be published as finished courses', () => {
  for (const template of GED_COURSE_TEMPLATES) {
    let sequence = 0;
    const value = newCourseDraft(template.key, () => `module-${++sequence}`);
    assert.equal(courseDraftSchema.safeParse(value).success, true);
    assert.equal(value.subject, template.subject);
    assert.equal(value.modules.length, ({ math: 7, rla: 9, science: 4, 'social-studies': 5 } as Record<string, number>)[template.key]);
    assert.ok(courseReadiness(value).length >= value.modules.length);
    assert.ok(value.modules.every(m => !m.items.length));
  }
});
test('course validation rejects duplicate IDs, oversized courses and unsafe links', () => {
  assert.equal(courseDraftSchema.safeParse(draft([item(), item()])).success, false);
  assert.equal(courseDraftSchema.safeParse(draft([item({ id: 'module' })])).success, false);
  assert.equal(courseDraftSchema.safeParse(draft([item({ url: 'javascript:alert(1)' })])).success, false);
  const tooMany = draft();
  tooMany.modules = Array.from({ length: 10 }, (_, m) => ({ id: `m${m}`, title: 'Module', outcomes: 'Learn', items: Array.from({ length: 21 }, (_, n) => item({ id: `i${m}-${n}` })) }));
  assert.equal(courseDraftSchema.safeParse(tooMany).success, false);
});
test('external readings require safe HTTPS links and explicit source attribution', () => {
  for (const url of ['javascript:alert(1)', '//example.test', 'http://example.test', 'https://user:pass@example.test', 'https://example.test/a\nb', 'https://example.test/\\evil']) assert.equal(courseExternalUrl(url), null);
  assert.equal(courseExternalUrl('https://example.test/reading?q=one'), 'https://example.test/reading?q=one');
  assert.ok(courseReadiness(draft([item({ kind: 'LINK', url: 'https://example.test' })])).length);
  assert.deepEqual(courseReadiness(draft([item({ kind: 'LINK', url: 'https://example.test', source: 'Author, Reading, CC BY 4.0' })])), []);
});
test('progress counts only unique lesson IDs in the assigned version', () => {
  const value = draft([item(), item({ id: 'next' })]);
  assert.deepEqual(courseProgress(value, ['lesson', 'lesson', 'unknown']), { completed: 1, total: 2, percent: 50, nextId: 'next' });
  assert.equal(courseProgress(draft([]), []).percent, 0);
  assert.deepEqual(courseReadiness(draft()), []);
});
test('resource URLs use existing focused learning routes', () => {
  assert.equal(courseResourceHref(item({ kind: 'VIDEO', resourceId: 'video-a' })), '/videos/video-a');
  assert.equal(courseResourceHref(item({ kind: 'HOMEWORK', resourceId: 'hw-a' })), '/student/homework?assignment=hw-a');
  assert.equal(courseResourceHref(item({ kind: 'EXAM', resourceId: 'exam-a' })), '/exam2/resume?exam=exam-a');
  assert.equal(courseResourceHref(item({ kind: 'EXAM' })), null);
});
test('return navigation accepts only a local assigned course lesson', () => {
  assert.equal(validCourseReturn('/courses/learn/enrollment-1?lesson=lesson-1'), true);
  for (const path of ['https://example.test', '//example.test', '/courses/new', '/courses/learn/e?lesson=x&redirect=https://example.test', '/courses/learn/e?lesson=../admin']) assert.equal(validCourseReturn(path), false);
});
test('exam completion respects release policies, grading and historical invalidation', () => {
  assert.equal(courseExamCompleted({ state: 'SUBMITTED' }, null), true);
  assert.equal(courseExamCompleted({ state: 'IN_PROGRESS' }, null), false);
  assert.equal(courseExamCompleted({ state: 'RELEASED', invalidatedAt: new Date() }, null), false);
  assert.equal(courseExamCompleted({ state: 'INVALIDATED' }, null), false);
  assert.equal(courseExamCompleted({ state: 'RELEASED' }, { releaseMode: 'HIDDEN', releaseAt: null }), false);
  assert.equal(courseExamCompleted({ state: 'SUBMITTED', gradingStatus: 'PENDING' }, { releaseMode: 'AFTER_GRADING', releaseAt: null }), false);
  assert.equal(courseExamCompleted({ state: 'SUBMITTED', gradingStatus: 'COMPLETE' }, { releaseMode: 'AFTER_GRADING', releaseAt: null }), true);
  assert.equal(courseExamCompleted({ state: 'FINALIZED' }, { releaseMode: 'SCHEDULED', releaseAt: new Date(2000) }, 1000), false);
  assert.equal(courseExamCompleted({ state: 'FINALIZED' }, { releaseMode: 'SCHEDULED', releaseAt: new Date(2000) }, 3000), true);
});

function resources(overrides: Record<string, any> = {}) {
  return {
    videoLesson: { findMany: async () => [{ id: 'v', classId: 'c1', status: 'PUBLISHED', visibility: 'STUDENTS', progressRecords: [{ isCompleted: true }] }] },
    ebook: { findMany: async () => [{ id: 'b', visibility: 'ALL', progress: [{ completedAt: new Date() }] }] },
    languageQuestLesson: { findMany: async () => [{ id: 'p', unit: { course: { published: true } }, challenges: [{ progress: [{}] }, { progress: [{}] }] }] },
    homework: { findMany: async () => [{ id: 'h', classId: 'c1', submissions: [{ status: 'SUBMITTED' }] }] },
    exam: { findMany: async () => [{ id: 'e', classId: 'c1', status: 'PUBLISHED', assignments: [{ studentId: 's1' }], attempts: [{ state: 'RELEASED' }], resultPolicy: null }] },
    ...overrides,
  } as unknown as PrismaClient;
}
const student = { id: 's1', userId: 'u1', classId: 'c1' };
test('resource completion uses trusted activity records and live class availability', async () => {
  const value = draft(['VIDEO', 'EBOOK', 'PRACTICE', 'HOMEWORK', 'EXAM'].map((kind, n) => item({ id: `i${n}`, kind: kind as CourseItem['kind'], resourceId: ['v', 'b', 'p', 'h', 'e'][n] })));
  const result = await inspectCourseResources(resources(), value, { userId: 'u1', role: 'STUDENT' }, async () => false, student);
  assert.equal(result.available.size, 5); assert.equal(result.completed.size, 5);
  const other = await inspectCourseResources(resources(), value, { userId: 'u2', role: 'STUDENT' }, async () => true, { ...student, id: 's2', classId: 'c2' });
  assert.deepEqual([...other.available], ['i1', 'i2']);
});
test('unpublished resources, incomplete practice, REDO and hidden exams never count', async () => {
  const value = draft(['VIDEO', 'PRACTICE', 'HOMEWORK', 'EXAM'].map((kind, n) => item({ id: `i${n}`, kind: kind as CourseItem['kind'], resourceId: ['v', 'p', 'h', 'e'][n] })));
  const prisma = resources({
    videoLesson: { findMany: async () => [{ id: 'v', status: 'DRAFT', visibility: 'ALL', classId: null, progressRecords: [{ isCompleted: true }] }] },
    languageQuestLesson: { findMany: async () => [{ id: 'p', unit: { course: { published: true } }, challenges: [{ progress: [{}] }, { progress: [] }] }] },
    homework: { findMany: async () => [{ id: 'h', classId: 'c1', submissions: [{ status: 'REDO' }] }] },
    exam: { findMany: async () => [{ id: 'e', classId: 'c1', status: 'PUBLISHED', assignments: [], attempts: [{ state: 'RELEASED' }], resultPolicy: { releaseMode: 'HIDDEN' } }] },
  });
  const result = await inspectCourseResources(prisma, value, { userId: 'u1', role: 'STUDENT' }, async () => true, student);
  assert.equal(result.available.has('i0'), false); assert.equal(result.completed.size, 0);
});
test('assignment cannot grant access to activities from a different class', async () => {
  const result = await inspectCourseResources(resources(), draft([item({ kind: 'VIDEO', resourceId: 'v' })]), { userId: 'teacher', role: 'TEACHER' }, async () => true, undefined, 'c2');
  assert.equal(result.available.size, 0);
});
test('many lesson references to one resource use one resource query', async () => {
  let queries = 0;
  const prisma = resources({ videoLesson: { findMany: async () => { queries++; return []; } } });
  await inspectCourseResources(prisma, draft(Array.from({ length: 25 }, (_, n) => item({ id: `i${n}`, kind: 'VIDEO', resourceId: 'v' }))), { userId: 'teacher', role: 'ADMIN' }, async () => true);
  assert.equal(queries, 1);
});

function harness(overrides: Record<string, any> = {}, actor: any = { userId: 'owner', role: 'TEACHER' }, manage = true) {
  const handlers = new Map<string, Function>(); const app: any = {};
  for (const method of ['get', 'post', 'put', 'delete']) app[method] = (path: string, ...args: Function[]) => handlers.set(`${method} ${path}`, args.at(-1)!);
  const writes: any[] = [], versions: any[] = [], enrollments: any[] = [];
  let course: any = { id: 'c', ownerId: 'owner', draft: draft(), revision: 3, status: 'IN_REVIEW' };
  const prisma: any = {
    ...resources(),
    course: { findUnique: async () => course, updateMany: async ({ where, data }: any) => { if (where.revision !== course.revision) return { count: 0 }; writes.push(data); course = { ...course, ...data, revision: course.revision + 1 }; return { count: 1 }; } },
    courseVersion: { findFirst: async () => ({ id: 'version-1', number: 1, syllabus: draft() }), create: async ({ data }: any) => { versions.push(data); return data; } },
    courseEnrollment: { createMany: async ({ data }: any) => { enrollments.push(...data); return { count: data.length }; }, updateMany: async () => ({ count: 0 }), findFirst: async () => null },
    courseItemProgress: { upsert: async () => { throw new Error('Unexpected progress write'); } },
    student: { findUnique: async () => ({ ...student, status: 'ACTIVE' }), findMany: async () => [{ id: 's1' }] },
    class: { findFirst: async () => ({ id: 'c1' }) },
    ...overrides,
  };
  prisma.$transaction ??= async (fn: Function) => fn(prisma);
  registerCourseRoutes({ app, prisma, authMiddleware: (() => {}) as any, logger: { error: () => {} }, canManageExamClass: async () => manage });
  return { writes, versions, enrollments, setCourse: (next: any) => { course = { ...course, ...next }; }, invoke: async (method: string, path: string, body: any = {}, params: any = {}) => {
    let status = 200, result: any;
    const res: any = { setHeader: () => {}, status: (n: number) => { status = n; return res; }, json: (data: any) => { result = data; return res; } };
    await handlers.get(`${method} ${path}`)!({ user: actor, params: { id: 'c', enrollmentId: 'enrollment', ...params }, body, query: {}, headers: {} }, res);
    return { status, data: result };
  } };
}
test('teachers cannot approve their own submitted courses', async () => {
  const h = harness();
  assert.equal((await h.invoke('post', '/api/courses/:id/review', { revision: 3, decision: 'APPROVE' })).status, 403);
  assert.equal(h.versions.length, 0); assert.equal(h.writes.length, 0);
});
test('admin approval snapshots the reviewed content and increments version atomically', async () => {
  const h = harness({}, { userId: 'admin', role: 'ADMIN' });
  assert.equal((await h.invoke('post', '/api/courses/:id/review', { revision: 3, decision: 'APPROVE' })).status, 200);
  assert.equal(h.versions.length, 1); assert.equal(h.versions[0].number, 2); assert.deepEqual(h.versions[0].syllabus, draft());
  assert.equal(h.writes[0].status, 'PUBLISHED');
});
test('stale save and stale approval cannot overwrite or publish another revision', async () => {
  const h = harness({}, { userId: 'admin', role: 'ADMIN' });
  assert.equal((await h.invoke('put', '/api/courses/:id', { revision: 2, draft: draft() })).status, 409);
  assert.equal((await h.invoke('post', '/api/courses/:id/review', { revision: 2, decision: 'APPROVE' })).status, 409);
  assert.equal(h.writes.length, 0); assert.equal(h.versions.length, 0);
});
test('editing a published course saves a new draft without changing any version', async () => {
  const h = harness(); h.setCourse({ status: 'PUBLISHED' });
  assert.equal((await h.invoke('put', '/api/courses/:id', { revision: 3, draft: draft([item({ content: 'Revised lesson' })]) })).status, 200);
  assert.equal(h.writes[0].status, 'DRAFT'); assert.equal(h.versions.length, 0);
});
test('teacher ownership, external-account restrictions and class assignment scope are enforced', async () => {
  const other = harness({}, { userId: 'other', role: 'TEACHER' });
  assert.equal((await other.invoke('put', '/api/courses/:id', { revision: 3, draft: draft() })).status, 404);
  const external = harness({}, { userId: 'owner', role: 'TEACHER', externalLearner: true });
  assert.equal((await external.invoke('post', '/api/courses', draft())).status, 403);
  const wrongClass = harness({}, undefined, false);
  assert.equal((await wrongClass.invoke('post', '/api/courses/:id/assign', { revision: 3, classId: 'c2' })).status, 403);
  assert.equal(wrongClass.enrollments.length, 0);
});
test('review feedback is required for change requests, and drafts cannot skip review', async () => {
  const h = harness({}, { userId: 'admin', role: 'ADMIN' });
  assert.equal((await h.invoke('post', '/api/courses/:id/review', { revision: 3, decision: 'REQUEST_CHANGES' })).status, 400);
  h.setCourse({ status: 'DRAFT' });
  assert.equal((await h.invoke('post', '/api/courses/:id/review', { revision: 3, decision: 'APPROVE' })).status, 409);
});
test('invalid resource references block submission and assignment', async () => {
  const h = harness(); h.setCourse({ status: 'DRAFT', draft: draft([item({ kind: 'VIDEO', resourceId: 'missing' })]) });
  assert.equal((await h.invoke('post', '/api/courses/:id/submit', { revision: 3 })).status, 400);
  assert.equal(h.writes.length, 0);
});
test('class assignments use the approved snapshot instead of the pending draft', async () => {
  const h = harness(); h.setCourse({ status: 'DRAFT', draft: draft([item({ kind: 'VIDEO', resourceId: 'missing' })]) });
  const response = await h.invoke('post', '/api/courses/:id/assign', { revision: 3, classId: 'c1' });
  assert.equal(response.status, 200); assert.equal(h.enrollments[0].versionId, 'version-1'); assert.equal(h.enrollments[0].studentId, 's1');
});
test('students cannot spoof activity completion or read another enrollment', async () => {
  const h = harness({ courseEnrollment: { findFirst: async () => ({ id: 'enrollment', class: { name: 'A' }, version: { syllabus: draft([item({ kind: 'EXAM', resourceId: 'e' })]) }, progress: [] }) } }, { userId: 'u1', role: 'STUDENT' });
  assert.equal((await h.invoke('post', '/api/my-courses/:enrollmentId/complete', { itemId: 'lesson', completed: true })).status, 400);
  const missing = harness({}, { userId: 'u1', role: 'STUDENT' });
  assert.equal((await missing.invoke('get', '/api/my-courses/:enrollmentId')).status, 404);
});
test('archived courses cannot be edited or assigned', async () => {
  const h = harness(); h.setCourse({ status: 'ARCHIVED' });
  assert.equal((await h.invoke('put', '/api/courses/:id', { revision: 3, draft: draft() })).status, 409);
  assert.equal((await h.invoke('post', '/api/courses/:id/assign', { revision: 3, classId: 'c1' })).status, 409);
});
