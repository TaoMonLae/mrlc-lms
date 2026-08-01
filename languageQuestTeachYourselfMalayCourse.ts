import generatedCourse from "./curricula/language-quest/teach-yourself-malay.generated.json";
import type { OfficialLanguageQuestCourse } from "./languageQuestImportedCourses";

export const teachYourselfMalayCourse = {
  ...(generatedCourse as unknown as OfficialLanguageQuestCourse),
  published: false,
  retired: true,
};
