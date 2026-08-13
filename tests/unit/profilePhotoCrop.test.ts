import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateSquareCrop } from '../../src/lib/profilePhotoCrop';

test('profile crop starts with a centered square that fills the shorter image edge', () => {
  assert.deepEqual(calculateSquareCrop(1600, 900, 1, 0, 0), { x: 350, y: 0, size: 900 });
  assert.deepEqual(calculateSquareCrop(800, 1200, 1, 0, 0), { x: 0, y: 200, size: 800 });
});

test('profile crop zoom and position stay inside the source image', () => {
  assert.deepEqual(calculateSquareCrop(1200, 800, 2, -100, 100), { x: 0, y: 400, size: 400 });
  assert.deepEqual(calculateSquareCrop(1200, 800, 99, 999, -999), { x: 1200 - (800 / 3), y: 0, size: 800 / 3 });
});
