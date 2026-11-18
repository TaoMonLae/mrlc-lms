import type { PrismaClient } from '@prisma/client';
import { courseDraftSchema } from '../shared/courses';

export async function importedMediaNeedsCourseReview(prisma: Pick<PrismaClient, 'course' | 'ebook' | 'videoLesson'>, fileName: string): Promise<boolean> {
  const courseId = fileName.match(/^course-([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})-/)?.[1];
  if (!courseId) return false;
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { versions: { select: { syllabus: true } } } });
  if (!course) return true;
  const bookIds = new Set<string>(), videoIds = new Set<string>();
  for (const version of course.versions) {
    const parsed = courseDraftSchema.safeParse(version.syllabus);
    if (!parsed.success) continue;
    for (const item of parsed.data.modules.flatMap(m => m.items)) {
      if (!item.resourceId) continue;
      if (item.kind === 'EBOOK') bookIds.add(item.resourceId);
      if (item.kind === 'VIDEO') videoIds.add(item.resourceId);
    }
  }
  if (!bookIds.size && !videoIds.size) return true;
  const [book, video] = await Promise.all([
    bookIds.size ? prisma.ebook.findFirst({ where: { id: { in: [...bookIds] }, fileName }, select: { id: true } }) : null,
    videoIds.size ? prisma.videoLesson.findFirst({ where: { id: { in: [...videoIds] }, videoUrl: `/uploads/videos/${fileName}` }, select: { id: true } }) : null,
  ]);
  return !book && !video;
}
