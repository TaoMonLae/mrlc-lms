/**
 * Badge catalog and achievement system
 * Shared between client and server for consistent badge definitions
 */

export interface BadgeDefinition {
  key: string;
  name: string;
  description: string;
  icon: string; // Icon name from lucide-react
  category: 'ATTENDANCE' | 'ACADEMIC' | 'ENGAGEMENT' | 'MILESTONE' | 'SPECIAL';
  color: string; // Tailwind color class
  levels?: number[]; // Thresholds for multi-level badges (e.g. [3, 7, 14, 30] for streaks)
  checkFn: (context: BadgeContext) => number | boolean; // Returns progress or true/false
}

export interface BadgeContext {
  studentId: string;
  // Metrics populated during badge checking
  attendanceCount?: number;
  currentStreak?: number;
  examCount?: number;
  exam90PlusCount?: number;
  homeworkCount?: number;
  onTimeHomeworkCount?: number;
  gedSubjectsPassed?: number;
  gedSubjectsReady?: number;
  // Add more as needed
}

export const BADGE_CATALOG: Record<string, BadgeDefinition> = {
  // Attendance Streak Badges
  STREAK_3: {
    key: 'STREAK_3',
    name: 'Hot Streak',
    description: '3 days of perfect attendance',
    icon: 'Flame',
    category: 'ATTENDANCE',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    levels: [3, 7, 14, 30],
    checkFn: (ctx) => ctx.currentStreak || 0
  },

  STREAK_7: {
    key: 'STREAK_7',
    name: 'Week Warrior',
    description: '7 days of perfect attendance',
    icon: 'Flame',
    category: 'ATTENDANCE',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    levels: [3, 7, 14, 30],
    checkFn: (ctx) => ctx.currentStreak || 0
  },

  STREAK_14: {
    key: 'STREAK_14',
    name: 'Two Week Streak',
    description: '14 days of perfect attendance',
    icon: 'Flame',
    category: 'ATTENDANCE',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    levels: [3, 7, 14, 30],
    checkFn: (ctx) => ctx.currentStreak || 0
  },

  STREAK_30: {
    key: 'STREAK_30',
    name: 'Perfect Month',
    description: '30 days of perfect attendance',
    icon: 'CalendarCheck',
    category: 'ATTENDANCE',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    levels: [3, 7, 14, 30],
    checkFn: (ctx) => ctx.currentStreak || 0
  },

  // Academic Badges - Exams
  FIRST_EXAM: {
    key: 'FIRST_EXAM',
    name: 'First Steps',
    description: 'Complete your first exam',
    icon: 'Footprints',
    category: 'MILESTONE',
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    checkFn: (ctx) => ctx.examCount || 0
  },

  EXAM_CHAMPION_5: {
    key: 'EXAM_CHAMPION_5',
    name: 'Exam Champion',
    description: 'Score 90%+ on 5 exams',
    icon: 'Trophy',
    category: 'ACADEMIC',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    levels: [1, 5, 10],
    checkFn: (ctx) => ctx.exam90PlusCount || 0
  },

  EXAM_CHAMPION_10: {
    key: 'EXAM_CHAMPION_10',
    name: 'Exam Master',
    description: 'Score 90%+ on 10 exams',
    icon: 'Trophy',
    category: 'ACADEMIC',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    levels: [1, 5, 10],
    checkFn: (ctx) => ctx.exam90PlusCount || 0
  },

  // Academic Badges - Homework
  HOMEWORK_HERO_5: {
    key: 'HOMEWORK_HERO_5',
    name: 'Homework Hero',
    description: 'Submit 5 homework assignments on time',
    icon: 'BookOpen',
    category: 'ACADEMIC',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    levels: [5, 10, 25],
    checkFn: (ctx) => ctx.onTimeHomeworkCount || 0
  },

  HOMEWORK_HERO_10: {
    key: 'HOMEWORK_HERO_10',
    name: 'Homework Master',
    description: 'Submit 10 homework assignments on time',
    icon: 'BookOpen',
    category: 'ACADEMIC',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    levels: [5, 10, 25],
    checkFn: (ctx) => ctx.onTimeHomeworkCount || 0
  },

  // GED Badges
  GED_READY_ONE: {
    key: 'GED_READY_ONE',
    name: 'GED Ready: One Subject',
    description: 'Reach READY status in one GED subject',
    icon: 'Target',
    category: 'ACADEMIC',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    levels: [1, 2, 3, 4],
    checkFn: (ctx) => ctx.gedSubjectsReady || 0
  },

  GED_READY_ALL: {
    key: 'GED_READY_ALL',
    name: 'GED Ready: All Subjects',
    description: 'Reach READY status in all 4 GED subjects',
    icon: 'Target',
    category: 'ACADEMIC',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    levels: [1, 2, 3, 4],
    checkFn: (ctx) => ctx.gedSubjectsReady || 0
  },

  GED_PASSED_ONE: {
    key: 'GED_PASSED_ONE',
    name: 'GED Passed: One Subject',
    description: 'Pass one GED subject',
    icon: 'Award',
    category: 'ACADEMIC',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    levels: [1, 2, 3, 4],
    checkFn: (ctx) => ctx.gedSubjectsPassed || 0
  },

  GED_MASTER: {
    key: 'GED_MASTER',
    name: 'GED Master',
    description: 'Pass all 4 GED subjects',
    icon: 'GraduationCap',
    category: 'ACADEMIC',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    levels: [1, 2, 3, 4],
    checkFn: (ctx) => ctx.gedSubjectsPassed || 0
  },
};

/**
 * Get all badges for a specific category
 */
export function getBadgesForCategory(category: BadgeDefinition['category']): BadgeDefinition[] {
  return Object.values(BADGE_CATALOG).filter(b => b.category === category);
}

/**
 * Determine the current level for a badge based on progress
 */
export function getBadgeLevel(badge: BadgeDefinition, progress: number): number {
  if (!badge.levels) return progress > 0 ? 1 : 0;

  let level = 0;
  for (const threshold of badge.levels) {
    if (progress >= threshold) level++;
    else break;
  }
  return level;
}

/**
 * Get the next threshold for a badge
 */
export function getNextThreshold(badge: BadgeDefinition, currentLevel: number): number | null {
  if (!badge.levels || currentLevel >= badge.levels.length) return null;
  return badge.levels[currentLevel];
}

/**
 * Get all badge keys that share the same level progression
 */
export function getBadgesForLevelGroup(groupKey: string): BadgeDefinition[] {
  // Badges that share level progression have the same levels array
  const targetLevels = BADGE_CATALOG[groupKey]?.levels;
  if (!targetLevels) return [BADGE_CATALOG[groupKey]];

  return Object.values(BADGE_CATALOG).filter(b =>
    b.levels &&
    b.levels.length === targetLevels.length &&
    b.levels.every((v, i) => v === targetLevels[i])
  );
}
