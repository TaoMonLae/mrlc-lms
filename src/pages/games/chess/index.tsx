"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Check, Crown, Gamepad2, Swords, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Opponent = "AI" | "HUMAN";
type Difficulty = "EASY" | "MEDIUM" | "HARD";

const difficulties: { id: Difficulty; label: string; description: string }[] = [
  { id: "EASY", label: "Easy", description: "Relaxed play with unpredictable moves" },
  { id: "MEDIUM", label: "Medium", description: "Looks for captures and safer squares" },
  { id: "HARD", label: "Hard", description: "Searches ahead before choosing a move" },
];

export default function ChessSelectPage() {
  const navigate = useNavigate();
  const [opponent, setOpponent] = useState<Opponent>("AI");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");

  const startGame = () => {
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
            <p className="max-w-xl text-white/65">Play a complete game of chess against the computer or a friend on this device.</p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
            ◀ Back
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <Card className="overflow-hidden border-white/10 bg-[#262522]/95 text-white shadow-2xl">
            <div className="grid aspect-[1.35] grid-cols-8" aria-hidden="true">
              {Array.from({ length: 64 }, (_, index) => {
                const row = Math.floor(index / 8);
                const col = index % 8;
                const pieces = ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"];
                const piece = row === 0 ? pieces[col] : row === 1 ? "♟" : row === 6 ? "♙" : row === 7 ? pieces[col].replace(/[♜♞♝♛♚]/g, (value) => ({ "♜": "♖", "♞": "♘", "♝": "♗", "♛": "♕", "♚": "♔" }[value] ?? value)) : "";
                return (
                  <div key={index} className={`grid place-items-center text-[clamp(1.25rem,4vw,3rem)] ${(row + col) % 2 === 0 ? "bg-[#eeeed2]" : "bg-[#769656]"}`}>
                    <span className={row < 2 ? "text-zinc-900" : "text-white [text-shadow:0_2px_2px_rgba(0,0,0,.65)]"}>{piece}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="font-semibold">Classical starting position</p>
                <p className="text-sm text-white/50">You play White against the computer.</p>
              </div>
              <Crown className="size-7 text-amber-400" />
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="border-white/10 bg-[#262522]/95 p-5 text-white">
              <h2 className="mb-4 text-lg font-semibold">Choose an opponent</h2>
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

            <Button onClick={startGame} size="lg" className="h-14 w-full bg-[#759954] text-base font-bold text-white shadow-lg hover:bg-[#86a962]">
              {opponent === "AI" ? <Swords className="mr-2 size-5" /> : <Gamepad2 className="mr-2 size-5" />}
              Start game
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
