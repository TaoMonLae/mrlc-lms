"use client";

import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ChessGame from "./ChessGame";

type Opponent = "AI" | "HUMAN" | "ONLINE";
type Difficulty = "EASY" | "MEDIUM" | "HARD";

export default function ChessPlayPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const opponentParam = searchParams.get("opponent");
  const opponent: Opponent = opponentParam === "HUMAN" ? "HUMAN" : opponentParam === "ONLINE" ? "ONLINE" : "AI";
  const difficultyParam = searchParams.get("difficulty");
  const difficulty: Difficulty = difficultyParam === "EASY" || difficultyParam === "HARD" ? difficultyParam : "MEDIUM";
  const matchId = searchParams.get("matchId") || undefined;

  const subtitle = opponent === "AI" ? `Computer · ${difficulty.toLowerCase()}` : opponent === "ONLINE" ? "Online multiplayer" : "Local two-player game";

  if (opponent === "ONLINE" && !matchId) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#161512] p-6 text-center text-white">
        <div>
          <p className="mb-4 text-white/70">No game selected.</p>
          <Button onClick={() => navigate("/games/chess/lobby")} className="bg-[#759954] hover:bg-[#86a962]">Open multiplayer lobby</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#161512] text-white">
      <div className="mx-auto max-w-7xl p-3 sm:p-5 lg:p-7">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#759954] text-2xl">♞</div>
            <div>
              <h1 className="text-xl font-bold">Chess</h1>
              <p className="text-xs text-white/45">{subtitle}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate(opponent === "ONLINE" ? "/games/chess/lobby" : "/games/chess")} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">◀ {opponent === "ONLINE" ? "Lobby" : "Setup"}</Button>
        </div>
        <ChessGame opponent={opponent} difficulty={difficulty} matchId={matchId} onExit={() => navigate("/games/chess/lobby")} />
      </div>
    </div>
  );
}
