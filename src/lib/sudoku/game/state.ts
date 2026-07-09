// Pure (non-React) game/sudoku state types + reducers, shared between the
// React contexts (src/pages/games/sudoku/context/*) and the localStorage
// persistence layer (src/lib/sudoku/database/playedSudokus.ts). Kept here to
// avoid a pages -> lib -> pages import cycle.

import { Cell, CellCoordinates, SimpleSudoku } from "../engine/types";
import { simpleSudokuToCells, squareIndex } from "../engine/utility";
import { localStorageUserPreferencesRepository } from "../database/userPreferences";

// ---------------------------------------------------------------------------
// Game state (pause/running, current index, timer, notes mode, ...)
// ---------------------------------------------------------------------------

export enum GameStateMachine {
  running = "RUNNING",
  paused = "PAUSED",
}

export interface GameState {
  activeCellCoordinates?: CellCoordinates;
  sudokuCollectionName: string;
  notesMode: boolean;
  showNotes: boolean;
  showMenu: boolean;
  state: GameStateMachine;
  sudokuIndex: number;
  won: boolean;
  timesSolved: number;
  previousTimes: number[];
  secondsPlayed: number;
  clipboardNotes: number[] | null;
}

export const INITIAL_GAME_STATE: GameState = {
  activeCellCoordinates: undefined,
  sudokuCollectionName: "easy",
  notesMode: false,
  showMenu: false,
  showNotes: false,
  state: GameStateMachine.paused,
  sudokuIndex: 0,
  secondsPlayed: 0,
  timesSolved: 0,
  previousTimes: [],
  won: false,
  clipboardNotes: null,
};

export const NEW_GAME = "game/NEW_GAME";
export const WON_GAME = "game/WON_GAME";
export const PAUSE_GAME = "game/PAUSE_GAME";
export const CONTINUE_GAME = "game/CONTINUE_GAME";
export const SET_GAME_STATE = "game/SET_GAME_STATE";
export const RESTART_GAME = "game/RESTART_GAME";
export const SHOW_MENU = "game/SHOW_MENU";
export const HIDE_MENU = "game/HIDE_MENU";
export const SELECT_CELL = "game/SELECT_MENU";
export const ACTIVATE_NOTES_MODE = "game/ACTIVATE_NOTES_MODE";
export const DEACTIVATE_NOTES_MODE = "game/DEACTIVATE_NOTES_MODE";
export const UPDATE_TIMER = "game/UPDATE_TIME";
export const RESET_GAME = "game/RESET_GAME";
export const COPY_NOTES = "game/COPY_NOTES";

export type GameAction =
  | {
      type: typeof NEW_GAME;
      sudokuIndex: number;
      sudokuCollectionName: string;
      timesSolved: number;
      previousTimes: number[];
    }
  | { type: typeof SET_GAME_STATE; state: GameState }
  | { type: typeof PAUSE_GAME }
  | { type: typeof CONTINUE_GAME }
  | {
      type: typeof RESTART_GAME;
      sudokuIndex: number;
      sudokuCollectionName: string;
      timesSolved: number;
      previousTimes: number[];
    }
  | { type: typeof SHOW_MENU; showNotes?: boolean }
  | { type: typeof HIDE_MENU }
  | { type: typeof SELECT_CELL; cellCoordinates: CellCoordinates }
  | { type: typeof ACTIVATE_NOTES_MODE }
  | { type: typeof DEACTIVATE_NOTES_MODE }
  | { type: typeof UPDATE_TIMER; secondsPlayed: number }
  | { type: typeof RESET_GAME }
  | { type: typeof WON_GAME }
  | { type: typeof COPY_NOTES; notes: number[] };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case SET_GAME_STATE:
      return action.state;
    case NEW_GAME: {
      const currentPreferences = localStorageUserPreferencesRepository.getPreferences();
      return {
        ...INITIAL_GAME_STATE,
        sudokuIndex: action.sudokuIndex,
        sudokuCollectionName: action.sudokuCollectionName,
        timesSolved: action.timesSolved,
        previousTimes: action.previousTimes,
        state: GameStateMachine.running,
        ...currentPreferences,
      };
    }
    case WON_GAME: {
      const justWon = state.won === false;
      return {
        ...state,
        won: true,
        state: GameStateMachine.paused,
        timesSolved: justWon ? state.timesSolved + 1 : state.timesSolved,
        previousTimes: justWon ? [...state.previousTimes, state.secondsPlayed] : state.previousTimes,
      };
    }
    case PAUSE_GAME:
      return {
        ...state,
        state: GameStateMachine.paused,
      };
    case CONTINUE_GAME:
      // You can't continue a game that is won.
      if (state.won) {
        return state;
      }
      return {
        ...state,
        state: GameStateMachine.running,
      };
    case RESTART_GAME:
      return {
        ...state,
        sudokuIndex: action.sudokuIndex,
        sudokuCollectionName: action.sudokuCollectionName,
        timesSolved: action.timesSolved,
        secondsPlayed: 0,
        previousTimes: action.previousTimes,
        state: GameStateMachine.running,
        won: false,
      };
    case SHOW_MENU:
      return {
        ...state,
        showMenu: true,
        showNotes: action.showNotes || false,
      };
    case HIDE_MENU:
      return {
        ...state,
        showMenu: false,
        showNotes: false,
      };
    case SELECT_CELL:
      return {
        ...state,
        activeCellCoordinates: action.cellCoordinates,
      };
    case ACTIVATE_NOTES_MODE:
      return {
        ...state,
        notesMode: true,
      };
    case DEACTIVATE_NOTES_MODE:
      return {
        ...state,
        notesMode: false,
      };
    case UPDATE_TIMER:
      return {
        ...state,
        secondsPlayed: action.secondsPlayed,
      };
    case RESET_GAME:
      return {
        ...state,
        secondsPlayed: 0,
        state: GameStateMachine.running,
        won: false,
      };
    case COPY_NOTES:
      return {
        ...state,
        clipboardNotes: action.notes,
      };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Sudoku grid state (cells, notes, undo history)
// ---------------------------------------------------------------------------

export interface SudokuState {
  current: Cell[];
  history: Cell[][];
  historyIndex: number;
}

export const emptyGrid: Cell[] = simpleSudokuToCells([
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
]);

export const INITIAL_CREATE_NEW_SUDOKU_STATE: SudokuState = {
  current: emptyGrid,
  history: [emptyGrid],
  historyIndex: 0,
};

export const SET_SUDOKU = "sudoku/SET_SUDOKU";
export const SET_SUDOKU_STATE = "sudoku/SET_SUDOKU_STATE";
export const GET_HINT = "sudoku/GET_HINT";
export const CLEAR_CELL = "sudoku/CLEAR_CELL";
export const SET_NOTES = "sudoku/SET_NOTES";
export const SET_NUMBER = "sudoku/SET_NUMBER";
export const CLEAR_NUMBER = "sudoku/CLEAR_NUMBER";
export const UNDO = "sudoku/UNDO";
export const REDO = "sudoku/REDO";

export type SudokuAction =
  | { type: typeof SET_SUDOKU; sudoku: Cell[] }
  | { type: typeof SET_SUDOKU_STATE; sudokuState: SudokuState }
  | { type: typeof GET_HINT; cellCoordinates: CellCoordinates }
  | { type: typeof CLEAR_CELL; cellCoordinates: CellCoordinates }
  | { type: typeof SET_NOTES; cellCoordinates: CellCoordinates; notes: number[] }
  | { type: typeof SET_NUMBER; cellCoordinates: CellCoordinates; number: number }
  | { type: typeof CLEAR_NUMBER; cellCoordinates: CellCoordinates }
  | { type: typeof UNDO }
  | { type: typeof REDO };

// When a number is set, remove conflicting notes.
function fixSudokuNotes(sudoku: Cell[], newCell: Cell) {
  sudoku = sudoku.map((cell) => {
    if (cell.x === newCell.x) {
      return { ...cell, notes: cell.notes.filter((n) => n !== newCell.number) };
    }
    return cell;
  });

  sudoku = sudoku.map((cell) => {
    if (cell.y === newCell.y) {
      return { ...cell, notes: cell.notes.filter((n) => n !== newCell.number) };
    }
    return cell;
  });

  return sudoku.map((cell) => {
    if (squareIndex(cell.x, cell.y) === squareIndex(newCell.x, newCell.y)) {
      return { ...cell, notes: cell.notes.filter((n) => n !== newCell.number) };
    }
    return cell;
  });
}

export function sudokuReducer(state: SudokuState, action: SudokuAction): SudokuState {
  switch (action.type) {
    case SET_SUDOKU_STATE:
      return action.sudokuState;
    case SET_SUDOKU:
      return {
        current: action.sudoku,
        history: [action.sudoku],
        historyIndex: 0,
      };
    case UNDO:
      if (state.historyIndex < state.history.length - 1) {
        return {
          ...state,
          current: state.history[state.historyIndex + 1],
          historyIndex: state.historyIndex + 1,
        };
      }
      return state;
    case REDO:
      if (state.historyIndex > 0) {
        return {
          ...state,
          current: state.history[state.historyIndex - 1],
          historyIndex: state.historyIndex - 1,
        };
      }
      return state;
    case GET_HINT:
    case CLEAR_CELL:
    case SET_NOTES:
    case SET_NUMBER:
    case CLEAR_NUMBER: {
      const { x, y } = action.cellCoordinates;
      let newGrid = state.current.map((cell) => {
        const isCell = cell.x === x && cell.y === y;
        if (isCell && !cell.initial) {
          switch (action.type) {
            case SET_NOTES:
              return { ...cell, notes: action.notes, number: 0 };
            case SET_NUMBER:
              return { ...cell, number: action.number, notes: [] };
            case CLEAR_NUMBER:
              return { ...cell, number: 0 };
            case CLEAR_CELL:
              return { ...cell, number: 0, notes: [] };
            case GET_HINT:
              return { ...cell, number: cell.solution, notes: [] };
            default:
              return cell;
          }
        }
        return cell;
      });

      // Fix notes when setting a number
      if (action.type === SET_NUMBER) {
        const newCell = newGrid.find((cell) => cell.x === x && cell.y === y);
        if (newCell) {
          newGrid = fixSudokuNotes(newGrid, newCell);
        }
      }

      // Add to history
      const newHistory = [newGrid, ...state.history];

      return {
        current: newGrid,
        history: newHistory,
        historyIndex: 0,
      };
    }
    default:
      return state;
  }
}

export function initialSudokuStateFor(sudoku: SimpleSudoku, solution: SimpleSudoku): SudokuState {
  const cells = simpleSudokuToCells(sudoku, solution);
  return {
    current: cells,
    history: [cells],
    historyIndex: 0,
  };
}
