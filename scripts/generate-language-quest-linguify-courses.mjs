import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

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
  return {
    type: index % 4 === 3 ? "ASSIST" : "SELECT",
    question: `Which ${grammarLabel} means “${entry.definition}”?${pronunciation}${example}`,
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

const courses = Object.entries(courseMetadata).map(([level, metadata]) => {
  const sets = snapshot.sets.filter((set) => set.level === level);
  if (sets.length !== 3) {
    throw new Error(`${level} must contain exactly three vocabulary sets`);
  }
  return {
    ...metadata,
    language: "English",
    published: true,
    units: sets.map((set) => {
      if (!Array.isArray(set.words) || set.words.length !== 20) {
        throw new Error(`${set.id} must contain exactly 20 words`);
      }
      return {
        title: `${set.icon || "📚"} ${set.name}`,
        description: set.description,
        lessons: [0, 1].map((lessonIndex) => {
          const words = set.words.slice(lessonIndex * 10, lessonIndex * 10 + 10);
          const start = lessonIndex * 10 + 1;
          return {
            title: `${set.name.replace(new RegExp(`^${level}\\s+`), "")}: Words ${start}-${start + 9}`,
            description: "Learn ten words through definitions, examples, listening, source-supplied pronunciation, and multiple-choice practice.",
            challenges: words.map((entry, index) => challengeFor(words, entry, index)),
          };
        }),
      };
    }),
  };
});

const units = courses.flatMap((course) => course.units);
const lessons = units.flatMap((unit) => unit.lessons);
const challenges = lessons.flatMap((lesson) => lesson.challenges);
if (courses.length !== 6 || units.length !== 18 || lessons.length !== 36 || challenges.length !== 360) {
  throw new Error("Linguify course generation produced the wrong curriculum size");
}
if (challenges.some(
  (challenge) =>
    challenge.options.length !== 3
    || challenge.options.filter((option) => option.correct).length !== 1
    || challenge.options.some((option) => option.audioText !== option.text),
)) {
  throw new Error("Every Linguify challenge must have three speakable options and exactly one answer");
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(courses, null, 2)}\n`, "utf8");
console.log(
  `Generated ${courses.length} Linguify CEFR courses with ${units.length} units and ${challenges.length} vocabulary challenges`,
);
