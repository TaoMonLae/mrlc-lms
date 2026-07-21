"use client";

import * as React from "react";
import { Chess, type Color, type Move, type PieceSymbol, type Square } from "chess.js";
import { toast } from "sonner";
import { Bot, Flag, FlipVertical2, History, Loader2, RotateCcw, Swords, Undo2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { apiGet, apiSend } from "../../../lib/api";
import { useChat } from "../../../providers/ChatProvider";
import { ChessPieceIcon } from "./pieceIcons";

type Opponent = "AI" | "HUMAN" | "ONLINE";
type Difficulty = "EASY" | "MEDIUM" | "HARD";
type PromotionPiece = "q" | "r" | "b" | "n";

export interface OnlinePlayer {
  id: string; // User.id
  name: string;
  profilePhotoUrl: string | null;
  // Class name for a student, or a role label ("Teacher", "Staff", ...) for
  // a staff member.
  groupLabel: string | null;
}

export interface OnlineMatch {
  id: string;
  status: "PENDING" | "ACTIVE" | "FINISHED" | "DECLINED" | "CANCELLED";
  scope: "STUDENT" | "STAFF";
  fen: string;
  moves: string[];
  turnColor: "w" | "b";
  result: "WHITE_WINS" | "BLACK_WINS" | "DRAW" | null;
  resultReason: string | null;
  challengerId: string;
  myColor: "w" | "b" | null;
  white: OnlinePlayer | null;
  black: OnlinePlayer | null;
}

interface ChessGameProps {
  opponent: Opponent;
  difficulty: Difficulty;
  /** Required when opponent === "ONLINE". */
  matchId?: string;
  /** Called when the player wants to leave an online game (e.g. back to lobby). */
  onExit?: () => void;
}

const pieceNames: Record<PieceSymbol, string> = { k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };
const pieceValues: Record<PieceSymbol, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20_000 };
const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const promotionPieces: PromotionPiece[] = ["q", "r", "b", "n"];

const CENTER_SQUARES = new Set(["c3", "d3", "e3", "f3", "c4", "d4", "e4", "f4", "c5", "d5", "e5", "f5", "c6", "d6", "e6", "f6"]);

// Static material + center-control score. No isCheckmate()/isDraw() calls
// here on purpose — those internally regenerate chess.js's full legal-move
// list (the expensive part, since every candidate has to be check-tested),
// and calling that again on every single leaf of the search tree was the
// main reason a 3-ply search could take well over a second. minimax() below
// detects checkmate/stalemate itself from the move list it already has to
// generate for branching, so this only ever runs on non-terminal positions.
function evaluate(game: Chess): number {
  let score = 0;
  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const center = CENTER_SQUARES.has(piece.square) ? 12 : 0;
      const value = pieceValues[piece.type] + center;
      score += piece.color === "b" ? value : -value;
    }
  }
  return score;
}

// Search captures first (roughly most-valuable-victim-first). Alpha-beta
// pruning only cuts branches once it finds a move good enough to beat the
// current bound — trying the loudest moves (captures, especially of
// high-value pieces) earlier finds that bound sooner, so more of the
// remaining branches get skipped for the same, unchanged final answer.
function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => (b.captured ? pieceValues[b.captured] : 0) - (a.captured ? pieceValues[a.captured] : 0));
}

function minimax(game: Chess, depth: number, alpha: number, beta: number): number {
  const moves = orderMoves(game.moves({ verbose: true }));
  if (moves.length === 0) {
    // No legal moves: checkmate if the side to move is in check (inCheck()
    // is cheap — no move generation needed), otherwise stalemate.
    if (game.inCheck()) return game.turn() === "b" ? -100_000 : 100_000;
    return 0;
  }
  if (depth === 0) return evaluate(game);
  const maximizing = game.turn() === "b";
  let best = maximizing ? -Infinity : Infinity;
  for (const move of moves) {
    game.move(move);
    const score = minimax(game, depth - 1, alpha, beta);
    game.undo();
    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) break;
  }
  return best;
}

// Scores each root move at a fixed depth, stopping early if `deadline` (a
// Date.now() timestamp) passes. Returns however many moves it got through —
// the caller decides whether a partial pass is trustworthy.
function scoreMoves(game: Chess, moves: Move[], depth: number, deadline?: number): { move: Move; score: number }[] {
  const scored: { move: Move; score: number }[] = [];
  for (const move of moves) {
    if (deadline && Date.now() > deadline) break;
    game.move(move);
    scored.push({ move, score: minimax(game, depth - 1, -Infinity, Infinity) });
    game.undo();
  }
  return scored;
}

function pickBest(scored: { move: Move; score: number }[]): Move | null {
  let bestScore = -Infinity;
  let bestMoves: Move[] = [];
  for (const { move, score: raw } of scored) {
    const score = raw + (Math.random() * 4 - 2); // small jitter for variety among near-equal moves
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (Math.abs(score - bestScore) < 0.001) {
      bestMoves.push(move);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)] ?? scored[0]?.move ?? null;
}

// Progressive deepening with a per-ply time budget: always start from a
// depth-1 pass (cheap on any hardware — a few dozen positions, no
// recursion), then only ever ADD a deeper pass if it fully finishes inside
// its budget, otherwise keep the shallower result. Deadlines are checked
// before every root move, so the worst-case overrun is bounded by roughly
// one root move's cost — not an unbounded freeze. This matters because
// timing chess.js searches in practice showed a lot of variance: a 3-ply
// search was ~300ms in a quiet position but 1-4+ seconds in a busy
// middlegame, and that whole search runs synchronously on the UI thread.
// EASY: a legal move at random — no look-ahead, matches its "relaxed,
// unpredictable" billing.
// MEDIUM: tries to reach 2 plies (its move + your best reply) so it
// actually notices when a move hangs a piece. Previously MEDIUM evaluated
// only the position right after its own move with zero look-ahead, so
// despite the "looks for captures and safer squares" description it
// couldn't see a recapture coming at all.
// HARD: tries to reach 3 plies for real look-ahead into your follow-up too.
const PLY_BUDGET_MS = 300;

function chooseComputerMove(game: Chess, difficulty: Difficulty): Move | null {
  const moves = orderMoves(game.moves({ verbose: true }));
  if (!moves.length) return null;
  if (difficulty === "EASY") return moves[Math.floor(Math.random() * moves.length)];

  let scored = scoreMoves(game, moves, 1);
  const targetDepth = difficulty === "HARD" ? 3 : 2;
  for (let depth = 2; depth <= targetDepth; depth++) {
    const attempt = scoreMoves(game, moves, depth, Date.now() + PLY_BUDGET_MS);
    if (attempt.length < moves.length) break; // ran out of time — the shallower pass stands
    scored = attempt;
  }

  return pickBest(scored);
}

function getStatus(game: Chess, resigned: Color | null) {
  if (resigned) return `${resigned === "w" ? "White" : "Black"} resigned · ${resigned === "w" ? "Black" : "White"} wins`;
  if (game.isCheckmate()) return `Checkmate · ${game.turn() === "w" ? "Black" : "White"} wins`;
  if (game.isStalemate()) return "Draw by stalemate";
  if (game.isThreefoldRepetition()) return "Draw by repetition";
  if (game.isInsufficientMaterial()) return "Draw by insufficient material";
  if (game.isDrawByFiftyMoves()) return "Draw by fifty-move rule";
  if (game.isDraw()) return "Draw";
  if (game.isCheck()) return `${game.turn() === "w" ? "White" : "Black"} is in check`;
  return `${game.turn() === "w" ? "White" : "Black"} to move`;
}

const REASON_LABEL: Record<string, string> = {
  CHECKMATE: "Checkmate",
  RESIGNATION: "Resignation",
  STALEMATE: "Draw by stalemate",
  REPETITION: "Draw by repetition",
  INSUFFICIENT_MATERIAL: "Draw by insufficient material",
  FIFTY_MOVE: "Draw by fifty-move rule",
};

function getOnlineStatus(match: OnlineMatch, game: Chess): string {
  if (match.status === "FINISHED") {
    const reason = REASON_LABEL[match.resultReason ?? ""] ?? "Game over";
    if (match.result === "DRAW") return reason;
    const winnerColor = match.result === "WHITE_WINS" ? "w" : "b";
    const iWon = match.myColor === winnerColor;
    const winnerName = winnerColor === "w" ? match.white?.name : match.black?.name;
    if (match.resultReason === "RESIGNATION") {
      const resignerName = winnerColor === "w" ? match.black?.name : match.white?.name;
      return `${resignerName ?? "Opponent"} resigned · ${iWon ? "You win!" : `${winnerName ?? "Opponent"} wins`}`;
    }
    return `${reason} · ${iWon ? "You win!" : `${winnerName ?? "Opponent"} wins`}`;
  }
  if (game.isCheck()) return `${game.turn() === match.myColor ? "You're" : "Opponent's"} in check`;
  return match.turnColor === match.myColor ? "Your move" : `Waiting for ${match.turnColor === "w" ? match.white?.name : match.black?.name ?? "opponent"}`;
}

const CAPTURE_ORDER: PieceSymbol[] = ["q", "r", "b", "n", "p"];

// Derived from move history's `captured` field rather than counting pieces
// left on the board. Counting board pieces looks right until a pawn
// promotes — the pawn count drops even though nothing was captured, which
// showed up as a phantom "captured pawn" for the other side.
function capturedPieces(game: Chess, color: Color): PieceSymbol[] {
  const captured: PieceSymbol[] = [];
  for (const move of game.history({ verbose: true })) {
    // A move's `captured` piece belongs to whichever side did NOT make the
    // move — so a capture by the opponent removes one of `color`'s pieces.
    if (move.captured && move.color !== color) captured.push(move.captured);
  }
  return captured.sort((a, b) => CAPTURE_ORDER.indexOf(a) - CAPTURE_ORDER.indexOf(b));
}

// Material difference in favor of `color`, in whole pawns. Summed in
// centipawns (plain integers) and only divided once at the very end —
// dividing on every term left tiny floating-point remainders (e.g.
// "+8.881784197001252e-16" instead of an exact 0 at the start position).
function materialDiff(game: Chess, color: Color): number {
  let centipawns = 0;
  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece || piece.type === "k") continue;
      centipawns += (piece.color === color ? 1 : -1) * pieceValues[piece.type];
    }
  }
  return Math.round(centipawns / 100);
}

export default function ChessGame({ opponent, difficulty, matchId, onExit }: ChessGameProps) {
  const gameRef = React.useRef(new Chess());
  const aiTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [revision, setRevision] = React.useState(0);
  const [selected, setSelected] = React.useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = React.useState<Move[]>([]);
  const [flipped, setFlipped] = React.useState(false);
  const [flippedAuto, setFlippedAuto] = React.useState(false);
  const [thinking, setThinking] = React.useState(false);
  const [resigned, setResigned] = React.useState<Color | null>(null);
  const [pendingPromotion, setPendingPromotion] = React.useState<{ from: Square; to: Square } | null>(null);
  const [confirmingResign, setConfirmingResign] = React.useState(false);
  const game = gameRef.current;

  // ── Online (multiplayer) sync ───────────────────────────────────────────────
  const isOnline = opponent === "ONLINE" && !!matchId;
  const [match, setMatch] = React.useState<OnlineMatch | null>(null);
  const [onlineLoading, setOnlineLoading] = React.useState(isOnline);
  const [onlineError, setOnlineError] = React.useState<string | null>(null);
  const [submittingMove, setSubmittingMove] = React.useState(false);
  const chat = useChat();

  const applyMatch = React.useCallback((m: OnlineMatch) => {
    setMatch(m);
    // Replay the SAN move list from the start rather than just loading the
    // final `fen`. Loading a bare FEN gives a Chess instance with no move
    // history, which silently broke two things: the last-move square
    // highlight (nothing to highlight) and capture tracking (nothing to
    // derive captures from). Replaying is cheap — a full game is at most a
    // couple hundred plies — and leaves gameRef with real history, exactly
    // like the local AI/pass-and-play modes already have.
    const replay = new Chess();
    for (const san of m.moves) {
      try {
        replay.move(san);
      } catch {
        break; // shouldn't happen (server is authoritative), but don't crash the UI
      }
    }
    gameRef.current = replay;
    setSelected(null);
    setLegalMoves([]);
    setPendingPromotion(null);
    setRevision((v) => v + 1);
  }, []);

  const refreshMatch = React.useCallback(async () => {
    if (!matchId) return;
    try {
      const data = await apiGet<{ success: boolean; match: OnlineMatch }>(`/api/games/chess/matches/${matchId}`);
      setOnlineError(null);
      applyMatch(data.match);
    } catch (err: any) {
      setOnlineError(err?.message || "Couldn't load this game");
    } finally {
      setOnlineLoading(false);
    }
  }, [matchId, applyMatch]);

  React.useEffect(() => {
    if (!isOnline) return;
    refreshMatch();
    const interval = setInterval(refreshMatch, 3500);
    return () => clearInterval(interval);
  }, [isOnline, refreshMatch]);

  React.useEffect(() => {
    if (!isOnline) return;
    const type = chat.lastEvent?.type;
    if (typeof type === "string" && type.startsWith("chess_") && chat.lastEvent?.matchId === matchId) {
      refreshMatch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.lastEvent, isOnline, matchId]);

  // Orient the board with "me" at the bottom by default, once we know my colour.
  React.useEffect(() => {
    if (isOnline && match?.myColor === "b" && !flippedAuto) {
      setFlipped(true);
      setFlippedAuto(true);
    }
  }, [isOnline, match?.myColor, flippedAuto]);

  const gameOver = isOnline ? match?.status === "FINISHED" : game.isGameOver() || resigned !== null;
  // gameRef always carries full move history now (online games are rebuilt by
  // replaying their SAN list in applyMatch), so both modes read the same way.
  const history = game.history({ verbose: true });
  const lastMove = history.at(-1);
  const historyLength = history.length;

  const refresh = React.useCallback(() => {
    setSelected(null);
    setLegalMoves([]);
    setPendingPromotion(null);
    setRevision((value) => value + 1);
  }, []);

  React.useEffect(() => {
    if (opponent !== "AI" || game.turn() !== "b" || game.isGameOver() || resigned) return;
    setThinking(true);
    aiTimerRef.current = setTimeout(() => {
      const move = chooseComputerMove(game, difficulty);
      if (move) game.move(move);
      setThinking(false);
      refresh();
    }, 450);
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    };
  }, [difficulty, game, opponent, refresh, resigned, revision]);

  const submitOnlineMove = async (from: Square, to: Square, promotion?: PromotionPiece) => {
    if (!matchId) return;
    setSubmittingMove(true);
    setSelected(null);
    setLegalMoves([]);
    setPendingPromotion(null);
    try {
      const data = await apiSend<{ success: boolean; match: OnlineMatch }>(`/api/games/chess/matches/${matchId}/move`, "POST", { from, to, promotion });
      applyMatch(data.match);
    } catch (err: any) {
      toast.error(err?.message || "That move didn't go through");
      refreshMatch();
    } finally {
      setSubmittingMove(false);
    }
  };

  const completeMove = (from: Square, to: Square, promotion?: PromotionPiece) => {
    if (isOnline) return submitOnlineMove(from, to, promotion);
    try {
      game.move({ from, to, promotion });
      refresh();
    } catch {
      setSelected(null);
      setLegalMoves([]);
    }
  };

  const handleSquareClick = (square: Square) => {
    if (pendingPromotion) return;
    if (isOnline) {
      if (!match || match.status !== "ACTIVE" || submittingMove || match.myColor !== match.turnColor) return;
    } else {
      if (thinking || gameOver || (opponent === "AI" && game.turn() === "b")) return;
    }
    const piece = game.get(square);
    const destinationMoves = selected ? legalMoves.filter((move) => move.to === square) : [];

    if (selected && destinationMoves.length) {
      if (destinationMoves.some((move) => move.isPromotion())) setPendingPromotion({ from: selected, to: square });
      else completeMove(selected, square);
      return;
    }
    const mySide = isOnline ? match?.myColor : game.turn();
    if (piece?.color === game.turn() && (!isOnline || piece.color === mySide)) {
      setSelected(square);
      setLegalMoves(game.moves({ square, verbose: true }));
    } else {
      setSelected(null);
      setLegalMoves([]);
    }
  };

  const reset = () => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    game.reset();
    setResigned(null);
    setThinking(false);
    refresh();
  };

  const undo = () => {
    if (!history.length || thinking) return;
    game.undo();
    if (opponent === "AI" && game.turn() === "b" && game.history().length) game.undo();
    setResigned(null);
    refresh();
  };

  const confirmResign = () => {
    if (isOnline) {
      resignOnline();
    } else {
      setResigned(game.turn());
      setConfirmingResign(false);
    }
  };

  const resignOnline = async () => {
    if (!matchId) return;
    setConfirmingResign(false);
    try {
      const data = await apiSend<{ success: boolean; match: OnlineMatch }>(`/api/games/chess/matches/${matchId}/resign`, "POST", {});
      applyMatch(data.match);
    } catch (err: any) {
      toast.error(err?.message || "Couldn't resign");
    }
  };

  const displayedRanks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const displayedFiles = flipped ? [...files].reverse() : [...files];
  const capturedWhite = capturedPieces(game, "w");
  const capturedBlack = capturedPieces(game, "b");
  const material = materialDiff(game, "w");

  // King square for the side in check, to draw a warning glow around it.
  let checkSquare: Square | null = null;
  if (game.isCheck()) {
    const turn = game.turn();
    outer: for (const row of game.board()) {
      for (const piece of row) {
        if (piece?.type === "k" && piece.color === turn) { checkSquare = piece.square; break outer; }
      }
    }
  }

  const topPlayer = isOnline
    ? (match?.myColor === "w" ? match?.black : match?.white)
    : null;
  const bottomPlayer = isOnline
    ? (match?.myColor === "w" ? match?.white : match?.black)
    : null;
  const topColor: Color = isOnline ? (match?.myColor === "w" ? "b" : "w") : "b";
  const bottomColor: Color = isOnline ? (match?.myColor === "w" ? "w" : "b") : "w";

  if (isOnline && onlineLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-white/60">
        <div className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" /> Loading game…</div>
      </div>
    );
  }

  if (isOnline && (onlineError || !match)) {
    return (
      <Card className="mx-auto max-w-md border-white/10 bg-[#262522] p-6 text-center text-white">
        <p className="mb-4 text-white/70">{onlineError || "This game couldn't be found."}</p>
        <Button onClick={onExit} className="bg-[#759954] hover:bg-[#86a962]">Back to lobby</Button>
      </Card>
    );
  }

  if (isOnline && (match!.status === "DECLINED" || match!.status === "CANCELLED")) {
    return (
      <Card className="mx-auto max-w-md border-white/10 bg-[#262522] p-6 text-center text-white">
        <p className="mb-4 text-white/70">{match!.status === "DECLINED" ? "This challenge was declined." : "This challenge was cancelled."}</p>
        <Button onClick={onExit} className="bg-[#759954] hover:bg-[#86a962]">Back to lobby</Button>
      </Card>
    );
  }

  if (isOnline && match!.status === "PENDING") {
    const myId = match!.myColor === "w" ? match!.white?.id : match!.black?.id;
    const iAmChallenger = match!.challengerId === myId;
    const opponentName = (match!.myColor === "w" ? match!.black?.name : match!.white?.name) ?? "your opponent";
    return (
      <Card className="mx-auto max-w-md border-white/10 bg-[#262522] p-6 text-center text-white">
        <div className="mb-3 text-4xl">⏳</div>
        <p className="mb-1 text-lg font-semibold">{iAmChallenger ? `Waiting for ${opponentName} to accept` : `${opponentName} challenged you`}</p>
        <p className="mb-5 text-sm text-white/50">{iAmChallenger ? "You'll be notified the moment they respond." : "Accept the challenge from the lobby to start playing."}</p>
        <Button variant="outline" onClick={onExit} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">Back to lobby</Button>
      </Card>
    );
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="mx-auto w-full max-w-[min(82vh,760px)]">
        {isOnline ? (
          <OnlinePlayerBar player={topPlayer} active={!gameOver && match!.turnColor === topColor} color={topColor} captured={topColor === "w" ? capturedBlack : capturedWhite} material={topColor === "w" ? material : -material} />
        ) : (
          <PlayerBar label={opponent === "AI" ? `Computer · ${difficulty.toLowerCase()}` : "Black"} icon={opponent === "AI" ? <Bot className="size-4" /> : <Users className="size-4" />} active={!gameOver && game.turn() === "b"} thinking={thinking} captured={capturedWhite} color="w" material={material} />
        )}

        <div className="relative mt-2 aspect-square w-full overflow-hidden rounded-[4px] shadow-[0_16px_50px_rgba(0,0,0,.5)]" role="grid" aria-label="Chess board">
          <div className="grid h-full w-full grid-cols-8 grid-rows-8">
            {displayedRanks.flatMap((rank, rowIndex) => displayedFiles.map((file, colIndex) => {
              const square = `${file}${rank}` as Square;
              const piece = game.get(square);
              const move = legalMoves.find((candidate) => candidate.to === square);
              const isLight = (files.indexOf(file) + rank) % 2 === 1;
              const isSelected = selected === square;
              const wasLastMove = lastMove?.from === square || lastMove?.to === square;
              const isCheckSquare = checkSquare === square;
              const showFile = rowIndex === 7;
              const showRank = colIndex === 0;
              return (
                <button
                  type="button"
                  role="gridcell"
                  aria-label={`${square}${piece ? `, ${piece.color === "w" ? "white" : "black"} ${pieceNames[piece.type]}` : ""}`}
                  key={square}
                  onClick={() => handleSquareClick(square)}
                  className={`relative grid min-h-0 min-w-0 place-items-center select-none ${isLight ? "bg-[#eeeed2]" : "bg-[#769656]"} ${wasLastMove ? "after:absolute after:inset-0 after:bg-yellow-300/45" : ""} ${isSelected ? "after:absolute after:inset-0 after:bg-yellow-300/60" : ""}`}
                >
                  {isCheckSquare && <span className="absolute inset-0 z-10 rounded-[2px] bg-red-500/55 [box-shadow:inset_0_0_18px_6px_rgba(220,38,38,.85)]" />}
                  {showRank && <span className={`absolute left-1 top-0.5 z-20 text-[clamp(.52rem,1.2vw,.8rem)] font-bold ${isLight ? "text-[#769656]" : "text-[#eeeed2]"}`}>{rank}</span>}
                  {showFile && <span className={`absolute bottom-0 right-1 z-20 text-[clamp(.52rem,1.2vw,.8rem)] font-bold ${isLight ? "text-[#769656]" : "text-[#eeeed2]"}`}>{file}</span>}
                  {move && !piece && <span className="absolute z-20 size-[28%] rounded-full bg-black/20" />}
                  {move && piece && <span className="absolute inset-[5%] z-20 rounded-full border-[clamp(3px,.65vw,7px)] border-black/20" />}
                  {piece && (
                    <ChessPieceIcon
                      type={piece.type}
                      color={piece.color}
                      className={`relative z-10 h-[80%] w-[80%] shrink-0 transition-transform duration-150 [filter:drop-shadow(0_2px_2px_rgba(0,0,0,.45))] ${isSelected ? "scale-110" : ""}`}
                    />
                  )}
                </button>
              );
            }))}
          </div>

          {isOnline && submittingMove && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-black/25">
              <Loader2 className="size-6 animate-spin text-white/80" />
            </div>
          )}

          {pendingPromotion && (
            <div className="absolute inset-0 z-40 grid place-items-center bg-black/45 p-5" role="dialog" aria-label="Choose promotion piece">
              <div className="rounded-2xl bg-[#262522] p-4 shadow-2xl">
                <p className="mb-3 text-center text-sm font-semibold">Promote pawn to</p>
                <div className="flex gap-2">
                  {promotionPieces.map((piece) => (
                    <button key={piece} type="button" onClick={() => completeMove(pendingPromotion.from, pendingPromotion.to, piece)} className="grid size-16 place-items-center rounded-xl bg-[#eeeed2] transition hover:scale-105 hover:bg-white" aria-label={`Promote to ${pieceNames[piece]}`}>
                      <ChessPieceIcon type={piece} color={game.turn()} className="h-11 w-11" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {confirmingResign && (
            <div className="absolute inset-0 z-40 grid place-items-center bg-black/55 p-5" role="dialog" aria-label="Confirm resignation">
              <div className="w-full max-w-xs rounded-2xl bg-[#262522] p-5 text-center shadow-2xl">
                <Flag className="mx-auto mb-2 size-6 text-red-300" />
                <p className="mb-1 font-semibold">Resign this game?</p>
                <p className="mb-4 text-sm text-white/50">Your opponent will be credited with the win.</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setConfirmingResign(false)} className="flex-1 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">Cancel</Button>
                  <Button onClick={confirmResign} className="flex-1 bg-red-500/90 text-white hover:bg-red-500">Resign</Button>
                </div>
              </div>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-black/60 p-5">
              <div className="w-full max-w-xs rounded-2xl bg-[#262522] p-6 text-center shadow-2xl">
                <Swords className="mx-auto mb-2 size-7 text-amber-300" />
                <p className="mb-4 text-base font-semibold leading-snug">{isOnline ? getOnlineStatus(match!, game) : getStatus(game, resigned)}</p>
                <div className="flex flex-col gap-2">
                  {isOnline ? (
                    <Button onClick={onExit} className="bg-[#759954] hover:bg-[#86a962]">Back to lobby</Button>
                  ) : (
                    <Button onClick={reset} className="bg-[#759954] hover:bg-[#86a962]"><RotateCcw className="mr-2 size-4" /> Play again</Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {isOnline ? (
          <OnlinePlayerBar player={bottomPlayer} active={!gameOver && match!.turnColor === bottomColor} color={bottomColor} captured={bottomColor === "w" ? capturedBlack : capturedWhite} material={bottomColor === "w" ? material : -material} />
        ) : (
          <PlayerBar label={opponent === "AI" ? "You · White" : "White"} icon={<ChessPieceIcon type="k" color="w" className="h-5 w-5" />} active={!gameOver && game.turn() === "w"} captured={capturedBlack} color="b" material={-material} />
        )}
      </div>

      <Card className="overflow-hidden border-white/10 bg-[#262522] text-white shadow-xl">
        <div className="border-b border-white/10 p-4">
          <p className={`text-base font-semibold ${game.isCheck() && !gameOver ? "text-amber-300" : ""}`}>{isOnline ? getOnlineStatus(match!, game) : getStatus(game, resigned)}</p>
          <p className="mt-1 text-xs text-white/40">Move {Math.floor(historyLength / 2) + 1}</p>
        </div>

        <div className="min-h-44 max-h-72 overflow-y-auto p-3">
          <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-white/35"><History className="size-3.5" /> Moves</div>
          {!historyLength ? (
            <div className="grid min-h-28 place-items-center text-sm text-white/30">Select a piece to begin</div>
          ) : (
            <div className="grid grid-cols-[2.25rem_1fr_1fr] text-sm">
              {Array.from({ length: Math.ceil(historyLength / 2) }, (_, index) => {
                const whiteMove = history[index * 2]?.san;
                const blackMove = history[index * 2 + 1]?.san;
                const isLastRow = index === Math.ceil(historyLength / 2) - 1;
                return (
                  <React.Fragment key={index}>
                    <span className="px-2 py-1.5 text-white/30">{index + 1}.</span>
                    <span className={`rounded px-2 py-1.5 font-medium hover:bg-white/5 ${isLastRow && !blackMove ? "bg-white/[.06]" : ""}`}>{whiteMove}</span>
                    <span className={`rounded px-2 py-1.5 font-medium hover:bg-white/5 ${isLastRow && blackMove ? "bg-white/[.06]" : ""}`}>{blackMove ?? ""}</span>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-3">
          {isOnline ? (
            <>
              <Button variant="outline" onClick={() => setFlipped((value) => !value)} className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"><FlipVertical2 className="mr-2 size-4" /> Flip</Button>
              <Button variant="outline" onClick={() => !gameOver && setConfirmingResign(true)} disabled={gameOver} className="border-white/10 bg-white/5 text-white hover:bg-red-500/15 hover:text-red-200"><Flag className="mr-2 size-4" /> Resign</Button>
              <Button variant="outline" onClick={onExit} className="col-span-2 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white">◀ Back to lobby</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={undo} disabled={!history.length || thinking} className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Undo2 className="mr-2 size-4" /> Undo</Button>
              <Button variant="outline" onClick={() => setFlipped((value) => !value)} className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"><FlipVertical2 className="mr-2 size-4" /> Flip</Button>
              <Button variant="outline" onClick={reset} className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"><RotateCcw className="mr-2 size-4" /> New game</Button>
              <Button variant="outline" onClick={() => !gameOver && setConfirmingResign(true)} disabled={gameOver} className="border-white/10 bg-white/5 text-white hover:bg-red-500/15 hover:text-red-200"><Flag className="mr-2 size-4" /> Resign</Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function PlayerBar({ label, icon, active, thinking = false, captured, color, material }: { label: string; icon: React.ReactNode; active: boolean; thinking?: boolean; captured: PieceSymbol[]; color: Color; material: number }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-1 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg transition-colors ${active ? "bg-[#759954]" : "bg-white/10"}`}>{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{label}</p>
          <div className="flex h-4 items-center gap-1 leading-none opacity-70">
            <div className="flex">{captured.map((piece, index) => <ChessPieceIcon key={`${piece}-${index}`} type={piece} color={color} className="-mr-1 h-3.5 w-3.5" />)}</div>
            {material > 0 && <span className="text-[11px] font-semibold text-white/40">+{material}</span>}
          </div>
        </div>
      </div>
      {thinking && <span className="flex items-center gap-1.5 text-xs text-white/45"><span className="size-1.5 animate-pulse rounded-full bg-[#98b873]" /> Thinking</span>}
    </div>
  );
}

function OnlinePlayerBar({ player, active, color, captured, material }: { player: OnlinePlayer | null | undefined; active: boolean; color: Color; captured: PieceSymbol[]; material: number }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-1 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`relative grid size-8 shrink-0 place-items-center rounded-lg transition-colors ${active ? "bg-[#759954]" : "bg-white/10"}`}>
          <UserAvatar name={player?.name} src={player?.profilePhotoUrl} className="size-8 text-[11px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{player?.name ?? "Waiting…"} <span className="font-normal text-white/35">· {color === "w" ? "White" : "Black"}</span></p>
          <div className="flex h-4 items-center gap-1 leading-none opacity-70">
            <div className="flex">{captured.map((piece, index) => <ChessPieceIcon key={`${piece}-${index}`} type={piece} color={color} className="-mr-1 h-3.5 w-3.5" />)}</div>
            {material > 0 && <span className="text-[11px] font-semibold text-white/40">+{material}</span>}
          </div>
        </div>
      </div>
      {active && <span className="flex items-center gap-1.5 text-xs text-[#98b873]"><span className="size-1.5 animate-pulse rounded-full bg-[#98b873]" /> To move</span>}
    </div>
  );
}
