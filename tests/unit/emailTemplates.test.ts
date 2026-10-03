import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import { buildNotificationEmail, buildPasswordResetEmail, schoolEmailLink, SYSTEM_ADMIN_NAME } from '../../lib/emailTemplates';
import { systemAdminSender } from '../../lib/emailSender';
import { CURRENT_RELEASE } from '../../src/data/releases';

const base = { title: 'School update', message: 'Your account has an update.', recipientName: 'Nai Mon', appUrl: 'https://school.example', href: '/profile' };

test('each notification category includes its own context, next steps and System Admin signature in both formats', () => {
  const expected: Record<string, string> = {
    PAYROLL_APPROVED: 'Approval does not confirm', PAYROLL_PAID: 'marked your payroll payment as paid',
    CLASS_ASSIGNMENT: 'class assignment has changed', CLASS_UPDATED: 'class associated with your account',
    CLASS_SCHEDULE: 'previous and current teacher', CLASS_ANNOUNCEMENT: 'notice to its author',
    HOMEWORK_DUE: 'approaching its due date', HOMEWORK_REDO: 'requested revisions', HOMEWORK_MARKED: 'marks and teacher feedback',
    EXAM_RESULT: 'result has been released', INTERVENTION_ASSIGNED: 'student-support action has been assigned',
    INTERVENTION_DUE: 'requires follow-up', VIDEO_LESSON: 'does not automatically complete', APP_UPDATE: 'familiarise yourself with the changes',
  };
  for (const [type, text] of Object.entries(expected)) {
    const email = buildNotificationEmail({ ...base, type });
    for (const body of [email.textBody, email.htmlBody]) {
      assert.ok(body.includes(text), type); assert.ok(body.includes('Dear Nai Mon,'), type);
      assert.ok(body.includes('System Admin'), type); assert.ok(body.includes('Mon Refugee Learning Centre'), type);
      assert.ok(body.includes('https://school.example/notifications/settings'), type);
      assert.ok(body.includes('https://school.example/profile'), type);
    }
  }
  assert.match(buildNotificationEmail({ ...base, type: 'NEW_CATEGORY' }).textBody, /update relating to your MRLC LMS account/);
});

test('app-update emails include the full release highlights without replacing historical release content', () => {
  const email = buildNotificationEmail({ ...base, type: 'APP_UPDATE', release: CURRENT_RELEASE });
  for (const body of [email.textBody, email.htmlBody]) {
    assert.ok(body.includes(CURRENT_RELEASE.version));
    for (const highlight of CURRENT_RELEASE.highlights) {
      assert.ok(body.includes(highlight.title)); assert.ok(body.includes(highlight.description));
      for (const detail of highlight.details) assert.ok(body.includes(detail));
    }
  }
  assert.ok(!buildNotificationEmail({ ...base, type: 'APP_UPDATE' }).textBody.includes(CURRENT_RELEASE.version));
});

test('dynamic content is escaped, paragraph breaks survive, and actions cannot redirect away from the school', () => {
  const email = buildNotificationEmail({ ...base, type: 'CLASS_ANNOUNCEMENT',
    title: 'Notice\r\nBcc: injected@example.test', recipientName: '<img src=x onerror=alert(1)>',
    message: '<script>alert(1)</script>\nLine two & details', href: '//outside.example/phish',
  });
  assert.ok(!/[\r\n]/.test(email.subject));
  assert.ok(!email.htmlBody.includes('<script>')); assert.ok(!email.htmlBody.includes('<img'));
  assert.match(email.htmlBody, /&lt;script&gt;alert\(1\)&lt;\/script&gt;<br \/>Line two &amp; details/);
  assert.ok(!email.htmlBody.includes('outside.example'));
  for (const path of ['//outside.example', '/\\outside.example', 'javascript:alert(1)', 'https://outside.example']) {
    assert.equal(schoolEmailLink(base.appUrl, path), 'https://school.example/');
  }
  assert.throws(() => schoolEmailLink('javascript:alert(1)'), /HTTP/);
});

test('password recovery preserves the encoded token, expiry and single-use instructions without preference links', () => {
  const email = buildPasswordResetEmail({ recipientName: 'Nai & Mon', appUrl: base.appUrl, token: 'token/&?+' });
  for (const body of [email.textBody, email.htmlBody]) {
    assert.ok(body.includes('30 minutes')); assert.ok(body.includes('used only once'));
    assert.ok(body.includes('did not request')); assert.ok(body.includes('do not forward'));
    assert.ok(body.includes('/reset-password?token=token%2F%26%3F%2B'));
    assert.ok(!body.includes('/notifications/settings'));
  }
  assert.ok(email.htmlBody.includes('Dear Nai &amp; Mon,'));
});

test('System Admin sender preserves the configured mailbox and MIME contains HTML and plain text', async () => {
  for (const configured of ['school@example.test', 'MRLC LMS <school@example.test>', '"School, Office" <school@example.test>']) {
    assert.deepEqual(systemAdminSender(configured), { name: SYSTEM_ADMIN_NAME, address: 'school@example.test' });
  }
  for (const configured of ['a@example.test,b@example.test', 'bad', 'School\r\nBcc: other@example.test']) assert.throws(() => systemAdminSender(configured));
  const template = buildNotificationEmail({ ...base, type: 'PAYROLL_APPROVED' });
  const mail = await nodemailer.createTransport({ streamTransport: true, buffer: true }).sendMail({
    from: systemAdminSender('School <school@example.test>'), to: 'teacher@example.test',
    subject: template.subject, text: template.textBody, html: template.htmlBody,
  });
  const mime = mail.message.toString();
  assert.match(mime, /From: "?System Admin \| MRLC LMS"? <school@example.test>/);
  assert.match(mime, /multipart\/alternative/); assert.match(mime, /text\/plain/); assert.match(mime, /text\/html/);
});
