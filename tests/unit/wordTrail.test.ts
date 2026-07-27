import assert from "node:assert/strict";
import test from "node:test";
import {
  WORD_TRAIL_LAST_POSITION,
  canUseWordTrail,
  describeWordTrailMovement,
  pickWordTrailQuestion,
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
  const normal = wordTrailCorrectAnswerPoints({ spacesMoved: 4, streak: 2 });
  const bonus = wordTrailCorrectAnswerPoints({
    spacesMoved: 4,
    streak: 2,
    effect: { kind: "BONUS", label: "Word Star", emoji: "⭐", moveBy: 0, bonusPoints: 15 },
  });
  assert.equal(normal, 22);
  assert.equal(bonus, 37);
  assert.equal(
    wordTrailCorrectAnswerPoints({ spacesMoved: 6, streak: 99, won: true }),
    82,
  );
  assert.equal(
    wordTrailCorrectAnswerPoints({ spacesMoved: 1, streak: 1, won: true }),
    64,
  );
  assert.equal(
    wordTrailCorrectAnswerPoints({ spacesMoved: Number.NaN, streak: Number.NaN }),
    10,
  );
});

test("Word Trail prefers unanswered questions and avoids the last answered card", () => {
  const deck = [
    { id: "a" },
    { id: "b" },
    { id: "c" },
    { id: "d" },
  ];
  assert.equal(pickWordTrailQuestion(deck, [], 0)?.id, "a");
  assert.equal(pickWordTrailQuestion(deck, ["a", "b"], 0)?.id, "c");
  // Once every card is answered, recycle but skip the most recent one when possible.
  const recycled = pickWordTrailQuestion(deck, ["a", "b", "c", "d"], 0);
  assert.ok(recycled);
  assert.notEqual(recycled.id, "d");
  const repeatedHistory = ["a", "b", "c", "d", "a", "b", "c", "d", "a"];
  assert.notEqual(
    pickWordTrailQuestion(deck, repeatedHistory, repeatedHistory.length)?.id,
    "a",
  );
  assert.equal(pickWordTrailQuestion([], [], 0), null);
});

test("Word Trail safely normalizes invalid movement values", () => {
  assert.deepEqual(resolveWordTrailMovement(Number.NaN, Number.POSITIVE_INFINITY), {
    from: 0,
    rolledTo: 1,
    to: 1,
    effect: null,
  });
});

test("Word Trail movement descriptions explain boosts and slides", () => {
  const boost = resolveWordTrailMovement(1, 4);
  assert.match(describeWordTrailMovement(boost), /boosted/i);
  assert.match(describeWordTrailMovement(boost), /space 8/i);

  const slide = resolveWordTrailMovement(5, 3);
  assert.match(describeWordTrailMovement(slide), /slid/i);

  const plain = resolveWordTrailMovement(0, 2);
  assert.match(describeWordTrailMovement(plain), /space 3/i);
});
