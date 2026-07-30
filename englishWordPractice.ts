import { ensureOfficialCourses } from "./languageQuest";
import { englishWordCourses } from "./languageQuestEnglishWordCourses";
import { advancedEnglishCourses } from "./languageQuestAdvancedEnglishCourses";
import { linguifyCefrCourses } from "./languageQuestLinguifyCourses";
import { seededDailyQuestShuffle } from "./shared/dailyQuest";

export interface EnglishWordPracticeOption {
  id: string;
  text: string;
  emoji?: string | null;
}

export interface EnglishWordPracticeQuestion {
  id: string;
  sourceType: "LANGUAGE_QUEST";
  sourceId: string;
  courseCode: string;
  sourceLabel: string;
  subject: string;
  difficulty: string;
  prompt: string;
  passageText?: string | null;
  imageUrl?: string | null;
  options: EnglishWordPracticeOption[];
  correctOptionId: string;
  explanation: string | null;
  isReview?: boolean;
}

const ENGLISH_WORD_COURSES = [
  ...englishWordCourses,
  ...advancedEnglishCourses,
  ...linguifyCefrCourses,
];

export const ENGLISH_WORD_COURSE_CODES = ENGLISH_WORD_COURSES.map((course) => course.code);
export const ENGLISH_WORD_COURSE_TITLES = new Set(
  ENGLISH_WORD_COURSES.map((course) => course.title),
);

function decodeEntities(value: unknown): string {
  return String(value ?? "")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .trim();
}

function normalizeChallenge(challenge: any, seed: string): EnglishWordPracticeQuestion | null {
  const correct = challenge.options?.filter((option: any) => option.correct) ?? [];
  if (correct.length !== 1 || challenge.options.length < 2) return null;
  const course = challenge.lesson.unit.course;
  const options = seededDailyQuestShuffle<EnglishWordPracticeOption>(
    challenge.options.map((option: any) => ({
      id: option.id,
      text: decodeEntities(option.text),
      emoji: option.emoji ?? null,
    })),
    `${seed}:options:${challenge.id}`,
  );
  return {
    id: `language:${challenge.id}`,
    sourceType: "LANGUAGE_QUEST",
    sourceId: challenge.id,
    courseCode: course.code,
    sourceLabel: `Language Quest · ${course.title}`,
    subject: course.language,
    difficulty: "Practice",
    prompt: decodeEntities(challenge.question),
    options,
    correctOptionId: correct[0].id,
    explanation: `The correct answer is “${decodeEntities(correct[0].text)}”.`,
  };
}

export function isEnglishWordPracticeQuestion(
  item: Partial<EnglishWordPracticeQuestion>,
): boolean {
  const legacyCourseTitle = String(item.sourceLabel ?? "").replace(/^Language Quest · /, "");
  return item.sourceType === "LANGUAGE_QUEST"
    && (
      ENGLISH_WORD_COURSE_CODES.includes(String(item.courseCode ?? ""))
      || ENGLISH_WORD_COURSE_TITLES.has(legacyCourseTitle)
    );
}

// Word Trail's board game engine only cares that a deck is an array of
// EnglishWordPracticeQuestion-shaped objects with unique ids -- it has no
// idea whether they came from the fixed English-word course pool above or
// from an arbitrary Language Quest course. This lets a learner start a Word
// Trail game built from any single published course's own challenges (e.g.
// a Mandarin or Spanish course), reusing every bit of Word Trail's existing
// board, dice, and scoring logic untouched.
export async function loadLanguageQuestCourseDeck(
  prisma: any,
  courseId: string,
  seed: string,
  limit = 60,
): Promise<EnglishWordPracticeQuestion[]> {
  const rows = await prisma.languageQuestChallenge.findMany({
    where: { lesson: { unit: { courseId, course: { published: true } } } },
    include: {
      options: { orderBy: { order: "asc" } },
      lesson: { include: { unit: { include: { course: true } } } },
    },
    take: 1_000,
    orderBy: { createdAt: "asc" },
  });
  const questions = (rows as any[])
    .map((row) => normalizeChallenge(row, seed))
    .filter(
      (item: EnglishWordPracticeQuestion | null): item is EnglishWordPracticeQuestion =>
        item !== null,
    );
  return seededDailyQuestShuffle(questions, `${seed}:questions`).slice(0, limit);
}

export async function loadEnglishWordPracticeQuestions(
  prisma: any,
  seed: string,
  limit = 250,
): Promise<EnglishWordPracticeQuestion[]> {
  await ensureOfficialCourses(prisma);
  const rows = await prisma.languageQuestChallenge.findMany({
    where: {
      lesson: {
        unit: {
          course: {
            published: true,
            code: { in: ENGLISH_WORD_COURSE_CODES },
          },
        },
      },
    },
    include: {
      options: { orderBy: { order: "asc" } },
      lesson: { include: { unit: { include: { course: true } } } },
    },
    take: 1_000,
    orderBy: { createdAt: "asc" },
  });

  const questions = (rows as any[])
    .map((row) => normalizeChallenge(row, seed))
    .filter(
      (item: EnglishWordPracticeQuestion | null): item is EnglishWordPracticeQuestion =>
        item !== null,
    );
  return seededDailyQuestShuffle(questions, `${seed}:questions`).slice(0, limit);
}
