ALTER TABLE "FeePayment" ADD COLUMN "billingMonth" TEXT;

-- Recover the month embedded by the historical Record Payment form whenever
-- possible. Fall back to dueDate for other fee descriptions.
UPDATE "FeePayment"
SET "billingMonth" = CASE
  WHEN "description" ~ '^Monthly Fees - (January|February|March|April|May|June|July|August|September|October|November|December) [0-9]{4}$'
    THEN SPLIT_PART("description", ' ', 5) || '-' || CASE SPLIT_PART("description", ' ', 4)
      WHEN 'January' THEN '01' WHEN 'February' THEN '02' WHEN 'March' THEN '03'
      WHEN 'April' THEN '04' WHEN 'May' THEN '05' WHEN 'June' THEN '06'
      WHEN 'July' THEN '07' WHEN 'August' THEN '08' WHEN 'September' THEN '09'
      WHEN 'October' THEN '10' WHEN 'November' THEN '11' WHEN 'December' THEN '12'
    END
  ELSE TO_CHAR("dueDate" AT TIME ZONE 'UTC', 'YYYY-MM')
END
WHERE "billingMonth" IS NULL;

CREATE INDEX "FeePayment_billingMonth_idx" ON "FeePayment"("billingMonth");
