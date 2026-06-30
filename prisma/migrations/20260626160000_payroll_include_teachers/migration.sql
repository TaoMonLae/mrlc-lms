-- Include teachers in payroll.
-- Teachers gain salary fields; a Payslip can now belong to either an Employee
-- (non-teaching staff) or a Teacher. NON-DESTRUCTIVE / idempotent.

-- ── Teacher salary fields ────────────────────────────────────────────────────
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "baseSalary" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'MYR';

-- ── Payslip: relax employeeId, add teacherId ─────────────────────────────────
ALTER TABLE "Payslip" ALTER COLUMN "employeeId" DROP NOT NULL;
ALTER TABLE "Payslip" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Payslip_payrollRunId_teacherId_key" ON "Payslip"("payrollRunId","teacherId");
CREATE INDEX IF NOT EXISTS "Payslip_teacherId_idx" ON "Payslip"("teacherId");

DO $$ BEGIN
  ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
