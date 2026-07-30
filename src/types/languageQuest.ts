import type { LanguageQuestRewardProgress } from '@/shared/languageQuestRewards';

export interface LanguageQuestProfile {
  hearts: number;
  maxHearts: number;
  points: number;
  currentStreak: number;
  bestStreak: number;
  activeCourseId: string | null;
  rewards: LanguageQuestRewardProgress;
}

export interface LanguageQuestCourseSummary {
  id: string;
  code: string;
  title: string;
  description: string | null;
  language: string;
  category: string;
  imageEmoji: string;
  accentColor: string;
  unitCount: number;
  lessonCount: number;
  challengeCount: number;
  completedChallenges: number;
  progressPercent: number;
  completed: boolean;
  /** First unlocked, unfinished lesson -- null once the course is complete. */
  nextLessonId: string | null;
}

export interface LanguageQuestOverview {
  profile: LanguageQuestProfile;
  canManage: boolean;
  courses: LanguageQuestCourseSummary[];
}

export interface LanguageQuestOption {
  id: string;
  text: string;
  emoji: string | null;
  audioText: string | null;
  pinyin: string[] | null;
}

export interface LanguageQuestChallenge {
  id: string;
  type:
    | 'SELECT'
    | 'ASSIST'
    | 'CLOZE'
    | 'ODD_ONE_OUT'
    | 'REORDER'
    | 'MATCHING'
    | 'MINIMAL_PAIR_LISTENING'
    | 'DICTATION'
    | 'GRAMMAR_TRANSFORM';
  question: string;
  completed: boolean;
  options: LanguageQuestOption[];
}

export interface LanguageQuestLessonPayload {
  id: string;
  title: string;
  description: string | null;
  course: { id: string; title: string; language: string; accentColor: string };
  profile: LanguageQuestProfile;
  challenges: LanguageQuestChallenge[];
}

export interface LanguageQuestFlashcard {
  id: string;
  prompt: string;
  practicePrompt: string;
  text: string;
  emoji: string | null;
  audioText: string | null;
  pinyin: string[] | null;
}

export interface LanguageQuestLessonPreview {
  id: string;
  title: string;
  description: string | null;
  course: { id: string; title: string; language: string; accentColor: string };
  cards: LanguageQuestFlashcard[];
}
