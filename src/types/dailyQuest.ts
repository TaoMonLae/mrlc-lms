export type DailyQuestMode = 'RELAXED' | 'STANDARD' | 'CHALLENGE';

export interface DailyQuestOption {
  id: string;
  text: string;
  emoji?: string | null;
}

export interface DailyQuestItem {
  id: string;
  sourceLabel: string;
  subject: string;
  difficulty: string;
  prompt: string;
  passageText?: string | null;
  imageUrl?: string | null;
  options: DailyQuestOption[];
  isReview: boolean;
}

export interface DailyQuestSession {
  id: string;
  dayKey: string;
  mode: DailyQuestMode;
  status: 'IN_PROGRESS' | 'COMPLETED';
  currentIndex: number;
  totalQuestions: number;
  correctCount: number;
  pointsEarned: number;
  currentItem: DailyQuestItem | null;
  completedAt: string | null;
}

export interface DailyQuestStats {
  currentStreak: number;
  bestStreak: number;
  totalXp: number;
  completedQuests: number;
}

export interface DailyQuestPayload {
  available: boolean;
  dayKey?: string;
  session: DailyQuestSession | null;
  modes?: Array<{ mode: DailyQuestMode; questionCount: number }>;
  stats: DailyQuestStats;
}

export interface DailyQuestAnswerPayload extends DailyQuestPayload {
  correct: boolean;
  correctOptionId: string;
  correctAnswer: string;
  explanation: string | null;
  completed: boolean;
}
