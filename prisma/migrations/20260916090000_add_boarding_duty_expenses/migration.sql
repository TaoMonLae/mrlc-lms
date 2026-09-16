ALTER TABLE "Student"
  ADD COLUMN "boardingType" TEXT NOT NULL DEFAULT 'DAY';

ALTER TABLE "Student"
  ADD CONSTRAINT "Student_boardingType_check" CHECK ("boardingType" IN ('DAY', 'BOARDING'));

ALTER TABLE "Expense"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'FINANCE',
  ADD COLUMN "merchantName" TEXT,
  ADD COLUMN "receiptReference" TEXT,
  ADD COLUMN "studentId" TEXT,
  ADD COLUMN "dutyAssignmentId" TEXT;

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_source_check" CHECK ("source" IN ('FINANCE', 'STUDENT_DUTY'));

CREATE INDEX "Expense_source_idx" ON "Expense"("source");
CREATE INDEX "Expense_studentId_idx" ON "Expense"("studentId");
CREATE INDEX "Expense_dutyAssignmentId_idx" ON "Expense"("dutyAssignmentId");

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_dutyAssignmentId_fkey"
  FOREIGN KEY ("dutyAssignmentId") REFERENCES "DutyAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
