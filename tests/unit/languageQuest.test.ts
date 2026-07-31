import assert from "node:assert/strict";
import test from "node:test";
import {
  bossBattleResult,
  isValidMatchingSubmission,
  isValidReorderSubmission,
  languageQuestPracticePrompt,
  languageQuestLookupWord,
  matchingChallengeIsCorrect,
  nextLanguageQuestStreak,
  normalizeSentenceAnswer,
  pairedMatchAnswerSummary,
  reorderChallengeIsCorrect,
  sentenceAnswerMatches,
} from "../../shared/languageQuest";
import { canAttemptNewChallenge, nextIncompleteLessonId, normalizeCourseDraft, shuffle } from "../../languageQuest";
import {
  LANGUAGE_QUEST_AVATARS,
  isLanguageQuestAvatarId,
} from "../../shared/languageQuestAvatars";
import { importedSpanishCourse } from "../../languageQuestImportedCourses";
import { mandarinFoundationsCourse } from "../../languageQuestMandarinCourse";
import { completeMandarinCourse } from "../../languageQuestCompleteMandarinCourse";
import { chineseConversationStarterCourse } from "../../languageQuestChineseConversationCourse";
import { englishWordCourses } from "../../languageQuestEnglishWordCourses";
import { normalizeChallenge } from "../../englishWordPractice";
import { advancedEnglishCourses } from "../../languageQuestAdvancedEnglishCourses";
import { linguifyCefrCourses } from "../../languageQuestLinguifyCourses";
import { malayCefrCourses } from "../../languageQuestMalayCourses";
import { malaySpeakingCourse } from "../../languageQuestMalayCourse";
import { malayGuideModernCourse } from "../../languageQuestMalayGuideCourse";
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

test("reorderChallengeIsCorrect only accepts the exact canonical sequence", () => {
  const canonical = ["a", "b", "c"];

  assert.equal(reorderChallengeIsCorrect(canonical, ["a", "b", "c"]), true);
  assert.equal(reorderChallengeIsCorrect(canonical, ["b", "a", "c"]), false);
  assert.equal(reorderChallengeIsCorrect(canonical, ["a", "b"]), false);
  assert.equal(reorderChallengeIsCorrect(canonical, null), false);
  assert.equal(reorderChallengeIsCorrect(canonical, undefined), false);
  assert.equal(reorderChallengeIsCorrect(canonical, []), false);
});

test("isValidReorderSubmission rejects anything that isn't a genuine permutation", () => {
  const canonical = ["a", "b", "c"];

  // A well-formed submission: every id present exactly once, any order.
  assert.equal(isValidReorderSubmission(canonical, ["c", "a", "b"]), true);
  // Still "valid" (well-formed) even though it would grade as wrong.
  assert.equal(isValidReorderSubmission(canonical, ["a", "c", "b"]), true);

  // Wrong length.
  assert.equal(isValidReorderSubmission(canonical, ["a", "b"]), false);
  assert.equal(isValidReorderSubmission(canonical, ["a", "b", "c", "a"]), false);
  // Duplicate id standing in for a missing one.
  assert.equal(isValidReorderSubmission(canonical, ["a", "a", "c"]), false);
  // Id that doesn't belong to this challenge at all.
  assert.equal(isValidReorderSubmission(canonical, ["a", "b", "z"]), false);
  // Missing / malformed submissions.
  assert.equal(isValidReorderSubmission(canonical, null), false);
  assert.equal(isValidReorderSubmission(canonical, undefined), false);
});

test("matchingChallengeIsCorrect only accepts pairs that share a canonical pair index", () => {
  // Three pairs: (a0,a1), (b0,b1), (c0,c1) -- index 2k/2k+1 per pair.
  const canonical = ["a0", "a1", "b0", "b1", "c0", "c1"];

  assert.equal(matchingChallengeIsCorrect(canonical, [["a0", "a1"], ["b0", "b1"], ["c0", "c1"]]), true);
  // Order of the pairs, and order within a pair, doesn't matter.
  assert.equal(matchingChallengeIsCorrect(canonical, [["c1", "c0"], ["a1", "a0"], ["b0", "b1"]]), true);
  // One wrong pairing fails the whole submission.
  assert.equal(matchingChallengeIsCorrect(canonical, [["a0", "b1"], ["b0", "a1"], ["c0", "c1"]]), false);
  assert.equal(matchingChallengeIsCorrect(canonical, null), false);
  assert.equal(matchingChallengeIsCorrect(canonical, []), false);
});

test("isValidMatchingSubmission rejects anything that isn't a genuine full pairing", () => {
  const canonical = ["a0", "a1", "b0", "b1", "c0", "c1"];

  // Well-formed: every tile paired exactly once, any grouping.
  assert.equal(isValidMatchingSubmission(canonical, [["a0", "b1"], ["b0", "a1"], ["c0", "c1"]]), true);

  // Wrong pair count.
  assert.equal(isValidMatchingSubmission(canonical, [["a0", "a1"], ["b0", "b1"]]), false);
  // A tile paired with itself.
  assert.equal(isValidMatchingSubmission(canonical, [["a0", "a0"], ["b0", "b1"], ["c0", "c1"]]), false);
  // A tile reused across two pairs, leaving another tile unpaired.
  assert.equal(isValidMatchingSubmission(canonical, [["a0", "a1"], ["a0", "b1"], ["c0", "c1"]]), false);
  // Id that doesn't belong to this challenge at all.
  assert.equal(isValidMatchingSubmission(canonical, [["a0", "a1"], ["b0", "b1"], ["c0", "z"]]), false);
  // Missing / malformed submissions.
  assert.equal(isValidMatchingSubmission(canonical, null), false);
  assert.equal(isValidMatchingSubmission(canonical, undefined), false);
});

test("pairedMatchAnswerSummary joins consecutive option pairs as a readable left-to-right list", () => {
  const options = [
    { text: "Selamat pagi" }, { text: "Good morning" },
    { text: "Terima kasih" }, { text: "Thank you" },
  ];
  assert.equal(pairedMatchAnswerSummary(options), "Selamat pagi → Good morning; Terima kasih → Thank you");
  assert.equal(pairedMatchAnswerSummary([]), "");
});

// Course Studio (the manage/courses editor) loads and re-saves any course,
// including generator-built ones like the Malay CEFR courses that contain
// REORDER/CLOZE/MINIMAL_PAIR_LISTENING challenges. normalizeCourseDraft() is
// what the save/publish endpoint runs the submitted course through, so it
// must recognize every challenge type Language Quest supports instead of
// collapsing anything but ASSIST down to SELECT (which used to silently
// corrupt saved challenges) or requiring "exactly one correct option" for
// every type (which used to reject REORDER/MATCHING outright with a "Course
// X needs exactly one correct answer" error -- the reported "unable to
// publish due to missing answer" bug).
function draftChallenge(type: string, options: Array<{ text: string; correct: boolean }>) {
  return {
    title: "Test course", language: "Malay", published: true,
    units: [{
      title: "Unit 1",
      lessons: [{
        title: "Lesson 1",
        challenges: [{ type, question: "Test question?", options }],
      }],
    }],
  };
}

test("normalizeCourseDraft preserves every supported challenge type instead of collapsing to SELECT", () => {
  for (const type of [
    "SELECT", "ASSIST", "CLOZE", "ODD_ONE_OUT", "MINIMAL_PAIR_LISTENING", "GRAMMAR_TRANSFORM",
  ]) {
    const raw = draftChallenge(type, [
      { text: "Right", correct: true },
      { text: "Wrong", correct: false },
    ]);
    const result = normalizeCourseDraft(raw);
    assert.equal(result.error, undefined, `${type} should normalize without error`);
    assert.equal(result.value?.units[0].lessons[0].challenges[0].type, type);
  }
});

test("normalizeCourseDraft accepts REORDER and MATCHING challenges with every option marked correct", () => {
  const reorderRaw = draftChallenge("REORDER", [
    { text: "Saya", correct: true },
    { text: "dari", correct: true },
    { text: "Myanmar", correct: true },
  ]);
  const reorderResult = normalizeCourseDraft(reorderRaw);
  assert.equal(reorderResult.error, undefined);
  assert.equal(reorderResult.value?.units[0].lessons[0].challenges[0].type, "REORDER");

  const matchingRaw = draftChallenge("MATCHING", [
    { text: "Selamat pagi", correct: true },
    { text: "Good morning", correct: true },
    { text: "Terima kasih", correct: true },
    { text: "Thank you", correct: true },
  ]);
  const matchingResult = normalizeCourseDraft(matchingRaw);
  assert.equal(matchingResult.error, undefined);
  assert.equal(matchingResult.value?.units[0].lessons[0].challenges[0].type, "MATCHING");

  // A REORDER/MATCHING challenge with an option NOT marked correct is invalid.
  const badReorder = draftChallenge("REORDER", [
    { text: "Saya", correct: true },
    { text: "dari", correct: false },
  ]);
  assert.ok(normalizeCourseDraft(badReorder).error);

  // MATCHING needs an even number of options to form pairs.
  const oddMatching = draftChallenge("MATCHING", [
    { text: "a", correct: true },
    { text: "b", correct: true },
    { text: "c", correct: true },
  ]);
  assert.ok(normalizeCourseDraft(oddMatching).error);

  // A REORDER challenge can exceed the normal 6-option multiple-choice cap.
  const longReorder = draftChallenge("REORDER", Array.from({ length: 9 }, (_, i) => ({ text: `word${i}`, correct: true })));
  assert.equal(normalizeCourseDraft(longReorder).error, undefined);
});

test("normalizeCourseDraft accepts a DICTATION challenge with a single correct option", () => {
  const raw = draftChallenge("DICTATION", [{ text: "Selamat pagi", correct: true }]);
  const result = normalizeCourseDraft(raw);
  assert.equal(result.error, undefined);
  assert.equal(result.value?.units[0].lessons[0].challenges[0].type, "DICTATION");
});

test("normalizeCourseDraft still requires exactly one correct option for ordinary SELECT-shaped types", () => {
  const noCorrect = draftChallenge("SELECT", [
    { text: "a", correct: false },
    { text: "b", correct: false },
  ]);
  assert.ok(normalizeCourseDraft(noCorrect).error);

  const twoCorrect = draftChallenge("CLOZE", [
    { text: "a", correct: true },
    { text: "b", correct: true },
  ]);
  assert.ok(normalizeCourseDraft(twoCorrect).error);
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

test("the Malay CEFR import produces five complete, unpublished A1-C1 courses", () => {
  const units = malayCefrCourses.flatMap((course) => course.units);
  const lessons = units.flatMap((unit) => unit.lessons);
  const challenges = lessons.flatMap((lesson) => lesson.challenges);

  assert.deepEqual(
    malayCefrCourses.map((course) => course.code),
    ["A1", "A2", "B1", "B2", "C1"].map((level) => `MRLC-MALAY-${level}-V1`),
  );
  assert.equal(malayCefrCourses.length, 5);
  assert.equal(units.length, 46);
  assert.ok(lessons.length > 0);
  assert.ok(challenges.length > 0);
  assert.ok(malayCefrCourses.every((course) => course.language === "Malay"));
  // The source package's own README says this content needs native-speaker
  // review before going live -- these courses must stay unpublished drafts
  // until a teacher/admin reviews and publishes them from the editor.
  assert.ok(malayCefrCourses.every((course) => !course.published));
  assert.ok(lessons.every((lesson) => lesson.challenges.length > 0));
  // REORDER challenges are built from a sentence's own word tokens, so they
  // can run longer than the 2-6 option bank used for multiple choice; every
  // other challenge type must stay within that bank size.
  assert.ok(challenges.every((challenge) => {
    if (challenge.type === "REORDER") return challenge.options.length >= 2;
    return challenge.options.length >= 2 && challenge.options.length <= 6;
  }));
  // REORDER challenges have no single "correct option" -- the whole option
  // list is the canonical answer sequence, so every option is marked correct.
  // Every other challenge type still needs exactly one correct option.
  assert.ok(challenges.every((challenge) => {
    if (challenge.type === "REORDER") {
      return challenge.options.every((option) => option.correct);
    }
    return challenge.options.filter((option) => option.correct).length === 1;
  }));
  assert.ok(challenges.some((challenge) => challenge.type === "REORDER"));
  assert.ok(challenges.some((challenge) => challenge.type === "CLOZE"));
  assert.ok(challenges.some((challenge) => challenge.type === "MINIMAL_PAIR_LISTENING"));
  // The homograph minimal-pair source exercise ("perang" = war vs. blond/
  // brown) can't become a MINIMAL_PAIR_LISTENING challenge -- its two option
  // texts would be identical -- so every MINIMAL_PAIR_LISTENING challenge
  // that *was* generated must have two genuinely distinct option texts.
  assert.ok(challenges.filter((challenge) => challenge.type === "MINIMAL_PAIR_LISTENING").every(
    (challenge) => challenge.options[0].text.trim().toLowerCase() !== challenge.options[1].text.trim().toLowerCase(),
  ));
  assert.ok(challenges.every(
    (challenge) => challenge.options.every((option) => option.audioText === option.text),
  ));
  assert.ok(challenges.every((challenge) => challenge.question.trim().length > 0));
  // No fill-in-the-blank template text should ever surface as an answer option.
  assert.ok(challenges.every((challenge) => challenge.options.every((option) => !option.text.includes("___"))));
});

test("the Malay speaking and source-guided courses are complete and unpublished", () => {
  for (const course of [malaySpeakingCourse, malayGuideModernCourse]) {
    const lessons = course.units.flatMap((unit) => unit.lessons);
    const challenges = lessons.flatMap((lesson) => lesson.challenges);

    assert.equal(course.language, "Malay");
    assert.equal(course.units.length, 12);
    assert.equal(lessons.length, 48);
    assert.equal(challenges.length, 384);
    // Same review-before-publish policy as every other Malay course.
    assert.ok(!course.published);
    assert.ok(challenges.every((challenge) => challenge.options.length === 3));
    assert.ok(challenges.every(
      (challenge) => challenge.options.filter((option) => option.correct).length === 1,
    ));
    assert.ok(challenges.every(
      (challenge) => challenge.options.every((option) => option.audioText === option.text && option.emoji === null),
    ));
  }
  assert.equal(malaySpeakingCourse.code, "MRLC-MALAY-SPEAKING-A1-C1-V1");
  assert.equal(malayGuideModernCourse.code, "MRLC-MALAY-GOVINFO-GUIDE-V1");
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
    ...malayCefrCourses,
    malaySpeakingCourse,
    malayGuideModernCourse,
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

test("normalizeChallenge redacts example sentences that give away the answer", () => {
  const challenge = {
    id: "challenge-1",
    question: "Which noun means \"a bag used for travel\"? Pronunciation: /ˈlʌɡɪdʒ/. Example: \"My luggage is very heavy.\"",
    options: [
      { id: "opt-correct", text: "luggage", correct: true },
      { id: "opt-wrong-1", text: "briefcase", correct: false },
      { id: "opt-wrong-2", text: "umbrella", correct: false },
    ],
    lesson: {
      unit: {
        course: { code: "linguify-b1", title: "Linguify B1", language: "English" },
      },
    },
  };

  const question = normalizeChallenge(challenge, "seed");

  assert.ok(question);
  assert.ok(!question!.prompt.toLowerCase().includes("luggage"));
  assert.ok(!/(?:Pronunciation|Example)\s*:/iu.test(question!.prompt));
  assert.equal(question!.prompt, "Which noun means \"a bag used for travel\"?");
  assert.equal(question!.correctOptionId, "opt-correct");
});
