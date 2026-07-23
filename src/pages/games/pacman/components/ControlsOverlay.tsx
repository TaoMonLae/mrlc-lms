import React from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trophy,
  Zap
} from 'lucide-react';
import { Direction, GameStatus } from '../types';

interface ControlsOverlayProps {
  status: GameStatus;
  score: number;
  level: number;
  isNewHighScore: boolean;
  onDirectionChange: (dir: Direction) => void;
  onTriggerPower: () => void;
  onStartGame: () => void;
  onResumeGame: () => void;
  onPauseGame: () => void;
  onRestartGame: () => void;
  onNextLevel: () => void;
  showTouchControls: boolean;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = React.memo(({
  status,
  score,
  level,
  isNewHighScore,
  onDirectionChange,
  onTriggerPower,
  onStartGame,
  onResumeGame,
  onPauseGame,
  onRestartGame,
  onNextLevel,
  showTouchControls
}) => {
  return (
    <div className="w-full flex flex-col items-center">
      {/* 1. Modal Overlays for States */}
      {status === 'READY' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 text-center z-30">
          <div className="inline-flex p-2 sm:p-3 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 mb-2 sm:mb-4 animate-bounce">
            <div className="size-10 sm:size-12 rounded-full bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.8)] flex items-center justify-center text-slate-950 font-black text-lg sm:text-xl">
              C:
            </div>
          </div>
          <h1 className="text-2xl min-[380px]:text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-cyan-400 tracking-wider mb-2 drop-shadow-lg">
            PAC-MAN MODERN
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-sm mb-3 sm:mb-6">
            Eat dots, dodge ghosts, trigger neon power-ups & unleash high score combos!
          </p>

          <button
            onClick={onStartGame}
            className="group relative px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-black text-base sm:text-lg shadow-lg shadow-yellow-500/30 hover:scale-105 active:scale-95 transition cursor-pointer flex items-center gap-2"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            START GAME
          </button>
        </div>
      )}

      {status === 'PAUSED' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
          <h2 className="text-3xl font-black text-cyan-300 tracking-widest mb-6 drop-shadow-[0_0_10px_rgba(103,232,249,0.5)]">
            GAME PAUSED
          </h2>

          <div className="flex flex-col gap-3 w-48">
            <button
              onClick={onResumeGame}
              className="px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              RESUME
            </button>
            <button
              onClick={onRestartGame}
              className="px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              RESTART
            </button>
          </div>
        </div>
      )}

      {status === 'LEVEL_CLEAR' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-fade-in">
          <Sparkles className="w-12 h-12 text-yellow-400 mb-2 animate-spin" />
          <h2 className="text-3xl md:text-4xl font-black text-yellow-300 tracking-widest mb-2 drop-shadow-[0_0_15px_rgba(253,224,71,0.6)]">
            LEVEL CLEAR!
          </h2>
          <p className="text-slate-300 font-mono text-lg mb-6">
            Stage <span className="text-pink-400 font-bold">#{level}</span> Completed!
          </p>

          <button
            onClick={onNextLevel}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 text-slate-950 font-black text-lg shadow-lg shadow-green-500/30 hover:scale-105 transition cursor-pointer flex items-center gap-2"
          >
            NEXT LEVEL &rarr;
          </button>
        </div>
      )}

      {status === 'GAME_OVER' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
          <ShieldAlert className="w-12 h-12 text-red-500 mb-2 animate-pulse" />
          <h2 className="text-4xl font-black text-red-500 tracking-widest mb-2 drop-shadow-[0_0_15px_rgba(239,68,68,0.7)]">
            GAME OVER
          </h2>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl w-64 my-4 font-mono">
            <div className="text-xs text-slate-400 uppercase">FINAL SCORE</div>
            <div className="text-3xl font-black text-yellow-400 my-1">
              {score.toLocaleString()}
            </div>
            {isNewHighScore && (
              <div className="inline-flex items-center gap-1 text-xs text-green-400 font-bold mt-1 bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/30">
                <Trophy className="w-3 h-3" /> NEW HIGH SCORE!
              </div>
            )}
          </div>

          <button
            onClick={onRestartGame}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 text-white font-black text-lg shadow-lg shadow-red-500/30 hover:scale-105 active:scale-95 transition cursor-pointer flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            PLAY AGAIN
          </button>
        </div>
      )}

      {/* 2. On-screen Touch Controls / Mobile Virtual D-Pad */}
      {showTouchControls && status === 'PLAYING' && (
        <div className="mt-2 w-full max-w-md select-none rounded-2xl border border-cyan-400/15 bg-slate-900/90 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-xl backdrop-blur-md">
          <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100/60">
            Swipe the maze or use the direction pad
          </p>
          <div className="flex items-center justify-center gap-4">
            {/* Thumb-friendly cross D-Pad */}
            <div className="grid grid-cols-3 grid-rows-3 gap-1">
              <span />
            <button
              type="button"
              aria-label="Move up"
              onPointerDown={(event) => {
                event.preventDefault();
                onDirectionChange('UP');
              }}
              onClick={() => onDirectionChange('UP')}
              className="flex size-12 touch-manipulation items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 shadow transition active:scale-95 active:border-cyan-300 active:bg-cyan-500 active:text-slate-950"
            >
              <ChevronUp className="size-7" />
            </button>
              <span />
            <button
              type="button"
              aria-label="Move left"
              onPointerDown={(event) => {
                event.preventDefault();
                onDirectionChange('LEFT');
              }}
              onClick={() => onDirectionChange('LEFT')}
              className="flex size-12 touch-manipulation items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 shadow transition active:scale-95 active:border-cyan-300 active:bg-cyan-500 active:text-slate-950"
            >
              <ChevronLeft className="size-7" />
            </button>
              <div className="size-12 rounded-xl border border-slate-800 bg-slate-950/80" />
            <button
              type="button"
              aria-label="Move right"
              onPointerDown={(event) => {
                event.preventDefault();
                onDirectionChange('RIGHT');
              }}
              onClick={() => onDirectionChange('RIGHT')}
              className="flex size-12 touch-manipulation items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 shadow transition active:scale-95 active:border-cyan-300 active:bg-cyan-500 active:text-slate-950"
            >
              <ChevronRight className="size-7" />
            </button>
              <span />
            <button
              type="button"
              aria-label="Move down"
              onPointerDown={(event) => {
                event.preventDefault();
                onDirectionChange('DOWN');
              }}
              onClick={() => onDirectionChange('DOWN')}
              className="flex size-12 touch-manipulation items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 shadow transition active:scale-95 active:border-cyan-300 active:bg-cyan-500 active:text-slate-950"
            >
              <ChevronDown className="size-7" />
            </button>
              <span />
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onPointerDown={(event) => {
                  event.preventDefault();
                  onTriggerPower();
                }}
                onClick={onTriggerPower}
                className="flex h-[4.5rem] w-20 touch-manipulation flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 font-black text-slate-950 shadow-lg shadow-orange-500/30 transition active:scale-95"
              >
                <Zap className="mb-0.5 size-6 fill-slate-950" />
                <span className="text-[10px] uppercase">Boost</span>
              </button>
              <button
                type="button"
                onClick={onPauseGame}
                className="flex min-h-12 w-20 touch-manipulation items-center justify-center gap-1 rounded-xl border border-white/15 bg-slate-800 text-xs font-bold text-slate-200 transition active:scale-95 active:bg-slate-700"
              >
                <Pause className="size-4 fill-current" />
                Pause
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Keyboard Helper */}
      {!showTouchControls && status === 'PLAYING' && (
        <div className="mt-3 text-[11px] font-mono text-slate-500 flex items-center gap-4">
          <span><strong className="text-slate-300">ARROW KEYS / WASD</strong> MOVE</span>
          <span>&bull;</span>
          <span><strong className="text-slate-300">SPACE</strong> POWER BOOST</span>
          <span>&bull;</span>
          <span><strong className="text-slate-300">P / ESC</strong> PAUSE</span>
        </div>
      )}
    </div>
  );
});
