-- Allow images/media to be attached to exam questions. NON-DESTRUCTIVE / idempotent.
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
