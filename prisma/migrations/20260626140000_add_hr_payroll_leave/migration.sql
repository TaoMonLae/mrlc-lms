-- HR / Payroll / Leave module
-- NON-DESTRUCTIVE: only adds new enums and tables; no existing data is touched.

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE','ON_LEAVE','SUSPENDED','TERMINATED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT','APPROVED','PAID'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING','APPROVED','REJECTED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Department ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Department" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "code"        TEXT,
  "description" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Department_name_key" ON "Department"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Department_code_key" ON "Department"("code");

-- ── Designation ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Designation" (
  "id"           TEXT NOT NULL,
  "title"        TEXT NOT NULL,
  "departmentId" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Designation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Designation_departmentId_idx" ON "Designation"("departmentId");

-- ── Employee ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Employee" (
  "id"              TEXT NOT NULL,
  "userId"          TEXT,
  "employeeCode"    TEXT NOT NULL,
  "firstName"       TEXT NOT NULL,
  "lastName"        TEXT NOT NULL,
  "email"           TEXT,
  "phone"           TEXT,
  "status"          "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
  "hireDate"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "terminationDate" TIMESTAMP(3),
  "baseSalary"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency"        TEXT NOT NULL DEFAULT 'MYR',
  "profilePhotoUrl" TEXT,
  "departmentId"    TEXT,
  "designationId"   TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_userId_key" ON "Employee"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_employeeCode_key" ON "Employee"("employeeCode");
CREATE INDEX IF NOT EXISTS "Employee_employeeCode_idx" ON "Employee"("employeeCode");
CREATE INDEX IF NOT EXISTS "Employee_departmentId_idx" ON "Employee"("departmentId");
CREATE INDEX IF NOT EXISTS "Employee_status_idx" ON "Employee"("status");

-- ── PayrollRun ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PayrollRun" (
  "id"          TEXT NOT NULL,
  "periodMonth" INTEGER NOT NULL,
  "periodYear"  INTEGER NOT NULL,
  "status"      "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
  "notes"       TEXT,
  "createdById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PayrollRun_periodYear_periodMonth_key" ON "PayrollRun"("periodYear","periodMonth");
CREATE INDEX IF NOT EXISTS "PayrollRun_status_idx" ON "PayrollRun"("status");

-- ── Payslip ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Payslip" (
  "id"           TEXT NOT NULL,
  "payrollRunId" TEXT NOT NULL,
  "employeeId"   TEXT NOT NULL,
  "baseSalary"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "allowances"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "deductions"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "netPay"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency"     TEXT NOT NULL DEFAULT 'MYR',
  "notes"        TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Payslip_payrollRunId_employeeId_key" ON "Payslip"("payrollRunId","employeeId");
CREATE INDEX IF NOT EXISTS "Payslip_employeeId_idx" ON "Payslip"("employeeId");

-- ── LeaveType ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "LeaveType" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "daysPerYear" INTEGER NOT NULL DEFAULT 0,
  "paid"        BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeaveType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LeaveType_name_key" ON "LeaveType"("name");

-- ── LeaveRequest ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "LeaveRequest" (
  "id"             TEXT NOT NULL,
  "employeeId"     TEXT NOT NULL,
  "leaveTypeId"    TEXT NOT NULL,
  "startDate"      TIMESTAMP(3) NOT NULL,
  "endDate"        TIMESTAMP(3) NOT NULL,
  "days"           DOUBLE PRECISION NOT NULL,
  "reason"         TEXT,
  "status"         "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById"   TEXT,
  "reviewedByName" TEXT,
  "reviewedAt"     TIMESTAMP(3),
  "reviewNote"     TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LeaveRequest_employeeId_idx" ON "LeaveRequest"("employeeId");
CREATE INDEX IF NOT EXISTS "LeaveRequest_status_idx" ON "LeaveRequest"("status");

-- ── Foreign keys ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "Designation" ADD CONSTRAINT "Designation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "Employee" ADD CONSTRAINT "Employee_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
