-- Built-in Language Quest learner profiles.
ALTER TABLE "User"
ADD COLUMN "languageQuestAvatar" TEXT NOT NULL DEFAULT 'owl',
ADD COLUMN "languageQuestBio" TEXT;

-- Teacher-owned Language Quest classrooms use opt-in join codes and remain
-- separate from private LMS academic Class and Student records.
CREATE TABLE "LanguageQuestClassroom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "focusCourseId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanguageQuestClassroom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LanguageQuestClassroomMember" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LanguageQuestClassroomMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LanguageQuestClassroom_joinCode_key"
ON "LanguageQuestClassroom"("joinCode");

CREATE INDEX "LanguageQuestClassroom_teacherId_active_idx"
ON "LanguageQuestClassroom"("teacherId", "active");

CREATE INDEX "LanguageQuestClassroom_focusCourseId_idx"
ON "LanguageQuestClassroom"("focusCourseId");

CREATE UNIQUE INDEX "LanguageQuestClassroomMember_classroomId_userId_key"
ON "LanguageQuestClassroomMember"("classroomId", "userId");

CREATE INDEX "LanguageQuestClassroomMember_userId_idx"
ON "LanguageQuestClassroomMember"("userId");

ALTER TABLE "LanguageQuestClassroom"
ADD CONSTRAINT "LanguageQuestClassroom_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LanguageQuestClassroom"
ADD CONSTRAINT "LanguageQuestClassroom_focusCourseId_fkey"
FOREIGN KEY ("focusCourseId") REFERENCES "LanguageQuestCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LanguageQuestClassroomMember"
ADD CONSTRAINT "LanguageQuestClassroomMember_classroomId_fkey"
FOREIGN KEY ("classroomId") REFERENCES "LanguageQuestClassroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LanguageQuestClassroomMember"
ADD CONSTRAINT "LanguageQuestClassroomMember_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
