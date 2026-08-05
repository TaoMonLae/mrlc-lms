import generatedCourses from "./curricula/language-quest/k12-math-courses.generated.json";
import type { OfficialLanguageQuestCourse } from "./languageQuestImportedCourses";

export const k12MathCourses = generatedCourses as unknown as OfficialLanguageQuestCourse[];
