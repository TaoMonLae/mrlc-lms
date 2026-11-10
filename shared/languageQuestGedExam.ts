/**
 * GED-style practice test settings for MRLC's GED Preparation courses.
 *
 * Question counts and time limits follow the published pacing of each
 * computer-based GED subject test, so learners practise at the pace they
 * will face on test day. RLA covers the reading and language questions; the
 * 45-minute extended response and 10-minute break are not part of this
 * auto-graded practice.
 */
export const GED_PREPARATION_CATEGORY = 'GED Preparation';

export type GedExamSubject = 'mathematics' | 'rla' | 'science' | 'social-studies';

export interface GedExamProfile {
  subject: GedExamSubject;
  /** Name of the official subject test this practice mirrors. */
  testName: string;
  questionCount: number;
  minutes: number;
  /** Mathematical Reasoning opens with a short section answered without a calculator. */
  noCalculatorQuestions: number;
  calculator: boolean;
  formulaSheet: boolean;
  /** One sentence describing the real test-day format. */
  testDayFormat: string;
}

const PROFILES: Record<GedExamSubject, GedExamProfile> = {
  mathematics: {
    subject: 'mathematics',
    testName: 'Mathematical Reasoning',
    questionCount: 46,
    minutes: 115,
    noCalculatorQuestions: 5,
    calculator: true,
    formulaSheet: true,
    testDayFormat: 'About 46 questions in 115 minutes. The first 5 are answered without a calculator; after that an on-screen calculator and formula sheet are available.',
  },
  rla: {
    subject: 'rla',
    testName: 'Reasoning Through Language Arts',
    questionCount: 46,
    minutes: 95,
    noCalculatorQuestions: 0,
    calculator: false,
    formulaSheet: false,
    testDayFormat: 'Test day lasts 150 minutes: reading and language questions plus a 45-minute extended response and a 10-minute break. This practice covers the reading and language questions.',
  },
  science: {
    subject: 'science',
    testName: 'Science',
    questionCount: 34,
    minutes: 90,
    noCalculatorQuestions: 0,
    calculator: true,
    formulaSheet: false,
    testDayFormat: 'About 34 questions in 90 minutes, each built on a passage, table, graph, or diagram. An on-screen calculator is available.',
  },
  'social-studies': {
    subject: 'social-studies',
    testName: 'Social Studies',
    questionCount: 35,
    minutes: 70,
    noCalculatorQuestions: 0,
    calculator: true,
    formulaSheet: false,
    testDayFormat: 'About 35 questions in 70 minutes, each built on a document excerpt, map, table, or graph. An on-screen calculator is available.',
  },
};

/** Highest question count any GED practice test can contain. */
export const LANGUAGE_QUEST_GED_EXAM_MAX_QUESTIONS = Math.max(...Object.values(PROFILES).map((profile) => profile.questionCount));

function gedSubjectForLanguage(language: string): GedExamSubject | null {
  const normalized = language.trim().toLocaleLowerCase();
  if (normalized.includes('math')) return 'mathematics';
  if (normalized.includes('science')) return 'science';
  if (normalized.includes('social studies')) return 'social-studies';
  if (normalized.includes('rla') || normalized.includes('language arts')) return 'rla';
  return null;
}

/** Returns the GED practice-test settings for a GED Preparation course, or null for every other course. */
export function languageQuestGedExamProfile(course: { category?: string | null; language: string }): GedExamProfile | null {
  if ((course.category ?? '').trim() !== GED_PREPARATION_CATEGORY) return null;
  const subject = gedSubjectForLanguage(course.language);
  return subject ? PROFILES[subject] : null;
}

/**
 * Real GED items always arrive with their source on screen, and questions
 * about one source are answered together. Keeps every source group's
 * questions next to each other (in their authored order) while the order of
 * the groups themselves stays as randomized as the incoming deck.
 */
export function groupLanguageQuestExamDeckBySource<T>(deck: readonly T[], sourceKey: (item: T) => string, authoredOrder: (item: T) => number): T[] {
  const groups = new Map<string, T[]>();
  for (const item of deck) {
    const key = sourceKey(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.values()].flatMap((group) => [...group].sort((a, b) => authoredOrder(a) - authoredOrder(b)));
}

const CONCEPT_PREFIXES = ['SCIENCE_V2::', 'SOCIAL_STUDIES_V1::'];

/**
 * Science and Social Studies lessons keep their table, graph, timeline, or
 * diagram in the lesson's concept document. GED questions about that source
 * must show it beside the question, so this extracts just the visual.
 */
export function languageQuestConceptStimulus(conceptIntro: string | null | undefined): Record<string, unknown> | null {
  if (!conceptIntro) return null;
  const prefix = CONCEPT_PREFIXES.find((candidate) => conceptIntro.startsWith(candidate));
  if (!prefix) return null;
  try {
    const parsed = JSON.parse(conceptIntro.slice(prefix.length));
    const visual = parsed?.visual;
    return visual && typeof visual === 'object' && typeof visual.type === 'string' ? visual : null;
  } catch {
    return null;
  }
}

export type GedReadiness = 'on-track' | 'close' | 'not-yet';

/**
 * MRLC's own readiness guidance for a percent-correct practice score. The
 * real GED reports a scaled score from 100 to 200 (145 passes); this
 * practice test cannot produce an official scaled score.
 */
export function languageQuestGedReadiness(scorePercent: number): GedReadiness {
  if (scorePercent >= 80) return 'on-track';
  if (scorePercent >= 60) return 'close';
  return 'not-yet';
}
