import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationService, syncTeacherAppUpdates } from '../../lib/notifications';
import { registerNotificationRoutes } from '../../notificationRoutes';
import { CURRENT_RELEASE } from '../../src/data/releases';
import { announcementAudienceWhere } from '../../lib/announcementAudience';

const defaults = { inAppEnabled: true, emailEnabled: true, homeworkReminders: true, resultNotifications: true, interventionReminders: true, payrollNotifications: true, classNotifications: true, appUpdates: true };
function setup() {
  const notifications: any[] = [], deliveries: any[] = [], emails: any[] = [];
  const preferences = new Map<string, any>();
  const users = [
    { id: 'a', email: 'A@example.org', firstName: 'Nai', lastName: 'Mon', role: 'TEACHER', isActive: true, isExternalLearner: false },
    { id: 'b', email: 'b@example.org', role: 'TEACHER', isActive: true, isExternalLearner: false },
    { id: 'c', email: 'c@example.org', role: 'TEACHER', isActive: false, isExternalLearner: false },
  ];
  const teachers = [{ id: 'ta', userId: 'a', classes: ['class-a'] }, { id: 'tb', userId: 'b', classes: ['class-b'] }, { id: 'tc', userId: 'c', classes: ['class-a'] }];
  const db: any = {
    user: {
      findUnique: async ({ where }: any) => users.find((u) => u.id === where.id),
      findMany: async ({ where }: any) => users.filter((u) => u.role === where.role && u.isActive && !u.isExternalLearner && !notifications.some((n) => n.userId === u.id && n.sourceId === where.notifications.none.sourceId)),
    },
    teacher: {
      findMany: async ({ where }: any) => teachers.filter((t) => users.find((u) => u.id === t.userId)?.isActive && (!where.id || (typeof where.id === 'string' ? t.id === where.id : where.id.in.includes(t.id))) && (!where.classes || t.classes.includes(where.classes.some.classId))),
      findUnique: async ({ where }: any) => ({ classes: teachers.find((t) => t.userId === where.userId)?.classes.map((classId) => ({ classId })) || [] }),
    },
    student: { findUnique: async () => ({ classId: 'class-a' }) },
    payslip: { findMany: async () => [{ id: 'slip-a', teacher: { userId: 'a' } }, { id: 'unlinked', teacher: { userId: null } }] },
    notificationPreference: { upsert: async ({ where, update }: any) => {
      const p = { ...defaults, ...preferences.get(where.userId), ...update }; preferences.set(where.userId, p); return p;
    } },
    notification: {
      upsert: async ({ where, create }: any) => {
        let row = notifications.find((n) => n.userId === where.userId_sourceId.userId && n.sourceId === where.userId_sourceId.sourceId);
        if (!row) { row = { id: `n${notifications.length}`, ...create, readAt: null }; notifications.push(row); } return row;
      },
      findMany: async ({ where, take }: any) => notifications.filter((n) => n.userId === where.userId).slice(0, take),
      count: async ({ where }: any) => notifications.filter((n) => n.userId === where.userId && !n.readAt).length,
      findFirst: async ({ where }: any) => notifications.find((n) => n.id === where.id && n.userId === where.userId),
      updateMany: async ({ where, data }: any) => {
        for (const n of notifications.filter((n) => n.userId === where.userId && (!where.id || n.id === where.id) && !n.readAt)) Object.assign(n, data);
      },
    },
    notificationDelivery: { upsert: async ({ create }: any) => {
      if (!deliveries.some((d) => d.notificationId === create.notificationId && d.channel === create.channel)) deliveries.push(create);
    } },
    emailOutbox: { upsert: async ({ create }: any) => {
      if (!emails.some((e) => e.dedupeKey === create.dedupeKey)) emails.push(create);
    } },
    $transaction: async (fn: any) => fn(db),
  };
  return { db, notifications, emails, deliveries, preferences, service: notificationService(db, 'https://school.example') };
}
const input = { userId: 'a', type: 'PAYROLL_APPROVED', title: 'Payslip ready', message: '<private> & ready', href: '/my-payroll', sourceId: 'payroll-a' };

test('repeated events queue one private email and one delivery per channel', async () => {
  const h = setup();
  await h.service.ensure(input); await h.service.ensure(input);
  assert.equal(h.notifications.length, 1); assert.equal(h.emails.length, 1); assert.equal(h.deliveries.length, 2);
  assert.equal(h.emails[0].toEmail, 'a@example.org');
  assert.match(h.emails[0].textBody, /Dear Nai Mon,/);
  assert.match(h.emails[0].textBody, /System Admin/);
  assert.match(h.emails[0].htmlBody, /&lt;private&gt; &amp; ready/);
  assert.match(h.emails[0].textBody, /https:\/\/school.example\/my-payroll/);
});

test('category opt-outs, channel opt-outs and inactive accounts are respected', async () => {
  const h = setup();
  h.preferences.set('a', { payrollNotifications: false });
  await h.service.ensure(input); assert.equal(h.notifications.length, 0);
  h.preferences.set('a', { emailEnabled: false });
  await h.service.ensure(input); assert.equal(h.notifications.length, 1); assert.equal(h.emails.length, 0);
  h.preferences.set('a', { inAppEnabled: false });
  await h.service.ensure({ ...input, sourceId: 'email-only' });
  assert.equal(h.emails.length, 1);
  await h.service.ensure({ ...input, userId: 'c' }); assert.equal(h.emails.length, 1);
});

test('email enabled after an in-app event adds exactly one tracked delivery', async () => {
  const h = setup(); h.preferences.set('a', { emailEnabled: false });
  await h.service.ensure(input);
  h.preferences.set('a', { emailEnabled: true });
  await h.service.ensure(input); await h.service.ensure(input);
  assert.equal(h.emails.length, 1); assert.equal(h.deliveries.length, 2);
});

test('draft payroll sends nothing; approved and paid payroll notify only linked owners', async () => {
  const h = setup();
  const run: any = { id: 'run', status: 'DRAFT', periodMonth: 10, periodYear: 2026, updatedAt: new Date() };
  await h.service.payroll(run); assert.equal(h.notifications.length, 0);
  await h.service.payroll({ ...run, status: 'APPROVED' });
  await h.service.payroll({ ...run, status: 'PAID' });
  assert.deepEqual(h.notifications.map((n) => n.userId), ['a', 'a']);
  assert.deepEqual(h.notifications.map((n) => n.type), ['PAYROLL_APPROVED', 'PAYROLL_PAID']);
  assert.ok(h.notifications.every((n) => n.href === '/my-payroll'));
});

test('class announcements reach assigned teachers; student-only, expired and archived announcements do not', async () => {
  const h = setup();
  const row: any = { id: 'ann', title: 'Class news', body: 'Details', classId: 'class-a', audience: 'CLASS', status: 'ACTIVE', updatedAt: new Date() };
  await h.service.announcement(row); assert.deepEqual(h.notifications.map((n) => n.userId), ['a']);
  for (const change of [{ audience: 'STUDENTS' }, { audience: 'CLASS', classId: null }, { status: 'ARCHIVED' }, { expiresAt: new Date(0) }]) await h.service.announcement({ ...row, ...change });
  assert.equal(h.notifications.length, 1);
  await h.service.announcement({ ...row, audience: 'TEACHERS', id: 'staff-news' });
  assert.deepEqual(h.notifications.map((n) => n.userId), ['a', 'a', 'b']);
});

test('schedule reassignments include former and new teachers exactly once', async () => {
  const h = setup();
  const entry: any = { id: 'slot', teacherId: 'tb', substituteTeacherId: 'ta', className: 'English', dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00', updatedAt: new Date() };
  await h.service.timetable(entry, 'updated', { ...entry, teacherId: 'ta' });
  assert.deepEqual(h.notifications.map((n) => n.userId), ['a', 'b']);
  assert.ok(h.notifications.every((n) => n.href === '/teacher/timetable'));
});

test('release sweep reaches active teachers without bell requests and does not repeat mail', async () => {
  const h = setup();
  await syncTeacherAppUpdates(h.db, 'https://school.example'); await syncTeacherAppUpdates(h.db, 'https://school.example');
  assert.deepEqual(h.notifications.map((n) => n.userId), ['a', 'b']);
  assert.equal(h.emails.length, 2); assert.ok(h.notifications.every((n) => n.href === '/updates'));
  assert.ok(h.emails[0].textBody.includes(CURRENT_RELEASE.highlights[0].description));
});

function routes(h = setup()) {
  const handlers = new Map<string, any[]>();
  const app = Object.fromEntries(['get', 'post', 'put', 'patch'].map((method) => [method, (path: string, ...fns: any[]) => handlers.set(`${method} ${path}`, fns)]));
  registerNotificationRoutes({ app: app as any, prisma: h.db, authMiddleware: (_req, _res, next) => next(), sync: async () => {}, logger: { error() {} } });
  return { ...h, async request(method: string, path: string, userId = 'a', body: any = {}, id = 'n0') {
    const result: any = { status: 200 };
    const res = { status(code: number) { result.status = code; return this; }, json(data: any) { result.body = data; } };
    const fns = handlers.get(`${method} ${path}`)!;
    await fns[fns.length - 1]({ user: { userId, role: 'TEACHER' }, params: { id }, body }, res, () => {});
    return result;
  } };
}

test('notification read API enforces ownership and preserves the original read time', async () => {
  const h = routes(); await h.service.ensure(input);
  assert.equal((await h.request('patch', '/api/notifications/:id/read', 'b')).status, 404);
  assert.equal(h.notifications[0].readAt, null);
  assert.equal((await h.request('patch', '/api/notifications/:id/read')).status, 200);
  const firstRead = h.notifications[0].readAt;
  await h.request('patch', '/api/notifications/:id/read'); assert.equal(h.notifications[0].readAt, firstRead);
});

test('read-all is user scoped and unread totals include rows beyond the first 50', async () => {
  const h = routes();
  for (let n = 0; n < 55; n++) await h.service.ensure({ ...input, sourceId: `event-${n}` });
  await h.service.ensure({ ...input, userId: 'b' });
  const result = await h.request('get', '/api/notifications');
  assert.equal(result.body.notifications.length, 50); assert.equal(result.body.unreadCount, 55);
  await h.request('post', '/api/notifications/read-all');
  assert.equal((await h.request('get', '/api/notifications', 'b')).body.unreadCount, 1);
});

test('preferences reject unknown fields and non-booleans; database errors return JSON', async () => {
  const h = routes();
  assert.equal((await h.request('put', '/api/notifications/preferences', 'a', { emailEnabled: 'true' })).status, 400);
  assert.equal((await h.request('put', '/api/notifications/preferences', 'a', { userId: 'b' })).status, 400);
  assert.equal((await h.request('put', '/api/notifications/preferences', 'a', { appUpdates: false })).body.appUpdates, false);
  h.db.notification.updateMany = async () => { throw { code: 'P2021' }; };
  assert.equal((await h.request('post', '/api/notifications/read-all')).status, 503);
});

test('announcement reads use the same class audience boundary as notification recipients', async () => {
  const h = setup();
  const teacherWhere = await announcementAudienceWhere(h.db, { userId: 'a', role: 'TEACHER' });
  assert.deepEqual((teacherWhere.OR![1].AND as any[])[2].OR[1], { audience: 'CLASS', classId: { in: ['class-a'] } });
  const studentWhere = await announcementAudienceWhere(h.db, { userId: 'student', role: 'STUDENT' });
  assert.deepEqual((studentWhere.AND as any[])[2].OR[0], { audience: { in: ['ALL', 'STUDENTS'] } });
  assert.deepEqual(await announcementAudienceWhere(h.db, { userId: 'admin', role: 'ADMIN' }), {});
});

test('preference responses round-trip through the strict API without leaking database metadata', async () => {
  const h = routes(); h.preferences.set('a', { id: 'pref-row', userId: 'a', createdAt: new Date(), emailEnabled: false });
  const loaded = await h.request('get', '/api/notifications/preferences');
  assert.equal(Object.keys(loaded.body).length, 8);
  assert.equal(loaded.body.id, undefined);
  const saved = await h.request('put', '/api/notifications/preferences', 'a', { ...loaded.body, emailEnabled: true });
  assert.equal(saved.status, 200); assert.equal(saved.body.emailEnabled, true);
  assert.equal(h.preferences.get('b'), undefined);
});

test('preference loading does not require notification synchronization', async () => {
  const h = routes();
  h.db.notification.findMany = async () => { throw new Error('feed unavailable'); };
  assert.equal((await h.request('get', '/api/notifications/preferences')).status, 200);
  assert.equal((await h.request('get', '/api/notifications')).status, 500);
});

test('homework redo reminders follow the reminder setting independently of result notifications', async () => {
  const h = setup(); h.preferences.set('a', { homeworkReminders: true, resultNotifications: false });
  await h.service.ensure({ ...input, type: 'HOMEWORK_REDO' });
  assert.equal(h.notifications.length, 1);
  h.preferences.set('a', { homeworkReminders: false, resultNotifications: true });
  await h.service.ensure({ ...input, type: 'HOMEWORK_REDO', sourceId: 'redo2' });
  assert.equal(h.notifications.length, 1);
});
