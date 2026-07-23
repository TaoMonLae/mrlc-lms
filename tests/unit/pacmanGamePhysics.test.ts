import assert from 'node:assert/strict';
import test from 'node:test';
import { GhostEntity } from '../../src/pages/games/pacman/types';
import {
  canGhostAdvance,
  getGhostExitPosition,
  getGhostStepPosition,
  getPacmanStepPosition,
  isWithinPickupRadius
} from '../../src/pages/games/pacman/utils/gamePhysics';
import { getNextGhostDirection } from '../../src/pages/games/pacman/utils/ghostAI';
import {
  getMazeSpawns,
  isWalkableForGhost,
  isWalkableForPacman,
  MAZE_CLASSIC,
  MAZE_CROSSFIRE,
  MAZE_LABYRINTH
} from '../../src/pages/games/pacman/utils/mazes';

test('Pac-Man collects an item when he reaches its tile', () => {
  assert.equal(isWithinPickupRadius({ x: 13, y: 17 }, { x: 13, y: 17 }), true);
  assert.equal(isWithinPickupRadius({ x: 12.2, y: 17 }, { x: 13, y: 17 }), true);
  assert.equal(isWithinPickupRadius({ x: 11.9, y: 17 }, { x: 13, y: 17 }), false);
});

test('every maze places exiting ghosts on a walkable corridor', () => {
  for (const maze of [MAZE_CLASSIC, MAZE_CROSSFIRE, MAZE_LABYRINTH]) {
    const exit = getGhostExitPosition(maze);
    const tile = maze[exit.y]?.[exit.x];

    assert.equal(Number.isInteger(exit.x), true);
    assert.equal(Number.isInteger(exit.y), true);
    assert.notEqual(tile, undefined);
    assert.equal(isWalkableForGhost(tile!, false), true);
  }
});

test('every level keeps Pac-Man and house ghosts inside valid maze tiles', () => {
  for (const maze of [MAZE_CLASSIC, MAZE_CROSSFIRE, MAZE_LABYRINTH]) {
    const spawns = getMazeSpawns(maze);
    const pacmanTiles = [
      maze[spawns.pacmanSpawn.y]?.[Math.floor(spawns.pacmanSpawn.x)],
      maze[spawns.pacmanSpawn.y]?.[Math.ceil(spawns.pacmanSpawn.x)]
    ];

    assert.equal(
      spawns.pacmanSpawn.y >= 0 && spawns.pacmanSpawn.y < maze.length,
      true
    );
    assert.equal(pacmanTiles.every((tile) => tile !== undefined && isWalkableForPacman(tile)), true);

    const houseSpawns = [
      spawns.ghostSpawns.PINKY,
      spawns.ghostSpawns.INKY,
      spawns.ghostSpawns.CLYDE
    ];
    assert.equal(new Set(houseSpawns.map(({ x, y }) => `${x},${y}`)).size, 3);
    for (const spawn of houseSpawns) {
      assert.equal(maze[spawn.y]?.[spawn.x], 5);
    }
  }
});

test('a ghost leaving the classic house receives a valid pursuit direction', () => {
  const exit = getGhostExitPosition(MAZE_CLASSIC);
  const ghost: GhostEntity = {
    name: 'BLINKY',
    x: exit.x,
    y: exit.y,
    dir: 'LEFT',
    nextDir: 'LEFT',
    speed: 6.5,
    color: '#ef4444',
    frightenedColor: '#1e3a8a',
    scatterTarget: { x: 26, y: 0 },
    state: 'CHASE',
    frightenedTimer: 0,
    houseTimer: 0,
    target: { x: 13, y: 17 },
    dotCounter: 0
  };
  const direction = getNextGhostDirection(ghost, MAZE_CLASSIC, ghost.target);
  const offset = {
    UP: { x: 0, y: -0.1 },
    DOWN: { x: 0, y: 0.1 },
    LEFT: { x: -0.1, y: 0 },
    RIGHT: { x: 0.1, y: 0 },
    NONE: { x: 0, y: 0 }
  }[direction];

  assert.notEqual(direction, 'NONE');
  assert.equal(
    canGhostAdvance(
      MAZE_CLASSIC,
      { x: exit.x + offset.x, y: exit.y + offset.y },
      direction,
      ghost.state
    ),
    true
  );
});

test('a ghost moves away from its tile center across consecutive frames', () => {
  const firstFrame = getGhostStepPosition({ x: 13, y: 11 }, 'LEFT', 0.1, 28);
  const secondFrame = getGhostStepPosition(firstFrame, 'LEFT', 0.1, 28);

  assert.deepEqual(firstFrame, { x: 12.9, y: 11 });
  assert.deepEqual(secondFrame, { x: 12.8, y: 11 });
});

test('Pac-Man cannot skip through a wall during a high-speed frame', () => {
  const tinyMaze = [
    [1, 1, 1, 1, 1],
    [1, 0, 1, 0, 1],
    [1, 1, 1, 1, 1]
  ];
  const movement = getPacmanStepPosition(
    tinyMaze,
    { x: 1, y: 1 },
    'RIGHT',
    2
  );

  assert.equal(movement.blocked, true);
  assert.deepEqual(movement.position, { x: 1, y: 1 });
});
