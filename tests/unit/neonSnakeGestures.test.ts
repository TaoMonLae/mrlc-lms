import assert from "node:assert/strict";
import test from "node:test";
import { neonSnakeControlForSwipe } from "../../src/pages/games/snake/neon/gestures";

test("Neon Snake maps horizontal swipes to steering controls", () => {
  assert.equal(neonSnakeControlForSwipe(-60, 8), "left");
  assert.equal(neonSnakeControlForSwipe(60, -8), "right");
});

test("Neon Snake maps upward swipes to boost and ignores downward swipes", () => {
  assert.equal(neonSnakeControlForSwipe(4, -60), "boost");
  assert.equal(neonSnakeControlForSwipe(4, 60), null);
});

test("Neon Snake ignores accidental taps and tiny movements", () => {
  assert.equal(neonSnakeControlForSwipe(12, -20), null);
  assert.equal(neonSnakeControlForSwipe(27, 0), null);
});
