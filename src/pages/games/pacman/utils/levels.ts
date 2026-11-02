import { isWalkableForPacman, MAZES } from './mazes';

export const TOTAL_LEVELS = 15;

const REGIONS = ['original', 'north', 'east', 'south', 'west'] as const;
const NAMES = [
  ['Neon Avenue', 'Crossfire', 'Labyrinth'],
  ['Northern Passage', 'High Crossroads', 'Upper Chambers'],
  ['Eastern Express', 'Crossfire East', 'Eastern Chambers'],
  ['Southern Passage', 'Low Crossroads', 'Lower Chambers'],
  ['Western Express', 'Crossfire West', 'Western Chambers']
] as const;

/** Fifteen authored stages: three starting boards and four regional corridor remixes each. */
export function getLevelLayout(level: number): { name: string; maze: number[][] } {
  if (!Number.isInteger(level) || level < 1 || level > TOTAL_LEVELS) {
    throw new RangeError(`Level must be between 1 and ${TOTAL_LEVELS}`);
  }
  const baseIndex = (level - 1) % MAZES.length;
  const variant = Math.floor((level - 1) / MAZES.length);
  const maze = MAZES[baseIndex].map((row) => [...row]);
  if (variant === 0) return { name: NAMES[variant][baseIndex], maze };

  const height = maze.length;
  const width = maze[0].length;
  const region = REGIONS[variant];
  const target = {
    north: { x: width / 2, y: height * 0.25 },
    east: { x: width * 0.75, y: height / 2 },
    south: { x: width / 2, y: height * 0.75 },
    west: { x: width * 0.25, y: height / 2 },
    original: { x: width / 2, y: height / 2 }
  }[region];

  // Choose interior walls between existing lanes. Opening these connects two
  // reachable corridors and preserves the house, tunnel, and spawn geometry.
  const candidates: { x: number; y: number; distance: number }[] = [];
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      if (maze[y][x] !== 1) continue;
      const neighbors = [maze[y - 1][x], maze[y + 1][x], maze[y][x - 1], maze[y][x + 1]];
      if (neighbors.some((tile) => tile === 4 || tile === 5)) continue;
      const vertical = isWalkableForPacman(neighbors[0]) && isWalkableForPacman(neighbors[1]);
      const horizontal = isWalkableForPacman(neighbors[2]) && isWalkableForPacman(neighbors[3]);
      if (vertical || horizontal) {
        candidates.push({ x, y, distance: Math.abs(x - target.x) + Math.abs(y - target.y) });
      }
    }
  }
  candidates.sort((a, b) => a.distance - b.distance || a.y - b.y || a.x - b.x);
  const openings: typeof candidates = [];
  for (const candidate of candidates) {
    if (openings.every((chosen) => Math.abs(candidate.x - chosen.x) + Math.abs(candidate.y - chosen.y) >= 4)) {
      openings.push(candidate);
      maze[candidate.y][candidate.x] = 2;
      if (openings.length === 8) break;
    }
  }
  return { name: NAMES[variant][baseIndex], maze };
}
