/**
 * Maze Layout Definitions for Pac-Man Modern Arcade
 * Tile Values:
 * 0: Empty / Walkable
 * 1: Wall
 * 2: Dot
 * 3: Energizer (Power Pellet)
 * 4: Ghost House Gate
 * 5: Ghost House Interior
 * 6: Teleport Tunnel
 * 7: Fruit Spawn Tile
 * 8: Power-Up Spawn Tile
 */

export const TILE_SIZE = 20; // base render size in canvas pixels

// Map 1: Classic Arcade Layout (28 cols x 31 rows)
export const MAZE_CLASSIC: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,3,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,3,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
  [0,0,0,0,0,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,0,0,0,0,0],
  [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0],
  [0,0,0,0,0,1,2,1,1,0,1,1,1,4,4,1,1,1,0,1,1,2,1,0,0,0,0,0],
  [1,1,1,1,1,1,2,1,1,0,1,5,5,5,5,5,5,1,0,1,1,2,1,1,1,1,1,1],
  [6,0,0,0,0,0,2,0,0,0,1,5,5,5,5,5,5,1,0,0,0,2,0,0,0,0,0,6],
  [1,1,1,1,1,1,2,1,1,0,1,5,5,5,5,5,5,1,0,1,1,2,1,1,1,1,1,1],
  [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0],
  [0,0,0,0,0,1,2,1,1,0,0,0,0,8,0,0,0,0,0,1,1,2,1,0,0,0,0,0],
  [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,3,2,2,1,1,2,2,2,2,2,2,2,7,0,2,2,2,2,2,2,2,1,1,2,2,3,1],
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Map 2: Crossfire Arena Matrix
// The tiles above the ghost gate used to be walls and the pocket above them
// was sealed off, so ghosts spawned into a closed box and never chased.
export const MAZE_CROSSFIRE: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,2,2,2,2,2,2,1,1,2,2,2,1,1,2,2,2,1,1,2,2,2,2,2,2,3,1],
  [1,2,1,1,1,1,1,2,1,1,2,1,2,1,1,2,1,2,1,1,2,1,1,1,1,1,2,1],
  [1,2,1,0,0,0,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,0,0,0,1,2,1],
  [1,2,1,0,1,0,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,0,1,0,1,2,1],
  [1,2,1,1,1,2,1,2,2,2,2,2,2,1,1,2,2,2,2,2,2,1,2,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,1,1,1,1,2,1,1,2,1,1,1,1,2,2,2,2,2,2,2,1],
  [1,1,1,1,2,1,1,2,1,1,2,2,2,8,2,2,2,2,1,1,2,1,1,2,1,1,1,1],
  [0,0,0,1,2,1,1,2,1,1,2,1,1,1,1,1,1,2,1,1,2,1,1,2,1,0,0,0],
  [1,1,1,1,2,1,1,2,2,2,2,0,0,0,0,0,0,2,2,2,2,1,1,2,1,1,1,1],
  [6,0,0,0,2,2,2,2,1,1,0,1,0,0,0,0,1,0,1,1,2,2,2,2,0,0,0,6],
  [1,1,1,1,2,1,1,0,1,1,0,1,1,4,4,1,1,0,1,1,0,1,1,2,1,1,1,1],
  [1,1,1,1,2,1,1,0,1,1,0,1,5,5,5,5,1,0,1,1,0,1,1,2,1,1,1,1],
  [6,0,0,0,2,2,2,0,0,0,0,1,5,5,5,5,1,0,0,0,0,2,2,2,0,0,0,6],
  [1,1,1,1,2,1,1,0,1,1,0,1,1,1,1,1,1,0,1,1,0,1,1,2,1,1,1,1],
  [1,1,1,1,2,1,1,0,1,1,0,0,0,7,0,0,0,0,1,1,0,1,1,2,1,1,1,1],
  [0,0,0,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,0,0,0],
  [1,1,1,1,2,1,1,2,2,2,2,2,2,1,1,2,2,2,2,2,2,1,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,2,1,1,1,1,2,1,1,2,1,1,1,1,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,1,2,1,1,1,1,2,1,1,2,1,1,1,1,2,1,1,1,1,1,2,1],
  [1,2,1,1,1,1,1,2,1,1,2,2,2,8,2,2,2,2,1,1,2,1,1,1,1,1,2,1],
  [1,2,2,2,1,1,2,2,2,2,2,1,1,1,1,1,1,2,2,2,2,2,1,1,2,2,2,1],
  [1,1,1,2,1,1,2,1,1,1,2,1,1,1,1,1,1,2,1,1,1,2,1,1,2,1,1,1],
  [1,3,2,2,2,2,2,1,1,1,2,2,2,1,1,2,2,2,1,1,1,2,2,2,2,2,3,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Map 3: Labyrinth Chambers
// Mirrored left/right around the ghost house. The earlier version had its
// right half shifted by one or two columns, which sealed one dot at (25,17)
// inside walls, so stage 3 (and 6, 9, ...) could never be cleared.
export const MAZE_LABYRINTH: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,2,2,2,1,2,2,2,2,2,2,1,1,1,1,2,2,2,2,2,2,1,2,2,2,3,1],
  [1,2,1,1,2,1,2,1,1,1,1,2,1,1,1,1,2,1,1,1,1,2,1,2,1,1,2,1],
  [1,2,1,1,2,1,2,1,1,1,1,2,1,1,1,1,2,1,1,1,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1],
  [1,2,2,2,2,1,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1,1,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,2,1,1,2,1],
  [1,2,1,1,2,2,2,2,8,1,1,2,0,0,0,0,2,1,1,8,2,2,2,2,1,1,2,1],
  [1,2,1,1,1,1,1,1,2,1,1,0,1,0,0,1,0,1,1,2,1,1,1,1,1,1,2,1],
  [6,0,0,0,0,0,1,1,2,1,1,0,1,4,4,1,0,1,1,2,1,1,0,0,0,0,0,6],
  [1,1,1,1,1,0,1,1,2,1,1,0,1,5,5,1,0,1,1,2,1,1,0,1,1,1,1,1],
  [1,1,1,1,1,0,1,1,2,0,0,0,1,5,5,1,0,0,0,2,1,1,0,1,1,1,1,1],
  [6,0,0,0,0,0,1,1,2,1,1,0,1,1,1,1,0,1,1,2,1,1,0,0,0,0,0,6],
  [1,1,1,1,1,1,1,1,2,1,1,0,0,7,0,0,0,1,1,2,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1],
  [1,2,1,1,2,2,2,2,2,2,2,2,1,1,1,1,2,2,2,2,2,2,2,2,1,1,2,1],
  [1,2,1,1,2,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,2,1,1,2,1],
  [1,3,2,2,2,1,1,1,1,1,1,2,2,2,2,2,2,1,1,1,1,1,1,2,2,2,3,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

export const MAZES = [MAZE_CLASSIC, MAZE_CROSSFIRE, MAZE_LABYRINTH];

/**
 * Counts total dots and power pellets in a maze layout
 */
export function countDotsAndEnergizers(maze: number[][]): { dots: number; energizers: number } {
  let dots = 0;
  let energizers = 0;
  for (let r = 0; r < maze.length; r++) {
    for (let c = 0; c < maze[r].length; c++) {
      if (maze[r][c] === 2) dots++;
      if (maze[r][c] === 3) energizers++;
    }
  }
  return { dots, energizers };
}

/**
 * Returns true if tile is a solid wall
 */
export function isWallTile(tile: number): boolean {
  return tile === 1;
}

/**
 * Returns true if tile can be walked by Pac-Man
 */
export function isWalkableForPacman(tile: number): boolean {
  return tile !== 1 && tile !== 4 && tile !== 5;
}

/**
 * Returns true if tile can be walked by a ghost
 */
export function isWalkableForGhost(tile: number, canEnterHouse: boolean): boolean {
  if (tile === 1) return false;
  if (!canEnterHouse && (tile === 4 || tile === 5)) return false;
  return true;
}

/**
 * Finds default spawn coordinates for Pac-Man, Ghosts, Fruit, PowerUp in a given maze
 */
export function getMazeSpawns(maze: number[][]) {
  const rows = maze.length;
  const cols = maze[0].length;

  let fruitSpawn = { x: Math.floor(cols / 2) - 1, y: rows - 2 };
  const powerUpSpawns: { x: number; y: number }[] = [];
  const houseTiles: { x: number; y: number }[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (maze[r][c] === 7) fruitSpawn = { x: c, y: r };
      if (maze[r][c] === 8) powerUpSpawns.push({ x: c, y: r });
      if (maze[r][c] === 5) houseTiles.push({ x: c, y: r });
    }
  }

  // Tile 7 marks the lower-center start lane in every maze. Spawn between
  // its two central tiles when possible, matching the classic board while
  // keeping later, shorter mazes in bounds.
  const rightOfSpawn = maze[fruitSpawn.y]?.[fruitSpawn.x + 1];
  const pacmanSpawn = {
    x: rightOfSpawn !== undefined && isWalkableForPacman(rightOfSpawn)
      ? fruitSpawn.x + 0.5
      : fruitSpawn.x,
    y: fruitSpawn.y
  };

  const ghostHouseCenter = houseTiles.length > 0
    ? {
        x: houseTiles.reduce((sum, tile) => sum + tile.x, 0) / houseTiles.length,
        y: houseTiles.reduce((sum, tile) => sum + tile.y, 0) / houseTiles.length
      }
    : { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };

  const usedHouseTiles = new Set<string>();
  const nearestUnusedHouseTile = (targetX: number) => {
    const available = houseTiles
      .filter((tile) => !usedHouseTiles.has(`${tile.x},${tile.y}`))
      .sort((a, b) => {
        const aDistance = Math.abs(a.x - targetX) + Math.abs(a.y - ghostHouseCenter.y);
        const bDistance = Math.abs(b.x - targetX) + Math.abs(b.y - ghostHouseCenter.y);
        return aDistance - bDistance;
      });
    const selected = available[0] ?? pacmanSpawn;
    usedHouseTiles.add(`${selected.x},${selected.y}`);
    return { x: selected.x, y: selected.y };
  };

  // Blinky's active spawn is replaced with the maze-specific exit by the
  // game engine. The other ghosts wait on actual house-interior tiles.
  const ghostSpawns = {
    BLINKY: { x: ghostHouseCenter.x, y: ghostHouseCenter.y },
    PINKY: nearestUnusedHouseTile(ghostHouseCenter.x - 1),
    INKY: nearestUnusedHouseTile(ghostHouseCenter.x),
    CLYDE: nearestUnusedHouseTile(ghostHouseCenter.x + 1)
  };

  return {
    pacmanSpawn,
    ghostHouseCenter,
    ghostSpawns,
    fruitSpawn,
    powerUpSpawns
  };
}

/**
 * Clears any dot or energizer Pac-Man cannot reach from his spawn. A single
 * sealed-off dot makes a stage impossible to finish, so this is a safety net
 * in case a future maze edit introduces one.
 */
export function removeUnreachableDots(maze: number[][]): number[][] {
  const rows = maze.length;
  const cols = maze[0].length;
  const { pacmanSpawn } = getMazeSpawns(maze);
  const startX = Math.floor(pacmanSpawn.x);
  const startY = Math.round(pacmanSpawn.y);
  const seen = new Set<string>([`${startX},${startY}`]);
  const queue: Array<[number, number]> = [[startX, startY]];

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let nx = x + dx;
      const ny = y + dy;
      if (nx < 0) nx = cols - 1;
      if (nx >= cols) nx = 0;
      const tile = maze[ny]?.[nx];
      const key = `${nx},${ny}`;
      if (tile === undefined || !isWalkableForPacman(tile) || seen.has(key)) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((maze[r][c] === 2 || maze[r][c] === 3) && !seen.has(`${c},${r}`)) {
        maze[r][c] = 0;
      }
    }
  }
  return maze;
}
