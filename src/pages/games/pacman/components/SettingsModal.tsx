import React from 'react';
import { X, Settings, Monitor, Volume2, Gamepad2, Cpu, Eye } from 'lucide-react';
import { AIDifficulty, GameMode, VisualTheme } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: VisualTheme;
  onSelectTheme: (t: VisualTheme) => void;
  difficulty: AIDifficulty;
  onSelectDifficulty: (d: AIDifficulty) => void;
  gameMode: GameMode;
  onSelectGameMode: (m: GameMode) => void;
  enableCRT: boolean;
  onToggleCRT: () => void;
  showTouchControls: boolean;
  onToggleTouchControls: () => void;
  volume: number;
  onChangeVolume: (v: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = React.memo(({
  isOpen,
  onClose,
  theme,
  onSelectTheme,
  difficulty,
  onSelectDifficulty,
  gameMode,
  onSelectGameMode,
  enableCRT,
  onToggleCRT,
  showTouchControls,
  onToggleTouchControls,
  volume,
  onChangeVolume
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col font-mono">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-black text-white tracking-wide">ARCADE CONFIGURATION</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 text-xs text-slate-300 overflow-y-auto max-h-[75vh]">
          {/* Visual Theme */}
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase block mb-2 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-cyan-400" /> VISUAL THEME
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['NEON', 'CLASSIC', 'SYNTHWAVE', 'VECTOR'] as VisualTheme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => onSelectTheme(t)}
                  className={`py-2 px-3 rounded-lg border font-bold transition cursor-pointer text-center ${
                    theme === t
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* AI Difficulty */}
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase block mb-2 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-pink-400" /> GHOST AI DIFFICULTY
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['EASY', 'MEDIUM', 'HARD', 'NIGHTMARE'] as AIDifficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => onSelectDifficulty(d)}
                  className={`py-2 px-3 rounded-lg border font-bold transition cursor-pointer text-center ${
                    difficulty === d
                      ? 'bg-pink-500/20 border-pink-400 text-pink-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Game Mode */}
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase block mb-2 flex items-center gap-1.5">
              <Gamepad2 className="w-3.5 h-3.5 text-yellow-400" /> GAME MODE
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['CLASSIC', 'TIME_ATTACK', 'SURVIVAL', 'PRACTICE'] as GameMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => onSelectGameMode(m)}
                  className={`py-2 px-3 rounded-lg border font-bold transition cursor-pointer text-center ${
                    gameMode === m
                      ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {m.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Volume */}
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase block mb-2 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-green-400" /> SOUND VOLUME ({Math.round(volume * 100)}%)
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-400" /> CRT Scanlines & Vignette
              </span>
              <input
                type="checkbox"
                checked={enableCRT}
                onChange={onToggleCRT}
                className="w-4 h-4 accent-cyan-400 cursor-pointer rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-yellow-400" /> On-Screen Touch D-Pad
              </span>
              <input
                type="checkbox"
                checked={showTouchControls}
                onChange={onToggleTouchControls}
                className="w-4 h-4 accent-cyan-400 cursor-pointer rounded"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
