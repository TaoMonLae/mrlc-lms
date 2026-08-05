import { useEffect, useState } from "react";
import { ArrowRight, Dices, Loader2, Map, Trophy } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiGet } from "@/src/lib/api";
import type { WordTrailHomePayload } from "@/src/types/wordTrail";

export function WordTrailCard() {
  const [data, setData] = useState<WordTrailHomePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<WordTrailHomePayload>("/api/games/word-trail")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && !data) return null;

  const active = data?.activeGame;
  const title = active ? "Your Word Trail is waiting" : "Play the English Word board game";
  const description = active
    ? `Resume on space ${active.position + 1} with ${active.hearts} hearts and ${active.score} points${
      active.pendingTurn ? " — a word is waiting for your answer." : "."
    }`
    : "Roll, answer vocabulary questions, and race across a board of boosts and surprises.";

  return (
    <Card className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#126a65_0%,#168c83_54%,#347da7_100%)] p-5 text-white shadow-[0_12px_30px_rgba(22,140,131,0.14)]">
      <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-academic-gold/15 blur-2xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            {loading
              ? <Loader2 className="h-6 w-6 animate-spin" />
              : active
                ? <Map className="h-6 w-6 text-lime-300" />
                : <Dices className="h-6 w-6 text-amber-300" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black">{loading ? "Loading Word Trail…" : title}</h2>
              {data && data.stats.wins > 0 && (
                <Badge className="border-white/15 bg-white/15 text-white">
                  <Trophy className="mr-1 h-3.5 w-3.5 text-amber-300" />
                  {data.stats.wins} {data.stats.wins === 1 ? "win" : "wins"}
                </Badge>
              )}
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-emerald-50/90">
              {loading ? "Preparing the English Word board." : description}
            </p>
          </div>
        </div>
        {!loading && (
          <Button
            className="shrink-0 rounded-lg bg-white font-bold text-[#126a65] shadow-sm hover:bg-[#fff8e8]"
            render={<Link to="/games/word-trail" />}
            nativeButton={false}
          >
            {active ? "Continue" : "Open game"} <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
