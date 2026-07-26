import generatedCourses from "./curricula/language-quest/linguify-cefr-courses.generated.json";
import type { OfficialLanguageQuestCourse } from "./languageQuestImportedCourses";

export const linguifyCefrCourses = generatedCourses as unknown as OfficialLanguageQuestCourse[];
