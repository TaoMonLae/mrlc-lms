// Converts the school-provided Malay (Bahasa Malaysia) curriculum snapshot in
// curricula/sources/malay/ into five CEFR-level Language Quest courses, using
// the same SELECT/ASSIST multiple-choice challenge format every other course
// in this app already uses (see languageQuestImportedCourses.ts).
//
// The source package is much richer than what Language Quest's engine can
// currently render: alongside vocabulary it has matching/cloze/reorder/
// minimal-pair drills, an AI-conversation-partner scenario per unit, speaking
// prompts with rubrics, and a full unit quiz. None of those exercise engines
// (drag-to-match, blank-filling, an AI roleplay chat, audio recording +
// rubric grading) exist in Language Quest yet, so this script converts what
// it reasonably can into multiple choice / typed-answer challenges and skips
// the rest:
//   - vocab items                          -> one SELECT/ASSIST challenge each
//   - practiceExercises (reorder)           -> REORDER challenge from the
//                                              exercise's own answer sentence
//   - practiceExercises (clozeGap)          -> CLOZE challenge built from the
//                                              exercise's itemIds
//   - practiceExercises (minimalPairChoice) -> MINIMAL_PAIR_LISTENING
//                                              challenge from the exercise's
//                                              two itemIds
//   - practiceExercises (translate)         -> SELECT challenge from the
//                                              exercise's own answer sentence
//   - practiceExercises (matching/
//     listenToPicture)                      -> SELECT challenge built from
//                                              the exercise's itemIds -- see
//                                              note below on why "matching"
//                                              isn't retrofitted onto the
//                                              real MATCHING engine yet
//   - unitQuiz mcq/listening questions      -> SELECT challenge (options as
//                                              authored, zero invented text)
//   - unitQuiz translate questions          -> SELECT challenge from the
//                                              question's own answer sentence
//   - scenario, speakingPrompts             -> not converted (no engine yet)
//
// Note on "matching": Language Quest's MATCHING challenge type exists (see
// languageQuestImportedCourses.ts), but this source package's own "matching"
// exercises only carry a loose `itemIds` list plus free-text prose describing
// the pairing ("Match each family word to a picture of the family member",
// itemIds with 1, 3, or 4 entries and no explicit pair keys) -- there's no
// reliable way to auto-derive which items pair with which without guessing,
// unlike "reorder" (a real answer sentence to tokenize) or
// "minimalPairChoice" (always exactly two itemIds). So "matching" keeps its
// existing best-effort SELECT downgrade rather than risk generating
// incorrectly-paired MATCHING challenges.
//
// Phase 5 promotes this school curriculum to the canonical learner path. The
// overlapping source-guided Malay courses are retained as archived records so
// learners see one explicit A1-C1 progression rather than competing paths.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const sourceDir = path.resolve(process.cwd(), "curricula/sources/malay");
const outputPath = path.resolve(
  process.cwd(),
  "curricula/language-quest/malay-cefr-courses.generated.json",
);

const LEVEL_META = {
  A1: {
    code: "MRLC-MALAY-A1-V2",
    title: "Bahasa Malaysia A1: Baru Belajar",
    description: "Canonical A1 Malay path: greetings, numbers, family, market, food, time, transport, and health basics.",
    imageEmoji: "🌱",
    accentColor: "#059669",
  },
  A2: {
    code: "MRLC-MALAY-A2-V2",
    title: "Bahasa Malaysia A2: Boleh Berbual Sikit",
    description: "Canonical A2 Malay path: clinics, public transport, banking, renting, work, slang, and simple past-tense stories.",
    imageEmoji: "🧭",
    accentColor: "#0ea5e9",
  },
  B1: {
    code: "MRLC-MALAY-B1-V2",
    title: "Bahasa Malaysia B1: Boleh Uruskan Sendiri",
    description: "Canonical B1 Malay path: independent living, forms, job hunting, tenancy, school, money, and negotiation.",
    imageEmoji: "📘",
    accentColor: "#6366f1",
  },
  B2: {
    code: "MRLC-MALAY-B2-V2",
    title: "Bahasa Malaysia B2: Fasih untuk Kerja",
    description: "Canonical B2 Malay path: meetings, customer service, news, legal literacy, culture, and debate.",
    imageEmoji: "💼",
    accentColor: "#db2777",
  },
  C1: {
    code: "MRLC-MALAY-C1-V2",
    title: "Bahasa Malaysia C1: Mahir",
    description: "Canonical C1 Malay path: leadership, complex debate, literature, formal writing, and a capstone mock exam.",
    imageEmoji: "🎓",
    accentColor: "#d97706",
  },
};

const VOCAB_LABEL = { phrase: "phrase", minimalPair: "word" };

let runningIndex = 0;
function nextChallengeType() {
  const type = runningIndex % 4 === 3 ? "ASSIST" : "SELECT";
  runningIndex += 1;
  return type;
}

function option(text, correct) {
  const clean = String(text).trim();
  return { text: clean, correct, emoji: null, audioText: clean };
}

// Picks `count` distinct distractor strings that don't equal `excludeText`,
// trying each pool in order until enough are found.
function pickDistractors(pools, excludeText, count) {
  const excludeNorm = excludeText.trim().toLowerCase();
  const seen = new Set([excludeNorm]);
  const picked = [];
  for (const pool of pools) {
    for (const candidate of pool) {
      if (picked.length >= count) break;
      const norm = candidate.trim().toLowerCase();
      if (seen.has(norm)) continue;
      seen.add(norm);
      picked.push(candidate);
    }
    if (picked.length >= count) break;
  }
  return picked;
}

function buildMcChallenge(question, correctText, distractorPools, forcedType) {
  const distractors = pickDistractors(distractorPools, correctText, 2);
  if (distractors.length !== 2) {
    throw new Error(`Could not find two distinct distractors for "${correctText}" (question: ${question})`);
  }
  const options = distractors.map((text) => option(text, false));
  options.splice(runningIndex % 3, 0, option(correctText, true));
  return { type: forcedType || nextChallengeType(), question, options };
}

// REORDER challenges store their tokens in canonical (correct) order --
// every option is `correct: true` since there's no single right answer among
// distractors, and the app derives each option's stored `order` column from
// its array position here, not a separate field. The GET lesson route
// already shuffles options for display, so the "scramble" the learner sees
// comes for free; this just needs to hand over the words in the right order.
function reorderChallenge(ex) {
  const answer = (ex.answer || "").trim();
  if (!answer || isFillTemplate(answer)) return null;
  const tokens = answer.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;
  return {
    type: "REORDER",
    question: ex.prompt,
    options: tokens.map((token) => option(token, true)),
  };
}

// minimalPairChoice exercises always carry exactly two itemIds (the two
// similar-sounding candidates) and sometimes an explicit `answer` naming
// which one is correct. When `answer` is absent we default to the
// first-listed candidate, matching the prompt's own "Which did you hear:
// 'X' or 'Y'?" ordering -- this is a best-effort guess like the rest of this
// draft import, flagged here for native-speaker review before publishing.
function minimalPairChallenge(ex, vmap) {
  const itemIds = ex.itemIds || [];
  if (itemIds.length !== 2) return null;
  const [first, second] = itemIds.map((id) => vmap.get(id));
  if (!first || !second) return null;
  // A couple of these are homographs distinguished only by meaning, not
  // spelling (e.g. "perang" = war vs. "perang" = blond/brown) -- with
  // identical option text, a text-based UI can't let the learner pick
  // between them at all. Bail out and let the caller fall back to the
  // ordinary vocabulary-SELECT downgrade for those.
  if (first.ms.trim().toLowerCase() === second.ms.trim().toLowerCase()) return null;
  const rawAnswer = (ex.answer || "").trim().toLowerCase();
  let firstIsCorrect;
  if (rawAnswer) {
    if (rawAnswer === first.ms.trim().toLowerCase()) firstIsCorrect = true;
    else if (rawAnswer === second.ms.trim().toLowerCase()) firstIsCorrect = false;
    else return null; // Recorded answer matches neither candidate -- skip rather than guess.
  } else {
    firstIsCorrect = true;
  }
  return {
    type: "MINIMAL_PAIR_LISTENING",
    question: ex.prompt,
    options: [option(first.ms, firstIsCorrect), option(second.ms, !firstIsCorrect)],
  };
}

function vocabChallenge(vocab, wordPools) {
  const label = VOCAB_LABEL[vocab.type] || "word";
  const registerNote = vocab.register === "standard" ? " (formal/standard Malay)" : "";
  const pronunciation = vocab.phonetic ? ` Pronunciation: ${vocab.phonetic}.` : "";
  const example = vocab.example ? ` Example: “${vocab.example}”` : "";
  const question = `Which ${label} means “${vocab.en}”?${registerNote}${pronunciation}${example}`;
  const priorityPool = vocab.minimalPairWith && wordPools.byId.has(vocab.minimalPairWith)
    ? [wordPools.byId.get(vocab.minimalPairWith)]
    : [];
  return buildMcChallenge(question, vocab.ms, [priorityPool, wordPools.lesson, wordPools.unit, wordPools.level]);
}

function itemExerciseChallenge(ex, vmap, wordPools, forcedType) {
  const itemIds = ex.itemIds || [];
  if (itemIds.length === 0) return null;
  const target = vmap.get(itemIds[0]);
  if (!target) return null;
  const siblingPool = itemIds.slice(1).map((id) => vmap.get(id)?.ms).filter(Boolean);
  return buildMcChallenge(ex.prompt, target.ms, [siblingPool, wordPools.unit, wordPools.level], forcedType);
}

// A handful of "translate" exercises ask the learner to fill a pattern
// ("My name is ___ and I am from ___.") rather than translate a fixed
// sentence -- their "answer" field is itself a blanked template, not a
// concrete correct answer, so it can't become a fair multiple-choice option.
function isFillTemplate(answer) {
  return answer.includes("___");
}

function sentenceExerciseChallenge(ex, sentencePools) {
  const answer = (ex.answer || "").trim();
  if (!answer || isFillTemplate(answer)) return null;
  return buildMcChallenge(ex.prompt, answer, [sentencePools.unit, sentencePools.level]);
}

function quizChallenge(question, sentencePools) {
  if (question.type === "mcq" || question.type === "listening") {
    if (!Array.isArray(question.options) || typeof question.answerIndex !== "number") return null;
    const options = question.options.map((text, idx) => option(text, idx === question.answerIndex));
    if (options.filter((o) => o.correct).length !== 1) return null;
    const built = { type: nextChallengeType(), question: question.prompt, options };
    return built;
  }
  if (question.type === "translate") {
    const answer = (question.answer || "").trim();
    if (!answer || isFillTemplate(answer)) return null;
    return buildMcChallenge(question.prompt, answer, [sentencePools.unit, sentencePools.level]);
  }
  return null;
}

async function loadUnits() {
  const levels = ["A1", "A2", "B1", "B2", "C1"];
  const byLevel = new Map();
  for (const level of levels) {
    const dir = path.join(sourceDir, level.toLowerCase(), "units");
    const { readdir } = await import("node:fs/promises");
    const files = (await readdir(dir)).filter((name) => name.endsWith(".json")).sort();
    const units = [];
    for (const file of files) {
      const raw = await readFile(path.join(dir, file), "utf8");
      units.push(JSON.parse(raw));
    }
    units.sort((a, b) => a.order - b.order);
    byLevel.set(level, units);
  }
  return byLevel;
}

function buildLevelWordPool(units) {
  return units.flatMap((unit) => unit.vocab.map((v) => v.ms));
}

function buildLevelSentencePool(units) {
  const sentences = [];
  for (const unit of units) {
    for (const lesson of unit.lessons) {
      for (const ex of lesson.practiceExercises || []) {
        if ((ex.type === "translate" || ex.type === "reorder") && ex.answer && !isFillTemplate(ex.answer)) {
          sentences.push(ex.answer.trim());
        }
      }
    }
    for (const q of unit.unitQuiz?.questions || []) {
      if (q.type === "translate" && q.answer && !isFillTemplate(q.answer)) sentences.push(q.answer.trim());
    }
  }
  return sentences;
}

function buildUnitWordPool(unit) {
  return unit.vocab.map((v) => v.ms);
}

function buildUnitSentencePool(unit) {
  const sentences = [];
  for (const lesson of unit.lessons) {
    for (const ex of lesson.practiceExercises || []) {
      if ((ex.type === "translate" || ex.type === "reorder") && ex.answer && !isFillTemplate(ex.answer)) {
        sentences.push(ex.answer.trim());
      }
    }
  }
  for (const q of unit.unitQuiz?.questions || []) {
    if (q.type === "translate" && q.answer && !isFillTemplate(q.answer)) sentences.push(q.answer.trim());
  }
  return sentences;
}

function convertUnit(unit, levelWordPool, levelSentencePool) {
  const vmap = new Map(unit.vocab.map((v) => [v.id, v]));
  const byId = new Map(unit.vocab.map((v) => [v.id, v.ms]));
  const unitWordPool = buildUnitWordPool(unit);
  const unitSentencePool = buildUnitSentencePool(unit);
  const sentencePools = { unit: unitSentencePool, level: levelSentencePool };

  const lessons = [];
  for (const lesson of unit.lessons) {
    const lessonWords = (lesson.itemIds || []).map((id) => byId.get(id)).filter(Boolean);
    const wordPools = { byId, lesson: lessonWords, unit: unitWordPool, level: levelWordPool };
    const challenges = [];

    for (const itemId of lesson.itemIds || []) {
      const vocab = vmap.get(itemId);
      if (!vocab) continue;
      challenges.push(vocabChallenge(vocab, wordPools));
    }

    for (const ex of lesson.practiceExercises || []) {
      let built = null;
      if (ex.type === "reorder") {
        // A genuine word-order exercise: use the real REORDER engine instead
        // of downgrading it into a "pick the right sentence" multiple choice.
        built = reorderChallenge(ex);
      } else if (ex.type === "translate") {
        built = sentenceExerciseChallenge(ex, sentencePools);
      } else if (ex.type === "clozeGap") {
        // A genuine fill-in-the-blank exercise: label it CLOZE so it's
        // honestly distinguished from a plain vocabulary SELECT, even though
        // it still grades as "pick the option that fills the blank."
        built = itemExerciseChallenge(ex, vmap, wordPools, "CLOZE");
      } else if (ex.type === "minimalPairChoice") {
        // A genuine two-candidate listening exercise: use the real
        // MINIMAL_PAIR_LISTENING engine instead of downgrading it, falling
        // back to the ordinary SELECT downgrade for the rare homograph case
        // minimalPairChallenge() declines to handle (see its comment).
        built = minimalPairChallenge(ex, vmap) || itemExerciseChallenge(ex, vmap, wordPools);
      } else {
        built = itemExerciseChallenge(ex, vmap, wordPools);
      }
      if (built) challenges.push(built);
    }

    if (challenges.length === 0) {
      throw new Error(`Lesson ${lesson.id} produced zero challenges`);
    }
    lessons.push({
      title: lesson.title,
      description: `${unit.englishTitle} · ${lesson.title}`,
      challenges,
    });
  }

  const quizChallenges = [];
  for (const q of unit.unitQuiz?.questions || []) {
    const built = quizChallenge(q, sentencePools);
    if (built) quizChallenges.push(built);
  }
  if (quizChallenges.length > 0) {
    lessons.push({
      title: `${unit.title}: Ulangkaji (Review Quiz)`,
      description: `End-of-unit review questions for ${unit.englishTitle}.`,
      challenges: quizChallenges,
    });
  }

  return {
    title: `${unit.title} (${unit.englishTitle})`,
    description: unit.lifeBenefit,
    lessons,
  };
}

const unitsByLevel = await loadUnits();

const courses = [];
for (const [level, meta] of Object.entries(LEVEL_META)) {
  const units = unitsByLevel.get(level);
  if (!units || units.length === 0) throw new Error(`No units found for level ${level}`);
  const levelWordPool = buildLevelWordPool(units);
  const levelSentencePool = buildLevelSentencePool(units);
  const courseUnits = units.map((unit) => convertUnit(unit, levelWordPool, levelSentencePool));
  courses.push({
    ...meta,
    language: "Malay",
    category: "Malay Courses",
    published: true,
    units: courseUnits,
  });
}

const totalUnits = courses.reduce((sum, c) => sum + c.units.length, 0);
const totalLessons = courses.reduce((sum, c) => sum + c.units.reduce((s, u) => s + u.lessons.length, 0), 0);
const totalChallenges = courses.reduce(
  (sum, c) => sum + c.units.reduce((s, u) => s + u.lessons.reduce((ls, l) => ls + l.challenges.length, 0), 0),
  0,
);

if (courses.length !== 5) throw new Error(`Expected 5 Malay CEFR courses, got ${courses.length}`);
if (totalUnits !== 46) throw new Error(`Expected 46 Malay units, got ${totalUnits}`);

const allChallenges = courses.flatMap((c) => c.units).flatMap((u) => u.lessons).flatMap((l) => l.challenges);
const badChallenges = allChallenges.filter((challenge) => {
  if (!challenge.question || challenge.question.trim().length === 0) return true;
  if (challenge.options.some((o) => o.audioText !== o.text)) return true;
  if (challenge.type === "REORDER") {
    // REORDER has no single "correct option" among distractors -- the whole
    // sequence is the answer, so every option is `correct: true` and there
    // must be at least two tokens for ordering to mean anything.
    return challenge.options.length < 2 || challenge.options.some((o) => !o.correct);
  }
  // Generated challenges always have 3 options; unitQuiz mcq/listening
  // questions carry through the source's own authored option count
  // (usually 4). The UI supports up to 6 options (optionLetters A-F).
  return challenge.options.length < 2
    || challenge.options.length > 6
    || challenge.options.filter((o) => o.correct).length !== 1;
});
if (badChallenges.length > 0) {
  throw new Error(`Every generated Malay challenge must have valid, speakable options and exactly one answer (${badChallenges.length} bad)`);
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(courses, null, 2)}\n`, "utf8");
console.log(
  `Generated ${courses.length} canonical Malay CEFR courses with ${totalUnits} units, ${totalLessons} lessons, and ${totalChallenges} challenges`,
);
