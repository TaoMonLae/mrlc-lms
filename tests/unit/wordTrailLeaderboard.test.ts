import assert from "node:assert/strict";
import test from "node:test";
import { leaderboardFor } from "../../wordTrail";

function winner(id: string, userId: string, score: number) {
  return {
    id,
    userId,
    score,
    correctCount: 10,
    wrongCount: 0,
    completedAt: new Date("2026-07-24T00:00:00.000Z"),
    user: {
      id: userId,
      firstName: userId,
      lastName: "Learner",
      role: "STUDENT",
      profilePhotoUrl: null,
    },
  };
}

test("Word Trail leaderboard pages past repeated wins from the same learner", async () => {
  const rows = [
    ...Array.from(
      { length: 100 },
      (_, index) => winner(`repeat-${index}`, "repeat", 1_000 - index),
    ),
    winner("second-best", "second", 899),
    winner("third-best", "third", 898),
  ];
  const calls: any[] = [];
  const prisma = {
    wordTrailGame: {
      findMany: async (query: any) => {
        calls.push(query);
        const start = query.cursor
          ? rows.findIndex((row) => row.id === query.cursor.id) + query.skip
          : 0;
        return rows.slice(start, start + query.take);
      },
    },
  };

  const leaderboard = await leaderboardFor(prisma);

  assert.equal(calls.length, 2);
  assert.deepEqual(
    leaderboard.map((entry) => entry.userId),
    ["repeat", "second", "third"],
  );
  assert.deepEqual(
    leaderboard.map((entry) => entry.rank),
    [1, 2, 3],
  );
});
