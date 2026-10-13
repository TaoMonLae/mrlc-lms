import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { registerFocusRoutes } from '../../focusRoutes';

test('focus time survives a second login and only assigned staff can change or release it', async () => {
  const sessions = new Map<string, any>();
  const events: any[] = [];
  const db: any = {
    focusSession: {
      findUnique: async ({ where }: any) => where.authSessionId
        ? [...sessions.values()].find((row) => row.authSessionId === where.authSessionId) || null
        : sessions.get(where.id) || null,
      findFirst: async ({ where }: any) => [...sessions.values()].find((row) => row.studentUserId === where.studentUserId && !row.releasedAt && row.endsAt > where.endsAt.gt) || null,
      create: async ({ data }: any) => { const row = { id: `focus-${sessions.size + 1}`, releasedAt: null, releaseRequestedAt: null, isFocused: true, isFullscreen: false, presentationMode: 'BROWSER', ...data }; sessions.set(row.id, row); return row; },
      update: async ({ where, data }: any) => Object.assign(sessions.get(where.id), data),
    },
    focusEvent: { create: async ({ data }: any) => { events.push(data); }, createMany: async ({ data }: any) => { events.push(...data); } },
    student: { findUnique: async () => ({ classId: 'class-a', user: { firstName: 'A', lastName: 'Student' }, class: { teachers: [] } }) },
    classTeacher: { findFirst: async ({ where }: any) => where.teacher.userId === 'assigned-teacher' ? { classId: 'class-a' } : null },
    user: { findMany: async () => [] },
    notification: { createMany: async () => {} },
  };
  const app = express();
  app.use(express.json());
  registerFocusRoutes(app, db, (_req, _res, next) => next(), 'test-watch-secret');
  async function send(path: string, method: string, user: string, body?: unknown, id?: string) {
    const route = (app as any)._router.stack.find((layer: any) => layer.route?.path === path && layer.route.methods[method.toLowerCase()])?.route;
    assert.ok(route, `route ${method} ${path} exists`);
    const [role, userId, sessionId] = user.split(':');
    const req: any = { body, params: id ? { id } : {}, user: { role, userId, sessionId, externalLearner: false } };
    const res: any = { statusCode: 200, data: undefined, status(code: number) { this.statusCode = code; return this; }, json(value: unknown) { this.data = value; return this; } };
    for (const layer of route.stack) {
      if (res.data !== undefined) break;
      await layer.handle(req, res, (error?: Error) => { if (error) throw error; });
    }
    return res;
  }
  const first = (await send('/api/focus/session', 'POST', 'STUDENT:student:login-1')).data;
  const second = (await send('/api/focus/session', 'POST', 'STUDENT:student:login-2')).data;
    assert.equal(second.id, first.id);
    assert.equal(second.endsAt, first.endsAt);
    assert.equal(sessions.size, 1);
    const invalidWatch = await send('/api/focus/watch', 'POST', '', { sessionId: first.id, token: '0'.repeat(64) });
    assert.equal(invalidWatch.statusCode, 403);

    const webApp = await send('/api/focus/heartbeat', 'POST', 'STUDENT:student:login-2', { focused: true, fullscreen: false, presentationMode: 'WEB_APP' });
    assert.equal(webApp.data.presentationMode, 'WEB_APP');
    assert.equal(webApp.data.isFullscreen, false);
    assert.equal(events.length, 0);
    const fullScreen = await send('/api/focus/heartbeat', 'POST', 'STUDENT:student:login-2', { focused: true, fullscreen: true, presentationMode: 'FULLSCREEN' });
    assert.equal(fullScreen.data.presentationMode, 'FULLSCREEN');
    assert.ok(events.some((event) => event.type === 'FULLSCREEN_ENTERED'));

    const forbidden = await send('/api/focus/sessions/:id/time', 'PATCH', 'TEACHER:other-teacher:staff-1', { minutesRemaining: 90 }, first.id);
    assert.equal(forbidden.statusCode, 403);
    const changed = await send('/api/focus/sessions/:id/time', 'PATCH', 'TEACHER:assigned-teacher:staff-2', { minutesRemaining: 90 }, first.id);
    assert.equal(changed.statusCode, 200);
    const requested = await send('/api/focus/release-request', 'POST', 'STUDENT:student:login-2');
    assert.equal(requested.statusCode, 200);
    const selfRelease = await send('/api/focus/sessions/:id/release', 'POST', 'STUDENT:student:login-2', undefined, first.id);
    assert.equal(selfRelease.statusCode, 403);
    const approved = await send('/api/focus/sessions/:id/release', 'POST', 'TEACHER:assigned-teacher:staff-2', undefined, first.id);
    assert.equal(approved.statusCode, 200);
    assert.equal(approved.data.status, 'RELEASED');
    const watched = await send('/api/focus/watch', 'POST', '', { sessionId: first.id, token: first.watchToken });
    assert.equal(watched.data.status, 'RELEASED');
    assert.ok(events.some((event) => event.type === 'RELEASE_REQUESTED'));
});
