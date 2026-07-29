import assert from "node:assert/strict";
import test from "node:test";
import {
  languageQuestLookupWord,
  nextLanguageQuestStreak,
  normalizeSentenceAnswer,
  sentenceAnswerMatches,
} from "../../shared/languageQuest";
import { canAttemptNewChallenge, shuffle } from "../../languageQuest";
import { importedSpanishCourse } from "../../languageQuestImportedCourses";
import { mandarinFoundationsCourse } from "../../languageQuestMandarinCourse";
import { completeMandarinCourse } from "../../languageQuestCompleteMandarinCourse";
import { englishWordCourses } from "../../languageQuestEnglishWordCourses";
import { advancedEnglishCourses } from "../../languageQuestAdvancedEnglishCourses";
import { linguifyCefrCourses } from "../../languageQuestLinguifyCourses";

test("Language Quest starts a new streak on the first active day", () => {
  assert.deepEqual(
    nextLanguageQuestStreak({
      currentStreak: 0,
      bestStreak: 0,
      lastPlayedDate: null,
      now: new Date("2026-07-23T04:00:00Z"),
    }),
    { currentStreak: 1, bestStreak: 1, countsAsNewDay: true },
  );
});

test("sentence practice ignores case, spacing, and light punctuation", () => {
  assert.equal(normalizeSentenceAnswer("  Good   MORNING! "), "good morning");
  assert.equal(sentenceAnswerMatches("You're welcome.", "You’re welcome"), true);
  assert.equal(sentenceAnswerMatches("Good night", "Good morning"), false);
});

test("Language Quest dictionary extracts a useful highlighted term", () => {
  assert.equal(languageQuestLookupWord(" borrow and read books? "), "borrow");
  assert.equal(languageQuestLookupWord("“You're”"), "You're");
  assert.equal(languageQuestLookupWord("စာကြည့်တိုက်"), "စာကြည့်တိုက်");
  assert.equal(languageQuestLookupWord("123 …"), null);
});

test("Language Quest only increments once per Kuala Lumpur calendar day", () => {
  assert.deepEqual(
    nextLanguageQuestStreak({
      currentStreak: 4,
      bestStreak: 6,
      lastPlayedDate: new Date("2026-07-22T18:00:00Z"), // 23 July in Kuala Lumpur
      now: new Date("2026-07-23T04:00:00Z"),
    }),
    { currentStreak: 4, bestStreak: 6, countsAsNewDay: false },
  );
});

test("Language Quest increments consecutive days and resets after a gap", () => {
  const consecutive = nextLanguageQuestStreak({
    currentStreak: 4,
    bestStreak: 4,
    lastPlayedDate: new Date("2026-07-22T04:00:00Z"),
    now: new Date("2026-07-23T04:00:00Z"),
  });
  assert.deepEqual(consecutive, { currentStreak: 5, bestStreak: 5, countsAsNewDay: true });

  const reset = nextLanguageQuestStreak({
    currentStreak: 5,
    bestStreak: 8,
    lastPlayedDate: new Date("2026-07-20T04:00:00Z"),
    now: new Date("2026-07-23T04:00:00Z"),
  });
  assert.deepEqual(reset, { currentStreak: 1, bestStreak: 8, countsAsNewDay: true });
});

test("the imported Spanish course preserves the source curriculum shape", () => {
  const lessons = importedSpanishCourse.units.flatMap((unit) => unit.lessons);
  const challenges = lessons.flatMap((lesson) => lesson.challenges);

  assert.equal(importedSpanishCourse.language, "Spanish");
  assert.equal(importedSpanishCourse.units.length, 2);
  assert.equal(lessons.length, 10);
  assert.equal(challenges.length, 80);
  assert.ok(challenges.every((challenge) => challenge.options.filter((option) => option.correct).length === 1));
  assert.ok(challenges.every((challenge) => challenge.options.length === 3));
});

test("the original Mandarin course has a complete and valid curriculum", () => {
  const lessons = mandarinFoundationsCourse.units.flatMap((unit) => unit.lessons);
  const challenges = lessons.flatMap((lesson) => lesson.challenges);

  assert.equal(mandarinFoundationsCourse.language, "Mandarin Chinese");
  assert.equal(mandarinFoundationsCourse.units.length, 3);
  assert.equal(lessons.length, 9);
  assert.equal(challenges.length, 36);
  assert.ok(challenges.every((challenge) => challenge.options.filter((option) => option.correct).length === 1));
  assert.ok(challenges.every((challenge) => challenge.options.every((option) => option.audioText)));
});

test("the generated Mandarin Complete course contains every supplied translation", () => {
  const lessons = completeMandarinCourse.units.flatMap((unit) => unit.lessons);
  const challenges = lessons.flatMap((lesson) => lesson.challenges);

  assert.equal(completeMandarinCourse.code, "MRLC-MANDARIN-COMPLETE-V1");
  assert.equal(completeMandarinCourse.units.length, 7);
  assert.equal(lessons.length, 71);
  assert.equal(challenges.length, 1870);
  assert.ok(completeMandarinCourse.units.every((unit) => unit.lessons.length <= 30));
  assert.ok(lessons.every((lesson) => lesson.challenges.length <= 50));
  assert.ok(challenges.every((challenge) => challenge.options.length === 3));
  assert.ok(challenges.every((challenge) => challenge.options.filter((option) => option.correct).length === 1));
});

test("the generated English word courses are focused and classroom-ready", () => {
  const lessons = englishWordCourses.flatMap((course) => course.units.flatMap((unit) => unit.lessons));
  const challenges = lessons.flatMap((lesson) => lesson.challenges);

  assert.equal(englishWordCourses.length, 3);
  assert.equal(lessons.length, 18);
  assert.equal(challenges.length, 180);
  assert.ok(englishWordCourses.every((course) => course.units.length === 2));
  assert.ok(englishWordCourses.every((course) => course.units.flatMap((unit) => unit.lessons).length === 6));
  assert.ok(englishWordCourses.every((course) => course.units.flatMap((unit) => unit.lessons).flatMap((lesson) => lesson.challenges).length === 60));
  assert.ok(challenges.every((challenge) => challenge.options.length === 3));
  assert.ok(challenges.every((challenge) => challenge.options.filter((option) => option.correct).length === 1));
  assert.ok(challenges.every((challenge) => challenge.options.every((option) => option.audioText === option.text)));
});

test("shuffle returns every option exactly once, in some order", () => {
  const options = ["a", "b", "c", "d"];
  const result = shuffle(options);
  assert.deepEqual([...result].sort(), [...options].sort());
  assert.equal(result.length, options.length);
  assert.deepEqual(options, ["a", "b", "c", "d"]);
});

test("shuffle does not always return the same order (regression for the fixed-position answer bug)", () => {
  const options = ["a", "b", "c", "d", "e", "f"];
  const orders = new Set<string>();
  for (let i = 0; i < 50; i++) {
    orders.add(shuffle(options).join(","));
  }
  assert.ok(orders.size > 1, "expected more than one distinct ordering across 50 shuffles");
});

test("a learner out of hearts cannot attempt a challenge they have not cleared", () => {
  assert.equal(canAttemptNewChallenge(0, false), false);
  assert.equal(canAttemptNewChallenge(-1, false), false);
});

test("a learner out of hearts can still replay a challenge they already completed", () => {
  assert.equal(canAttemptNewChallenge(0, true), true);
});

test("a learner with hearts remaining can attempt any challenge", () => {
  assert.equal(canAttemptNewChallenge(3, false), true);
  assert.equal(canAttemptNewChallenge(3, true), true);
});

test("the ranked advanced English courses have a valid progression", () => {
  const lessons = advancedEnglishCourses.flatMap((course) => course.units.flatMap((unit) => unit.lessons));
  const challenges = lessons.flatMap((lesson) => lesson.challenges);

  assert.deepEqual(
    advancedEnglishCourses.map((course) => course.code),
    [
      "MRLC-ADVANCED-ENGLISH-CORE-V1",
      "MRLC-ADVANCED-ENGLISH-MASTERY-V1",
      "MRLC-ADVANCED-ENGLISH-EXPERT-V1",
    ],
  );
  assert.equal(lessons.length, 18);
  assert.equal(challenges.length, 180);
  assert.ok(advancedEnglishCourses.every((course) => course.units.length === 2));
  assert.ok(advancedEnglishCourses.every((course) => course.units.flatMap((unit) => unit.lessons).length === 6));
  assert.ok(advancedEnglishCourses.every((course) => course.units.flatMap((unit) => unit.lessons).flatMap((lesson) => lesson.challenges).length === 60));
  assert.ok(challenges.every((challenge) => challenge.options.length === 3));
  assert.ok(challenges.every((challenge) => challenge.options.filter((option) => option.correct).length === 1));
});

test("the Linguify import creates a complete A1-C2 vocabulary path", () => {
  const units = linguifyCefrCourses.flatMap((course) => course.units);
  const lessons = units.flatMap((unit) => unit.lessons);
  const challenges = lessons.flatMap((lesson) => lesson.challenges);

  assert.deepEqual(
    linguifyCefrCourses.map((course) => course.code),
    ["A1", "A2", "B1", "B2", "C1", "C2"].map(
      (level) => `MRLC-LINGUIFY-CEFR-${level}-V1`,
    ),
  );
  assert.equal(linguifyCefrCourses.length, 6);
  assert.equal(units.length, 18);
  assert.equal(lessons.length, 36);
  assert.equal(challenges.length, 360);
  assert.ok(linguifyCefrCourses.every((course) => course.language === "English"));
  assert.ok(linguifyCefrCourses.every((course) => course.units.length === 3));
  assert.ok(units.every((unit) => unit.lessons.length === 2));
  assert.ok(lessons.every((lesson) => lesson.challenges.length === 10));
  assert.ok(challenges.every((challenge) => challenge.options.length === 3));
  assert.ok(challenges.every(
    (challenge) => challenge.options.filter((option) => option.correct).length === 1,
  ));
  assert.ok(challenges.every(
    (challenge) => challenge.options.every((option) => option.audioText === option.text),
  ));
  assert.ok(challenges.every((challenge) => challenge.question.includes("Example:")));
  assert.equal(
    challenges.filter((challenge) => challenge.question.includes("Pronunciation:")).length,
    340,
  );
});
