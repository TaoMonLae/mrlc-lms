import * as React from "react";
import SudokuDataGate from "./SudokuDataGate";
import Game from "./Game";
import { getStartSudoku } from "@/src/lib/sudoku/game/sudokus";
import { initialSudokuStateFor, emptyGrid } from "@/src/lib/sudoku/game/state";
import { SudokuState } from "./context/SudokuContext";

function PlayInner() {
  // Computed once the puzzle data has loaded (SudokuDataGate guarantees this
  // has resolved by the time this component mounts).
  const initialSudokuState: SudokuState = React.useMemo(() => {
    try {
      const { sudoku } = getStartSudoku();
      if (sudoku) {
        return initialSudokuStateFor(sudoku.sudoku, sudoku.solution);
      }
    } catch (err) {
      console.error("Failed to compute starting sudoku", err);
    }
    return { current: emptyGrid, history: [emptyGrid], historyIndex: 0 };
  }, []);

  return <Game initialSudokuState={initialSudokuState} />;
}

export default function SudokuPlayPage() {
  return (
    <SudokuDataGate>
      <PlayInner />
    </SudokuDataGate>
  );
}
