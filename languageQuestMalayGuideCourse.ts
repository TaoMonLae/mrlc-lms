import generatedCourse from "./curricula/language-quest/malay-govinfo-guide.generated.json";
import type { OfficialLanguageQuestCourse } from "./languageQuestImportedCourses";

export const malayGuideModernCourse = {
  ...(generatedCourse as unknown as OfficialLanguageQuestCourse),
  published: false,
  retired: true,
};
