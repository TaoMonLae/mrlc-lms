export const BOARD_SIZE = 8;
export const PLAYER_RED = "red" as const;
export const PLAYER_BLACK = "black" as const;

export type PieceType = "regular" | "king";
export type PlayerColor = typeof PLAYER_RED | typeof PLAYER_BLACK;
export type Piece = { color: PlayerColor; type: PieceType };
export type BoardSquare = { piece: Piece | null };
export type Board = BoardSquare[][];

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  isJump: boolean;
  jumpedPiece?: Position;
}

export interface MoveResult {
  board: Board;
  captured: boolean;
  promoted: boolean;
}

export interface PieceCounts {
  red: number;
  black: number;
  redKingsCount: number;
  blackKingsCount: number;
}

export interface TurnAction {
  moves: Move[];
  board: Board;
}

const KING_DIRECTIONS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const;

function directionsFor(piece: Piece): ReadonlyArray<readonly [number, number]> {
  if (piece.type === "king") return KING_DIRECTIONS;
  return piece.color === PLAYER_RED
    ? [[-1, -1], [-1, 1]]
    : [[1, -1], [1, 1]];
}

function isOnBoard(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function createInitialBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col): BoardSquare => {
      if ((row + col) % 2 === 0) return { piece: null };
      if (row < 3) return { piece: { color: PLAYER_BLACK, type: "regular" } };
      if (row > 4) return { piece: { color: PLAYER_RED, type: "regular" } };
      return { piece: null };
    }),
  );
}

// Piece objects must also be copied. A shallow square-only clone lets promotion
// in an AI simulation mutate the live board and the snapshots used by Undo.
export function cloneBoard(board: Board): Board {
  return board.map((row) =>
    row.map((square) => ({
      piece: square.piece ? { ...square.piece } : null,
    })),
  );
}

export function getValidMovesForPiece(board: Board, row: number, col: number): Move[] {
  const piece = board[row]?.[col]?.piece;
  if (!piece) return [];

  const jumps: Move[] = [];
  for (const [rowDelta, colDelta] of directionsFor(piece)) {
    const middle = { row: row + rowDelta, col: col + colDelta };
    const landing = { row: row + rowDelta * 2, col: col + colDelta * 2 };
    if (
      isOnBoard(landing.row, landing.col) &&
      board[middle.row][middle.col].piece?.color !== undefined &&
      board[middle.row][middle.col].piece?.color !== piece.color &&
      !board[landing.row][landing.col].piece
    ) {
      jumps.push({
        from: { row, col },
        to: landing,
        isJump: true,
        jumpedPiece: middle,
      });
    }
  }
  if (jumps.length > 0) return jumps;

  const moves: Move[] = [];
  for (const [rowDelta, colDelta] of directionsFor(piece)) {
    const destination = { row: row + rowDelta, col: col + colDelta };
    if (isOnBoard(destination.row, destination.col) && !board[destination.row][destination.col].piece) {
      moves.push({ from: { row, col }, to: destination, isJump: false });
    }
  }
  return moves;
}

export function getJumpMovesForPiece(board: Board, position: Position): Move[] {
  return getValidMovesForPiece(board, position.row, position.col).filter((move) => move.isJump);
}

export function getAllValidMoves(board: Board, player: PlayerColor): Move[] {
  const moves: Move[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col].piece?.color === player) {
        moves.push(...getValidMovesForPiece(board, row, col));
      }
    }
  }
  const jumps = moves.filter((move) => move.isJump);
  return jumps.length > 0 ? jumps : moves;
}

export function applyMove(board: Board, move: Move): MoveResult {
  const nextBoard = cloneBoard(board);
  const piece = nextBoard[move.from.row]?.[move.from.col]?.piece;
  if (!piece) throw new Error("Cannot move an empty square");

  nextBoard[move.to.row][move.to.col].piece = piece;
  nextBoard[move.from.row][move.from.col].piece = null;

  let captured = false;
  if (move.isJump && move.jumpedPiece) {
    nextBoard[move.jumpedPiece.row][move.jumpedPiece.col].piece = null;
    captured = true;
  }

  const promoted =
    piece.type === "regular" &&
    ((piece.color === PLAYER_RED && move.to.row === 0) ||
      (piece.color === PLAYER_BLACK && move.to.row === BOARD_SIZE - 1));
  if (promoted) piece.type = "king";

  return { board: nextBoard, captured, promoted };
}

function finishJumpSequence(board: Board, moves: Move[]): TurnAction[] {
  const lastMove = moves[moves.length - 1];
  const continuations = getJumpMovesForPiece(board, lastMove.to);
  if (continuations.length === 0) return [{ moves, board }];

  return continuations.flatMap((move) => {
    const result = applyMove(board, move);
    const nextMoves = [...moves, move];
    // In American/English checkers, reaching the king row ends this turn. The
    // newly crowned piece may move as a king on its next turn.
    return result.promoted ? [{ moves: nextMoves, board: result.board }] : finishJumpSequence(result.board, nextMoves);
  });
}

// Return complete legal turns rather than individual jump legs. The AI uses
// these outcomes so it never switches sides halfway through a king multi-jump.
export function getTurnActions(board: Board, player: PlayerColor): TurnAction[] {
  return getAllValidMoves(board, player).flatMap((move) => {
    const result = applyMove(board, move);
    if (!result.captured || result.promoted) return [{ moves: [move], board: result.board }];
    return finishJumpSequence(result.board, [move]);
  });
}

export function countPieces(board: Board): PieceCounts {
  const counts: PieceCounts = { red: 0, black: 0, redKingsCount: 0, blackKingsCount: 0 };
  for (const row of board) {
    for (const square of row) {
      if (square.piece?.color === PLAYER_RED) {
        counts.red++;
        if (square.piece.type === "king") counts.redKingsCount++;
      } else if (square.piece?.color === PLAYER_BLACK) {
        counts.black++;
        if (square.piece.type === "king") counts.blackKingsCount++;
      }
    }
  }
  return counts;
}
