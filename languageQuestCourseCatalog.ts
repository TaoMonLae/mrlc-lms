import { importedSpanishCourse, type OfficialLanguageQuestCourse } from "./languageQuestImportedCourses";
import { mandarinFoundationsCourse } from "./languageQuestMandarinCourse";
import { completeMandarinCourse } from "./languageQuestCompleteMandarinCourse";
import { chineseConversationStarterCourse } from "./languageQuestChineseConversationCourse";
import { malayCefrCourses } from "./languageQuestMalayCourses";
import { malaySpeakingCourse } from "./languageQuestMalayCourse";
import { malayGuideModernCourse } from "./languageQuestMalayGuideCourse";
import { teachYourselfMalayCourse } from "./languageQuestTeachYourselfMalayCourse";
import { k12MathCourses } from "./languageQuestK12MathCourses";

// Kept separate from the server entry so non-learning requests do not load
// several megabytes of immutable course content. The build emits a private chunk.
export const beforeEnglishCourses: OfficialLanguageQuestCourse[] = [
  importedSpanishCourse, mandarinFoundationsCourse, completeMandarinCourse,
  chineseConversationStarterCourse,
];
export const afterEnglishCourses: OfficialLanguageQuestCourse[] = [
  ...malayCefrCourses, malaySpeakingCourse, malayGuideModernCourse,
  teachYourselfMalayCourse, ...k12MathCourses,
];
