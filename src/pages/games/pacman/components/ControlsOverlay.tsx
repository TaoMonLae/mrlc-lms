import React from 'react';
import { Play, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Zap, Trophy, ShieldAlert, Sparkles } from 'lucide-react';
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
  onRestartGame: () => void;
  onNextLevel: () => void;
  showTouchControls: boolean;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  status,
  score,
  level,
  isNewHighScore,
  onDirectionChange,
  onTriggerPower,
  onStartGame,
  onResumeGame,
  onRestartGame,
  onNextLevel,
  showTouchControls
}) => {
  return (
    <div className="w-full flex flex-col items-center">
      {/* 1. Modal Overlays for States */}
      {status === 'READY' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
          <div className="inline-flex p-3 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 mb-4 animate-bounce">
            <div className="w-12 h-12 rounded-full bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.8)] flex items-center justify-center text-slate-950 font-black text-xl">
              C:
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-cyan-400 tracking-wider mb-2 drop-shadow-lg">
            PAC-MAN MODERN
          </h1>
          <p className="text-sm text-slate-300 max-w-sm mb-6">
            Eat dots, dodge ghosts, trigger neon power-ups & unleash high score combos!
          </p>

          <button
            onClick={onStartGame}
            className="group relative px-8 py-3.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-black text-lg shadow-lg shadow-yellow-500/30 hover:scale-105 active:scale-95 transition cursor-pointer flex items-center gap-2"
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
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-sm select-none">
          {/* Touch D-Pad */}
          <div className="relative w-36 h-36 bg-slate-900/80 border border-slate-800 rounded-full flex items-center justify-center shadow-lg">
            <button
              onClick={() => onDirectionChange('UP')}
              className="absolute top-1 p-3 rounded-xl bg-slate-800 active:bg-cyan-500 active:text-slate-950 text-slate-300 transition shadow cursor-pointer"
            >
              <ChevronUp className="w-6 h-6" />
            </button>
            <button
              onClick={() => onDirectionChange('DOWN')}
              className="absolute bottom-1 p-3 rounded-xl bg-slate-800 active:bg-cyan-500 active:text-slate-950 text-slate-300 transition shadow cursor-pointer"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
            <button
              onClick={() => onDirectionChange('LEFT')}
              className="absolute left-1 p-3 rounded-xl bg-slate-800 active:bg-cyan-500 active:text-slate-950 text-slate-300 transition shadow cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => onDirectionChange('RIGHT')}
              className="absolute right-1 p-3 rounded-xl bg-slate-800 active:bg-cyan-500 active:text-slate-950 text-slate-300 transition shadow cursor-pointer"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-700" />
          </div>

          {/* Super Power Trigger Button */}
          <button
            onClick={onTriggerPower}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-slate-950 font-black shadow-lg shadow-orange-500/30 active:scale-90 transition flex flex-col items-center justify-center cursor-pointer"
          >
            <Zap className="w-6 h-6 fill-slate-950 mb-0.5" />
            <span className="text-[10px] uppercase">BOOST</span>
          </button>
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
};
