const assert = require('node:assert/strict');
const test = require('node:test');
const { createSessionWatcher } = require('../session-watcher.cjs');

test('watcher binds to the first student session and releases only on server status', async () => {
  const calls = [];
  let token = 'student-login-token-with-sufficient-length';
  let released = 0;
  const watcher = createSessionWatcher({
    isLmsPage: () => true,
    readToken: async () => token,
    fetchCurrent: async (value) => { calls.push(value); return { id: 'session-a', watchToken: 'a'.repeat(64), status: 'ACTIVE' }; },
    fetchWatch: async (binding) => { calls.push(binding); return { status: calls.length < 3 ? 'ACTIVE' : 'RELEASED' }; },
    onRelease: () => { released++; },
  });
  await watcher.poll();
  token = 'another-student-token-with-sufficient-length';
  await watcher.poll();
  assert.equal(released, 0);
  await watcher.poll();
  assert.equal(released, 1);
  assert.deepEqual(watcher.getBinding(), { sessionId: 'session-a', token: 'a'.repeat(64) });
  assert.deepEqual(calls[1], { sessionId: 'session-a', token: 'a'.repeat(64) });
});

test('invalid session data never releases the kiosk', async () => {
  let released = false;
  const watcher = createSessionWatcher({
    isLmsPage: () => true,
    readToken: async () => 'student-login-token-with-sufficient-length',
    fetchCurrent: async () => ({ id: 'session-a', watchToken: 'bad', status: 'RELEASED' }),
    fetchWatch: async () => { throw new Error('should not be called'); },
    onRelease: () => { released = true; },
  });
  await watcher.poll();
  assert.equal(watcher.getBinding(), null);
  assert.equal(released, false);
});
