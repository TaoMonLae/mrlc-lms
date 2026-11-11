import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { newCourseDraft, type CourseDraft } from '../../shared/courses';
import { COURSE_PACKAGE_FORMAT, safeCoursePackagePath, type CoursePackage } from '../../shared/coursePackage';
import { coursePackageDigest, parseCoursePackage } from '../../lib/coursePackages';
import { isStagedCourseBook, isStagedCourseVideo } from '../../coursePackageRoutes';
import { importedMediaNeedsCourseReview } from '../../lib/courseMediaReview';

const draft = (): CourseDraft => ({ ...newCourseDraft(), title: 'Offline ratios', summary: 'Learn ratios.', objectives: 'Compare quantities.', modules: [{ id: 'module-1', title: 'Ratios', outcomes: 'Explain a ratio.', items: [{ id: 'lesson-1', title: 'A worked example', kind: 'TEXT', content: '', resourceId: '', url: '', source: '', minutes: 15 }] }] });
const manifest = (): CoursePackage => ({ format: COURSE_PACKAGE_FORMAT, version: 1, course: draft(), lessonFiles: { 'lesson-1': 'lessons/one.txt' }, resources: [], notes: [] });
async function archive(value = manifest(), extra: Record<string, Buffer | string> = {}, root = '') {
  const zip = new JSZip(); zip.file(`${root}course.json`, JSON.stringify(value)); zip.file(`${root}lessons/one.txt`, 'A ratio compares two quantities.\n\nမြန်မာစာ · မန်');
  for (const [name, bytes] of Object.entries(extra)) zip.file(root + name, bytes);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', platform: 'UNIX' });
}
test('plain UTF-8 lesson files survive an offline course transfer', async () => {
  const buffer = await archive(); const result = await parseCoursePackage(buffer);
  assert.match(result.manifest.course.modules[0].items[0].content, /မြန်မာစာ/);
  assert.equal(result.preview.digest, coursePackageDigest(buffer));
  assert.deepEqual(result.preview.warnings, []);
});
test('a course package can have one enclosing folder created by desktop ZIP tools', async () => {
  assert.equal((await parseCoursePackage(await archive(manifest(), {}, 'My course/'))).preview.course.title, 'Offline ratios');
});
test('PDF media is validated, measured and checked against its checksum', async () => {
  const value = manifest(), pdf = Buffer.from('%PDF-1.7\nSynthetic course fixture\n%%EOF');
  value.course.modules[0].items.push({ ...value.course.modules[0].items[0], id: 'pdf-lesson', kind: 'EBOOK', resourceId: 'book' });
  value.resources.push({ key: 'book', kind: 'EBOOK', title: 'Original reading', file: 'assets/reading.pdf', sha256: coursePackageDigest(pdf) });
  const result = await parseCoursePackage(await archive(value, { 'assets/reading.pdf': pdf }));
  assert.deepEqual(result.media.get('book')?.bytes, pdf); assert.equal(result.preview.resources[0].bytes, pdf.length);
  assert.ok(result.preview.warnings.some(w => w.includes('staff-only')));
  value.resources[0].sha256 = '0'.repeat(64);
  await assert.rejects(parseCoursePackage(await archive(value, { 'assets/reading.pdf': pdf })), /checksum changed/);
});
test('external activities are explicit reconnect tasks instead of transplanted database IDs', async () => {
  const value = manifest(); value.course.modules[0].items[0].kind = 'EXAM'; value.course.modules[0].items[0].resourceId = 'exam';
  value.resources = [{ key: 'exam', title: 'Teacher check', kind: 'EXAM' }];
  const result = await parseCoursePackage(await archive(value)); assert.match(result.preview.warnings[0], /reconnect this exam/);
});
test('unsafe paths and symbolic links are rejected before extraction', async () => {
  for (const name of ['../file', '/file', 'C:/file', 'assets\\file.pdf', 'assets/../file.pdf', 'assets//file.pdf', 'assets/./file.pdf', 'a\0b']) assert.equal(safeCoursePackagePath(name), false);
  const zip = new JSZip(); zip.file('course.json', JSON.stringify(manifest())); zip.file('lessons/one.txt', 'Text'); zip.file('../escape.txt', 'Escape');
  await assert.rejects(parseCoursePackage(await zip.generateAsync({ type: 'nodebuffer' })), /unsafe file path/);
  const link = new JSZip(); link.file('course.json', JSON.stringify(manifest())); link.file('lessons/one.txt', '/etc/passwd', { unixPermissions: 0o120777 });
  await assert.rejects(parseCoursePackage(await link.generateAsync({ type: 'nodebuffer', platform: 'UNIX' })), /Symbolic links/);
});
test('corrupt archives, unknown formats and missing lesson files give actionable errors', async () => {
  await assert.rejects(parseCoursePackage(Buffer.from('not a zip')), /not a readable ZIP/);
  const zip = new JSZip(); zip.file('course.json', '{bad');
  await assert.rejects(parseCoursePackage(await zip.generateAsync({ type: 'nodebuffer' })), /not valid JSON/);
  zip.file('course.json', JSON.stringify({ ...manifest(), version: 99 }));
  await assert.rejects(parseCoursePackage(await zip.generateAsync({ type: 'nodebuffer' })));
  zip.file('course.json', JSON.stringify(manifest()));
  await assert.rejects(parseCoursePackage(await zip.generateAsync({ type: 'nodebuffer' })), /missing from the ZIP/);
});
test('unreferenced files and disguised executables cannot enter course storage', async () => {
  await assert.rejects(parseCoursePackage(await archive(manifest(), { 'assets/run.js': 'alert(1)' })), /not referenced/);
  const value = manifest(); value.course.modules[0].items[0].kind = 'EBOOK'; value.course.modules[0].items[0].resourceId = 'book';
  value.resources = [{ key: 'book', kind: 'EBOOK', title: 'Disguised file', file: 'assets/file.pdf' }];
  await assert.rejects(parseCoursePackage(await archive(value, { 'assets/file.pdf': '#!/bin/sh\nexit' })), /contents do not match/);
});
test('oversized compressed manifests and excessive entries are bounded', async () => {
  const zip = new JSZip(); zip.file('course.json', ' '.repeat(2 * 1024 * 1024 + 1));
  await assert.rejects(parseCoursePackage(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })), /size limit/);
  const many = new JSZip(); many.file('course.json', JSON.stringify(manifest()));
  for (let n = 0; n < 651; n++) many.file(`empty-${n}.txt`, '');
  await assert.rejects(parseCoursePackage(await many.generateAsync({ type: 'nodebuffer' })), /too many files/);
});
test('a forged or cross-course private resource is never eligible for approval', () => {
  const course = { id: 'c1', ownerId: 'teacher' };
  assert.equal(isStagedCourseBook({ fileName: 'course-c1-book.pdf', uploadedById: 'teacher', visibility: 'TEACHERS_ONLY' }, course), true);
  assert.equal(isStagedCourseBook({ fileName: 'course-c2-book.pdf', uploadedById: 'teacher', visibility: 'TEACHERS_ONLY' }, course), false);
  assert.equal(isStagedCourseBook({ fileName: 'course-c1-book.pdf', uploadedById: 'other', visibility: 'TEACHERS_ONLY' }, course), false);
  assert.equal(isStagedCourseVideo({ videoUrl: '/uploads/videos/course-c1-video.mp4', uploadedById: 'teacher', status: 'DRAFT', visibility: 'TEACHERS_ONLY' }, course), true);
  assert.equal(isStagedCourseVideo({ videoUrl: '/uploads/videos/course-c1-video.mp4', uploadedById: 'other', status: 'DRAFT', visibility: 'TEACHERS_ONLY' }, course), false);
  assert.equal(isStagedCourseVideo({ videoUrl: '/uploads/videos/course-c1-video.mp4', uploadedById: 'teacher', status: 'ARCHIVED', visibility: 'TEACHERS_ONLY' }, course), false);
});
test('ordinary media edits retain the review requirement until a course version exists', async () => {
  let checks = 0;
  const prisma: any = { course: { findFirst: async ({ where }: any) => { checks++; assert.deepEqual(where.versions, { none: {} }); return { id: where.id }; } } };
  assert.equal(await importedMediaNeedsCourseReview(prisma, 'ordinary-upload.mp4'), false); assert.equal(checks, 0);
  assert.equal(await importedMediaNeedsCourseReview(prisma, 'course-11111111-1111-4111-a111-111111111111-video.mp4'), true);
  assert.equal(checks, 1);
  prisma.course.findFirst = async () => null;
  assert.equal(await importedMediaNeedsCourseReview(prisma, 'course-11111111-1111-4111-a111-111111111111-book.pdf'), false);
});
