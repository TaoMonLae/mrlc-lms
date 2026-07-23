"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PixelBlast from "@/components/PixelBlast";

export default function PacmanSelectPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-gray-950">
      {/* PixelBlast background */}
      <div className="fixed inset-0 z-0">
        <PixelBlast
          variant="square"
          pixelSize={4}
          color="#facc15"
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
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-yellow-950/50 via-slate-950/50 to-blue-950/50" />

      {/* Content */}
      <div className="relative z-10 p-4 sm:p-6 text-white">
        <div className="mb-8 flex flex-col gap-2">
          <div className="flex gap-4 items-center justify-between">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white drop-shadow-lg">
              <span className="text-3xl" role="img" aria-label="Pac-Man">👻</span>
              Pac-Man Modern Arcade
            </h1>
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="bg-gray-800/50 text-white border-gray-600 hover:bg-gray-700/50"
            >
              {"◀ Back"}
            </Button>
          </div>
          <p className="text-gray-300">
            Neon-styled classic arcade action &mdash; eat dots, dodge ghosts, and chase high scores.
          </p>
        </div>

        <Card className="max-w-xl bg-gray-900/60 border-gray-700 p-6 flex flex-col gap-4">
          <div className="text-sm text-gray-300 space-y-1">
            <p>Multiple mazes, authentic ghost AI, and special power-ups (speed, freeze, magnet, shield).</p>
            <p>Use arrow keys / WASD to move, Space for a power boost, P or Esc to pause. Touch controls appear automatically on mobile.</p>
          </div>
          <Button
            onClick={() => navigate("/games/pacman/play")}
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-lg py-6"
          >
            ▶ Play Pac-Man
          </Button>
        </Card>
      </div>
    </div>
  );
}
