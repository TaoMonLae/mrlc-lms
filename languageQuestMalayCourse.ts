import generatedCourse from "./curricula/language-quest/malay-speaking-a1-c1.generated.json";
import type { OfficialLanguageQuestCourse } from "./languageQuestImportedCourses";

export const malaySpeakingCourse = {
  ...(generatedCourse as unknown as OfficialLanguageQuestCourse),
  published: false,
  retired: true,
};
