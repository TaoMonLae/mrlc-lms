import React, { createContext, useContext, useReducer, useCallback, ReactNode } from "react";
import { CellCoordinates } from "@/src/lib/sudoku/engine/types";
import {
  GameState,
  GameStateMachine,
  INITIAL_GAME_STATE,
  gameReducer,
  NEW_GAME,
  SET_GAME_STATE,
  WON_GAME,
  PAUSE_GAME,
  CONTINUE_GAME,
  SELECT_CELL,
  SHOW_MENU,
  HIDE_MENU,
  RESTART_GAME,
  ACTIVATE_NOTES_MODE,
  DEACTIVATE_NOTES_MODE,
  UPDATE_TIMER,
  RESET_GAME,
  COPY_NOTES,
} from "@/src/lib/sudoku/game/state";

export { GameStateMachine, INITIAL_GAME_STATE };
export type { GameState };

interface GameContextType {
  state: GameState;
  newGame: (sudokuIndex: number, sudokuCollectionName: string, timesSolved: number, previousTimes: number[]) => void;
  setGameState: (state: GameState) => void;
  wonGame: () => void;
  pauseGame: () => void;
  continueGame: () => void;
  selectCell: (cellCoordinates: CellCoordinates) => void;
  showMenu: (showNotes?: boolean) => void;
  hideMenu: () => void;
  restartGame: (
    sudokuIndex: number,
    sudokuCollectionName: string,
    timesSolved: number,
    previousTimes: number[],
  ) => void;
  activateNotesMode: () => void;
  deactivateNotesMode: () => void;
  updateTimer: (secondsPlayed: number) => void;
  resetGame: () => void;
  copyNotes: (notes: number[]) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameProviderProps {
  children: ReactNode;
  initialState?: GameState;
}

export function GameProvider({ children, initialState = INITIAL_GAME_STATE }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const newGame = useCallback(
    (sudokuIndex: number, sudokuCollectionName: string, timesSolved: number, previousTimes: number[]) => {
      dispatch({ type: NEW_GAME, sudokuIndex, sudokuCollectionName, timesSolved, previousTimes });
    },
    [],
  );

  const setGameState = useCallback((gameState: GameState) => {
    dispatch({ type: SET_GAME_STATE, state: gameState });
  }, []);

  const wonGame = useCallback(() => {
    dispatch({ type: WON_GAME });
  }, []);

  const pauseGame = useCallback(() => {
    dispatch({ type: PAUSE_GAME });
  }, []);

  const continueGame = useCallback(() => {
    dispatch({ type: CONTINUE_GAME });
  }, []);

  const selectCell = useCallback((cellCoordinates: CellCoordinates) => {
    dispatch({ type: SELECT_CELL, cellCoordinates });
  }, []);

  const showMenu = useCallback((showNotes?: boolean) => {
    dispatch({ type: SHOW_MENU, showNotes });
  }, []);

  const hideMenu = useCallback(() => {
    dispatch({ type: HIDE_MENU });
  }, []);

  const restartGame = useCallback(
    (sudokuIndex: number, sudokuCollectionName: string, timesSolved: number, previousTimes: number[]) => {
      dispatch({ type: RESTART_GAME, sudokuIndex, sudokuCollectionName, timesSolved, previousTimes });
    },
    [],
  );

  const activateNotesMode = useCallback(() => {
    dispatch({ type: ACTIVATE_NOTES_MODE });
  }, []);

  const deactivateNotesMode = useCallback(() => {
    dispatch({ type: DEACTIVATE_NOTES_MODE });
  }, []);

  const updateTimer = useCallback((secondsPlayed: number) => {
    dispatch({ type: UPDATE_TIMER, secondsPlayed });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: RESET_GAME });
  }, []);

  const copyNotes = useCallback((notes: number[]) => {
    dispatch({ type: COPY_NOTES, notes });
  }, []);

  const value = {
    state,
    newGame,
    setGameState,
    wonGame,
    pauseGame,
    continueGame,
    selectCell,
    showMenu,
    hideMenu,
    restartGame,
    activateNotesMode,
    deactivateNotesMode,
    updateTimer,
    resetGame,
    copyNotes,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
