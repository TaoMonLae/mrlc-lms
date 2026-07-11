"use client";

import * as React from "react";
import { useEffect, useRef, useCallback } from "react";
import { useSnake } from "./context/SnakeContext";
import { useSwipeControls } from "./useSwipeControls";
import MobileDirPad from "./MobileDirPad";
import { Play, Pause, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiSend } from "../../../lib/api";

// Map the reducer's numeric tick speed to the API's enum.
function speedLabel(speed: number): "SLOW" | "NORMAL" | "FAST" {
  if (speed >= 200) return "SLOW";
  if (speed <= 100) return "FAST";
  return "NORMAL";
}

// Fill a rounded rectangle, falling back to a manual path on browsers that lack
// CanvasRenderingContext2D.roundRect (e.g. Safari < 16) — without this the whole
// draw() call throws and the board never renders.
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

function SnakeGame() {
  const {
    state,
    dispatch,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    changeDirection,
    setSpeed,
    setGridSize,
  } = useSnake();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | undefined>(undefined);
  const gameStartRef = useRef<number>(0);
  const [isMobile, setIsMobile] = React.useState(false);

  // Swipe-to-steer on the board — the primary mobile control.
  const swipe = useSwipeControls(changeDirection, state.gameStatus === "PLAYING");

  // Check for mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Draw game
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { snake, food, gridSize } = state;

    // Size the backing store for the device pixel ratio so rendering stays crisp
    // on high-DPI screens, then draw in logical (CSS) pixels via setTransform.
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

    // Draw food
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    const foodX = food.x * cellSize + cellSize / 2;
    const foodY = food.y * cellSize + cellSize / 2;
    ctx.arc(foodX, foodY, cellSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw food glow
    ctx.shadowColor = "#ff6b6b";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw snake
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.fillStyle = isHead ? "#4ecdc4" : "#45b7aa";

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
  }, [state, isMobile]);

  // Game loop
  useEffect(() => {
    const gameLoop = () => {
      if (state.gameStatus === "PLAYING") {
        // Move snake by dispatching the correct action. Rendering is handled by
        // the state-change redraw effect below; calling draw() here would use a
        // stale closure snapshot of state (pre-move) and paint the wrong frame.
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
        case " ":
          e.preventDefault();
          if (state.gameStatus === "PLAYING") {
            pauseGame();
          } else if (state.gameStatus === "PAUSED") {
            resumeGame();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [state.gameStatus, changeDirection, pauseGame, resumeGame]);

  // Redraw on state changes and whenever the mobile/desktop size flips, so the
  // board repaints immediately after a resize instead of going blank until the
  // next tick.
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameStatus, state.snake, state.food, state.score, state.gridSize, isMobile]);

  // Save the classic score when the game ends so the Classic leaderboard
  // reflects real play. Uses the shared authed api helper; failures (not
  // signed in / offline) are swallowed so the game stays playable.
  useEffect(() => {
    if (state.gameStatus !== "GAME_OVER" || state.score <= 0) return;

    const durationSeconds = gameStartRef.current
      ? Math.max(0, Math.round((Date.now() - gameStartRef.current) / 1000))
      : 0;

    (async () => {
      try {
        await apiSend("/api/snake-game/scores", "POST", {
          score: state.score,
          gameMode: "CLASSIC",
          speed: speedLabel(state.speed),
          gridSize: state.gridSize,
          gameDuration: durationSeconds,
          deviceInfo: {
            userAgent: navigator.userAgent,
            screen: { width: window.screen.width, height: window.screen.height },
          },
        });
      } catch {
        // Not signed in / offline — don't interrupt the game.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameStatus]);

  const handleStartGame = () => {
    if (state.gameStatus === "IDLE" || state.gameStatus === "GAME_OVER") {
      resetGame();
      gameStartRef.current = Date.now();
      startGame();
    } else if (state.gameStatus === "PAUSED") {
      resumeGame();
    } else {
      pauseGame();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 items-start justify-center text-white">
      {/* Game board area */}
      <div className="flex flex-col items-center gap-3">
        {/* Compact score bar - always visible */}
        <div className="flex items-center gap-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 dark:from-purple-900/40 dark:to-blue-900/40 px-4 py-2 rounded-lg border border-purple-500/20 dark:border-cyan-500/50 w-full max-w-[600px] shadow-xl">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-yellow-500 dark:text-yellow-400 dark:shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-gray-300 dark:text-gray-200">Score:</span>
              <span className="text-xl font-bold text-yellow-100 dark:text-yellow-50">{state.score}</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-gray-300 dark:text-gray-200">Best:</span>
            <span className="text-lg font-semibold text-yellow-500 dark:text-yellow-400 dark:shadow-[0_0_10px_rgba(250,204,21,0.5)]">{state.highScore}</span>
          </div>
        </div>

        {/* Game canvas - slightly smaller for better fit */}
        <Card className="p-2 bg-gradient-to-br from-purple-500/5 to-blue-500/5 w-full max-w-[500px] mx-auto dark:from-purple-900/30 dark:to-blue-900/30 dark:border-2 dark:border-cyan-500/50 dark:shadow-[0_0_20px_rgba(6,182,212,0.3),0_0_40px_rgba(139,92,246,0.2)] dark:shadow-cyan-500/30">
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
        {/* Main action button */}
        <Button
          onClick={handleStartGame}
          size="lg"
          className="w-full lg:w-auto min-w-[200px] bg-gray-800/50 text-white border-gray-600 hover:bg-gray-700/50"
        >
          {state.gameStatus === "IDLE" && (
            <>
              <Play className="mr-2 size-5" /> Start Game
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
              <RotateCcw className="mr-2 size-5" /> Play Again
            </>
          )}
        </Button>

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

            {/* Board size controls */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-300 dark:text-gray-100">BOARD SIZE</span>
              <div className="flex gap-1">
                {[
                  { label: "Small", size: 15 },
                  { label: "Medium", size: 20 },
                  { label: "Large", size: 25 },
                ].map((option) => (
                  <Button
                    key={option.size}
                    variant="outline"
                    size="sm"
                    disabled={state.gameStatus === "PLAYING" || state.gameStatus === "PAUSED"}
                    onClick={() => setGridSize(option.size)}
                    className={`flex-1 ${state.gridSize === option.size ? "bg-blue-600/50 text-white border-blue-400" : "bg-gray-800/50 text-gray-200 border-gray-600 hover:bg-gray-700/50"}`}
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
              <li>🎮 Arrow keys or WASD to move</li>
              <li>🍎 Eat food to grow and score</li>
              <li>⚠️ Avoid walls and yourself</li>
              <li>⏸️ Pause anytime to take a break</li>
              {isMobile && <li>📱 Use touch controls on mobile</li>}
            </ul>
          </details>
        </Card>
      </div>
    </div>
  );
}

export default SnakeGame;
