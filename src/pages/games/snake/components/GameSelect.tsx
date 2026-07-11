"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, BookOpen, Zap, Users, Settings } from "lucide-react";
import Leaderboard from "./Leaderboard";
import VocabularyManager from "./VocabularyManager";

type TabType = "games" | "vocabulary" | "leaderboard";

export default function GameSelect() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<TabType>("games");
  const [timeRange, setTimeRange] = React.useState<"TODAY" | "WEEK" | "MONTH" | "ALL_TIME">("WEEK");
  const [loading, setLoading] = React.useState(false);

  // Mock data - replace with actual API call
  const mockLeaderboardData = [
    {
      id: "1",
      studentName: "John Doe",
      studentCode: "STU001",
      className: "GED-A",
      score: 250,
      gameDuration: 180,
      playedAt: new Date().toISOString(),
      rank: 1,
      isCurrentUser: false,
    },
    {
      id: "2",
      studentName: "Jane Smith",
      studentCode: "STU002",
      className: "GED-A",
      score: 200,
      gameDuration: 150,
      playedAt: new Date().toISOString(),
      rank: 2,
      isCurrentUser: true,
    },
    {
      id: "3",
      studentName: "Bob Johnson",
      studentCode: "STU003",
      className: "GED-B",
      score: 150,
      gameDuration: 120,
      playedAt: new Date().toISOString(),
      rank: 3,
      isCurrentUser: false,
    },
  ];

  const gameModes = [
    {
      id: "classic",
      title: "Classic Snake",
      description: "Traditional snake game - eat food, grow longer, avoid walls and yourself!",
      icon: <Zap className="size-8 text-yellow-500" />,
      color: "from-yellow-500/10 to-orange-500/10",
      difficulty: "Easy",
    },
    {
      id: "vocabulary",
      title: "Vocabulary Snake",
      description: "Learn while playing! Each food item is a vocabulary word from your dictionary.",
      icon: <BookOpen className="size-8 text-blue-500" />,
      color: "from-blue-500/10 to-purple-500/10",
      difficulty: "Medium",
      comingSoon: false,
    },
    {
      id: "leaderboard",
      title: "Class Competition",
      description: "Compete with classmates! Weekly tournaments and class rankings.",
      icon: <Users className="size-8 text-green-500" />,
      color: "from-green-500/10 to-emerald-500/10",
      difficulty: "Competitive",
      comingSoon: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-700">
        <Button
          variant={activeTab === "games" ? "default" : "ghost"}
          onClick={() => setActiveTab("games")}
          className="rounded-b-none bg-gray-800/50 text-white hover:bg-gray-700/50"
        >
          <Zap className="size-4 mr-2" />
          Game Modes
        </Button>
        <Button
          variant={activeTab === "vocabulary" ? "default" : "ghost"}
          onClick={() => setActiveTab("vocabulary")}
          className="rounded-b-none bg-gray-800/50 text-white hover:bg-gray-700/50"
        >
          <BookOpen className="size-4 mr-2" />
          Vocabulary
        </Button>
        <Button
          variant={activeTab === "leaderboard" ? "default" : "ghost"}
          onClick={() => setActiveTab("leaderboard")}
          className="rounded-b-none bg-gray-800/50 text-white hover:bg-gray-700/50"
        >
          <Trophy className="size-4 mr-2" />
          Leaderboard
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === "games" && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-white">Choose Game Mode</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {gameModes.map((mode) => (
            <Card
              key={mode.id}
              className={`p-4 bg-gradient-to-br ${mode.color} hover:shadow-lg transition-shadow border border-gray-700/50 shadow-xl`}
            >
              <div className="flex flex-col gap-3 h-full">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-md bg-gray-800/50">
                        {mode.icon}
                      </div>
                      <h3 className="text-lg font-semibold text-white">{mode.title}</h3>
                    </div>
                    <p className="text-sm text-gray-300 mb-3 leading-relaxed">
                      {mode.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-white border border-primary/30">
                        {mode.difficulty}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1" />

                <Button
                  onClick={() => {
                    if (mode.id === "leaderboard") {
                      // This card is a shortcut to the leaderboard, not a game.
                      setActiveTab("leaderboard");
                    } else if (mode.id === "vocabulary") {
                      navigate("/games/snake/play?mode=vocabulary");
                    } else {
                      navigate("/games/snake/play?mode=classic");
                    }
                  }}
                  disabled={mode.comingSoon}
                  className="w-full py-3 text-sm font-semibold bg-gray-800/50 text-white border-gray-600 hover:bg-gray-700/50"
                  size="default"
                >
                  {mode.comingSoon
                    ? "Coming Soon"
                    : mode.id === "leaderboard"
                      ? "View Leaderboard"
                      : "Play Now"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
      )}

      {activeTab === "vocabulary" && (
        <VocabularyManager teacherView={true} />
      )}

      {activeTab === "leaderboard" && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-white">Class Leaderboard</h2>
          <Leaderboard
            title="Top Snake Players"
            entries={mockLeaderboardData}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}
