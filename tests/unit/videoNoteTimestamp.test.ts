import test from 'node:test';
import assert from 'node:assert/strict';
import { formatNoteTimestamp, parseNoteTimestamp } from '../../src/lib/video/noteTimestamp';

test('video note timestamps round-trip across short and long lessons', () => {
  for (const seconds of [0, 4, 72, 3599, 5797, 36612]) {
    assert.equal(parseNoteTimestamp(formatNoteTimestamp(seconds)), seconds);
  }
  assert.equal(formatNoteTimestamp(5797), '1:36:37');
});

test('video note timestamps reject ambiguous or invalid input', () => {
  for (const value of ['', '72', '1:60', '1:02:60', '-1:30', '1:2:3:4', '1:ab']) {
    assert.equal(parseNoteTimestamp(value), null);
  }
});
