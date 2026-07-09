import { GameState } from "../game/state";
import { SudokuState } from "../game/state";
import { Cell } from "../engine/types";
import { stringifySudoku, cellsToSimpleSudoku } from "../engine/utility";

const STORAGE_KEY_V_1_6_PREFIX = "super_sudoku_1_6_";
const STORAGE_CURRENTLY_PLAYING_SUDOKU_KEY = "super_sudoku_currently_playing_sudoku";

export interface StoredPlayedSudokuState {
  game: GameState;
  sudoku: Cell[];
}

export function getCurrentSudokuFromStorage(): StoredPlayedSudokuState | undefined {
  const sudokuKey = localStorage.getItem(STORAGE_CURRENTLY_PLAYING_SUDOKU_KEY);
  if (sudokuKey) {
    return getSudokuFromStorage(sudokuKey);
  }
  return undefined;
}

function getSudokuFromStorage(sudokuKey: string): StoredPlayedSudokuState | undefined {
  const sudokuFromStorage = localStorage.getItem(createSudokuKey(sudokuKey));
  if (sudokuFromStorage) {
    const sudoku = JSON.parse(sudokuFromStorage) as StoredPlayedSudokuState;
    // There is a bug that the collection name might not be set, then we just use the difficulty.
    const difficulty = (sudoku.game as unknown as { difficulty?: string }).difficulty;
    if (!sudoku.game.sudokuCollectionName && difficulty) {
      sudoku.game.sudokuCollectionName = difficulty;
    }
    return sudoku;
  }
  return undefined;
}

function createSudokuKey(stringifiedSudoku: string) {
  return STORAGE_KEY_V_1_6_PREFIX + stringifiedSudoku;
}

const saveCurrentSudokuToLocalStorage = (game: GameState, sudoku: SudokuState) => {
  const stringifiedSudoku = stringifySudoku(cellsToSimpleSudoku(sudoku.current));
  const sudokuKey = createSudokuKey(stringifiedSudoku);
  // We do not save the history as it would take too much space.
  try {
    localStorage.setItem(sudokuKey, JSON.stringify({ game, sudoku: sudoku.current }));
    // TODO: this is problematic with multiple open windows, as the .active gets overwritten.
    localStorage.setItem(STORAGE_CURRENTLY_PLAYING_SUDOKU_KEY, stringifiedSudoku);
  } catch (e) {
    console.error("LocalStorage is not supported! No Saving possible.", e);
  }
};

interface PlayedSudokuRepository {
  getPlayedSudokus(): string[];
  getCurrentSudokuKey(): string | null;
  saveCurrentSudokuKey(sudokuKey: string): void;
  getSudokuState(sudokuKey: string): StoredPlayedSudokuState | undefined;
  saveSudokuState(game: GameState, sudoku: SudokuState): void;
  removeSudokuState(sudokuKey: string): void;
}

export const localStoragePlayedSudokuRepository: PlayedSudokuRepository = {
  getPlayedSudokus(): string[] {
    if (typeof localStorage === "undefined") return [];
    return Object.keys(localStorage).filter((key) => key.startsWith(STORAGE_KEY_V_1_6_PREFIX));
  },
  getCurrentSudokuKey(): string | null {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(STORAGE_CURRENTLY_PLAYING_SUDOKU_KEY);
  },
  saveCurrentSudokuKey(sudokuKey: string): void {
    localStorage.setItem(STORAGE_CURRENTLY_PLAYING_SUDOKU_KEY, sudokuKey);
  },
  getSudokuState(sudokuKey: string): StoredPlayedSudokuState | undefined {
    return getSudokuFromStorage(sudokuKey);
  },
  saveSudokuState(game: GameState, sudoku: SudokuState): void {
    saveCurrentSudokuToLocalStorage(game, sudoku);
  },
  removeSudokuState(sudokuKey: string): void {
    localStorage.removeItem(createSudokuKey(sudokuKey));
  },
};
