"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, TrendingUp, Award, Clock, Target, BarChart3 } from "lucide-react";

interface VocabularyAnalytics {
  totalGames: number;
  totalScore: number;
  averageScore: number;
  uniqueWordsLearned: number;
  recentScores: Array<{
    score: number;
    wordsLearned: number;
    playedAt: string;
  }>;
  topWords?: string[];
  improvementRate?: number;
}

interface VocabularyAnalyticsProps {
  studentId?: string;
  teacherView?: boolean;
}

export default function VocabularyAnalytics({
  studentId,
  teacherView = false,
}: VocabularyAnalyticsProps) {
  const [analytics, setAnalytics] = useState<VocabularyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"WEEK" | "MONTH" | "ALL_TIME">("WEEK");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        // For now, use mock data to avoid API issues
        const mockAnalytics: VocabularyAnalytics = {
          totalGames: 0,
          totalScore: 0,
          averageScore: 0,
          uniqueWordsLearned: 0,
          recentScores: [],
        };

        setAnalytics(mockAnalytics);
      } catch (error) {
        console.error("Failed to fetch vocabulary analytics:", error);
        setError("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [studentId, timeRange]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <BarChart3 className="size-8 animate-pulse mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-muted-foreground">
          {error}
        </div>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-muted-foreground">
          No vocabulary learning data available yet. Start playing Vocabulary Snake to track your progress!
        </div>
      </Card>
    );
  }

  const stats = [
    {
      title: "Words Learned",
      value: analytics.uniqueWordsLearned,
      icon: <BookOpen className="size-5 text-blue-500" />,
      color: "from-blue-500/10 to-blue-500/5",
    },
    {
      title: "Games Played",
      value: analytics.totalGames,
      icon: <Award className="size-5 text-green-500" />,
      color: "from-green-500/10 to-green-500/5",
    },
    {
      title: "Average Score",
      value: analytics.averageScore,
      icon: <TrendingUp className="size-5 text-purple-500" />,
      color: "from-purple-500/10 to-purple-500/5",
    },
    {
      title: "Total Score",
      value: analytics.totalScore,
      icon: <Target className="size-5 text-orange-500" />,
      color: "from-orange-500/10 to-orange-500/5",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className={`p-4 bg-gradient-to-br ${stat.color}`}>
            <div className="flex items-center gap-3">
              {stat.icon}
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent performance */}
      {analytics.recentScores.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="size-4" />
            Recent Performance
          </h3>
          <div className="space-y-2">
            {analytics.recentScores.slice(0, 5).map((score, index) => {
              const date = new Date(score.playedAt);
              const formattedDate = date.toLocaleDateString();
              return (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{score.score} pts</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-blue-500">{score.wordsLearned} words</span>
                  </div>
                  <span className="text-muted-foreground">{formattedDate}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Top words learned */}
      {analytics.topWords && analytics.topWords.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="size-4" />
            Top Learned Words
          </h3>
          <div className="flex flex-wrap gap-2">
            {analytics.topWords.map((word, index) => (
              <span
                key={index}
                className="px-3 py-1 rounded-full bg-primary/10 text-sm font-medium"
              >
                {word}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Improvement rate */}
      {analytics.improvementRate !== undefined && (
        <Card className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5 text-green-500" />
              <div>
                <p className="font-semibold">Learning Progress</p>
                <p className="text-sm text-muted-foreground">
                  {analytics.improvementRate > 0
                    ? `+${analytics.improvementRate}% improvement`
                    : `${analytics.improvementRate}% change`}
                </p>
              </div>
            </div>
            <Award className="size-8 text-green-500" />
          </div>
        </Card>
      )}
    </div>
  );
}
