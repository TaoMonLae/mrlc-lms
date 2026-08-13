import type { OfficialLanguageQuestCourse } from "./languageQuestImportedCourses";
import { gedScienceV2Course } from "./languageQuestGedScienceV2Content";

// Keep the structured SCIENCE_V2 concept payload intact. The lesson player
// renders it as accessible tables, diagrams, charts, and learning blocks.
export const gedScienceCourse: OfficialLanguageQuestCourse = gedScienceV2Course;
