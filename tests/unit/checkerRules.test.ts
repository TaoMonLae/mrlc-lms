import assert from "node:assert/strict";
import test from "node:test";
import {
  applyMove,
  BOARD_SIZE,
  getAllValidMoves,
  getTurnActions,
  getValidMovesForPiece,
  type Board,
  PLAYER_BLACK,
  PLAYER_RED,
} from "../../src/pages/games/checkers/checkerRules";

function emptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({ piece: null })),
  );
}

test("kings can move and capture in both forward and backward directions", () => {
  const board = emptyBoard();
  board[3][2].piece = { color: PLAYER_RED, type: "king" };

  const destinations = getValidMovesForPiece(board, 3, 2)
    .map((move) => `${move.to.row},${move.to.col}`)
    .sort();
  assert.deepEqual(destinations, ["2,1", "2,3", "4,1", "4,3"]);

  board[4][3].piece = { color: PLAYER_BLACK, type: "regular" };
  const backwardCapture = getValidMovesForPiece(board, 3, 2);
  assert.equal(backwardCapture.length, 1);
  assert.deepEqual(backwardCapture[0].to, { row: 5, col: 4 });
  assert.equal(backwardCapture[0].isJump, true);
});

test("a required capture cannot be bypassed by moving another piece", () => {
  const board = emptyBoard();
  board[4][3].piece = { color: PLAYER_RED, type: "king" };
  board[3][4].piece = { color: PLAYER_BLACK, type: "regular" };
  board[6][1].piece = { color: PLAYER_RED, type: "regular" };

  const moves = getAllValidMoves(board, PLAYER_RED);
  assert.equal(moves.length, 1);
  assert.equal(moves[0].isJump, true);
  assert.deepEqual(moves[0].from, { row: 4, col: 3 });
});

test("promotion and AI simulation do not mutate the source board", () => {
  const board = emptyBoard();
  board[1][2].piece = { color: PLAYER_RED, type: "regular" };
  const move = getValidMovesForPiece(board, 1, 2).find((candidate) => candidate.to.row === 0)!;

  const result = applyMove(board, move);
  assert.equal(result.promoted, true);
  assert.equal(result.board[0][1].piece?.type, "king");
  assert.equal(board[1][2].piece?.type, "regular");
  assert.equal(board[0][1].piece, null);
});

test("a king multi-jump is represented as one complete AI turn", () => {
  const board = emptyBoard();
  board[1][0].piece = { color: PLAYER_BLACK, type: "king" };
  board[2][1].piece = { color: PLAYER_RED, type: "regular" };
  board[4][3].piece = { color: PLAYER_RED, type: "regular" };

  const actions = getTurnActions(board, PLAYER_BLACK);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].moves.length, 2);
  assert.deepEqual(actions[0].moves.map((move) => move.to), [
    { row: 3, col: 2 },
    { row: 5, col: 4 },
  ]);
  assert.equal(actions[0].board[5][4].piece?.type, "king");
  assert.equal(actions[0].board[2][1].piece, null);
  assert.equal(actions[0].board[4][3].piece, null);
});

test("promotion ends a capture turn before the new king moves backward", () => {
  const board = emptyBoard();
  board[2][1].piece = { color: PLAYER_RED, type: "regular" };
  board[1][2].piece = { color: PLAYER_BLACK, type: "regular" };
  board[1][4].piece = { color: PLAYER_BLACK, type: "regular" };

  const actions = getTurnActions(board, PLAYER_RED);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].moves.length, 1);
  assert.equal(actions[0].board[0][3].piece?.type, "king");
  assert.ok(getValidMovesForPiece(actions[0].board, 0, 3).some((move) => move.to.row === 2));
});
