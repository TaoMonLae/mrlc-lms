ALTER TABLE "Exam" ADD COLUMN "answerKeyEditTeacherIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Question" ADD COLUMN "answerKeyCorrectedAt" TIMESTAMP(3);
