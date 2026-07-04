-- Student Duty System (boarding-school chore rosters: cooking, cleaning,
-- dish-washing, etc.), built from scratch -- this module was described in
-- FINANCIAL-MODULES-IMPLEMENTATION-PLAN.md but never started at all before
-- this migration (no models, no routes, no pages).
--
-- NON-DESTRUCTIVE: only adds new enums and tables; no existing data is
-- touched. Idempotent so it's safe to re-run. Hand-written for the same
-- reason as the financial-modules migration (this sandbox can't reach
-- binaries.prisma.sh to run `prisma migrate dev`/`diff`) -- please verify
-- against the live DB before applying.

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE "DutyType" AS ENUM ('COOKING','RESOURCE_BUYING','CLEANING','DISH_WASHING','GARDENING','MAINTENANCE','SECURITY','EVENT_SETUP','OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "DutyStatus" AS ENUM ('ASSIGNED','IN_PROGRESS','COMPLETED','SKIPPED','EXCUSED','FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "DutyRosterStatus" AS ENUM ('DRAFT','PUBLISHED','ACTIVE','COMPLETED','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── DutyDefinition ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DutyDefinition" (
  "id"               TEXT NOT NULL,
  "name"             TEXT NOT NULL,
  "code"             TEXT NOT NULL,
  "type"             "DutyType" NOT NULL,
  "description"      TEXT,
  "durationMinutes"  INTEGER,
  "requiredStudents" INTEGER NOT NULL DEFAULT 1,
  "pointsAwarded"    INTEGER NOT NULL DEFAULT 1,
  "isActive"         BOOLEAN NOT NULL DEFAULT true,
  "notes"            TEXT,
  "createdById"      TEXT,
  "createdByName"    TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DutyDefinition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DutyDefinition_code_key" ON "DutyDefinition"("code");
CREATE INDEX IF NOT EXISTS "DutyDefinition_type_idx" ON "DutyDefinition"("type");
CREATE INDEX IF NOT EXISTS "DutyDefinition_isActive_idx" ON "DutyDefinition"("isActive");

-- ── DutyRoster ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DutyRoster" (
  "id"              TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "periodType"      TEXT NOT NULL DEFAULT 'WEEKLY',
  "startDate"       TIMESTAMP(3) NOT NULL,
  "endDate"         TIMESTAMP(3) NOT NULL,
  "status"          "DutyRosterStatus" NOT NULL DEFAULT 'DRAFT',
  "maxWeeklyDuties" INTEGER NOT NULL DEFAULT 5,
  "notes"           TEXT,
  "publishedAt"     TIMESTAMP(3),
  "publishedById"   TEXT,
  "publishedByName" TEXT,
  "createdById"     TEXT,
  "createdByName"   TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DutyRoster_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DutyRoster_status_idx" ON "DutyRoster"("status");
CREATE INDEX IF NOT EXISTS "DutyRoster_startDate_idx" ON "DutyRoster"("startDate");
CREATE INDEX IF NOT EXISTS "DutyRoster_endDate_idx" ON "DutyRoster"("endDate");

-- ── DutyAssignment ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DutyAssignment" (
  "id"               TEXT NOT NULL,
  "rosterId"         TEXT NOT NULL,
  "dutyDefinitionId" TEXT NOT NULL,
  "studentId"        TEXT NOT NULL,
  "scheduledDate"    TIMESTAMP(3) NOT NULL,
  "status"           "DutyStatus" NOT NULL DEFAULT 'ASSIGNED',
  "rating"           INTEGER,
  "pointsEarned"     INTEGER,
  "completedAt"      TIMESTAMP(3),
  "ratedById"        TEXT,
  "ratedByName"      TEXT,
  "notes"            TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DutyAssignment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DutyAssignment_rosterId_idx" ON "DutyAssignment"("rosterId");
CREATE INDEX IF NOT EXISTS "DutyAssignment_dutyDefinitionId_idx" ON "DutyAssignment"("dutyDefinitionId");
CREATE INDEX IF NOT EXISTS "DutyAssignment_studentId_idx" ON "DutyAssignment"("studentId");
CREATE INDEX IF NOT EXISTS "DutyAssignment_scheduledDate_idx" ON "DutyAssignment"("scheduledDate");
CREATE INDEX IF NOT EXISTS "DutyAssignment_status_idx" ON "DutyAssignment"("status");

-- ── Foreign keys ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "DutyAssignment" ADD CONSTRAINT "DutyAssignment_rosterId_fkey"
    FOREIGN KEY ("rosterId") REFERENCES "DutyRoster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "DutyAssignment" ADD CONSTRAINT "DutyAssignment_dutyDefinitionId_fkey"
    FOREIGN KEY ("dutyDefinitionId") REFERENCES "DutyDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "DutyAssignment" ADD CONSTRAINT "DutyAssignment_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
