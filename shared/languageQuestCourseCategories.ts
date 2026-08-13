export const LANGUAGE_QUEST_COURSE_CATEGORIES = [
  "Chinese Courses",
  "English Courses",
  "Spanish Courses",
  "Malay Courses",
  "Mathematics Courses",
  "GED Preparation",
  "Other Courses",
] as const;

export function languageQuestCategoryForLanguage(language: string): string {
  const normalized = language.trim().toLowerCase();
  if (normalized.includes("chinese") || normalized.includes("mandarin")) return "Chinese Courses";
  if (normalized.includes("english")) return "English Courses";
  if (normalized.includes("spanish")) return "Spanish Courses";
  if (normalized.includes("malay") || normalized.includes("bahasa melayu")) return "Malay Courses";
  if (normalized.includes("math")) return "Mathematics Courses";
  if (normalized.includes("ged") || normalized.includes("social studies") || normalized.includes("science") || normalized.includes("rla") || normalized.includes("language arts")) return "GED Preparation";
  return "Other Courses";
}

export function orderedLanguageQuestCategories<T extends { category?: string; language?: string }>(
  courses: T[],
): Array<{ category: string; courses: T[] }> {
  const groups = new Map<string, T[]>();
  for (const course of courses) {
    const category = course.category?.trim()
      || languageQuestCategoryForLanguage(course.language || "");
    groups.set(category, [...(groups.get(category) || []), course]);
  }

  const preferredOrder = new Map<string, number>(
    LANGUAGE_QUEST_COURSE_CATEGORIES.map((category, index) => [category, index]),
  );

  return [...groups.entries()]
    .sort(([left], [right]) => {
      const leftOrder = preferredOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = preferredOrder.get(right) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.localeCompare(right);
    })
    .map(([category, groupedCourses]) => ({ category, courses: groupedCourses }));
}
