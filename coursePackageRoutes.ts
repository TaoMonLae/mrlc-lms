import type { Express, Request, RequestHandler, Response } from 'express';
import type { PrismaClient, Prisma } from '@prisma/client';
import multer from 'multer';
import JSZip from 'jszip';
import { randomUUID, createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { z } from 'zod';
import { courseDraftSchema, newCourseDraft, type CourseDraft, type CourseItem } from './shared/courses';
import { COURSE_PACKAGE_FORMAT, COURSE_PACKAGE_MAX_BYTES, COURSE_PACKAGE_MAX_MEDIA_BYTES, COURSE_PACKAGE_README, type CoursePackage, type CoursePackageResource } from './shared/coursePackage';
import { CoursePackageError, coursePackageDigest, parseCoursePackage } from './lib/coursePackages';
import { findDuplicateEbookTitle, normalizedTitleForColumn } from './lib/ebookTitles';

type Actor = { userId: string; role: string; externalLearner?: boolean };
type Dependencies = { app: Express; prisma: PrismaClient; authMiddleware: RequestHandler; canManageExamClass: (actor: Actor, classId: string) => Promise<boolean>; logger: { error: (...args: any[]) => void }; ebookDir?: string; videoDir?: string };
let activeOperations = 0;
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: COURSE_PACKAGE_MAX_BYTES, files: 1, fields: 3, fieldSize: 1000 }, fileFilter: (_req, file, cb) => {
  if (!/\.zip$/i.test(file.originalname)) cb(new CoursePackageError('Choose an MRLC course .zip file.')); else cb(null, true);
} }).single('file');

async function managedFile(directory: string, fileName: string, limit: number): Promise<Buffer | null> {
  if (!fileName || fileName !== path.basename(fileName) || /[\\\u0000-\u001f]/.test(fileName)) return null;
  try {
    const [root, actual] = await Promise.all([fs.realpath(directory), fs.realpath(path.join(directory, fileName))]);
    if (path.dirname(actual) !== root) return null;
    const stat = await fs.stat(actual);
    if (!stat.isFile() || stat.size > limit) return null;
    return await fs.readFile(actual);
  } catch (error) { if (['ENOENT', 'ENOTDIR'].includes((error as any)?.code)) return null; throw error; }
}
export function importedCourseResourcePrefix(courseId: string) { return `course-${courseId}-`; }
export function isStagedCourseBook(row: { fileName: string; uploadedById: string | null; visibility: string }, course: { id: string; ownerId: string }) {
  return row.uploadedById === course.ownerId && row.visibility === 'TEACHERS_ONLY' && row.fileName.startsWith(importedCourseResourcePrefix(course.id));
}
export function isStagedCourseVideo(row: { videoUrl: string; uploadedById: string; status: string; visibility: string }, course: { id: string; ownerId: string }) {
  return row.uploadedById === course.ownerId && row.status === 'DRAFT' && row.visibility === 'TEACHERS_ONLY' && row.videoUrl.startsWith(`/uploads/videos/${importedCourseResourcePrefix(course.id)}`);
}
export function registerCoursePackageRoutes({ app, prisma, authMiddleware, canManageExamClass, logger, ebookDir = path.resolve('data/ebooks'), videoDir = path.resolve('data/videos') }: Dependencies) {
  const actorFor = (req: Request): Actor => {
    const actor = (req as any).user as Actor;
    if (!actor || actor.externalLearner || !['ADMIN', 'TEACHER'].includes(actor.role)) throw new CoursePackageError('Only school teachers and administrators can transfer courses.', 403);
    return actor;
  };
  const wrap = (fn: (req: Request, res: Response) => Promise<void>): RequestHandler => async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    try { await fn(req, res); }
    catch (error) {
      if (error instanceof CoursePackageError) { res.status(error.status).json({ error: error.message }); return; }
      if (error instanceof multer.MulterError) { res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Choose a ZIP smaller than 90 MiB.' : 'Upload one ZIP file with the course package.' }); return; }
      if (error instanceof z.ZodError) { res.status(400).json({ error: error.issues[0]?.message || 'Check the package details.' }); return; }
      if (['P2021', 'P2022'].includes((error as any)?.code)) { res.status(503).json({ error: 'Apply the course database update before importing courses.' }); return; }
      logger.error('Course package request failed', error); res.status(500).json({ error: 'The course package could not be processed. Please try again.' });
    }
  };
  const operation = async <T,>(fn: () => Promise<T>) => {
    if (activeOperations >= 2) throw new CoursePackageError('Two course transfers are already running. Please try again shortly.', 429);
    activeOperations++;
    try { return await fn(); } finally { activeOperations--; }
  };
  const ownedCourse = async (req: Request) => {
    const actor = actorFor(req);
    const course = await prisma.course.findUnique({ where: { id: String(req.params.id) } });
    if (!course || actor.role !== 'ADMIN' && course.ownerId !== actor.userId) throw new CoursePackageError('Course not found or unavailable to your account.', 404);
    return { actor, course };
  };
  const sendZip = async (res: Response, manifest: CoursePackage, media: Map<string, Buffer>, fileName: string) => {
    const zip = new JSZip();
    const exportManifest = structuredClone(manifest);
    let lessonNumber = 0;
    for (const module of exportManifest.course.modules) for (const item of module.items) {
      if (!item.content) continue;
      const name = `lessons/${String(++lessonNumber).padStart(3, '0')}-${item.id}.txt`;
      exportManifest.lessonFiles[item.id] = name;
      zip.file(name, item.content, { compression: 'DEFLATE' }); item.content = '';
    }
    zip.file('course.json', JSON.stringify(exportManifest, null, 2), { compression: 'DEFLATE' });
    zip.file('README.txt', `${COURSE_PACKAGE_README}\nEXPORT NOTES\n${manifest.notes.join('\n') || 'No additional notes.'}\n`, { compression: 'DEFLATE' });
    for (const [name, bytes] of media) zip.file(name, bytes, { compression: 'STORE' });
    const buffer = await zip.generateAsync({ type: 'nodebuffer', platform: 'UNIX' });
    if (buffer.length > COURSE_PACKAGE_MAX_BYTES) throw new CoursePackageError('This export exceeds 90 MiB. Export without media and transfer large files through the video uploader.', 413);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="mrlc-course.zip"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.send(buffer);
  };

  app.get('/api/courses/package-template', authMiddleware, wrap(async (req, res) => {
    actorFor(req);
    await operation(async () => {
      const course = newCourseDraft(); course.title = 'My offline course'; course.summary = 'Write a short introduction for students.'; course.objectives = 'Describe what students will learn.';
      course.modules = [{ id: 'module-1', title: 'First module', outcomes: 'Write a specific learning outcome.', items: [{ id: 'lesson-1', title: 'First lesson', kind: 'TEXT', content: 'Write your lesson here.\n\nExplain one idea, show an example and give students a prompt to practise.', resourceId: '', url: '', source: '', minutes: 15 }] }];
      await sendZip(res, { format: COURSE_PACKAGE_FORMAT, version: 1, course, lessonFiles: {}, resources: [], notes: ['This is an editable starter, not a finished course.'] }, new Map(), 'mrlc-offline-course-starter.zip');
    });
  }));
  app.get('/api/courses/:id/export', authMiddleware, wrap(async (req, res) => {
    const { actor, course } = await ownedCourse(req);
    const includeMedia = req.query.media === '1';
    if (includeMedia && req.query.rights !== '1') throw new CoursePackageError('Confirm that you may copy and transfer the included materials.');
    await operation(async () => {
      const draft = courseDraftSchema.parse(course.draft);
      const manifest: CoursePackage = { format: COURSE_PACKAGE_FORMAT, version: 1, course: structuredClone(draft), lessonFiles: {}, resources: [], notes: [] };
      const media = new Map<string, Buffer>(), aliases = new Map<string, string>(); let mediaBytes = 0;
      for (const item of manifest.course.modules.flatMap(m => m.items)) {
        if (['TEXT', 'LINK'].includes(item.kind)) { item.resourceId = ''; continue; }
        if (!item.resourceId) continue;
        const originalId = item.resourceId, signature = `${item.kind}:${originalId}`;
        const previous = aliases.get(signature);
        if (previous) { item.resourceId = previous; continue; }
        const key = `resource-${manifest.resources.length + 1}`; aliases.set(signature, key); item.resourceId = key;
        const resource: CoursePackageResource = { key, kind: item.kind as CoursePackageResource['kind'], title: item.title };
        let bytes: Buffer | null = null, extension = '';
        if (item.kind === 'VIDEO') {
          const row = await prisma.videoLesson.findUnique({ where: { id: originalId } });
          const visible = !!row && (actor.role === 'ADMIN' || row.uploadedById === actor.userId || row.status === 'PUBLISHED' && (!row.classId || await canManageExamClass(actor, row.classId)));
          if (visible) {
            resource.title = row.title;
            const name = row.videoUrl.match(/^\/uploads\/videos\/([^/]+\.(mp4|webm))$/i)?.[1];
            if (includeMedia && name) { extension = path.extname(name).toLowerCase(); bytes = await managedFile(videoDir, name, COURSE_PACKAGE_MAX_MEDIA_BYTES - mediaBytes); }
          }
        } else if (item.kind === 'EBOOK') {
          const row = await prisma.ebook.findUnique({ where: { id: originalId } });
          const visible = !!row && (actor.role === 'ADMIN' || row.uploadedById === actor.userId || row.visibility === 'ALL');
          if (visible) {
            resource.title = row.title; if (row.author) resource.author = row.author.slice(0, 200);
            if (includeMedia && row.format === 'PDF' && (actor.role === 'ADMIN' || row.uploadedById === actor.userId || row.downloadAllowed)) { extension = '.pdf'; bytes = await managedFile(ebookDir, row.fileName, COURSE_PACKAGE_MAX_MEDIA_BYTES - mediaBytes); }
          }
        }
        if (bytes) {
          mediaBytes += bytes.length; resource.file = `assets/${key}${extension}`; resource.sha256 = coursePackageDigest(bytes); media.set(resource.file, bytes);
        } else manifest.notes.push(`${resource.title}: media was not included. Reconnect the resource after importing.`);
        manifest.resources.push(resource);
      }
      const name = `${draft.title.replace(/[\x00-\x1f/\\:*?"<>|]/g, '-').slice(0, 100) || 'course'}.zip`;
      await sendZip(res, manifest, media, name);
    });
  }));

  for (const preview of [true, false]) app.post(preview ? '/api/courses/import/preview' : '/api/courses/import', authMiddleware, wrap(async (req, res) => {
    const actor = actorFor(req);
    await operation(async () => {
      let uploadPath: string | undefined;
      try {
        await new Promise<void>((resolve, reject) => upload(req, res, error => error ? reject(error) : resolve()));
        const file = (req as any).file as Express.Multer.File | undefined; uploadPath = file?.path;
        if (!file) throw new CoursePackageError('Choose a course ZIP to import.');
        const parsed = await parseCoursePackage(await fs.readFile(file.path));
        if (preview) { res.json(parsed.preview); return; }
        const { digest, requestKey, rights } = z.object({ digest: z.string().regex(/^[a-f0-9]{64}$/), requestKey: z.string().uuid(), rights: z.literal('true', { error: 'Confirm you may import and share these materials.' }) }).parse(req.body);
        if (digest !== parsed.preview.digest) throw new CoursePackageError('The ZIP changed after preview. Review the selected file again.');
        const hashed = createHash('sha256').update(`${actor.userId}:${requestKey}:${digest}`).digest('hex');
        const courseId = `${hashed.slice(0, 8)}-${hashed.slice(8, 12)}-4${hashed.slice(13, 16)}-a${hashed.slice(17, 20)}-${hashed.slice(20, 32)}`;
        const existing = await prisma.course.findUnique({ where: { id: courseId }, select: { ownerId: true } });
        if (existing?.ownerId === actor.userId) { res.json({ id: courseId, warnings: parsed.preview.warnings, alreadyImported: true }); return; }
        const owner = await prisma.user.findUniqueOrThrow({ where: { id: actor.userId }, select: { firstName: true, lastName: true } });
        const importedFiles: string[] = [], resources = new Map<string, string>(); let committed = false;
        try {
          await Promise.all([fs.mkdir(ebookDir, { recursive: true }), fs.mkdir(videoDir, { recursive: true })]);
          const staged = [];
          for (const resource of parsed.manifest.resources) {
            const media = parsed.media.get(resource.key); if (!media) continue;
            const fileName = `${importedCourseResourcePrefix(courseId)}${randomUUID()}${media.extension}`;
            const target = path.join(resource.kind === 'EBOOK' ? ebookDir : videoDir, fileName);
            await fs.writeFile(target, media.bytes, { flag: 'wx', mode: 0o600 }); importedFiles.push(target);
            staged.push({ resource, media, fileName });
          }
          await prisma.$transaction(async tx => {
            for (const { resource, media, fileName } of staged) {
              const name = `${owner.firstName} ${owner.lastName}`.trim();
              if (resource.kind === 'EBOOK') {
                let title = resource.title, copy = 1;
                while (await findDuplicateEbookTitle(tx, title)) {
                  if (++copy > 100) throw new CoursePackageError(`Rename “${resource.title}” before importing another copy.`);
                  title = `${resource.title} (course copy ${copy})`;
                }
                const row = await tx.ebook.create({ data: { title, titleLower: normalizedTitleForColumn(title), author: resource.author || null, format: 'PDF', fileName, originalName: path.basename(resource.file!), fileSize: media.bytes.length, visibility: 'TEACHERS_ONLY', downloadAllowed: false, uploadedById: actor.userId, uploadedByName: name } }); resources.set(resource.key, row.id);
              } else {
                const row = await tx.videoLesson.create({ data: { title: resource.title, videoUrl: `/uploads/videos/${fileName}`, visibility: 'TEACHERS_ONLY', status: 'DRAFT', uploadedById: actor.userId, uploadedByName: name } }); resources.set(resource.key, row.id);
              }
            }
            const draft = structuredClone(parsed.manifest.course);
            for (const module of draft.modules) {
              module.id = randomUUID();
              for (const item of module.items) { item.id = randomUUID(); item.resourceId = resources.get(item.resourceId) ?? ''; }
            }
            await tx.course.create({ data: { id: courseId, ownerId: actor.userId, draft: draft as unknown as Prisma.InputJsonValue, status: 'DRAFT' } });
          }, { timeout: 30_000 });
          committed = true;
          res.status(201).json({ id: courseId, warnings: parsed.preview.warnings });
        } catch (error) {
          if (!committed) await Promise.all(importedFiles.map(file => fs.unlink(file).catch(cleanupError => logger.error('Could not remove an uncommitted course media file', cleanupError))));
          if ((error as any)?.code === 'P2002') {
            const concurrent = await prisma.course.findUnique({ where: { id: courseId }, select: { ownerId: true } });
            if (concurrent?.ownerId === actor.userId) { res.json({ id: courseId, warnings: parsed.preview.warnings, alreadyImported: true }); return; }
          }
          throw error;
        }
      } finally {
        const filePath = uploadPath ?? (req as any).file?.path;
        if (filePath) await fs.unlink(filePath).catch(error => logger.error('Could not remove temporary course ZIP', error));
      }
    });
  }));
  app.get('/api/courses/:id/imported-media', authMiddleware, wrap(async (req, res) => {
    const { course } = await ownedCourse(req), draft = courseDraftSchema.parse(course.draft), items = draft.modules.flatMap(m => m.items);
    const prefix = importedCourseResourcePrefix(course.id);
    const [books, videos] = await Promise.all([
      prisma.ebook.findMany({ where: { id: { in: items.filter(i => i.kind === 'EBOOK').map(i => i.resourceId) }, uploadedById: course.ownerId, fileName: { startsWith: prefix } }, select: { id: true, title: true, visibility: true } }),
      prisma.videoLesson.findMany({ where: { id: { in: items.filter(i => i.kind === 'VIDEO').map(i => i.resourceId) }, uploadedById: course.ownerId, videoUrl: { startsWith: `/uploads/videos/${prefix}` } }, select: { id: true, title: true, status: true, visibility: true } }),
    ]);
    res.json([...books.map(b => ({ id: b.id, title: b.title, kind: 'EBOOK', href: `/elibrary/${encodeURIComponent(b.id)}/read`, pending: b.visibility === 'TEACHERS_ONLY' })), ...videos.map(v => ({ id: v.id, title: v.title, kind: 'VIDEO', href: `/videos/${encodeURIComponent(v.id)}`, pending: v.status === 'DRAFT' && v.visibility === 'TEACHERS_ONLY' }))]);
  }));
}
