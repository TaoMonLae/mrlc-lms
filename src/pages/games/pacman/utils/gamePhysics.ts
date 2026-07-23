import { Direction, GhostState, Position } from '../types';
import { isWalkableForGhost, isWalkableForPacman } from './mazes';

const OFFSETS: Record<Exclude<Direction, 'NONE'>, Position> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 }
};

export function isWithinPickupRadius(
  first: Position,
  second: Position,
  radius = 0.9
): boolean {
  const dx = first.x - second.x;
  const dy = first.y - second.y;
  return dx * dx + dy * dy <= radius * radius;
}

export function canGhostAdvance(
  maze: number[][],
  position: Position,
  direction: Direction,
  state: GhostState
): boolean {
  if (direction === 'NONE') return false;

  const gridX =
    direction === 'RIGHT'
      ? Math.ceil(position.x)
      : direction === 'LEFT'
        ? Math.floor(position.x)
        : Math.round(position.x);
  const gridY =
    direction === 'DOWN'
      ? Math.ceil(position.y)
      : direction === 'UP'
        ? Math.floor(position.y)
        : Math.round(position.y);
  const tile = maze[gridY]?.[gridX];

  return tile !== undefined && isWalkableForGhost(tile, state === 'EATEN' || state === 'HOUSE');
}

export function getGhostStepPosition(
  position: Position,
  direction: Direction,
  distance: number,
  mazeWidth: number
): Position {
  let nextX = position.x;
  let nextY = position.y;

  if (direction === 'UP') {
    const nextCenter = Math.ceil(position.y - 0.001) - 1;
    nextY -= Math.min(distance, position.y - nextCenter);
  } else if (direction === 'DOWN') {
    const nextCenter = Math.floor(position.y + 0.001) + 1;
    nextY += Math.min(distance, nextCenter - position.y);
  } else if (direction === 'LEFT') {
    const nextCenter = Math.ceil(position.x - 0.001) - 1;
    nextX -= Math.min(distance, position.x - nextCenter);
  } else if (direction === 'RIGHT') {
    const nextCenter = Math.floor(position.x + 0.001) + 1;
    nextX += Math.min(distance, nextCenter - position.x);
  }

  if (nextX < 0) nextX = mazeWidth - 1;
  if (nextX >= mazeWidth) nextX = 0;

  return { x: nextX, y: nextY };
}

export function getPacmanStepPosition(
  maze: number[][],
  position: Position,
  direction: Direction,
  distance: number
): { position: Position; blocked: boolean } {
  if (direction === 'NONE' || distance <= 0) {
    return { position: { ...position }, blocked: false };
  }

  const mazeWidth = maze[0].length;
  let current = { ...position };
  let remaining = distance;

  // Small collision steps prevent high-level speed and slow frames from
  // jumping across a one-tile wall or missing a tunnel entrance.
  while (remaining > 0.0001) {
    const step = Math.min(remaining, 0.2);
    let nextX = current.x;
    let nextY = current.y;

    if (direction === 'UP') nextY -= step;
    else if (direction === 'DOWN') nextY += step;
    else if (direction === 'LEFT') nextX -= step;
    else if (direction === 'RIGHT') nextX += step;

    if (nextX < 0) nextX = mazeWidth - 1;
    if (nextX >= mazeWidth) nextX = 0;

    const gridX =
      direction === 'RIGHT'
        ? Math.ceil(nextX)
        : direction === 'LEFT'
          ? Math.floor(nextX)
          : Math.round(nextX);
    const gridY =
      direction === 'DOWN'
        ? Math.ceil(nextY)
        : direction === 'UP'
          ? Math.floor(nextY)
          : Math.round(nextY);
    const tile = maze[gridY]?.[gridX];

    if (tile === undefined || !isWalkableForPacman(tile)) {
      return { position: current, blocked: true };
    }

    current = { x: nextX, y: nextY };
    remaining -= step;
  }

  return { position: current, blocked: false };
}

export function getGhostExitPosition(maze: number[][]): Position {
  const gates: Position[] = [];

  maze.forEach((row, y) => {
    row.forEach((tile, x) => {
      if (tile === 4) gates.push({ x, y });
    });
  });

  if (gates.length === 0) return { x: 1, y: 1 };

  const highestGateY = Math.min(...gates.map((gate) => gate.y));
  const gateCenterX = gates.reduce((total, gate) => total + gate.x, 0) / gates.length;
  const candidates: Array<Position & { score: number }> = [];

  maze.forEach((row, y) => {
    row.forEach((tile, x) => {
      if (!isWalkableForGhost(tile, false)) return;

      const hasOpenNeighbor = Object.values(OFFSETS).some((offset) => {
        const neighbor = maze[y + offset.y]?.[x + offset.x];
        return neighbor !== undefined && isWalkableForGhost(neighbor, false);
      });
      if (!hasOpenNeighbor) return;

      const gateDistance = Math.min(
        ...gates.map((gate) => Math.abs(x - gate.x) + Math.abs(y - gate.y))
      );
      const belowGatePenalty = y >= highestGateY ? 100 : 0;
      const centerPenalty = Math.abs(x - gateCenterX) * 0.1;

      candidates.push({
        x,
        y,
        score: gateDistance * 10 + belowGatePenalty + centerPenalty
      });
    });
  });

  candidates.sort((first, second) => first.score - second.score);
  const exit = candidates[0];
  return exit ? { x: exit.x, y: exit.y } : { x: 1, y: 1 };
}
