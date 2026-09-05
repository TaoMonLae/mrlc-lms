import assert from 'node:assert/strict';
import test from 'node:test';
import { cursorEffectForSchoolSave, isCursorEffect, resolveCursorEffect } from '../../src/lib/cursorEffects';

test('personal cursor preferences override the school default, including None', () => {
  assert.equal(resolveCursorEffect('CLICK_SPARK', 'RAINBOW_TRAIL'), 'CLICK_SPARK');
  assert.equal(resolveCursorEffect('NONE', 'RAINBOW_TRAIL'), 'NONE');
});

test('invalid or missing cursor values fall back safely', () => {
  assert.equal(resolveCursorEffect(null, 'RIBBONS'), 'RIBBONS');
  assert.equal(resolveCursorEffect('BROKEN', 'TARGET_CURSOR'), 'TARGET_CURSOR');
  assert.equal(resolveCursorEffect(undefined, 'BROKEN'), 'CLICK_SPARK');
  assert.equal(isCursorEffect('SPLASH_CURSOR'), true);
  assert.equal(isCursorEffect('SCHOOL_DEFAULT'), false);
});

test('a changed school cursor is sent while unrelated settings saves leave personal overrides alone', () => {
  assert.equal(cursorEffectForSchoolSave('GHOST_CURSOR', true), 'GHOST_CURSOR');
  assert.equal(cursorEffectForSchoolSave('GHOST_CURSOR', false), undefined);
  assert.equal(cursorEffectForSchoolSave('BROKEN', true), undefined);

  // Once the saving admin's stale Click Spark override is cleared, navigation
  // resolves to the school cursor that was just saved.
  assert.equal(resolveCursorEffect(null, 'GHOST_CURSOR'), 'GHOST_CURSOR');
});
