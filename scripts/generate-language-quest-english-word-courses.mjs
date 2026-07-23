import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import WordPOS from "wordpos";

const outputPath = path.resolve(process.cwd(), "curricula/language-quest/english-word-courses.generated.json");
const sourceCandidates = [
  process.env.ENGLISH_WORDS_ALPHA_PATH,
  path.resolve(process.cwd(), "curricula/sources/english-words/words_alpha.txt"),
  "/private/tmp/mrlc-english-words/words_alpha.txt",
].filter(Boolean);

const courseSpecs = [
  {
    code: "MRLC-ENGLISH-WORDS-EVERYDAY-V1",
    title: "Everyday English Word Quest",
    description: "Build practical vocabulary for school, home, food, feelings, actions, and places.",
    imageEmoji: "💬",
    accentColor: "#2563eb",
    units: [
      ["Daily Foundations", "Useful vocabulary for school, home, and meals.", [
        ["School", ["student", "teacher", "classroom", "lesson", "homework", "library", "pencil", "notebook", "question", "answer"]],
        ["Home", ["family", "parent", "child", "kitchen", "bedroom", "window", "garden", "breakfast", "dinner", "welcome"]],
        ["Food and Drink", ["apple", "banana", "bread", "rice", "water", "coffee", "vegetable", "hungry", "delicious", "recipe"]],
      ]],
      ["People on the Move", "Words for actions, emotions, and getting around.", [
        ["Actions", ["walk", "speak", "listen", "write", "carry", "open", "close", "begin", "finish", "choose"]],
        ["Feelings and Character", ["happy", "sad", "angry", "afraid", "excited", "tired", "calm", "proud", "kind", "brave"]],
        ["Around Town", ["hospital", "market", "station", "airport", "restaurant", "street", "bridge", "village", "journey", "ticket"]],
      ]],
    ],
  },
  {
    code: "MRLC-ENGLISH-WORDS-ACADEMIC-V1",
    title: "Academic English Word Quest",
    description: "Practise high-value words used in research, writing, science, mathematics, and society.",
    imageEmoji: "🎓",
    accentColor: "#7c3aed",
    units: [
      ["Study and Research", "Words for thinking, evidence, reading, and writing.", [
        ["Thinking Skills", ["analyze", "compare", "contrast", "evaluate", "explain", "infer", "interpret", "observe", "predict", "summarize"]],
        ["Evidence and Research", ["evidence", "research", "source", "data", "method", "result", "theory", "survey", "sample", "conclusion"]],
        ["Reading and Writing", ["argument", "paragraph", "sentence", "context", "quotation", "reference", "revise", "draft", "grammar", "vocabulary"]],
      ]],
      ["STEM and Society", "Academic vocabulary across technical and social subjects.", [
        ["Science", ["energy", "matter", "element", "organism", "climate", "environment", "experiment", "variable", "measure", "process"]],
        ["Mathematics", ["equation", "fraction", "decimal", "ratio", "average", "geometry", "calculate", "estimate", "sequence", "pattern"]],
        ["Society", ["culture", "community", "economy", "government", "justice", "migration", "population", "tradition", "citizen", "history"]],
      ]],
    ],
  },
  {
    code: "MRLC-ENGLISH-WORDS-POWER-V1",
    title: "English Word Power",
    description: "Strengthen advanced vocabulary for communication, problem-solving, change, and the wider world.",
    imageEmoji: "⚡",
    accentColor: "#059669",
    units: [
      ["Expression and Growth", "Words for character, communication, and positive change.", [
        ["Character", ["adaptable", "ambitious", "confident", "curious", "diligent", "generous", "honest", "patient", "reliable", "resilient"]],
        ["Communication", ["articulate", "clarify", "collaborate", "concise", "debate", "describe", "discuss", "persuade", "respond", "translate"]],
        ["Change", ["accelerate", "adapt", "develop", "emerge", "expand", "improve", "innovate", "reduce", "transform", "transition"]],
      ]],
      ["Solutions and the World", "Precise words for challenges, decisions, and global topics.", [
        ["Challenges and Solutions", ["complex", "conflict", "consequence", "obstacle", "pressure", "priority", "solution", "strategy", "succeed", "urgent"]],
        ["Precision", ["accurate", "approximate", "consistent", "distinct", "efficient", "essential", "flexible", "significant", "specific", "valid"]],
        ["Our World", ["ecosystem", "conservation", "democracy", "equality", "global", "infrastructure", "sustainable", "technology", "urban", "welfare"]],
      ]],
    ],
  },
];

const definitionOverrides = {
  answer: "a reply to a question or a solution to a problem",
  afraid: "feeling fear or worry",
  average: "a value found by adding numbers and dividing by how many there are",
  begin: "to start doing or being something",
  brave: "ready to face danger or difficulty with courage",
  bridge: "a structure carrying a path or road over an obstacle",
  calm: "peaceful and not excited, worried, or upset",
  carry: "to hold and move something from one place to another",
  close: "to shut an opening or bring something to an end",
  coffee: "a dark drink made from roasted beans",
  collaborate: "to work together toward a shared goal",
  conclusion: "a judgment or decision reached after reasoning",
  conflict: "a serious disagreement or struggle",
  conservation: "the protection of nature and careful use of resources",
  consequence: "a result or effect of an action",
  curious: "eager to know or learn something",
  decimal: "a number written with a point to show a fraction of ten",
  delicious: "having a very pleasant taste or smell",
  develop: "to grow or change into a more advanced form",
  element: "a pure substance made from one kind of atom",
  energy: "the ability to do work or cause change",
  excited: "very enthusiastic and eager",
  experiment: "a scientific test used to discover or demonstrate something",
  finish: "to complete something or reach its end",
  fraction: "a number representing part of a whole",
  garden: "a piece of land where flowers, fruit, or vegetables are grown",
  hungry: "needing or wanting food",
  improve: "to make or become better",
  infer: "to reach a conclusion from evidence and reasoning",
  infrastructure: "the basic systems and structures a society or organization needs",
  innovate: "to introduce new ideas or methods",
  interpret: "to explain or understand the meaning of something",
  kind: "friendly, generous, and considerate toward others",
  market: "a place where people buy and sell goods",
  matter: "physical substance from which things are made",
  measure: "to find the size, amount, or degree of something",
  observe: "to notice or watch something carefully",
  open: "to move something so that it is no longer closed",
  parent: "a mother, father, or person who cares for a child",
  pattern: "a repeated or regular arrangement",
  predict: "to say what is likely to happen in the future",
  pressure: "a difficult demand or feeling of urgency",
  priority: "something considered more important than other things",
  process: "a series of actions that produces a result",
  question: "a sentence or request that asks for information",
  reduce: "to make something smaller or less",
  reference: "a source used to find or support information",
  respond: "to reply or react to something",
  source: "the place, person, or thing from which information comes",
  sample: "a small part chosen to represent a larger whole",
  result: "the outcome produced by an action or event",
  draft: "an early version of a piece of writing",
  sequence: "a set of things arranged in a particular order",
  solution: "an answer to a problem or difficult situation",
  speak: "to use your voice to say words",
  station: "a place where trains or buses regularly stop",
  strategy: "a carefully planned method for achieving a goal",
  summarize: "to give the main points in a shorter form",
  sustainable: "able to continue without using up resources or harming the environment",
  technology: "scientific knowledge and tools used to solve practical problems",
  tired: "in need of rest or sleep",
  transform: "to change greatly in form, appearance, or character",
  variable: "a factor that can change or be changed",
  water: "a clear liquid that people, animals, and plants need to live",
  welcome: "received with pleasure or friendly approval",
  welfare: "the health, happiness, and safety of a person or group",
  write: "to form words or symbols on a surface",
  culture: "the shared ideas, customs, and arts of a group",
  history: "the study or record of past events",
  global: "relating to the whole world",
  valid: "based on sound reasoning or officially acceptable",
};

const wordpos = new WordPOS({ stopwords: false });

function lookup(word) {
  return new Promise((resolve) => wordpos.lookup(word, resolve));
}

function chooseDefinition(word, rows) {
  if (definitionOverrides[word]) return definitionOverrides[word];
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wordPattern = new RegExp(`\\b${escaped}\\b`, "i");
  const candidates = (rows || [])
    .filter((row) => typeof row?.def === "string" && row.def.trim())
    .map((row, index) => {
      const definition = row.def.replace(/\s+/g, " ").trim();
      const lemma = String(row.lemma || "").replace(/_/g, " ").toLowerCase();
      let score = lemma === word ? 100 : 0;
      if (!wordPattern.test(definition)) score += 30;
      if (!definition.startsWith("(")) score += 10;
      if (definition.length >= 20 && definition.length <= 150) score += 10;
      score -= index;
      return { definition, score };
    })
    .sort((a, b) => b.score - a.score || a.definition.length - b.definition.length);
  if (!candidates.length) throw new Error(`WordNet has no definition for “${word}”`);
  return candidates[0].definition.replace(/[.;]+$/, "");
}

async function findSourceWords() {
  for (const candidate of sourceCandidates) {
    try {
      await access(candidate);
      const contents = await readFile(candidate, "utf8");
      return { path: candidate, words: new Set(contents.split(/\r?\n/).map((word) => word.trim()).filter(Boolean)) };
    } catch {
      // Try the next configured source location.
    }
  }
  return null;
}

const selectedWords = [...new Set(courseSpecs.flatMap((course) => course.units.flatMap((unit) => unit[2].flatMap((lesson) => lesson[1]))))];
const source = await findSourceWords();
if (source) {
  const missing = selectedWords.filter((word) => !source.words.has(word));
  if (missing.length) throw new Error(`Words missing from dwyl/english-words: ${missing.join(", ")}`);
} else {
  console.warn("dwyl/english-words source not found; generating from the already validated selection");
}

const definitions = new Map();
await Promise.all(selectedWords.map(async (word) => definitions.set(word, chooseDefinition(word, await lookup(word)))));

function createChallenge(words, word, index) {
  const distractors = [];
  for (let step = 1; distractors.length < 2; step += 1) {
    const candidate = words[(index + step) % words.length];
    if (candidate !== word && !distractors.includes(candidate)) distractors.push(candidate);
  }
  const options = distractors.map((text) => ({ text, correct: false, emoji: null, audioText: text }));
  options.splice(index % 3, 0, { text: word, correct: true, emoji: null, audioText: word });
  return {
    type: index % 4 === 3 ? "ASSIST" : "SELECT",
    question: `Which word means “${definitions.get(word)}”?`,
    options,
  };
}

const courses = courseSpecs.map((course) => ({
  code: course.code,
  title: course.title,
  description: course.description,
  language: "English",
  imageEmoji: course.imageEmoji,
  accentColor: course.accentColor,
  published: true,
  units: course.units.map(([title, description, lessons]) => ({
    title,
    description,
    lessons: lessons.map(([lessonTitle, words]) => ({
      title: lessonTitle,
      description: `Learn ${words.length} English words through definitions, choices, and speech.`,
      challenges: words.map((word, index) => createChallenge(words, word, index)),
    })),
  })),
}));

const challenges = courses.flatMap((course) => course.units.flatMap((unit) => unit.lessons.flatMap((lesson) => lesson.challenges)));
if (courses.length !== 3 || selectedWords.length !== 180 || challenges.length !== 180) {
  throw new Error(`Expected 3 courses and 180 unique challenges; generated ${courses.length} courses, ${selectedWords.length} words, and ${challenges.length} challenges`);
}
if (challenges.some((challenge) => challenge.options.length !== 3 || challenge.options.filter((option) => option.correct).length !== 1)) {
  throw new Error("Every generated word challenge must have three choices and exactly one answer");
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(courses, null, 2)}\n`, "utf8");
console.log(`Generated ${courses.length} English word courses with ${selectedWords.length} validated words${source ? ` from ${source.path}` : ""}`);
