import assert from 'node:assert/strict';
import test from 'node:test';
import { gedScienceCourse } from '../../languageQuestGedScienceCourse';
import { LANGUAGE_QUEST_FINAL_EXAM_MIN_QUESTIONS, LANGUAGE_QUEST_FINAL_EXAM_TYPES } from '../../shared/languageQuestFinalExam';
import { languageQuestCourseUsesStudyCards } from '../../shared/languageQuest';

const SCIENCE_V2_PREFIX = 'SCIENCE_V2::';
const VISUAL_TYPES = new Set(['process', 'table', 'formula', 'bar', 'line', 'layers', 'compare', 'evidence']);

test('GED Science V2 is a complete subject course without lesson emojis', () => {
  assert.equal(gedScienceCourse.code, 'MRLC-GED-SCIENCE-V2');
  assert.equal(gedScienceCourse.imageEmoji, '');
  assert.equal(gedScienceCourse.units.length, 3);
  assert.equal(languageQuestCourseUsesStudyCards(gedScienceCourse.language), false);

  const lessons = gedScienceCourse.units.flatMap((unit) => unit.lessons);
  const challenges = lessons.flatMap((lesson) => lesson.challenges);
  assert.equal(lessons.length, 38);
  assert.equal(challenges.length, 114);
  assert.equal(new Set(lessons.map((lesson) => lesson.title)).size, lessons.length);
  assert.equal(new Set(challenges.map((challenge) => challenge.question)).size, challenges.length);

  let finalExamQuestionCount = 0;
  for (const lesson of lessons) {
    assert.ok(lesson.title.trim());
    assert.ok(lesson.description.trim());
    assert.ok(lesson.conceptIntro?.startsWith(SCIENCE_V2_PREFIX));
    const concept = JSON.parse(lesson.conceptIntro!.slice(SCIENCE_V2_PREFIX.length));
    assert.equal(concept.version, 2);
    assert.ok(concept.summary.trim());
    assert.ok(Array.isArray(concept.objectives) && concept.objectives.length > 0);
    assert.ok(Array.isArray(concept.explanation) && concept.explanation.length > 0);
    assert.ok(VISUAL_TYPES.has(concept.visual?.type));

    for (const challenge of lesson.challenges) {
      if (LANGUAGE_QUEST_FINAL_EXAM_TYPES.has(challenge.type)) finalExamQuestionCount += 1;
      assert.equal(challenge.type, 'SELECT');
      assert.ok(challenge.explanation?.trim());
      assert.ok(challenge.hint?.trim());
      assert.equal(challenge.options.length, 4);
      assert.equal(challenge.options.filter((option) => option.correct).length, 1);
      assert.equal(new Set(challenge.options.map((option) => option.text)).size, challenge.options.length);
      assert.ok(challenge.options.every((option) => option.emoji === null && option.audioText === null));
    }
  }
  assert.ok(finalExamQuestionCount >= LANGUAGE_QUEST_FINAL_EXAM_MIN_QUESTIONS);
});
