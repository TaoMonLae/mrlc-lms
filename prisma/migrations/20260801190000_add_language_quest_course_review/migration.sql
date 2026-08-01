ALTER TABLE "LanguageQuestCourse"
ADD COLUMN "reviewRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "reviewNote" TEXT,
ADD COLUMN "submittedForReviewAt" TIMESTAMP(3),
ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- Preserve currently published content as approved, while putting existing
-- teacher-authored courses behind the review gate for their next edit.
UPDATE "LanguageQuestCourse"
SET "reviewStatus" = 'APPROVED'
WHERE "published" = true;

UPDATE "LanguageQuestCourse" AS course
SET "reviewRequired" = true
WHERE EXISTS (
  SELECT 1
  FROM "User" AS author
  WHERE author."id" = course."createdById"
    AND author."role"::text = 'TEACHER'
);

CREATE INDEX "LanguageQuestCourse_reviewStatus_idx"
ON "LanguageQuestCourse"("reviewStatus");
