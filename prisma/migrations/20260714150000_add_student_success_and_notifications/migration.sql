CREATE TABLE "InterventionPlan" (
    "id" TEXT NOT NULL, "title" TEXT NOT NULL, "reason" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM', "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3), "notes" TEXT, "outcome" TEXT,
    "studentId" TEXT NOT NULL, "assignedToId" TEXT, "createdById" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "InterventionPlan_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" TEXT NOT NULL,
    "title" TEXT NOT NULL, "message" TEXT NOT NULL, "href" TEXT, "sourceId" TEXT,
    "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "homeworkReminders" BOOLEAN NOT NULL DEFAULT true, "resultNotifications" BOOLEAN NOT NULL DEFAULT true,
    "interventionReminders" BOOLEAN NOT NULL DEFAULT true, "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL, "notificationId" TEXT NOT NULL, "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "status" TEXT NOT NULL DEFAULT 'QUEUED', "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT, "sentAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InterventionPlan_studentId_idx" ON "InterventionPlan"("studentId");
CREATE INDEX "InterventionPlan_assignedToId_idx" ON "InterventionPlan"("assignedToId");
CREATE INDEX "InterventionPlan_status_idx" ON "InterventionPlan"("status");
CREATE INDEX "InterventionPlan_dueDate_idx" ON "InterventionPlan"("dueDate");
CREATE UNIQUE INDEX "Notification_userId_sourceId_key" ON "Notification"("userId", "sourceId");
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");
CREATE INDEX "NotificationDelivery_status_channel_createdAt_idx" ON "NotificationDelivery"("status", "channel", "createdAt");
CREATE INDEX "NotificationDelivery_notificationId_idx" ON "NotificationDelivery"("notificationId");
ALTER TABLE "InterventionPlan" ADD CONSTRAINT "InterventionPlan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterventionPlan" ADD CONSTRAINT "InterventionPlan_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InterventionPlan" ADD CONSTRAINT "InterventionPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "ipAddress" TEXT, "userAgent" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuthSession_userId_revokedAt_expiresAt_idx" ON "AuthSession"("userId", "revokedAt", "expiresAt");
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
