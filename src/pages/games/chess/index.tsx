"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Color, PieceSymbol } from "chess.js";
import { Bot, Check, Crown, Gamepad2, Swords, Trophy, Users, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "../../../providers/AuthProvider";
import { ChessPieceIcon } from "./pieceIcons";

type Opponent = "AI" | "HUMAN" | "ONLINE";
type Difficulty = "EASY" | "MEDIUM" | "HARD";

const BACK_RANK: PieceSymbol[] = ["r", "n", "b", "q", "k", "b", "n", "r"];

const difficulties: { id: Difficulty; label: string; description: string }[] = [
  { id: "EASY", label: "Easy", description: "Relaxed play with unpredictable moves" },
  { id: "MEDIUM", label: "Medium", description: "Checks your best reply before moving" },
  { id: "HARD", label: "Hard", description: "Plans a couple of moves ahead" },
];

export default function ChessSelectPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [opponent, setOpponent] = useState<Opponent>("AI");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  // Everyone gets a multiplayer pool: students challenge classmates, staff
  // and teachers challenge any other staff member, school-wide.
  const canPlayOnline = true;
  const peerWord = user?.role === "STUDENT" ? "classmate" : "colleague";

  const startGame = () => {
    if (opponent === "ONLINE") {
      navigate("/games/chess/lobby");
      return;
    }
    const params = new URLSearchParams({ opponent });
    if (opponent === "AI") params.set("difficulty", difficulty);
    navigate(`/games/chess/play?${params.toString()}`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#1b1b1b] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(circle_at_20%_15%,rgba(118,150,86,.34),transparent_32%),radial-gradient(circle_at_85%_80%,rgba(185,139,75,.2),transparent_35%)]" />
      <div className="relative mx-auto max-w-5xl p-4 sm:p-6 lg:py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-[#759954] text-3xl shadow-lg">♞</div>
              <h1 className="text-3xl font-bold tracking-tight">Chess</h1>
            </div>
            <p className="max-w-xl text-white/65">Play a complete game of chess against the computer, a friend on this device, or challenge a {peerWord} online.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            {canPlayOnline && (
              <Button variant="outline" onClick={() => navigate("/games/chess/leaderboard")} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Trophy className="mr-2 size-4" /> Leaderboard
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(-1)} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              ◀ Back
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <Card className="overflow-hidden border-white/10 bg-[#262522]/95 text-white shadow-2xl">
            <div className="grid aspect-[1.35] grid-cols-8" aria-hidden="true">
              {Array.from({ length: 64 }, (_, index) => {
                const row = Math.floor(index / 8);
                const col = index % 8;
                const type: PieceSymbol | null = row === 0 || row === 7 ? BACK_RANK[col] : row === 1 || row === 6 ? "p" : null;
                const color: Color | null = row <= 1 ? "b" : row >= 6 ? "w" : null;
                return (
                  <div key={index} className={`grid place-items-center ${(row + col) % 2 === 0 ? "bg-[#eeeed2]" : "bg-[#769656]"}`}>
                    {type && color && <ChessPieceIcon type={type} color={color} className="h-[68%] w-[68%] [filter:drop-shadow(0_2px_2px_rgba(0,0,0,.4))]" />}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="font-semibold">Classical starting position</p>
                <p className="text-sm text-white/50">
                  {opponent === "AI" ? "You play White against the computer." : opponent === "HUMAN" ? "Pass the device between two players." : "Colours are assigned randomly when a challenge is accepted."}
                </p>
              </div>
              <Crown className="size-7 text-amber-400" />
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="border-white/10 bg-[#262522]/95 p-5 text-white">
              <h2 className="mb-4 text-lg font-semibold">Choose an opponent</h2>
              <div className={`grid gap-3 ${canPlayOnline ? "grid-cols-1" : "grid-cols-2"}`}>
                {canPlayOnline && (
                  <button type="button" onClick={() => setOpponent("ONLINE")} className={`rounded-xl border p-4 text-left transition ${opponent === "ONLINE" ? "border-[#98b873] bg-[#759954]/25" : "border-white/10 bg-white/[.03] hover:bg-white/[.07]"}`}>
                    <Wifi className="mb-3 size-6" />
                    <span className="block font-semibold">Challenge a {peerWord}</span>
                    <span className="text-xs text-white/50">Online multiplayer</span>
                  </button>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setOpponent("AI")} className={`rounded-xl border p-4 text-left transition ${opponent === "AI" ? "border-[#98b873] bg-[#759954]/25" : "border-white/10 bg-white/[.03] hover:bg-white/[.07]"}`}>
                    <Bot className="mb-3 size-6" />
                    <span className="block font-semibold">Computer</span>
                    <span className="text-xs text-white/50">Play as White</span>
                  </button>
                  <button type="button" onClick={() => setOpponent("HUMAN")} className={`rounded-xl border p-4 text-left transition ${opponent === "HUMAN" ? "border-[#98b873] bg-[#759954]/25" : "border-white/10 bg-white/[.03] hover:bg-white/[.07]"}`}>
                    <Users className="mb-3 size-6" />
                    <span className="block font-semibold">Local friend</span>
                    <span className="text-xs text-white/50">Share this device</span>
                  </button>
                </div>
              </div>
            </Card>

            {opponent === "AI" && (
              <Card className="border-white/10 bg-[#262522]/95 p-5 text-white">
                <h2 className="mb-4 text-lg font-semibold">Computer strength</h2>
                <div className="space-y-2">
                  {difficulties.map((option) => (
                    <button key={option.id} type="button" onClick={() => setDifficulty(option.id)} className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${difficulty === option.id ? "border-[#98b873] bg-[#759954]/20" : "border-white/10 hover:bg-white/5"}`}>
                      <span className={`grid size-5 shrink-0 place-items-center rounded-full border ${difficulty === option.id ? "border-[#98b873] bg-[#759954]" : "border-white/25"}`}>
                        {difficulty === option.id && <Check className="size-3.5" />}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{option.label}</span>
                        <span className="block text-xs text-white/45">{option.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {opponent === "ONLINE" && (
              <Card className="border-white/10 bg-[#262522]/95 p-5 text-sm text-white/60">
                Send challenges to {peerWord}s, see who's online, and pick up games right where you left off — all from the multiplayer lobby.
              </Card>
            )}

            <Button onClick={startGame} size="lg" className="h-14 w-full bg-[#759954] text-base font-bold text-white shadow-lg hover:bg-[#86a962]">
              {opponent === "AI" ? <Swords className="mr-2 size-5" /> : opponent === "ONLINE" ? <Wifi className="mr-2 size-5" /> : <Gamepad2 className="mr-2 size-5" />}
              {opponent === "ONLINE" ? "Open multiplayer lobby" : "Start game"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
