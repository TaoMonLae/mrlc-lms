import type { GameMode } from '../types';
import { TOTAL_LEVELS } from './levels';

export const GAME_MODES: GameMode[] = ['CLASSIC', 'TIME_ATTACK', 'SURVIVAL', 'PRACTICE'];
type StageStorage = Pick<Storage, 'getItem' | 'setItem'>;
export type StageProgress = Record<GameMode, number>;

export function emptyStageProgress(): StageProgress {
  return { CLASSIC: 1, TIME_ATTACK: 1, SURVIVAL: 1, PRACTICE: 1 };
}

export function validStage(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= TOTAL_LEVELS
    ? value
    : null;
}

function key(userId: string, mode: GameMode): string {
  return `pacman_stage_progress:${userId}:${mode}`;
}

export function readStageProgress(storage: StageStorage, userId: string): StageProgress {
  const progress = emptyStageProgress();
  try {
    for (const mode of GAME_MODES) {
      const saved = storage.getItem(key(userId, mode));
      const level = saved === null ? null : validStage(Number(saved));
      if (level) progress[mode] = level;
    }
    // Import an older on-device checkpoint if one exists for this account.
    const legacy = storage.getItem(`pacman_stage_save:${userId}`);
    if (legacy) {
      const parsed = JSON.parse(legacy) as { level?: unknown; gameMode?: unknown };
      const mode = GAME_MODES.find((item) => item === parsed.gameMode);
      const level = validStage(parsed.level);
      if (mode && level) progress[mode] = Math.max(progress[mode], level);
    }
  } catch {
    // Private browsing can disable storage. Account sync still works.
  }
  return progress;
}

export function writeStageProgress(storage: StageStorage, userId: string, mode: GameMode, level: number): boolean {
  if (!validStage(level)) return false;
  try {
    const previous = validStage(Number(storage.getItem(key(userId, mode)))) ?? 1;
    storage.setItem(key(userId, mode), String(Math.max(previous, level)));
    return true;
  } catch {
    return false;
  }
}
