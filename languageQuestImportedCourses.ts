// Curriculum adapted from the MIT-licensed seed data in:
// https://github.com/TaoMonLae/duolingo-clone/blob/main/scripts/prod.ts

export interface OfficialLanguageQuestOption {
  text: string;
  correct: boolean;
  emoji: string | null;
  audioText: string | null;
}

export interface OfficialLanguageQuestChallenge {
  type: "SELECT" | "ASSIST";
  question: string;
  options: OfficialLanguageQuestOption[];
}

export interface OfficialLanguageQuestCourse {
  code: string;
  title: string;
  description: string;
  language: string;
  imageEmoji: string;
  accentColor: string;
  published: true;
  units: Array<{
    title: string;
    description: string;
    lessons: Array<{
      title: string;
      description: string;
      challenges: OfficialLanguageQuestChallenge[];
    }>;
  }>;
}

const sourceSpanishChallenges: OfficialLanguageQuestChallenge[] = [
  {
    type: "SELECT",
    question: 'Which one of these is "the man"?',
    options: [
      { text: "el hombre", correct: true, emoji: "👨", audioText: "el hombre" },
      { text: "la mujer", correct: false, emoji: "👩", audioText: "la mujer" },
      { text: "el chico", correct: false, emoji: "👦", audioText: "el chico" },
    ],
  },
  {
    type: "SELECT",
    question: 'Which one of these is "the woman"?',
    options: [
      { text: "la mujer", correct: true, emoji: "👩", audioText: "la mujer" },
      { text: "el chico", correct: false, emoji: "👦", audioText: "el chico" },
      { text: "el hombre", correct: false, emoji: "👨", audioText: "el hombre" },
    ],
  },
  {
    type: "SELECT",
    question: 'Which one of these is "the boy"?',
    options: [
      { text: "la mujer", correct: false, emoji: "👩", audioText: "la mujer" },
      { text: "el hombre", correct: false, emoji: "👨", audioText: "el hombre" },
      { text: "el chico", correct: true, emoji: "👦", audioText: "el chico" },
    ],
  },
  {
    type: "ASSIST",
    question: 'Choose the Spanish translation for "the man".',
    options: [
      { text: "la mujer", correct: false, emoji: null, audioText: "la mujer" },
      { text: "el hombre", correct: true, emoji: null, audioText: "el hombre" },
      { text: "el chico", correct: false, emoji: null, audioText: "el chico" },
    ],
  },
  {
    type: "SELECT",
    question: 'Which one of these is "the zombie"?',
    options: [
      { text: "el hombre", correct: false, emoji: "👨", audioText: "el hombre" },
      { text: "la mujer", correct: false, emoji: "👩", audioText: "la mujer" },
      { text: "el zombie", correct: true, emoji: "🧟", audioText: "el zombie" },
    ],
  },
  {
    type: "SELECT",
    question: 'Which one of these is "the robot"?',
    options: [
      { text: "el robot", correct: true, emoji: "🤖", audioText: "el robot" },
      { text: "el zombie", correct: false, emoji: "🧟", audioText: "el zombie" },
      { text: "el chico", correct: false, emoji: "👦", audioText: "el chico" },
    ],
  },
  {
    type: "SELECT",
    question: 'Which one of these is "the girl"?',
    options: [
      { text: "la niña", correct: true, emoji: "👧", audioText: "la niña" },
      { text: "el zombie", correct: false, emoji: "🧟", audioText: "el zombie" },
      { text: "el hombre", correct: false, emoji: "👨", audioText: "el hombre" },
    ],
  },
  {
    type: "ASSIST",
    question: 'Choose the Spanish translation for "the zombie".',
    options: [
      { text: "la mujer", correct: false, emoji: null, audioText: "la mujer" },
      { text: "el zombie", correct: true, emoji: null, audioText: "el zombie" },
      { text: "el chico", correct: false, emoji: null, audioText: "el chico" },
    ],
  },
];

const sourceLessonTitles = ["Nouns", "Verbs", "Adjectives", "Phrases", "Sentences"];

function sourceLessons(unitTitle: string) {
  return sourceLessonTitles.map((title) => ({
    title,
    description: `${unitTitle} Spanish vocabulary practice adapted from the source course.`,
    challenges: sourceSpanishChallenges.map((challenge) => ({
      ...challenge,
      options: challenge.options.map((option) => ({ ...option })),
    })),
  }));
}

export const importedSpanishCourse: OfficialLanguageQuestCourse = {
  code: "MRLC-SOURCE-SPANISH-V1",
  title: "Spanish Foundations",
  description: "A Spanish vocabulary path adapted from the linked Lingo course, with visual choices and speech-assisted practice.",
  language: "Spanish",
  imageEmoji: "🇪🇸",
  accentColor: "#f97316",
  published: true,
  units: [
    {
      title: "Unit 1",
      description: "Learn the basics of Spanish.",
      lessons: sourceLessons("Basic"),
    },
    {
      title: "Unit 2",
      description: "Continue with intermediate Spanish practice.",
      lessons: sourceLessons("Intermediate"),
    },
  ],
};
