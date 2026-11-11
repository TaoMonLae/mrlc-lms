import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import JSZip from 'jszip';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { registerCourseRoutes } from '../../courseRoutes';
import { newCourseDraft } from '../../shared/courses';
import { parseCoursePackage } from '../../lib/coursePackages';
import { importedMediaNeedsCourseReview } from '../../lib/courseMediaReview';

const url = process.env.COURSE_TEST_DATABASE_URL;
const enabled = Boolean(url && new URL(url).hostname === '127.0.0.1' && new URL(url).port === '55441' && new URL(url).pathname === '/mrlc_course_test');
test('offline course ZIP transfers with real database transactions and private media', { skip: !enabled }, async t => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) });
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mrlc-package-test-'));
  const ebookDir = path.join(directory, 'ebooks'), videoDir = path.join(directory, 'videos');
  let rollbackNext = false;
  const client = new Proxy(db, { get(target, key) {
    if (key === '$transaction') return (fn: any) => target.$transaction(async tx => { const result = await fn(tx); if (rollbackNext) { rollbackNext = false; throw new Error('Synthetic transaction rollback'); } return result; });
    const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value;
  } });
  const users: Record<string, string> = {};
  for (const role of ['TEACHER', 'ADMIN'] as const) users[role] = (await db.user.create({ data: { role, email: `${randomUUID()}@example.test`, firstName: 'Package', lastName: role } })).id;
  const app = express(); app.use(express.json());
  registerCourseRoutes({ app, prisma: client, ebookDir, videoDir, authMiddleware: (req, _res, next) => { const role = String(req.headers['x-fixture-role']); (req as any).user = { role, userId: users[role] ?? users.TEACHER, externalLearner: req.headers['x-external'] === '1' }; next(); }, canManageExamClass: async () => true, logger: { error: () => {} } });
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const call = async (role: string, route: string, method = 'GET', body?: any, status = 200) => {
    const response = await fetch(base + route, { method, headers: { 'x-fixture-role': role, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const data = await response.json(); assert.equal(response.status, status, JSON.stringify(data)); return data;
  };
  const course = { ...newCourseDraft(), title: 'Offline package fixture', summary: 'Explain ratios with a reading and a worked example.', objectives: 'Compare two quantities.', modules: [{ id: 'module-one', title: 'Ratios', outcomes: 'Explain what a ratio represents.', items: [
    { id: 'text', title: 'Read the idea', kind: 'TEXT', content: '', resourceId: '', url: '', source: 'Original MRLC fixture.', minutes: 10 },
    { id: 'pdf', title: 'Read a worked example', kind: 'EBOOK', content: '', resourceId: 'book', url: '', source: 'Original fixture.', minutes: 10 },
    { id: 'video', title: 'Watch the example', kind: 'VIDEO', content: '', resourceId: 'clip', url: '', source: 'Original fixture.', minutes: 10 },
  ] }] };
  const zip = new JSZip(); zip.file('course.json', JSON.stringify({ format: 'mrlc-course', version: 1, course, lessonFiles: { text: 'lessons/one.txt' }, resources: [{ key: 'book', title: 'Package reading fixture', kind: 'EBOOK', file: 'assets/reading.pdf' }, { key: 'clip', title: 'Package video fixture', kind: 'VIDEO', file: 'assets/video.mp4' }] }));
  zip.file('lessons/one.txt', 'Ratios compare quantities. မြန်မာစာ'); zip.file('assets/reading.pdf', '%PDF-1.7\nFixture only\n%%EOF'); zip.file('assets/video.mp4', Buffer.from([0, 0, 0, 16, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0]));
  const bytes = await zip.generateAsync({ type: 'nodebuffer' }); let preview: any, imported: any;
  const upload = async (route: string, fields: Record<string, string> = {}, role = 'TEACHER', status = 200, archiveBytes = bytes) => {
    const body = new FormData(); body.append('file', new Blob([new Uint8Array(archiveBytes)], { type: 'application/zip' }), 'offline.zip');
    for (const [key, value] of Object.entries(fields)) body.append(key, value);
    const response = await fetch(base + route, { method: 'POST', headers: { 'x-fixture-role': role }, body }); const data = await response.json(); assert.equal(response.status, status, JSON.stringify(data)); return data;
  };
  try {
    await t.test('preview reads the whole package without creating course or media records', async () => {
      const count = await db.course.count(); preview = await upload('/api/courses/import/preview');
      assert.equal(preview.resources.length, 2); assert.match(preview.course.modules[0].items[0].content, /မြန်မာစာ/); assert.equal(await db.course.count(), count);
    });
    const fields = () => ({ digest: preview.digest, requestKey: randomUUID(), rights: 'true' });
    await t.test('student and unreviewed imports cannot write data', async () => {
      await upload('/api/courses/import/preview', {}, 'STUDENT', 403);
      await upload('/api/courses/import', { ...fields(), rights: 'false' }, 'TEACHER', 400);
      await upload('/api/courses/import', { ...fields(), digest: '0'.repeat(64) }, 'TEACHER', 400);
    });
    await t.test('import creates a teacher-owned draft and keeps PDFs and videos private', async () => {
      const request = fields(); imported = await upload('/api/courses/import', request, 'TEACHER', 201);
      assert.equal((await call('TEACHER', `/api/courses/${imported.id}`)).status, 'DRAFT');
      const [book] = await db.ebook.findMany({ where: { uploadedById: users.TEACHER } }); const [video] = await db.videoLesson.findMany({ where: { uploadedById: users.TEACHER } });
      assert.equal(book.visibility, 'TEACHERS_ONLY'); assert.equal(video.status, 'DRAFT'); assert.equal(video.visibility, 'TEACHERS_ONLY');
      assert.equal(await importedMediaNeedsCourseReview(db, book.fileName), true);
      const again = await upload('/api/courses/import', request); assert.equal(again.id, imported.id); assert.equal(again.alreadyImported, true);
      assert.equal(await db.ebook.count({ where: { uploadedById: users.TEACHER } }), 1); assert.equal((await fs.readdir(ebookDir)).length, 1);
    });
    await t.test('a failed transaction rolls back records and removes staged files', async () => {
      const before = (await fs.readdir(ebookDir)).length; rollbackNext = true;
      await upload('/api/courses/import', fields(), 'TEACHER', 500);
      assert.equal((await fs.readdir(ebookDir)).length, before); assert.equal((await fs.readdir(videoDir)).length, 1);
      assert.equal(await db.course.count({ where: { ownerId: users.TEACHER } }), 1);
    });
    await t.test('admin approval publishes only the reviewed imported assets', async () => {
      const root = `/api/courses/${imported.id}`;
      const media = await call('TEACHER', `${root}/imported-media`); assert.equal(media.length, 2); assert.ok(media.every((row: any) => row.pending));
      await call('TEACHER', `${root}/submit`, 'POST', { revision: 1 });
      await call('TEACHER', `${root}/review`, 'POST', { revision: 2, decision: 'APPROVE' }, 403);
      await call('ADMIN', `${root}/review`, 'POST', { revision: 2, decision: 'APPROVE' });
      assert.equal((await db.ebook.findFirstOrThrow({ where: { uploadedById: users.TEACHER } })).visibility, 'ALL');
      assert.equal((await db.videoLesson.findFirstOrThrow({ where: { uploadedById: users.TEACHER } })).status, 'PUBLISHED');
      assert.equal(await importedMediaNeedsCourseReview(db, (await db.ebook.findFirstOrThrow({ where: { uploadedById: users.TEACHER } })).fileName), false);
      assert.equal((await call('TEACHER', root)).publishedVersion, 1);
    });
    await t.test('export and reimport preserve teaching content without approval or student data', async () => {
      const response = await fetch(`${base}/api/courses/${imported.id}/export?media=1&rights=1`, { headers: { 'x-fixture-role': 'TEACHER' } }); assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type')!, /application\/zip/);
      const exportedBytes = Buffer.from(await response.arrayBuffer());
      const exported = await parseCoursePackage(exportedBytes); assert.equal(exported.media.size, 2); assert.match(exported.preview.course.modules[0].items[0].content, /မြန်မာစာ/);
      assert.equal((exported.manifest as any).ownerId, undefined); assert.equal((exported.manifest.course as any).status, undefined); assert.equal((exported.manifest as any).enrollments, undefined);
      assert.ok(exported.manifest.course.modules[0].items.filter(i => i.kind !== 'TEXT').every(i => /^resource-/.test(i.resourceId)));
      const secondPreview = await upload('/api/courses/import/preview', {}, 'TEACHER', 200, exportedBytes);
      const second = await upload('/api/courses/import', { ...fields(), digest: secondPreview.digest }, 'TEACHER', 201, exportedBytes);
      assert.notEqual(second.id, imported.id);
      const secondDraft = await call('TEACHER', `/api/courses/${second.id}`);
      assert.equal(secondDraft.status, 'DRAFT'); assert.equal(secondDraft.publishedVersion, null);
      assert.match(secondDraft.draft.modules[0].items[0].content, /မြန်မာစာ/);
      assert.notEqual(secondDraft.draft.modules[0].items[0].id, exported.manifest.course.modules[0].items[0].id);
      const noMedia = await fetch(`${base}/api/courses/${imported.id}/export`, { headers: { 'x-fixture-role': 'TEACHER' } }); const lightweight = await parseCoursePackage(Buffer.from(await noMedia.arrayBuffer())); assert.equal(lightweight.media.size, 0); assert.equal(lightweight.preview.resources.length, 2);
    });
    await t.test('export requires a teacher account and an explicit media rights confirmation', async () => {
      await call('STUDENT', `/api/courses/${imported.id}/export`, 'GET', undefined, 403);
      await call('TEACHER', `/api/courses/${imported.id}/export?media=1`, 'GET', undefined, 400);
      const response = await fetch(`${base}/api/courses/package-template`, { headers: { 'x-fixture-role': 'TEACHER' } }); assert.equal(response.status, 200);
      const starter = await parseCoursePackage(Buffer.from(await response.arrayBuffer())); assert.equal(starter.preview.course.title, 'My offline course');
    });
  } finally {
    await db.course.deleteMany({ where: { ownerId: { in: Object.values(users) } } }); await db.ebook.deleteMany({ where: { uploadedById: users.TEACHER } }); await db.videoLesson.deleteMany({ where: { uploadedById: users.TEACHER } }); await db.user.deleteMany({ where: { id: { in: Object.values(users) } } });
    server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); await db.$disconnect(); await fs.rm(directory, { recursive: true, force: true });
  }
});
