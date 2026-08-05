ALTER TABLE "LanguageQuestFinalExamAttempt"
  ADD COLUMN "courseUpdatedAt" TIMESTAMP(3);

UPDATE "LanguageQuestFinalExamAttempt" attempt
SET "courseUpdatedAt" = course."updatedAt"
FROM "LanguageQuestCourse" course
WHERE attempt."courseId" = course.id;

ALTER TABLE "LanguageQuestFinalExamAttempt"
  ALTER COLUMN "courseUpdatedAt" SET NOT NULL;
