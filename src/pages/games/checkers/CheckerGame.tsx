"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { apiSend } from "../../../lib/api";
import { Volume2, VolumeX, Crown, Undo2 } from "lucide-react";
import {
  applyMove,
  cloneBoard,
  countPieces,
  createInitialBoard,
  getAllValidMoves,
  getJumpMovesForPiece,
  getTurnActions,
  type Board,
  type Move,
  type PlayerColor,
  type Position,
  type TurnAction,
  PLAYER_BLACK,
  PLAYER_RED,
} from "./checkerRules";

// ── Vocabulary quiz helpers ──────────────────────────────────────────────────
type VocabWord = { word: string; definition: string; partOfSpeech: string };
type VocabQuiz = {
  word: string;
  partOfSpeech: string;
  correctIndex: number;
  options: string[];
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build a multiple-choice question: the target word's real definition plus up
// to three distractor definitions drawn from other pool words, all shuffled.
// Prefers words the student hasn't answered yet.
function buildQuiz(pool: VocabWord[], learned: string[]): VocabQuiz | null {
  const usable = pool.filter((w) => w.word && w.definition);
  if (usable.length === 0) return null;
  const unlearned = usable.filter((w) => !learned.includes(w.word));
  const source = unlearned.length > 0 ? unlearned : usable;
  const target = source[Math.floor(Math.random() * source.length)];
  const distractors = shuffle(usable.filter((w) => w.definition !== target.definition))
    .slice(0, 3)
    .map((w) => w.definition);
  const options = shuffle([target.definition, ...distractors]);
  return {
    word: target.word,
    partOfSpeech: target.partOfSpeech,
    correctIndex: options.indexOf(target.definition),
    options,
  };
}

interface GameHistory {
  board: Board;
  currentPlayer: PlayerColor;
  redPieces: number;
  blackPieces: number;
  redKings: number;
  blackKings: number;
  move?: Move;
}

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type OpponentType = "HUMAN" | "AI";

interface CheckerGameProps {
  gameMode: "CLASSIC" | "VOCABULARY";
  initialOpponentType?: OpponentType;
  initialDifficulty?: Difficulty;
}

// Sound effects using Web Audio API with proper cleanup
class SoundManager {
  private audioContext: AudioContext | null = null;
  private muted: boolean = false;
  private timeouts: NodeJS.Timeout[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn("Failed to create AudioContext", e);
      }
    }
  }

  private clearAllTimeouts() {
    this.timeouts.forEach(clearTimeout);
    this.timeouts = [];
  }

  private scheduleTone(frequency: number, duration: number, type: OscillatorType, delay: number) {
    const timeout = setTimeout(() => this.playTone(frequency, duration, type), delay);
    this.timeouts.push(timeout);
    return timeout;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = "sine") {
    if (this.muted || !this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (e) {
      console.warn("Audio playback failed", e);
    }
  }

  playSelect() {
    this.clearAllTimeouts();
    this.playTone(600, 0.1, "sine");
  }

  playMove() {
    this.clearAllTimeouts();
    this.playTone(400, 0.15, "triangle");
  }

  playCapture() {
    this.clearAllTimeouts();
    this.playTone(300, 0.1, "square");
    this.scheduleTone(200, 0.15, "square", 50);
  }

  playKing() {
    this.clearAllTimeouts();
    this.playTone(523, 0.1, "sine");
    this.scheduleTone(659, 0.1, "sine", 100);
    this.scheduleTone(784, 0.15, "sine", 200);
  }

  playWin() {
    this.clearAllTimeouts();
    const notes = [523, 659, 784, 1047];
    notes.forEach((note, i) => {
      this.scheduleTone(note, 0.2, "sine", i * 150);
    });
  }

  playLose() {
    this.clearAllTimeouts();
    const notes = [400, 350, 300, 250];
    notes.forEach((note, i) => {
      this.scheduleTone(note, 0.2, "sine", i * 150);
    });
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  dispose() {
    this.clearAllTimeouts();
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
        console.warn("Failed to close AudioContext", e);
      }
      this.audioContext = null;
    }
  }
}

export default function CheckerGame({ gameMode, initialOpponentType = "AI", initialDifficulty = "MEDIUM" }: CheckerGameProps) {
  // Game State
  const [board, setBoard] = React.useState<Board>([]);
  const [currentPlayer, setCurrentPlayer] = React.useState<PlayerColor>(PLAYER_RED);
  const [selectedPiece, setSelectedPiece] = React.useState<Position | null>(null);
  const [validMoves, setValidMoves] = React.useState<Move[]>([]);
  const [winner, setWinner] = React.useState<PlayerColor | "draw" | null>(null);

  // Score tracking
  const [redPieces, setRedPieces] = React.useState(12);
  const [blackPieces, setBlackPieces] = React.useState(12);
  const [redKings, setRedKings] = React.useState(0);
  const [blackKings, setBlackKings] = React.useState(0);
  const [movesCount, setMovesCount] = React.useState(0);
  const [gameStartTime] = React.useState(Date.now());

  // Game settings
  const [opponentType, setOpponentType] = React.useState<OpponentType>(initialOpponentType);
  const [difficulty, setDifficulty] = React.useState<Difficulty>(initialDifficulty);
  const [isAIThinking, setIsAIThinking] = React.useState(false);

  // History for undo
  const [history, setHistory] = React.useState<GameHistory[]>([]);

  // Vocabulary State — a gated quiz: the player must pick the correct definition
  // to complete each move. Only correctly-answered, unique words are counted.
  const [vocabPool, setVocabPool] = React.useState<VocabWord[]>([]);
  const [quiz, setQuiz] = React.useState<VocabQuiz | null>(null);
  const [quizChoice, setQuizChoice] = React.useState<number | null>(null);
  const [wordsLearned, setWordsLearned] = React.useState<string[]>([]);
  const pendingMoveRef = React.useRef<Move | null>(null);

  // Sound manager
  const soundManagerRef = React.useRef<SoundManager | null>(null);
  const [soundEnabled, setSoundEnabled] = React.useState(true);

  // AI timeout ref for cleanup
  const aiTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  // Track when AI last completed a move (to block late clicks)
  const aiMoveCompletedRef = React.useRef<number>(0);
  // Track when AI's turn started (to invalidate clicks queued during AI turn)
  const aiTurnStartRef = React.useRef<number>(0);
  // Track if clicks are currently enabled (disabled during AI turn and briefly after)
  const clicksEnabledRef = React.useRef(true);
  // Ref to always have current board state (fixes stale closure in AI)
  const boardRef = React.useRef<Board>([]);
  // Refs to avoid stale closures in executeMove
  const currentPlayerRef = React.useRef<PlayerColor>(PLAYER_RED);
  const opponentTypeRef = React.useRef<OpponentType>(initialOpponentType);
  const winnerRef = React.useRef<PlayerColor | "draw" | null>(null);
  const isAIThinkingRef = React.useRef(false);
  // A capture chain is one turn. This keeps Undo/history and the move counter
  // at turn granularity even when a king makes several jumps.
  const jumpInProgressRef = React.useRef(false);

  // Initialize sound manager
  React.useEffect(() => {
    soundManagerRef.current = new SoundManager();
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
      soundManagerRef.current?.dispose();
      soundManagerRef.current = null;
    };
  }, []);

  // Sync boardRef with current board state (fixes stale closure in AI)
  React.useEffect(() => {
    boardRef.current = board;
  }, [board]);

  // Sync refs with state to avoid stale closures in executeMove
  React.useEffect(() => {
    currentPlayerRef.current = currentPlayer;
  }, [currentPlayer]);

  React.useEffect(() => {
    opponentTypeRef.current = opponentType;
  }, [opponentType]);

  React.useEffect(() => {
    winnerRef.current = winner;
  }, [winner]);

  React.useEffect(() => {
    isAIThinkingRef.current = isAIThinking;
  }, [isAIThinking]);

  // Toggle sound
  const toggleSound = () => {
    if (soundManagerRef.current) {
      const newMuted = soundManagerRef.current.toggleMute();
      setSoundEnabled(!newMuted);
    }
  };

  // Initialize board
  const initializeBoard = React.useCallback(() => {
    return createInitialBoard();
  }, []);

  // Initialize game - only run once on mount
  const hasInitialized = React.useRef(false);
  React.useEffect(() => {
    console.log('[Init] useEffect running, hasInitialized:', hasInitialized.current);
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      handleRestart();
    }
  }, []);

  // Fetch a pool of vocabulary words up front, so each quiz can build a
  // multiple-choice question with real distractor definitions.
  const fetchVocabularyPool = async () => {
    try {
      const response = await fetch("/api/checkers-game/vocabulary-words?limit=20");
      const data = await response.json();
      if (data.success && Array.isArray(data.words)) {
        setVocabPool(
          data.words
            .map((w: any) => ({
              word: w.word,
              definition: w.definition,
              partOfSpeech: w.partOfSpeech,
            }))
            .filter((w: VocabWord) => w.word && w.definition)
        );
      }
    } catch (error) {
      console.error("Failed to fetch vocabulary words:", error);
    }
  };

  // Minimax AI with alpha-beta pruning and depth safeguard
  const minimax = (
    boardState: Board,
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean,
    aiPlayer: PlayerColor,
    currentDepth: number = 0,
    maxDepth: number = 10
  ): number => {
    if (depth === 0 || currentDepth >= maxDepth) {
      return evaluateBoard(boardState, aiPlayer);
    }

    const currentPlayer = maximizing ? aiPlayer : (aiPlayer === PLAYER_RED ? PLAYER_BLACK : PLAYER_RED);
    const actions = getTurnActions(boardState, currentPlayer);

    if (actions.length === 0) {
      return currentPlayer === aiPlayer ? -1000 - depth : 1000 + depth;
    }

    if (maximizing) {
      let maxEval = -Infinity;
      for (const action of actions) {
        const evalScore = minimax(action.board, depth - 1, alpha, beta, false, aiPlayer, currentDepth + 1, maxDepth);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const action of actions) {
        const evalScore = minimax(action.board, depth - 1, alpha, beta, true, aiPlayer, currentDepth + 1, maxDepth);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  };

  // Evaluate board for AI
  const evaluateBoard = (boardState: Board, aiPlayer: PlayerColor): number => {
    const counts = countPieces(boardState);
    const aiPieces = aiPlayer === PLAYER_RED ? counts.red : counts.black;
    const aiKings = aiPlayer === PLAYER_RED ? counts.redKingsCount : counts.blackKingsCount;
    const playerPieces = aiPlayer === PLAYER_RED ? counts.black : counts.red;
    const playerKings = aiPlayer === PLAYER_RED ? counts.blackKingsCount : counts.redKingsCount;

    // Simple evaluation: pieces + kings bonus
    const score = aiPieces * 10 + aiKings * 5 - (playerPieces * 10 + playerKings * 5);

    // Bonus for center control
    let centerBonus = 0;
    for (let row = 2; row < 6; row++) {
      for (let col = 2; col < 6; col++) {
        if (boardState[row][col].piece?.color === aiPlayer) {
          centerBonus += 1;
        }
      }
    }

    return score + centerBonus;
  };

  // Get AI move - accepts board as parameter to avoid stale closure issues
  const getAIMove = React.useCallback(
    (aiPlayer: PlayerColor, boardState: Board): TurnAction | null => {
      const actions = getTurnActions(boardState, aiPlayer);
      if (actions.length === 0) return null;

      let bestAction = actions[0];
      const depths: Record<Difficulty, number> = { EASY: 2, MEDIUM: 4, HARD: 6 };
      const depth = depths[difficulty];

      if (depth === 2 && Math.random() < 0.3) {
        // Easy mode: sometimes make a random move
        return actions[Math.floor(Math.random() * actions.length)];
      }

      let bestScore = -Infinity;

      for (const action of actions) {
        const score = minimax(action.board, depth - 1, -Infinity, Infinity, false, aiPlayer);

        if (score > bestScore) {
          bestScore = score;
          bestAction = action;
        }
      }

      return bestAction;
    },
    [difficulty, getAllValidMoves, minimax]
  );

  // Handle piece selection
  const handlePieceClick = ( row: number, col: number) => {
    const now = Date.now();
    const timeSinceAITurnStarted = aiTurnStartRef.current > 0 ? now - aiTurnStartRef.current : Infinity;
    console.log('[Click] handlePieceClick called - row:', row, 'col:', col, 'clicksEnabled:', clicksEnabledRef.current, 'timeSinceAITurnStarted:', timeSinceAITurnStarted);

    // Block clicks if clicks are disabled (during AI turn and briefly after)
    if (!clicksEnabledRef.current) {
      console.log('[Click] BLOCKED - Clicks disabled during AI turn!');
      return;
    }

    console.log('[Click] handlePieceClick called - row:', row, 'col:', col, 'winner:', winnerRef.current, 'isAIThinking:', isAIThinkingRef.current);

    if (winnerRef.current || isAIThinkingRef.current) {
      console.log('[Click] Blocked - game ended or AI thinking');
      return;
    }
    if (opponentTypeRef.current === "AI" && currentPlayerRef.current === PLAYER_BLACK) {
      console.log('[Click] Blocked - AI turn');
      return;
    }

    const currentBoard = boardRef.current;
    const piece = currentBoard[row][col].piece;

    if (piece && piece.color === currentPlayerRef.current) {
      // If in multi-jump, can only select the jumping piece
      if (selectedPiece && validMoves.length > 0 && validMoves[0].isJump) {
        if (row !== selectedPiece.row || col !== selectedPiece.col) {
          return;
        }
      }

      const legalMoves = jumpInProgressRef.current
        ? getJumpMovesForPiece(currentBoard, { row, col })
        : getAllValidMoves(currentBoard, currentPlayerRef.current).filter(
            (move) => move.from.row === row && move.from.col === col,
          );
      // Captures are mandatory across the whole board. Do not let a different
      // piece bypass a required jump by selecting one of its ordinary moves.
      if (legalMoves.length === 0) return;

      soundManagerRef.current?.playSelect();
      setSelectedPiece({ row, col });
      setValidMoves(legalMoves);
    } else if (selectedPiece) {
      const move = validMoves.find((m) => m.to.row === row && m.to.col === col);
      if (move) {
        executeMove(move);
      }
    }
  };

  // Execute a move
  const executeMove = (move: Move, isAI: boolean = false, remainingAIMoves: Move[] = []) => {
    const currentPlayerValue = currentPlayerRef.current; // Use ref to avoid stale closure
    const opponentTypeValue = opponentTypeRef.current;
    const continuingJump = jumpInProgressRef.current;

    console.log('[Move] executeMove called - isAI:', isAI, 'currentPlayer:', currentPlayerValue, 'opponentType:', opponentTypeValue);

    // Re-enable clicks when player makes a move
    if (!isAI) {
      aiTurnStartRef.current = 0;
      clicksEnabledRef.current = true;
    }

    // Use the live board from the ref, NOT the `board` state captured in this
    // closure. The AI's executeMove runs inside a setTimeout created during the
    // player's move, where the `board` closure still holds the pre-move
    // position — cloning it would discard the player's move and snap their
    // piece back. boardRef is kept in sync with the latest committed board.
    const currentBoard = boardRef.current;
    const moveResult = applyMove(currentBoard, move);
    const newBoard = moveResult.board;

    // Calculate counts from current board for history
    const counts = countPieces(currentBoard);

    // Save one snapshot for the whole turn, not one for every jump leg.
    if (!continuingJump) {
      const historyEntry: GameHistory = {
        board: cloneBoard(currentBoard),
        currentPlayer: currentPlayerValue,
        redPieces: counts.red,
        blackPieces: counts.black,
        redKings: counts.redKingsCount,
        blackKings: counts.blackKingsCount,
        move,
      };
      setHistory((prev) => [...prev, historyEntry]);
      setMovesCount((prev) => prev + 1);
    }

    if (moveResult.captured) {
      soundManagerRef.current?.playCapture();
    } else {
      soundManagerRef.current?.playMove();
    }

    if (moveResult.promoted) soundManagerRef.current?.playKing();
    setBoard(newBoard);
    // Keep the ref in lockstep with the move so a follow-up executeMove (the AI
    // reply, or a multi-jump) reads the updated board without waiting for the
    // sync effect to flush after commit.
    boardRef.current = newBoard;
    // Update piece counts (recalculate from new board)
    const newCounts = countPieces(newBoard);
    setRedPieces(newCounts.red);
    setBlackPieces(newCounts.black);
    setRedKings(newCounts.redKingsCount);
    setBlackKings(newCounts.blackKingsCount);

    // Check if must continue jumping (multi-jump)
    // Note: King promotion ends the multi-jump sequence
    if (moveResult.captured && !moveResult.promoted) {
      const continuationMoves = getJumpMovesForPiece(newBoard, move.to);
      if (continuationMoves.length > 0) {
        jumpInProgressRef.current = true;
        setSelectedPiece(move.to);
        setValidMoves(continuationMoves);
        if (isAI) {
          const plannedMove = remainingAIMoves[0];
          const nextMove = continuationMoves.find(
            (candidate) =>
              candidate.to.row === plannedMove?.to.row && candidate.to.col === plannedMove?.to.col,
          ) ?? continuationMoves[0];
          aiTimeoutRef.current = setTimeout(
            () => executeMove(nextMove, true, remainingAIMoves.slice(1)),
            300,
          );
        }
        return; // Don't end turn - continue jumping
      }
    }

    // End turn
    jumpInProgressRef.current = false;
    setSelectedPiece(null);
    setValidMoves([]);

    // Check for winner by piece count
    const opponentPieces = currentPlayerValue === PLAYER_RED ? newCounts.black : newCounts.red;

    if (opponentPieces <= 0) {
      setWinner(currentPlayerValue);
      winnerRef.current = currentPlayerValue;
      if (isAI) {
        setIsAIThinking(false);
        isAIThinkingRef.current = false;
      }
      // Determine if human player won
      const humanWon = opponentTypeValue === "HUMAN" || currentPlayerValue === PLAYER_RED;
      if (humanWon) {
        soundManagerRef.current?.playWin();
      } else {
        soundManagerRef.current?.playLose();
      }
    } else {
      // Check if opponent has any valid moves BEFORE switching
      const opponent = currentPlayerValue === PLAYER_RED ? PLAYER_BLACK : PLAYER_RED;
      const opponentMoves = getAllValidMoves(newBoard, opponent);

      if (opponentMoves.length === 0) {
        // Opponent can't move - current player wins
        setWinner(currentPlayerValue);
        winnerRef.current = currentPlayerValue;
        if (isAI) {
          setIsAIThinking(false);
          isAIThinkingRef.current = false;
        }
        const humanWon = opponentTypeValue === "HUMAN" || currentPlayerValue === PLAYER_RED;
        if (humanWon) {
          soundManagerRef.current?.playWin();
        } else {
          soundManagerRef.current?.playLose();
        }
      } else {
        // Switch player
        setCurrentPlayer(opponent);
        currentPlayerRef.current = opponent;

        console.log('[Move] Turn ended - switching to:', opponent, 'opponentType:', opponentTypeValue);
        console.log('[AI] AI Trigger check - opponentType:', opponentTypeValue, '=== AI:', opponentTypeValue === "AI", 'opponent:', opponent, '=== BLACK:', opponent === PLAYER_BLACK);

        // Trigger AI if needed
        if (opponentTypeValue === "AI" && opponent === PLAYER_BLACK) {
          console.log('[AI] Triggering AI for BLACK');
          // Disable clicks immediately when AI turn starts
          clicksEnabledRef.current = false;
          aiTurnStartRef.current = Date.now();
          setIsAIThinking(true);
          isAIThinkingRef.current = true;

          // Clear any existing timeout
          if (aiTimeoutRef.current) {
            clearTimeout(aiTimeoutRef.current);
          }

          aiTimeoutRef.current = setTimeout(() => {
            // Double-check it's still Black's turn and no winner
            if (winnerRef.current || currentPlayerRef.current !== PLAYER_BLACK) {
              console.log('[AI] Skipping - winner:', winnerRef.current, 'currentPlayer:', currentPlayerRef.current);
              setIsAIThinking(false);
              isAIThinkingRef.current = false;
              return;
            }

            console.log('[AI] Getting move for BLACK, board has pieces:', boardRef.current.flat().filter(sq => sq.piece).length);
            const aiAction = getAIMove(PLAYER_BLACK, boardRef.current);
            console.log('[AI] AI move:', aiAction);
            if (aiAction) {
              aiMoveCompletedRef.current = Date.now();
              executeMove(aiAction.moves[0], true, aiAction.moves.slice(1));
            } else {
              console.log('[AI] No valid moves for AI');
              setIsAIThinking(false);
              isAIThinkingRef.current = false;
              setWinner(PLAYER_RED);
              winnerRef.current = PLAYER_RED;
            }
          }, 500);
        } else if (isAI) {
          setIsAIThinking(false);
          isAIThinkingRef.current = false;
          // Re-enable after the full AI turn (including every forced jump), with
          // a short guard against a click queued while the AI was moving.
          setTimeout(() => {
            clicksEnabledRef.current = true;
            console.log('[AI] Clicks re-enabled after AI move');
          }, 300);
        }
      }
    }
  };

  // Handle square click (for moving to empty squares)
  const handleSquareClick = (row: number, col: number) => {
    const now = Date.now();
    console.log('[Click] handleSquareClick called - row:', row, 'col:', col, 'selectedPiece:', selectedPiece, 'clicksEnabled:', clicksEnabledRef.current);

    // Block clicks if clicks are disabled (during AI turn and briefly after)
    if (!clicksEnabledRef.current) {
      console.log('[Click] BLOCKED - Clicks disabled during AI turn!');
      return;
    }

    if (!selectedPiece || winnerRef.current || isAIThinkingRef.current) return;

    const move = validMoves.find((m) => m.to.row === row && m.to.col === col);
    if (move) {
      // In vocabulary mode the move is gated behind a definition quiz: hold the
      // move and ask a question. It only executes on a correct answer.
      if (gameMode === "VOCABULARY") {
        const q = buildQuiz(vocabPool, wordsLearned);
        if (q) {
          pendingMoveRef.current = move;
          setQuizChoice(null);
          setQuiz(q);
          return;
        }
        // No words available (pool empty) — don't block play.
      }
      executeMove(move);
    }
  };

  // Answer the vocabulary quiz. Correct → count the word (once) and complete the
  // held move. Wrong → reveal the answer, then cancel the move so the player
  // keeps their turn and can try again.
  const handleQuizAnswer = (index: number) => {
    if (!quiz || quizChoice !== null) return;
    setQuizChoice(index);
    const correct = index === quiz.correctIndex;

    if (correct) {
      soundManagerRef.current?.playKing();
      setWordsLearned((prev) => (prev.includes(quiz.word) ? prev : [...prev, quiz.word]));
      window.setTimeout(() => {
        const move = pendingMoveRef.current;
        pendingMoveRef.current = null;
        setQuiz(null);
        setQuizChoice(null);
        if (move) executeMove(move);
      }, 650);
    } else {
      window.setTimeout(() => {
        pendingMoveRef.current = null;
        setQuiz(null);
        setQuizChoice(null);
        // Cancel the move: deselect so the player chooses again.
        setSelectedPiece(null);
        setValidMoves([]);
      }, 1500);
    }
  };

  // Undo last move
  const handleUndo = () => {
    if (history.length === 0 || winnerRef.current || isAIThinkingRef.current) return;

    // Calculate moves to undo carefully
    let movesToUndo = 1;
    if (opponentTypeRef.current === "AI" && !jumpInProgressRef.current) {
      // Undo both player and AI moves, but only if we have enough history
      movesToUndo = history.length >= 2 ? 2 : history.length;
    }

    if (history.length < movesToUndo) {
      return; // Not enough history to undo
    }

    const newHistory = [...history];
    let lastState: GameHistory | null = null;

    for (let i = 0; i < movesToUndo && newHistory.length > 0; i++) {
      lastState = newHistory.pop()!;
    }

    if (lastState) {
      setBoard(lastState.board);
      boardRef.current = lastState.board;
      setCurrentPlayer(lastState.currentPlayer);
      currentPlayerRef.current = lastState.currentPlayer;
      setRedPieces(lastState.redPieces);
      setBlackPieces(lastState.blackPieces);
      setRedKings(lastState.redKings);
      setBlackKings(lastState.blackKings);
      setSelectedPiece(null);
      setValidMoves([]);
      setHistory(newHistory);
      jumpInProgressRef.current = false;
      clicksEnabledRef.current = true;
      aiTurnStartRef.current = 0;

      // Adjust moves count
      setMovesCount((prev) => Math.max(0, prev - movesToUndo));

      // Note: words already answered correctly stay "learned" — undoing a board
      // move shouldn't un-teach a word the student got right.
    }
  };

  // Save score
  const saveScore = async (result: "WIN" | "LOSE" | "DRAW" | "ABANDONED") => {
    const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000);
    const score = result === "WIN" ? 100 : result === "DRAW" ? 50 : 0;

    try {
      // Use the shared api helper so the Bearer token is attached. A raw fetch
      // sent no auth header, so this authed route returned 401 — which the
      // global auth interceptor treats as an expired session and bounces the
      // user to /login. That's why losing/forfeiting kicked players out.
      await apiSend("/api/checkers-game/scores", "POST", {
        result,
        score: score + movesCount * 2,
        gameMode,
        opponentType,
        difficulty: opponentType === "AI" ? difficulty : undefined,
        gameDuration,
        movesCount,
        playerPiecesCaptured: 12 - blackPieces,
        opponentPiecesCaptured: 12 - redPieces,
        playerKingsEarned: redKings,
        opponentKingsEarned: blackKings,
        vocabularyWords: wordsLearned.length,
        wordsList: wordsLearned,
      });
    } catch (error) {
      // Not signed in as a student (e.g. admin has no Student record → 404) or
      // offline — don't interrupt play or trigger a logout.
      console.info("Checkers score not saved:", error);
    }
  };

  // Restart game
  const handleRestart = React.useCallback(() => {
    console.log('[Restart] Game restarting!');

    // Clear any pending AI timeout
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }

    const newBoard = initializeBoard();
    setBoard(newBoard);
    setCurrentPlayer(PLAYER_RED);
    setSelectedPiece(null);
    setValidMoves([]);
    setWinner(null);
    setRedPieces(12);
    setBlackPieces(12);
    setRedKings(0);
    setBlackKings(0);
    setMovesCount(0);
    setHistory([]);
    setQuiz(null);
    setQuizChoice(null);
    pendingMoveRef.current = null;
    setWordsLearned([]);
    setIsAIThinking(false);

    // Update refs immediately to avoid stale closures
    boardRef.current = newBoard;
    currentPlayerRef.current = PLAYER_RED;
    winnerRef.current = null;
    isAIThinkingRef.current = false;
    jumpInProgressRef.current = false;
    aiTurnStartRef.current = 0;
    clicksEnabledRef.current = true; // Re-enable clicks on restart

    if (gameMode === "VOCABULARY") {
      fetchVocabularyPool();
    }
  }, [initializeBoard, gameMode]);

  // Handle abandon game
  const handleAbandon = () => {
    saveScore("ABANDONED");
    setWinner(PLAYER_BLACK);
    winnerRef.current = PLAYER_BLACK;
    soundManagerRef.current?.playLose();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Settings Bar */}
      <Card className="w-full max-w-md p-3 bg-white/10 border-white/20">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-white/80">Opponent:</label>
            <select
              value={opponentType}
              onChange={(e) => setOpponentType(e.target.value as OpponentType)}
              disabled={movesCount > 0}
              className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600"
            >
              <option value="AI">AI</option>
              <option value="HUMAN">Human (Local)</option>
            </select>
          </div>
          {opponentType === "AI" && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-white/80">Difficulty:</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                disabled={movesCount > 0}
                className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={toggleSound}
            className="bg-white/20 text-white border-white/30"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </div>
      </Card>

      {/* Game Info */}
      <Card className="w-full max-w-md p-4 bg-white/10 border-white/20">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-4 h-4 rounded-full",
                currentPlayer === PLAYER_RED ? "bg-red-500" : "bg-gray-800"
              )}
            />
            <span className="font-semibold">Red: {redPieces}</span>
            <span className="text-xs text-white/60">({redKings} kings)</span>
          </div>
          <div className="text-2xl font-bold">VS</div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">Black: {blackPieces}</span>
            <span className="text-xs text-white/60">({blackKings} kings)</span>
            <div
              className={cn(
                "w-4 h-4 rounded-full",
                currentPlayer === PLAYER_BLACK ? "bg-gray-800" : "bg-red-500"
              )}
            />
          </div>
        </div>
        <div className="text-center text-sm text-white/80">
          {winner ? (
            <span className="text-lg font-bold">
              {winner === "draw" ? "It's a Draw!" : `${winner === PLAYER_RED ? "Red" : "Black"} Wins!`}
            </span>
          ) : isAIThinking ? (
            <span className="text-yellow-400">AI is thinking...</span>
          ) : (
            <span>
              {currentPlayer === PLAYER_RED ? "Red's" : "Black's"} Turn • Move {movesCount + 1}
            </span>
          )}
        </div>
        {gameMode === "VOCABULARY" && (
          <div className="text-center text-xs text-white/60 mt-1">
            Words Learned: {wordsLearned.length}
          </div>
        )}
      </Card>

      {/* Game Board */}
      <Card className="p-4 bg-amber-900/80 border-amber-700">
        <div className="grid grid-cols-8 gap-0">
          {board.map((row, rowIndex) =>
            row.map((square, colIndex) => {
              const isSelected =
                selectedPiece?.row === rowIndex && selectedPiece?.col === colIndex;
              const isValidMove = validMoves.some(
                (m) => m.to.row === rowIndex && m.to.col === colIndex
              );
              const isJump = validMoves.find(
                (m) => m.to.row === rowIndex && m.to.col === colIndex
              )?.isJump;

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() =>
                    square.piece
                      ? handlePieceClick(rowIndex, colIndex)
                      : handleSquareClick(rowIndex, colIndex)
                  }
                  className={cn(
                    "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center cursor-pointer transition-all",
                    (rowIndex + colIndex) % 2 === 0 ? "bg-amber-100" : "bg-amber-800",
                    isSelected && "ring-4 ring-yellow-400",
                    isValidMove && isJump && "ring-4 ring-green-400",
                    isValidMove && !isJump && "ring-2 ring-yellow-300"
                  )}
                >
                  {square.piece && (
                    <div
                      className={cn(
                        "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold shadow-lg",
                        square.piece.color === PLAYER_RED
                          ? "bg-red-500 text-white"
                          : "bg-gray-900 text-white"
                      )}
                    >
                      {square.piece.type === "king" && <Crown className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </div>
                  )}
                  {isValidMove && !square.piece && (
                    <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* End-of-game vocabulary recap */}
      {winner && gameMode === "VOCABULARY" && (
        <Card className="w-full max-w-md p-4 bg-white/10 border-white/20">
          <h3 className="text-white font-semibold mb-2">
            Words learned this game ({wordsLearned.length})
          </h3>
          {wordsLearned.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {wordsLearned.map((w) => (
                <span
                  key={w}
                  className="text-xs bg-purple-500/30 text-white rounded-full px-3 py-1"
                >
                  {w}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-white/60 text-sm">
              No words answered correctly this game — try again!
            </p>
          )}
        </Card>
      )}

      {/* Controls */}
      <div className="flex gap-3 flex-wrap justify-center">
        {!winner ? (
          <>
            <Button
              onClick={handleUndo}
              disabled={history.length === 0 || isAIThinking}
              variant="outline"
              className="bg-white/20 text-white border-white/30 disabled:opacity-50"
            >
              <Undo2 className="h-4 w-4 mr-1" /> Undo
            </Button>
            <Button
              onClick={handleRestart}
              variant="outline"
              className="bg-white/20 text-white border-white/30"
            >
              Restart
            </Button>
            <Button
              onClick={handleAbandon}
              variant="outline"
              className="bg-red-500/20 text-red-200 border-red-400/30"
            >
              Forfeit
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleRestart} className="bg-green-500 hover:bg-green-600">
              Play Again
            </Button>
          </>
        )}
      </div>

      {/* Vocabulary Quiz Modal — answer correctly to complete your move */}
      {quiz && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6 bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
              Answer to make your move
            </p>
            <div className="mt-1 mb-3">
              <span className="text-2xl font-bold text-purple-700">{quiz.word}</span>
              {quiz.partOfSpeech && (
                <span className="text-sm text-gray-500 ml-2">({quiz.partOfSpeech})</span>
              )}
              <p className="text-sm text-gray-600 mt-1">Which definition is correct?</p>
            </div>

            <div className="flex flex-col gap-2">
              {quiz.options.map((opt, i) => {
                const answered = quizChoice !== null;
                const isCorrect = i === quiz.correctIndex;
                const isChosen = i === quizChoice;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={answered}
                    onClick={() => handleQuizAnswer(i)}
                    className={cn(
                      "text-left rounded-lg border p-3 text-sm transition-colors",
                      !answered && "border-gray-300 text-gray-800 hover:border-purple-400 hover:bg-purple-50",
                      answered && isCorrect && "border-green-500 bg-green-50 text-green-800",
                      answered && isChosen && !isCorrect && "border-red-500 bg-red-50 text-red-800",
                      answered && !isCorrect && !isChosen && "border-gray-200 text-gray-400"
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {quizChoice !== null && (
              <p
                className={cn(
                  "mt-3 text-sm font-semibold",
                  quizChoice === quiz.correctIndex ? "text-green-600" : "text-red-600"
                )}
              >
                {quizChoice === quiz.correctIndex
                  ? "Correct! Making your move…"
                  : "Not quite — move cancelled. Pick another move to try again."}
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
