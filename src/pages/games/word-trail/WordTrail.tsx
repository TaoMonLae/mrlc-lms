import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Dices,
  Flame,
  Heart,
  Loader2,
  Medal,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { apiGet, apiSend } from "@/src/lib/api";
import {
  WORD_TRAIL_LAST_POSITION,
  WORD_TRAIL_SPECIAL_TILES,
} from "@/shared/wordTrail";
import type {
  WordTrailAnswerPayload,
  WordTrailGame,
  WordTrailHomePayload,
} from "@/src/types/wordTrail";

const DICE_FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const BOARD_ORDER = [
  20, 21, 22, 23, 24,
  19, 18, 17, 16, 15,
  10, 11, 12, 13, 14,
  9, 8, 7, 6, 5,
  0, 1, 2, 3, 4,
];

function gameAccuracy(game: WordTrailGame): number {
  const total = game.correctCount + game.wrongCount;
  return total ? Math.round((game.correctCount / total) * 100) : 0;
}

function Board({ position }: { position: number }) {
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
            aria-label={`${label}, space ${tile + 1}${playerHere ? ", current player position" : ""}`}
            className={`relative grid min-h-14 place-items-center border border-slate-200/80 p-1 sm:min-h-20 ${effectClass} ${
              finish ? "bg-gradient-to-br from-amber-300 to-orange-400 dark:from-amber-500 dark:to-orange-600" : ""
            }`}
          >
            <span className="absolute left-1.5 top-1 text-[10px] font-black text-slate-500 dark:text-slate-300 sm:text-xs">
              {tile + 1}
            </span>
            <span className="text-xl sm:text-3xl" aria-hidden="true">
              {finish ? "🏆" : start ? "🏁" : effect?.emoji ?? ""}
            </span>
            {playerHere && (
              <span
                className="absolute bottom-1 right-1 grid h-8 w-8 place-items-center rounded-full bg-violet-600 text-lg shadow-lg ring-2 ring-white sm:h-11 sm:w-11 sm:text-2xl"
                aria-hidden="true"
              >
                🧭
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Lobby({
  data,
  starting,
  onStart,
  onResume,
  onBack,
}: {
  data: WordTrailHomePayload;
  starting: boolean;
  onStart: () => void;
  onResume: () => void;
  onBack: () => void;
}) {
  const cards = [
    { label: "Games won", value: data.stats.wins, icon: Trophy, color: "text-amber-300" },
    { label: "Best score", value: data.stats.bestScore, icon: Star, color: "text-yellow-300" },
    { label: "Accuracy", value: `${data.stats.accuracy}%`, icon: Medal, color: "text-sky-300" },
    { label: "Best streak", value: data.stats.bestStreak, icon: Flame, color: "text-orange-300" },
  ];

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
              <Button
                size="lg"
                className="mt-6 bg-white font-black text-emerald-800 hover:bg-emerald-50"
                disabled={starting}
                onClick={data.activeGame ? onResume : onStart}
              >
                {starting
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : data.activeGame
                    ? <Play className="h-5 w-5" />
                    : <Dices className="h-5 w-5" />}
                {data.activeGame ? "Continue game" : "Start Word Trail"}
              </Button>
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

export default function WordTrailPage() {
  const navigate = useNavigate();
  const [home, setHome] = useState<WordTrailHomePayload | null>(null);
  const [game, setGame] = useState<WordTrailGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<WordTrailAnswerPayload | null>(null);

  const loadHome = async () => {
    const data = await apiGet<WordTrailHomePayload>("/api/games/word-trail");
    setHome(data);
    if (data.activeGame) setGame(data.activeGame);
    return data;
  };

  useEffect(() => {
    loadHome()
      .catch((error) => toast.error(error?.message || "Could not load Word Trail"))
      .finally(() => setLoading(false));
  }, []);

  const startGame = async () => {
    setStarting(true);
    try {
      const result = await apiSend<{ game: WordTrailGame }>("/api/games/word-trail/start", "POST", {});
      setGame(result.game);
      setFeedback(null);
      setSelectedOptionId(null);
    } catch (error: any) {
      toast.error(error?.message || "Could not start Word Trail");
    } finally {
      setStarting(false);
    }
  };

  const roll = async () => {
    if (!game) return;
    setRolling(true);
    try {
      const result = await apiSend<{ game: WordTrailGame }>(
        `/api/games/word-trail/${game.id}/roll`,
        "POST",
        {},
      );
      setGame(result.game);
    } catch (error: any) {
      toast.error(error?.message || "Could not roll the die");
    } finally {
      setRolling(false);
    }
  };

  const answer = async () => {
    const question = game?.pendingTurn?.question;
    if (!game || !question || !selectedOptionId) return;
    setAnswering(true);
    try {
      const result = await apiSend<WordTrailAnswerPayload>(
        `/api/games/word-trail/${game.id}/answer`,
        "POST",
        { questionId: question.id, optionId: selectedOptionId },
      );
      setGame(result.game);
      setFeedback(result);
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
  const statusMessage = useMemo(() => {
    if (!feedback) return "";
    if (!feedback.correct) return "That word stays in your learning journey. Try the next one!";
    if (feedback.movement?.effect) {
      return `${feedback.movement.effect.emoji} ${feedback.movement.effect.label}!`;
    }
    return `Your compass moved to space ${(feedback.movement?.to ?? 0) + 1}.`;
  }, [feedback]);

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
        onStart={startGame}
        onResume={() => home.activeGame && setGame(home.activeGame)}
        onBack={() => navigate(-1)}
      />
    );
  }

  if (game.status !== "ACTIVE" && !feedback) {
    const won = game.status === "WON";
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center pb-10">
        <Card className="w-full overflow-hidden rounded-3xl border-0 text-center shadow-2xl dark:bg-surface-indigo">
          <div className={`px-6 py-10 text-white ${
            won
              ? "bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-700"
              : "bg-gradient-to-br from-violet-700 via-indigo-700 to-slate-800"
          }`}>
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-white/15 text-5xl ring-8 ring-white/10">
              {won ? "🏆" : "📚"}
            </div>
            <p className="mt-6 text-sm font-black uppercase tracking-[0.25em] text-white/75">
              {won ? "Trail completed" : "Learning journey saved"}
            </p>
            <h1 className="mt-2 text-4xl font-black">
              {won ? "You reached the Word Trophy!" : "Every word makes you stronger"}
            </h1>
            <p className="mt-3 text-white/80">
              {won ? "A brilliant vocabulary adventure." : "Try again and see how far your words can take you."}
            </p>
          </div>
          <div className="p-6 sm:p-8">
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
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button onClick={startGame} disabled={starting}>
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Play again
              </Button>
              <Button variant="outline" onClick={() => setGame(null)}>
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
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.75fr)]">
        <section>
          <Board position={game.position} />
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white p-3 shadow-sm dark:bg-surface-indigo">
              <div className="flex justify-center gap-0.5 text-rose-500" aria-label={`${game.hearts} hearts remaining`}>
                {Array.from({ length: 4 }, (_, index) => (
                  <Heart key={index} className={`h-5 w-5 ${index < game.hearts ? "fill-current" : "opacity-20"}`} />
                ))}
              </div>
              <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Hearts</p>
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-sm dark:bg-surface-indigo">
              <p className="text-xl font-black text-emerald-600">{game.correctCount}/{game.turnCount}</p>
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

        <Card className="self-start overflow-hidden rounded-3xl border-slate-200 bg-white shadow-xl dark:border-surface-raised dark:bg-surface-indigo">
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
              <Button className="mt-6 w-full" size="lg" onClick={continueTurn}>
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
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-5xl text-emerald-700 shadow-md dark:bg-slate-800 dark:text-emerald-300" aria-label={`Rolled ${pending.roll}`}>
                    {DICE_FACES[pending.roll]}
                  </div>
                </div>
                <h1 className="mt-5 text-2xl font-black leading-snug text-slate-950 dark:text-white">
                  {pending.question.prompt}
                </h1>
              </div>
              <div className="space-y-3 p-5 sm:p-6">
                {pending.question.options.map((option, index) => {
                  const selected = selectedOptionId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedOptionId(option.id)}
                      className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
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
                  onClick={answer}
                >
                  {answering && <Loader2 className="h-4 w-4 animate-spin" />}
                  Lock in answer
                </Button>
              </div>
            </>
          ) : (
            <div className="grid min-h-96 place-items-center p-6 text-center sm:p-8">
              <div>
                <div className="mx-auto grid h-28 w-28 place-items-center rounded-3xl bg-gradient-to-br from-emerald-500 to-sky-600 text-7xl text-white shadow-xl shadow-emerald-950/20">
                  {game.lastRoll ? DICE_FACES[game.lastRoll] : "🎲"}
                </div>
                <Badge className="mt-6 bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                  Turn {game.turnCount + 1}
                </Badge>
                <h2 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">Ready for your next word?</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-300">
                  Roll first. Answer correctly to move the number shown on the die.
                </p>
                <Button
                  size="lg"
                  className="mt-6 min-w-48 bg-emerald-600 font-black hover:bg-emerald-700"
                  disabled={rolling}
                  onClick={roll}
                >
                  {rolling ? <Loader2 className="h-5 w-5 animate-spin" /> : <Dices className="h-5 w-5" />}
                  Roll the die
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
