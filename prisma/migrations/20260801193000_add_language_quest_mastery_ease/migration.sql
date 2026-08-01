ALTER TABLE "LanguageQuestMasteryProgress"
ADD COLUMN "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
ADD COLUMN "intervalDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "recentAccuracy" DOUBLE PRECISION,
ADD COLUMN "lastConfidence" TEXT;

-- Seed the interval from the previous stage ladder so existing learners keep
-- approximately the same next-step spacing on their first ease-based review.
UPDATE "LanguageQuestMasteryProgress"
SET "intervalDays" = CASE
  WHEN "stage" <= 0 THEN 0
  WHEN "stage" = 1 THEN 1
  WHEN "stage" = 2 THEN 3
  WHEN "stage" = 3 THEN 7
  WHEN "stage" = 4 THEN 14
  ELSE 30
END;

UPDATE "LanguageQuestMasteryProgress"
SET "recentAccuracy" = CASE
  WHEN "correctReviews" + "wrongReviews" = 0 THEN NULL
  ELSE "correctReviews"::DOUBLE PRECISION / ("correctReviews" + "wrongReviews")
END;
