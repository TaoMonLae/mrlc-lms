import { notificationTypeEnabled } from '../shared/notificationPreferences';
export { notificationTypeEnabled } from '../shared/notificationPreferences';
import type { Prisma, PrismaClient, Announcement, TimetableEntry, PayrollRun } from '@prisma/client';
import { CURRENT_RELEASE } from '../src/data/releases';

type Db = Prisma.TransactionClient;
export type NotificationInput = {
  userId: string; type: string; title: string; message: string; href?: string | null; sourceId: string;
};
const html = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

// Call inside the same transaction as the triggering mutation. Notification,
// delivery records and mail are committed together, before the SMTP worker runs.
export function notificationService(db: Db, appUrl: string) {
  const ensure = async (input: NotificationInput) => {
    const user = await db.user.findUnique({ where: { id: input.userId }, select: { email: true, isActive: true, isExternalLearner: true } });
    if (!user?.isActive || user.isExternalLearner) return null;
    const preference = await db.notificationPreference.upsert({ where: { userId: input.userId }, update: {}, create: { userId: input.userId } });
    if (!notificationTypeEnabled(input.type, preference) || (!preference.inAppEnabled && !preference.emailEnabled)) return null;
    const notification = await db.notification.upsert({
      where: { userId_sourceId: { userId: input.userId, sourceId: input.sourceId } },
      update: { title: input.title, message: input.message, href: input.href ?? null },
      create: { ...input, href: input.href ?? null },
    });
    for (const channel of [preference.inAppEnabled && 'IN_APP', preference.emailEnabled && 'EMAIL'].filter(Boolean) as string[]) {
      await db.notificationDelivery.upsert({
        where: { notificationId_channel: { notificationId: notification.id, channel } }, update: {},
        create: {
          notificationId: notification.id, channel, status: channel === 'IN_APP' ? 'SENT' : 'QUEUED',
          attempts: channel === 'IN_APP' ? 1 : 0, sentAt: channel === 'IN_APP' ? new Date() : null,
        },
      });
    }
    if (preference.emailEnabled) {
      const href = `${appUrl.replace(/\/$/, '')}${input.href?.startsWith('/') ? input.href : '/'}`;
      const dedupeKey = `notification:${notification.id}`;
      await db.emailOutbox.upsert({ where: { dedupeKey }, update: {}, create: {
        userId: input.userId, toEmail: user.email.trim().toLowerCase(), subject: input.title, dedupeKey,
        textBody: `${input.message}\n\nOpen MRLC LMS: ${href}`,
        htmlBody: `<p>${html(input.message)}</p><p><a href="${html(href)}">Open MRLC LMS</a></p>`,
      } });
    }
    return notification;
  };
  const teachers = async (where: Prisma.TeacherWhereInput, input: Omit<NotificationInput, 'userId'>) => {
    const rows = await db.teacher.findMany({ where: { ...where, user: { isActive: true, isExternalLearner: false } }, select: { userId: true } });
    for (const userId of new Set(rows.map((row) => row.userId).filter((id): id is string => !!id))) await ensure({ ...input, userId });
  };
  return {
    ensure,
    async payroll(run: PayrollRun) {
      if (run.status === 'DRAFT') return;
      const slips = await db.payslip.findMany({ where: { payrollRunId: run.id }, include: { teacher: true, employee: true } });
      for (const slip of slips) {
        // Never broadcast payroll details to the teacher mailing list.
        const userId = slip.teacher?.userId || slip.employee?.userId;
        if (userId) await ensure({ userId, type: `PAYROLL_${run.status}`, title: run.status === 'PAID' ? 'Payroll paid' : 'Payslip ready',
          message: `Your payslip for ${String(run.periodMonth).padStart(2, '0')}/${run.periodYear} ${run.status === 'PAID' ? 'has been marked paid' : 'is ready to view'}.`,
          href: '/my-payroll', sourceId: `payroll:${slip.id}:${run.status}:${run.updatedAt.getTime()}` });
      }
    },
    async classChanged(classId: string, name: string, eventId: string) {
      await teachers({ classes: { some: { classId } } }, { type: 'CLASS_UPDATED', title: 'Class updated', message: `${name} has been updated. Please review the class details.`, href: `/teacher/classes/${classId}`, sourceId: `class:${eventId}` });
    },
    async assignment(teacherId: string, classId: string, name: string, assigned: boolean, eventId: string) {
      await teachers({ id: teacherId }, { type: 'CLASS_ASSIGNMENT', title: assigned ? 'Class assigned' : 'Class assignment removed', message: assigned ? `You have been assigned to ${name}.` : `You are no longer assigned to ${name}.`, href: assigned ? `/teacher/classes/${classId}` : '/teacher/classes', sourceId: `class-assignment:${eventId}` });
    },
    async timetable(entry: TimetableEntry, action: string, previous?: TimetableEntry) {
      const ids = [entry.teacherId, entry.substituteTeacherId, previous?.teacherId, previous?.substituteTeacherId].filter((id): id is string => !!id);
      if (!ids.length) return;
      await teachers({ id: { in: ids } }, { type: 'CLASS_SCHEDULE', title: `Class schedule ${action}`,
        message: `${entry.className || 'Class'}${entry.subjectName ? ` · ${entry.subjectName}` : ''}: ${entry.dayOfWeek} ${entry.startTime}–${entry.endTime}${entry.room ? ` in ${entry.room}` : ''}. Schedule ${action}.${entry.cancellationReason ? ` ${entry.cancellationReason}` : ''}`,
        href: '/teacher/timetable', sourceId: `timetable:${entry.id}:${entry.updatedAt.getTime()}:${action}` });
    },
    async announcement(row: Announcement) {
      if (row.status !== 'ACTIVE' || (row.expiresAt && row.expiresAt <= new Date())) return;
      if (!['ALL', 'TEACHERS', 'CLASS'].includes(row.audience) || (row.audience === 'CLASS' && !row.classId)) return;
      await teachers(row.audience === 'CLASS' ? { classes: { some: { classId: row.classId! } } } : {}, {
        type: 'CLASS_ANNOUNCEMENT', title: row.title, message: row.body, href: `/announcements/${row.id}`, sourceId: `announcement:${row.id}:${row.updatedAt.getTime()}`,
      });
    },
  };
}

// Runs without teachers opening the bell. A stable release ID makes restarts
// and the periodic sweep safe, including teachers added after a deployment.
export async function syncTeacherAppUpdates(prisma: PrismaClient, appUrl: string) {
  const users = await prisma.user.findMany({ where: {
    role: 'TEACHER', isActive: true, isExternalLearner: false,
    notifications: { none: { sourceId: `app-update:${CURRENT_RELEASE.id}` } },
  }, select: { id: true } });
  for (const user of users) await prisma.$transaction((tx) => notificationService(tx, appUrl).ensure({
    userId: user.id, type: 'APP_UPDATE', title: `App update: ${CURRENT_RELEASE.title}`, message: CURRENT_RELEASE.summary,
    href: '/updates', sourceId: `app-update:${CURRENT_RELEASE.id}`,
  }));
}
