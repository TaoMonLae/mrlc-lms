import * as React from "react";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { useGame, GameStateMachine, GameState, INITIAL_GAME_STATE, GameProvider } from "./context/GameContext";
import { emptyGrid, INITIAL_CREATE_NEW_SUDOKU_STATE, SudokuProvider, SudokuState, useSudoku } from "./context/SudokuContext";

import { Sudoku } from "./components/Sudoku";
import GameTimer from "./GameTimer";

import { Button } from "@/components/ui/button";
import SudokuGame from "@/src/lib/sudoku/game/SudokuGame";
import SudokuMenuNumbers from "./components/SudokuMenuNumbers";
import SudokuMenuControls from "./components/SudokuMenuControls";
import { Checkbox } from "@/components/ui/checkbox";
import { cellsToSimpleSudoku, stringifySudoku, parseSudoku } from "@/src/lib/sudoku/engine/utility";
import { solve } from "@/src/lib/sudoku/engine/solverAC3";
import { localStoragePlayedSudokuRepository } from "@/src/lib/sudoku/database/playedSudokus";
import { UserPreferences } from "@/src/lib/sudoku/database/userPreferences";
import { formatDuration } from "@/src/lib/sudoku/utils/format";
import { throttle } from "@/src/lib/sudoku/engine/lodashLite";
import { TimerProvider } from "./context/TimerContext";
import { CellCoordinates, SimpleSudoku } from "@/src/lib/sudoku/engine/types";
import {
  INITIAL_USER_PREFERENCES_STATE,
  UserPreferencesProvider,
  useUserPreferences,
} from "./context/UserPreferencesContext";
import { getSudokusPaginated, useSudokuCollections } from "@/src/lib/sudoku/game/sudokus";
import { translateCollectionName } from "@/src/lib/sudoku/database/collections";
import { useGridKeyboardShortcuts } from "./shortcuts/useSudokuKeyboardShortcuts";

function PauseButton({
  disabled,
  paused,
  pauseGame,
  continueGame,
}: {
  disabled: boolean;
  paused: boolean;
  pauseGame: () => void;
  continueGame: () => void;
}) {
  return (
    <Button variant="outline" disabled={disabled} onClick={paused ? continueGame : pauseGame}>
      {paused ? "Continue" : "Pause"}
    </Button>
  );
}

const ClearGameButton: React.FC<{
  clearGame: () => void;
  pauseGame: () => void;
  continueGame: () => void;
  disabled: boolean;
}> = ({ clearGame, pauseGame, continueGame, disabled }) => {
  const clearGameLocal = async () => {
    pauseGame();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const areYouSure = confirm("Are you sure you want to restart this game? Your progress will be lost.");
    if (!areYouSure) {
      continueGame();
      return;
    }
    clearGame();
    await new Promise((resolve) => setTimeout(resolve, 100));
    continueGame();
  };

  return (
    <Button variant="outline" disabled={disabled} onClick={clearGameLocal}>
      Clear
    </Button>
  );
};

const NewGameButton: React.FC = () => {
  const { pauseGame } = useGame();
  const navigate = useNavigate();

  const pauseAndChoose = async () => {
    pauseGame();
    navigate("/games/sudoku");
  };

  return (
    <Button className="bg-teal-600 dark:bg-teal-600 text-white" onClick={pauseAndChoose}>
      New game
    </Button>
  );
};

const NextSudokuButton: React.FC<{ gameState: GameState; setDisableAutoSync: (disabled: boolean) => void }> = ({
  gameState,
  setDisableAutoSync,
}) => {
  const navigate = useNavigate();
  const { getCollection } = useSudokuCollections();
  const collection = React.useMemo(() => {
    try {
      return getCollection(gameState.sudokuCollectionName);
    } catch (error) {
      console.error("Error loading sudoku collection:", error);
      return null;
    }
  }, [gameState.sudokuCollectionName, getCollection]);
  const collectionName = collection
    ? translateCollectionName(collection.name)
    : translateCollectionName(gameState.sudokuCollectionName);

  const nextSudokuParams = React.useMemo(() => {
    if (!collection) {
      return null;
    }

    try {
      const nextIndex = gameState.sudokuIndex + 1;

      const result = getSudokusPaginated(collection, nextIndex, 1);
      const sudoku = result.sudokus[0];

      if (sudoku) {
        return {
          sudokuIndex: nextIndex + 1,
          sudoku: stringifySudoku(sudoku.sudoku),
          sudokuCollectionName: gameState.sudokuCollectionName,
        };
      }
    } catch (error) {
      console.error("Error calculating next sudoku:", error);
    }
    return null;
  }, [gameState.sudokuIndex, gameState.sudokuCollectionName, collection]);

  if (!nextSudokuParams) {
    return (
      <div>
        <p className="dark:text-white text-black mb-4 max-w-64 text-center">
          Congratulations! You arrived at the end of collection "{collectionName}". Select a new sudoku to play.
        </p>
        <Button className="bg-teal-700 text-white w-full" onClick={() => navigate("/games/sudoku")}>
          Select new sudoku
        </Button>
      </div>
    );
  }

  const handleClick = () => {
    setDisableAutoSync(true);
    const params = new URLSearchParams({
      sudokuIndex: String(nextSudokuParams.sudokuIndex),
      sudoku: nextSudokuParams.sudoku,
      sudokuCollectionName: nextSudokuParams.sudokuCollectionName,
    });
    navigate(`/games/sudoku/play?${params.toString()}`);
    setTimeout(() => setDisableAutoSync(false), 2000);
  };

  return (
    <Button className="bg-teal-700 text-white w-full" onClick={handleClick}>
      {`Select next sudoku: ${collectionName} #${nextSudokuParams.sudokuIndex}`}
    </Button>
  );
};

const ShareButton: React.FC<{
  gameState: GameState;
  sudokuState: SudokuState;
}> = ({ gameState, sudokuState }) => {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Error copying to clipboard", error);
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  };

  const handleShare = async () => {
    const stringifiedSudoku = stringifySudoku(cellsToSimpleSudoku(sudokuState.current));
    const params = new URLSearchParams({
      sudokuIndex: String(gameState.sudokuIndex + 1),
      sudoku: stringifiedSudoku,
      sudokuCollectionName: gameState.sudokuCollectionName,
    });
    const shareUrl = `${window.location.origin}/games/sudoku/play?${params.toString()}`;

    await copyToClipboard(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <button
      aria-label="Share"
      className="text-slate-700 dark:text-white hover:cursor-pointer p-1 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md border-none bg-transparent"
      data-testid="share-sudoku"
      onClick={handleShare}
      type="button"
    >
      {copied ? "Copied" : `🔗 Share`}
    </button>
  );
};

const CenteredContinueButton: React.FC<{ visible: boolean; onClick: () => void }> = ({ visible, onClick }) => (
  <div
    onClick={onClick}
    data-testid="continue-overlay"
    className={`${visible ? "flex" : "hidden"} justify-center items-center w-full h-full absolute z-30 hover:cursor-pointer`}
  >
    <div className="bg-teal-500 rounded-full w-20 h-20 flex justify-center items-center transition-transform duration-200 ease-out hover:scale-110 relative">
      <div className="absolute w-0 h-0 border-l-[30px] border-l-white border-t-[20px] border-t-transparent border-b-[20px] border-b-transparent translate-x-[5px]"></div>
    </div>
  </div>
);

const DifficultyShow = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className="text-slate-700 dark:text-white capitalize" {...props}>
    {children}
  </div>
);

function stripWrappingQuotes(value: string) {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

const SettingsAndInformation = () => {
  const {
    state,
    toggleShowHints,
    toggleShowOccurrences,
    toggleShowCircleMenu,
    toggleShowWrongEntries,
    toggleShowConflicts,
  } = useUserPreferences();

  return (
    <div className="text-slate-700 dark:text-white bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4">
      <div className="grid gap-4">
        <div className="md:block hidden">
          <h2 className="mb-2 text-xl font-bold">Shortcuts</h2>
          <div className="grid gap-2">
            <ul className="list-disc pl-6 text-sm">
              <li>Arrow keys: Move around the board</li>
              <li>Number keys: Write a note or set the sudoku number</li>
              <li>Backspace: Delete a number</li>
              <li>Escape: Pause/unpause the game</li>
              <li>H: Hint</li>
              <li>N: Enter/exit note mode</li>
              <li>CTRL + Z: Undo</li>
              <li>CTRL + Y: Redo</li>
              <li>CTRL + C/V: Copy/paste notes</li>
            </ul>
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-xl font-bold">Settings</h2>
          <div className="grid gap-2 text-sm">
            <label className="flex items-center gap-2">
              <Checkbox checked={state.showHints} onCheckedChange={() => toggleShowHints()} />
              <span>Show auto generated notes</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={state.showWrongEntries} onCheckedChange={() => toggleShowWrongEntries()} />
              <span>Highlight wrong entries</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={state.showConflicts} onCheckedChange={() => toggleShowConflicts()} />
              <span>Highlight conflicts</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={state.showCircleMenu} onCheckedChange={() => toggleShowCircleMenu()} />
              <span>Show circle menu when a cell is clicked (desktop only)</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={state.showOccurrences} onCheckedChange={() => toggleShowOccurrences()} />
              <span>Show occurrences of numbers in number buttons</span>
            </label>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-700 dark:text-white">About</h2>
          <p className="text-sm text-slate-600 dark:text-white">
            This Sudoku game is a port of{" "}
            <a
              target="_blank"
              className="underline"
              href="https://github.com/TN1ck/super-sudoku"
              rel="noreferrer"
            >
              super-sudoku
            </a>{" "}
            by Tom Nick (MIT licensed), adapted to run natively inside this app.
          </p>
        </div>
      </div>
    </div>
  );
};

const GameInner: React.FC<{
  sudokuState: SudokuState;
  setSudoku: (sudoku: SimpleSudoku, solvedSudoku: SimpleSudoku) => void;
  setNumber: (cellCoordinates: CellCoordinates, number: number) => void;
  setNotes: (cellCoordinates: CellCoordinates, notes: number[]) => void;
  clearCell: (cellCoordinates: CellCoordinates) => void;
  getHint: (cellCoordinates: CellCoordinates) => void;
  undo: () => void;
  redo: () => void;
  game: GameState;
  userPreferencesState: UserPreferences;
  pauseGame: () => void;
  continueGame: () => void;
  wonGame: () => void;
  showMenu: (showNotes?: boolean) => void;
  selectCell: (cellCoordinates: CellCoordinates) => void;
  activateNotesMode: () => void;
  hideMenu: () => void;
  resetGame: () => void;
  deactivateNotesMode: () => void;
  setDisableAutoSync: (disabled: boolean) => void;
  copyNotes: (notes: number[]) => void;
}> = ({
  sudokuState,
  setSudoku,
  setNumber,
  setNotes,
  clearCell,
  getHint,
  undo,
  redo,
  game,
  userPreferencesState,
  pauseGame,
  continueGame,
  wonGame,
  showMenu,
  selectCell,
  activateNotesMode,
  hideMenu,
  resetGame,
  deactivateNotesMode,
  setDisableAutoSync,
  copyNotes,
}) => {
  const canUndo = sudokuState.historyIndex < sudokuState.history.length - 1;
  const sudoku = sudokuState.current;
  const { getCollection } = useSudokuCollections();
  const collectionName = React.useMemo(() => {
    try {
      return translateCollectionName(getCollection(game.sudokuCollectionName).name);
    } catch (error) {
      console.error("Error loading sudoku collection:", error);
      return translateCollectionName(game.sudokuCollectionName);
    }
  }, [game.sudokuCollectionName, getCollection]);

  React.useEffect(() => {
    const isSolved = SudokuGame.isSolved(sudoku);
    if (isSolved) {
      wonGame();
    }
  }, [sudoku, wonGame]);

  const onVisibilityChange = React.useCallback(() => {
    if (document.visibilityState === "hidden") {
      pauseGame();
    } else {
      setTimeout(() => {
        continueGame();
      }, 200);
    }
  }, [pauseGame, continueGame]);

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange, false);
    }
    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange, false);
      }
    };
  }, [onVisibilityChange]);

  const pausedGame = game.state === GameStateMachine.paused;
  const activeCell = game.activeCellCoordinates
    ? sudoku.find((s) => {
        return s.x === game.activeCellCoordinates!.x && s.y === game.activeCellCoordinates!.y;
      })
    : undefined;

  useGridKeyboardShortcuts({
    enabled: game.state === GameStateMachine.running,
    sudoku,
    activeCell,
    notesMode: game.notesMode,
    showHints: userPreferencesState.showHints,
    selectCell,
    setNumber,
    setNotes,
    clearNumber: clearCell,
    getHint,
    undo,
    redo,
    onEscape: pauseGame,
    onToggleNotes: () => (game.notesMode ? deactivateNotesMode() : activateNotesMode()),
    clipboardNotes: game.clipboardNotes,
    copyNotes,
  });

  return (
    <div>
      <header className="flex justify-between sm:items-center mt-4">
        <div className="flex text-slate-700 dark:text-white flex-col sm:flex-row sm:justify-end sm:items-center gap-2">
          <div className="flex gap-2 items-center">
            <DifficultyShow data-testid="current-game-label">{`${collectionName} #${game.sudokuIndex + 1}`}</DifficultyShow>
            <ShareButton gameState={game} sudokuState={sudokuState} />
          </div>
          <div className="hidden sm:block">{"|"}</div>
          <GameTimer />
        </div>
        <div className="text-slate-900 dark:text-white text-lg sm:text-2xl font-bold flex items-center gap-2">Sudoku</div>
        <div className="flex">
          <div className="flex gap-2 flex-col justify-end items-end sm:flex-row">
            <div className="flex gap-2">
              <ClearGameButton
                pauseGame={pauseGame}
                continueGame={continueGame}
                disabled={game.won || game.state === GameStateMachine.paused}
                clearGame={() => {
                  const simpleSudoku = cellsToSimpleSudoku(sudokuState.current);
                  const solved = solve(simpleSudoku);
                  if (solved.sudoku) {
                    setSudoku(simpleSudoku, solved.sudoku);
                  }
                  resetGame();
                }}
              />
            </div>
            <div className="flex gap-2">
              <PauseButton
                disabled={game.won}
                paused={game.state === GameStateMachine.paused}
                continueGame={continueGame}
                pauseGame={pauseGame}
              />
              <NewGameButton />
            </div>
          </div>
        </div>
      </header>
      <div className="flex gap-4 flex-col md:flex-row">
        <main className="mt-4 flex-grow md:min-w-96 w-full">
          <Sudoku
            showWrongEntries={userPreferencesState.showWrongEntries && game.state === GameStateMachine.running}
            showConflicts={userPreferencesState.showConflicts && game.state === GameStateMachine.running}
            notesMode={game.notesMode}
            shouldShowMenu={
              game.showMenu && userPreferencesState.showCircleMenu && game.state === GameStateMachine.running
            }
            sudoku={game.state === GameStateMachine.paused ? emptyGrid : sudoku}
            showMenu={showMenu}
            hideMenu={hideMenu}
            selectCell={selectCell}
            showHints={userPreferencesState.showHints && game.state === GameStateMachine.running}
            activeCell={game.state === GameStateMachine.running ? activeCell : undefined}
            setNumber={setNumber}
            setNotes={setNotes}
            clearNumber={clearCell}
          >
            {game.won && (
              <div className="absolute top-0 bottom-0 right-0 left-0 z-30 flex items-center justify-center rounded-sm bg-white dark:bg-black dark:bg-opacity-80 bg-opacity-80 text-black dark:text-white">
                <div className="grid gap-8">
                  <div className="flex justify-center text-2xl">🎉 Congrats, you won! 🎉</div>
                  <div className="text-md flex justify-center">
                    <div className="grid">
                      <div className="flex justify-center">
                        {`You solved this sudoku ${game.timesSolved} ${game.timesSolved === 1 ? "time" : "times"}`}
                      </div>
                      <div className="flex justify-center">
                        <div>
                          {game.previousTimes.length > 0 && (
                            <div>{`Best time: ${formatDuration(Math.min(...game.previousTimes))}`}</div>
                          )}
                          <div>{`This time: ${formatDuration(game.secondsPlayed)}`}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <NextSudokuButton gameState={game} setDisableAutoSync={setDisableAutoSync} />
                </div>
              </div>
            )}

            <CenteredContinueButton visible={pausedGame && !game.won} onClick={continueGame} />
          </Sudoku>
        </main>
        <div className="grid gap-4 mt-4">
          <SudokuMenuNumbers
            notesMode={game.notesMode}
            showOccurrences={userPreferencesState.showOccurrences}
            activeCell={game.activeCellCoordinates}
            sudoku={sudokuState.current}
            showHints={userPreferencesState.showHints}
            setNumber={setNumber}
            setNotes={setNotes}
          />
          <SudokuMenuControls
            notesMode={game.notesMode}
            activeCellCoordinates={game.activeCellCoordinates ?? { x: 0, y: 0 }}
            clearCell={clearCell}
            activateNotesMode={activateNotesMode}
            deactivateNotesMode={deactivateNotesMode}
            getHint={getHint}
            canUndo={canUndo}
            undo={undo}
          />
          <SettingsAndInformation />
        </div>
      </div>
    </div>
  );
};

// Save every 2 seconds.
const throttledSave = throttle(localStoragePlayedSudokuRepository.saveSudokuState, 2000);

function AppProvider({
  children,
  initialSudokuState,
}: {
  children: React.ReactNode;
  initialSudokuState: SudokuState;
}) {
  const currentSudokuKey = localStoragePlayedSudokuRepository.getCurrentSudokuKey();
  const currentSudoku = currentSudokuKey ? localStoragePlayedSudokuRepository.getSudokuState(currentSudokuKey) : undefined;

  const sudokuState: SudokuState = currentSudoku
    ? { history: [currentSudoku.sudoku], historyIndex: 0, current: currentSudoku.sudoku }
    : initialSudokuState;

  const initialGameState: GameState = currentSudoku ? currentSudoku.game : INITIAL_GAME_STATE;
  const initialUserPreferencesState: UserPreferences = INITIAL_USER_PREFERENCES_STATE;

  return (
    <GameProvider initialState={initialGameState}>
      <UserPreferencesProvider initialState={initialUserPreferencesState}>
        <TimerProvider>
          <SudokuProvider initialState={sudokuState}>{children}</SudokuProvider>
        </TimerProvider>
      </UserPreferencesProvider>
    </GameProvider>
  );
}

const GameWithRouteManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    setGameState,
    state: gameState,
    continueGame,
    newGame,
    pauseGame,
    wonGame,
    showMenu,
    selectCell,
    activateNotesMode,
    deactivateNotesMode,
    resetGame,
    hideMenu,
    copyNotes,
  } = useGame();
  const { state: userPreferencesState } = useUserPreferences();
  const { setSudokuState, state: sudokuState, setSudoku, setNumber, setNotes, clearCell, getHint, undo, redo } =
    useSudoku();
  const [initialized, setInitialized] = React.useState(false);
  const [disableAutoSync, setDisableAutoSync] = React.useState(false);

  const sudokuIndexRaw = searchParams.get("sudokuIndex");
  const sudokuRaw = searchParams.get("sudoku");
  const sudokuCollectionNameRaw = searchParams.get("sudokuCollectionName");

  const sudokuIndex = sudokuIndexRaw ? Number(stripWrappingQuotes(sudokuIndexRaw)) : undefined;
  const sudoku = sudokuRaw ? stripWrappingQuotes(sudokuRaw) : undefined;
  const sudokuCollectionName = sudokuCollectionNameRaw ? stripWrappingQuotes(sudokuCollectionNameRaw) : undefined;

  useEffect(() => {
    if (gameState && sudokuState && initialized && !disableAutoSync) {
      throttledSave(gameState, sudokuState);
      const stringifiedSudoku = stringifySudoku(cellsToSimpleSudoku(sudokuState.current));
      const shouldUpdateUrl = stringifiedSudoku !== sudoku;
      if (shouldUpdateUrl) {
        setSearchParams(
          {
            sudokuIndex: String(gameState.sudokuIndex + 1),
            sudoku: stringifiedSudoku,
            sudokuCollectionName: gameState.sudokuCollectionName,
          },
          { replace: true },
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, sudokuState, initialized, sudoku, disableAutoSync]);

  React.useEffect(() => {
    if (sudokuIndex === undefined || sudoku === undefined || sudokuCollectionName === undefined) {
      setInitialized(true);
      return;
    }

    const currentSudoku = cellsToSimpleSudoku(sudokuState.current);
    if (stringifySudoku(currentSudoku) === sudoku) {
      setInitialized(true);
      return;
    }

    if (gameState.secondsPlayed > 5 && !gameState.won) {
      const areYouSure = confirm(
        `You are currently playing sudoku ${translateCollectionName(gameState.sudokuCollectionName)} #${gameState.sudokuIndex + 1}, do you want to pause it and start ${translateCollectionName(sudokuCollectionName)} #${sudokuIndex}?`,
      );
      if (!areYouSure) {
        setInitialized(true);
        return;
      }
    }

    try {
      const parsedSudoku = parseSudoku(sudoku);
      const solvedSudoku = solve(parsedSudoku);
      if (solvedSudoku.sudoku) {
        setSudoku(parsedSudoku, solvedSudoku.sudoku);
      } else {
        alert("This sudoku doesn't seem to be valid.");
        setInitialized(true);
        return;
      }
    } catch (error) {
      alert("This sudoku doesn't seem to be valid.");
      setInitialized(true);
      console.error(error);
      return;
    }

    const storedSudoku = localStoragePlayedSudokuRepository.getSudokuState(sudoku);
    newGame(
      sudokuIndex - 1,
      sudokuCollectionName,
      storedSudoku?.game.timesSolved ?? 0,
      storedSudoku?.game.previousTimes ?? [],
    );

    if (storedSudoku && !storedSudoku.game.won) {
      setGameState({ ...storedSudoku.game });
      setSudokuState({
        current: storedSudoku.sudoku,
        history: [storedSudoku.sudoku],
        historyIndex: 0,
      });
    }
    setInitialized(true);
    continueGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sudokuIndex, sudoku, sudokuCollectionName]);

  return (
    <GameInner
      sudokuState={sudokuState}
      setSudoku={setSudoku}
      setNumber={setNumber}
      setNotes={setNotes}
      clearCell={clearCell}
      getHint={getHint}
      undo={undo}
      redo={redo}
      game={gameState}
      userPreferencesState={userPreferencesState}
      pauseGame={pauseGame}
      continueGame={continueGame}
      wonGame={wonGame}
      showMenu={showMenu}
      selectCell={selectCell}
      activateNotesMode={activateNotesMode}
      hideMenu={hideMenu}
      resetGame={resetGame}
      deactivateNotesMode={deactivateNotesMode}
      setDisableAutoSync={setDisableAutoSync}
      copyNotes={copyNotes}
    />
  );
};

const Game = ({ initialSudokuState }: { initialSudokuState: SudokuState }) => {
  return (
    <AppProvider initialSudokuState={initialSudokuState}>
      <GameWithRouteManagement />
    </AppProvider>
  );
};

export default Game;
