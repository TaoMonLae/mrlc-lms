import assert from "node:assert/strict";
import test from "node:test";
import {
  WORD_TRAIL_LAST_POSITION,
  canUseWordTrail,
  resolveWordTrailMovement,
  wordTrailCorrectAnswerPoints,
} from "../../shared/wordTrail";

test("Word Trail is restricted to student and teacher accounts", () => {
  assert.equal(canUseWordTrail("STUDENT"), true);
  assert.equal(canUseWordTrail("TEACHER"), true);
  for (const role of ["ADMIN", "STAFF", "ACCOUNTANT", "CASE_WORKER", "LIBRARIAN"]) {
    assert.equal(canUseWordTrail(role), false);
  }
});

test("Word Trail applies boosts and slides without leaving the board", () => {
  assert.deepEqual(resolveWordTrailMovement(1, 4), {
    from: 1,
    rolledTo: 5,
    to: 7,
    effect: {
      kind: "BOOST",
      label: "Book Bridge",
      emoji: "📚",
      moveBy: 2,
      bonusPoints: 5,
    },
  });
  assert.equal(resolveWordTrailMovement(12, 3).to, 12);
});

test("Word Trail stops on the finish tile without applying another effect", () => {
  const result = resolveWordTrailMovement(22, 6);
  assert.equal(result.rolledTo, WORD_TRAIL_LAST_POSITION);
  assert.equal(result.to, WORD_TRAIL_LAST_POSITION);
  assert.equal(result.effect, null);
});

test("Word Trail scoring rewards rolls, streaks, special tiles, and wins", () => {
  const normal = wordTrailCorrectAnswerPoints({ roll: 4, streak: 2 });
  const bonus = wordTrailCorrectAnswerPoints({
    roll: 4,
    streak: 2,
    effect: { kind: "BONUS", label: "Word Star", emoji: "⭐", moveBy: 0, bonusPoints: 15 },
  });
  assert.equal(normal, 22);
  assert.equal(bonus, 37);
  assert.equal(wordTrailCorrectAnswerPoints({ roll: 6, streak: 99, won: true }), 82);
});
