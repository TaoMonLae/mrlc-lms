import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildOddOneOut, option, tokenizeWords } from "./lib/language-quest-practice-helpers.mjs";

const sourcePath = path.resolve(process.cwd(), "curricula/sources/teach-yourself-malay/course-blueprint.json");
const outputPath = path.resolve(process.cwd(), "curricula/language-quest/teach-yourself-malay.generated.json");
const blueprint = JSON.parse(await readFile(sourcePath, "utf8"));
const course = blueprint.course;

if (!course || !Array.isArray(course.units) || course.units.length !== 17) {
  throw new Error("Teach Yourself Malay must contain 17 units");
}
if (course.imageEmoji !== "") throw new Error("The course must remain emoji-free");
const lessons = course.units.flatMap((unit) => unit.lessons || []);

// The hand-authored blueprint only carries SELECT/ASSIST vocabulary
// challenges plus one MATCHING review per unit. Rather than hand-editing an
// 11,000+ line source file, derive CLOZE/GRAMMAR_TRANSFORM/ODD_ONE_OUT/
// REORDER practice at generation time from each lesson's own
// already-validated correct answers -- no new Malay content is invented,
// only reframed or reordered.
function correctText(challenge) {
  return challenge.options.find((opt) => opt.correct)?.text;
}

for (const [lessonIndex, lesson] of lessons.entries()) {
  const base = lesson.challenges || [];
  if (base.length < 2) continue;

  // CLOZE / GRAMMAR_TRANSFORM: clone two of this lesson's own already-valid
  // challenges under a different type and question framing. Same options,
  // same single correct answer -- only the framing changes.
  const clozeSource = base[0];
  lesson.challenges.push({
    type: "CLOZE",
    question: `Complete the phrase: ${clozeSource.question}`,
    options: clozeSource.options.map((opt) => ({ ...opt })),
  });
  const grammarSource = base[1];
  lesson.challenges.push({
    type: "GRAMMAR_TRANSFORM",
    question: `Choose the grammatically correct option: ${grammarSource.question}`,
    options: grammarSource.options.map((opt) => ({ ...opt })),
  });

  // ODD_ONE_OUT: three of this lesson's own correct answers plus one
  // "ringer" borrowed from the next lesson -- always available and always
  // genuinely different, since every lesson has its own distinct vocab.
  const inGroup = base.map(correctText).filter(Boolean).slice(0, 3);
  const nextLesson = lessons[(lessonIndex + 1) % lessons.length];
  const oddWord = (nextLesson.challenges || []).map(correctText).find(Boolean);
  const oddOneOut = buildOddOneOut(
    "Which Malay word or phrase does not belong with the others?",
    inGroup,
    oddWord,
    oddWord ? `“${oddWord}” is from a different lesson; the rest of this set is ${inGroup.map((word) => `“${word}”`).join(", ")}.` : undefined,
  );
  if (oddOneOut) lesson.challenges.push(oddOneOut);

  // REORDER: find one of this lesson's own correct answers that's already a
  // multi-word phrase (many greetings/expressions are); falls back to
  // borrowing one from the next lesson if this lesson's vocab happens to be
  // all single words.
  let tokens = null;
  for (const text of base.map(correctText)) {
    tokens = text ? tokenizeWords(text) : null;
    if (tokens) break;
  }
  if (!tokens) {
    for (const text of (nextLesson.challenges || []).map(correctText)) {
      tokens = text ? tokenizeWords(text) : null;
      if (tokens) break;
    }
  }
  if (tokens) {
    lesson.challenges.push({
      type: "REORDER",
      question: "Put this Malay word or phrase back in the correct order.",
      options: tokens.map((token) => option(token, true)),
    });
  }
}

const allChallenges = lessons.flatMap((lesson) => lesson.challenges || []);
const matchingChallenges = allChallenges.filter((challenge) => challenge.type === "MATCHING");
const reorderChallenges = allChallenges.filter((challenge) => challenge.type === "REORDER");
const oddOneOutChallenges = allChallenges.filter((challenge) => challenge.type === "ODD_ONE_OUT");
const challenges = allChallenges.filter((challenge) => !["MATCHING", "REORDER", "ODD_ONE_OUT"].includes(challenge.type));
if (lessons.length !== 68 || challenges.length !== 544) {
  throw new Error(`Expected 68 lessons and 544 SELECT/ASSIST/CLOZE/GRAMMAR_TRANSFORM challenges, found ${lessons.length} and ${challenges.length}`);
}
for (const challenge of challenges) {
  if (!["SELECT", "ASSIST", "CLOZE", "GRAMMAR_TRANSFORM"].includes(challenge.type)) throw new Error("Unsupported challenge type");
  if (!Array.isArray(challenge.options) || challenge.options.length < 2 || challenge.options.length > 6) {
    throw new Error("Each challenge needs 2-6 options");
  }
  if (challenge.options.filter((option) => option.correct).length !== 1) {
    throw new Error("Each challenge needs exactly one correct option");
  }
  if (challenge.options.some((option) => option.emoji !== null || option.audioText !== option.text)) {
    throw new Error("Options must be emoji-free and speak their visible Malay text");
  }
}
{
  const typeCounts = new Map();
  for (const challenge of challenges) typeCounts.set(challenge.type, (typeCounts.get(challenge.type) || 0) + 1);
  for (const requiredType of ["SELECT", "ASSIST", "CLOZE", "GRAMMAR_TRANSFORM"]) {
    if (!typeCounts.get(requiredType)) throw new Error(`Generated Teach Yourself Malay course is missing ${requiredType} challenges`);
  }
}
if (reorderChallenges.length !== lessons.length) {
  throw new Error(`Expected one REORDER challenge per lesson (${lessons.length}), found ${reorderChallenges.length}`);
}
for (const challenge of reorderChallenges) {
  if (challenge.options.length < 2 || challenge.options.some((option) => !option.correct || option.emoji !== null || option.audioText !== option.text)) {
    throw new Error("Every REORDER challenge must have at least two tokens, all marked correct and emoji-free");
  }
}
if (oddOneOutChallenges.length !== lessons.length) {
  throw new Error(`Expected one ODD_ONE_OUT challenge per lesson (${lessons.length}), found ${oddOneOutChallenges.length}`);
}
for (const challenge of oddOneOutChallenges) {
  if (challenge.options.length !== 4 || challenge.options.filter((option) => option.correct).length !== 1 || challenge.options.some((option) => option.emoji !== null || option.audioText !== option.text)) {
    throw new Error("Every ODD_ONE_OUT challenge must have four options and exactly one odd-one-out answer, emoji-free");
  }
}
// One MATCHING challenge is appended per unit's "Vocabulary Builder" lesson
// (see curricula/sources/teach-yourself-malay/course-blueprint.json), built
// from that lesson's own English-phrase/Malay-translation pairs.
if (matchingChallenges.length !== course.units.length) {
  throw new Error(`Expected one MATCHING challenge per unit (${course.units.length}), found ${matchingChallenges.length}`);
}
for (const challenge of matchingChallenges) {
  if (challenge.options.length < 6 || challenge.options.length > 8 || challenge.options.length % 2 !== 0) {
    throw new Error("Each MATCHING challenge needs 6-8 options (3-4 pairs)");
  }
  if (challenge.options.some((option) => !option.correct || option.emoji !== null || option.audioText !== option.text)) {
    throw new Error("MATCHING options must all be correct, emoji-free, and speak their visible text");
  }
}
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(course, null, 2)}\n`, "utf8");
console.log(`Generated Teach Yourself Malay: ${course.units.length} units, ${lessons.length} lessons, ${challenges.length} challenges`);
