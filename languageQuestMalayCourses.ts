import generatedCourses from "./curricula/language-quest/malay-cefr-courses.generated.json";
import type { OfficialLanguageQuestCourse } from "./languageQuestImportedCourses";

// Five CEFR-level Bahasa Malaysia courses (A1-C1) generated from a
// school-provided curriculum snapshot -- see
// scripts/generate-language-quest-malay-courses.mjs for how the source
// content is converted, and curricula/sources/malay/README.md for the
// original package's own caveats. Imported unpublished (published: false)
// pending native-speaker review; an admin can publish each course from the
// Learning Quest course editor once reviewed.
export const malayCefrCourses = generatedCourses as unknown as OfficialLanguageQuestCourse[];
