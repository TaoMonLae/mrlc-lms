export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';

export type GhostName = 'BLINKY' | 'PINKY' | 'INKY' | 'CLYDE';

export type GhostState = 'CHASE' | 'SCATTER' | 'FRIGHTENED' | 'EATEN' | 'HOUSE';

export type PowerUpType = 'SPEED' | 'FREEZE' | 'MAGNET' | 'SHIELD' | 'BOMB';

export type VisualTheme = 'NEON' | 'CLASSIC' | 'SYNTHWAVE' | 'VECTOR';

export type GameMode = 'CLASSIC' | 'TIME_ATTACK' | 'SURVIVAL' | 'PRACTICE';

export type AIDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'NIGHTMARE';

export type GameStatus = 'READY' | 'PLAYING' | 'PAUSED' | 'DYING' | 'LEVEL_CLEAR' | 'GAME_OVER';

export interface Position {
  x: number; // grid column
  y: number; // grid row
}

export interface PixelPosition {
  x: number; // continuous pixel x
  y: number; // continuous pixel y
}

export interface Entity {
  x: number;
  y: number;
  dir: Direction;
  nextDir: Direction;
  speed: number;
}

export interface PacManState extends Entity {
  mouthAngle: number;
  mouthSpeed: number;
  powerUp: PowerUpType | null;
  powerUpTimeLeft: number; // in seconds
  isShieldActive: boolean;
}

export interface GhostEntity extends Entity {
  name: GhostName;
  color: string;
  frightenedColor: string;
  scatterTarget: Position;
  state: GhostState;
  frightenedTimer: number;
  houseTimer: number;
  target: Position;
  dotCounter: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  opacity: number;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'square' | 'star';
}

export interface FruitItem {
  type: 'CHERRY' | 'STRAWBERRY' | 'PEACH' | 'APPLE' | 'MELON' | 'GALAXIAN' | 'BELL' | 'KEY';
  points: number;
  x: number;
  y: number;
  duration: number; // countdown
  active: boolean;
  color: string;
}

export interface PowerUpItem {
  type: PowerUpType;
  x: number;
  y: number;
  duration: number;
  active: boolean;
  color: string;
  icon: string;
}

export interface LevelConfig {
  id: number;
  name: string;
  mazeIndex: number;
  ghostSpeedMultiplier: number;
  pacSpeedMultiplier: number;
  frightenedDuration: number; // in milliseconds
  frightenedFlashStarts: number; // when flashes begin
  fruitType: FruitItem['type'];
  fruitPoints: number;
  description: string;
}

export interface ScoreEntry {
  id: string;
  name: string;
  score: number;
  level: number;
  mode: GameMode;
  date: string;
}

export interface GameStats {
  dotsEaten: number;
  ghostsEaten: number;
  powerUpsCollected: number;
  fruitsEaten: number;
  gamesPlayed: number;
  highestCombo: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}
