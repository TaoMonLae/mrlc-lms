"use client";

import * as React from "react";
import { Chess, type Color, type Move, type PieceSymbol, type Square } from "chess.js";
import { Bot, Flag, FlipVertical2, History, RotateCcw, Undo2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Opponent = "AI" | "HUMAN";
type Difficulty = "EASY" | "MEDIUM" | "HARD";
type PromotionPiece = "q" | "r" | "b" | "n";

interface ChessGameProps {
  opponent: Opponent;
  difficulty: Difficulty;
}

const pieceGlyphs: Record<Color, Record<PieceSymbol, string>> = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

const pieceNames: Record<PieceSymbol, string> = { k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };
const pieceValues: Record<PieceSymbol, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20_000 };
const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const promotionPieces: PromotionPiece[] = ["q", "r", "b", "n"];

function evaluate(game: Chess): number {
  if (game.isCheckmate()) return game.turn() === "b" ? -100_000 : 100_000;
  if (game.isDraw()) return 0;
  let score = 0;
  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const center = ["c3", "d3", "e3", "f3", "c4", "d4", "e4", "f4", "c5", "d5", "e5", "f5", "c6", "d6", "e6", "f6"].includes(piece.square) ? 12 : 0;
      const value = pieceValues[piece.type] + center;
      score += piece.color === "b" ? value : -value;
    }
  }
  return score;
}

function minimax(game: Chess, depth: number, alpha: number, beta: number): number {
  if (depth === 0 || game.isGameOver()) return evaluate(game);
  const maximizing = game.turn() === "b";
  let best = maximizing ? -Infinity : Infinity;
  for (const move of game.moves({ verbose: true })) {
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

function chooseComputerMove(game: Chess, difficulty: Difficulty): Move | null {
  const moves = game.moves({ verbose: true });
  if (!moves.length) return null;
  if (difficulty === "EASY") return moves[Math.floor(Math.random() * moves.length)];

  const searchDepth = difficulty === "HARD" ? 2 : 1;
  let bestScore = -Infinity;
  let bestMoves: Move[] = [];
  for (const move of moves) {
    game.move(move);
    const score = minimax(game, searchDepth - 1, -Infinity, Infinity) + (Math.random() * 4 - 2);
    game.undo();
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (Math.abs(score - bestScore) < 0.001) {
      bestMoves.push(move);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)] ?? moves[0];
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

function capturedPieces(game: Chess, color: Color): PieceSymbol[] {
  const starting: Record<PieceSymbol, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
  const current: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  for (const row of game.board()) for (const piece of row) if (piece?.color === color) current[piece.type]++;
  return (["q", "r", "b", "n", "p"] as PieceSymbol[]).flatMap((type) => Array(Math.max(0, starting[type] - current[type])).fill(type));
}

export default function ChessGame({ opponent, difficulty }: ChessGameProps) {
  const gameRef = React.useRef(new Chess());
  const aiTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [revision, setRevision] = React.useState(0);
  const [selected, setSelected] = React.useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = React.useState<Move[]>([]);
  const [flipped, setFlipped] = React.useState(false);
  const [thinking, setThinking] = React.useState(false);
  const [resigned, setResigned] = React.useState<Color | null>(null);
  const [pendingPromotion, setPendingPromotion] = React.useState<{ from: Square; to: Square } | null>(null);
  const game = gameRef.current;
  const gameOver = game.isGameOver() || resigned !== null;
  const history = game.history({ verbose: true });
  const lastMove = history.at(-1);

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

  const completeMove = (from: Square, to: Square, promotion?: PromotionPiece) => {
    try {
      game.move({ from, to, promotion });
      refresh();
    } catch {
      setSelected(null);
      setLegalMoves([]);
    }
  };

  const handleSquareClick = (square: Square) => {
    if (thinking || gameOver || pendingPromotion || (opponent === "AI" && game.turn() === "b")) return;
    const piece = game.get(square);
    const destinationMoves = selected ? legalMoves.filter((move) => move.to === square) : [];

    if (selected && destinationMoves.length) {
      if (destinationMoves.some((move) => move.isPromotion())) setPendingPromotion({ from: selected, to: square });
      else completeMove(selected, square);
      return;
    }
    if (piece?.color === game.turn()) {
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

  const displayedRanks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const displayedFiles = flipped ? [...files].reverse() : [...files];
  const capturedWhite = capturedPieces(game, "w");
  const capturedBlack = capturedPieces(game, "b");

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="mx-auto w-full max-w-[min(82vh,760px)]">
        <PlayerBar label={opponent === "AI" ? `Computer · ${difficulty.toLowerCase()}` : "Black"} icon={opponent === "AI" ? <Bot className="size-4" /> : <Users className="size-4" />} active={!gameOver && game.turn() === "b"} thinking={thinking} captured={capturedWhite} color="w" />

        <div className="relative mt-2 aspect-square w-full overflow-hidden rounded-[4px] shadow-[0_16px_50px_rgba(0,0,0,.5)]" role="grid" aria-label="Chess board">
          <div className="grid h-full w-full grid-cols-8 grid-rows-8">
            {displayedRanks.flatMap((rank, rowIndex) => displayedFiles.map((file, colIndex) => {
              const square = `${file}${rank}` as Square;
              const piece = game.get(square);
              const move = legalMoves.find((candidate) => candidate.to === square);
              const isLight = (files.indexOf(file) + rank) % 2 === 1;
              const isSelected = selected === square;
              const wasLastMove = lastMove?.from === square || lastMove?.to === square;
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
                  {showRank && <span className={`absolute left-1 top-0.5 z-20 text-[clamp(.52rem,1.2vw,.8rem)] font-bold ${isLight ? "text-[#769656]" : "text-[#eeeed2]"}`}>{rank}</span>}
                  {showFile && <span className={`absolute bottom-0 right-1 z-20 text-[clamp(.52rem,1.2vw,.8rem)] font-bold ${isLight ? "text-[#769656]" : "text-[#eeeed2]"}`}>{file}</span>}
                  {move && !piece && <span className="absolute z-20 size-[28%] rounded-full bg-black/20" />}
                  {move && piece && <span className="absolute inset-[5%] z-20 rounded-full border-[clamp(3px,.65vw,7px)] border-black/20" />}
                  {piece && <span className={`relative z-10 block translate-y-[-1%] text-[clamp(2rem,9.2vw,5.8rem)] leading-none ${piece.color === "w" ? "text-white [text-shadow:0_2px_1px_#555,0_0_1px_#111]" : "text-[#202020] [text-shadow:0_1px_0_#666]"}`}>{pieceGlyphs[piece.color][piece.type]}</span>}
                </button>
              );
            }))}
          </div>

          {pendingPromotion && (
            <div className="absolute inset-0 z-40 grid place-items-center bg-black/45 p-5" role="dialog" aria-label="Choose promotion piece">
              <div className="rounded-2xl bg-[#262522] p-4 shadow-2xl">
                <p className="mb-3 text-center text-sm font-semibold">Promote pawn to</p>
                <div className="flex gap-2">
                  {promotionPieces.map((piece) => (
                    <button key={piece} type="button" onClick={() => completeMove(pendingPromotion.from, pendingPromotion.to, piece)} className="grid size-16 place-items-center rounded-xl bg-[#eeeed2] text-5xl text-zinc-900 transition hover:scale-105 hover:bg-white" aria-label={`Promote to ${pieceNames[piece]}`}>
                      {pieceGlyphs[game.turn()][piece]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <PlayerBar label={opponent === "AI" ? "You · White" : "White"} icon={<span className="text-lg">♔</span>} active={!gameOver && game.turn() === "w"} captured={capturedBlack} color="b" />
      </div>

      <Card className="overflow-hidden border-white/10 bg-[#262522] text-white shadow-xl">
        <div className="border-b border-white/10 p-4">
          <p className={`text-base font-semibold ${game.isCheck() && !gameOver ? "text-amber-300" : ""}`}>{getStatus(game, resigned)}</p>
          <p className="mt-1 text-xs text-white/40">Move {Math.floor(history.length / 2) + 1}</p>
        </div>

        <div className="min-h-44 max-h-72 overflow-y-auto p-3">
          <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-white/35"><History className="size-3.5" /> Moves</div>
          {!history.length ? (
            <div className="grid min-h-28 place-items-center text-sm text-white/30">Select a piece to begin</div>
          ) : (
            <div className="grid grid-cols-[2.25rem_1fr_1fr] text-sm">
              {Array.from({ length: Math.ceil(history.length / 2) }, (_, index) => (
                <React.Fragment key={index}>
                  <span className="px-2 py-1.5 text-white/30">{index + 1}.</span>
                  <span className="rounded px-2 py-1.5 font-medium hover:bg-white/5">{history[index * 2]?.san}</span>
                  <span className="rounded px-2 py-1.5 font-medium hover:bg-white/5">{history[index * 2 + 1]?.san ?? ""}</span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-3">
          <Button variant="outline" onClick={undo} disabled={!history.length || thinking} className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Undo2 className="mr-2 size-4" /> Undo</Button>
          <Button variant="outline" onClick={() => setFlipped((value) => !value)} className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"><FlipVertical2 className="mr-2 size-4" /> Flip</Button>
          <Button variant="outline" onClick={reset} className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"><RotateCcw className="mr-2 size-4" /> New game</Button>
          <Button variant="outline" onClick={() => !gameOver && setResigned(game.turn())} disabled={gameOver} className="border-white/10 bg-white/5 text-white hover:bg-red-500/15 hover:text-red-200"><Flag className="mr-2 size-4" /> Resign</Button>
        </div>
      </Card>
    </div>
  );
}

function PlayerBar({ label, icon, active, thinking = false, captured, color }: { label: string; icon: React.ReactNode; active: boolean; thinking?: boolean; captured: PieceSymbol[]; color: Color }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-1 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${active ? "bg-[#759954]" : "bg-white/10"}`}>{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{label}</p>
          <div className="flex h-4 items-center text-base leading-none opacity-70">{captured.map((piece, index) => <span key={`${piece}-${index}`} className="-mr-0.5">{pieceGlyphs[color][piece]}</span>)}</div>
        </div>
      </div>
      {thinking && <span className="flex items-center gap-1.5 text-xs text-white/45"><span className="size-1.5 animate-pulse rounded-full bg-[#98b873]" /> Thinking</span>}
    </div>
  );
}
