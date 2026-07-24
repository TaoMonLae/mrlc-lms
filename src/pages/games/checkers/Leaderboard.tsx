"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Crown, TrendingUp, BookOpen, Dices, RefreshCw, Loader2 } from "lucide-react";
import { apiGet } from "../../../lib/api";

export interface CheckersLeaderboardEntry {
  id: string;
  studentName: string;
  studentCode: string;
  className: string | null;
  score: number;
  result?: string;
  gameDuration: number;
  movesCount?: number;
  vocabularyWords?: number;
  difficulty?: string | null;
  wins?: number;
  losses?: number;
  draws?: number;
  games?: number;
  playedAt: string;
  rank: number;
  isCurrentUser: boolean;
}

type TimeRange = "TODAY" | "WEEK" | "MONTH" | "ALL_TIME";
type BoardMode = "CLASSIC" | "VOCABULARY";
type Scope = "class" | "all";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CheckersLeaderboard() {
  const [timeRange, setTimeRange] = React.useState<TimeRange>("WEEK");
  const [boardMode, setBoardMode] = React.useState<BoardMode>("CLASSIC");
  const [scope, setScope] = React.useState<Scope>("all");
  const [entries, setEntries] = React.useState<CheckersLeaderboardEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refresh = React.useCallback(() => setRefreshKey((k) => k + 1), []);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await apiGet<{
          success: boolean;
          leaderboard: CheckersLeaderboardEntry[];
        }>(
          `/api/checkers-game/leaderboard?gameMode=${boardMode}&timeRange=${timeRange}&scope=${scope}&limit=20`,
        );
        if (active) setEntries(data.leaderboard ?? []);
      } catch (err: any) {
        if (active) {
          setEntries([]);
          setError(err?.message || "Could not load the leaderboard");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [boardMode, timeRange, scope, refreshKey]);

  // Refresh when the student returns after playing so a new score shows up.
  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="size-6 text-yellow-500" />;
      case 2:
        return <Medal className="size-5 text-gray-300" />;
      case 3:
        return <Medal className="size-5 text-amber-600" />;
      default:
        return <span className="text-sm font-semibold text-white/50">#{rank}</span>;
    }
  };

  const getRankBackground = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/15 to-amber-500/10";
      case 2:
        return "bg-gradient-to-r from-gray-400/10 to-slate-500/10";
      case 3:
        return "bg-gradient-to-r from-amber-600/15 to-orange-500/10";
      default:
        return "bg-white/5";
    }
  };

  const ranges: { id: TimeRange; label: string }[] = [
    { id: "TODAY", label: "Today" },
    { id: "WEEK", label: "Week" },
    { id: "MONTH", label: "Month" },
    { id: "ALL_TIME", label: "All time" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Trophy className="size-5 text-yellow-400" />
          Checkers Leaderboard
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={loading}
          className="bg-white/10 text-white border-white/30 hover:bg-white/20"
          title="Refresh"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={boardMode === "CLASSIC" ? "default" : "outline"}
          size="sm"
          onClick={() => setBoardMode("CLASSIC")}
          className={
            boardMode === "CLASSIC"
              ? "bg-purple-600 hover:bg-purple-500"
              : "bg-white/10 text-white border-white/30"
          }
        >
          <Dices className="size-4 mr-1" /> Classic
        </Button>
        <Button
          variant={boardMode === "VOCABULARY" ? "default" : "outline"}
          size="sm"
          onClick={() => setBoardMode("VOCABULARY")}
          className={
            boardMode === "VOCABULARY"
              ? "bg-emerald-600 hover:bg-emerald-500"
              : "bg-white/10 text-white border-white/30"
          }
        >
          <BookOpen className="size-4 mr-1" /> Vocabulary
        </Button>
        <div className="w-px bg-white/20 mx-1 hidden sm:block" />
        <Button
          variant={scope === "class" ? "default" : "outline"}
          size="sm"
          onClick={() => setScope("class")}
          className={
            scope === "class"
              ? "bg-orange-600 hover:bg-orange-500"
              : "bg-white/10 text-white border-white/30"
          }
        >
          My class
        </Button>
        <Button
          variant={scope === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setScope("all")}
          className={
            scope === "all"
              ? "bg-orange-600 hover:bg-orange-500"
              : "bg-white/10 text-white border-white/30"
          }
        >
          Whole school
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {ranges.map((r) => (
          <Button
            key={r.id}
            variant="outline"
            size="sm"
            onClick={() => setTimeRange(r.id)}
            className={
              timeRange === r.id
                ? "bg-white/25 text-white border-white/50"
                : "bg-white/10 text-white border-white/30"
            }
          >
            {r.label}
          </Button>
        ))}
      </div>

      <Card className="p-4 sm:p-6 bg-white/10 border-white/20 text-white">
        {loading ? (
          <div className="flex justify-center py-10 text-white/60">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-200/90">{error}</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            No scores yet. Finish a game to claim the top spot!
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={`flex items-center gap-3 sm:gap-4 p-3 rounded-lg ${getRankBackground(entry.rank)} ${
                  entry.isCurrentUser ? "ring-2 ring-amber-400/80" : ""
                }`}
              >
                <div className="flex items-center justify-center w-8 shrink-0">
                  {getRankIcon(entry.rank)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{entry.studentName}</span>
                    {entry.isCurrentUser && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-white/55 truncate">
                    {entry.studentCode}
                    {entry.className ? ` · ${entry.className}` : ""}
                    {typeof entry.games === "number" && entry.games > 0
                      ? ` · ${entry.wins ?? 0}W-${entry.draws ?? 0}D-${entry.losses ?? 0}L`
                      : ""}
                    {boardMode === "VOCABULARY" && entry.vocabularyWords
                      ? ` · ${entry.vocabularyWords} words`
                      : ""}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-semibold text-lg text-amber-200">{entry.score}</div>
                  <div className="text-xs text-white/50">{formatDuration(entry.gameDuration)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {entries.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-sm text-white/50">
            <div className="flex items-center gap-1">
              <TrendingUp className="size-4" />
              <span>Top {entries.length} · best score per player</span>
            </div>
            <div className="hidden sm:block">
              Wins, captures, kings
              {boardMode === "VOCABULARY" ? ", and words" : ""} count
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
