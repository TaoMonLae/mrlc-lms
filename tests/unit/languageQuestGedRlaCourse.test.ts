import assert from 'node:assert/strict';
import test from 'node:test';
import { gedRlaCourse } from '../../languageQuestGedRlaCourse';
import { languageQuestCourseUsesStudyCards } from '../../shared/languageQuest';
import { LANGUAGE_QUEST_FINAL_EXAM_MIN_QUESTIONS, LANGUAGE_QUEST_FINAL_EXAM_TYPES } from '../../shared/languageQuestFinalExam';
import { parseScienceConcept } from '../../src/components/games/LanguageQuestScienceConcept';

const PREFIX = 'RLA_V1::';

test('GED RLA is comprehensive, source-balanced, and assessment-ready', () => {
  assert.equal(gedRlaCourse.code, 'MRLC-GED-RLA-V1');
  assert.equal(gedRlaCourse.category, 'GED Preparation');
  assert.equal(gedRlaCourse.imageEmoji, '');
  assert.equal(gedRlaCourse.published, true);
  assert.equal(languageQuestCourseUsesStudyCards(gedRlaCourse.language), false);
  assert.deepEqual(gedRlaCourse.units.map((unit) => unit.lessons.length), [10, 8, 6, 8]);

  const lessons = gedRlaCourse.units.flatMap((unit) => unit.lessons);
  const challenges = lessons.flatMap((lesson) => lesson.challenges);
  assert.equal(lessons.length, 32);
  assert.equal(challenges.length, 96);
  assert.equal(new Set(lessons.map((lesson) => lesson.title)).size, lessons.length);
  assert.equal(new Set(challenges.map((challenge) => challenge.question)).size, challenges.length);

  const sourceTypes = new Map<string, number>();
  let finalExamQuestionCount = 0;
  for (const lesson of lessons) {
    assert.ok(lesson.title.trim());
    assert.ok(lesson.description.trim());
    assert.ok(lesson.conceptIntro?.startsWith(PREFIX));
    assert.ok(lesson.conceptIntro!.length <= 4000);
    const concept = JSON.parse(lesson.conceptIntro!.slice(PREFIX.length));
    assert.equal(concept.version, 1);
    assert.equal(concept.subject, 'rla');
    assert.equal(concept.visual?.type, 'passage');
    assert.equal(concept.visual?.kind, concept.sourceType);
    assert.match(concept.visual?.attribution, /Original MRLC/);
    assert.ok(concept.visual?.text.trim().length >= 120);
    assert.ok(Array.isArray(concept.objectives) && concept.objectives.length === 3);
    assert.equal(concept.explanation.length, 2);
    assert.ok(concept.gedStrategy.trim());
    assert.ok(concept.checkpoint.trim());
    assert.equal(parseScienceConcept(lesson.conceptIntro!)?.subject, 'rla');
    sourceTypes.set(concept.sourceType, (sourceTypes.get(concept.sourceType) || 0) + 1);

    assert.equal(lesson.challenges.length, 3);
    for (const challenge of lesson.challenges) {
      if (LANGUAGE_QUEST_FINAL_EXAM_TYPES.has(challenge.type)) finalExamQuestionCount += 1;
      assert.equal(challenge.type, 'SELECT');
      assert.ok(challenge.question.startsWith(concept.visual.text));
      assert.ok(challenge.explanation?.trim());
      assert.ok(challenge.hint?.trim());
      assert.equal(challenge.options.length, 4);
      assert.equal(challenge.options.filter((option) => option.correct).length, 1);
      assert.equal(new Set(challenge.options.map((option) => option.text)).size, 4);
      assert.ok(challenge.options.every((option) => option.emoji === null && option.audioText === null));
    }
  }

  assert.deepEqual(Object.fromEntries(sourceTypes), { informational: 10, literary: 8, argument: 6, editing: 8 });
  assert.equal(sourceTypes.get('literary'), lessons.length * 0.25);
  assert.ok(finalExamQuestionCount >= LANGUAGE_QUEST_FINAL_EXAM_MIN_QUESTIONS);
});
