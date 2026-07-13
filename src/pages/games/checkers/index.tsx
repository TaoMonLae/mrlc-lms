"use client";

import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PixelBlast from "@/components/PixelBlast";
import { useAuth } from "../../../providers/AuthProvider";
import CheckerVocabularyManager from "./CheckerVocabularyManager";
import { Dices, BookOpen, Bot, Users, Gamepad2, Check, type LucideIcon } from "lucide-react";

function GameSelect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "classic";
  const { user } = useAuth();
  const canManageVocab = user?.role === "ADMIN" || user?.role === "TEACHER";
  const [showVocabManager, setShowVocabManager] = React.useState(false);

  const gameModes: { id: string; title: string; description: string; icon: LucideIcon; color: string }[] = [
    {
      id: "classic",
      title: "Classic Mode",
      description: "Play against AI or a friend. Choose your opponent below!",
      icon: Dices,
      color: "from-purple-500 to-indigo-500",
    },
    {
      id: "vocabulary",
      title: "Vocabulary Mode",
      description: "Learn new words while you play! Each turn reveals a vocabulary word.",
      icon: BookOpen,
      color: "from-emerald-500 to-teal-500",
    },
  ];

  const difficulties = [
    { id: "EASY", label: "Easy", description: "Great for beginners" },
    { id: "MEDIUM", label: "Medium", description: "A fair challenge" },
    { id: "HARD", label: "Hard", description: "Think carefully!" },
  ];

  const [opponentType, setOpponentType] = React.useState<"AI" | "HUMAN">("AI");
  const [difficulty, setDifficulty] = React.useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");

  const startGame = () => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("opponent", opponentType);
    if (opponentType === "AI") {
      params.set("difficulty", difficulty);
    }
    navigate(`/games/checkers/play?${params.toString()}`);
  };

  return (
    <div className="grid grid-cols-1 gap-6 max-w-4xl">
      {/* Game Mode Selection */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-white/80">Select Game Mode</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gameModes.map((gameMode) => (
            <Card
              key={gameMode.id}
              className={`p-6 bg-gradient-to-br ${gameMode.color} border-2 cursor-pointer transition-all ${
                mode === gameMode.id
                  ? "border-white scale-105"
                  : "border-white/20 hover:scale-105"
              }`}
              onClick={() => navigate(`/games/checkers?mode=${gameMode.id}`)}
            >
              <div className="flex flex-col gap-3">
                <gameMode.icon className="h-9 w-9 text-white" />
                <div>
                  <h3 className="text-xl font-bold text-white">{gameMode.title}</h3>
                  <p className="text-sm text-white/80 mt-1">{gameMode.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Opponent & Difficulty Selection */}
      <div className="bg-white/10 rounded-lg p-4 border border-white/20">
        <h2 className="text-lg font-semibold mb-3 text-white">Game Settings</h2>

        {/* Opponent Type */}
        <div className="mb-4">
          <label className="text-sm text-white/80 mb-2 block">Opponent</label>
          <div className="flex gap-3">
            <Button
              variant={opponentType === "AI" ? "default" : "outline"}
              onClick={() => setOpponentType("AI")}
              className={opponentType === "AI" ? "bg-purple-500" : "bg-white/10 text-white border-white/30"}
            >
              <Bot className="h-4 w-4 mr-2" /> AI Opponent
            </Button>
            <Button
              variant={opponentType === "HUMAN" ? "default" : "outline"}
              onClick={() => setOpponentType("HUMAN")}
              className={opponentType === "HUMAN" ? "bg-purple-500" : "bg-white/10 text-white border-white/30"}
            >
              <Users className="h-4 w-4 mr-2" /> Human (Local)
            </Button>
          </div>
        </div>

        {/* Difficulty (AI only) */}
        {opponentType === "AI" && (
          <div>
            <label className="text-sm text-white/80 mb-2 block">AI Difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              {difficulties.map((diff) => (
                <Button
                  key={diff.id}
                  variant={difficulty === diff.id ? "default" : "outline"}
                  onClick={() => setDifficulty(diff.id as any)}
                  className={
                    difficulty === diff.id
                      ? "bg-orange-500"
                      : "bg-white/10 text-white border-white/30 text-sm"
                  }
                >
                  {diff.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-white/60 mt-2">
              {difficulties.find((d) => d.id === difficulty)?.description}
            </p>
          </div>
        )}
      </div>

      {/* Start Button */}
      <Button
        onClick={startGame}
        size="lg"
        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-lg py-6"
      >
        <Gamepad2 className="h-5 w-5 mr-2" /> Start Game
      </Button>

      {/* Features Info */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <h3 className="text-sm font-semibold text-white mb-2">Game Features</h3>
        <ul className="text-xs text-white/70 space-y-1.5">
          {[
            "Undo moves to fix mistakes",
            "Sound effects (can be muted)",
            "AI opponent with 3 difficulty levels",
            "Full checkers rules (forced jumps, multi-jumps, kings)",
            "Vocabulary mode - learn words while playing!",
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Vocabulary management (teachers/admins only) */}
      {canManageVocab && (
        <div>
          <Button
            variant="outline"
            onClick={() => setShowVocabManager((s) => !s)}
            className="bg-white/10 text-white border-white/30 hover:bg-white/20"
          >
            <BookOpen className="h-4 w-4 mr-2" /> {showVocabManager ? "Hide" : "Manage"} Vocabulary
          </Button>
          {showVocabManager && (
            <div className="mt-3">
              <CheckerVocabularyManager />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CheckersSelectInner() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-gray-950">
      {/* PixelBlast background */}
      <div className="fixed inset-0 z-0">
        <PixelBlast
          variant="square"
          pixelSize={4}
          color="#ef4444"
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
        <div className="mb-8 flex flex-col gap-2">
          <div className="flex gap-4 items-center justify-between">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white drop-shadow-lg">
              <Dices className="h-7 w-7" aria-label="Checkers" />
              Checkers Game
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
            Classic board game with AI opponent and vocabulary learning!
          </p>
        </div>
        <GameSelect />
      </div>
    </div>
  );
}

export default function CheckersSelectPage() {
  return <CheckersSelectInner />;
}
