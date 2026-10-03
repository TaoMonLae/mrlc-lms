ALTER TABLE "NotificationPreference"
  ADD COLUMN "payrollNotifications" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "classNotifications" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "appUpdates" BOOLEAN NOT NULL DEFAULT true;

-- Keep one delivery per channel before enforcing idempotent delivery creation.
DELETE FROM "NotificationDelivery" WHERE "id" IN (
  SELECT "id" FROM (
    SELECT "id", ROW_NUMBER() OVER (
      PARTITION BY "notificationId", "channel"
      ORDER BY CASE WHEN "status" = 'SENT' THEN 0 ELSE 1 END, "createdAt", "id"
    ) AS position FROM "NotificationDelivery"
  ) AS duplicates WHERE position > 1
);
CREATE UNIQUE INDEX "NotificationDelivery_notificationId_channel_key"
  ON "NotificationDelivery"("notificationId", "channel");
