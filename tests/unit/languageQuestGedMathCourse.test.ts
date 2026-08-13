import assert from 'node:assert/strict';
import test from 'node:test';
import { gedMathCourse } from '../../languageQuestGedMathCourse';
import { languageQuestCourseMode, languageQuestCourseUsesStudyCards } from '../../shared/languageQuest';
import { LANGUAGE_QUEST_FINAL_EXAM_MIN_QUESTIONS, LANGUAGE_QUEST_FINAL_EXAM_TYPES } from '../../shared/languageQuestFinalExam';
import { parseScienceConcept } from '../../src/components/games/LanguageQuestScienceConcept';

const PREFIX = 'MATH_V1::';

test('GED Mathematical Reasoning matches the official reporting-category weights', () => {
  assert.equal(gedMathCourse.code, 'MRLC-GED-MATH-V1');
  assert.equal(gedMathCourse.category, 'GED Preparation');
  assert.equal(gedMathCourse.published, true);
  assert.equal(gedMathCourse.imageEmoji, '');
  assert.equal(languageQuestCourseMode(gedMathCourse.language), 'mathematics');
  assert.equal(languageQuestCourseUsesStudyCards(gedMathCourse.language), false);
  assert.deepEqual(gedMathCourse.units.map((unit) => unit.lessons.length), [10, 8, 12, 10]);

  const lessons = gedMathCourse.units.flatMap((unit) => unit.lessons);
  const challenges = lessons.flatMap((lesson) => lesson.challenges);
  assert.equal(lessons.length, 40);
  assert.equal(challenges.length, 120);
  assert.equal(gedMathCourse.units[0].lessons.length / lessons.length, 0.25);
  assert.equal(gedMathCourse.units[1].lessons.length / lessons.length, 0.20);
  assert.equal(gedMathCourse.units[2].lessons.length / lessons.length, 0.30);
  assert.equal(gedMathCourse.units[3].lessons.length / lessons.length, 0.25);
  assert.equal((gedMathCourse.units[0].lessons.length + gedMathCourse.units[1].lessons.length) / lessons.length, 0.45);
  assert.equal((gedMathCourse.units[2].lessons.length + gedMathCourse.units[3].lessons.length) / lessons.length, 0.55);
  assert.equal(new Set(lessons.map((lesson) => lesson.title)).size, lessons.length);
  assert.equal(new Set(challenges.map((challenge) => challenge.question)).size, challenges.length);
});

test('GED Mathematics content is typeset, accessible, and assessment-ready', () => {
  const lessons = gedMathCourse.units.flatMap((unit) => unit.lessons);
  let finalExamQuestionCount = 0;
  let mathPromptCount = 0;

  for (const lesson of lessons) {
    assert.ok(lesson.title.trim());
    assert.ok(lesson.description.trim());
    assert.ok(lesson.conceptIntro?.startsWith(PREFIX));
    assert.ok(lesson.conceptIntro!.length <= 4000);

    const concept = JSON.parse(lesson.conceptIntro!.slice(PREFIX.length));
    assert.equal(concept.version, 1);
    assert.equal(concept.subject, 'mathematics');
    assert.equal(concept.visual?.type, 'formula');
    assert.match(concept.visual.formula, /\$[^$]+\$/);
    assert.match(concept.visual.example, /\$[^$]+\$/);
    assert.equal(parseScienceConcept(lesson.conceptIntro!)?.subject, 'mathematics');
    assert.ok(Array.isArray(concept.objectives) && concept.objectives.length === 3);
    assert.ok(concept.gedStrategy.trim());

    assert.equal(lesson.challenges.length, 3);
    for (const challenge of lesson.challenges) {
      if (LANGUAGE_QUEST_FINAL_EXAM_TYPES.has(challenge.type)) finalExamQuestionCount += 1;
      if (/\$[^$]+\$/.test(challenge.question)) mathPromptCount += 1;
      assert.equal(challenge.type, 'SELECT');
      assert.ok(challenge.question.length <= 1000);
      assert.ok(challenge.explanation?.trim());
      assert.ok(challenge.hint?.trim());
      assert.equal(challenge.options.length, 4);
      assert.equal(challenge.options.filter((option) => option.correct).length, 1);
      assert.equal(new Set(challenge.options.map((option) => option.text)).size, 4);
      assert.ok(challenge.options.every((option) => option.text.length <= 500));
      assert.ok(challenge.options.every((option) => option.emoji === null && option.audioText === null));
      for (const value of [challenge.question, challenge.explanation ?? '', challenge.hint ?? '', ...challenge.options.map((option) => option.text)]) {
        assert.equal((value.match(/\$/g) ?? []).length % 2, 0, `unbalanced math delimiter in: ${value}`);
      }
    }
  }

  assert.ok(mathPromptCount >= 110, 'nearly every question should expose its mathematical notation to the shared renderer');
  assert.ok(finalExamQuestionCount >= LANGUAGE_QUEST_FINAL_EXAM_MIN_QUESTIONS);
});
