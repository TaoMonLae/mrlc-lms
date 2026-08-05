"use client";

import * as React from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SnakeProvider } from "./context/SnakeContext";
import GameSelect from "./components/GameSelect";
import PixelBlast from "@/components/PixelBlast";

function SnakeSelectInner() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-gray-950">
      {/* PixelBlast background */}
      <div className="fixed inset-0 z-0">
        <PixelBlast
          variant="square"
          pixelSize={4}
          color="#6366f1"
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
        <div className="mb-8 flex flex-col gap-2">
          <div className="flex gap-4 items-center justify-between">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white drop-shadow-lg">
              <span className="text-3xl" role="img" aria-label="Snake">🐍</span>
              Snake Game
            </h1>
            <Button variant="outline" onClick={() => navigate(-1)} className="bg-gray-800/50 text-white border-gray-600 hover:bg-gray-700/50">
              {"◀ Back"}
            </Button>
          </div>
          <p className="text-gray-300">
            Classic snake game with class leaderboards and vocabulary challenges!
          </p>
        </div>
        <GameSelect />
      </div>
    </div>
  );
}

export default function SnakeSelectPage() {
  return (
    <SnakeProvider>
      <SnakeSelectInner />
    </SnakeProvider>
  );
}
