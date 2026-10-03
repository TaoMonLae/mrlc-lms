import type { Prisma, PrismaClient } from '@prisma/client';

export async function announcementAudienceWhere(db: Pick<PrismaClient, 'student' | 'teacher'>, user: { userId: string; role: string }): Promise<Prisma.AnnouncementWhereInput> {
  if (user.role === 'ADMIN') return {};
  const audiences = ['ALL'];
  const classIds: string[] = [];
  if (user.role === 'STUDENT') {
    audiences.push('STUDENTS');
    const student = await db.student.findUnique({ where: { userId: user.userId }, select: { classId: true } });
    if (student?.classId) classIds.push(student.classId);
  } else if (user.role === 'TEACHER') {
    audiences.push('TEACHERS');
    const teacher = await db.teacher.findUnique({ where: { userId: user.userId }, select: { classes: { select: { classId: true } } } });
    classIds.push(...(teacher?.classes.map((row) => row.classId) || []));
  }
  const visible: Prisma.AnnouncementWhereInput = { AND: [
    { status: 'ACTIVE' },
    { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    { OR: [{ audience: { in: audiences } }, { audience: 'CLASS', classId: { in: classIds } }] },
  ] };
  // Teachers retain access to the announcements they authored for management.
  return user.role === 'TEACHER' ? { OR: [{ createdById: user.userId }, visible] } : visible;
}
