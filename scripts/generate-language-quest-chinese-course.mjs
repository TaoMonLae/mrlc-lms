import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { convert, pinyin } from "pinyin-pro";
import { buildOddOneOut, option, tokenizeCharacters } from "./lib/language-quest-practice-helpers.mjs";

const sourcePath = path.resolve(process.cwd(), "duolingo-chinese.md");
const outputPath = path.resolve(process.cwd(), "curricula/language-quest/mandarin-complete.generated.json");
// The backend hard-enforces at most 50 challenges per lesson (see the
// course-save validation in languageQuest.ts), so this cap is a real limit,
// not just a script convention.
const MAX_CHALLENGES_PER_LESSON = 50;
// One MATCHING, one ODD_ONE_OUT, and one REORDER challenge are appended per
// lesson (see matchingChallenge/lessonExtras below), so pair chunks are
// sized three smaller to keep every lesson at or under the cap.
const PAIRS_PER_LESSON = MAX_CHALLENGES_PER_LESSON - 3;

const unitMetadata = [
  ["A1", "Foundations", "Greetings, numbers, food, phrases, and first locations."],
  ["A1", "People, Time and Routine", "Family, people, time, hobbies, routines, and restaurants."],
  ["A2", "Everyday Life", "Shopping, dining, health, transportation, languages, and sports."],
  ["A2", "Health, Social Life and Travel", "Invitations, body parts, travel, weather, and shopping."],
  ["B1", "People, School and Daily Life", "People, celebrations, school, family, places, and food."],
  ["B1", "Communication and Work", "Language, personality, education, the future, environment, and work."],
  ["B2", "Culture, Travel and Modern Life", "Culture, hobbies, travel, home, festivals, slang, and business."],
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

function englishAnswerOptions(pair, pairIndex, pool) {
  const distractors = [];
  for (let step = 1; distractors.length < 2 && step <= pool.length; step += 1) {
    const candidate = pool[(pairIndex + step) % pool.length];
    if (candidate !== pair.english && !distractors.includes(candidate)) distractors.push(candidate);
  }
  if (distractors.length < 2) throw new Error(`Not enough unique English choices for “${pair.chinese}”`);

  const ordered = distractors.map((text) => ({ text, correct: false, emoji: null, audioText: null }));
  const correctIndex = pairIndex % 3;
  ordered.splice(correctIndex, 0, {
    text: pair.english,
    correct: true,
    emoji: null,
    audioText: null,
  });
  return ordered;
}

function numberedPinyinVariant(value, shift) {
  const tokens = pinyin(value, { toneType: "num", type: "array" }).map((token) => {
    const toned = /^(.*?)([1-4])$/.exec(token);
    if (toned) return `${toned[1]}${((Number(toned[2]) - 1 + shift) % 4) + 1}`;
    if (/^[a-züv]+$/i.test(token)) return `${token}${shift}`;
    return token;
  });
  return convert(tokens.join(" "), { format: "numToSymbol" });
}

function toneOptions(pair, pairIndex) {
  const correct = pinyin(pair.chinese, { toneType: "symbol", type: "string", separator: " " });
  const choices = [correct, numberedPinyinVariant(pair.chinese, 1), numberedPinyinVariant(pair.chinese, 2)];
  if (new Set(choices).size !== 3) return null;
  const ordered = choices.slice(1).map((text) => ({ text, correct: false, emoji: null, audioText: null }));
  ordered.splice(pairIndex % 3, 0, { text: correct, correct: true, emoji: null, audioText: null });
  return ordered;
}

function createChallenge(pair, pairIndex, chinesePool, englishPool) {
  const explanation = `“${pair.chinese}” means “${pair.english}”.`;
  switch (pairIndex % 7) {
    case 0:
      return {
        type: "SELECT",
        question: `Choose the Mandarin translation for “${pair.english}”.`,
        explanation,
        options: answerOptions(pair, pairIndex, chinesePool),
      };
    case 1:
      return {
        type: "ASSIST",
        question: `What does “${pair.chinese}” mean in English?`,
        explanation,
        options: englishAnswerOptions(pair, pairIndex, englishPool),
      };
    case 2:
      return {
        type: "DICTATION",
        question: "Listen and type the Mandarin phrase you hear.",
        explanation,
        options: [{ text: pair.chinese, correct: true, emoji: null, audioText: pair.chinese }],
      };
    case 3:
      return {
        type: "MINIMAL_PAIR_LISTENING",
        question: pair.chinese,
        explanation: `Play the prompt and listen for the complete phrase. ${explanation}`,
        options: englishAnswerOptions(pair, pairIndex, englishPool),
      };
    case 4: {
      const options = toneOptions(pair, pairIndex);
      return options ? {
        type: "SELECT",
        question: `Which pinyin has the correct tones for “${pair.chinese}”?`,
        explanation: `${pinyin(pair.chinese, { toneType: "symbol", type: "string", separator: " " })} · ${explanation}`,
        options,
      } : {
        type: "SELECT",
        question: `Choose the Mandarin translation for “${pair.english}”.`,
        explanation,
        options: answerOptions(pair, pairIndex, chinesePool),
      };
    }
    case 5:
      return {
        type: "GRAMMAR_TRANSFORM",
        question: `Choose the grammatically correct Mandarin translation for “${pair.english}”.`,
        explanation,
        options: answerOptions(pair, pairIndex, chinesePool),
      };
    default:
      return {
        type: "CLOZE",
        question: `Complete the Mandarin translation of “${pair.english}”.`,
        explanation,
        options: answerOptions(pair, pairIndex, chinesePool),
      };
  }
}

// Groups up to 4 pairs with unique English and Mandarin text into one
// MATCHING challenge (2 tiles per pair, positionally paired -- see
// matchingChallengeIsCorrect in shared/languageQuest.ts). Returns null when a
// lesson doesn't have at least 3 pairs with unique text on both sides.
function matchingChallenge(pairs) {
  const seenEnglish = new Set();
  const seenChinese = new Set();
  const unique = [];
  for (const pair of pairs) {
    if (seenEnglish.has(pair.english) || seenChinese.has(pair.chinese)) continue;
    seenEnglish.add(pair.english);
    seenChinese.add(pair.chinese);
    unique.push(pair);
    if (unique.length === 4) break;
  }
  if (unique.length < 3) return null;

  const options = [];
  for (const pair of unique) {
    options.push({ text: pair.english, correct: true, emoji: null, audioText: pair.english });
    options.push({ text: pair.chinese, correct: true, emoji: null, audioText: pair.chinese });
  }
  return {
    type: "MATCHING",
    question: "Match each English word or phrase to its Mandarin translation.",
    explanation: unique.map((pair) => `“${pair.chinese}” means “${pair.english}”.`).join(" "),
    options,
  };
}

// Builds one ODD_ONE_OUT and one REORDER challenge per lesson. ODD_ONE_OUT
// borrows its "ringer" meaning from the course-wide pool (guaranteed
// available and genuinely different from this lesson's own three meanings).
// REORDER splits a real Mandarin phrase into individual-character tiles --
// preferring one from this lesson's own pairs, falling back to the
// course-wide pool for the rare lesson whose Mandarin text is all
// single-character.
function lessonExtras(part, globalPool) {
  const extras = [];

  const inGroupEnglish = [...new Set(part.map((pair) => pair.english))].slice(0, 3);
  const oddWord = globalPool.english.find((word) => !inGroupEnglish.includes(word));
  const oddOneOut = buildOddOneOut(
    "Which English meaning does not belong with the others in this lesson?",
    inGroupEnglish,
    oddWord,
    oddWord ? `“${oddWord}” is from a different lesson; the rest of this set means ${inGroupEnglish.map((word) => `“${word}”`).join(", ")}.` : undefined,
  );
  if (oddOneOut) extras.push(oddOneOut);

  let tokens = null;
  let sourcePair = null;
  for (const pair of part) {
    const candidate = tokenizeCharacters(pair.chinese);
    if (candidate) {
      tokens = candidate;
      sourcePair = pair;
      break;
    }
  }
  if (!tokens) {
    for (const candidate of globalPool.pairs) {
      const parsed = tokenizeCharacters(candidate.chinese);
      if (parsed) {
        tokens = parsed;
        sourcePair = candidate;
        break;
      }
    }
  }
  if (tokens) {
    extras.push({
      type: "REORDER",
      question: `Put the characters of “${sourcePair.chinese}” back in the correct order.`,
      explanation: `“${sourcePair.chinese}” means “${sourcePair.english}”.`,
      options: tokens.map((token) => option(token, true)),
    });
  }

  return extras;
}

function createLessons(skill, globalPool) {
  const skillPool = [...new Set(skill.pairs.map((pair) => pair.chinese))];
  const englishSkillPool = [...new Set(skill.pairs.map((pair) => pair.english))];
  const choicePool = skillPool.length >= 3 ? skillPool : globalPool.chinese;
  const englishChoicePool = englishSkillPool.length >= 3 ? englishSkillPool : globalPool.english;
  const lessons = [];

  for (let offset = 0; offset < skill.pairs.length; offset += PAIRS_PER_LESSON) {
    const part = skill.pairs.slice(offset, offset + PAIRS_PER_LESSON);
    const partNumber = Math.floor(offset / PAIRS_PER_LESSON) + 1;
    const hasParts = skill.pairs.length > PAIRS_PER_LESSON;
    const challenges = part.map((pair, index) => createChallenge(
      pair,
      offset + index,
      choicePool,
      englishChoicePool,
    ));
    challenges.push(...lessonExtras(part, globalPool));
    const matching = matchingChallenge(part);
    if (matching) challenges.push(matching);
    lessons.push({
      title: `${lessonTitle(skill.name)}${hasParts ? ` — Part ${partNumber}` : ""}`,
      description: `${part.length} translation, listening, dictation, tone, grammar, ordering, and completion challenges${matching ? ", plus a matching review" : ""}.`,
      challenges,
    });
  }

  return lessons;
}

const markdown = await readFile(sourcePath, "utf8");
const skills = parseCourse(markdown);
if (skills.length !== 70) throw new Error(`Expected 70 skills, found ${skills.length}`);
if (skills.some((skill) => !skill.id || skill.pairs.length === 0)) throw new Error("Every skill must have an ID and at least one translation pair");

const globalPool = {
  chinese: [...new Set(skills.flatMap((skill) => skill.pairs.map((pair) => pair.chinese)))],
  english: [...new Set(skills.flatMap((skill) => skill.pairs.map((pair) => pair.english)))],
  pairs: skills.flatMap((skill) => skill.pairs),
};
const units = unitMetadata.map(([level, title, description], unitIndex) => {
  const unitSkills = skills.slice(unitIndex * 10, unitIndex * 10 + 10);
  return {
    title: `${level} · ${title}`,
    description: `${level} pathway · ${description}`,
    lessons: unitSkills.flatMap((skill) => createLessons(skill, globalPool)),
  };
});

const course = {
  code: "MRLC-MANDARIN-COMPLETE-V2",
  title: "Mandarin Complete A1–B2",
  description: "A CEFR-aligned Mandarin path with 70 progressive topics and 2,083 translation, listening, dictation, tone, grammar, ordering, odd-one-out, matching, and completion challenges generated from the school-provided curriculum file.",
  language: "Mandarin Chinese",
  imageEmoji: "🐉",
  accentColor: "#b91c1c",
  published: true,
  units,
};

const lessons = units.flatMap((unit) => unit.lessons);
const challenges = lessons.flatMap((lesson) => lesson.challenges);
const translationChallenges = challenges.filter((challenge) => !["MATCHING", "REORDER", "ODD_ONE_OUT"].includes(challenge.type));
if (translationChallenges.length !== 1870) throw new Error(`Expected 1,870 per-pair translation challenges, found ${translationChallenges.length}`);
const matchingCount = challenges.filter((challenge) => challenge.type === "MATCHING").length;
if (matchingCount !== lessons.length) throw new Error(`Expected one MATCHING challenge per lesson (${lessons.length}), found ${matchingCount}`);
const reorderCount = challenges.filter((challenge) => challenge.type === "REORDER").length;
if (reorderCount !== lessons.length) throw new Error(`Expected one REORDER challenge per lesson (${lessons.length}), found ${reorderCount}`);
for (const challenge of challenges) {
  if (challenge.type !== "REORDER") continue;
  if (challenge.options.length < 2 || challenge.options.some((opt) => !opt.correct)) {
    throw new Error("Every REORDER challenge must have at least two character tiles, all marked correct");
  }
}
const oddOneOutCount = challenges.filter((challenge) => challenge.type === "ODD_ONE_OUT").length;
if (oddOneOutCount !== lessons.length) throw new Error(`Expected one ODD_ONE_OUT challenge per lesson (${lessons.length}), found ${oddOneOutCount}`);
for (const challenge of challenges) {
  if (challenge.type !== "ODD_ONE_OUT") continue;
  if (challenge.options.length !== 4 || challenge.options.filter((opt) => opt.correct).length !== 1) {
    throw new Error("Every ODD_ONE_OUT challenge must have four options and exactly one odd-one-out answer");
  }
}
const challengeTypes = new Map();
for (const challenge of challenges) challengeTypes.set(challenge.type, (challengeTypes.get(challenge.type) || 0) + 1);
for (const requiredType of ["SELECT", "ASSIST", "CLOZE", "MINIMAL_PAIR_LISTENING", "DICTATION", "GRAMMAR_TRANSFORM"]) {
  if (!challengeTypes.get(requiredType)) throw new Error(`Generated Mandarin course is missing ${requiredType} challenges`);
}
if (units.length > 20 || units.some((unit) => unit.lessons.length > 30) || lessons.some((lesson) => lesson.challenges.length > 50)) {
  throw new Error("Generated course exceeds Language Quest curriculum limits");
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(course, null, 2)}\n`, "utf8");
console.log(`Generated ${course.title}: ${units.length} units, ${lessons.length} lessons, ${challenges.length} challenges`);
