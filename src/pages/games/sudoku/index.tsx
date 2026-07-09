import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SudokuDataGate from "./SudokuDataGate";
import GameSelect from "./GameSelect";

function SudokuSelectInner() {
  const navigate = useNavigate();

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8 flex flex-col gap-2">
        <div className="flex gap-4 items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Grid3x3 className="size-6" />
            Sudoku
          </h1>
          <Button variant="outline" onClick={() => navigate(-1)}>
            {"◀ Back"}
          </Button>
        </div>
        <p className="text-muted-foreground">Select a new sudoku to play or continue with an already started game.</p>
      </div>
      <GameSelect />
    </div>
  );
}

export default function SudokuSelectPage() {
  return (
    <SudokuDataGate>
      <SudokuSelectInner />
    </SudokuDataGate>
  );
}
