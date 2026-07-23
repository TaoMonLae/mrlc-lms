/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Maximize2, Minimize2, Radio, Trophy, WifiOff, Zap } from "lucide-react";
import { useEffect, useRef } from "react";
import { apiSend } from "@/src/lib/api";
import {
  setNeonSnakeControl,
  useNeonSnakeStore,
} from "./gameStore";

function ControlButton({
  label,
  control,
  children,
  className = "",
}: {
  label: string;
  control: "left" | "right" | "boost";
  children: React.ReactNode;
  className?: string;
}) {
  const release = () => setNeonSnakeControl(control, false);
  return (
    <button
      type="button"
      aria-label={label}
      className={`pointer-events-auto flex min-h-14 min-w-14 touch-none select-none items-center justify-center rounded-2xl border border-white/20 bg-black/55 px-5 font-black text-white shadow-lg backdrop-blur-md active:scale-95 active:bg-cyan-400/30 ${className}`}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setNeonSnakeControl(control, true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
    </button>
  );
}

type NeonSnakeUIProps = {
  fullscreenSupported: boolean;
  isFullscreen: boolean;
  fullscreenError: string | null;
  onToggleFullscreen: () => void;
};

export function NeonSnakeUI({
  fullscreenSupported,
  isFullscreen,
  fullscreenError,
  onToggleFullscreen,
}: NeonSnakeUIProps) {
  const {
    gameState,
    playerId,
    connectionStatus,
    connectionError,
    joinGame,
  } = useNeonSnakeStore();
  const player = playerId && gameState ? gameState.players[playerId] : null;
  const hasAiObstacle = gameState
    ? Object.values(gameState.players).some((candidate) => candidate.isBot)
    : false;
  const isAlive = player?.state === "alive";
  const isDead = player?.state === "dead";
  const wasAlive = useRef(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (isAlive && !wasAlive.current) {
      startedAt.current = Date.now();
    }
    if (isDead && wasAlive.current && player) {
      const duration = startedAt.current
        ? Math.max(0, Math.round((Date.now() - startedAt.current) / 1_000))
        : 0;
      void apiSend("/api/snake-game/scores", "POST", {
        score: Math.floor(player.score),
        gameMode: "CLASSIC",
        speed: "NORMAL",
        gridSize: 20,
        gameDuration: duration,
        deviceInfo: {
          userAgent: navigator.userAgent,
          screen: { width: window.screen.width, height: window.screen.height },
        },
      }).catch(() => {
        // Score persistence is best-effort so a network error never blocks play.
      });
    }
    wasAlive.current = Boolean(isAlive);
  }, [isAlive, isDead, player]);

  const canPlay = connectionStatus === "connected";

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-4">
      <div className="relative flex items-start justify-between">
        <div className="z-10">
          <h1
            className="text-2xl font-black tracking-tighter text-white sm:text-3xl"
            style={{ textShadow: "0 0 14px rgba(34,211,238,.75)" }}
          >
            NEON.SNAKE
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-white/70">
            {connectionStatus === "connected" ? (
              <>
                <Radio className="size-3 text-emerald-400" /> Live multiplayer
                {hasAiObstacle ? <span className="text-rose-300">· AI obstacle active</span> : null}
              </>
            ) : (
              <>
                <WifiOff className="size-3 text-rose-400" /> {connectionStatus}
              </>
            )}
          </div>
          {isAlive ? (
            <>
              <div className="mt-2 font-mono text-lg font-bold text-white/90">
                Length {Math.floor(player.score)}
              </div>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-100/65 md:hidden">
                Swipe left/right to steer · Swipe up to boost
              </p>
            </>
          ) : null}
        </div>

        <div className="pointer-events-none absolute left-1/2 top-0 hidden -translate-x-1/2 gap-2 md:flex">
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-white/75 backdrop-blur-sm">
            A / D or ← / → to turn
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-white/75 backdrop-blur-sm">
            Space to boost
          </div>
        </div>

        {fullscreenSupported ? (
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
            title={isFullscreen ? "Exit Full Screen (Esc)" : "Enter Full Screen"}
            className="pointer-events-auto relative z-30 ml-auto flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-black/50 px-3 text-xs font-bold text-white shadow-lg backdrop-blur-md transition hover:border-cyan-300/50 hover:bg-cyan-400/15 active:scale-95"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            <span className="hidden sm:inline">
              {isFullscreen ? "Exit Full Screen" : "Full Screen"}
            </span>
          </button>
        ) : null}
      </div>

      {fullscreenError ? (
        <p className="pointer-events-none absolute left-1/2 top-20 z-40 -translate-x-1/2 rounded-xl border border-rose-300/20 bg-rose-950/90 px-4 py-2 text-center text-xs font-semibold text-rose-100 shadow-lg">
          {fullscreenError}
        </p>
      ) : null}

      {gameState?.leaderboard.length ? (
        <section
          aria-label="Live leaderboard"
          className="pointer-events-auto absolute right-3 top-20 w-48 rounded-2xl border border-white/10 bg-black/45 p-3 backdrop-blur-md sm:right-4 sm:w-60 sm:p-4"
        >
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
            <Trophy className="size-4 text-yellow-400" /> LEADERBOARD
          </div>
          <ol className="space-y-1.5">
            {gameState.leaderboard.slice(0, 6).map((entry, index) => (
              <li key={entry.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate" style={{ color: entry.color }}>
                  <span className="mr-1 text-white/40">{index + 1}.</span>
                  {entry.name}
                </span>
                <span className="font-mono text-white/80">{entry.score}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {!player || isDead ? (
        <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/90 p-6 text-center shadow-2xl sm:p-8">
            {isDead ? (
              <>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-rose-300">
                  Arena run complete
                </p>
                <h2 className="mt-2 text-4xl font-black text-rose-500">YOU CRASHED</h2>
                <p className="mt-2 text-white/60">Final length: {Math.floor(player.score)}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">
                  Multiplayer arena
                </p>
                <h2 className="mt-2 text-3xl font-black text-white">JOIN THE GLOW</h2>
                <p className="mt-3 text-sm leading-6 text-white/60">
                  Collect neon orbs, grow longer, and avoid the other snakes.
                </p>
              </>
            )}
            {connectionError ? (
              <p className="mt-4 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {connectionError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={joinGame}
              disabled={!canPlay}
              className="mt-6 w-full rounded-xl bg-white py-4 font-black text-black transition hover:bg-cyan-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {!canPlay ? "CONNECTING…" : isDead ? "RESPAWN" : "PLAY NOW"}
            </button>
          </div>
        </div>
      ) : null}

      {isAlive ? (
        <div className="flex items-end justify-between md:hidden">
          <div className="flex gap-3">
            <ControlButton label="Turn left" control="left">←</ControlButton>
            <ControlButton label="Turn right" control="right">→</ControlButton>
          </div>
          <ControlButton
            label="Boost"
            control="boost"
            className="border-fuchsia-300/40 bg-fuchsia-500/20"
          >
            <span className="flex items-center gap-2">
              <Zap className="size-5" /> BOOST
            </span>
          </ControlButton>
        </div>
      ) : null}
    </div>
  );
}
