import assert from "node:assert/strict";
import test from "node:test";
import { k12MathCourses } from "../../languageQuestK12MathCourses";
import {
  LANGUAGE_QUEST_FINAL_EXAM_MIN_QUESTIONS,
  LANGUAGE_QUEST_FINAL_EXAM_TYPES,
} from "../../shared/languageQuestFinalExam";

test("K-12 mathematics curricula are structurally valid", () => {
  const mathCourses = k12MathCourses.filter((course) => course.code.startsWith("MRLC-K12-MATH-"));
  assert.equal(mathCourses.length, 13);
  assert.equal(new Set(k12MathCourses.map((course) => course.code)).size, k12MathCourses.length);
  assert.deepEqual(
    mathCourses.map((course) => course.code),
    ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
      .map((grade) => `MRLC-K12-MATH-${grade}-V1`),
  );
  let challengeCount = 0;
  for (const course of mathCourses) {
    assert.equal(course.category, "Mathematics Courses");
    assert.equal(course.language, "Mathematics");
    assert.equal(course.published, true);
    assert.equal(course.imageEmoji, "");
    assert.equal(course.units.length, 8);
    let examQuestionCount = 0;
    for (const unit of course.units) {
      assert.equal(unit.lessons.length, 3);
      for (const lesson of unit.lessons) {
        assert.equal(lesson.challenges.length, 6);
        for (const challenge of lesson.challenges) {
          challengeCount += 1;
          if (LANGUAGE_QUEST_FINAL_EXAM_TYPES.has(challenge.type)) examQuestionCount += 1;
          assert.ok(challenge.question.trim());
          assert.ok(challenge.explanation?.trim());
          assert.equal(
            new Set(challenge.options.map((option) => option.text.trim().toLowerCase())).size,
            challenge.options.length,
            `${course.code}: duplicate options in ${challenge.question}`,
          );
          const correct = challenge.options.filter((option) => option.correct).length;
          if (challenge.type === "MATCHING" || challenge.type === "REORDER") {
            assert.equal(correct, challenge.options.length);
          } else {
            assert.equal(correct, 1);
          }
          assert.ok(challenge.options.every((option) => option.emoji === null && option.audioText === null));
        }
      }
    }
    assert.ok(examQuestionCount >= LANGUAGE_QUEST_FINAL_EXAM_MIN_QUESTIONS);
  }
  assert.equal(challengeCount, 1872);
});
