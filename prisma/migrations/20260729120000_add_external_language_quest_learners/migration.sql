ALTER TABLE "User"
ADD COLUMN "isExternalLearner" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "User_isExternalLearner_idx" ON "User"("isExternalLearner");
