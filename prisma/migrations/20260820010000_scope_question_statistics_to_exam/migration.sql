-- Reusable bank questions can appear in multiple exams. Keep their item
-- analysis separate for each exam instead of overwriting one global row.
DROP INDEX IF EXISTS "QuestionStatistic_questionId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "QuestionStatistic_questionId_examId_key"
  ON "QuestionStatistic"("questionId", "examId");
