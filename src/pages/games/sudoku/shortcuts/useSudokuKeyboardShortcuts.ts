import * as React from "react";
import { Cell, CellCoordinates } from "@/src/lib/sudoku/engine/types";
import { SUDOKU_COORDINATES, SUDOKU_NUMBERS } from "@/src/lib/sudoku/engine/utility";
import SudokuGame from "@/src/lib/sudoku/game/SudokuGame";

// Reimplementation of the original app's hotkeys-js based keyboard shortcuts
// using plain `keydown` handling, so we don't need to add hotkeys-js as a
// dependency for this fairly small amount of behavior.

const minCoordinate = SUDOKU_COORDINATES[0];
const maxCoordinate = SUDOKU_COORDINATES[SUDOKU_COORDINATES.length - 1];

interface GridShortcutHandlers {
  enabled: boolean;
  sudoku: Cell[];
  activeCell: CellCoordinates | undefined;
  notesMode: boolean;
  showHints: boolean;
  selectCell: (cell: Cell) => void;
  setNumber: (cell: CellCoordinates, number: number) => void;
  setNotes: (cell: CellCoordinates, notes: number[]) => void;
  clearNumber: (cell: CellCoordinates) => void;
  getHint?: (cell: CellCoordinates) => void;
  undo: () => void;
  redo: () => void;
  onEscape?: () => void;
  onToggleNotes?: () => void;
  clipboardNotes?: number[] | null;
  copyNotes?: (notes: number[]) => void;
}

/**
 * Wires up: arrow key navigation, number keys 1-9, backspace to clear,
 * ctrl/cmd+z undo, ctrl/cmd+y redo, and (when provided) escape, "n" for
 * notes mode, "h" for hint, and ctrl/cmd+c / ctrl/cmd+v for note copy/paste.
 */
export function useGridKeyboardShortcuts(handlers: GridShortcutHandlers) {
  const stateRef = React.useRef(handlers);
  React.useEffect(() => {
    stateRef.current = handlers;
  });

  React.useEffect(() => {
    if (!handlers.enabled) return;

    const getCellByXY = (x: number, y: number) => stateRef.current.sudoku.find((cell) => cell.x === x && cell.y === y);

    const setDefault = () => {
      if (stateRef.current.sudoku.length > 0) {
        stateRef.current.selectCell(stateRef.current.sudoku[0]);
      }
    };

    const moveActiveCell = (dx: number, dy: number) => {
      const currentCell = stateRef.current.activeCell;
      if (currentCell === undefined) {
        return setDefault();
      }
      const newX = Math.min(Math.max(currentCell.x + dx, minCoordinate), maxCoordinate);
      const newY = Math.min(Math.max(currentCell.y + dy, minCoordinate), maxCoordinate);
      const nextCell = getCellByXY(newX, newY);
      if (nextCell) stateRef.current.selectCell(nextCell);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditableTarget =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isEditableTarget) return;

      const key = event.key;
      const mod = event.ctrlKey || event.metaKey;

      if (key === "ArrowUp") {
        event.preventDefault();
        moveActiveCell(0, -1);
        return;
      }
      if (key === "ArrowDown") {
        event.preventDefault();
        moveActiveCell(0, 1);
        return;
      }
      if (key === "ArrowLeft") {
        event.preventDefault();
        moveActiveCell(-1, 0);
        return;
      }
      if (key === "ArrowRight") {
        event.preventDefault();
        moveActiveCell(1, 0);
        return;
      }

      if (key === "Escape" && stateRef.current.onEscape) {
        stateRef.current.onEscape();
        return;
      }

      if (key.toLowerCase() === "n" && stateRef.current.onToggleNotes) {
        stateRef.current.onToggleNotes();
        return;
      }

      if (key.toLowerCase() === "h" && stateRef.current.getHint) {
        const { activeCell, getHint } = stateRef.current;
        if (activeCell) getHint(activeCell);
        return;
      }

      if (mod && key.toLowerCase() === "z") {
        event.preventDefault();
        stateRef.current.undo();
        return;
      }
      if (mod && key.toLowerCase() === "y") {
        event.preventDefault();
        stateRef.current.redo();
        return;
      }
      if (mod && key.toLowerCase() === "c" && stateRef.current.copyNotes) {
        const { activeCell, sudoku, copyNotes } = stateRef.current;
        const cell = activeCell && sudoku.find((c) => c.x === activeCell.x && c.y === activeCell.y);
        if (cell && cell.notes.length > 0) copyNotes(cell.notes);
        return;
      }
      if (mod && key.toLowerCase() === "v" && stateRef.current.copyNotes) {
        const { activeCell, clipboardNotes, setNotes } = stateRef.current;
        if (activeCell && clipboardNotes && clipboardNotes.length > 0) {
          setNotes(activeCell, clipboardNotes);
        }
        return;
      }

      if (key === "Backspace" || key === "Delete") {
        const { activeCell, sudoku, clearNumber } = stateRef.current;
        const cell = activeCell && sudoku.find((c) => c.x === activeCell.x && c.y === activeCell.y);
        if (cell && !cell.initial) clearNumber(activeCell!);
        return;
      }

      const n = Number(key);
      if (SUDOKU_NUMBERS.includes(n)) {
        const { activeCell, sudoku, notesMode, showHints, setNumber, setNotes } = stateRef.current;
        const cell = activeCell && sudoku.find((c) => c.x === activeCell.x && c.y === activeCell.y);
        if (!activeCell || !cell || cell.initial) return;

        if (notesMode) {
          const conflicting = SudokuGame.conflictingFields(sudoku);
          const userNotes = cell.notes;
          const conflictingCell = conflicting[activeCell.y * 9 + activeCell.x];
          const autoNotes = showHints ? conflictingCell.possibilities : [];
          const notesToUse = userNotes.length === 0 && autoNotes.length > 0 ? autoNotes : userNotes;
          const newNotes = notesToUse.includes(n) ? notesToUse.filter((note) => note !== n) : [...userNotes, n];
          setNotes(activeCell, newNotes);
        } else {
          setNumber(activeCell, n);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlers.enabled]);
}
