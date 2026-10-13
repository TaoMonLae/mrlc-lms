const assert = require('node:assert/strict');
const test = require('node:test');
const { parseLmsUrl, isLmsUrl, isBlockedShortcut, isReleasedStatus } = require('../policy.cjs');

test('kiosk accepts only the configured HTTPS LMS origin', () => {
  const origin = parseLmsUrl('https://gedmrlc.monrefugeelc.com');
  assert.equal(isLmsUrl(`${origin}/student/dashboard`, origin), true);
  assert.equal(isLmsUrl('https://gedmrlc.monrefugeelc.com.evil.example/', origin), false);
  assert.equal(isLmsUrl('javascript:alert(1)', origin), false);
  assert.equal(isLmsUrl('https://other.example/', origin), false);
  assert.throws(() => parseLmsUrl('http://gedmrlc.monrefugeelc.com'));
  assert.throws(() => parseLmsUrl('https://gedmrlc.monrefugeelc.com@evil.example'));
  assert.throws(() => parseLmsUrl('https://gedmrlc.monrefugeelc.com/student'));
  assert.equal(parseLmsUrl('http://localhost:8000', true), 'http://localhost:8000');
  assert.equal(isLmsUrl('http://localhost:8000/student/dashboard', 'http://localhost:8000'), true);
});

test('kiosk blocks exit and browser shortcuts without blocking ordinary study keys', () => {
  assert.equal(isBlockedShortcut({ type: 'keyDown', key: 'F12' }), true);
  assert.equal(isBlockedShortcut({ type: 'keyDown', key: 'w', control: true }), true);
  assert.equal(isBlockedShortcut({ type: 'keyDown', key: 'q', meta: true }), true);
  assert.equal(isBlockedShortcut({ type: 'keyDown', key: 'F4', alt: true }), true);
  assert.equal(isBlockedShortcut({ type: 'keyDown', key: 'c', control: true }), false);
  assert.equal(isBlockedShortcut({ type: 'keyDown', key: 'r', control: true }), false);
  assert.equal(isBlockedShortcut({ type: 'keyDown', key: 'Tab' }), false);
  assert.equal(isBlockedShortcut({ type: 'keyDown', key: 'Escape' }), false);
});

test('only server terminal session states release the desktop kiosk', () => {
  assert.equal(isReleasedStatus('ACTIVE'), false);
  assert.equal(isReleasedStatus('RELEASED'), true);
  assert.equal(isReleasedStatus('COMPLETED'), true);
  assert.equal(isReleasedStatus('release_requested'), false);
});
