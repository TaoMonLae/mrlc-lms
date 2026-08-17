import test from "node:test";
import assert from "node:assert/strict";
import {
  LANGUAGE_QUEST_FINAL_EXAM_PASS_RATIO,
  LANGUAGE_QUEST_FINAL_EXAM_MIN_QUESTIONS,
  LANGUAGE_QUEST_FINAL_EXAM_TYPES,
  languageQuestFinalExamRequiredCorrect,
  languageQuestFinalExamResult,
  languageQuestFinalExamRetryAt,
  languageQuestFinalExamSubmissionMatchesDeck,
  languageQuestFinalExamTypeIsEligible,
} from "../../shared/languageQuestFinalExam";

test("final exam uses an 80% pass mark rounded up", () => {
  assert.equal(LANGUAGE_QUEST_FINAL_EXAM_PASS_RATIO, 0.8);
  assert.equal(LANGUAGE_QUEST_FINAL_EXAM_MIN_QUESTIONS, 10);
  assert.equal(languageQuestFinalExamRequiredCorrect(25), 20);
  assert.equal(languageQuestFinalExamRequiredCorrect(7), 6);
  assert.equal(languageQuestFinalExamRequiredCorrect(1), 1);
});

test("final exam submission must match the one-time deck in order", () => {
  const deck = ["one", "two", "three"];
  assert.equal(languageQuestFinalExamSubmissionMatchesDeck(deck, ["one", "two", "three"]), true);
  assert.equal(languageQuestFinalExamSubmissionMatchesDeck(deck, ["three", "two", "one"]), false);
  assert.equal(languageQuestFinalExamSubmissionMatchesDeck(deck, ["one", "two"]), false);
  assert.equal(languageQuestFinalExamSubmissionMatchesDeck(deck, ["one", "one", "three"]), false);
});

test("final exam grading never trusts client correctness", () => {
  const answerKey = Array.from({ length: 10 }, (_, index) => ({
    challengeId: `challenge-${index}`,
    correctOptionId: `right-${index}`,
  }));
  const passing = languageQuestFinalExamResult(
    answerKey.map((entry, index) => ({
      challengeId: entry.challengeId,
      optionId: index < 8 ? entry.correctOptionId : `wrong-${index}`,
    })),
    answerKey,
  );
  assert.equal(passing.correctCount, 8);
  assert.equal(passing.scorePercent, 80);
  assert.equal(passing.passed, true);

  const failing = languageQuestFinalExamResult(
    answerKey.map((entry, index) => ({
      challengeId: entry.challengeId,
      optionId: index < 7 ? entry.correctOptionId : null,
    })),
    answerKey,
  );
  assert.equal(failing.scorePercent, 70);
  assert.equal(failing.passed, false);
});

test("final exam includes and server-grades typed spelling questions", () => {
  assert.equal(LANGUAGE_QUEST_FINAL_EXAM_TYPES.has("DICTATION"), true);

  const answerKey = [{
    challengeId: "spelling-1",
    type: "DICTATION",
    correctOptionId: "server-only-option",
    correctText: "Good morning!",
  }];
  const correct = languageQuestFinalExamResult(
    [{ challengeId: "spelling-1", optionId: null, typedAnswer: "good morning" }],
    answerKey,
  );
  assert.equal(correct.correctCount, 1);

  const cannotSpoofWithOptionId = languageQuestFinalExamResult(
    [{ challengeId: "spelling-1", optionId: "server-only-option", typedAnswer: "good evening" }],
    answerKey,
  );
  assert.equal(cannotSpoofWithOptionId.correctCount, 0);
});

test("certificate dictation requires protected server audio", () => {
  assert.equal(languageQuestFinalExamTypeIsEligible("SELECT", false), true);
  assert.equal(languageQuestFinalExamTypeIsEligible("DICTATION", false), false);
  assert.equal(languageQuestFinalExamTypeIsEligible("DICTATION", true), true);
});

test("failed and terminated attempts require a review break", () => {
  const submittedAt = new Date("2026-08-06T00:00:00.000Z");
  assert.equal(
    languageQuestFinalExamRetryAt({ status: "FAILED", submittedAt })?.toISOString(),
    "2026-08-06T00:15:00.000Z",
  );
  assert.equal(languageQuestFinalExamRetryAt({ status: "PASSED", submittedAt }), null);
  assert.equal(languageQuestFinalExamRetryAt({ status: "IN_PROGRESS", submittedAt }), null);
});
