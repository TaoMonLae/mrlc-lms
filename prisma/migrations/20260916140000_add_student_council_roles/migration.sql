ALTER TABLE "Student"
  ADD COLUMN "studentCouncilRole" TEXT;

ALTER TABLE "Student"
  ADD CONSTRAINT "Student_studentCouncilRole_check" CHECK (
    "studentCouncilRole" IS NULL OR "studentCouncilRole" IN (
      'PRESIDENT',
      'VICE_PRESIDENT',
      'LIBRARIAN',
      'SECRETARY',
      'HOSTEL_MONITOR_BOYS',
      'HOSTEL_MONITOR_GIRLS',
      'RESOURCE_MONITOR'
    )
  );

CREATE INDEX "Student_studentCouncilRole_idx" ON "Student"("studentCouncilRole");
