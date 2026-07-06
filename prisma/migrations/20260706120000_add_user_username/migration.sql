-- Add an optional, unique username column to User so accounts can log in
-- with either their email or a username. Nullable because existing accounts
-- (and most student/teacher self-service accounts) only ever had an email.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Unique constraint (Postgres allows multiple NULLs under a unique index,
-- so accounts without a username are unaffected).
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Matches the @@index([username]) added in schema.prisma for lookup performance.
CREATE INDEX "User_username_idx" ON "User"("username");
