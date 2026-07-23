import assert from "node:assert/strict";
import test from "node:test";
import {
  NEON_SNAKE_BOT_ID,
  NEON_SNAKE_BOT_LENGTH,
  createNeonSnakeBot,
  shouldUseNeonSnakeBot,
  stepNeonSnakeBot,
} from "../../shared/neonSnakeBot";
import {
  NEON_SNAKE_WORLD_SIZE,
  type NeonSnakePlayer,
} from "../../shared/neonSnake";

function human(id: string, x = 0, y = 0): NeonSnakePlayer {
  return {
    id,
    name: id,
    color: "#ffffff",
    segments: [{ x, y }],
    score: 10,
    isBoosting: false,
    state: "alive",
    currentAngle: 0,
  };
}

test("the AI obstacle is used only when one human is available", () => {
  assert.equal(shouldUseNeonSnakeBot({}), false);
  assert.equal(shouldUseNeonSnakeBot({ one: human("one") }), true);
  assert.equal(
    shouldUseNeonSnakeBot({ one: human("one"), two: human("two") }),
    false,
  );
});

test("the AI obstacle spawns as a visible server-owned snake", () => {
  const bot = createNeonSnakeBot({ one: human("one") }, () => 0);

  assert.equal(bot.id, NEON_SNAKE_BOT_ID);
  assert.equal(bot.isBot, true);
  assert.equal(bot.state, "alive");
  assert.equal(bot.segments.length, NEON_SNAKE_BOT_LENGTH);
  assert.equal(bot.score, NEON_SNAKE_BOT_LENGTH);
  for (const segment of bot.segments) {
    assert.ok(Math.abs(segment.x) <= NEON_SNAKE_WORLD_SIZE / 2);
    assert.ok(Math.abs(segment.y) <= NEON_SNAKE_WORLD_SIZE / 2);
  }
});

test("the AI obstacle patrols while staying inside the arena", () => {
  const players = { one: human("one", 0, 0) };
  const bot = createNeonSnakeBot(players, () => 0);
  const originalHead = bot.segments[0];
  const next = stepNeonSnakeBot(bot, { ...players, [bot.id]: bot }, 0.05);

  assert.notDeepEqual(next.segments[0], originalHead);
  assert.equal(next.segments.length, NEON_SNAKE_BOT_LENGTH);
  assert.ok(Math.abs(next.segments[0].x) <= NEON_SNAKE_WORLD_SIZE / 2);
  assert.ok(Math.abs(next.segments[0].y) <= NEON_SNAKE_WORLD_SIZE / 2);
});

test("the AI obstacle turns back toward the arena near an edge", () => {
  const bot = {
    ...createNeonSnakeBot({ one: human("one") }, () => 0),
    currentAngle: 0,
    segments: Array.from({ length: NEON_SNAKE_BOT_LENGTH }, (_, index) => ({
      x: 73 - index * 0.5,
      y: 0,
    })),
  };
  const next = stepNeonSnakeBot(bot, { one: human("one"), [bot.id]: bot }, 0.05);

  assert.notEqual(next.currentAngle, 0);
  assert.ok(next.segments[0].x <= NEON_SNAKE_WORLD_SIZE / 2);
});
