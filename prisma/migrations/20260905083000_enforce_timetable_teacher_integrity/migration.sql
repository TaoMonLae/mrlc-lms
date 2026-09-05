-- Timetable rows historically stored copied teacher names without a foreign
-- key. Remove orphaned/inactive references while preserving the schedule row.
UPDATE "TimetableEntry" AS entry
SET "teacherId" = NULL,
    "teacherName" = NULL
WHERE entry."teacherId" IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM "Teacher" AS teacher
     JOIN "User" AS account ON account.id = teacher."userId"
     WHERE teacher.id = entry."teacherId"
       AND account."isActive" = TRUE
   );

UPDATE "TimetableEntry" AS entry
SET "substituteTeacherId" = NULL,
    "substituteTeacherName" = NULL
WHERE entry."substituteTeacherId" IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM "Teacher" AS teacher
     JOIN "User" AS account ON account.id = teacher."userId"
     WHERE teacher.id = entry."substituteTeacherId"
       AND account."isActive" = TRUE
   );

-- Refresh remaining display names from the live user profile rather than an
-- old client-supplied copy.
UPDATE "TimetableEntry" AS entry
SET "teacherName" = BTRIM(account."firstName" || ' ' || account."lastName")
FROM "Teacher" AS teacher
JOIN "User" AS account ON account.id = teacher."userId"
WHERE entry."teacherId" = teacher.id
  AND account."isActive" = TRUE;

UPDATE "TimetableEntry" AS entry
SET "substituteTeacherName" = BTRIM(account."firstName" || ' ' || account."lastName")
FROM "Teacher" AS teacher
JOIN "User" AS account ON account.id = teacher."userId"
WHERE entry."substituteTeacherId" = teacher.id
  AND account."isActive" = TRUE;

ALTER TABLE "TimetableEntry"
ADD CONSTRAINT "TimetableEntry_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TimetableEntry"
ADD CONSTRAINT "TimetableEntry_substituteTeacherId_fkey"
FOREIGN KEY ("substituteTeacherId") REFERENCES "Teacher"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
