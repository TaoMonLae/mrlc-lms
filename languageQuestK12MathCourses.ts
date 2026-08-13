import generatedCourses from "./curricula/language-quest/k12-math-courses.generated.json";
import { gedScienceCourse } from "./languageQuestGedScienceCourse";
import { gedSocialStudiesCourse } from "./languageQuestGedSocialStudiesCourse";
import { gedRlaCourse } from "./languageQuestGedRlaCourse";
import { gedMathCourse } from "./languageQuestGedMathCourse";
import type { OfficialLanguageQuestCourse } from "./languageQuestImportedCourses";

const generatedMathCourses = generatedCourses as unknown as OfficialLanguageQuestCourse[];

// Keep subject-area official courses in the same bootstrap collection so the
// existing Learning Quest seeding path can register them without duplicating
// server bootstrap logic.
export const k12MathCourses: OfficialLanguageQuestCourse[] = [
  ...generatedMathCourses,
  gedScienceCourse,
  gedSocialStudiesCourse,
  gedRlaCourse,
  gedMathCourse,
];
