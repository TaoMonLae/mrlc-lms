-- Preserve every cash receipt against a fee charge. Previously FeePayment
-- stored only a cumulative paidAmount and the latest paidDate, which moved
-- earlier partial receipts into the month of the newest top-up in reports.
CREATE TABLE "FeeCollection" (
  "id" TEXT NOT NULL,
  "feePaymentId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paymentMethod" TEXT,
  "reference" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FeeCollection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FeeCollection_feePaymentId_idx" ON "FeeCollection"("feePaymentId");
CREATE INDEX "FeeCollection_paymentDate_idx" ON "FeeCollection"("paymentDate");

ALTER TABLE "FeeCollection"
  ADD CONSTRAINT "FeeCollection_feePaymentId_fkey"
  FOREIGN KEY ("feePaymentId") REFERENCES "FeePayment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing records cannot reveal the dates of earlier instalments, so retain
-- their current accounting position as one opening history row on paidDate.
-- MD5 gives a deterministic id and keeps this backfill safe to re-run.
INSERT INTO "FeeCollection" (
  "id", "feePaymentId", "amount", "currency", "paymentDate",
  "paymentMethod", "reference", "notes", "createdAt", "updatedAt"
)
SELECT
  MD5("id" || ':initial-collection'),
  "id",
  "paidAmount",
  "currency",
  "paidDate",
  "paymentMethod",
  "receiptNumber",
  'Backfilled from the fee payment balance',
  COALESCE("createdAt", CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP
FROM "FeePayment"
WHERE "paidAmount" > 0 AND "paidDate" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;
