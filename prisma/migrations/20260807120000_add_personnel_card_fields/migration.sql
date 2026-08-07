-- Persistent teacher and staff identity-card metadata.
-- Nullable columns keep the migration safe for existing records; the card API
-- initializes issue/expiry dates and a cryptographic verification token on use.
ALTER TABLE "Teacher"
ADD COLUMN "cardDisplayName" TEXT,
ADD COLUMN "cardRoleTitle" TEXT,
ADD COLUMN "cardOrganizationUnit" TEXT,
ADD COLUMN "cardIssueDate" TIMESTAMP(3),
ADD COLUMN "cardExpiryDate" TIMESTAMP(3),
ADD COLUMN "cardVerifyToken" TEXT;

ALTER TABLE "Employee"
ADD COLUMN "cardDisplayName" TEXT,
ADD COLUMN "cardRoleTitle" TEXT,
ADD COLUMN "cardOrganizationUnit" TEXT,
ADD COLUMN "cardIssueDate" TIMESTAMP(3),
ADD COLUMN "cardExpiryDate" TIMESTAMP(3),
ADD COLUMN "cardVerifyToken" TEXT;

CREATE UNIQUE INDEX "Teacher_cardVerifyToken_key" ON "Teacher"("cardVerifyToken");
CREATE UNIQUE INDEX "Employee_cardVerifyToken_key" ON "Employee"("cardVerifyToken");
