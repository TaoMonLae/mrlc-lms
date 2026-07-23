/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Adapted from the user-provided multiplayer-neon-snake game.
 */

export type NeonSnakePoint = {
  x: number;
  y: number;
};

export type NeonSnakePlayerState = "alive" | "dead";

export type NeonSnakePlayer = {
  id: string;
  name: string;
  color: string;
  isBot?: boolean;
  segments: NeonSnakePoint[];
  score: number;
  isBoosting: boolean;
  state: NeonSnakePlayerState;
  currentAngle: number;
};

export type NeonSnakeOrb = {
  id: string;
  x: number;
  y: number;
  value: number;
  color: string;
};

export type NeonSnakeLeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  color: string;
};

export type NeonSnakeGameState = {
  players: Record<string, NeonSnakePlayer>;
  orbs: Record<string, NeonSnakeOrb>;
  leaderboard: NeonSnakeLeaderboardEntry[];
};

export const NEON_SNAKE_SOCKET_PATH = "/api/neon-snake/socket.io";
export const NEON_SNAKE_WORLD_SIZE = 150;
export const NEON_SNAKE_BASE_SPEED = 15;
export const NEON_SNAKE_BOOST_SPEED = 30;
export const NEON_SNAKE_INITIAL_LENGTH = 10;
export const NEON_SNAKE_SEGMENT_SPACING = 0.5;
export const NEON_SNAKE_TURN_SPEED = Math.PI * 3;
export const NEON_SNAKE_MAX_ORBS = 300;
export const NEON_SNAKE_MAX_SEGMENTS = 600;
