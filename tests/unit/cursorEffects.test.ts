import assert from 'node:assert/strict';
import test from 'node:test';
import { isCursorEffect, resolveCursorEffect } from '../../src/lib/cursorEffects';

test('personal cursor preferences override the school default, including None', () => {
  assert.equal(resolveCursorEffect('CLICK_SPARK', 'RAINBOW_TRAIL'), 'CLICK_SPARK');
  assert.equal(resolveCursorEffect('NONE', 'RAINBOW_TRAIL'), 'NONE');
});

test('invalid or missing cursor values fall back safely', () => {
  assert.equal(resolveCursorEffect(null, 'RIBBONS'), 'RIBBONS');
  assert.equal(resolveCursorEffect('BROKEN', 'TARGET_CURSOR'), 'TARGET_CURSOR');
  assert.equal(resolveCursorEffect(undefined, 'BROKEN'), 'RAINBOW_TRAIL');
  assert.equal(isCursorEffect('SPLASH_CURSOR'), true);
  assert.equal(isCursorEffect('SCHOOL_DEFAULT'), false);
});
