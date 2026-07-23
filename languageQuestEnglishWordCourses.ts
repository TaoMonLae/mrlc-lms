import generatedCourses from "./curricula/language-quest/english-word-courses.generated.json";
import type { OfficialLanguageQuestCourse } from "./languageQuestImportedCourses";

export const englishWordCourses = generatedCourses as unknown as OfficialLanguageQuestCourse[];
