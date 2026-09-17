import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const url = process.env.VIDEO_TEST_DATABASE_URL;
const base = process.env.VIDEO_TEST_BASE_URL;
const secret = process.env.VIDEO_TEST_SESSION_SECRET;
const enabled = Boolean(url && new URL(url).hostname === '127.0.0.1' && new URL(url).port === '55439'
  && base && new URL(base).hostname === '127.0.0.1' && secret);

test('video create/edit normalize pasted YouTube links and reject malformed IDs', { skip: !enabled }, async () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) });
  const users: string[] = []; const videos: string[] = [];
  const request = (role: string, userId: string, endpoint: string, method: string, body?: unknown) => fetch(`${base}${endpoint}`, {
    method, headers: { Authorization: `Bearer ${jwt.sign({ role, userId, email: 'video-test@example.test' }, secret!, { expiresIn: '5m' })}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  try {
    for (const role of ['TEACHER', 'STUDENT', 'ADMIN', 'TEACHER'] as const) users.push((await db.user.create({ data: { role, email: `${role}-${randomUUID()}@example.test`, firstName: 'Video', lastName: 'Test' } })).id);
    const input = { title: 'Cave safety test', videoUrl: 'https://www.youtube.com/watch?v=-mzqQ_vNiKg DO NOT ENTER CAVES or LAVA TUBES!', visibility: 'ALL', status: 'PUBLISHED' };
    assert.equal((await request('STUDENT', users[1], '/api/videos', 'POST', input)).status, 403);
    const created = await request('TEACHER', users[0], '/api/videos', 'POST', input);
    assert.equal(created.status, 201, await created.clone().text());
    assert.equal(created.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    const lesson = await created.json(); videos.push(lesson.id);
    assert.equal(lesson.videoUrl, 'https://www.youtube.com/watch?v=-mzqQ_vNiKg');
    const adminInput = {
      title: 'Admin edited teacher lesson', description: 'Updated description', videoUrl: lesson.videoUrl,
      thumbnailUrl: null, captionsUrl: '', duration: null, classId: null, subjectId: null,
      visibility: 'ALL', status: 'DRAFT', isRequired: false, dueDate: '',
    };
    const adminEdited = await request('ADMIN', users[2], `/api/videos/${lesson.id}`, 'PUT', adminInput);
    assert.equal(adminEdited.status, 200, await adminEdited.clone().text());
    const persisted = await (await request('ADMIN', users[2], `/api/videos/${lesson.id}`, 'GET')).json();
    for (const key of ['title', 'description', 'videoUrl', 'duration', 'classId', 'subjectId', 'visibility', 'status', 'isRequired']) assert.equal(persisted[key], adminInput[key]);
    assert.equal(persisted.dueDate, null);
    assert.equal((await request('STUDENT', users[1], `/api/videos/${lesson.id}`, 'PUT', { title: 'Forbidden edit' })).status, 403);
    assert.equal((await request('TEACHER', users[3], `/api/videos/${lesson.id}`, 'PUT', { title: 'Other teacher edit' })).status, 403);
    const edited = await request('TEACHER', users[0], `/api/videos/${lesson.id}`, 'PUT', { videoUrl: 'https://youtu.be/-mzqQ_vNiKg?t=90 Another pasted title' });
    assert.equal(edited.status, 200); assert.equal((await edited.json()).videoUrl, 'https://www.youtube.com/watch?v=-mzqQ_vNiKg&t=90s');
    assert.equal((await request('TEACHER', users[0], `/api/videos/${lesson.id}`, 'PUT', { videoUrl: 'https://youtube.com/watch?v=invalid' })).status, 400);
    assert.equal((await request('TEACHER', users[0], '/api/videos', 'POST', { ...input, videoUrl: 'javascript:alert(1)' })).status, 400);
    assert.equal((await db.videoLesson.findUniqueOrThrow({ where: { id: lesson.id } })).videoUrl, 'https://www.youtube.com/watch?v=-mzqQ_vNiKg&t=90s');
  } finally {
    await db.videoLesson.deleteMany({ where: { id: { in: videos } } });
    await db.auditLog.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  }
});
