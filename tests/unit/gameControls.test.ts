import assert from "node:assert/strict";
import test from "node:test";
import {
  gameDayKey,
  policyAllowsTime,
  resolveGameAccess,
  type GameControlPolicyLike,
} from "../../shared/gameControls";

function policy(overrides: Partial<GameControlPolicyLike> = {}): GameControlPolicyLike {
  return {
    enabled: true,
    blocked: false,
    gameKey: "ALL",
    dailyLimitMinutes: null,
    sessionLimitMinutes: null,
    cooldownMinutes: 0,
    allowedDays: [],
    allowedStartMinute: null,
    allowedEndMinute: null,
    ...overrides,
  };
}

test("a block always overrides timers and schedules", () => {
  const access = resolveGameAccess({
    gameKey: "PACMAN",
    policies: [
      policy({ gameKey: "PACMAN", blocked: true }),
      policy({ dailyLimitMinutes: 60 }),
    ],
  });
  assert.equal(access.allowed, false);
  assert.equal(access.code, "BLOCKED");
});

test("the most restrictive applicable daily and session allowance wins", () => {
  const access = resolveGameAccess({
    gameKey: "SNAKE",
    policies: [
      policy({ dailyLimitMinutes: 30, sessionLimitMinutes: 20 }),
      policy({ gameKey: "SNAKE", dailyLimitMinutes: 15, sessionLimitMinutes: 10 }),
    ],
    dailyUsedSeconds: 5 * 60,
    dailyUsedSecondsForAllGames: 12 * 60,
    sessionUsedSeconds: 4 * 60,
  });
  assert.equal(access.allowed, true);
  assert.equal(access.remainingDailySeconds, 10 * 60);
  assert.equal(access.remainingSessionSeconds, 6 * 60);
  assert.equal(access.remainingSeconds, 6 * 60);
});

test("an all-games daily limit counts time used in other games", () => {
  const access = resolveGameAccess({
    gameKey: "PACMAN",
    policies: [policy({ dailyLimitMinutes: 20 })],
    dailyUsedSeconds: 2 * 60,
    dailyUsedSecondsForAllGames: 20 * 60,
  });
  assert.equal(access.allowed, false);
  assert.equal(access.code, "DAILY_LIMIT");
});

test("weekday schedules use the school timezone", () => {
  const mondayOnly = policy({
    allowedDays: [1],
    allowedStartMinute: 15 * 60,
    allowedEndMinute: 18 * 60,
  });
  const mondayAtFourPmBangkok = new Date("2026-07-27T09:00:00.000Z");
  assert.equal(policyAllowsTime(mondayOnly, mondayAtFourPmBangkok, "Asia/Bangkok"), true);
  assert.equal(gameDayKey(mondayAtFourPmBangkok, "Asia/Bangkok"), "2026-07-27");
});

test("overnight schedules include the after-midnight portion of the previous day", () => {
  const fridayNight = policy({
    allowedDays: [5],
    allowedStartMinute: 20 * 60,
    allowedEndMinute: 60,
  });
  const saturdayHalfPastMidnightUtc = new Date("2026-07-25T00:30:00.000Z");
  assert.equal(policyAllowsTime(fridayNight, saturdayHalfPastMidnightUtc, "UTC"), true);
});

test("cooldowns block a new session until the break is complete", () => {
  const now = new Date("2026-07-23T12:00:00.000Z");
  const access = resolveGameAccess({
    gameKey: "CHESS",
    policies: [policy({ gameKey: "CHESS", cooldownMinutes: 10 })],
    now,
    lastSessionEndedAt: new Date("2026-07-23T11:55:00.000Z"),
  });
  assert.equal(access.allowed, false);
  assert.equal(access.code, "COOLDOWN");
  assert.equal(access.nextAllowedAt, "2026-07-23T12:05:00.000Z");
});

test("an all-games cooldown cannot be evaded by switching games", () => {
  const access = resolveGameAccess({
    gameKey: "SUDOKU",
    policies: [policy({ cooldownMinutes: 15 })],
    now: new Date("2026-07-23T12:00:00.000Z"),
    lastSessionEndedAtForAllGames: new Date("2026-07-23T11:50:00.000Z"),
  });
  assert.equal(access.allowed, false);
  assert.equal(access.code, "COOLDOWN");
});
