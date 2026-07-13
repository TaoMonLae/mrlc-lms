"use client";

import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SnakeProvider } from "./context/SnakeContext";
import SnakeGame from "./SnakeGame";
import VocabularySnakeGame from "./components/VocabularySnakeGame";
import PixelBlast from "@/components/PixelBlast";

function PlayInner({ gameMode }: { gameMode: string }) {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-gray-950">
      {/* PixelBlast background */}
      <div className="fixed inset-0 z-0">
        <PixelBlast
          variant="square"
          pixelSize={4}
          color="#8b5cf6"
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
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-purple-950/50 via-blue-950/50 to-indigo-950/50" />

      {/* Content */}
      <div className="relative z-10 p-4 sm:p-6 text-white">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white drop-shadow-lg">
            {gameMode === "vocabulary" ? "Vocabulary Snake" : "Classic Snake"}
          </h2>
          <Button variant="outline" onClick={() => navigate(-1)} className="bg-gray-800/50 text-white border-gray-600 hover:bg-gray-700/50">
            {"◀ Back"}
          </Button>
        </div>
        {gameMode === "vocabulary" ? <VocabularySnakeGame /> : <SnakeGame />}
      </div>
    </div>
  );
}

export default function SnakePlayPage() {
  const [searchParams] = useSearchParams();
  const gameMode = searchParams.get("mode") === "vocabulary" ? "vocabulary" : "classic";

  return (
    <SnakeProvider storageKey={`snakeHighScore:${gameMode}`}>
      <PlayInner gameMode={gameMode} />
    </SnakeProvider>
  );
}
