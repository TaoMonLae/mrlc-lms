import generatedCourses from "./curricula/language-quest/advanced-english-courses.generated.json";
import type { OfficialLanguageQuestCourse } from "./languageQuestImportedCourses";

export const advancedEnglishCourses = generatedCourses as unknown as OfficialLanguageQuestCourse[];
