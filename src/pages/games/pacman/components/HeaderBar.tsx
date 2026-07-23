import React from 'react';
import { Volume2, VolumeX, Trophy, Settings, HelpCircle, Flame, Shield, Zap, Snowflake } from 'lucide-react';
import { VisualTheme, GameMode, PowerUpType } from '../types';

interface HeaderBarProps {
  score: number;
  highScore: number;
  level: number;
  lives: number;
  isMuted: boolean;
  onToggleMute: () => void;
  theme: VisualTheme;
  onSelectTheme: (t: VisualTheme) => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
  onOpenHowToPlay: () => void;
  gameMode: GameMode;
  activePowerUp: PowerUpType | null;
  powerUpTimeLeft: number;
}

export const HeaderBar: React.FC<HeaderBarProps> = React.memo(({
  score,
  highScore,
  level,
  lives,
  isMuted,
  onToggleMute,
  theme,
  onSelectTheme,
  onOpenLeaderboard,
  onOpenSettings,
  onOpenHowToPlay,
  gameMode,
  activePowerUp,
  powerUpTimeLeft
}) => {
  return (
    <div className="w-full bg-slate-950/90 backdrop-blur-md border-b border-cyan-500/20 px-3 py-2 text-white flex flex-col md:flex-row items-center justify-between gap-2 shadow-lg shadow-cyan-950/40 select-none">
      {/* Left: Scoreboard */}
      <div className="flex items-center gap-6 font-mono">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold">1UP SCORE</span>
          <span className="text-xl md:text-2xl font-black text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]">
            {score.toLocaleString()}
          </span>
        </div>

        <div className="flex flex-col border-l border-slate-800 pl-6">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">HIGH SCORE</span>
          <span className="text-xl md:text-2xl font-black text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.4)]">
            {highScore.toLocaleString()}
          </span>
        </div>

        <div className="hidden sm:flex flex-col border-l border-slate-800 pl-6">
          <span className="text-[10px] uppercase tracking-widest text-pink-400 font-bold">LEVEL</span>
          <span className="text-xl font-bold text-pink-300">#{level}</span>
        </div>
      </div>

      {/* Middle: Active Power-up indicator (if active) */}
      {activePowerUp && (
        <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1 rounded-full border border-yellow-500/50 animate-pulse">
          {activePowerUp === 'SPEED' && <Zap className="w-4 h-4 text-yellow-400" />}
          {activePowerUp === 'FREEZE' && <Snowflake className="w-4 h-4 text-cyan-400" />}
          {activePowerUp === 'MAGNET' && <Flame className="w-4 h-4 text-orange-400" />}
          {activePowerUp === 'SHIELD' && <Shield className="w-4 h-4 text-purple-400" />}
          <span className="text-xs font-bold font-mono text-yellow-300 uppercase">
            {activePowerUp}: {Math.ceil(powerUpTimeLeft)}s
          </span>
        </div>
      )}

      {/* Right: Controls & Info */}
      <div className="flex items-center gap-3">
        {/* Lives Counter */}
        <div className="flex items-center gap-1 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
          <span className="text-xs text-slate-400 font-bold mr-1">LIVES:</span>
          {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full bg-yellow-400 border border-yellow-200 shadow-[0_0_6px_rgba(250,204,21,0.8)]"
              style={{
                clipPath: 'polygon(100% 0%, 0% 0%, 0% 100%, 100% 100%, 50% 50%)'
              }}
            />
          ))}
          {lives === 0 && <span className="text-xs text-red-400 font-mono font-bold">NONE</span>}
        </div>

        {/* Mute Toggle */}
        <button
          onClick={onToggleMute}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition cursor-pointer"
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-green-400" />}
        </button>

        {/* High Scores Button */}
        <button
          onClick={onOpenLeaderboard}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-yellow-400 transition cursor-pointer"
          title="Leaderboard & Stats"
        >
          <Trophy className="w-4 h-4" />
        </button>

        {/* How To Play */}
        <button
          onClick={onOpenHowToPlay}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-cyan-400 transition cursor-pointer"
          title="How to Play"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition cursor-pointer"
          title="Game Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});
