import React, { useEffect, useState } from 'react';
import { X, Trophy, Award, BarChart2, Loader2 } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { apiGet } from '../../../../lib/api';
import { Achievement, GameMode, GameStats } from '../types';

interface LeaderboardRow {
  rank: number;
  id: string;
  name: string;
  profilePhotoUrl: string | null;
  groupLabel: string | null;
  score: number;
  level: number;
  gameMode: string;
  playedAt: string;
  isCurrentUser: boolean;
}

interface LeaderboardResponse {
  success: boolean;
  gameMode: string;
  leaderboard: LeaderboardRow[];
  you: { rank: number; score: number } | null;
  total: number;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameMode: GameMode;
  stats: GameStats;
  achievements: Achievement[];
}

const RANK_STYLE: Record<number, string> = {
  1: 'text-yellow-400 text-base',
  2: 'text-slate-300',
  3: 'text-amber-600'
};

export const LeaderboardModal: React.FC<LeaderboardModalProps> = React.memo(({
  isOpen,
  onClose,
  gameMode,
  stats,
  achievements
}) => {
  const [activeTab, setActiveTab] = useState<'SCORES' | 'STATS' | 'ACHIEVEMENTS'>('SCORES');
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [you, setYou] = useState<{ rank: number; score: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch the real, school-wide leaderboard every time the modal is opened
  // (and whenever the active game mode changes while it's open) — this is
  // the shared server board every player's runs land on, not a per-browser
  // history, so it always reflects everyone else's scores too.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setRows(null);
    setError(null);
    setYou(null);

    apiGet<LeaderboardResponse>(`/api/games/pacman/leaderboard?gameMode=${gameMode}`)
      .then((data) => {
        if (cancelled) return;
        setRows(data.leaderboard);
        setYou(data.you);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Couldn't load the leaderboard");
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, gameMode]);

  if (!isOpen) return null;

  const youMadeTop = you !== null && rows?.some((row) => row.isCurrentUser);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-black text-white tracking-wide font-mono">ARCADE HALL OF FAME</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2 gap-2 text-xs font-mono font-bold">
          <button
            onClick={() => setActiveTab('SCORES')}
            className={`px-4 py-2 rounded-t-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'SCORES'
                ? 'bg-slate-900 text-yellow-400 border-t-2 border-yellow-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> HIGH SCORES
          </button>
          <button
            onClick={() => setActiveTab('STATS')}
            className={`px-4 py-2 rounded-t-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'STATS'
                ? 'bg-slate-900 text-cyan-400 border-t-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" /> STATISTICS
          </button>
          <button
            onClick={() => setActiveTab('ACHIEVEMENTS')}
            className={`px-4 py-2 rounded-t-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ACHIEVEMENTS'
                ? 'bg-slate-900 text-pink-400 border-t-2 border-pink-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" /> ACHIEVEMENTS
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 font-mono">
          {activeTab === 'SCORES' && (
            <div className="space-y-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide -mt-1">
                Whole-school leaderboard &bull; {gameMode.replace('_', ' ')} mode
              </p>

              {rows === null ? (
                <div className="flex items-center justify-center py-10 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-8 text-slate-500 text-sm">{error}</div>
              ) : rows.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No high scores recorded yet. Play a game to make history!
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className={`py-2.5 flex items-center justify-between text-sm gap-3 rounded-lg ${
                        row.isCurrentUser ? 'bg-cyan-500/10 px-2 -mx-2' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-6 text-center font-black shrink-0 ${RANK_STYLE[row.rank] ?? 'text-slate-500'}`}>
                          #{row.rank}
                        </span>
                        <UserAvatar name={row.name} src={row.profilePhotoUrl} className="w-8 h-8 text-[11px] shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-white uppercase truncate">
                            {row.name}
                            {row.isCurrentUser && <span className="text-cyan-400 normal-case"> (you)</span>}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {row.groupLabel ? `${row.groupLabel} • ` : ''}Stage #{row.level}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-yellow-300">{row.score.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {you && !youMadeTop && (
                <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between text-sm">
                  <span className="text-cyan-400 font-bold">Your rank: #{you.rank}</span>
                  <span className="font-black text-yellow-300">{you.score.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'STATS' && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Dots Eaten</span>
                <span className="text-xl font-black text-yellow-300">{stats.dotsEaten.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Ghosts Eaten</span>
                <span className="text-xl font-black text-pink-400">{stats.ghostsEaten.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Power-Ups Activated</span>
                <span className="text-xl font-black text-cyan-400">{stats.powerUpsCollected.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Bonus Fruits</span>
                <span className="text-xl font-black text-red-400">{stats.fruitsEaten.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Games Played</span>
                <span className="text-xl font-black text-white">{stats.gamesPlayed.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Highest Ghost Combo</span>
                <span className="text-xl font-black text-amber-400">{stats.highestCombo}x</span>
              </div>
            </div>
          )}

          {activeTab === 'ACHIEVEMENTS' && (
            <div className="space-y-3">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition ${
                    ach.unlocked
                      ? 'bg-slate-950/80 border-pink-500/40 text-white'
                      : 'bg-slate-950/30 border-slate-800 opacity-60 text-slate-400'
                  }`}
                >
                  <div className="text-2xl">{ach.icon}</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm flex items-center justify-between">
                      <span>{ach.title}</span>
                      {ach.unlocked ? (
                        <span className="text-[10px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded border border-pink-500/30 font-mono">
                          UNLOCKED
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">LOCKED</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-sans mt-0.5">{ach.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
