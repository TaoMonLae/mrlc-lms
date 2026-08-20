import assert from 'node:assert/strict';
import test from 'node:test';
import type { OfficialLanguageQuestCourse } from '../../languageQuestImportedCourses';
import { gedMathCourse } from '../../languageQuestGedMathCourse';
import { gedRlaCourse } from '../../languageQuestGedRlaCourse';
import { gedScienceCourse } from '../../languageQuestGedScienceCourse';
import { gedSocialStudiesCourse } from '../../languageQuestGedSocialStudiesCourse';

const courses: OfficialLanguageQuestCourse[] = [
  gedMathCourse,
  gedRlaCourse,
  gedScienceCourse,
  gedSocialStudiesCourse,
];

function wordCount(value: string): number {
  return value.match(/[A-Za-z0-9]+/g)?.length ?? 0;
}

test('GED courses do not expose a reusable correct-option position pattern', () => {
  for (const course of courses) {
    const challenges = course.units.flatMap((unit) =>
      unit.lessons.flatMap((lesson) => lesson.challenges),
    );
    const correctPositions = [0, 0, 0, 0];

    for (const challenge of challenges) {
      correctPositions[challenge.options.findIndex((option) => option.correct)] += 1;
    }

    assert.ok(
      correctPositions.every((count) => count >= challenges.length * 0.15),
      `${course.code} has a predictable correct-position distribution: ${correctPositions.join(', ')}`,
    );
  }
});

test('GED correct answers are not conspicuously more detailed than every distractor', () => {
  for (const course of courses) {
    for (const unit of course.units) {
      for (const lesson of unit.lessons) {
        for (const challenge of lesson.challenges) {
          const correctIndex = challenge.options.findIndex((option) => option.correct);
          const counts = challenge.options.map((option) => wordCount(option.text));
          const longestDistractor = Math.max(...counts.filter((_, index) => index !== correctIndex));

          assert.ok(
            counts[correctIndex] <= longestDistractor + 3,
            `${course.code} correct answer is conspicuously longer: ${lesson.title} — ${challenge.question}`,
          );
        }
      }
    }
  }
});
