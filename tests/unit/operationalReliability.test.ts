import test from 'node:test';
import assert from 'node:assert/strict';
import { asyncHandler } from '../../lib/asyncHandler';
import { accountStillMatchesToken, consumeRecoveryCode } from '../../lib/sessionAccess';
import { deliverOutboxMessage } from '../../lib/emailDelivery';
import { notificationPreferenceDefaults } from '../../shared/notificationPreferences';

test('Express handlers forward rejected promises and synchronous errors once', async () => {
  for (const handler of [async () => { throw new Error('database unavailable'); }, () => { throw new Error('invalid state'); }]) {
    const errors: unknown[] = [];
    await asyncHandler(handler)({} as any, {} as any, error => { errors.push(error); });
    assert.equal(errors.length, 1); assert.ok(errors[0] instanceof Error);
  }
  let forwarded = false;
  await asyncHandler(async (_req, res) => { res.json({ ok: true }); })({} as any, { json() {} } as any, () => { forwarded = true; });
  assert.equal(forwarded, false);
});

test('live-session checks reject disabled, deleted, reassigned, and converted accounts', async () => {
  let account: any = { isActive: true, role: 'TEACHER', isExternalLearner: false };
  const db: any = { user: { findUnique: async () => account } };
  const token = { userId: 'teacher', role: 'TEACHER' };
  assert.equal(await accountStillMatchesToken(db, token), true);
  for (const changed of [null, { ...account, isActive: false }, { ...account, role: 'GUARDIAN' }, { ...account, isExternalLearner: true }]) {
    account = changed; assert.equal(await accountStillMatchesToken(db, token), false);
  }
});

test('a recovery code can be consumed by only one concurrent request', async () => {
  let hashes = ['one', 'two'];
  const db: any = { user: { updateMany: async ({ where, data }: any) => {
    if (JSON.stringify(hashes) !== JSON.stringify(where.mfaRecoveryCodeHashes.equals)) return { count: 0 };
    hashes = data.mfaRecoveryCodeHashes; return { count: 1 };
  } } };
  assert.deepEqual(await Promise.all([consumeRecoveryCode(db, 'user', ['one', 'two'], 0), consumeRecoveryCode(db, 'user', ['one', 'two'], 0)]), [true, false]);
  assert.deepEqual(hashes, ['two']);
});

function mailFixture() {
  const message: any = { id: 'outbox1', userId: 'teacher', dedupeKey: 'notification:n1', toEmail: 'teacher@example.test', subject: 'Payslip', textBody: 'Private content', attempts: 0, status: 'QUEUED' };
  let preference = { ...notificationPreferenceDefaults, emailEnabled: true };
  const sent: any[] = [], deliveries: any[] = [], errors: any[] = [];
  const db: any = {
    emailOutbox: {
      updateMany: async ({ where, data }: any) => { if (message.status !== where.status) return { count: 0 }; Object.assign(message, data); return { count: 1 }; },
      update: async ({ data }: any) => { Object.assign(message, data); return message; },
    },
    notification: { findUnique: async () => ({ id: 'n1', type: 'PAYROLL_APPROVED', userId: 'teacher', user: { isActive: true, isExternalLearner: false } }) },
    notificationPreference: { findUnique: async () => preference },
    notificationDelivery: { updateMany: async ({ data }: any) => { deliveries.push(data); } },
  };
  const transport = { sendMail: async (mail: any) => { sent.push(mail); } };
  const send = () => deliverOutboxMessage(db, transport, { ...message }, 'school@example.test', { error: (...args) => { errors.push(args); } });
  return { db, message, sent, errors, transport, send, preference, deliveries };
}

test('a failed delivery receipt update never requeues already accepted email', async () => {
  const h = mailFixture();
  h.db.notificationDelivery.updateMany = async () => { throw new Error('write failed'); };
  await h.send(); await h.send();
  assert.equal(h.sent.length, 1); assert.equal(h.message.status, 'SENT');
  assert.equal(h.message.textBody, null); assert.equal(h.errors.length, 1);
});

test('queued notifications respect opt-outs made after queueing; account mail still delivers', async () => {
  for (const field of ['emailEnabled', 'payrollNotifications'] as const) {
    const h = mailFixture(); h.preference[field] = false;
    await h.send(); assert.equal(h.sent.length, 0); assert.equal(h.message.status, 'CANCELLED'); assert.equal(h.message.textBody, null);
  }
  const reset = mailFixture(); reset.message.dedupeKey = 'password-reset:token'; reset.preference.emailEnabled = false;
  await reset.send(); assert.equal(reset.sent.length, 1); assert.equal(reset.message.status, 'SENT');
});

test('SMTP failures retry with backoff and eventually stop', async () => {
  const h = mailFixture(); h.transport.sendMail = async () => { throw new Error('SMTP offline'); };
  await h.send(); assert.equal(h.message.status, 'QUEUED'); assert.equal(h.message.attempts, 1);
  assert.ok(h.message.nextAttemptAt > new Date()); assert.equal(h.message.textBody, 'Private content');
  h.message.attempts = 4; await h.send(); assert.equal(h.message.status, 'FAILED');
});

test('an unavailable preference check retries later without sending or stranding the claim', async () => {
  const h = mailFixture();
  h.db.notificationPreference.findUnique = async () => { throw new Error('database interrupted'); };
  await assert.rejects(h.send(), /database interrupted/);
  assert.equal(h.sent.length, 0); assert.equal(h.message.status, 'QUEUED');
  assert.ok(h.message.nextAttemptAt > new Date());
});
