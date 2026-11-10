import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateGedExpression, formatGedCalculatorValue } from '../../shared/gedCalculator';
import {
  groupLanguageQuestExamDeckBySource,
  languageQuestConceptStimulus,
  languageQuestGedExamProfile,
  languageQuestGedReadiness,
  LANGUAGE_QUEST_GED_EXAM_MAX_QUESTIONS,
} from '../../shared/languageQuestGedExam';
import { gedMathCourse } from '../../languageQuestGedMathCourse';
import { gedRlaCourse } from '../../languageQuestGedRlaCourse';
import { gedScienceCourse } from '../../languageQuestGedScienceCourse';
import { gedSocialStudiesCourse } from '../../languageQuestGedSocialStudiesCourse';
import { LANGUAGE_QUEST_FINAL_EXAM_TYPES } from '../../shared/languageQuestFinalExam';

test('every GED Preparation course gets real GED pacing and tools', () => {
  const math = languageQuestGedExamProfile(gedMathCourse);
  const rla = languageQuestGedExamProfile(gedRlaCourse);
  const science = languageQuestGedExamProfile(gedScienceCourse);
  const socialStudies = languageQuestGedExamProfile(gedSocialStudiesCourse);

  assert.deepEqual(
    [math, rla, science, socialStudies].map((profile) => [profile?.subject, profile?.questionCount, profile?.minutes]),
    [['mathematics', 46, 115], ['rla', 46, 95], ['science', 34, 90], ['social-studies', 35, 70]],
  );
  assert.equal(math?.noCalculatorQuestions, 5);
  assert.equal(math?.formulaSheet, true);
  assert.equal(rla?.calculator, false);
  assert.equal(science?.calculator, true);
  assert.equal(LANGUAGE_QUEST_GED_EXAM_MAX_QUESTIONS, 46);

  // Each course's question bank can fill a full-length practice test.
  for (const [course, profile] of [[gedMathCourse, math], [gedRlaCourse, rla], [gedScienceCourse, science], [gedSocialStudiesCourse, socialStudies]] as const) {
    const eligible = course.units.flatMap((unit) => unit.lessons.flatMap((lesson) => lesson.challenges))
      .filter((challenge) => LANGUAGE_QUEST_FINAL_EXAM_TYPES.has(challenge.type));
    assert.ok(eligible.length >= (profile?.questionCount ?? Infinity), course.code);
  }
});

test('only GED Preparation courses use the GED practice-test format', () => {
  assert.equal(languageQuestGedExamProfile({ category: 'Mathematics', language: 'K-12 Math Grade 6' }), null);
  assert.equal(languageQuestGedExamProfile({ category: 'GED Preparation', language: 'Spanish' }), null);
  assert.equal(languageQuestGedExamProfile({ category: null, language: 'GED Science' }), null);
});

test('GED decks keep questions about one source together in authored order', () => {
  const deck = [
    { id: 'b2', source: 'B', order: 2 },
    { id: 'a1', source: 'A', order: 1 },
    { id: 'b0', source: 'B', order: 0 },
    { id: 'c0', source: 'C', order: 0 },
    { id: 'a0', source: 'A', order: 0 },
  ];
  const grouped = groupLanguageQuestExamDeckBySource(deck, (item) => item.source, (item) => item.order);
  assert.deepEqual(grouped.map((item) => item.id), ['b0', 'b2', 'a0', 'a1', 'c0']);
});

test('Science and Social Studies lessons expose their source visual for exam questions', () => {
  const scienceLesson = gedScienceCourse.units[0].lessons[0];
  const socialLesson = gedSocialStudiesCourse.units[0].lessons[0];
  assert.equal(languageQuestConceptStimulus(scienceLesson.conceptIntro)?.type, 'table');
  assert.equal(languageQuestConceptStimulus(socialLesson.conceptIntro)?.type, 'table');
  // RLA keeps its passage inside the question; Math questions stand alone.
  assert.equal(languageQuestConceptStimulus(gedRlaCourse.units[0].lessons[0].conceptIntro), null);
  assert.equal(languageQuestConceptStimulus(gedMathCourse.units[0].lessons[0].conceptIntro), null);
  assert.equal(languageQuestConceptStimulus('SCIENCE_V2::{not json'), null);
  assert.equal(languageQuestConceptStimulus(null), null);
});

test('GED readiness bands follow the practice score', () => {
  assert.equal(languageQuestGedReadiness(85), 'on-track');
  assert.equal(languageQuestGedReadiness(80), 'on-track');
  assert.equal(languageQuestGedReadiness(70), 'close');
  assert.equal(languageQuestGedReadiness(59), 'not-yet');
});

test('the GED calculator evaluates test-style expressions without eval', () => {
  const value = (expression: string) => {
    const result = evaluateGedExpression(expression);
    assert.ok('value' in result, `${expression}: ${'error' in result ? result.error : ''}`);
    return result.value;
  };
  assert.equal(value('2+3×4'), 14);
  assert.equal(value('(2+3)×4'), 20);
  assert.equal(value('900×0.06×8÷12'), 36);
  assert.equal(value('2^3^2'), 512);
  assert.equal(value('−3^2'), -9);
  assert.equal(value('√(144)'), 12);
  assert.equal(value('√144+1'), 13);
  assert.equal(value('2(3+4)'), 14);
  assert.equal(value('25%×80'), 20);
  assert.equal(value('(5+3'), 8);
  assert.equal(formatGedCalculatorValue(value('3.14×3^2×10')), '282.6');
  assert.equal(formatGedCalculatorValue(value('0.1+0.2')), '0.3');
  assert.equal(formatGedCalculatorValue(value('2π')), '6.283185307');

  for (const bad of ['', '5÷0', '√(−4)', '3+', '2..5', 'alert(1)', '4)']) {
    assert.equal(evaluateGedExpression(bad).ok, false, bad);
  }
});
