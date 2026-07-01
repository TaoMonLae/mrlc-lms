-- Add last-login tracking to users. Idempotent so it is safe to re-run.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
