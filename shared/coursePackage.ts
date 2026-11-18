import { z } from 'zod';
import { courseDraftSchema, type CourseDraft, type CourseKind } from './courses';

export const COURSE_PACKAGE_MAX_BYTES = 90 * 1024 * 1024;
export const COURSE_PACKAGE_MAX_EXPANDED_BYTES = 200 * 1024 * 1024;
export const COURSE_PACKAGE_MAX_MEDIA_BYTES = 80 * 1024 * 1024;
export const COURSE_PACKAGE_FORMAT = 'mrlc-course';
export const coursePackageResourceSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  kind: z.enum(['VIDEO', 'EBOOK', 'PRACTICE', 'HOMEWORK', 'EXAM']),
  title: z.string().trim().min(1).max(160),
  file: z.string().min(1).max(256).optional(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  author: z.string().trim().max(200).optional(),
});
export const coursePackageSchema = z.object({
  format: z.literal(COURSE_PACKAGE_FORMAT), version: z.literal(1),
  course: courseDraftSchema,
  lessonFiles: z.record(z.string(), z.string().min(1).max(256)).default({}),
  resources: z.array(coursePackageResourceSchema).max(200).default([]),
  notes: z.array(z.string().max(1000)).max(200).default([]),
}).superRefine((value, ctx) => {
  if (new Set(value.resources.map(r => r.key)).size !== value.resources.length) ctx.addIssue({ code: 'custom', message: 'Resource keys must be unique.' });
  const items = value.course.modules.flatMap(m => m.items);
  for (const key of Object.keys(value.lessonFiles)) if (!items.some(i => i.id === key)) ctx.addIssue({ code: 'custom', message: 'A lesson text file refers to an unknown lesson.' });
  for (const item of items) {
    if (!item.resourceId) continue;
    const resource = value.resources.find(r => r.key === item.resourceId);
    if (!resource || resource.kind !== item.kind) ctx.addIssue({ code: 'custom', message: `${item.title}: the resource key is missing or has the wrong lesson type.` });
  }
  for (const resource of value.resources) {
    if (resource.file && !['VIDEO', 'EBOOK'].includes(resource.kind)) ctx.addIssue({ code: 'custom', message: 'Only PDF and video resources can contain a media file.' });
    if (!items.some(i => i.resourceId === resource.key && i.kind === resource.kind)) ctx.addIssue({ code: 'custom', message: `${resource.title}: remove this unused resource from the package.` });
  }
});
export type CoursePackage = z.infer<typeof coursePackageSchema>;
export type CoursePackageResource = z.infer<typeof coursePackageResourceSchema>;
export interface CoursePackagePreview {
  digest: string; course: CourseDraft; warnings: string[];
  resources: { key: string; title: string; kind: CourseKind; included: boolean; bytes: number }[];
}
export function safeCoursePackagePath(name: string): boolean {
  return !!name && name.length <= 256 && !/[\\:\u0000-\u001f]/.test(name) && !name.startsWith('/')
    && name.split('/').every(part => part !== '' && part !== '.' && part !== '..');
}
export function coursePackageMediaExtension(resource: Pick<CoursePackageResource, 'kind' | 'file'>): '.pdf' | '.mp4' | '.webm' | null {
  const extension = resource.file?.match(/\.[^.\/]+$/)?.[0]?.toLowerCase();
  return resource.kind === 'EBOOK' && extension === '.pdf' ? '.pdf' : resource.kind === 'VIDEO' && (extension === '.mp4' || extension === '.webm') ? extension : null;
}
export const COURSE_PACKAGE_README = `MRLC offline course package — version 1

TO TRANSFER A COURSE
1. In the local LMS, save your draft and choose Export ZIP.
2. Keep the ZIP on your computer or USB drive.
3. On the destination LMS, open Courses > Import course.
4. Choose the ZIP, review its contents, and create a draft.
5. Reconnect any practice, homework or exam resources. Submit for administrator approval.

TO EDIT WITHOUT RUNNING THE LMS
Unzip this package. course.json contains the title, subject, level, summary,
outcomes, modules and lessons. Edit lesson text in lessons/*.txt using a plain-text
editor such as TextEdit in plain-text mode. Save files as UTF-8. Keep lesson IDs
and lessonFiles paths aligned. You can change the text without editing the JSON.
Rezip the folder or its contents. The importer accepts one enclosing folder.

TO ADD A PDF OR VIDEO
Put the file in assets/. In course.json add a resource with a unique key,
kind EBOOK (PDF) or VIDEO (MP4/WebM), title and relative file path. Set the
lesson's resourceId to that key and its kind to the same kind. Only include
materials you are allowed to copy and share. Delete sha256 if you replace a file;
otherwise its recorded checksum is checked on import.

LIMITS AND REVIEW
ZIP: up to 90 MiB. Expanded contents: up to 200 MiB. Included media: up to
80 MiB per package. Upload larger videos through the LMS video uploader and
reconnect them after importing. Scripts, executables, encrypted archives and
unsafe paths are not accepted. This is an MRLC package, not a SCORM or Moodle
backup importer. Word documents are not converted automatically.

Imports always create a new draft owned by the importing teacher/admin.
Included media stays staff-only until an administrator approves the course.
Linked exams, homework and Learning Quest practice must be reconnected on the
destination LMS. External readings still need internet. No grades, student
accounts, enrollments, progress or approval decisions are transferred.
`;
