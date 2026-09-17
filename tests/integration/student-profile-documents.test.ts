import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const url = process.env.PROFILE_TEST_DATABASE_URL;
const base = process.env.PROFILE_TEST_BASE_URL;
const secret = process.env.PROFILE_TEST_SESSION_SECRET;
const uploads = process.env.PROFILE_TEST_UPLOAD_DIR;
const enabled = Boolean(url && new URL(url).hostname === '127.0.0.1' && new URL(url).port === '55439'
  && base && new URL(base).hostname === '127.0.0.1' && secret && uploads?.startsWith('/private/tmp/mrlc-profile-test.'));

// Opt-in suite: never uses the school's DATABASE_URL or production upload folders.
test('only admin changes student photos; private document actions are authenticated and student-scoped', { skip: !enabled }, async () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) });
  const suffix = randomUUID();
  const users: string[] = []; const students: string[] = []; const documents: string[] = []; const files: string[] = [];
  const request = (role: string | null, userId: string, endpoint: string, method = 'GET', body?: BodyInit) => fetch(`${base}${endpoint}`, {
    method, ...(body ? { body } : {}), headers: {
      ...(role ? { Authorization: `Bearer ${jwt.sign({ role, userId, email: `${userId}@example.test` }, secret!, { expiresIn: '5m' })}` } : {}),
      ...(typeof body === 'string' ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const photo = (targetType: string, targetId: string) => {
    const form = new FormData();
    form.set('targetType', targetType); form.set('targetId', targetId);
    form.set('file', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/dsAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), 'test.png');
    return form;
  };
  try {
    for (const role of ['ADMIN', 'TEACHER', 'STUDENT', 'STUDENT'] as const) {
      const user = await db.user.create({ data: { role, email: `${role}-${users.length}-${suffix}@example.test`, firstName: 'Profile', lastName: 'Test' } });
      users.push(user.id);
      if (role === 'STUDENT') students.push((await db.student.create({ data: { userId: user.id, studentCode: `${users.length}-${suffix}`, profilePhotoUrl: '/original.png' } })).id);
    }
    for (const type of ['student', 'user', 'teacher']) {
      const target = type === 'student' ? students[0] : users[2];
      assert.equal((await request('STUDENT', users[2], '/api/profile-photo', 'POST', photo(type, target))).status, 403);
      assert.equal((await request('STUDENT', users[2], `/api/profile-photo?targetType=${type}&targetId=${target}`, 'DELETE')).status, 403);
    }
    assert.equal((await request('TEACHER', users[1], '/api/profile-photo', 'POST', photo('student', students[0]))).status, 403);
    assert.equal((await request('TEACHER', users[1], `/api/profile-photo?targetType=student&targetId=${students[0]}`, 'DELETE')).status, 403);
    const teacher = await db.teacher.create({ data: { userId: users[1], teacherCode: suffix } });
    students.push((await db.student.create({ data: { userId: users[1], studentCode: `dual-${suffix}` } })).id);
    try {
      assert.equal((await request('TEACHER', users[1], '/api/profile-photo', 'POST', photo('teacher', teacher.id))).status, 403);
      assert.equal((await request('TEACHER', users[1], `/api/profile-photo?targetType=teacher&targetId=${teacher.id}`, 'DELETE')).status, 403);
    } finally { await db.teacher.delete({ where: { id: teacher.id } }); }
    assert.equal((await db.student.findUniqueOrThrow({ where: { id: students[0] } })).profilePhotoUrl, '/original.png');
    for (const type of ['student', 'user']) {
      const target = type === 'student' ? students[0] : users[2];
      const response = await request('ADMIN', users[0], '/api/profile-photo', 'POST', photo(type, target));
      assert.equal(response.status, 200, await response.clone().text());
      const result = await response.json(); files.push(path.join(uploads!, 'photos', path.basename(result.url)));
      assert.equal((await db.student.findUniqueOrThrow({ where: { id: students[0] } })).profilePhotoUrl, result.url);
      assert.equal((await db.user.findUniqueOrThrow({ where: { id: users[2] } })).profilePhotoUrl, result.url);
      assert.equal((await request('ADMIN', users[0], `/api/profile-photo?targetType=${type}&targetId=${target}`, 'DELETE')).status, 200);
    }
    const form = new FormData(); form.set('title', 'Identity record'); form.set('documentType', 'UNHCR');
    form.set('file', new Blob(['%PDF-1.4\n%%EOF'], { type: 'application/pdf' }), 'identity.pdf');
    assert.equal((await request('TEACHER', users[1], `/api/students/${students[0]}/documents/upload`, 'POST', form)).status, 403);
    const beforeFiles = await readdir(path.join(uploads!, 'documents'));
    form.set('title', '  ');
    assert.equal((await request('ADMIN', users[0], `/api/students/${students[0]}/documents/upload`, 'POST', form)).status, 400);
    form.set('title', 'Identity record');
    assert.equal((await request('ADMIN', users[0], '/api/students/nonexistent-test-student/documents/upload', 'POST', form)).status, 404);
    assert.deepEqual(await readdir(path.join(uploads!, 'documents')), beforeFiles, 'Failed uploads must not leave private files behind');
    const uploaded = await request('ADMIN', users[0], `/api/students/${students[0]}/documents/upload`, 'POST', form);
    assert.equal(uploaded.status, 201, await uploaded.clone().text());
    const document = await uploaded.json(); documents.push(document.id); files.push(path.join(uploads!, 'documents', path.basename(document.fileUrl)));
    assert.equal((await request(null, '', document.fileUrl)).status, 401);
    const endpoint = `/api/students/${students[0]}/documents/${document.id}`;
    assert.equal((await request(null, '', `${endpoint}/file`)).status, 401);
    assert.equal((await request('STUDENT', users[2], `${endpoint}/file`)).status, 403);
    const downloaded = await request('TEACHER', users[1], `${endpoint}/file`);
    assert.equal(downloaded.status, 200); assert.match(downloaded.headers.get('cache-control') || '', /private, no-store/);
    assert.match(await downloaded.text(), /%PDF-1.4/);
    assert.ok(await db.auditLog.findFirst({ where: { entityId: document.id, action: 'DOWNLOAD' } }));
    assert.equal((await request('TEACHER', users[1], endpoint, 'PUT', JSON.stringify({ title: 'Denied' }))).status, 403);
    const wrong = `/api/students/${students[1]}/documents/${document.id}`;
    assert.equal((await request('ADMIN', users[0], wrong, 'PUT', JSON.stringify({ title: 'Wrong student' }))).status, 404);
    assert.equal((await request('ADMIN', users[0], wrong, 'DELETE')).status, 404);
    assert.equal((await request('ADMIN', users[0], `${wrong}/file`)).status, 404);
    assert.equal((await request('ADMIN', users[0], endpoint, 'PUT', JSON.stringify({ title: '  Verified record  ' }))).status, 200);
    assert.equal((await db.studentDocument.findUniqueOrThrow({ where: { id: document.id } })).title, 'Verified record');
    assert.equal((await request('ADMIN', users[0], endpoint, 'DELETE')).status, 200);
  } finally {
    await db.studentDocument.deleteMany({ where: { id: { in: documents } } });
    await db.auditLog.deleteMany({ where: { userId: { in: users } } });
    await db.student.deleteMany({ where: { id: { in: students } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
    await Promise.all(files.map(file => unlink(file).catch(() => {})));
  }
});
