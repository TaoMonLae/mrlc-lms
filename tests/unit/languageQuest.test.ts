import assert from "node:assert/strict";
import test from "node:test";
import {
  bossBattleResult,
  languageQuestPracticePrompt,
  languageQuestLookupWord,
  nextLanguageQuestStreak,
  normalizeSentenceAnswer,
  sentenceAnswerMatches,
} from "../../shared/languageQuest";
import { canAttemptNewChallenge, nextIncompleteLessonId, shuffle } from "../../languageQuest";
import {
  LANGUAGE_QUEST_AVATARS,
  isLanguageQuestAvatarId,
} from "../../shared/languageQuestAvatars";
import { importedSpanishCourse } from "../../languageQuestImportedCourses";
import { mandarinFoundationsCourse } from "../../languageQuestMandarinCourse";
import { completeMandarinCourse } from "../../languageQuestCompleteMandarinCourse";
import { chineseConversationStarterCourse } from "../../languageQuestChineseConversationCourse";
import { englishWordCourses } from "../../languageQuestEnglishWordCourses";
import { advancedEnglishCourses } from "../../languageQuestAdvancedEnglishCourses";
import { linguifyCefrCourses } from "../../languageQuestLinguifyCourses";
import {
  languageQuestCategoryForLanguage,
  orderedLanguageQuestCategories,
} from "../../shared/languageQuestCourseCategories";
import {
  containsHanCharacters,
  formatCedictPinyin,
  isChineseLanguage,
  languageQuestAnswerMatches,
  languageQuestPinyin,
} from "../../shared/languageQuestPinyin";
import {
  LANGUAGE_QUEST_REWARD_CARDS,
  LANGUAGE_QUEST_LEGENDARY_AWARDS,
  languageQuestLegendaryAwardById,
  languageQuestRewardProgress,
  languageQuestStreakFrame,
  newlyUnlockedLanguageQuestRewardIds,
} from "../../shared/languageQuestRewards";
import {
  languageQuestMissionProgress,
  languageQuestPeriodBounds,
  nextLanguageQuestMasteryReview,
} from "../../shared/languageQuestEngagement";

test("Language Quest turns saved XP into stable levels and collectible cards", () => {
  const beginner = languageQuestRewardProgress(0);
  assert.equal(beginner.level, 0);
  assert.equal(beginner.title, "Quest Initiate");
  assert.deepEqual(beginner.unlockedCardIds, []);
  assert.equal(beginner.currentCardId, null);
  assert.equal(beginner.nextCardId, "lexibloom");
  assert.equal(beginner.nextLevelXp, 100);
  assert.equal(beginner.progressPercent, 0);

  const learner = languageQuestRewardProgress(160);
  assert.equal(learner.level, 1);
  assert.equal(learner.title, "First Step");
  assert.deepEqual(learner.unlockedCardIds, ["lexibloom"]);
  assert.equal(learner.progressPercent, 40);

  const committedLearner = languageQuestRewardProgress(760);
  assert.equal(committedLearner.level, 4);
  assert.equal(committedLearner.title, "Pattern Finder");
  assert.deepEqual(committedLearner.unlockedCardIds, [
    "lexibloom",
    "echoquill",
    "phraseflare",
    "grammashell",
  ]);
  assert.equal(committedLearner.progressPercent, 20);
});

test("Language Quest reward thresholds are ordered, unique, and announce only new unlocks", () => {
  assert.equal(LANGUAGE_QUEST_REWARD_CARDS.length, 20);
  assert.equal(LANGUAGE_QUEST_REWARD_CARDS[0].unlockXp, 100);
  assert.deepEqual(
    LANGUAGE_QUEST_REWARD_CARDS.map((card) => card.level),
    LANGUAGE_QUEST_REWARD_CARDS.map((_, index) => index + 1),
  );
  assert.equal(
    new Set(LANGUAGE_QUEST_REWARD_CARDS.map((card) => card.id)).size,
    LANGUAGE_QUEST_REWARD_CARDS.length,
  );
  assert.ok(LANGUAGE_QUEST_REWARD_CARDS.every((card, index, cards) =>
    index === 0 || card.unlockXp > cards[index - 1].unlockXp,
  ));
  assert.deepEqual(newlyUnlockedLanguageQuestRewardIds(0, 99), []);
  assert.deepEqual(newlyUnlockedLanguageQuestRewardIds(99, 100), ["lexibloom"]);
  assert.deepEqual(newlyUnlockedLanguageQuestRewardIds(70, 260), ["lexibloom", "echoquill"]);
  assert.deepEqual(newlyUnlockedLanguageQuestRewardIds(160, 160), []);
});

test("legendary Mon history cards unlock only after the main Quest Card path", () => {
  assert.equal(LANGUAGE_QUEST_LEGENDARY_AWARDS.length, 9);
  assert.ok(LANGUAGE_QUEST_LEGENDARY_AWARDS[0].unlockXp > LANGUAGE_QUEST_REWARD_CARDS.at(-1)!.unlockXp);
  assert.equal(
    new Set(LANGUAGE_QUEST_LEGENDARY_AWARDS.map((award) => award.id)).size,
    LANGUAGE_QUEST_LEGENDARY_AWARDS.length,
  );
  const sealed = languageQuestRewardProgress(14_999);
  assert.deepEqual(sealed.unlockedLegendaryIds, []);
  assert.equal(sealed.nextLegendaryId, "king-ukkalapa");
  const revealed = languageQuestRewardProgress(17_000);
  assert.deepEqual(revealed.unlockedLegendaryIds, ["king-ukkalapa", "king-siha-sudhamma"]);
  assert.equal(revealed.currentLegendaryId, "king-siha-sudhamma");
  assert.deepEqual(newlyUnlockedLanguageQuestRewardIds(14_990, 15_010), ["king-ukkalapa"]);
  assert.equal(languageQuestLegendaryAwardById("queen-banya-htau")?.achievement, "Golden Counsel");
});

test("streak card frames unlock deterministically from the learner's best streak", () => {
  assert.equal(languageQuestStreakFrame(0).id, "classic");
  assert.equal(languageQuestStreakFrame(6).id, "ember");
  assert.equal(languageQuestStreakFrame(7).id, "aurora");
  assert.equal(languageQuestStreakFrame(30).id, "legend");
});

test("Language Quest missions use Kuala Lumpur daily and weekly periods", () => {
  const now = new Date("2026-07-29T04:00:00.000Z");
  const periods = languageQuestPeriodBounds(now);
  assert.equal(periods.dayKey, "2026-07-29");
  assert.equal(periods.weekKey, "2026-07-26");
  const missions = languageQuestMissionProgress({
    dailyXp: 35,
    weeklyXp: 160,
    weeklyCourseCount: 2,
    dailyMasteryWins: 0,
    claimedKeys: new Set(["daily-xp:2026-07-29"]),
    now,
  });
  assert.equal(missions.find((mission) => mission.key === "daily-xp")?.claimed, true);
  assert.equal(missions.find((mission) => mission.key === "weekly-xp")?.claimable, true);
  assert.equal(missions.find((mission) => mission.key === "course-explorer")?.claimable, true);
  assert.equal(missions.find((mission) => mission.key === "mastery-one")?.claimable, false);
});

test("mastery reviews expand after success and return sooner after a miss", () => {
  const now = new Date("2026-07-29T00:00:00.000Z");
  const success = nextLanguageQuestMasteryReview(1, true, now);
  assert.equal(success.stage, 2);
  assert.equal(success.dueAt.toISOString(), "2026-08-01T00:00:00.000Z");
  const retry = nextLanguageQuestMasteryReview(4, false, now);
  assert.equal(retry.stage, 0);
  assert.equal(retry.dueAt.toISOString(), "2026-07-29T04:00:00.000Z");
});

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

test("practice prompts hide pronunciation and example clues without losing the question", () => {
  assert.equal(
    languageQuestPracticePrompt(
      'Which noun means “A building where people live”? Pronunciation: /haʊs/. Example: “My house has three bedrooms.”',
    ),
    'Which noun means “A building where people live”?',
  );
  assert.equal(
    languageQuestPracticePrompt('Choose the Mandarin for “Hello”. Pronunciation: nǐ hǎo.'),
    'Choose the Mandarin for “Hello”.',
  );
  assert.equal(languageQuestPracticePrompt('Which one means “the man”?'), 'Which one means “the man”?');
});

test("Language Quest dictionary extracts a useful highlighted term", () => {
  assert.equal(languageQuestLookupWord(" borrow and read books? "), "borrow");
  assert.equal(languageQuestLookupWord("“You're”"), "You're");
  assert.equal(languageQuestLookupWord("စာကြည့်တိုက်"), "စာကြည့်တိုက်");
  assert.equal(languageQuestLookupWord("123 …"), null);
  assert.equal(languageQuestLookupWord("你好"), "你好");
  // Strips interspersed Latin punctuation/pinyin picked up in a selection,
  // keeping only the Han characters as the dictionary headword.
  assert.equal(languageQuestLookupWord("你好 (nǐ hǎo)!"), "你好");
});

test("Language Quest adds tone-marked Pinyin to Chinese course text", () => {
  assert.equal(isChineseLanguage("Mandarin Chinese"), true);
  assert.deepEqual(languageQuestPinyin("你好", "Mandarin Chinese"), ["nǐ", "hǎo"]);
  assert.deepEqual(
    languageQuestPinyin("早上好！", "Chinese"),
    ["zǎo", "shàng", "hǎo", "！"],
  );
  assert.equal(languageQuestPinyin("Hello", "Mandarin Chinese"), null);
  assert.equal(languageQuestPinyin("你好", "English"), null);
});

test("formatCedictPinyin converts CC-CEDICT numbered pinyin to tone marks", () => {
  assert.equal(formatCedictPinyin("ni3 hao3"), "nǐ hǎo");
  // Tone 5 is neutral tone (no diacritic) in CC-CEDICT's numbering.
  assert.equal(formatCedictPinyin("ma5"), "ma");
  // CC-CEDICT spells u-umlaut as "u:" rather than "ü".
  assert.equal(formatCedictPinyin("lu:4 se4"), "lǜ sè");
  // Neutral tone (5) combined with u-umlaut still needs the "u:" -> "ü" swap
  // even though no diacritic is added (regression: this used to return "nv").
  assert.equal(formatCedictPinyin("nu:5"), "nü");
  // pinyin-pro's numbered-tone parser doesn't recognise fully upper-case
  // syllables on its own (regression: this used to return "LV4" unconverted).
  assert.equal(formatCedictPinyin("LU:4"), "LǛ");
});

test("containsHanCharacters detects Chinese-script input", () => {
  assert.equal(containsHanCharacters("你好"), true);
  assert.equal(containsHanCharacters("hello 你"), true);
  assert.equal(containsHanCharacters("hello"), false);
  assert.equal(containsHanCharacters(""), false);
});

test("languageQuestAnswerMatches accepts pinyin or Hanzi for Chinese model text", () => {
  // Correct Hanzi still matches directly.
  assert.equal(languageQuestAnswerMatches("你好", "你好"), true);
  // Toneless pinyin, typeable on any keyboard, is accepted.
  assert.equal(languageQuestAnswerMatches("ni hao", "你好"), true);
  // Tone-marked pinyin is accepted.
  assert.equal(languageQuestAnswerMatches("nǐ hǎo", "你好"), true);
  // CC-CEDICT-style numbered-tone pinyin is accepted.
  assert.equal(languageQuestAnswerMatches("ni3 hao3", "你好"), true);
  // Capitalization and light punctuation still don't affect the check.
  assert.equal(languageQuestAnswerMatches("Ni Hao!", "你好"), true);
  // Wrong pinyin/text is still rejected.
  assert.equal(languageQuestAnswerMatches("zai jian", "你好"), false);
  assert.equal(languageQuestAnswerMatches("", "你好"), false);
});

test("languageQuestAnswerMatches falls back to plain text matching for non-Chinese model text", () => {
  assert.equal(languageQuestAnswerMatches("Good morning", "Good morning"), true);
  assert.equal(languageQuestAnswerMatches("good morning!", "Good morning"), true);
  // Non-Chinese model text never matches a pinyin-shaped guess unless it's
  // literally the same text.
  assert.equal(languageQuestAnswerMatches("ni hao", "Good morning"), false);
});

test("every Hanzi answer in every built-in Chinese course receives Pinyin", () => {
  const chineseCourses = [
    mandarinFoundationsCourse,
    completeMandarinCourse,
    chineseConversationStarterCourse,
  ];
  const hanziOptions = chineseCourses.flatMap((course) =>
    course.units.flatMap((unit) =>
      unit.lessons.flatMap((lesson) =>
        lesson.challenges.flatMap((challenge) =>
          challenge.options.filter((option) => /\p{Script=Han}/u.test(option.text)),
        ),
      ),
    ),
  );

  assert.ok(hanziOptions.length > 5_000);
  assert.ok(hanziOptions.every((option) =>
    languageQuestPinyin(option.text, "Mandarin Chinese")?.length === Array.from(option.text).length,
  ));
});

test("Language Quest accepts only the curated built-in learner avatars", () => {
  assert.ok(LANGUAGE_QUEST_AVATARS.length >= 8);
  assert.equal(new Set(LANGUAGE_QUEST_AVATARS.map((avatar) => avatar.id)).size, LANGUAGE_QUEST_AVATARS.length);
  assert.equal(isLanguageQuestAvatarId("owl"), true);
  assert.equal(isLanguageQuestAvatarId("https://example.com/photo.jpg"), false);
  assert.equal(isLanguageQuestAvatarId("../uploads/avatar.png"), false);
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

test("the Chinese Conversation Starter course is complete and classroom-ready", () => {
  const lessons = chineseConversationStarterCourse.units.flatMap((unit) => unit.lessons);
  const challenges = lessons.flatMap((lesson) => lesson.challenges);

  assert.equal(chineseConversationStarterCourse.code, "MRLC-CHINESE-CONVERSATION-STARTER-V1");
  assert.equal(chineseConversationStarterCourse.category, "Chinese Courses");
  assert.equal(chineseConversationStarterCourse.language, "Mandarin Chinese");
  assert.equal(chineseConversationStarterCourse.units.length, 2);
  assert.equal(lessons.length, 8);
  assert.equal(challenges.length, 32);
  assert.ok(challenges.every((challenge) => challenge.options.length === 3));
  assert.ok(challenges.every(
    (challenge) => challenge.options.filter((option) => option.correct).length === 1,
  ));
  assert.ok(challenges.every(
    (challenge) => challenge.options.every((option) => option.audioText),
  ));
});

test("Language Quest groups language courses into a predictable category order", () => {
  assert.equal(languageQuestCategoryForLanguage("Mandarin Chinese"), "Chinese Courses");
  assert.equal(languageQuestCategoryForLanguage("English"), "English Courses");
  assert.equal(languageQuestCategoryForLanguage("Spanish"), "Spanish Courses");
  assert.equal(languageQuestCategoryForLanguage("Mon"), "Other Courses");

  const groups = orderedLanguageQuestCategories([
    { category: "Spanish Courses", title: "Spanish" },
    { category: "Other Courses", title: "Mon" },
    { category: "English Courses", title: "English" },
    { category: "Chinese Courses", title: "Chinese" },
    { category: "Chinese Courses", title: "Mandarin" },
    { language: "Mandarin Chinese", title: "Legacy Chinese" },
  ]);

  assert.deepEqual(
    groups.map((group) => [group.category, group.courses.length]),
    [
      ["Chinese Courses", 3],
      ["English Courses", 1],
      ["Spanish Courses", 1],
      ["Other Courses", 1],
    ],
  );
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

test("nextIncompleteLessonId finds the first unlocked, unfinished lesson", () => {
  const units = [
    {
      lessons: [
        { id: "lesson-1", challenges: [{ id: "c1" }, { id: "c2" }] },
        { id: "lesson-2", challenges: [{ id: "c3" }] },
      ],
    },
    {
      lessons: [
        { id: "lesson-3", challenges: [{ id: "c4" }, { id: "c5" }] },
      ],
    },
  ];

  // Nothing completed yet: the very first lesson is the resume target.
  assert.equal(nextIncompleteLessonId(units, new Set()), "lesson-1");

  // First lesson done, second is unlocked but unfinished.
  assert.equal(nextIncompleteLessonId(units, new Set(["c1", "c2"])), "lesson-2");

  // First two lessons done: the third (in the second unit) is next.
  assert.equal(nextIncompleteLessonId(units, new Set(["c1", "c2", "c3"])), "lesson-3");

  // Every challenge across every unit is done: nothing left to resume.
  assert.equal(nextIncompleteLessonId(units, new Set(["c1", "c2", "c3", "c4", "c5"])), null);
});

test("bossBattleResult grades a battle against the server-side answer key", () => {
  const answerKey = [
    { challengeId: "c1", correctOptionId: "c1-right", correctAnswer: "Right 1" },
    { challengeId: "c2", correctOptionId: "c2-right", correctAnswer: "Right 2" },
    { challengeId: "c3", correctOptionId: "c3-right", correctAnswer: "Right 3" },
    { challengeId: "c4", correctOptionId: "c4-right", correctAnswer: "Right 4" },
  ];
  const options = { minQuestions: 4, passRatio: 0.7 };

  // 4/4 correct clears a 70% bar easily.
  const perfect = bossBattleResult(
    [
      { challengeId: "c1", optionId: "c1-right" },
      { challengeId: "c2", optionId: "c2-right" },
      { challengeId: "c3", optionId: "c3-right" },
      { challengeId: "c4", optionId: "c4-right" },
    ],
    answerKey,
    options,
  );
  assert.equal(perfect.correctCount, 4);
  assert.equal(perfect.total, 4);
  assert.equal(perfect.won, true);

  // 2/4 (50%) falls short of the 70% pass ratio.
  const short = bossBattleResult(
    [
      { challengeId: "c1", optionId: "c1-right" },
      { challengeId: "c2", optionId: "c2-right" },
      { challengeId: "c3", optionId: "wrong" },
      { challengeId: "c4", optionId: null },
    ],
    answerKey,
    options,
  );
  assert.equal(short.correctCount, 2);
  assert.equal(short.won, false);

  // Fewer than minQuestions valid answers never counts as a win, even at 100%.
  const tooFew = bossBattleResult(
    [{ challengeId: "c1", optionId: "c1-right" }],
    answerKey,
    options,
  );
  assert.equal(tooFew.won, false);

  // Challenge ids outside the answer key (e.g. from another course) are
  // ignored rather than counted, so they can't pad the ratio.
  const spoofed = bossBattleResult(
    [
      { challengeId: "c1", optionId: "c1-right" },
      { challengeId: "not-in-this-course", optionId: "anything" },
    ],
    answerKey,
    options,
  );
  assert.equal(spoofed.total, 1);
  assert.equal(spoofed.results.some((entry) => entry.challengeId === "not-in-this-course"), false);

  // Duplicate submissions for the same challenge only count once.
  const duped = bossBattleResult(
    [
      { challengeId: "c1", optionId: "c1-right" },
      { challengeId: "c1", optionId: "c1-right" },
    ],
    answerKey,
    options,
  );
  assert.equal(duped.total, 1);
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

test("every built-in course produces clue-safe assessment prompts", () => {
  const courses = [
    importedSpanishCourse,
    mandarinFoundationsCourse,
    completeMandarinCourse,
    chineseConversationStarterCourse,
    ...englishWordCourses,
    ...advancedEnglishCourses,
    ...linguifyCefrCourses,
  ];
  const challenges = courses
    .flatMap((course) => course.units)
    .flatMap((unit) => unit.lessons)
    .flatMap((lesson) => lesson.challenges);

  assert.ok(challenges.length > 2_000);
  assert.ok(challenges.every((challenge) => languageQuestPracticePrompt(challenge.question).length > 0));
  assert.ok(challenges.every((challenge) =>
    !/(?:Pronunciation|Example)\s*:/iu.test(languageQuestPracticePrompt(challenge.question)),
  ));
});
