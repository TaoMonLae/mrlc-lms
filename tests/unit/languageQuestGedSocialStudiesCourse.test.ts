import assert from 'node:assert/strict';
import test from 'node:test';
import { gedSocialStudiesCourse } from '../../languageQuestGedSocialStudiesCourse';
import { LANGUAGE_QUEST_FINAL_EXAM_MIN_QUESTIONS, LANGUAGE_QUEST_FINAL_EXAM_TYPES } from '../../shared/languageQuestFinalExam';
import { languageQuestCourseUsesStudyCards } from '../../shared/languageQuest';
import { parseScienceConcept } from '../../src/components/games/LanguageQuestScienceConcept';

const PREFIX = 'SOCIAL_STUDIES_V1::';
const VISUAL_TYPES = new Set(['process', 'table', 'bar', 'line', 'compare', 'evidence']);

test('GED Social Studies is complete, weighted, and assessment-ready', () => {
  assert.equal(gedSocialStudiesCourse.code, 'MRLC-GED-SOCIAL-STUDIES-V1');
  assert.equal(gedSocialStudiesCourse.category, 'GED Preparation');
  assert.equal(gedSocialStudiesCourse.imageEmoji, '');
  assert.equal(gedSocialStudiesCourse.published, true);
  assert.equal(languageQuestCourseUsesStudyCards(gedSocialStudiesCourse.language), false);
  assert.deepEqual(gedSocialStudiesCourse.units.map((unit) => unit.lessons.length), [20, 8, 6, 6]);

  const lessons = gedSocialStudiesCourse.units.flatMap((unit) => unit.lessons);
  const challenges = lessons.flatMap((lesson) => lesson.challenges);
  assert.equal(lessons.length, 40);
  assert.equal(challenges.length, 120);
  assert.equal(new Set(lessons.map((lesson) => lesson.title)).size, lessons.length);
  assert.equal(new Set(challenges.map((challenge) => challenge.question)).size, challenges.length);

  let finalExamQuestionCount = 0;
  for (const lesson of lessons) {
    assert.ok(lesson.title.trim());
    assert.ok(lesson.description.trim());
    assert.ok(lesson.conceptIntro?.startsWith(PREFIX));
    assert.ok(lesson.conceptIntro!.length <= 4000);
    const concept = JSON.parse(lesson.conceptIntro!.slice(PREFIX.length));
    assert.equal(concept.version, 1);
    assert.equal(concept.subject, 'social-studies');
    assert.ok(concept.summary.trim());
    assert.ok(Array.isArray(concept.objectives) && concept.objectives.length >= 3);
    assert.equal(concept.explanation.length, 2);
    assert.ok(VISUAL_TYPES.has(concept.visual?.type));
    assert.ok(concept.gedStrategy.trim());
    assert.ok(concept.checkpoint.trim());
    assert.equal(parseScienceConcept(lesson.conceptIntro!)?.subject, 'social-studies');

    assert.equal(lesson.challenges.length, 3);
    for (const challenge of lesson.challenges) {
      if (LANGUAGE_QUEST_FINAL_EXAM_TYPES.has(challenge.type)) finalExamQuestionCount += 1;
      assert.equal(challenge.type, 'SELECT');
      assert.ok(challenge.explanation?.trim());
      assert.ok(challenge.hint?.trim());
      assert.equal(challenge.options.length, 4);
      assert.equal(challenge.options.filter((option) => option.correct).length, 1);
      assert.equal(new Set(challenge.options.map((option) => option.text)).size, 4);
      assert.ok(challenge.options.every((option) => option.emoji === null && option.audioText === null));
    }
  }
  assert.ok(finalExamQuestionCount >= LANGUAGE_QUEST_FINAL_EXAM_MIN_QUESTIONS);
});
