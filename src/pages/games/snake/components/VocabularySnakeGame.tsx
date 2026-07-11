"use client";

import * as React from "react";
import { useEffect, useRef, useCallback, useState } from "react";
import { useSnake } from "../context/SnakeContext";
import { useSwipeControls } from "../useSwipeControls";
import MobileDirPad from "../MobileDirPad";
import HapticsToggle from "../HapticsToggle";
import { haptic } from "../haptics";
import { Play, Pause, RotateCcw, BookOpen, Volume2, Sparkles, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiSend, fetchOrMock } from "../../../../lib/api";

// Fill a rounded rectangle, falling back to a manual path on browsers that lack
// CanvasRenderingContext2D.roundRect (e.g. Safari < 16).
function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  if (typeof (ctx as { roundRect?: unknown }).roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  ctx.fill();
}

interface VocabularyWord {
  id: string;
  word: string;
  definition: string;
  partOfSpeech?: string;
  language: string;
  difficulty: string;
  learned: boolean;
}

interface VocabularyProgress {
  totalGames: number;
  totalScore: number;
  averageScore: number;
  uniqueWordsLearned: number;
  recentScores: Array<{
    score: number;
    wordsLearned: number;
    playedAt: string;
  }>;
}

// Dev-only fallback data. In production fetchOrMock re-throws instead of using
// these, so students always see live data (or a proper empty/error state).
const MOCK_WORDS: VocabularyWord[] = [
  { id: "1", word: "EPHEMERAL", definition: "Lasting for a very short time", partOfSpeech: "adjective", language: "en", difficulty: "medium", learned: false },
  { id: "2", word: "SERENDIPITY", definition: "Finding something good without looking for it", partOfSpeech: "noun", language: "en", difficulty: "medium", learned: false },
  { id: "3", word: "ELOQUENT", definition: "Fluent or persuasive in speaking or writing", partOfSpeech: "adjective", language: "en", difficulty: "medium", learned: false },
  { id: "4", word: "RESILIENT", definition: "Able to recover quickly from difficulties", partOfSpeech: "adjective", language: "en", difficulty: "easy", learned: false },
  { id: "5", word: "PRAGMATIC", definition: "Dealing with things sensibly and realistically", partOfSpeech: "adjective", language: "en", difficulty: "medium", learned: false },
  { id: "6", word: "ALTRUISM", definition: "Selfless concern for the well-being of others", partOfSpeech: "noun", language: "en", difficulty: "medium", learned: false },
  { id: "7", word: "PROFOUND", definition: "Very great or intense; having deep meaning", partOfSpeech: "adjective", language: "en", difficulty: "hard", learned: false },
  { id: "8", word: "VERSATILE", definition: "Able to adapt to many different functions", partOfSpeech: "adjective", language: "en", difficulty: "medium", learned: false },
];

const MOCK_PROGRESS: VocabularyProgress = {
  totalGames: 0,
  totalScore: 0,
  averageScore: 0,
  uniqueWordsLearned: 0,
  recentScores: [],
};

// Map the reducer's numeric tick speed to the API's enum.
function speedLabel(speed: number): "SLOW" | "NORMAL" | "FAST" {
  if (speed >= 200) return "SLOW";
  if (speed <= 100) return "FAST";
  return "NORMAL";
}

export default function VocabularySnakeGame() {
  const {
    state,
    dispatch,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    changeDirection,
    setSpeed,
  } = useSnake();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | undefined>(undefined);
  const definitionTimeoutRef = useRef<number | undefined>(undefined);
  const gameStartRef = useRef<number>(0);

  // Swipe-to-steer on the board — the primary mobile control.
  const swipe = useSwipeControls(changeDirection, state.gameStatus === "PLAYING");
  const [isMobile, setIsMobile] = useState(false);
  const [currentWord, setCurrentWord] = useState<VocabularyWord | null>(null);
  const [showDefinition, setShowDefinition] = useState(false);
  const [learnedWords, setLearnedWords] = useState<string[]>([]);
  const [vocabularyPool, setVocabularyPool] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [vocabularyProgress, setVocabularyProgress] = useState<VocabularyProgress | null>(null);
  const [streakCount, setStreakCount] = useState(0);

  // Load the student's cumulative vocabulary progress. Falls back to empty mock
  // data only in dev; in production a failure surfaces as empty stats rather
  // than fabricated numbers.
  const loadProgress = useCallback(async () => {
    try {
      const { data } = await fetchOrMock<{ progress: VocabularyProgress }>(
        "/api/snake-game/vocabulary-progress",
        () => ({ progress: MOCK_PROGRESS }),
        { emptyWhen: (d) => !d?.progress }
      );
      setVocabularyProgress(data.progress ?? MOCK_PROGRESS);
    } catch {
      // Not signed in / offline — show empty progress, keep the game playable.
      setVocabularyProgress(MOCK_PROGRESS);
    }
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Check for mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch vocabulary words from the API (English–Myanmar dictionary), with a
  // dev-only mock fallback. Prioritizes localStorage-stored vocabulary from
  // the VocabularyManager over the database words.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // First, check if there are custom vocabulary words stored in localStorage
        const storedVocab = localStorage.getItem('vocabulary-snake-words');
        let words: VocabularyWord[] = [];

        if (storedVocab) {
          try {
            const parsedVocab = JSON.parse(storedVocab);
            if (Array.isArray(parsedVocab) && parsedVocab.length > 0) {
              console.log('📚 Loading custom vocabulary from VocabularyManager:', parsedVocab.length, 'words');
              words = parsedVocab;
            }
          } catch (e) {
            console.warn('Failed to parse stored vocabulary, falling back to API');
          }
        }

        // If no custom vocabulary found, fetch from API
        if (words.length === 0) {
          const { data } = await fetchOrMock<{ words: VocabularyWord[] }>(
            "/api/snake-game/vocabulary-words?limit=20",
            () => ({ words: MOCK_WORDS }),
            { emptyWhen: (d) => !d?.words || d.words.length === 0 }
          );
          if (!active) return;
          words = (data.words ?? [])
            .filter((w) => w.word && w.definition)
            .map((w) => ({
              ...w,
              difficulty: w.difficulty ?? "medium",
              learned: false,
            }));
        }

        if (!active) return;
        const formattedWords = words
          .filter((w) => w.word && w.definition)
          .map((w) => ({
            ...w,
            difficulty: w.difficulty ?? "medium",
            learned: false,
          }));
        setVocabularyPool(formattedWords.length > 0 ? formattedWords : MOCK_WORDS);
      } catch {
        if (active) setVocabularyPool(MOCK_WORDS);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Get random vocabulary word from pool
  const getRandomWord = useCallback((currentLearnedWords: string[]): VocabularyWord => {
    if (vocabularyPool.length === 0) {
      return {
        id: "fallback",
        word: "LEARN",
        definition: "To gain knowledge or skill",
        language: "en",
        difficulty: "easy",
        learned: false,
      };
    }

    const availableWords = vocabularyPool.filter(
      (word) => !currentLearnedWords.includes(word.word)
    );

    const word = availableWords.length > 0
      ? availableWords[Math.floor(Math.random() * availableWords.length)]
      : vocabularyPool[Math.floor(Math.random() * vocabularyPool.length)];

    return word;
  }, [vocabularyPool]);

  // Initialize with first word
  useEffect(() => {
    if (!currentWord && !loading && vocabularyPool.length > 0) {
      setCurrentWord(getRandomWord(learnedWords));
    }
  }, [currentWord, loading, vocabularyPool, learnedWords, getRandomWord]);

  // Handle word pronunciation
  const speakWord = useCallback((word: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      utterance.rate = 0.8;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Draw game
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { snake, food, gridSize } = state;

    // Size the backing store for the device pixel ratio, then draw in logical px.
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const logicalSize = isMobile ? 400 : 600;
    if (canvas.width !== logicalSize * dpr || canvas.height !== logicalSize * dpr) {
      canvas.width = logicalSize * dpr;
      canvas.height = logicalSize * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cellSize = logicalSize / gridSize;

    // Clear canvas
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, logicalSize, logicalSize);

    // Draw grid (subtle)
    ctx.strokeStyle = "#2a2a4e";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, logicalSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(logicalSize, i * cellSize);
      ctx.stroke();
    }

    // Draw vocabulary food (book icon style)
    if (currentWord) {
      ctx.fillStyle = "#4ecdc4";
      ctx.beginPath();
      const foodX = food.x * cellSize + cellSize / 2;
      const foodY = food.y * cellSize + cellSize / 2;

      // Draw book shape
      ctx.save();
      ctx.translate(foodX, foodY);
      ctx.rotate(-0.2); // Slight tilt for style

      // Book cover
      ctx.fillStyle = "#4ecdc4";
      ctx.fillRect(-cellSize / 3, -cellSize / 3, cellSize * 0.66, cellSize * 0.5);

      // Book pages
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-cellSize / 4, -cellSize / 4, cellSize * 0.4, cellSize * 0.35);

      // Book spine
      ctx.fillStyle = "#45b7aa";
      ctx.fillRect(-cellSize / 3, -cellSize / 3, cellSize * 0.1, cellSize * 0.5);

      ctx.restore();

      // Draw word preview above food
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      const previewText = currentWord.word.length > 5 ? currentWord.word.substring(0, 5) : currentWord.word;
      ctx.fillText(previewText, foodX, foodY - cellSize / 2 - 5);
    }

    // Draw snake
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.fillStyle = isHead ? "#ff6b6b" : "#ee5a5a";

      const x = segment.x * cellSize + 1;
      const y = segment.y * cellSize + 1;
      const size = cellSize - 2;

      // Rounded rectangle for snake segments
      fillRoundedRect(ctx, x, y, size, size, isHead ? 4 : 2);

      // Draw eyes on head
      if (isHead) {
        ctx.fillStyle = "#ffffff";
        const eyeSize = cellSize / 5;
        const eyeOffset = cellSize / 4;

        let eye1X, eye1Y, eye2X, eye2Y;

        switch (state.direction) {
          case "RIGHT":
            eye1X = x + size - eyeOffset;
            eye1Y = y + eyeOffset;
            eye2X = x + size - eyeOffset;
            eye2Y = y + size - eyeOffset;
            break;
          case "LEFT":
            eye1X = x + eyeOffset;
            eye1Y = y + eyeOffset;
            eye2X = x + eyeOffset;
            eye2Y = y + size - eyeOffset;
            break;
          case "UP":
            eye1X = x + eyeOffset;
            eye1Y = y + eyeOffset;
            eye2X = x + size - eyeOffset;
            eye2Y = y + eyeOffset;
            break;
          case "DOWN":
            eye1X = x + eyeOffset;
            eye1Y = y + size - eyeOffset;
            eye2X = x + size - eyeOffset;
            eye2Y = y + size - eyeOffset;
            break;
        }

        ctx.beginPath();
        ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2);
        ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw pause overlay
    if (state.gameStatus === "PAUSED") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, logicalSize, logicalSize);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PAUSED", logicalSize / 2, logicalSize / 2);
    }
  }, [state, currentWord, isMobile]);

  // Handle word collection
  const handleWordCollection = useCallback(() => {
    if (currentWord && !learnedWords.includes(currentWord.word)) {
      setLearnedWords((prev) => [...prev, currentWord.word]);
      setStreakCount((prev) => prev + 1);
      setShowDefinition(true);

      // Speak the word
      speakWord(currentWord.word);

      // Show definition for 4 seconds then hide. Clear any pending timer first so
      // rapid eats don't stack timers, and store the id so it can be cancelled on
      // game over / unmount (otherwise it can fire after restart and clobber the
      // freshly loaded word, or update an unmounted component).
      if (definitionTimeoutRef.current) {
        clearTimeout(definitionTimeoutRef.current);
      }
      definitionTimeoutRef.current = window.setTimeout(() => {
        setShowDefinition(false);
        setCurrentWord(getRandomWord([...learnedWords, currentWord.word]));
      }, 4000);
    }
  }, [currentWord, learnedWords, getRandomWord, speakWord]);

  // Cancel any pending definition timer on unmount.
  useEffect(() => {
    return () => {
      if (definitionTimeoutRef.current) {
        clearTimeout(definitionTimeoutRef.current);
      }
    };
  }, []);

  // Cancel the definition timer when the game ends so it can't overwrite state
  // after a restart.
  useEffect(() => {
    if (state.gameStatus === "GAME_OVER" && definitionTimeoutRef.current) {
      clearTimeout(definitionTimeoutRef.current);
      definitionTimeoutRef.current = undefined;
    }
  }, [state.gameStatus]);

  // Detect word collection by watching the score. The reducer awards points and
  // relocates food atomically on each eat, so a score increase == one word eaten.
  // The old approach read state.snake/state.food inside the interval closure,
  // which is a stale pre-move snapshot, so collisions were detected a tick late
  // (or missed). Keying off the committed score avoids the stale-closure bug.
  const prevScoreRef = useRef(state.score);
  useEffect(() => {
    if (state.gameStatus === "PLAYING" && state.score > prevScoreRef.current) {
      handleWordCollection();
      haptic("eat");
    }
    prevScoreRef.current = state.score;
  }, [state.score, state.gameStatus, handleWordCollection]);

  // Triple buzz on game over (no-op without vibration support / toggle off).
  useEffect(() => {
    if (state.gameStatus === "GAME_OVER") haptic("over");
  }, [state.gameStatus]);

  // Game loop with vocabulary integration
  useEffect(() => {
    const gameLoop = () => {
      if (state.gameStatus === "PLAYING") {
        // Move snake forward. Word collection is handled by the score-watching
        // effect above, and rendering by the state-change redraw effect below —
        // calling draw() here would paint a stale (pre-move) frame.
        dispatch({ type: "MOVE_SNAKE" });
      }
    };

    if (state.gameStatus === "PLAYING") {
      gameLoopRef.current = window.setInterval(gameLoop, state.speed);
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [state.gameStatus, state.speed, dispatch]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Handle pause/resume toggle before the PLAYING guard so Space can
      // resume a paused game (previously it was blocked and only paused).
      if (e.key === " ") {
        e.preventDefault();
        if (state.gameStatus === "PLAYING") {
          pauseGame();
        } else if (state.gameStatus === "PAUSED") {
          resumeGame();
        }
        return;
      }

      if (state.gameStatus !== "PLAYING") return;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          changeDirection("UP");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          changeDirection("DOWN");
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          changeDirection("LEFT");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          changeDirection("RIGHT");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [state.gameStatus, changeDirection, pauseGame, resumeGame]);

  // Redraw on state changes, current word changes, and mobile/desktop size flips
  // so the board repaints immediately after a resize.
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameStatus, state.snake, state.food, state.score, state.gridSize, currentWord, isMobile]);

  const handleStartGame = () => {
    if (state.gameStatus === "IDLE" || state.gameStatus === "GAME_OVER") {
      if (definitionTimeoutRef.current) {
        clearTimeout(definitionTimeoutRef.current);
        definitionTimeoutRef.current = undefined;
      }
      resetGame();
      setLearnedWords([]);
      setStreakCount(0);
      setShowDefinition(false);
      setCurrentWord(getRandomWord([]));
      gameStartRef.current = Date.now();
      startGame();
    } else if (state.gameStatus === "PAUSED") {
      resumeGame();
    } else {
      pauseGame();
    }
  };

  // Save score when the game ends. Uses the shared api helper so the Bearer
  // token is attached; failures (not signed in / offline) are swallowed so the
  // game stays playable, but on success we refresh the progress panel.
  useEffect(() => {
    if (state.gameStatus !== "GAME_OVER" || learnedWords.length === 0) return;

    const durationSeconds = gameStartRef.current
      ? Math.max(0, Math.round((Date.now() - gameStartRef.current) / 1000))
      : 0;

    (async () => {
      try {
        await apiSend("/api/snake-game/scores", "POST", {
          score: state.score,
          gameMode: "VOCABULARY",
          speed: speedLabel(state.speed),
          gridSize: state.gridSize,
          gameDuration: durationSeconds,
          vocabularyWords: learnedWords.length,
          wordsList: learnedWords,
          deviceInfo: {
            userAgent: navigator.userAgent,
            screen: {
              width: window.screen.width,
              height: window.screen.height,
            },
          },
        });
        // Refresh cumulative stats so the progress panel reflects this game.
        loadProgress();
      } catch {
        // Not signed in / offline — don't interrupt the game experience.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-white">
        <div className="text-center">
          <BookOpen className="size-8 animate-pulse mx-auto mb-4 text-blue-400" />
          <p className="text-gray-300">Loading vocabulary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-2 sm:p-4 items-start justify-center text-white">
      {/* Game board area */}
      <div className="flex flex-col items-center gap-3 w-full lg:w-auto">
        {/* Compact score bar - always visible */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 dark:from-purple-900/40 dark:to-blue-900/40 px-4 py-2 rounded-lg border border-purple-500/20 dark:border-cyan-500/50 w-full max-w-[500px] shadow-xl">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-blue-500 dark:text-blue-400 dark:shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-gray-300 dark:text-gray-200">Words:</span>
              <span className="text-lg font-bold text-blue-100 dark:text-blue-50">{learnedWords.length}</span>
            </div>
          </div>
          {streakCount > 0 && (
            <div className="flex items-center gap-1">
              <Sparkles className="size-3 text-yellow-500 dark:text-yellow-400 dark:shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
              <span className="text-xs text-yellow-500 dark:text-yellow-300">×{streakCount}</span>
            </div>
          )}
          <div className="flex items-baseline gap-1 ml-auto">
            <span className="text-xs text-gray-300 dark:text-gray-200">Score:</span>
            <span className="text-lg font-semibold text-blue-500 dark:text-blue-400 dark:shadow-[0_0_10px_rgba(96,165,250,0.5)]">{state.score}</span>
          </div>
        </div>

        {/* Game canvas - slightly smaller for better fit */}
        <Card className="p-1 sm:p-2 bg-gradient-to-br from-purple-500/5 to-blue-500/5 w-full max-w-[600px] mx-auto dark:from-purple-900/30 dark:to-blue-900/30 dark:border-2 dark:border-cyan-500/50 dark:shadow-[0_0_20px_rgba(6,182,212,0.3),0_0_40px_rgba(139,92,246,0.2)] dark:shadow-cyan-500/30">
          <canvas
            ref={canvasRef}
            onTouchStart={swipe.onTouchStart}
            onTouchMove={swipe.onTouchMove}
            onTouchEnd={swipe.onTouchEnd}
            className="rounded-lg shadow-lg w-full aspect-square touch-none select-none dark:shadow-[0_0_15px_rgba(6,182,212,0.5),inset_0_0_30px_rgba(139,92,246,0.3)]"
          />
        </Card>

        {/* Mobile controls: swipe on the board is primary; this D-pad is a
            larger, proper-diamond fallback. */}
        {isMobile && <MobileDirPad onDirection={changeDirection} />}
      </div>

      {/* Control panel - always visible */}
      <div className="flex flex-col gap-3 w-full lg:w-auto">
        {/* Definition card - shown on the right side */}
        {showDefinition && currentWord && (
          <Card className="w-full max-w-[350px] p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20 dark:from-green-900/30 dark:to-emerald-900/30 dark:border-2 dark:border-emerald-500/50 dark:shadow-[0_0_20px_rgba(16,185,129,0.4)] relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-1 right-1 h-6 w-6 p-0 text-gray-400 hover:text-white"
              onClick={() => setShowDefinition(false)}
            >
              <X className="size-3" />
            </Button>
            <div className="flex items-start gap-2">
              <BookOpen className="size-4 text-green-500 dark:text-green-400 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-base text-white dark:text-green-100">{currentWord.word}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => speakWord(currentWord.word)}
                    className="h-5 w-5 p-0 text-gray-400 hover:text-white"
                  >
                    <Volume2 className="size-3" />
                  </Button>
                </div>
                <p className="text-xs text-gray-300 dark:text-gray-200 mb-1">{currentWord.definition}</p>
                {currentWord.partOfSpeech && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-white border border-primary/30">
                    {currentWord.partOfSpeech}
                  </span>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Main action button */}
        <Button
          onClick={handleStartGame}
          size="lg"
          className="w-full lg:w-auto min-w-[200px] bg-gray-800/50 text-white border-gray-600 hover:bg-gray-700/50"
        >
          {state.gameStatus === "IDLE" && (
            <>
              <Play className="mr-2 size-5" /> Start Learning
            </>
          )}
          {state.gameStatus === "PLAYING" && (
            <>
              <Pause className="mr-2 size-5" /> Pause
            </>
          )}
          {state.gameStatus === "PAUSED" && (
            <>
              <Play className="mr-2 size-5" /> Resume
            </>
          )}
          {state.gameStatus === "GAME_OVER" && (
            <>
              <RotateCcw className="mr-2 size-5" /> Learn More
            </>
          )}
        </Button>

        {/* Vibration toggle (only shown on devices that support it) */}
        <HapticsToggle />

        {/* Progress card - if available */}
        {vocabularyProgress && (
          <Card className="p-3 bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:from-blue-900/30 dark:to-purple-900/30 dark:border-2 dark:border-green-500/30">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-green-500 dark:text-green-400" />
                <span className="text-xs font-semibold text-gray-300 dark:text-gray-100">YOUR PROGRESS</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400 dark:text-gray-300">Total Words:</span>
                  <span className="ml-1 font-semibold text-green-100 dark:text-green-50">{vocabularyProgress.uniqueWordsLearned}</span>
                </div>
                <div>
                  <span className="text-gray-400 dark:text-gray-300">Games:</span>
                  <span className="ml-1 font-semibold text-green-100 dark:text-green-50">{vocabularyProgress.totalGames}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400 dark:text-gray-300">Average Score:</span>
                  <span className="ml-1 font-semibold text-green-100 dark:text-green-50">{vocabularyProgress.averageScore}</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Settings card */}
        <Card className="p-3 bg-gradient-to-br from-purple-500/5 to-blue-500/5 dark:from-purple-900/30 dark:to-blue-900/30 dark:border-2 dark:border-purple-500/30">
          <div className="flex flex-col gap-3">
            {/* Speed controls */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-300 dark:text-gray-100">SPEED</span>
              <div className="flex gap-1">
                {[
                  { label: "Slow", value: 200 },
                  { label: "Normal", value: 150 },
                  { label: "Fast", value: 100 },
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant="outline"
                    size="sm"
                    onClick={() => setSpeed(option.value)}
                    className={`flex-1 ${state.speed === option.value ? "bg-purple-600/50 text-white border-purple-400" : "bg-gray-800/50 text-gray-200 border-gray-600 hover:bg-gray-700/50"}`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Instructions card - collapsible */}
        <Card className="p-3 bg-gradient-to-br from-green-500/5 to-emerald-500/5 dark:from-green-900/30 dark:to-emerald-900/30 dark:border-2 dark:border-green-500/30">
          <details className="text-xs">
            <summary className="cursor-pointer font-semibold text-gray-300 dark:text-gray-100 mb-2">
              How to Play ▼
            </summary>
            <ul className="space-y-1 text-gray-300 dark:text-gray-200">
              <li>📚 Collect books to learn vocabulary</li>
              <li>🎮 Arrow keys or WASD to move</li>
              <li>🔊 Click speaker for pronunciation</li>
              <li>⏸️ Press Space to pause anytime</li>
              {isMobile && <li>📱 Use touch controls on mobile</li>}
            </ul>
          </details>
        </Card>
      </div>
    </div>
  );
}
