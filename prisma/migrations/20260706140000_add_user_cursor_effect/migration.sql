-- Personal override for the decorative mouse-cursor effect, so each user
-- can pick their own instead of only ever seeing the school-wide default
-- set in Settings > System > Cursor Effects. Null means "use that default".
ALTER TABLE "User" ADD COLUMN "cursorEffect" TEXT;
