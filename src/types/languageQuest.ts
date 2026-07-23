export interface LanguageQuestProfile {
  hearts: number;
  maxHearts: number;
  points: number;
  currentStreak: number;
  bestStreak: number;
  activeCourseId: string | null;
}

export interface LanguageQuestCourseSummary {
  id: string;
  code: string;
  title: string;
  description: string | null;
  language: string;
  imageEmoji: string;
  accentColor: string;
  unitCount: number;
  lessonCount: number;
  challengeCount: number;
  completedChallenges: number;
  progressPercent: number;
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
}

export interface LanguageQuestChallenge {
  id: string;
  type: 'SELECT' | 'ASSIST';
  question: string;
  options: LanguageQuestOption[];
}

export interface LanguageQuestLessonPayload {
  id: string;
  title: string;
  description: string | null;
  course: { id: string; title: string; accentColor: string };
  profile: LanguageQuestProfile;
  challenges: LanguageQuestChallenge[];
}
