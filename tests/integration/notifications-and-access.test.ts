import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { notificationPreferenceDefaults } from '../../shared/notificationPreferences';
import { consumeRecoveryCode } from '../../lib/sessionAccess';

const url = process.env.HOMEWORK_TEST_DATABASE_URL;
const base = process.env.HOMEWORK_TEST_BASE_URL;
const secret = process.env.HOMEWORK_TEST_SESSION_SECRET;
const enabled = Boolean(url && new URL(url).hostname === '127.0.0.1' && new URL(url).port === '55439'
  && base && new URL(base).hostname === '127.0.0.1' && new URL(base).port === '5801' && secret);

test('notification settings, removed AI routes and account changes against isolated PostgreSQL', { skip: !enabled }, async t => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) });
  const ids: string[] = [];
  try {
    const teacher = await db.user.create({ data: { email: `notify-${randomUUID()}@example.test`, firstName: 'Notify', lastName: 'Teacher', role: 'TEACHER' } }); ids.push(teacher.id);
    const other = await db.user.create({ data: { email: `notify-${randomUUID()}@example.test`, firstName: 'Other', lastName: 'Teacher', role: 'TEACHER' } }); ids.push(other.id);
    const session = await db.authSession.create({ data: { userId: teacher.id, expiresAt: new Date(Date.now() + 60_000) } });
    const token = jwt.sign({ userId: teacher.id, role: 'TEACHER', email: teacher.email, sessionId: session.id }, secret!, { expiresIn: '5m' });
    const request = (path: string, method = 'GET', body?: any) => fetch(`${base}${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    await t.test('preferences round-trip, reject forged ownership, and filter old notifications before counting', async () => {
      const response = await request('/api/notifications/preferences'); assert.equal(response.status, 200);
      const preferences = await response.json(); assert.deepEqual(preferences, notificationPreferenceDefaults);
      for (const type of ['CLASS_UPDATED', 'PAYROLL_APPROVED', 'HOMEWORK_MARKED', 'HOMEWORK_REDO', 'APP_UPDATE']) await db.notification.create({ data: { userId: teacher.id, type, title: type, message: 'Test', sourceId: randomUUID() } });
      assert.equal((await request('/api/notifications/preferences', 'PUT', { ...preferences, classNotifications: false, resultNotifications: false })).status, 200);
      const feed = await (await request('/api/notifications')).json();
      assert.equal(feed.unreadCount, 3); assert.deepEqual(new Set(feed.notifications.map((n: any) => n.type)), new Set(['PAYROLL_APPROVED', 'HOMEWORK_REDO', 'APP_UPDATE']));
      assert.equal((await request('/api/notifications/preferences', 'PUT', { userId: other.id })).status, 400);
      assert.equal(await db.notificationPreference.findUnique({ where: { userId: other.id } }), null);
      const privateNotification = await db.notification.create({ data: { userId: other.id, type: 'APP_UPDATE', title: 'Private', message: 'Other', sourceId: randomUUID() } });
      assert.equal((await request(`/api/notifications/${privateNotification.id}/read`, 'PATCH')).status, 404);
    });
    await t.test('a disabled account cannot reuse an unexpired, unrevoked session', async () => {
      await db.user.update({ where: { id: teacher.id }, data: { isActive: false } });
      assert.equal((await request('/api/notifications/preferences')).status, 401);
      await db.user.update({ where: { id: teacher.id }, data: { isActive: true, role: 'GUARDIAN' } });
      assert.equal((await request('/api/notifications/preferences')).status, 401);
      await db.user.update({ where: { id: teacher.id }, data: { role: 'TEACHER' } });
    });
    await t.test('concurrent recovery requests consume a code exactly once in PostgreSQL', async () => {
      await db.user.update({ where: { id: teacher.id }, data: { mfaRecoveryCodeHashes: ['a', 'b'] } });
      const results = await Promise.all([1, 2].map(() => consumeRecoveryCode(db, teacher.id, ['a', 'b'], 0)));
      assert.equal(results.filter(Boolean).length, 1);
      assert.deepEqual((await db.user.findUniqueOrThrow({ where: { id: teacher.id } })).mfaRecoveryCodeHashes, ['b']);
    });
    await t.test('removed and unknown APIs return JSON 404 for GET and POST', async () => {
      for (const path of ['/api/ai/chat', '/api/no-such-audit-route']) for (const method of ['GET', 'POST']) {
        const response = await request(path, method); assert.equal(response.status, 404);
        assert.match(response.headers.get('content-type') || '', /application\/json/);
      }
    });
  } finally {
    await db.user.deleteMany({ where: { id: { in: ids } } }); await db.$disconnect();
  }
});
