// Curriculum adapted from the MIT-licensed seed data in:
// https://github.com/TaoMonLae/duolingo-clone/blob/main/scripts/prod.ts

export interface OfficialLanguageQuestOption {
  text: string;
  correct: boolean;
  emoji: string | null;
  audioText: string | null;
}

// SELECT / ASSIST / CLOZE / ODD_ONE_OUT / MINIMAL_PAIR_LISTENING /
// GRAMMAR_TRANSFORM are all "pick one option" challenges under the hood --
// CLOZE, ODD_ONE_OUT, MINIMAL_PAIR_LISTENING, and GRAMMAR_TRANSFORM exist as
// distinct labels purely so authored question text and future UI treatments
// can tell them apart from a plain vocabulary SELECT, but they submit and
// grade identically (one chosen optionId, exactly one option flagged
// `correct`). MINIMAL_PAIR_LISTENING relies on the lesson UI's existing
// "read question aloud" button as its listen prompt. GRAMMAR_TRANSFORM
// ("make this sentence negative," "make this polite," etc.) is a pure
// content-authoring convention -- the question states the transformation
// task and the options are candidate transformed sentences.
//
// REORDER and MATCHING are genuinely different shapes with no single
// "correct option," so (like each other) every option is `correct: true`:
//   - REORDER: `options` must be listed in their correct final order (the
//     array position becomes each option's `order` column at creation time).
//     The learner submits a sequence of option ids, checked against that order.
//   - MATCHING: `options` must be listed as consecutive left/right pairs --
//     index 2k is pair k's left tile, index 2k+1 its right tile. The learner
//     submits the tile-id pairs they connected, checked against pair index
//     (floor(optionIndex / 2)) rather than any single correct answer.
//
// DICTATION plays a single option's audio and asks the learner to type what
// they heard -- exactly one option, flagged `correct: true`, whose `text` is
// the canonical transcript graded with the same fuzzy/pinyin-aware matching
// used elsewhere (`languageQuestAnswerMatches`).
export interface OfficialLanguageQuestChallenge {
  type:
    | "SELECT"
    | "ASSIST"
    | "CLOZE"
    | "ODD_ONE_OUT"
    | "REORDER"
    | "MATCHING"
    | "MINIMAL_PAIR_LISTENING"
    | "DICTATION"
    | "GRAMMAR_TRANSFORM";
  question: string;
  options: OfficialLanguageQuestOption[];
}

export interface OfficialLanguageQuestCourse {
  code: string;
  title: string;
  description: string;
  language: string;
  category?: string;
  imageEmoji: string;
  accentColor: string;
  published: boolean;
  /**
   * Retired built-in courses remain in the database so historical learner
   * progress is preserved, but they are forced out of the public catalog and
   * cannot be republished from Course Studio.
   */
  retired?: boolean;
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
  published: false,
  retired: true,
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
