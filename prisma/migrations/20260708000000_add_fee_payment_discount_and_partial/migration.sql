-- Adds manual discount + partial-payment tracking to FeePayment, so staff
-- can record a fee charge, apply a discount, take a partial payment now,
-- and top the balance up later without needing a Fee Structure/Assignment.

-- 1. Add PARTIAL to FeeStatus so a charge's stored status can directly
--    reflect "some but not all of it has been paid" instead of that only
--    ever being derivable at the aggregate/report level.
-- ALTER TYPE ... ADD VALUE cannot run inside a PL/pgSQL DO block, so this
-- is a plain statement; IF NOT EXISTS already makes it idempotent, and it's
-- not referenced later in this same migration/transaction (required on
-- Postgres < 12 semantics for newly added enum values).
ALTER TYPE "FeeStatus" ADD VALUE IF NOT EXISTS 'PARTIAL';

-- 2. New columns on FeePayment. `amount` keeps its existing meaning (net
--    amount owed after any discount); discountAmount and paidAmount are new.
ALTER TABLE "FeePayment" ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "FeePayment" ADD COLUMN IF NOT EXISTS "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- 3. Backfill existing rows: everything previously created was written as
--    fully paid immediately (status = 'PAID'), so treat paidAmount as fully
--    covering the amount for those rows, so they keep displaying correctly.
UPDATE "FeePayment" SET "paidAmount" = "amount" WHERE "status" = 'PAID' AND "paidAmount" = 0;
