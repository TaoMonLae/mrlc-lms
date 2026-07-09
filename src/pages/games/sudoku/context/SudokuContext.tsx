import React, { createContext, useContext, useReducer, useCallback, ReactNode } from "react";
import { Cell, SimpleSudoku, CellCoordinates } from "@/src/lib/sudoku/engine/types";
import {
  SudokuState,
  emptyGrid,
  INITIAL_CREATE_NEW_SUDOKU_STATE,
  sudokuReducer,
  SET_SUDOKU,
  SET_SUDOKU_STATE,
  GET_HINT,
  CLEAR_CELL,
  SET_NOTES,
  SET_NUMBER,
  CLEAR_NUMBER,
  UNDO,
  REDO,
  initialSudokuStateFor,
} from "@/src/lib/sudoku/game/state";

export { emptyGrid, INITIAL_CREATE_NEW_SUDOKU_STATE };
export type { SudokuState };

interface SudokuContextType {
  state: SudokuState;
  setSudoku: (sudoku: SimpleSudoku, solution: SimpleSudoku) => void;
  setSudokuState: (sudokuState: SudokuState) => void;
  getHint: (cellCoordinates: CellCoordinates) => void;
  clearCell: (cellCoordinates: CellCoordinates) => void;
  setNotes: (cellCoordinates: CellCoordinates, notes: number[]) => void;
  setNumber: (cellCoordinates: CellCoordinates, number: number) => void;
  clearNumber: (cellCoordinates: CellCoordinates) => void;
  undo: () => void;
  redo: () => void;
}

const SudokuContext = createContext<SudokuContextType | undefined>(undefined);

interface SudokuProviderProps {
  children: ReactNode;
  initialState: SudokuState;
}

export function SudokuProvider({ children, initialState }: SudokuProviderProps) {
  const [state, dispatch] = useReducer(sudokuReducer, initialState);

  const setSudoku = useCallback((sudoku: SimpleSudoku, solution: SimpleSudoku) => {
    const cells = initialSudokuStateFor(sudoku, solution).current;
    dispatch({ type: SET_SUDOKU, sudoku: cells });
  }, []);

  const setSudokuState = useCallback((sudokuState: SudokuState) => {
    dispatch({ type: SET_SUDOKU_STATE, sudokuState });
  }, []);

  const getHint = useCallback((cellCoordinates: CellCoordinates) => {
    dispatch({ type: GET_HINT, cellCoordinates });
  }, []);

  const clearCell = useCallback((cellCoordinates: CellCoordinates) => {
    dispatch({ type: CLEAR_CELL, cellCoordinates });
  }, []);

  const setNotes = useCallback((cellCoordinates: CellCoordinates, notes: number[]) => {
    dispatch({ type: SET_NOTES, cellCoordinates, notes });
  }, []);

  const setNumber = useCallback((cellCoordinates: CellCoordinates, number: number) => {
    dispatch({ type: SET_NUMBER, cellCoordinates, number });
  }, []);

  const clearNumber = useCallback((cellCoordinates: CellCoordinates) => {
    dispatch({ type: CLEAR_NUMBER, cellCoordinates });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: UNDO });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: REDO });
  }, []);

  const value = {
    state,
    setSudoku,
    setSudokuState,
    getHint,
    clearCell,
    setNotes,
    setNumber,
    clearNumber,
    undo,
    redo,
  };

  return <SudokuContext.Provider value={value}>{children}</SudokuContext.Provider>;
}

export function useSudoku() {
  const context = useContext(SudokuContext);
  if (context === undefined) {
    throw new Error("useSudoku must be used within a SudokuProvider");
  }
  return context;
}

// re-export for callers that just want a plain Cell type
export type { Cell };
