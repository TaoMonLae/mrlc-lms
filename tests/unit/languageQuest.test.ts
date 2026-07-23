import assert from "node:assert/strict";
import test from "node:test";
import { nextLanguageQuestStreak } from "../../shared/languageQuest";
import { importedSpanishCourse } from "../../languageQuestImportedCourses";
import { mandarinFoundationsCourse } from "../../languageQuestMandarinCourse";
import { completeMandarinCourse } from "../../languageQuestCompleteMandarinCourse";

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
