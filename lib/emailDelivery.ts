import type { EmailOutbox, PrismaClient } from '@prisma/client';
import { notificationTypeEnabled } from '../shared/notificationPreferences';

type MailTransport = { sendMail: (mail: { from: string; to: string; subject: string; text?: string; html?: string }) => Promise<unknown> };

export async function deliverOutboxMessage(db: PrismaClient, transport: MailTransport, message: EmailOutbox, from: string,
  logger: { error: (...args: any[]) => void }) {
  const claimed = await db.emailOutbox.updateMany({ where: { id: message.id, status: 'QUEUED' }, data: { status: 'SENDING' } });
  if (!claimed.count) return;
  const notificationId = message.dedupeKey?.startsWith('notification:') ? message.dedupeKey.slice('notification:'.length) : null;
  const updateDelivery = async (data: Record<string, any>) => {
    if (!notificationId) return;
    // SMTP delivery and accounting are separate: an accounting failure must
    // never requeue mail the server has already accepted.
    try { await db.notificationDelivery.updateMany({ where: { notificationId, channel: 'EMAIL' }, data }); }
    catch (error) { logger.error('Could not record notification email status:', error); }
  };
  if (notificationId) {
    try {
      const notification = await db.notification.findUnique({ where: { id: notificationId }, include: { user: { select: { isActive: true, isExternalLearner: true } } } });
      const preference = notification && await db.notificationPreference.findUnique({ where: { userId: notification.userId } });
      if (!notification?.user.isActive || notification.user.isExternalLearner || !preference?.emailEnabled || !notificationTypeEnabled(notification.type, preference)) {
        await db.emailOutbox.update({ where: { id: message.id }, data: { status: 'CANCELLED', textBody: null, htmlBody: null, lastError: null } });
        await updateDelivery({ status: 'CANCELLED', lastError: null });
        return;
      }
    } catch (error) {
      // No SMTP call has happened yet. Release the claim so a temporary
      // preference/database outage does not strand this job until restart.
      await db.emailOutbox.updateMany({ where: { id: message.id, status: 'SENDING' }, data: {
        status: 'QUEUED', nextAttemptAt: new Date(Date.now() + 60_000), lastError: 'Could not check notification preferences',
      } });
      throw error;
    }
  }
  try {
    await transport.sendMail({ from, to: message.toEmail, subject: message.subject, text: message.textBody || undefined, html: message.htmlBody || undefined });
  } catch (error: any) {
    const attempts = message.attempts + 1;
    const lastError = String(error?.message || 'Email delivery failed').slice(0, 500);
    const status = attempts >= 5 ? 'FAILED' : 'QUEUED';
    await db.emailOutbox.update({ where: { id: message.id }, data: { status, attempts, lastError, nextAttemptAt: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000) } });
    await updateDelivery({ status, attempts: { increment: 1 }, lastError });
    return;
  }
  await db.emailOutbox.update({ where: { id: message.id }, data: {
    status: 'SENT', sentAt: new Date(), attempts: { increment: 1 }, lastError: null,
    textBody: null, htmlBody: null,
  } });
  await updateDelivery({ status: 'SENT', sentAt: new Date(), attempts: { increment: 1 }, lastError: null });
}
