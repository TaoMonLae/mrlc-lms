import * as React from "react";
import { Loader2 } from "lucide-react";
import { loadBaseCollections } from "@/src/lib/sudoku/game/sudokus";

/**
 * The original super-sudoku app bundled its puzzle .txt files at build time
 * (synchronous `?raw` imports), so its initial React state could be computed
 * eagerly. Here the puzzles are fetched from public/sudokus/*.txt at
 * runtime, so anything that depends on them (the whole game) waits behind
 * this loading gate first.
 */
export default function SudokuDataGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    loadBaseCollections()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        console.error("Failed to load sudoku puzzle collections", err);
        if (!cancelled) setError("Couldn't load the sudoku puzzles. Please try refreshing the page.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <div className="flex items-center justify-center py-24 text-destructive">{error}</div>;
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading puzzles…
      </div>
    );
  }

  return <>{children}</>;
}
