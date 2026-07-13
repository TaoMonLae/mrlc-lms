"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Trophy, Medal, Crown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeaderboardEntry {
  id: string;
  studentName: string;
  studentCode: string;
  className: string;
  score: number;
  gameDuration: number;
  playedAt: string;
  rank: number;
  isCurrentUser: boolean;
}

interface LeaderboardProps {
  title: string;
  entries: LeaderboardEntry[];
  timeRange?: "TODAY" | "WEEK" | "MONTH" | "ALL_TIME";
  setTimeRange?: (range: "TODAY" | "WEEK" | "MONTH" | "ALL_TIME") => void;
  loading?: boolean;
}

export default function Leaderboard({
  title,
  entries,
  timeRange = "WEEK",
  setTimeRange,
  loading = false,
}: LeaderboardProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="size-6 text-yellow-500" />;
      case 2:
        return <Medal className="size-5 text-gray-400" />;
      case 3:
        return <Medal className="size-5 text-amber-600" />;
      default:
        return <span className="text-sm font-semibold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBackground = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/10 to-amber-500/10";
      case 2:
        return "bg-gradient-to-r from-gray-500/10 to-slate-500/10";
      case 3:
        return "bg-gradient-to-r from-amber-500/10 to-orange-500/10";
      default:
        return "";
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-yellow-500" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {setTimeRange && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTimeRange("TODAY")}
              className={timeRange === "TODAY" ? "bg-primary/10" : ""}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTimeRange("WEEK")}
              className={timeRange === "WEEK" ? "bg-primary/10" : ""}
            >
              This Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTimeRange("MONTH")}
              className={timeRange === "MONTH" ? "bg-primary/10" : ""}
            >
              This Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTimeRange("ALL_TIME")}
              className={timeRange === "ALL_TIME" ? "bg-primary/10" : ""}
            >
              All Time
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading leaderboard...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No scores yet. Be the first to play!
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center gap-4 p-3 rounded-lg ${getRankBackground(entry.rank)} ${
                entry.isCurrentUser ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="flex items-center justify-center w-8">
                {getRankIcon(entry.rank)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{entry.studentName}</span>
                  {entry.isCurrentUser && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10">
                      You
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {entry.studentCode} • {entry.className}
                </div>
              </div>

              <div className="text-right">
                <div className="font-semibold text-lg">{entry.score}</div>
                <div className="text-xs text-muted-foreground">
                  {Math.floor(entry.gameDuration / 60)}:{(entry.gameDuration % 60)
                    .toString()
                    .padStart(2, "0")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <TrendingUp className="size-4" />
            <span>Top {entries.length} players</span>
          </div>
          <div>
            Competition ends{" "}
            {timeRange === "TODAY"
              ? "today"
              : timeRange === "WEEK"
              ? "this week"
              : timeRange === "MONTH"
              ? "this month"
              : "soon"}
          </div>
        </div>
      )}
    </Card>
  );
}
