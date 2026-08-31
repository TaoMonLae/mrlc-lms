import assert from 'node:assert/strict';
import test from 'node:test';
import { canAutoShowReleaseUpdates, hasSeenRelease, markReleaseSeen, releaseStorageKey } from '../../src/lib/releaseUpdates';
import { CURRENT_RELEASE } from '../../src/data/releases';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

test('release acknowledgement is stored separately for each user', () => {
  const storage = memoryStorage();
  assert.equal(hasSeenRelease(storage, 'student-1', CURRENT_RELEASE.id), false);
  assert.equal(markReleaseSeen(storage, 'student-1', CURRENT_RELEASE.id), true);
  assert.equal(hasSeenRelease(storage, 'student-1', CURRENT_RELEASE.id), true);
  assert.equal(hasSeenRelease(storage, 'student-2', CURRENT_RELEASE.id), false);
  assert.equal(releaseStorageKey('student-1'), 'mrlc:release-seen:student-1');
});

test('the school portal release is unseen after the previous Language Quest release', () => {
  const storage = memoryStorage();
  markReleaseSeen(storage, 'teacher-1', '2026-08-31-language-quest-refresh');
  assert.equal(CURRENT_RELEASE.id, '2026-08-31-school-portal-refresh');
  assert.equal(hasSeenRelease(storage, 'teacher-1', CURRENT_RELEASE.id), false);
});

test('storage failures do not break the application shell', () => {
  const storage = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
  };
  assert.equal(hasSeenRelease(storage, 'admin-1', CURRENT_RELEASE.id), false);
  assert.equal(markReleaseSeen(storage, 'admin-1', CURRENT_RELEASE.id), false);
});

test('release updates never cover school login or other public entry routes', () => {
  assert.equal(canAutoShowReleaseUpdates('/login'), false);
  assert.equal(canAutoShowReleaseUpdates('/language-quest'), false);
  assert.equal(canAutoShowReleaseUpdates('/language-quest/about'), false);
  assert.equal(canAutoShowReleaseUpdates('/verify/document-token'), false);
  assert.equal(canAutoShowReleaseUpdates('/dashboard'), true);
  assert.equal(canAutoShowReleaseUpdates('/games/language-quest'), true);
});
