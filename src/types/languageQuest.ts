import type { LanguageQuestRewardProgress } from '@/shared/languageQuestRewards';
import type { LanguageQuestChallengeType } from '@/shared/languageQuestAuthoring';
import type { LanguageQuestAnalyticsStatus } from '@/shared/languageQuestAnalytics';

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

export interface LanguageQuestAnalyticsMetrics {
  attempts: number;
  correctAttempts: number;
  wrongAttempts: number;
  accuracyPercent: number | null;
  learnerCount: number;
  questionCount: number;
  lastAttemptAt: string | null;
  status: LanguageQuestAnalyticsStatus;
}

export interface LanguageQuestAnalyticsPayload {
  filters: {
    classrooms: Array<{
      id: string;
      name: string;
      active: boolean;
      memberCount: number;
      focusCourseId: string | null;
      focusCourseTitle: string | null;
    }>;
    courses: Array<{
      id: string;
      title: string;
      category: string;
      language: string;
      imageEmoji: string;
      published: boolean;
    }>;
  };
  selection: {
    classroomId: string | null;
    classroomLabel: string;
    courseId: string | null;
    courseLabel: string;
  };
  summary: LanguageQuestAnalyticsMetrics & {
    activeLearnerCount: number;
    needsReviewCount: number;
  };
  skills: Array<LanguageQuestAnalyticsMetrics & {
    type: LanguageQuestChallengeType;
    label: string;
  }>;
  lessons: Array<LanguageQuestAnalyticsMetrics & {
    lessonId: string;
    lessonTitle: string;
    unitTitle: string;
    courseId: string;
    courseTitle: string;
  }>;
  questions: Array<LanguageQuestAnalyticsMetrics & {
    challengeId: string;
    question: string;
    type: LanguageQuestChallengeType;
    skillLabel: string;
    lessonTitle: string;
    unitTitle: string;
    courseId: string;
    courseTitle: string;
  }>;
  learners: Array<LanguageQuestAnalyticsMetrics & {
    userId: string;
    name: string;
    avatarId: string;
  }>;
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
  type: LanguageQuestChallengeType;
  question: string;
  explanation: string | null;
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
  cards: LanguageQuestFlashcard[];
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
