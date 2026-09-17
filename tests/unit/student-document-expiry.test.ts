import test from 'node:test';
import assert from 'node:assert/strict';
import { studentDocumentExpiryStatus } from '../../shared/studentDocumentExpiry';
test('private documents remain valid through their expiry day in school time', () => {
  const now = new Date('2026-09-15T16:01:00Z');
  assert.equal(studentDocumentExpiryStatus('2026-09-15', now), 'EXPIRED');
  assert.equal(studentDocumentExpiryStatus('2026-09-16', now), 'EXPIRING_SOON');
  assert.equal(studentDocumentExpiryStatus('2026-10-17', now), null);
  assert.equal(studentDocumentExpiryStatus('invalid', now), null);
  assert.equal(studentDocumentExpiryStatus(null, now), null);
});
