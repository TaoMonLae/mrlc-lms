import React from 'react';
import { X, HelpCircle, Zap, Shield, Flame, Snowflake, Award } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = React.memo(({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col font-mono max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-black text-white tracking-wide">HOW TO PLAY</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 text-xs text-slate-300 overflow-y-auto flex-1 font-sans">
          {/* Objective */}
          <div>
            <h3 className="text-yellow-400 font-bold font-mono text-sm uppercase mb-1">OBJECTIVE</h3>
            <p className="text-slate-300 leading-relaxed">
              Navigate the maze, clear all pellets, dodge the ghosts, and collect special bonus items!
            </p>
          </div>

          {/* Controls */}
          <div>
            <h3 className="text-cyan-400 font-bold font-mono text-sm uppercase mb-2">CONTROLS</h3>
            <ul className="grid grid-cols-2 gap-2 text-xs font-mono">
              <li className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-yellow-400 font-bold">ARROW KEYS / WASD</span>
                <span className="block text-[10px] text-slate-400">Move Pac-Man</span>
              </li>
              <li className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-cyan-400 font-bold">SPACEBAR</span>
                <span className="block text-[10px] text-slate-400">Trigger Power Boost</span>
              </li>
              <li className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-pink-400 font-bold">TOUCH D-PAD</span>
                <span className="block text-[10px] text-slate-400">Mobile Controls</span>
              </li>
              <li className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-green-400 font-bold">P / ESC</span>
                <span className="block text-[10px] text-slate-400">Pause / Resume</span>
              </li>
            </ul>
          </div>

          {/* Power-Ups */}
          <div>
            <h3 className="text-pink-400 font-bold font-mono text-sm uppercase mb-2">POWER-UPS & ITEMS</h3>
            <div className="space-y-2">
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  ●
                </div>
                <div>
                  <div className="font-bold font-mono text-white">Power Pellet (Energizer)</div>
                  <div className="text-[11px] text-slate-400">Turns ghosts blue! Eat them for 200, 400, 800, 1600 points.</div>
                </div>
              </div>

              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-3">
                <Zap className="w-6 h-6 text-yellow-400" />
                <div>
                  <div className="font-bold font-mono text-white">Speed Turbo (⚡)</div>
                  <div className="text-[11px] text-slate-400">Pac-Man gains 1.5x movement speed!</div>
                </div>
              </div>

              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-3">
                <Snowflake className="w-6 h-6 text-cyan-400" />
                <div>
                  <div className="font-bold font-mono text-white">Time Freeze (❄️)</div>
                  <div className="text-[11px] text-slate-400">Freezes all ghosts in ice for 5 seconds!</div>
                </div>
              </div>

              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-3">
                <Flame className="w-6 h-6 text-orange-400" />
                <div>
                  <div className="font-bold font-mono text-white">Pac-Magnet (🧲)</div>
                  <div className="text-[11px] text-slate-400">Attracts dots toward Pac-Man automatically!</div>
                </div>
              </div>
            </div>
          </div>

          {/* Ghost Personalities */}
          <div>
            <h3 className="text-red-400 font-bold font-mono text-sm uppercase mb-2">GHOST PERSONALITIES</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-950 rounded-lg border border-red-500/30">
                <span className="text-red-400 font-mono font-bold block">BLINKY (Red)</span>
                Directly hunts your tile.
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-pink-500/30">
                <span className="text-pink-400 font-mono font-bold block">PINKY (Pink)</span>
                Ambushes 4 tiles ahead.
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-cyan-500/30">
                <span className="text-cyan-400 font-mono font-bold block">INKY (Cyan)</span>
                Flanks using vector math.
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-orange-500/30">
                <span className="text-orange-400 font-mono font-bold block">CLYDE (Orange)</span>
                Shy behavior, retreats when close.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
