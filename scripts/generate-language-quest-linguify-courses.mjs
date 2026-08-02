import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { blankWord, buildOddOneOut, option, tokenizeWords } from "./lib/language-quest-practice-helpers.mjs";

const snapshotPath = path.resolve(
  process.cwd(),
  "curricula/sources/linguify/vocab-sets.snapshot.json",
);
const outputPath = path.resolve(
  process.cwd(),
  "curricula/language-quest/linguify-cefr-courses.generated.json",
);

const courseMetadata = {
  A1: {
    code: "MRLC-LINGUIFY-CEFR-A1-V1",
    title: "English Vocabulary A1: Foundations",
    description: "Begin with practical words for daily life, greetings, food, and drink.",
    imageEmoji: "🌱",
    accentColor: "#16a34a",
  },
  A2: {
    code: "MRLC-LINGUIFY-CEFR-A2-V1",
    title: "English Vocabulary A2: Everyday Independence",
    description: "Build confidence with travel, shopping, money, weather, and nature.",
    imageEmoji: "🧭",
    accentColor: "#0891b2",
  },
  B1: {
    code: "MRLC-LINGUIFY-CEFR-B1-V1",
    title: "English Vocabulary B1: Life and Learning",
    description: "Strengthen intermediate vocabulary for work, health, and education.",
    imageEmoji: "📘",
    accentColor: "#2563eb",
  },
  B2: {
    code: "MRLC-LINGUIFY-CEFR-B2-V1",
    title: "English Vocabulary B2: The Wider World",
    description: "Explore upper-intermediate language for technology, climate, and media.",
    imageEmoji: "🌍",
    accentColor: "#7c3aed",
  },
  C1: {
    code: "MRLC-LINGUIFY-CEFR-C1-V1",
    title: "English Vocabulary C1: Advanced Ideas",
    description: "Develop precise language for politics, science, research, arts, and culture.",
    imageEmoji: "🔬",
    accentColor: "#c026d3",
  },
  C2: {
    code: "MRLC-LINGUIFY-CEFR-C2-V1",
    title: "English Vocabulary C2: Mastery",
    description: "Master nuanced language for philosophy, ethics, law, justice, and idioms.",
    imageEmoji: "🏆",
    accentColor: "#ea580c",
  },
};

function challengeFor(words, entry, index) {
  const distractors = [];
  for (let step = 1; step < words.length && distractors.length < 2; step += 1) {
    const candidate = words[(index + step) % words.length].word;
    if (candidate !== entry.word && !distractors.includes(candidate)) {
      distractors.push(candidate);
    }
  }
  if (distractors.length !== 2) {
    throw new Error(`Cannot create two distinct distractors for "${entry.word}"`);
  }
  const options = distractors.map((text) => ({
    text,
    correct: false,
    emoji: null,
    audioText: text,
  }));
  options.splice(index % 3, 0, {
    text: entry.word,
    correct: true,
    emoji: null,
    audioText: entry.word,
  });
  const grammarLabel = entry.partOfSpeech || "word";
  const pronunciation = entry.phonetic ? ` Pronunciation: ${entry.phonetic}.` : "";
  const example = entry.example ? ` Example: “${entry.example}”` : "";
  const explanation = `“${entry.word}” (${grammarLabel}) means “${entry.definition}”.${pronunciation}${example}`;
  const blanked = entry.example ? blankWord(entry.example, entry.word) : null;
  // Cycles every word through all five single-answer challenge types so a
  // lesson covers translation recall (SELECT/ASSIST), a real example
  // sentence (CLOZE), and a grammar-flavoured completion naming the word's
  // part of speech (GRAMMAR_TRANSFORM) -- all reuse the exact same
  // validated word/distractor options, so only the question framing changes.
  switch (index % 5) {
    case 0:
    case 1:
      return { type: "SELECT", question: `Which ${grammarLabel} means “${entry.definition}”?${pronunciation}${example}`, explanation, options };
    case 2:
      return { type: "ASSIST", question: `Which ${grammarLabel} means “${entry.definition}”?${pronunciation}${example}`, explanation, options };
    case 3:
      if (blanked) return { type: "CLOZE", question: `Complete the sentence: “${blanked}”`, explanation, options };
      return { type: "CLOZE", question: `Fill in the blank: “_____” means “${entry.definition}.”`, explanation, options };
    default:
      if (blanked) return { type: "GRAMMAR_TRANSFORM", question: `Choose the ${grammarLabel} that correctly completes this sentence: “${blanked}”`, explanation, options };
      return { type: "GRAMMAR_TRANSFORM", question: `Choose the ${grammarLabel} that means “${entry.definition}.”`, explanation, options };
  }
}

// Pairs the first 4 words of a lesson with their definitions into one
// MATCHING challenge (2 tiles per pair, positionally paired -- see
// matchingChallengeIsCorrect in shared/languageQuest.ts).
function matchingChallengeFor(words) {
  const pairs = words.slice(0, 4);
  const options = [];
  for (const entry of pairs) {
    options.push({ text: entry.word, correct: true, emoji: null, audioText: entry.word });
    options.push({ text: entry.definition, correct: true, emoji: null, audioText: entry.definition });
  }
  return {
    type: "MATCHING",
    question: "Match each word to its definition.",
    explanation: pairs.map((entry) => `“${entry.word}” means ${entry.definition}.`).join(" "),
    options,
  };
}

const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
if (snapshot.license !== "MIT") {
  throw new Error("The Linguify snapshot must retain its MIT license metadata");
}
if (!Array.isArray(snapshot.sets) || snapshot.sets.length !== 18) {
  throw new Error(`Expected 18 Linguify vocabulary sets, found ${snapshot.sets?.length ?? 0}`);
}

// Precomputes every lesson's own word slice and topic up front so each
// lesson's extra ODD_ONE_OUT/REORDER challenges can safely borrow from a
// neighbouring lesson -- jumping two lessons ahead skips past the paired
// second-half lesson of the same vocabulary set, guaranteeing the "odd"
// word actually comes from a different topic.
const lessonPlans = [];
for (const level of Object.keys(courseMetadata)) {
  const sets = snapshot.sets.filter((set) => set.level === level);
  if (sets.length !== 3) throw new Error(`${level} must contain exactly three vocabulary sets`);
  for (const set of sets) {
    if (!Array.isArray(set.words) || set.words.length !== 20) throw new Error(`${set.id} must contain exactly 20 words`);
    for (const lessonIndex of [0, 1]) {
      lessonPlans.push({ topic: set.topic || set.name, words: set.words.slice(lessonIndex * 10, lessonIndex * 10 + 10) });
    }
  }
}

function lessonExtras(planIndex) {
  const { topic, words } = lessonPlans[planIndex];
  const ringer = lessonPlans[(planIndex + 2) % lessonPlans.length];
  const extras = [];

  const inGroup = words.slice(0, 3).map((entry) => entry.word);
  const oddWord = ringer.words[0].word;
  const oddOneOut = buildOddOneOut(
    `Which word is not related to ${topic || "this lesson's topic"}?`,
    inGroup,
    oddWord,
    `“${oddWord}” belongs to a different topic; the rest of this set is ${inGroup.map((word) => `“${word}”`).join(", ")}.`,
  );
  if (oddOneOut) extras.push(oddOneOut);

  let bestSentence = null;
  for (const entry of words) {
    const tokens = entry.example ? tokenizeWords(entry.example) : null;
    if (tokens && (!bestSentence || tokens.length > bestSentence.tokens.length)) {
      bestSentence = { word: entry.word, tokens };
    }
  }
  if (!bestSentence) {
    for (const entry of words) {
      const tokens = tokenizeWords(entry.definition);
      if (tokens && (!bestSentence || tokens.length > bestSentence.tokens.length)) {
        bestSentence = { word: entry.word, tokens };
      }
    }
  }
  if (bestSentence) {
    extras.push({
      type: "REORDER",
      question: `Put this sentence about “${bestSentence.word}” back in the correct order.`,
      options: bestSentence.tokens.map((token) => option(token, true)),
    });
  }

  return extras;
}

let planIndex = 0;
const courses = Object.entries(courseMetadata).map(([level, metadata]) => {
  const sets = snapshot.sets.filter((set) => set.level === level);
  return {
    ...metadata,
    language: "English",
    published: true,
    units: sets.map((set) => ({
      title: `${set.icon || "📚"} ${set.name}`,
      description: set.description,
      lessons: [0, 1].map((lessonIndex) => {
        const words = set.words.slice(lessonIndex * 10, lessonIndex * 10 + 10);
        const start = lessonIndex * 10 + 1;
        const extras = lessonExtras(planIndex);
        planIndex += 1;
        return {
          title: `${set.name.replace(new RegExp(`^${level}\\s+`), "")}: Words ${start}-${start + 9}`,
          description: "Learn ten words through definitions, examples, listening, source-supplied pronunciation, sentence completion, grammar, ordering, and matching review.",
          challenges: [...words.map((entry, index) => challengeFor(words, entry, index)), ...extras, matchingChallengeFor(words)],
        };
      }),
    })),
  };
});

const units = courses.flatMap((course) => course.units);
const lessons = units.flatMap((unit) => unit.lessons);
const allChallenges = lessons.flatMap((lesson) => lesson.challenges);
const matchingChallenges = allChallenges.filter((challenge) => challenge.type === "MATCHING");
const reorderChallenges = allChallenges.filter((challenge) => challenge.type === "REORDER");
const oddOneOutChallenges = allChallenges.filter((challenge) => challenge.type === "ODD_ONE_OUT");
const challenges = allChallenges.filter((challenge) => !["MATCHING", "REORDER", "ODD_ONE_OUT"].includes(challenge.type));
if (courses.length !== 6 || units.length !== 18 || lessons.length !== 36 || challenges.length !== 360) {
  throw new Error("Linguify course generation produced the wrong curriculum size");
}
if (challenges.some(
  (challenge) =>
    challenge.options.length !== 3
    || challenge.options.filter((opt) => opt.correct).length !== 1
    || challenge.options.some((opt) => opt.audioText !== opt.text),
)) {
  throw new Error("Every Linguify challenge must have three speakable options and exactly one answer");
}
{
  const typeCounts = new Map();
  for (const challenge of challenges) typeCounts.set(challenge.type, (typeCounts.get(challenge.type) || 0) + 1);
  for (const requiredType of ["SELECT", "ASSIST", "CLOZE", "GRAMMAR_TRANSFORM"]) {
    if (!typeCounts.get(requiredType)) throw new Error(`Generated Linguify course is missing ${requiredType} challenges`);
  }
}
if (reorderChallenges.length !== lessons.length) {
  throw new Error(`Expected one REORDER challenge per lesson (${lessons.length}), found ${reorderChallenges.length}`);
}
if (reorderChallenges.some((challenge) => challenge.options.length < 2 || challenge.options.some((opt) => !opt.correct))) {
  throw new Error("Every REORDER challenge must have at least two tokens, all marked correct");
}
if (oddOneOutChallenges.length !== lessons.length) {
  throw new Error(`Expected one ODD_ONE_OUT challenge per lesson (${lessons.length}), found ${oddOneOutChallenges.length}`);
}
if (oddOneOutChallenges.some((challenge) => challenge.options.length !== 4 || challenge.options.filter((opt) => opt.correct).length !== 1)) {
  throw new Error("Every ODD_ONE_OUT challenge must have four options and exactly one odd-one-out answer");
}
if (matchingChallenges.length !== lessons.length) {
  throw new Error(`Expected one MATCHING challenge per lesson (${lessons.length}), found ${matchingChallenges.length}`);
}
if (matchingChallenges.some((challenge) => challenge.options.length !== 8 || challenge.options.some((opt) => !opt.correct))) {
  throw new Error("Every generated MATCHING challenge must have 4 pairs (8 tiles), all marked correct");
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(courses, null, 2)}\n`, "utf8");
console.log(
  `Generated ${courses.length} Linguify CEFR courses with ${units.length} units and ${challenges.length} vocabulary challenges`,
);
