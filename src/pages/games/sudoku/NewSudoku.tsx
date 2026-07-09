import * as React from "react";
import { Button } from "@/components/ui/button";
import { Sudoku } from "./components/Sudoku";
import { EraseButton, UndoButton } from "./components/SudokuMenuControls";
import SudokuMenuNumbers from "./components/SudokuMenuNumbers";
import { INITIAL_CREATE_NEW_SUDOKU_STATE, SudokuProvider, useSudoku } from "./context/SudokuContext";
import { solve } from "@/src/lib/sudoku/engine/solverAC3";
import { CellCoordinates, SimpleSudoku } from "@/src/lib/sudoku/engine/types";
import { cellsToSimpleSudoku } from "@/src/lib/sudoku/engine/utility";
import { useSudokuUniqueWorker } from "@/src/lib/sudoku/utils/useSudokuUniqueWorker";
import { useGridKeyboardShortcuts } from "./shortcuts/useSudokuKeyboardShortcuts";

const NewSudokuInner = ({ saveSudoku }: { saveSudoku: (sudoku: SimpleSudoku) => Promise<void> }) => {
  const { state: sudokuState, setNumber, clearNumber, setNotes, undo, redo } = useSudoku();
  const canUndo = sudokuState.history.length > 1;
  const [activeCell, setActiveCell] = React.useState<CellCoordinates | undefined>(undefined);
  const currentSudoku = sudokuState.current.map((cell) => ({
    ...cell,
    number: cell.number,
    initial: cell.number !== 0,
  }));
  const simpleSudoku = cellsToSimpleSudoku(currentSudoku);

  const [isSaving, setIsSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const { checkUniqueness, isChecking } = useSudokuUniqueWorker();

  useGridKeyboardShortcuts({
    enabled: true,
    sudoku: currentSudoku,
    activeCell,
    notesMode: false,
    showHints: false,
    selectCell: (cell) => setActiveCell(cell),
    setNumber,
    setNotes,
    clearNumber,
    undo,
    redo,
  });

  const saveSudokuLocal = async () => {
    setIsSaving(true);
    setErrors([]);
    const solvedSudoku = solve(simpleSudoku);
    if (solvedSudoku.sudoku === null) {
      setErrors(["This sudoku is not solvable."]);
      setIsSaving(false);
      return;
    }

    const { isUnique, error } = await checkUniqueness(simpleSudoku);
    if (error) {
      setErrors([`Error checking uniqueness: ${error}`]);
      setIsSaving(false);
      return;
    }
    if (!isUnique) {
      setErrors(["This sudoku is not unique. It has multiple solutions."]);
      setIsSaving(false);
      return;
    }
    await saveSudoku(simpleSudoku);
    setIsSaving(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <main>
        <Sudoku
          sudoku={currentSudoku}
          showHints={false}
          showWrongEntries={false}
          showConflicts={true}
          shouldShowMenu={false}
          setNumber={setNumber}
          clearNumber={clearNumber}
          setNotes={() => {}}
          notesMode={false}
          showMenu={() => {}}
          hideMenu={() => {}}
          activeCell={activeCell}
          selectCell={setActiveCell}
        >
          <></>
        </Sudoku>
      </main>
      <div className="flex flex-col gap-4">
        <SudokuMenuNumbers
          notesMode={false}
          showOccurrences={false}
          activeCell={activeCell}
          sudoku={currentSudoku}
          showHints={false}
          setNumber={setNumber}
          setNotes={() => {}}
        />
        <div className="grid w-full grid-cols-4 gap-2">
          <UndoButton canUndo={canUndo} undo={undo} />
          <EraseButton activeCellCoordinates={activeCell} clearCell={clearNumber} />
        </div>
        <div>
          <Button
            disabled={isSaving || isChecking}
            className="bg-teal-600 dark:bg-teal-600 text-white"
            onClick={saveSudokuLocal}
          >
            {isSaving ? "Saving..." : isChecking ? "Checking uniqueness..." : "Save sudoku"}
          </Button>
          {errors.length > 0 && (
            <ul className="text-red-800 dark:text-red-200 mt-2 bg-red-100 dark:bg-red-900 p-2 rounded-sm list-disc list-inside pl-4">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const NewSudoku = ({ saveSudoku }: { saveSudoku: (sudoku: SimpleSudoku) => Promise<void> }) => {
  return (
    <div>
      <SudokuProvider initialState={INITIAL_CREATE_NEW_SUDOKU_STATE}>
        <NewSudokuInner saveSudoku={saveSudoku} />
      </SudokuProvider>
    </div>
  );
};

export default NewSudoku;
