import { Direction, GhostEntity, PacManState, Position } from '../types';
import { isWalkableForGhost } from './mazes';

const OPPOSITE_DIRECTIONS: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
  NONE: 'NONE'
};

const DIRECTION_OFFSETS: Record<Direction, { dx: number; dy: number }> = {
  UP: { dx: 0, dy: -1 },
  DOWN: { dx: 0, dy: 1 },
  LEFT: { dx: -1, dy: 0 },
  RIGHT: { dx: 1, dy: 0 },
  NONE: { dx: 0, dy: 0 }
};

/**
 * Calculates target grid cell for ghosts based on their personality and mode
 */
export function calculateGhostTarget(
  ghost: GhostEntity,
  blinkyPos: Position,
  pacman: PacManState,
  maze: number[][],
  ghostHouseGate: Position
): Position {
  const rows = maze.length;
  const cols = maze[0].length;

  if (ghost.state === 'EATEN') {
    return ghostHouseGate;
  }

  if (ghost.state === 'SCATTER') {
    return ghost.scatterTarget;
  }

  if (ghost.state === 'FRIGHTENED') {
    // Random target
    return {
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows)
    };
  }

  // CHASE MODE LOGIC
  const pacCell = { x: Math.floor(pacman.x), y: Math.floor(pacman.y) };

  switch (ghost.name) {
    case 'BLINKY':
      // Direct chase Pac-Man
      return pacCell;

    case 'PINKY': {
      // 4 tiles ahead of Pac-Man
      const offset = DIRECTION_OFFSETS[pacman.dir] || { dx: 0, dy: 0 };
      return {
        x: pacCell.x + offset.dx * 4,
        y: pacCell.y + offset.dy * 4
      };
    }

    case 'INKY': {
      // 2 tiles ahead of Pac-Man, doubled vector from Blinky
      const offset = DIRECTION_OFFSETS[pacman.dir] || { dx: 0, dy: 0 };
      const aheadTile = {
        x: pacCell.x + offset.dx * 2,
        y: pacCell.y + offset.dy * 2
      };
      const vx = aheadTile.x - blinkyPos.x;
      const vy = aheadTile.y - blinkyPos.y;
      return {
        x: blinkyPos.x + vx * 2,
        y: blinkyPos.y + vy * 2
      };
    }

    case 'CLYDE': {
      // Shy behavior: Chase if > 8 tiles, scatter if < 8 tiles
      const dx = ghost.x - pacman.x;
      const dy = ghost.y - pacman.y;
      const distSq = dx * dx + dy * dy;
      if (distSq >= 64) {
        return pacCell;
      } else {
        return ghost.scatterTarget;
      }
    }

    default:
      return pacCell;
  }
}

/**
 * Gets distance squared between two coordinates
 */
function getDistanceSq(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Determines next direction for a ghost at a grid junction
 */
export function getNextGhostDirection(
  ghost: GhostEntity,
  maze: number[][],
  target: Position
): Direction {
  const rows = maze.length;
  const cols = maze[0].length;

  const currentX = Math.round(ghost.x);
  const currentY = Math.round(ghost.y);

  // Directions priority in case of tie: UP, LEFT, DOWN, RIGHT
  const possibleDirs: Direction[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
  const oppositeDir = OPPOSITE_DIRECTIONS[ghost.dir];

  let bestDir: Direction = ghost.dir;
  let minDistance = Infinity;

  // Filter valid candidate directions
  const validDirs: { dir: Direction; dist: number }[] = [];

  for (const dir of possibleDirs) {
    if (dir === oppositeDir && ghost.state !== 'FRIGHTENED') {
      // Ghosts can't reverse direction unless forced
      continue;
    }

    const offset = DIRECTION_OFFSETS[dir];
    let nextX = currentX + offset.dx;
    let nextY = currentY + offset.dy;

    // Side tunnel wrap
    if (nextX < 0) nextX = cols - 1;
    if (nextX >= cols) nextX = 0;

    const tile = maze[nextY]?.[nextX];
    if (tile === undefined) continue;

    const canEnterHouse = ghost.state === 'EATEN' || ghost.state === 'HOUSE';
    if (isWalkableForGhost(tile, canEnterHouse)) {
      const dist = getDistanceSq({ x: nextX, y: nextY }, target);
      validDirs.push({ dir, dist });
    }
  }

  if (validDirs.length === 0) {
    // Backup: allow turning around
    return oppositeDir !== 'NONE' ? oppositeDir : 'LEFT';
  }

  if (ghost.state === 'FRIGHTENED') {
    // Pick random valid direction
    const randomIndex = Math.floor(Math.random() * validDirs.length);
    return validDirs[randomIndex].dir;
  }

  // Find direction with minimum distance to target
  for (const item of validDirs) {
    if (item.dist < minDistance) {
      minDistance = item.dist;
      bestDir = item.dir;
    }
  }

  return bestDir;
}
