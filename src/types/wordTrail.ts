export interface WordTrailOption {
  id: string;
  text: string;
  emoji?: string | null;
}

export interface WordTrailQuestion {
  id: string;
  sourceLabel: string;
  subject: string;
  difficulty: string;
  prompt: string;
  options: WordTrailOption[];
}

export interface WordTrailPendingTurn {
  roll: number;
  question: WordTrailQuestion;
}

export interface WordTrailGame {
  id: string;
  status: "ACTIVE" | "WON" | "LOST" | "ABANDONED";
  position: number;
  hearts: number;
  score: number;
  turnCount: number;
  correctCount: number;
  wrongCount: number;
  currentStreak: number;
  bestStreak: number;
  lastRoll: number | null;
  pendingTurn: WordTrailPendingTurn | null;
  completedAt: string | null;
  createdAt: string;
}

export interface WordTrailStats {
  gamesPlayed: number;
  wins: number;
  bestScore: number;
  bestStreak: number;
  accuracy: number;
}

export interface WordTrailLeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  role: "STUDENT" | "TEACHER";
  profilePhotoUrl: string | null;
  score: number;
  accuracy: number;
}

export interface WordTrailHomePayload {
  activeGame: WordTrailGame | null;
  recentGame: WordTrailGame | null;
  stats: WordTrailStats;
  leaderboard: WordTrailLeaderboardEntry[];
}

export interface WordTrailMovement {
  from: number;
  rolledTo: number;
  to: number;
  effect: {
    kind: "BOOST" | "SLIDE" | "BONUS";
    label: string;
    emoji: string;
    moveBy: number;
    bonusPoints: number;
  } | null;
}

export interface WordTrailAnswerPayload {
  correct: boolean;
  correctOptionId: string;
  correctAnswer: string;
  explanation: string | null;
  pointsEarned: number;
  heartLost: boolean;
  heartsRemaining?: number;
  movement: WordTrailMovement | null;
  completed: boolean;
  game: WordTrailGame;
}
