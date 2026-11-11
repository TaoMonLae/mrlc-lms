import type { PrismaClient } from '@prisma/client';

/** Imported files keep their review requirement when opened in the ordinary
 * library/video editor, rather than only in the course editor. */
export async function importedMediaNeedsCourseReview(prisma: Pick<PrismaClient, 'course'>, fileName: string): Promise<boolean> {
  const courseId = fileName.match(/^course-([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})-/)?.[1];
  if (!courseId) return false;
  return !!await prisma.course.findFirst({ where: { id: courseId, versions: { none: {} } }, select: { id: true } });
}
