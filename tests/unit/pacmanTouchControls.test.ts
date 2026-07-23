import assert from "node:assert/strict";
import test from "node:test";
import { pacmanDirectionForSwipe } from "../../src/pages/games/pacman/utils/touchControls";

test("Pac-Man maps horizontal and vertical swipes to movement", () => {
  assert.equal(pacmanDirectionForSwipe(60, 10), "RIGHT");
  assert.equal(pacmanDirectionForSwipe(-60, 10), "LEFT");
  assert.equal(pacmanDirectionForSwipe(5, -60), "UP");
  assert.equal(pacmanDirectionForSwipe(5, 60), "DOWN");
});

test("Pac-Man ignores taps and small accidental movement", () => {
  assert.equal(pacmanDirectionForSwipe(0, 0), null);
  assert.equal(pacmanDirectionForSwipe(12, 8), null);
});
