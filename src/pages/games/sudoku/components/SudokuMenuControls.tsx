import * as React from "react";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { CellCoordinates } from "@/src/lib/sudoku/engine/types";

export const UndoButton: React.FC<{
  canUndo: boolean;
  undo: () => void;
}> = ({ canUndo, undo }) => {
  return (
    <Button variant="outline" disabled={!canUndo} onClick={undo}>
      Undo
    </Button>
  );
};

export const EraseButton: React.FC<{
  activeCellCoordinates: CellCoordinates | undefined;
  clearCell: (cellCoordinates: CellCoordinates) => void;
}> = ({ activeCellCoordinates, clearCell }) => {
  return (
    <Button variant="outline" onClick={() => activeCellCoordinates && clearCell(activeCellCoordinates)}>
      Erase
    </Button>
  );
};

const NotesButton: React.FC<{
  notesMode: boolean;
  activateNotesMode: () => void;
  deactivateNotesMode: () => void;
}> = ({ notesMode, activateNotesMode, deactivateNotesMode }) => {
  return (
    <Button
      variant="outline"
      onClick={() => (notesMode ? deactivateNotesMode() : activateNotesMode())}
      className="relative"
    >
      <div
        className={clsx("absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full px-2 text-sm md:text-base", {
          "bg-teal-700 text-white": !notesMode,
          "bg-sky-700 text-white": notesMode,
        })}
      >{`${notesMode ? "ON" : "OFF"}`}</div>
      <div>Notes</div>
    </Button>
  );
};

const HintButton: React.FC<{
  activeCellCoordinates: CellCoordinates;
  getHint: (cellCoordinates: CellCoordinates) => void;
}> = ({ activeCellCoordinates, getHint }) => {
  return (
    <Button variant="outline" onClick={() => activeCellCoordinates && getHint(activeCellCoordinates)}>
      Hint
    </Button>
  );
};

const SudokuMenuControls: React.FC<{
  notesMode: boolean;
  activeCellCoordinates: CellCoordinates;
  clearCell: (cellCoordinates: CellCoordinates) => void;
  activateNotesMode: () => void;
  deactivateNotesMode: () => void;
  getHint: (cellCoordinates: CellCoordinates) => void;
  canUndo: boolean;
  undo: () => void;
}> = ({
  notesMode,
  activeCellCoordinates,
  clearCell,
  activateNotesMode,
  deactivateNotesMode,
  getHint,
  canUndo,
  undo,
}) => {
  return (
    <div className="grid w-full grid-cols-4 gap-2">
      <UndoButton canUndo={canUndo} undo={undo} />
      <EraseButton activeCellCoordinates={activeCellCoordinates} clearCell={clearCell} />
      <NotesButton
        notesMode={notesMode}
        activateNotesMode={activateNotesMode}
        deactivateNotesMode={deactivateNotesMode}
      />
      <HintButton activeCellCoordinates={activeCellCoordinates} getHint={getHint} />
    </div>
  );
};

export default SudokuMenuControls;
