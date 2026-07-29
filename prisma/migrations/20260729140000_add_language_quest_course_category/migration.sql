ALTER TABLE "LanguageQuestCourse"
ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Other Courses';

UPDATE "LanguageQuestCourse"
SET "category" = CASE
  WHEN LOWER("language") LIKE '%chinese%' OR LOWER("language") LIKE '%mandarin%' THEN 'Chinese Courses'
  WHEN LOWER("language") LIKE '%english%' THEN 'English Courses'
  WHEN LOWER("language") LIKE '%spanish%' THEN 'Spanish Courses'
  ELSE 'Other Courses'
END;

CREATE INDEX "LanguageQuestCourse_category_idx"
ON "LanguageQuestCourse"("category");
