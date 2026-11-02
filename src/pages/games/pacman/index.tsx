"use client";

import * as React from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PixelBlast from "@/components/PixelBlast";
import { getLevelLayout, TOTAL_LEVELS } from "./utils/levels";

const chapters = [
  { label: 'The originals', detail: 'Learn the three maze families.' },
  { label: 'Northern passages', detail: 'Find new shortcuts across the upper lanes.' },
  { label: 'Eastern express', detail: 'Explore openings on the right side.' },
  { label: 'Southern passages', detail: 'Work through the lower corridors.' },
  { label: 'Western express', detail: 'Finish with routes through the left side.' }
];

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
            <p>Clear 15 named stages across three maze families. New regional passages open as you advance.</p>
            <p>Choose Classic, Time Attack, Survival, or Practice in the game settings. Collect every pellet to unlock the next stage.</p>
            <p>Use arrow keys / WASD to move, Space for a power boost, P or Esc to pause. Touch controls appear automatically on mobile.</p>
          </div>
          <Button
            onClick={() => navigate("/games/pacman/play")}
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-lg py-6"
          >
            ▶ Play Pac-Man
          </Button>
        </Card>
        <section className="mt-5 max-w-xl rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 text-white" aria-labelledby="pacman-stages">
          <h2 id="pacman-stages" className="mb-3 font-bold text-yellow-300">15-stage maze campaign</h2>
          <div className="space-y-3">
            {chapters.map((chapter, chapterIndex) => (
              <div key={chapter.label} className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <h3 className="text-sm font-semibold text-cyan-200">{chapter.label}</h3>
                  <span className="text-xs text-slate-400">Stages {chapterIndex * 3 + 1}–{Math.min(TOTAL_LEVELS, chapterIndex * 3 + 3)}</span>
                </div>
                <p className="my-1 text-xs text-slate-400">{chapter.detail}</p>
                <p className="text-xs text-slate-300">{[1, 2, 3].map((offset) => getLevelLayout(chapterIndex * 3 + offset).name).join(' · ')}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
