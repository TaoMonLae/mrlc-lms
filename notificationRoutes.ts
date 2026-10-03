import type { Express, RequestHandler } from 'express';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const preferenceSchema = z.object({
  inAppEnabled: z.boolean().optional(), emailEnabled: z.boolean().optional(),
  homeworkReminders: z.boolean().optional(), resultNotifications: z.boolean().optional(),
  interventionReminders: z.boolean().optional(), payrollNotifications: z.boolean().optional(),
  classNotifications: z.boolean().optional(), appUpdates: z.boolean().optional(),
}).strict();

export function registerNotificationRoutes({ app, prisma, authMiddleware, sync, logger }: {
  app: Express; prisma: PrismaClient; authMiddleware: RequestHandler;
  sync: (user: { userId: string; role: string }) => Promise<unknown>;
  logger: { error: (...args: any[]) => void };
}) {
  const handle = (fn: RequestHandler): RequestHandler => async (req, res, next) => {
    try { await fn(req, res, next); }
    catch (error: any) {
      logger.error('Notification API failed:', error);
      res.status(error?.code === 'P2021' || error?.code === 'P2022' ? 503 : 500)
        .json({ error: 'Notifications are temporarily unavailable' });
    }
  };
  app.get('/api/notifications', authMiddleware, handle(async (req, res) => {
    const user = (req as any).user;
    await sync(user);
    const preferences = await prisma.notificationPreference.upsert({ where: { userId: user.userId }, update: {}, create: { userId: user.userId } });
    const where = { userId: user.userId };
    const [notifications, unreadCount] = preferences.inAppEnabled ? await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.notification.count({ where: { ...where, readAt: null } }),
    ]) : [[], 0];
    res.json({ notifications, unreadCount, preferences });
  }));
  app.patch('/api/notifications/:id/read', authMiddleware, handle(async (req, res) => {
    const where = { id: req.params.id, userId: (req as any).user.userId };
    if (!await prisma.notification.findFirst({ where, select: { id: true } })) {
      res.status(404).json({ error: 'Notification not found' }); return;
    }
    await prisma.notification.updateMany({ where: { ...where, readAt: null }, data: { readAt: new Date() } });
    res.json({ success: true });
  }));
  app.post('/api/notifications/read-all', authMiddleware, handle(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: (req as any).user.userId, readAt: null }, data: { readAt: new Date() } });
    res.json({ success: true });
  }));
  app.put('/api/notifications/preferences', authMiddleware, handle(async (req, res) => {
    const parsed = preferenceSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Provide valid notification preferences' }); return; }
    const userId = (req as any).user.userId;
    const preference = await prisma.notificationPreference.upsert({ where: { userId }, update: parsed.data, create: { userId, ...parsed.data } });
    res.json(preference);
  }));
}
