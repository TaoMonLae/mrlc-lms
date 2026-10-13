const assert = require('node:assert/strict');
const test = require('node:test');
const { createSessionWatcher } = require('../session-watcher.cjs');

test('watcher binds to the first student session and releases only on server status', async () => {
  const calls = [];
  let token = 'student-login-token-with-sufficient-length';
  let released = 0;
  let locked = 0;
  const watcher = createSessionWatcher({
    isLmsPage: () => true,
    readToken: async () => token,
    fetchCurrent: async (value) => { calls.push(value); return { id: 'session-a', watchToken: 'a'.repeat(64), status: 'ACTIVE' }; },
    fetchWatch: async (binding) => { calls.push(binding); return { status: calls.length < 3 ? 'ACTIVE' : 'RELEASED' }; },
    onRelease: () => { released++; },
    onLock: () => { locked++; },
  });
  await watcher.poll();
  assert.equal(locked, 1);
  token = 'another-student-token-with-sufficient-length';
  await watcher.poll();
  assert.equal(released, 0);
  await watcher.poll();
  assert.equal(released, 1);
  assert.equal(locked, 1);
  assert.deepEqual(watcher.getBinding(), { sessionId: 'session-a', token: 'a'.repeat(64) });
  assert.deepEqual(calls[1], { sessionId: 'session-a', token: 'a'.repeat(64) });
});

test('invalid session data never locks or releases the kiosk', async () => {
  let released = false;
  let locked = false;
  const watcher = createSessionWatcher({
    isLmsPage: () => true,
    readToken: async () => 'student-login-token-with-sufficient-length',
    fetchCurrent: async () => ({ id: 'session-a', watchToken: 'bad', status: 'RELEASED' }),
    fetchWatch: async () => { throw new Error('should not be called'); },
    onRelease: () => { released = true; },
    onLock: () => { locked = true; },
  });
  await watcher.poll();
  assert.equal(watcher.getBinding(), null);
  assert.equal(released, false);
  assert.equal(locked, false);
});

test('a completed session never enters kiosk mode', async () => {
  let locked = false;
  let released = false;
  const watcher = createSessionWatcher({
    isLmsPage: () => true,
    readToken: async () => 'student-login-token-with-sufficient-length',
    fetchCurrent: async () => ({ id: 'session-a', watchToken: 'a'.repeat(64), status: 'COMPLETED' }),
    fetchWatch: async () => { throw new Error('should not be called'); },
    onLock: () => { locked = true; },
    onRelease: () => { released = true; },
  });
  await watcher.poll();
  assert.equal(locked, false);
  assert.equal(released, true);
});

test('a visitor without a student focus session can leave before lock', async () => {
  let locked = false;
  const watcher = createSessionWatcher({
    isLmsPage: () => true,
    readToken: async () => null,
    fetchCurrent: async () => { throw new Error('should not be called'); },
    fetchWatch: async () => { throw new Error('should not be called'); },
    onLock: () => { locked = true; },
    onRelease: () => {},
  });
  await watcher.poll();
  assert.equal(locked, false);
  assert.equal(watcher.getBinding(), null);
});
