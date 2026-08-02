import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import WordPOS from "wordpos";
import { blankWord, buildOddOneOut, option, tokenizeWords } from "./lib/language-quest-practice-helpers.mjs";

const outputPath = path.resolve(process.cwd(), "curricula/language-quest/advanced-english-courses.generated.json");
const snapshotPath = path.resolve(process.cwd(), "curricula/sources/advanced-english-vocabulary/ranked-selection.generated.json");
const upstreamCandidates = [
  process.env.ADVANCED_ENGLISH_VOCAB_PATH,
  "/private/tmp/mrlc-advanced-english-vocabulary/output/9ormore-withfreqandlistcount-413.csv",
].filter(Boolean);
const COURSE_SIZE = 60;
const TARGET_WORDS = 180;
const wordpos = new WordPOS({ stopwords: false });

const definitionOverrides = {
  abatement: "a reduction in amount, degree, or intensity",
  aberration: "a departure from what is normal, expected, or usual",
  absolve: "to free someone from blame, guilt, or responsibility",
  acumen: "the ability to make quick, accurate judgments",
  amalgamation: "the process of combining two or more things into one",
  austerity: "strict economy and reduced spending, often during difficult times",
  belligerent: "hostile, aggressive, and ready to fight",
  bolster: "to support, strengthen, or improve something",
  capitulation: "the act of surrendering or accepting an opponent's terms",
  caustic: "sharply critical, sarcastic, or capable of burning",
  dichotomy: "a division into two sharply contrasting parts",
  dissemination: "the spreading of information or ideas to many people",
  forbearance: "patient self-control and tolerance",
  foment: "to encourage or stir up trouble, conflict, or rebellion",
  impervious: "not allowing something to pass through or have an effect",
  inexorably: "in a way that cannot be stopped or prevented",
  intractable: "difficult to control, manage, or solve",
  meretricious: "attractive in a flashy but false or low-quality way",
  mercurial: "changing mood or behavior quickly and unpredictably",
  mundane: "ordinary, routine, and lacking excitement",
  oblique: "indirect, slanting, or not expressed straightforwardly",
  obstinate: "stubbornly refusing to change an opinion or course of action",
  paradigm: "a typical example, model, or way of understanding something",
  placid: "calm, peaceful, and not easily disturbed",
  polemic: "a strong written or spoken attack on an idea or person",
  pragmatic: "focused on practical results rather than theory",
  precursor: "a person or thing that comes before and signals another",
  revere: "to feel deep respect and admiration for someone or something",
  salient: "most noticeable, important, or relevant",
  surreptitiously: "secretly, especially to avoid being noticed",
  tangential: "only slightly connected to the main subject",
  tenuous: "very weak, slight, or uncertain",
  volatile: "likely to change suddenly or become dangerous",
  wanton: "deliberate, reckless, and without reasonable cause",
  zenith: "the highest or most successful point",
};

function lookup(word) {
  return new Promise((resolve) => wordpos.lookup(word, resolve));
}

function normalizeLemma(value) {
  return String(value || "").replace(/_/g, " ").toLowerCase();
}

function chooseDefinition(word, rows) {
  if (definitionOverrides[word]) return definitionOverrides[word];
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wordPattern = new RegExp(`\\b${escaped}\\b`, "i");
  const candidates = (rows || [])
    .filter((row) => normalizeLemma(row?.lemma) === word && typeof row?.def === "string" && row.def.trim())
    .map((row, index) => {
      const definition = row.def.replace(/\s+/g, " ").trim().replace(/[.;]+$/, "");
      let score = 100 - index;
      if (!wordPattern.test(definition)) score += 30;
      if (!definition.startsWith("(")) score += 10;
      if (definition.length >= 20 && definition.length <= 170) score += 10;
      return { definition, score };
    })
    .sort((a, b) => b.score - a.score || a.definition.length - b.definition.length);
  if (!candidates.length) throw new Error(`No exact WordNet definition found for “${word}”`);
  return candidates[0].definition;
}

async function findUpstream() {
  for (const candidate of upstreamCandidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next configured source location.
    }
  }
  return null;
}

async function createSelection(upstreamPath) {
  const rows = (await readFile(upstreamPath, "utf8"))
    .split(/\r?\n/)
    .map((line) => {
      const [word, zipf, sourceCount] = line.trim().split("\t");
      return { word, zipf: Number(zipf), sourceCount: Number(sourceCount) };
    })
    .filter((row) => /^[a-z]{5,16}$/.test(row.word || "") && Number.isFinite(row.zipf) && row.sourceCount >= 9 && row.word !== "quixote");

  const selection = [];
  for (const row of rows) {
    const definitions = await lookup(row.word);
    if (!definitions.some((definition) => normalizeLemma(definition?.lemma) === row.word && String(definition?.def || "").trim())) continue;
    selection.push(row);
    if (selection.length === TARGET_WORDS) break;
  }
  if (selection.length !== TARGET_WORDS) throw new Error(`Expected ${TARGET_WORDS} eligible advanced words, found ${selection.length}`);
  return selection;
}

const upstreamPath = await findUpstream();
let selection;
if (upstreamPath) {
  selection = await createSelection(upstreamPath);
  await mkdir(path.dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify({
    source: "https://github.com/Isomorpheuss/advanced-english-vocabulary",
    commit: "7d1bfdb",
    sourceFile: "output/9ormore-withfreqandlistcount-413.csv",
    words: selection,
  }, null, 2)}\n`, "utf8");
} else {
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
  selection = snapshot.words;
}

// Finds a real WordNet usage phrase that actually contains the target word,
// mirroring the curated-override pattern in
// generate-language-quest-english-word-courses.mjs -- but returns null
// instead of throwing, since this corpus (unlike the curated word list) has
// no hand-authored fallback for the words WordNet doesn't have a matching
// example for.
function chooseUsageExample(word, rows) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wordPattern = new RegExp(`\\b${escaped}\\b`, "i");
  const candidates = (rows || [])
    .flatMap((row) => (Array.isArray(row?.exp) ? row.exp : []))
    .filter((example) => typeof example === "string" && wordPattern.test(example))
    .map((example) => {
      const compact = example.replace(/\s+/g, " ").trim();
      const sentence = `${compact.charAt(0).toUpperCase()}${compact.slice(1)}`;
      return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
    })
    .filter((example) => example.length >= 12 && example.length <= 180);
  if (!candidates.length) return null;
  return candidates.sort((a, b) => Math.abs(a.length - 72) - Math.abs(b.length - 72))[0];
}

const definitions = new Map();
const usageExamples = new Map();
await Promise.all(selection.map(async ({ word }) => {
  const rows = await lookup(word);
  definitions.set(word, chooseDefinition(word, rows));
  usageExamples.set(word, chooseUsageExample(word, rows));
}));

// Cycles every word through all four single-answer challenge types so a
// lesson exercises translation recall (SELECT/ASSIST), a real usage example
// when WordNet has one (CLOZE), and a grammar-flavoured completion
// (GRAMMAR_TRANSFORM) -- all four reuse the exact same validated
// word/distractor options, so this only changes question framing, never
// correctness.
function createChallenge(words, entry, index) {
  const distractors = [];
  for (let step = 1; distractors.length < 2; step += 1) {
    const candidate = words[(index + step) % words.length].word;
    if (candidate !== entry.word && !distractors.includes(candidate)) distractors.push(candidate);
  }
  const options = distractors.map((text) => ({ text, correct: false, emoji: null, audioText: text }));
  options.splice(index % 3, 0, { text: entry.word, correct: true, emoji: null, audioText: entry.word });
  const definition = definitions.get(entry.word);
  const usageExample = usageExamples.get(entry.word);
  const explanation = `“${entry.word}” means ${definition}.${usageExample ? ` Example: “${usageExample}”` : ""}`;
  const blanked = usageExample ? blankWord(usageExample, entry.word) : null;
  switch (index % 5) {
    case 0:
    case 1:
      return { type: "SELECT", question: `Which advanced word means “${definition}”?`, explanation, options };
    case 2:
      return { type: "ASSIST", question: `Which advanced word means “${definition}”?`, explanation, options };
    case 3:
      if (blanked) return { type: "CLOZE", question: `Complete the sentence: “${blanked}”`, explanation, options };
      return { type: "CLOZE", question: `Fill in the blank: “_____” means “${definition}.”`, explanation, options };
    default:
      if (blanked) return { type: "GRAMMAR_TRANSFORM", question: `Choose the word that correctly completes this sentence: “${blanked}”`, explanation, options };
      return { type: "GRAMMAR_TRANSFORM", question: `Choose the word that correctly fits: “_____” means “${definition}.”`, explanation, options };
  }
}

// Pairs the first 4 words of a lesson with their definitions into one
// MATCHING challenge (2 tiles per pair, positionally paired -- see
// matchingChallengeIsCorrect in shared/languageQuest.ts).
function matchingChallenge(lessonWords) {
  const pairs = lessonWords.slice(0, 4).map((entry) => ({ word: entry.word, definition: definitions.get(entry.word) }));
  const options = [];
  for (const pair of pairs) {
    options.push({ text: pair.word, correct: true, emoji: null, audioText: pair.word });
    options.push({ text: pair.definition, correct: true, emoji: null, audioText: pair.definition });
  }
  return {
    type: "MATCHING",
    question: "Match each advanced word to its definition.",
    explanation: pairs.map((pair) => `“${pair.word}” means ${pair.definition}.`).join(" "),
    options,
  };
}

const courseMetadata = [
  ["MRLC-ADVANCED-ENGLISH-CORE-V1", "Advanced English: Core", "High-value advanced words that appear across many respected vocabulary lists.", "🧠", "#0f766e"],
  ["MRLC-ADVANCED-ENGLISH-MASTERY-V1", "Advanced English: Mastery", "A deeper ranked vocabulary path for precise reading, writing, and discussion.", "📘", "#1d4ed8"],
  ["MRLC-ADVANCED-ENGLISH-EXPERT-V1", "Advanced English: Expert", "Challenging, lower-frequency words for ambitious readers and exam preparation.", "🏆", "#9333ea"],
];

// Precomputes every lesson's word slice up front (in the same order the
// course/unit/lesson loops below produce them) so each lesson's extra
// ODD_ONE_OUT/REORDER challenges can safely borrow a "ringer" word from the
// very next lesson -- guaranteed to exist and guaranteed distinct, since
// every lesson draws from its own disjoint slice of the ranked word list.
const lessonPlans = [];
for (let courseIndex = 0; courseIndex < courseMetadata.length; courseIndex += 1) {
  const courseWords = selection.slice(courseIndex * COURSE_SIZE, (courseIndex + 1) * COURSE_SIZE);
  for (const unitIndex of [0, 1]) {
    const unitWords = courseWords.slice(unitIndex * 30, unitIndex * 30 + 30);
    for (const lessonIndex of [0, 1, 2]) {
      lessonPlans.push({ lessonWords: unitWords.slice(lessonIndex * 10, lessonIndex * 10 + 10) });
    }
  }
}

function lessonExtras(planIndex) {
  const { lessonWords } = lessonPlans[planIndex];
  const nextWords = lessonPlans[(planIndex + 1) % lessonPlans.length].lessonWords;
  const extras = [];

  const inGroup = lessonWords.slice(0, 3).map((entry) => entry.word);
  const oddWord = nextWords[0].word;
  const oddOneOut = buildOddOneOut(
    "Which word does not belong with the others in this word set?",
    inGroup,
    oddWord,
    `“${oddWord}” belongs to a different word set; the rest of this set is ${inGroup.map((word) => `“${word}”`).join(", ")}.`,
  );
  if (oddOneOut) extras.push(oddOneOut);

  let bestDefinition = null;
  for (const entry of lessonWords) {
    const tokens = tokenizeWords(definitions.get(entry.word));
    if (tokens && (!bestDefinition || tokens.length > bestDefinition.tokens.length)) {
      bestDefinition = { word: entry.word, tokens };
    }
  }
  if (bestDefinition) {
    extras.push({
      type: "REORDER",
      question: `Put the words of this definition of “${bestDefinition.word}” back in the correct order.`,
      options: bestDefinition.tokens.map((token) => option(token, true)),
    });
  }

  return extras;
}

let planIndex = 0;
const courses = courseMetadata.map(([code, title, description, imageEmoji, accentColor], courseIndex) => ({
  code,
  title,
  description,
  language: "English",
  imageEmoji,
  accentColor,
  published: true,
  units: [0, 1].map((unitIndex) => ({
    title: unitIndex === 0 ? "Build Your Range" : "Deepen Your Mastery",
    description: `Ranked advanced words ${courseIndex * COURSE_SIZE + unitIndex * 30 + 1}–${courseIndex * COURSE_SIZE + unitIndex * 30 + 30}.`,
    lessons: [0, 1, 2].map((lessonIndex) => {
      const { lessonWords } = lessonPlans[planIndex];
      const firstRank = courseIndex * COURSE_SIZE + unitIndex * 30 + lessonIndex * 10 + 1;
      const extras = lessonExtras(planIndex);
      planIndex += 1;
      return {
        title: `Word Set ${firstRank}–${firstRank + 9}`,
        description: "Learn ten ranked advanced words through definitions, sentence completion, grammar, ordering, and matching review.",
        challenges: [...lessonWords.map((entry, index) => createChallenge(lessonWords, entry, index)), ...extras, matchingChallenge(lessonWords)],
      };
    }),
  })),
}));

const allChallenges = courses.flatMap((course) => course.units.flatMap((unit) => unit.lessons.flatMap((lesson) => lesson.challenges)));
const lessonCount = courses.flatMap((course) => course.units.flatMap((unit) => unit.lessons)).length;
const matchingChallenges = allChallenges.filter((challenge) => challenge.type === "MATCHING");
const reorderChallenges = allChallenges.filter((challenge) => challenge.type === "REORDER");
const oddOneOutChallenges = allChallenges.filter((challenge) => challenge.type === "ODD_ONE_OUT");
const challenges = allChallenges.filter((challenge) => !["MATCHING", "REORDER", "ODD_ONE_OUT"].includes(challenge.type));
if (courses.length !== 3 || challenges.length !== TARGET_WORDS) throw new Error("Advanced course generation produced the wrong curriculum size");
if (challenges.some((challenge) => challenge.options.length !== 3 || challenge.options.filter((opt) => opt.correct).length !== 1)) {
  throw new Error("Every advanced challenge must have three options and exactly one answer");
}
{
  const typeCounts = new Map();
  for (const challenge of challenges) typeCounts.set(challenge.type, (typeCounts.get(challenge.type) || 0) + 1);
  for (const requiredType of ["SELECT", "ASSIST", "CLOZE", "GRAMMAR_TRANSFORM"]) {
    if (!typeCounts.get(requiredType)) throw new Error(`Generated advanced English course is missing ${requiredType} challenges`);
  }
}
if (reorderChallenges.length !== lessonCount) {
  throw new Error(`Expected one REORDER challenge per lesson (${lessonCount}), found ${reorderChallenges.length}`);
}
if (reorderChallenges.some((challenge) => challenge.options.length < 2 || challenge.options.some((opt) => !opt.correct))) {
  throw new Error("Every REORDER challenge must have at least two tokens, all marked correct");
}
if (oddOneOutChallenges.length !== lessonCount) {
  throw new Error(`Expected one ODD_ONE_OUT challenge per lesson (${lessonCount}), found ${oddOneOutChallenges.length}`);
}
if (oddOneOutChallenges.some((challenge) => challenge.options.length !== 4 || challenge.options.filter((opt) => opt.correct).length !== 1)) {
  throw new Error("Every ODD_ONE_OUT challenge must have four options and exactly one odd-one-out answer");
}
if (matchingChallenges.length !== lessonCount) {
  throw new Error(`Expected one MATCHING challenge per lesson (${lessonCount}), found ${matchingChallenges.length}`);
}
if (matchingChallenges.some((challenge) => challenge.options.length !== 8 || challenge.options.some((option) => !option.correct))) {
  throw new Error("Every generated MATCHING challenge must have 4 pairs (8 tiles), all marked correct");
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(courses, null, 2)}\n`, "utf8");
console.log(`Generated ${courses.length} advanced English courses with ${challenges.length} ranked words${upstreamPath ? ` from ${upstreamPath}` : " from the validated snapshot"}`);
