import {
  NEON_SNAKE_INITIAL_LENGTH,
  NEON_SNAKE_SEGMENT_SPACING,
  NEON_SNAKE_WORLD_SIZE,
  type NeonSnakePlayer,
} from "./neonSnake";

export const NEON_SNAKE_BOT_ID = "__neon_snake_ai_obstacle__";
export const NEON_SNAKE_BOT_NAME = "AI Obstacle";
export const NEON_SNAKE_BOT_COLOR = "#ff4d6d";
export const NEON_SNAKE_BOT_LENGTH = 24;
export const NEON_SNAKE_BOT_SPEED = 11;

const BOT_TURN_SPEED = Math.PI * 0.8;

function aliveHumans(players: Record<string, NeonSnakePlayer>) {
  return Object.values(players).filter(
    (player) => player.state === "alive" && !player.isBot,
  );
}

function normalizeAngle(angle: number) {
  let normalized = angle;
  while (normalized > Math.PI) normalized -= Math.PI * 2;
  while (normalized < -Math.PI) normalized += Math.PI * 2;
  return normalized;
}

export function shouldUseNeonSnakeBot(
  players: Record<string, NeonSnakePlayer>,
): boolean {
  return aliveHumans(players).length === 1;
}

export function createNeonSnakeBot(
  players: Record<string, NeonSnakePlayer>,
  random: () => number = Math.random,
): NeonSnakePlayer {
  const human = aliveHumans(players)[0];
  const humanHead = human?.segments[0] ?? { x: 0, y: 0 };
  const spawnAngle = random() * Math.PI * 2;
  const safeBoundary = NEON_SNAKE_WORLD_SIZE / 2 - 18;
  const x = Math.max(
    -safeBoundary,
    Math.min(safeBoundary, humanHead.x + Math.cos(spawnAngle) * 28),
  );
  const y = Math.max(
    -safeBoundary,
    Math.min(safeBoundary, humanHead.y + Math.sin(spawnAngle) * 28),
  );
  const currentAngle = Math.atan2(humanHead.y - y, humanHead.x - x) + Math.PI / 3;
  const segments = Array.from({ length: NEON_SNAKE_BOT_LENGTH }, (_, index) => ({
    x: x - Math.cos(currentAngle) * index * NEON_SNAKE_SEGMENT_SPACING,
    y: y - Math.sin(currentAngle) * index * NEON_SNAKE_SEGMENT_SPACING,
  }));

  return {
    id: NEON_SNAKE_BOT_ID,
    name: NEON_SNAKE_BOT_NAME,
    color: NEON_SNAKE_BOT_COLOR,
    isBot: true,
    segments,
    score: Math.max(NEON_SNAKE_INITIAL_LENGTH, NEON_SNAKE_BOT_LENGTH),
    isBoosting: false,
    state: "alive",
    currentAngle,
  };
}

export function stepNeonSnakeBot(
  bot: NeonSnakePlayer,
  players: Record<string, NeonSnakePlayer>,
  deltaSeconds: number,
): NeonSnakePlayer {
  const head = bot.segments[0];
  if (!head || deltaSeconds <= 0) return bot;

  const humans = aliveHumans(players);
  const nearestHuman = humans
    .filter((player) => player.segments.length > 0)
    .sort((left, right) => {
      const leftHead = left.segments[0];
      const rightHead = right.segments[0];
      const leftDistance = (leftHead.x - head.x) ** 2 + (leftHead.y - head.y) ** 2;
      const rightDistance = (rightHead.x - head.x) ** 2 + (rightHead.y - head.y) ** 2;
      return leftDistance - rightDistance;
    })[0];

  const boundary = NEON_SNAKE_WORLD_SIZE / 2;
  const boundaryMargin = 14;
  let targetAngle = bot.currentAngle;

  if (
    Math.abs(head.x) > boundary - boundaryMargin ||
    Math.abs(head.y) > boundary - boundaryMargin
  ) {
    targetAngle = Math.atan2(-head.y, -head.x);
  } else if (nearestHuman) {
    const humanHead = nearestHuman.segments[0];
    const dx = humanHead.x - head.x;
    const dy = humanHead.y - head.y;
    const distanceSquared = dx * dx + dy * dy;
    // Approach from an angle when far away, then orbit nearby so the bot
    // remains a moving obstacle instead of unfairly charging head-on.
    const approachOffset = distanceSquared > 30 * 30 ? Math.PI / 8 : Math.PI / 2;
    targetAngle = Math.atan2(dy, dx) + approachOffset;
  }

  const angleDifference = normalizeAngle(targetAngle - bot.currentAngle);
  const maxTurn = BOT_TURN_SPEED * deltaSeconds;
  const currentAngle =
    bot.currentAngle + Math.max(-maxTurn, Math.min(maxTurn, angleDifference));
  const nextHead = {
    x: Math.max(
      -boundary,
      Math.min(boundary, head.x + Math.cos(currentAngle) * NEON_SNAKE_BOT_SPEED * deltaSeconds),
    ),
    y: Math.max(
      -boundary,
      Math.min(boundary, head.y + Math.sin(currentAngle) * NEON_SNAKE_BOT_SPEED * deltaSeconds),
    ),
  };

  return {
    ...bot,
    segments: [nextHead, ...bot.segments].slice(0, NEON_SNAKE_BOT_LENGTH),
    score: NEON_SNAKE_BOT_LENGTH,
    isBoosting: false,
    state: "alive",
    currentAngle,
  };
}
