import assert from 'node:assert/strict';
import test from 'node:test';
import { courseDraftSchema, courseReadiness, courseProgress, courseVideoEmbedUrl, studentCourseDraft } from '../../shared/courses';
import { makeMrlcGedCourse } from '../../shared/mrlcGedCourseContent';
import { gradeCourseQuiz } from '../../shared/courseQuiz';
import { registerCourseRoutes } from '../../courseRoutes';

test('four standalone MRLC GED courses contain 25 taught units and original tests', () => {
  let chapters = 0, questions = 0;
  for (const key of ['rla', 'math', 'social-studies', 'science']) {
    let sequence = 0;
    const draft = makeMrlcGedCourse(key, () => `item-${++sequence}`);
    assert.equal(courseDraftSchema.safeParse(draft).success, true, key);
    assert.deepEqual(courseReadiness(draft), [], key);
    assert.ok(draft.modules.every(module => module.items.map(item => item.kind).join(',') === 'TEXT,TEXT,QUIZ'));
    const items = draft.modules.flatMap(module => module.items);
    assert.ok(items.every(item => !item.resourceId && !item.url));
    const tests = items.filter(item => item.kind === 'QUIZ');
    assert.ok(tests.every(item => item.questions?.length === 5));
    assert.ok(tests.flatMap(item => item.questions ?? []).some(question => question.kind === 'NUMERIC') || key === 'rla');
    chapters += draft.modules.length; questions += tests.reduce((count, item) => count + (item.questions?.length ?? 0), 0);
  }
  assert.equal(chapters, 25);
  assert.equal(questions, 125);
});

test('student syllabus excludes answers; grading uses approved answers', () => {
  const draft = makeMrlcGedCourse('math');
  const testItem = draft.modules[0].items[2];
  const student = studentCourseDraft(draft).modules[0].items[2];
  assert.equal(student.questions, undefined);
  const correct = Object.fromEntries(testItem.questions!.map(question => [question.id, question.answer]));
  assert.deepEqual(gradeCourseQuiz(testItem, correct).score, 5);
  assert.deepEqual(gradeCourseQuiz(testItem, {}).score, 0);
});

test('video embeds accept only supported HTTPS providers', () => {
  assert.equal(courseVideoEmbedUrl('https://youtu.be/dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  assert.equal(courseVideoEmbedUrl('https://vimeo.com/123456'), 'https://player.vimeo.com/video/123456');
  for (const value of ['https://evil.example/watch?v=dQw4w9WgXcQ', 'http://youtu.be/dQw4w9WgXcQ', 'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ']) assert.equal(courseVideoEmbedUrl(value), null);
});

test('course endpoint creates four independent drafts once for a teacher', async () => {
  const handlers = new Map<string, Function>();
  const app: any = {};
  for (const method of ['get', 'post', 'put', 'delete']) app[method] = (path: string, ...middleware: Function[]) => handlers.set(`${method} ${path}`, middleware.at(-1)!);
  const saved = new Map<string, any>();
  const prisma: any = { course: { findUnique: async ({ where }: any) => saved.get(where.id) ?? null, create: async ({ data }: any) => { saved.set(data.id, data); return data; } } };
  registerCourseRoutes({ app, prisma, authMiddleware: (_req: any, _res: any, next: Function) => next(), canManageExamClass: async () => true, logger: { error: () => assert.fail('Unexpected route error') } });
  const handler = handlers.get('post /api/courses/mrlc-ged')!;
  const call = async () => {
    let code = 200, body: any;
    const response: any = { setHeader: () => {}, status: (value: number) => { code = value; return response; }, json: (value: any) => { body = value; } };
    await handler({ user: { userId: 'teacher-one', role: 'TEACHER' } }, response);
    return { code, body };
  };
  assert.equal((await call()).code, 201);
  assert.equal(saved.size, 4);
  assert.ok([...saved.values()].every(row => row.ownerId === 'teacher-one' && courseReadiness(courseDraftSchema.parse(row.draft)).length === 0));
  assert.equal((await call()).code, 200);
  assert.equal(saved.size, 4);
});

test('optional Learning Quest enrichment leaves required course completion intact', () => {
  const course = makeMrlcGedCourse('science');
  const required = course.modules.flatMap(unit => unit.items).map(item => item.id);
  course.modules[0].items.push({ id: 'enrichment', title: 'Optional practice', kind: 'PRACTICE', optional: true, resourceId: 'extra', content: '', source: '', url: '', minutes: 10 });
  assert.deepEqual(courseProgress(course, required), { completed: required.length, total: required.length, percent: 100, nextId: null });
});
