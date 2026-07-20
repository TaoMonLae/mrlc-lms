"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Medal, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { apiGet } from "../../../lib/api";
import type { OnlinePlayer } from "./ChessGame";

interface LeaderboardRow extends OnlinePlayer {
  rank: number;
  studentId: string;
  wins: number;
  losses: number;
  draws: number;
  games: number;
  points: number;
}

const RANK_STYLE: Record<number, string> = {
  1: "bg-amber-400/20 text-amber-300",
  2: "bg-slate-300/20 text-slate-200",
  3: "bg-orange-400/20 text-orange-300",
};

export default function ChessLeaderboardPage() {
  const navigate = useNavigate();
  const [scope, setScope] = React.useState<"class" | "all">("class");
  const [className, setClassName] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<LeaderboardRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    apiGet<{ success: boolean; className: string | null; leaderboard: LeaderboardRow[] }>(`/api/games/chess/leaderboard?scope=${scope}`)
      .then((data) => {
        if (cancelled) return;
        setClassName(data.className);
        setRows(data.leaderboard);
      })
      .catch((err) => { if (!cancelled) setError(err?.message || "Couldn't load the leaderboard"); });
    return () => { cancelled = true; };
  }, [scope]);

  return (
    <div className="min-h-screen bg-[#161512] text-white">
      <div className="mx-auto max-w-3xl p-3 sm:p-5 lg:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-amber-500/90 text-2xl"><Trophy className="size-5" /></div>
            <div>
              <h1 className="text-xl font-bold">Chess leaderboard</h1>
              <p className="text-xs text-white/45">{scope === "class" ? className ?? "Your class" : "Whole school"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/games/chess/lobby")} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">◀ Lobby</Button>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          <button type="button" onClick={() => setScope("class")} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${scope === "class" ? "bg-[#759954] text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>My class</button>
          <button type="button" onClick={() => setScope("all")} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${scope === "all" ? "bg-[#759954] text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>Whole school</button>
        </div>

        {rows === null ? (
          <div className="grid min-h-[30vh] place-items-center text-white/50"><Loader2 className="size-6 animate-spin" /></div>
        ) : error ? (
          <Card className="border-white/10 bg-[#262522] p-6 text-center text-white/70">{error}</Card>
        ) : rows.length === 0 ? (
          <Card className="border-white/10 bg-[#262522] p-6 text-center text-white/60">No finished games yet — challenge a classmate to get on the board!</Card>
        ) : (
          <Card className="overflow-hidden border-white/10 bg-[#262522]">
            <div className="grid grid-cols-[2.5rem_1fr_3rem_3rem_3rem_3.5rem] items-center gap-2 border-b border-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/35">
              <span>#</span>
              <span>Student</span>
              <span className="text-center">W</span>
              <span className="text-center">D</span>
              <span className="text-center">L</span>
              <span className="text-right">Pts</span>
            </div>
            {rows.map((row) => (
              <div key={row.studentId} className="grid grid-cols-[2.5rem_1fr_3rem_3rem_3rem_3.5rem] items-center gap-2 border-b border-white/5 px-4 py-2.5 last:border-b-0">
                <span className={`grid size-7 place-items-center rounded-full text-xs font-bold ${RANK_STYLE[row.rank] ?? "bg-white/5 text-white/50"}`}>
                  {row.rank <= 3 ? <Medal className="size-3.5" /> : row.rank}
                </span>
                <div className="flex min-w-0 items-center gap-2.5">
                  <UserAvatar name={row.name} src={row.profilePhotoUrl} className="size-8 shrink-0 text-[11px]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{row.name}</p>
                    <p className="text-[11px] text-white/40">{row.games} game{row.games === 1 ? "" : "s"}</p>
                  </div>
                </div>
                <span className="text-center text-sm text-[#98b873]">{row.wins}</span>
                <span className="text-center text-sm text-white/50">{row.draws}</span>
                <span className="text-center text-sm text-red-300/80">{row.losses}</span>
                <span className="text-right text-sm font-bold">{row.points}</span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
