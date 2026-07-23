import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import WordPOS from "wordpos";

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

const definitions = new Map();
await Promise.all(selection.map(async ({ word }) => definitions.set(word, chooseDefinition(word, await lookup(word)))));

function createChallenge(words, entry, index) {
  const distractors = [];
  for (let step = 1; distractors.length < 2; step += 1) {
    const candidate = words[(index + step) % words.length].word;
    if (candidate !== entry.word && !distractors.includes(candidate)) distractors.push(candidate);
  }
  const options = distractors.map((text) => ({ text, correct: false, emoji: null, audioText: text }));
  options.splice(index % 3, 0, { text: entry.word, correct: true, emoji: null, audioText: entry.word });
  return {
    type: index % 4 === 3 ? "ASSIST" : "SELECT",
    question: `Which advanced word means “${definitions.get(entry.word)}”?`,
    options,
  };
}

const courseMetadata = [
  ["MRLC-ADVANCED-ENGLISH-CORE-V1", "Advanced English: Core", "High-value advanced words that appear across many respected vocabulary lists.", "🧠", "#0f766e"],
  ["MRLC-ADVANCED-ENGLISH-MASTERY-V1", "Advanced English: Mastery", "A deeper ranked vocabulary path for precise reading, writing, and discussion.", "📘", "#1d4ed8"],
  ["MRLC-ADVANCED-ENGLISH-EXPERT-V1", "Advanced English: Expert", "Challenging, lower-frequency words for ambitious readers and exam preparation.", "🏆", "#9333ea"],
];

const courses = courseMetadata.map(([code, title, description, imageEmoji, accentColor], courseIndex) => {
  const courseWords = selection.slice(courseIndex * COURSE_SIZE, (courseIndex + 1) * COURSE_SIZE);
  return {
    code,
    title,
    description,
    language: "English",
    imageEmoji,
    accentColor,
    published: true,
    units: [0, 1].map((unitIndex) => {
      const unitWords = courseWords.slice(unitIndex * 30, unitIndex * 30 + 30);
      return {
        title: unitIndex === 0 ? "Build Your Range" : "Deepen Your Mastery",
        description: `Ranked advanced words ${courseIndex * COURSE_SIZE + unitIndex * 30 + 1}–${courseIndex * COURSE_SIZE + unitIndex * 30 + 30}.`,
        lessons: [0, 1, 2].map((lessonIndex) => {
          const lessonWords = unitWords.slice(lessonIndex * 10, lessonIndex * 10 + 10);
          const firstRank = courseIndex * COURSE_SIZE + unitIndex * 30 + lessonIndex * 10 + 1;
          return {
            title: `Word Set ${firstRank}–${firstRank + 9}`,
            description: "Learn ten ranked advanced words through definitions, choices, and pronunciation.",
            challenges: lessonWords.map((entry, index) => createChallenge(lessonWords, entry, index)),
          };
        }),
      };
    }),
  };
});

const challenges = courses.flatMap((course) => course.units.flatMap((unit) => unit.lessons.flatMap((lesson) => lesson.challenges)));
if (courses.length !== 3 || challenges.length !== TARGET_WORDS) throw new Error("Advanced course generation produced the wrong curriculum size");
if (challenges.some((challenge) => challenge.options.length !== 3 || challenge.options.filter((option) => option.correct).length !== 1)) {
  throw new Error("Every advanced challenge must have three options and exactly one answer");
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(courses, null, 2)}\n`, "utf8");
console.log(`Generated ${courses.length} advanced English courses with ${challenges.length} ranked words${upstreamPath ? ` from ${upstreamPath}` : " from the validated snapshot"}`);
