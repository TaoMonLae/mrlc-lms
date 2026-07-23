/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type GameState = {
  players: Record<string, Player>;
  orbs: Record<string, Orb>;
  leaderboard: LeaderboardEntry[];
};

export type PlayerState = 'alive' | 'dead' | 'spectating';

export type Player = {
  id: string;
  name: string;
  color: string;
  segments: { x: number; y: number }[];
  score: number;
  isBoosting: boolean;
  state: PlayerState;
  currentAngle: number;
  inputs: { left: boolean; right: boolean; boost: boolean };
};

export type Orb = {
  id: string;
  x: number;
  y: number;
  value: number;
  color: string;
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  color: string;
};

export const WORLD_SIZE = 150;
export const BASE_SPEED = 15;
export const BOOST_SPEED = 30;
export const TICK_RATE = 60; // 60 updates per second
export const ORB_SPAWN_RATE = 0.1; // Orbs per tick
export const MAX_ORBS = 300;
export const INITIAL_LENGTH = 10;
export const SEGMENT_SPACING = 0.5;
export const TURN_SPEED = Math.PI * 3; // Radians per second
