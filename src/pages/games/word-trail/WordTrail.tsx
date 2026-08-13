import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Dices,
  Flag,
  Flame,
  Heart,
  Loader2,
  Map,
  Medal,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  X,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { apiGet, apiSend } from "@/src/lib/api";
import {
  WORD_TRAIL_LAST_POSITION,
  WORD_TRAIL_SPECIAL_TILES,
  WORD_TRAIL_STARTING_HEARTS,
  describeWordTrailMovement,
  resolveWordTrailMovement,
} from "@/shared/wordTrail";
import type {
  WordTrailAnswerPayload,
  WordTrailGame,
  WordTrailHomePayload,
} from "@/src/types/wordTrail";

const DICE_FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

/** Snake-path board layout: bottom row left→right, then alternate directions upward. */
const BOARD_ORDER = [
  20, 21, 22, 23, 24,
  19, 18, 17, 16, 15,
  10, 11, 12, 13, 14,
  9, 8, 7, 6, 5,
  0, 1, 2, 3, 4,
];

/** Forward direction of travel for each tile (used for path chevrons). */
const PATH_NEXT: Record<number, number | null> = Object.fromEntries(
  Array.from({ length: WORD_TRAIL_LAST_POSITION + 1 }, (_, tile) => [
    tile,
    tile >= WORD_TRAIL_LAST_POSITION ? null : tile + 1,
  ]),
);

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function gameAccuracy(game: WordTrailGame): number {
  const total = game.correctCount + game.wrongCount;
  return total ? Math.round((game.correctCount / total) * 100) : 0;
}

function pathChevron(from: number, to: number | null): string {
  if (to == null) return "";
  const fromIndex = BOARD_ORDER.indexOf(from);
  const toIndex = BOARD_ORDER.indexOf(to);
  if (fromIndex < 0 || toIndex < 0) return "→";
  const fromRow = Math.floor(fromIndex / 5);
  const toRow = Math.floor(toIndex / 5);
  const fromCol = fromIndex % 5;
  const toCol = toIndex % 5;
  if (toRow < fromRow) return "↑";
  if (toCol > fromCol) return "→";
  if (toCol < fromCol) return "←";
  return "→";
}

function Board({
  position,
  highlightTo,
  highlightRolledTo,
}: {
  position: number;
  highlightTo?: number | null;
  highlightRolledTo?: number | null;
}) {
  return (
    <div
      className="grid aspect-square w-full grid-cols-5 overflow-hidden rounded-3xl border-4 border-white/70 bg-white shadow-2xl shadow-emerald-950/20 dark:border-slate-700 dark:bg-slate-800"
      role="grid"
      aria-label={`Word Trail board. Player is on space ${position + 1} of ${WORD_TRAIL_LAST_POSITION + 1}.`}
    >
      {BOARD_ORDER.map((tile, index) => {
        const effect = WORD_TRAIL_SPECIAL_TILES[tile];
        const playerHere = tile === position;
        const finish = tile === WORD_TRAIL_LAST_POSITION;
        const start = tile === 0;
        const visited = tile < position;
        const isPreview = highlightTo != null && tile === highlightTo && tile !== position;
        const isRollLanding =
          highlightRolledTo != null
          && tile === highlightRolledTo
          && highlightRolledTo !== highlightTo
          && tile !== position;
        const next = PATH_NEXT[tile];
        const chevron = pathChevron(tile, next);
        const effectClass = effect?.kind === "BOOST"
          ? "bg-sky-100 dark:bg-sky-950/60"
          : effect?.kind === "SLIDE"
            ? "bg-rose-100 dark:bg-rose-950/60"
            : effect?.kind === "BONUS"
              ? "bg-amber-100 dark:bg-amber-950/60"
              : index % 2
                ? "bg-emerald-50 dark:bg-emerald-950/30"
                : "bg-white dark:bg-slate-900";
        const label = finish
          ? "Finish"
          : start
            ? "Start"
            : effect?.label ?? `Space ${tile + 1}`;

        return (
          <div
            key={tile}
            role="gridcell"
            aria-label={`${label}, space ${tile + 1}${playerHere ? ", current player position" : ""}${isPreview ? ", target if correct" : ""}`}
            className={`relative grid min-h-14 place-items-center border border-slate-200/80 p-1 transition-colors sm:min-h-20 ${effectClass} ${
              finish ? "bg-gradient-to-br from-amber-300 to-orange-400 dark:from-amber-500 dark:to-orange-600" : ""
            } ${visited && !playerHere ? "opacity-80" : ""} ${
              isPreview ? "ring-2 ring-inset ring-violet-500 dark:ring-violet-400" : ""
            } ${isRollLanding ? "ring-2 ring-inset ring-sky-400/80" : ""}`}
          >
            <span className="absolute left-1 top-1 text-[10px] font-black text-slate-500 dark:text-slate-300 sm:left-1.5 sm:text-xs">
              {tile + 1}
            </span>
            {!finish && next != null && (
              <span
                className="absolute right-0.5 top-0.5 text-[9px] font-black text-slate-300 dark:text-slate-600 sm:text-[10px]"
                aria-hidden="true"
              >
                {chevron}
              </span>
            )}
            {visited && !playerHere && !finish && (
              <span
                className="absolute bottom-0.5 left-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400/70 sm:h-2 sm:w-2"
                aria-hidden="true"
              />
            )}
            <span className="text-xl sm:text-3xl" aria-hidden="true">
              {finish ? "🏆" : start ? "🏁" : effect?.emoji ?? ""}
            </span>
            {playerHere && (
              <span
                className="absolute bottom-1 right-1 grid h-8 w-8 place-items-center rounded-full bg-violet-600 text-lg shadow-lg ring-2 ring-white transition-transform duration-300 sm:h-11 sm:w-11 sm:text-2xl"
                aria-hidden="true"
              >
                🧭
              </span>
            )}
            {isPreview && !playerHere && (
              <span
                className="absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-violet-500/30 text-xs ring-2 ring-violet-400/50 sm:h-8 sm:w-8 sm:text-sm"
                aria-hidden="true"
              >
                ✦
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HeartsRow({
  hearts,
  total = WORD_TRAIL_STARTING_HEARTS,
  size = "md",
}: {
  hearts: number;
  total?: number;
  size?: "sm" | "md";
}) {
  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div className="flex justify-center gap-0.5 text-rose-500" aria-label={`${hearts} hearts remaining`}>
      {Array.from({ length: total }, (_, index) => (
        <Heart
          key={index}
          className={`${iconClass} transition-opacity ${index < hearts ? "fill-current" : "opacity-20"}`}
        />
      ))}
    </div>
  );
}

function Lobby({
  data,
  starting,
  abandoning,
  onStart,
  onResume,
  onAbandon,
  onBack,
}: {
  data: WordTrailHomePayload;
  starting: boolean;
  abandoning: boolean;
  onStart: () => void;
  onResume: () => void;
  onAbandon: () => void;
  onBack: () => void;
}) {
  const cards = [
    { label: "Games won", value: data.stats.wins, icon: Trophy, color: "text-amber-300" },
    { label: "Best score", value: data.stats.bestScore, icon: Star, color: "text-yellow-300" },
    { label: "Accuracy", value: `${data.stats.accuracy}%`, icon: Medal, color: "text-sky-300" },
    { label: "Best streak", value: data.stats.bestStreak, icon: Flame, color: "text-orange-300" },
  ];
  const active = data.activeGame;
  const recent = data.recentGame;
  const activeProgress = active
    ? Math.round((active.position / WORD_TRAIL_LAST_POSITION) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-700 to-sky-700 p-6 text-white shadow-xl sm:p-9">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-lime-300/10 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 text-white/80 hover:bg-white/10 hover:text-white"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-end">
            <div>
              <Badge className="border-white/20 bg-white/15 text-white">
                <Sparkles className="mr-1 h-3.5 w-3.5" /> English Word board game
              </Badge>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">Word Trail</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">
                Roll the die, solve an English word challenge, and race your compass
                across a board full of stars, bridges, rockets, and surprises.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="bg-white font-black text-emerald-800 hover:bg-emerald-50"
                  disabled={starting || abandoning}
                  onClick={active ? onResume : onStart}
                >
                  {starting
                    ? <Loader2 className="h-5 w-5 animate-spin" />
                    : active
                      ? <Play className="h-5 w-5" />
                      : <Dices className="h-5 w-5" />}
                  {active ? "Continue game" : "Start Word Trail"}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {cards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                  <p className="mt-2 text-2xl font-black">{card.value}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-100/75">{card.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {active && (
        <Card className="rounded-3xl border-emerald-200 bg-gradient-to-r from-emerald-50 to-sky-50 p-5 dark:border-emerald-900 dark:from-emerald-950/40 dark:to-sky-950/30 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white">
                <Map className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Game in progress
                </p>
                <h2 className="mt-0.5 text-lg font-black text-slate-900 dark:text-white">
                  Space {active.position + 1} of {WORD_TRAIL_LAST_POSITION + 1}
                  <span className="mx-2 text-slate-300">·</span>
                  {active.score} pts
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <HeartsRow hearts={active.hearts} size="sm" />
                  <span>{active.correctCount} correct</span>
                  {active.pendingTurn && (
                    <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                      Word waiting
                    </Badge>
                  )}
                </div>
                <Progress value={activeProgress} className="mt-3 h-2 max-w-md" />
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button onClick={onResume} disabled={starting || abandoning}>
                <Play className="h-4 w-4" /> Resume
              </Button>
              <Button
                variant="outline"
                disabled={starting || abandoning}
                onClick={onAbandon}
              >
                {abandoning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                Start over
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!active && recent && (recent.status === "WON" || recent.status === "LOST") && (
        <Card className="rounded-3xl p-5 dark:bg-surface-indigo sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Last game</p>
              <p className="mt-1 font-bold text-slate-900 dark:text-white">
                {recent.status === "WON" ? "Won" : "Finished"} with {recent.score} points
                <span className="font-semibold text-slate-500">
                  {" "}· {gameAccuracy(recent)}% accuracy · streak {recent.bestStreak}
                </span>
              </p>
            </div>
            <Button variant="outline" onClick={onStart} disabled={starting}>
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Play again
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-3xl p-6 dark:bg-surface-indigo sm:p-8">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">How to play</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["1", "Roll", "The server rolls a fair six-sided die for your turn."],
              ["2", "Answer", "Choose the English word that matches the definition."],
              ["3", "Move", "A correct answer moves your compass by the rolled number."],
              ["4", "Reach 25", "Keep at least one heart and reach the trophy to win."],
            ].map(([number, title, text]) => (
              <div key={number} className="flex gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-surface-raised/50">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-600 font-black text-white">
                  {number}
                </span>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white">{title}</h3>
                  <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-sm font-bold">
            <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200">📚 Bridge = move ahead</Badge>
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">⭐ Star = bonus points</Badge>
            <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200">🌀 Slip = move back</Badge>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Follow the small arrows on each space — the trail snakes left and right up the board
            from Start (🏁) to the trophy (🏆).
          </p>
        </Card>

        <Card className="rounded-3xl p-6 dark:bg-surface-indigo">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Top learners</p>
              <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">Word Trail leaderboard</h2>
            </div>
            <Trophy className="h-7 w-7 text-amber-500" />
          </div>
          <div className="mt-5 space-y-2">
            {data.leaderboard.length === 0 && (
              <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500 dark:bg-surface-raised/50">
                Be the first learner to reach the trophy.
              </p>
            )}
            {data.leaderboard.slice(0, 5).map((entry) => (
              <div key={entry.userId} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-surface-raised/50">
                <span className={`grid h-8 w-8 place-items-center rounded-full font-black ${
                  entry.rank === 1 ? "bg-amber-400 text-amber-950" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
                }`}>
                  {entry.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900 dark:text-white">{entry.name}</p>
                  <p className="text-xs text-slate-500">{entry.role === "TEACHER" ? "Teacher" : "Student"} · {entry.accuracy}% accuracy</p>
                </div>
                <span className="font-black text-emerald-600">{entry.score}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function celebrateWin() {
  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;
  confetti({ particleCount: 90, spread: 65, origin: { y: 0.7 } });
  window.setTimeout(() => {
    confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.75 } });
    confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.75 } });
  }, 180);
}

export default function WordTrailPage() {
  const navigate = useNavigate();
  // Present when arriving from a Learning Quest course's "Practice in Word
  // Trail" button -- builds the board from that course's own challenges
  // instead of the default English-word pool. Only consulted when starting a
  // brand new game; an already-active game keeps whatever deck it started with.
  const [searchParams] = useSearchParams();
  const crossoverCourseId = searchParams.get('courseId');
  const [home, setHome] = useState<WordTrailHomePayload | null>(null);
  const [game, setGame] = useState<WordTrailGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [animatedFace, setAnimatedFace] = useState(1);
  const [diceLanded, setDiceLanded] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<WordTrailAnswerPayload | null>(null);
  const questionPanelRef = useRef<HTMLDivElement>(null);
  const celebratedWinId = useRef<string | null>(null);
  const rollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rollIntervalRef.current != null) window.clearInterval(rollIntervalRef.current);
    };
  }, []);

  const loadHome = async (opts?: { syncActiveGame?: boolean }) => {
    const data = await apiGet<WordTrailHomePayload>("/api/games/word-trail");
    setHome(data);
    if (opts?.syncActiveGame && data.activeGame) setGame(data.activeGame);
    return data;
  };

  useEffect(() => {
    loadHome({ syncActiveGame: true })
      .catch((error) => toast.error(error?.message || "Could not load Word Trail"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (game?.status === "WON" && game.id !== celebratedWinId.current) {
      celebratedWinId.current = game.id;
      celebrateWin();
    }
  }, [game?.id, game?.status]);

  const startGame = async () => {
    setStarting(true);
    try {
      const result = await apiSend<{ game: WordTrailGame }>(
        "/api/games/word-trail/start",
        "POST",
        crossoverCourseId ? { courseId: crossoverCourseId } : {},
      );
      setGame(result.game);
      setFeedback(null);
      setSelectedOptionId(null);
      setHome((prev) => (prev ? { ...prev, activeGame: result.game } : prev));
    } catch (error: any) {
      toast.error(error?.message || "Could not start Word Trail");
    } finally {
      setStarting(false);
    }
  };

  const abandonGame = async (gameId?: string) => {
    const id = gameId ?? game?.id ?? home?.activeGame?.id;
    if (!id) return;
    if (!window.confirm("Start over? Your current trail progress will be cleared (it will not count as a loss).")) {
      return;
    }
    setAbandoning(true);
    try {
      await apiSend(`/api/games/word-trail/${id}/abandon`, "POST", {});
      setGame(null);
      setFeedback(null);
      setSelectedOptionId(null);
      await loadHome();
      toast.success("Trail cleared — ready for a fresh start.");
    } catch (error: any) {
      toast.error(error?.message || "Could not restart the trail");
    } finally {
      setAbandoning(false);
    }
  };

  const roll = async () => {
    if (!game) return;
    setRolling(true);
    setDiceLanded(false);
    const reducedMotion = prefersReducedMotion();
    const minAnimationMs = reducedMotion ? 0 : 650;
    const startedAt = Date.now();

    if (!reducedMotion) {
      rollIntervalRef.current = window.setInterval(() => {
        setAnimatedFace((previous) => {
          let next = Math.floor(Math.random() * 6) + 1;
          while (next === previous) next = Math.floor(Math.random() * 6) + 1;
          return next;
        });
      }, 90);
    }

    try {
      const result = await apiSend<{ game: WordTrailGame }>(
        `/api/games/word-trail/${game.id}/roll`,
        "POST",
        {},
      );
      const elapsed = Date.now() - startedAt;
      if (elapsed < minAnimationMs) {
        await new Promise((resolve) => window.setTimeout(resolve, minAnimationMs - elapsed));
      }
      if (rollIntervalRef.current != null) {
        window.clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
      }
      setGame(result.game);
      setSelectedOptionId(null);
      setFeedback(null);
      setDiceLanded(true);
      window.setTimeout(() => setDiceLanded(false), 500);
      window.setTimeout(() => {
        questionPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    } catch (error: any) {
      if (rollIntervalRef.current != null) {
        window.clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
      }
      toast.error(error?.message || "Could not roll the die");
    } finally {
      setRolling(false);
    }
  };

  const answer = async (optionId?: string) => {
    const question = game?.pendingTurn?.question;
    const chosen = optionId ?? selectedOptionId;
    if (!game || !question || !chosen || answering) return;
    setSelectedOptionId(chosen);
    setAnswering(true);
    try {
      const result = await apiSend<WordTrailAnswerPayload>(
        `/api/games/word-trail/${game.id}/answer`,
        "POST",
        { questionId: question.id, optionId: chosen },
      );
      setGame(result.game);
      setFeedback(result);
      if (result.game.status !== "ACTIVE") {
        setHome((prev) => (prev ? { ...prev, activeGame: null } : prev));
      }
    } catch (error: any) {
      toast.error(error?.message || "Could not check that word");
    } finally {
      setAnswering(false);
    }
  };

  const continueTurn = async () => {
    const completed = feedback?.completed;
    setFeedback(null);
    setSelectedOptionId(null);
    if (completed) {
      try {
        await loadHome();
      } catch {
        // The result screen already has everything it needs.
      }
    }
  };

  const leave = () => {
    if (game?.status === "ACTIVE" && !window.confirm("Leave Word Trail? Your game is saved and can be continued later.")) {
      return;
    }
    navigate(-1);
  };

  const displayProgress = game
    ? Math.round((game.position / WORD_TRAIL_LAST_POSITION) * 100)
    : 0;
  const pending = game?.pendingTurn;
  const movementPreview = useMemo(() => {
    if (!game || !pending || feedback) return null;
    return resolveWordTrailMovement(game.position, pending.roll);
  }, [game, pending, feedback]);

  const statusMessage = useMemo(() => {
    if (!feedback) return "";
    if (!feedback.correct) {
      const heartsLeft = feedback.heartsRemaining ?? game?.hearts ?? 0;
      if (feedback.completed) return "That was your last heart — trail complete for now.";
      return `Not quite — you have ${heartsLeft} ${heartsLeft === 1 ? "heart" : "hearts"} left. Keep going!`;
    }
    if (feedback.movement) {
      const base = describeWordTrailMovement(feedback.movement);
      if (feedback.movement.effect) {
        return `${feedback.movement.effect.emoji} ${feedback.movement.effect.label}! ${base}`;
      }
      return base;
    }
    return "Great answer!";
  }, [feedback, game?.hearts]);

  if (loading) {
    return (
      <div className="grid min-h-[65vh] place-items-center text-center">
        <div>
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
          <p className="mt-3 font-semibold text-slate-500">Setting up the Word Trail board…</p>
        </div>
      </div>
    );
  }

  if (!home) {
    return (
      <div className="grid min-h-[65vh] place-items-center text-center">
        <div>
          <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
          <h1 className="mt-3 text-xl font-black text-slate-900 dark:text-white">Word Trail is unavailable</h1>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Check your connection or try again in a moment.
          </p>
          <Button className="mt-5" onClick={() => window.location.reload()}>
            <RotateCcw className="h-4 w-4" /> Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <Lobby
        data={home}
        starting={starting}
        abandoning={abandoning}
        onStart={startGame}
        onResume={() => home.activeGame && setGame(home.activeGame)}
        onAbandon={() => abandonGame(home.activeGame?.id)}
        onBack={() => navigate(-1)}
      />
    );
  }

  if (game.status !== "ACTIVE" && !feedback) {
    const won = game.status === "WON";
    const abandoned = game.status === "ABANDONED";
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center pb-10">
        <Card className="w-full overflow-hidden rounded-3xl border-0 text-center shadow-2xl dark:bg-surface-indigo">
          <div className={`px-6 py-10 text-white ${
            won
              ? "bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-700"
              : abandoned
                ? "bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800"
                : "bg-gradient-to-br from-violet-700 via-indigo-700 to-slate-800"
          }`}>
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-white/15 text-5xl ring-8 ring-white/10">
              {won ? "🏆" : abandoned ? "🗺️" : "📚"}
            </div>
            <p className="mt-6 text-sm font-black uppercase tracking-[0.25em] text-white/75">
              {won ? "Trail completed" : abandoned ? "Trail reset" : "Learning journey saved"}
            </p>
            <h1 className="mt-2 text-4xl font-black">
              {won
                ? "You reached the Word Trophy!"
                : abandoned
                  ? "Ready for a new trail"
                  : "Every word makes you stronger"}
            </h1>
            <p className="mt-3 text-white/80">
              {won
                ? "A brilliant vocabulary adventure."
                : abandoned
                  ? "Your previous run was cleared without counting as a loss."
                  : "Try again and see how far your words can take you."}
            </p>
          </div>
          <div className="p-6 sm:p-8">
            {!abandoned && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-surface-raised/50">
                    <p className="text-2xl font-black text-emerald-600">{game.score}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Points</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-surface-raised/50">
                    <p className="text-2xl font-black text-sky-600">{gameAccuracy(game)}%</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Accuracy</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-surface-raised/50">
                    <p className="text-2xl font-black text-orange-500">{game.bestStreak}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Best streak</p>
                  </div>
                </div>
                <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">
                  You practised <strong>{game.correctCount + game.wrongCount} English words</strong> and answered{" "}
                  <strong>{game.correctCount}</strong> correctly.
                </p>
              </>
            )}
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button onClick={startGame} disabled={starting}>
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Play again
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  setGame(null);
                  try {
                    await loadHome();
                  } catch {
                    /* lobby can still render with last known home */
                  }
                }}
              >
                View lobby
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-12">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Leave Word Trail" onClick={leave}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-48 flex-1">
          <div className="mb-1 flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500">
            <span>Space {game.position + 1} of {WORD_TRAIL_LAST_POSITION + 1}</span>
            <span>{displayProgress}%</span>
          </div>
          <Progress value={displayProgress} className="h-3" />
        </div>
        <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200">
          <Star className="mr-1 h-3.5 w-3.5" /> {game.score} points
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-500"
          disabled={abandoning}
          onClick={() => abandonGame()}
        >
          {abandoning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
          <span className="hidden sm:inline">Start over</span>
        </Button>
      </div>

      {/* On mobile, question panel first so the primary action is above the fold */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.75fr)]">
        <Card
          ref={questionPanelRef}
          className="order-1 self-start overflow-hidden rounded-3xl border-slate-200 bg-white shadow-xl dark:border-surface-raised dark:bg-surface-indigo xl:order-2"
        >
          {feedback ? (
            <div className={`p-6 sm:p-8 ${
              feedback.correct
                ? "bg-emerald-50 dark:bg-emerald-950/30"
                : "bg-rose-50 dark:bg-rose-950/30"
            }`} aria-live="polite">
              <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full text-white ${
                feedback.correct ? "bg-emerald-500" : "bg-rose-500"
              }`}>
                {feedback.correct ? <Check className="h-10 w-10" /> : <X className="h-10 w-10" />}
              </div>
              <h2 className={`mt-5 text-center text-2xl font-black ${
                feedback.correct ? "text-emerald-800 dark:text-emerald-200" : "text-rose-800 dark:text-rose-200"
              }`}>
                {feedback.correct ? "Great word work!" : "Keep building your vocabulary!"}
              </h2>
              <p className="mt-2 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">{statusMessage}</p>

              {feedback.correct && feedback.movement && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                  <span className="rounded-full bg-white/80 px-3 py-1 dark:bg-slate-900/50">
                    Roll {feedback.game.lastRoll ?? (feedback.movement.rolledTo - feedback.movement.from)}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="rounded-full bg-white/80 px-3 py-1 dark:bg-slate-900/50">
                    Space {feedback.movement.to + 1}
                  </span>
                  {feedback.movement.effect && feedback.movement.effect.moveBy !== 0 && (
                    <>
                      <span className="text-slate-400">via</span>
                      <span className="rounded-full bg-white/80 px-3 py-1 dark:bg-slate-900/50">
                        {feedback.movement.effect.emoji} {feedback.movement.rolledTo + 1}
                      </span>
                    </>
                  )}
                </div>
              )}

              {feedback.heartLost && (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <HeartsRow hearts={feedback.heartsRemaining ?? game.hearts} />
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-300">
                    −1 heart
                  </p>
                </div>
              )}

              {!feedback.correct && (
                <p className="mt-4 rounded-xl bg-white/70 p-3 text-center text-sm text-rose-800 dark:bg-slate-900/50 dark:text-rose-200">
                  Correct answer: <strong>{feedback.correctAnswer}</strong>
                </p>
              )}
              {feedback.explanation && (
                <p className="mt-3 text-center text-sm leading-6 text-slate-600 dark:text-slate-300">{feedback.explanation}</p>
              )}
              {feedback.pointsEarned > 0 && (
                <p className="mt-4 text-center text-lg font-black text-violet-600">
                  +{feedback.pointsEarned} points
                </p>
              )}
              <Button className="mt-6 w-full" size="lg" onClick={continueTurn} autoFocus>
                {feedback.completed ? "See results" : "Next turn"} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : pending ? (
            <>
              <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-sky-50 p-6 dark:border-surface-raised dark:from-emerald-950/30 dark:to-sky-950/20">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Badge className="bg-emerald-600 text-white">English Word</Badge>
                    <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">{pending.question.sourceLabel}</p>
                  </div>
                  <div
                    className={`grid h-16 w-16 place-items-center rounded-2xl bg-white text-5xl text-emerald-700 shadow-md dark:bg-slate-800 dark:text-emerald-300 ${diceLanded ? "dice-landed" : ""}`}
                    aria-label={`Rolled ${pending.roll}`}
                  >
                    {DICE_FACES[pending.roll]}
                  </div>
                </div>
                {movementPreview && (
                  <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                    Correct answer moves you{" "}
                    <span className="font-black text-emerald-700 dark:text-emerald-300">
                      {movementPreview.rolledTo - movementPreview.from}{" "}
                      {movementPreview.rolledTo - movementPreview.from === 1 ? "space" : "spaces"}
                    </span>
                    {" "}→ space {movementPreview.to + 1}
                    {movementPreview.rolledTo - movementPreview.from < pending.roll && (
                      <span className="text-slate-500">
                        {" "}(roll {pending.roll} stops at the finish)
                      </span>
                    )}
                    {movementPreview.effect && movementPreview.effect.moveBy !== 0 && (
                      <span className="text-slate-500">
                        {" "}({movementPreview.effect.emoji} via {movementPreview.rolledTo + 1})
                      </span>
                    )}
                    {movementPreview.effect?.kind === "BONUS" && (
                      <span className="text-amber-700 dark:text-amber-300">
                        {" "}· +{movementPreview.effect.bonusPoints} bonus
                      </span>
                    )}
                  </p>
                )}
                <h1 className="mt-5 text-2xl font-black leading-snug text-slate-950 dark:text-white">
                  {pending.question.prompt}
                </h1>
              </div>
              <div
                className="space-y-3 p-5 sm:p-6"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && selectedOptionId && !answering) {
                    event.preventDefault();
                    void answer();
                  }
                }}
              >
                {pending.question.options.map((option, index) => {
                  const selected = selectedOptionId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      disabled={answering}
                      onClick={() => setSelectedOptionId(option.id)}
                      onDoubleClick={() => void answer(option.id)}
                      className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-70 ${
                        selected
                          ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-500/10 dark:bg-emerald-950/30"
                          : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50 dark:border-surface-raised dark:hover:bg-surface-raised/50"
                      }`}
                    >
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black ${
                        selected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-surface-raised dark:text-slate-300"
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option.emoji && <span className="text-xl" aria-hidden="true">{option.emoji}</span>}
                      <span className="font-bold text-slate-800 dark:text-slate-100">{option.text}</span>
                    </button>
                  );
                })}
                <Button
                  size="lg"
                  className="mt-2 w-full bg-emerald-600 font-black hover:bg-emerald-700"
                  disabled={!selectedOptionId || answering}
                  onClick={() => void answer()}
                >
                  {answering && <Loader2 className="h-4 w-4 animate-spin" />}
                  Lock in answer
                </Button>
                <p className="text-center text-xs text-slate-400">
                  Tip: double-tap a choice or press Enter to lock in
                </p>
              </div>
            </>
          ) : (
            <div className="grid min-h-80 place-items-center p-6 text-center sm:min-h-96 sm:p-8">
              <div>
                <div
                  className={`mx-auto grid h-28 w-28 place-items-center rounded-3xl bg-gradient-to-br from-emerald-500 to-sky-600 shadow-xl shadow-emerald-950/20 ${
                    rolling ? "text-6xl text-white dice-rolling" : "text-7xl text-white"
                  }`}
                  aria-hidden="true"
                >
                  {rolling ? DICE_FACES[animatedFace] : "🎲"}
                </div>
                <Badge className="mt-6 bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                  Turn {game.turnCount + 1}
                </Badge>
                <h2 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                  {rolling ? "Rolling…" : "Ready for your next word?"}
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-300">
                  Roll first. Answer correctly to move the number shown on the die.
                  {game.lastRoll ? ` Last roll was ${game.lastRoll}.` : ""}
                </p>
                <Button
                  size="lg"
                  className="mt-6 min-w-48 bg-emerald-600 font-black hover:bg-emerald-700"
                  disabled={rolling}
                  onClick={roll}
                  autoFocus
                >
                  {rolling ? <Loader2 className="h-5 w-5 animate-spin" /> : <Dices className="h-5 w-5" />}
                  Roll the die
                </Button>
              </div>
            </div>
          )}
        </Card>

        <section className="order-2 xl:order-1">
          <Board
            position={game.position}
            highlightTo={
              feedback?.movement?.to
              ?? movementPreview?.to
              ?? null
            }
            highlightRolledTo={
              feedback?.movement?.effect && feedback.movement.effect.moveBy !== 0
                ? feedback.movement.rolledTo
                : movementPreview?.effect && movementPreview.effect.moveBy !== 0
                  ? movementPreview.rolledTo
                  : null
            }
          />
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white p-3 shadow-sm dark:bg-surface-indigo">
              <HeartsRow hearts={game.hearts} />
              <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Hearts</p>
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-sm dark:bg-surface-indigo">
              <p className="text-xl font-black text-emerald-600">
                {game.correctCount}/{game.correctCount + game.wrongCount}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Correct</p>
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-sm dark:bg-surface-indigo">
              <p className="flex items-center justify-center gap-1 text-xl font-black text-orange-500">
                <Flame className="h-5 w-5" /> {game.currentStreak}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Streak</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
