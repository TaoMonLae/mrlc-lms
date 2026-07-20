"use client";

import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ChessGame from "./ChessGame";

type Opponent = "AI" | "HUMAN";
type Difficulty = "EASY" | "MEDIUM" | "HARD";

export default function ChessPlayPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const opponent: Opponent = searchParams.get("opponent") === "HUMAN" ? "HUMAN" : "AI";
  const difficultyParam = searchParams.get("difficulty");
  const difficulty: Difficulty = difficultyParam === "EASY" || difficultyParam === "HARD" ? difficultyParam : "MEDIUM";

  return (
    <div className="min-h-screen bg-[#161512] text-white">
      <div className="mx-auto max-w-7xl p-3 sm:p-5 lg:p-7">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#759954] text-2xl">♞</div>
            <div>
              <h1 className="text-xl font-bold">Chess</h1>
              <p className="text-xs text-white/45">{opponent === "AI" ? `Computer · ${difficulty.toLowerCase()}` : "Local two-player game"}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/games/chess")} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">◀ Setup</Button>
        </div>
        <ChessGame opponent={opponent} difficulty={difficulty} />
      </div>
    </div>
  );
}
