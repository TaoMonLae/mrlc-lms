/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Multiplayer server adapted from the user-provided multiplayer-neon-snake app.
 */

import crypto from "crypto";
import type { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import {
  NEON_SNAKE_INITIAL_LENGTH,
  NEON_SNAKE_MAX_ORBS,
  NEON_SNAKE_MAX_SEGMENTS,
  NEON_SNAKE_SEGMENT_SPACING,
  NEON_SNAKE_SOCKET_PATH,
  NEON_SNAKE_WORLD_SIZE,
  type NeonSnakeGameState,
  type NeonSnakePoint,
} from "./shared/neonSnake";
import {
  createNeonSnakeBot,
  NEON_SNAKE_BOT_ID,
  shouldUseNeonSnakeBot,
  stepNeonSnakeBot,
} from "./shared/neonSnakeBot";

export type NeonSnakeIdentity = {
  userId: string;
  name: string;
};

type NeonSnakeLogger = {
  info: (message: string) => void;
  warn: (message: string) => void;
};

type RegisterNeonSnakeOptions = {
  server: HttpServer;
  authenticate: (token: string) => Promise<NeonSnakeIdentity>;
  logger: NeonSnakeLogger;
};

const COLORS = ["#ff7eb3", "#ffb86c", "#f1fa8c", "#50fa7b", "#8be9fd", "#bd93f9"];
const BROADCAST_RATE = 20;

function randomCoordinate(): number {
  return (Math.random() - 0.5) * NEON_SNAKE_WORLD_SIZE;
}

function isValidPoint(value: unknown): value is NeonSnakePoint {
  if (!value || typeof value !== "object") return false;
  const point = value as NeonSnakePoint;
  const boundary = NEON_SNAKE_WORLD_SIZE / 2 + 2;
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    Math.abs(point.x) <= boundary &&
    Math.abs(point.y) <= boundary
  );
}

export function registerNeonSnakeServer({
  server,
  authenticate,
  logger,
}: RegisterNeonSnakeOptions) {
  const io = new SocketServer(server, {
    path: NEON_SNAKE_SOCKET_PATH,
    serveClient: false,
    cors: { origin: false },
    maxHttpBufferSize: 256_000,
  });

  const state: NeonSnakeGameState = {
    players: {},
    orbs: {},
    leaderboard: [],
  };

  const spawnOrb = (
    x = randomCoordinate(),
    y = randomCoordinate(),
    value = 1,
    color = COLORS[Math.floor(Math.random() * COLORS.length)],
  ) => {
    if (Object.keys(state.orbs).length >= NEON_SNAKE_MAX_ORBS) return;
    const id = crypto.randomUUID();
    state.orbs[id] = { id, x, y, value, color };
  };

  for (let index = 0; index < 150; index += 1) spawnOrb();

  const syncAiObstacle = () => {
    if (shouldUseNeonSnakeBot(state.players)) {
      if (!state.players[NEON_SNAKE_BOT_ID]) {
        state.players[NEON_SNAKE_BOT_ID] = createNeonSnakeBot(state.players);
      }
    } else {
      delete state.players[NEON_SNAKE_BOT_ID];
    }
  };

  io.use(async (socket, next) => {
    try {
      const token = String(socket.handshake.auth?.token || "");
      if (!token) throw new Error("Authentication required");
      socket.data.identity = await authenticate(token);
      next();
    } catch {
      next(new Error("Authentication required"));
    }
  });

  io.on("connection", (socket) => {
    const identity = socket.data.identity as NeonSnakeIdentity;
    logger.info(`Neon Snake player connected: ${identity.userId}`);

    socket.on("join", () => {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const startX = (Math.random() - 0.5) * (NEON_SNAKE_WORLD_SIZE - 20);
      const startY = (Math.random() - 0.5) * (NEON_SNAKE_WORLD_SIZE - 20);
      const angle = Math.random() * Math.PI * 2;
      const segments = Array.from({ length: NEON_SNAKE_INITIAL_LENGTH }, (_, index) => ({
        x: startX - Math.cos(angle) * index * NEON_SNAKE_SEGMENT_SPACING,
        y: startY - Math.sin(angle) * index * NEON_SNAKE_SEGMENT_SPACING,
      }));

      state.players[socket.id] = {
        id: socket.id,
        name: identity.name,
        color,
        segments,
        score: NEON_SNAKE_INITIAL_LENGTH,
        isBoosting: false,
        state: "alive",
        currentAngle: angle,
      };
      syncAiObstacle();
      socket.emit("init", socket.id);
    });

    socket.on("update_state", (value: unknown) => {
      const player = state.players[socket.id];
      if (!player || player.state !== "alive" || !value || typeof value !== "object") return;

      const data = value as {
        segments?: unknown;
        score?: unknown;
        currentAngle?: unknown;
        isBoosting?: unknown;
        state?: unknown;
      };
      if (!Array.isArray(data.segments)) return;

      const segments = data.segments
        .slice(0, NEON_SNAKE_MAX_SEGMENTS)
        .filter(isValidPoint);
      if (segments.length === 0 || segments.length !== Math.min(data.segments.length, NEON_SNAKE_MAX_SEGMENTS)) {
        return;
      }

      player.segments = segments.slice(0, Math.max(NEON_SNAKE_INITIAL_LENGTH, Math.floor(player.score)));
      if (typeof data.score === "number" && Number.isFinite(data.score)) {
        // Orb collection is authoritative on the server. Clients may only lower
        // their length while boosting, never grant themselves extra score.
        player.score = Math.max(
          NEON_SNAKE_INITIAL_LENGTH,
          Math.min(player.score, data.score),
        );
      }
      if (typeof data.currentAngle === "number" && Number.isFinite(data.currentAngle)) {
        player.currentAngle = data.currentAngle;
      }
      player.isBoosting = data.isBoosting === true && player.score > NEON_SNAKE_INITIAL_LENGTH;

      if (data.state === "dead") {
        player.state = "dead";
        player.isBoosting = false;
        player.segments
          .filter((_, index) => index % 2 === 0)
          .slice(0, 60)
          .forEach((segment) => spawnOrb(segment.x, segment.y, 1, player.color));
        syncAiObstacle();
      }
    });

    socket.on("collect_orb", (orbId: unknown) => {
      if (typeof orbId !== "string") return;
      const player = state.players[socket.id];
      const orb = state.orbs[orbId];
      const head = player?.segments[0];
      if (!player || player.state !== "alive" || !orb || !head) return;

      const dx = head.x - orb.x;
      const dy = head.y - orb.y;
      if (dx * dx + dy * dy > 9) return;

      player.score = Math.min(NEON_SNAKE_MAX_SEGMENTS, player.score + orb.value);
      delete state.orbs[orbId];
    });

    socket.on("disconnect", () => {
      const player = state.players[socket.id];
      if (player?.state === "alive") {
        player.segments
          .filter((_, index) => index % 2 === 0)
          .slice(0, 60)
          .forEach((segment) => spawnOrb(segment.x, segment.y, 1, player.color));
      }
      delete state.players[socket.id];
      syncAiObstacle();
      logger.info(`Neon Snake player disconnected: ${identity.userId}`);
    });
  });

  const gameLoop = setInterval(() => {
    if (Math.random() < 0.2) spawnOrb();
    syncAiObstacle();
    const aiObstacle = state.players[NEON_SNAKE_BOT_ID];
    if (aiObstacle) {
      state.players[NEON_SNAKE_BOT_ID] = stepNeonSnakeBot(
        aiObstacle,
        state.players,
        1 / BROADCAST_RATE,
      );
    }
    state.leaderboard = Object.values(state.players)
      .filter((player) => player.state === "alive" && !player.isBot)
      .sort((left, right) => right.score - left.score)
      .slice(0, 10)
      .map((player) => ({
        id: player.id,
        name: player.name,
        score: Math.floor(player.score),
        color: player.color,
      }));
    io.volatile.emit("state", state);
  }, 1_000 / BROADCAST_RATE);
  gameLoop.unref?.();

  logger.info("🐍 Multiplayer Neon Snake server registered");

  return {
    close: () => {
      clearInterval(gameLoop);
      io.disconnectSockets(true);
      io.removeAllListeners();
    },
  };
}
