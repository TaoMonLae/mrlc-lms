import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const sourcePath = path.resolve(process.cwd(), "duolingo-chinese.md");
const outputPath = path.resolve(process.cwd(), "curricula/language-quest/mandarin-complete.generated.json");
const MAX_CHALLENGES_PER_LESSON = 50;

const unitMetadata = [
  ["Foundations", "Greetings, numbers, food, phrases, and first locations."],
  ["People, Time and Routine", "Family, people, time, hobbies, routines, and restaurants."],
  ["Everyday Life", "Shopping, dining, health, transportation, languages, and sports."],
  ["Health, Social Life and Travel", "Invitations, body parts, travel, weather, and shopping."],
  ["People, School and Daily Life", "People, celebrations, school, family, places, and food."],
  ["Communication and Work", "Language, personality, education, the future, environment, and work."],
  ["Culture, Travel and Modern Life", "Culture, hobbies, travel, home, festivals, slang, and business."],
];

function parseCourse(markdown) {
  const skills = [];
  let current = null;

  for (const line of markdown.split(/\r?\n/)) {
    const nameMatch = line.match(/^SKILL NAME:\s*(.+)$/);
    if (nameMatch) {
      current = { name: nameMatch[1].trim(), id: "", pairs: [] };
      skills.push(current);
      continue;
    }

    const idMatch = line.match(/^SKILL ID:\s*(.+)$/);
    if (idMatch && current) {
      current.id = idMatch[1].trim();
      continue;
    }

    const pairMatch = line.match(/^en=\s*(.*?)(?:,\s*)?\s+ch=\s*(.*)$/);
    if (pairMatch && current) {
      const english = pairMatch[1].trim();
      const chinese = pairMatch[2].trim();
      if (english && chinese) current.pairs.push({ english, chinese });
    }
  }

  return skills;
}

function lessonTitle(name) {
  return name.replace(/^Invitiation\b/i, "Invitation");
}

function answerOptions(pair, pairIndex, pool) {
  const distractors = [];
  for (let step = 1; distractors.length < 2 && step <= pool.length; step += 1) {
    const candidate = pool[(pairIndex + step) % pool.length];
    if (candidate !== pair.chinese && !distractors.includes(candidate)) distractors.push(candidate);
  }
  if (distractors.length < 2) throw new Error(`Not enough unique Mandarin choices for “${pair.english}”`);

  const ordered = distractors.map((text) => ({ text, correct: false, emoji: null, audioText: text }));
  const correctIndex = pairIndex % 3;
  ordered.splice(correctIndex, 0, {
    text: pair.chinese,
    correct: true,
    emoji: null,
    audioText: pair.chinese,
  });
  return ordered;
}

function createLessons(skill, globalPool) {
  const skillPool = [...new Set(skill.pairs.map((pair) => pair.chinese))];
  const choicePool = skillPool.length >= 3 ? skillPool : globalPool;
  const lessons = [];

  for (let offset = 0; offset < skill.pairs.length; offset += MAX_CHALLENGES_PER_LESSON) {
    const part = skill.pairs.slice(offset, offset + MAX_CHALLENGES_PER_LESSON);
    const partNumber = Math.floor(offset / MAX_CHALLENGES_PER_LESSON) + 1;
    const hasParts = skill.pairs.length > MAX_CHALLENGES_PER_LESSON;
    lessons.push({
      title: `${lessonTitle(skill.name)}${hasParts ? ` — Part ${partNumber}` : ""}`,
      description: `${part.length} English-to-Mandarin translation challenges.`,
      challenges: part.map((pair, index) => ({
        type: index % 4 === 3 ? "ASSIST" : "SELECT",
        question: `Choose the Mandarin translation for “${pair.english}”.`,
        options: answerOptions(pair, offset + index, choicePool),
      })),
    });
  }

  return lessons;
}

const markdown = await readFile(sourcePath, "utf8");
const skills = parseCourse(markdown);
if (skills.length !== 70) throw new Error(`Expected 70 skills, found ${skills.length}`);
if (skills.some((skill) => !skill.id || skill.pairs.length === 0)) throw new Error("Every skill must have an ID and at least one translation pair");

const globalPool = [...new Set(skills.flatMap((skill) => skill.pairs.map((pair) => pair.chinese)))];
const units = unitMetadata.map(([title, description], unitIndex) => {
  const unitSkills = skills.slice(unitIndex * 10, unitIndex * 10 + 10);
  return {
    title,
    description,
    lessons: unitSkills.flatMap((skill) => createLessons(skill, globalPool)),
  };
});

const course = {
  code: "MRLC-MANDARIN-COMPLETE-V1",
  title: "Mandarin Complete Course",
  description: "A comprehensive Mandarin path with 70 progressive topics and 1,870 translation challenges generated from the school-provided curriculum file.",
  language: "Mandarin Chinese",
  imageEmoji: "🐉",
  accentColor: "#b91c1c",
  published: true,
  units,
};

const lessons = units.flatMap((unit) => unit.lessons);
const challenges = lessons.flatMap((lesson) => lesson.challenges);
if (challenges.length !== 1870) throw new Error(`Expected 1,870 challenges, found ${challenges.length}`);
if (units.length > 20 || units.some((unit) => unit.lessons.length > 30) || lessons.some((lesson) => lesson.challenges.length > 50)) {
  throw new Error("Generated course exceeds Language Quest curriculum limits");
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(course, null, 2)}\n`, "utf8");
console.log(`Generated ${course.title}: ${units.length} units, ${lessons.length} lessons, ${challenges.length} challenges`);
