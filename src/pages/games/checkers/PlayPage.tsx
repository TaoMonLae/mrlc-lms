"use client";

import * as React from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import CheckerGame from "./CheckerGame";
import PixelBlast from "@/components/PixelBlast";

type OpponentType = "AI" | "HUMAN";
type Difficulty = "EASY" | "MEDIUM" | "HARD";

function PlayInner({ gameMode, opponentType, difficulty }: {
  gameMode: "CLASSIC" | "VOCABULARY";
  opponentType: OpponentType;
  difficulty?: Difficulty;
}) {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-gray-950">
      {/* PixelBlast background */}
      <div className="fixed inset-0 z-0">
        <PixelBlast
          variant="square"
          pixelSize={4}
          color="#f97316"
          patternScale={2}
          patternDensity={1.2}
          enableRipples={true}
          rippleSpeed={0.4}
          rippleIntensityScale={1.2}
          rippleThickness={0.15}
          edgeFade={0.3}
          transparent={true}
          speed={0.3}
        />
      </div>

      {/* Background fallback gradient */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-red-950/50 via-orange-950/50 to-yellow-950/50" />

      {/* Content */}
      <div className="relative z-10 p-4 sm:p-6 text-white">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white drop-shadow-lg">
              {gameMode === "VOCABULARY" ? "Vocabulary Checkers" : "Classic Checkers"}
            </h2>
            <p className="text-sm text-white/60">
              {opponentType === "AI" ? `vs AI (${difficulty})` : "vs Human (Local)"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/games/checkers?tab=leaderboard")}
              className="bg-gray-800/50 text-white border-gray-600 hover:bg-gray-700/50"
            >
              Leaderboard
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/games/checkers")}
              className="bg-gray-800/50 text-white border-gray-600 hover:bg-gray-700/50"
            >
              {"◀ Back"}
            </Button>
          </div>
        </div>
        <CheckerGame
          gameMode={gameMode}
          initialOpponentType={opponentType}
          initialDifficulty={difficulty}
        />
      </div>
    </div>
  );
}

export default function CheckersPlayPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "vocabulary" ? "VOCABULARY" : "CLASSIC";

  const opponentParam = searchParams.get("opponent");
  const opponent: OpponentType = opponentParam === "HUMAN" || opponentParam === "AI"
    ? opponentParam
    : "AI";

  const difficultyParam = searchParams.get("difficulty");
  const difficulty: Difficulty =
    difficultyParam === "EASY" || difficultyParam === "MEDIUM" || difficultyParam === "HARD"
      ? difficultyParam
      : "MEDIUM";

  return <PlayInner gameMode={mode} opponentType={opponent} difficulty={difficulty} />;
}
