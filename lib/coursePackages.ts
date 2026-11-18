import JSZip from 'jszip';
import { createHash } from 'node:crypto';
import { TextDecoder } from 'node:util';
import type { Readable } from 'node:stream';
import { courseDraftSchema } from '../shared/courses';
import { coursePackageSchema, safeCoursePackagePath, coursePackageMediaExtension, COURSE_PACKAGE_MAX_BYTES, COURSE_PACKAGE_MAX_EXPANDED_BYTES, COURSE_PACKAGE_MAX_MEDIA_BYTES, type CoursePackage, type CoursePackagePreview } from '../shared/coursePackage';

export class CoursePackageError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export const coursePackageDigest = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');
export interface ParsedCoursePackage {
  manifest: CoursePackage; preview: CoursePackagePreview;
  media: Map<string, { bytes: Buffer; extension: '.pdf' | '.mp4' | '.webm' }>;
}
function preflightZip(buffer: Buffer) {
  // Bound the directory before JSZip allocates an object for every entry. Small
  // compressed files can otherwise contain an enormous number of empty entries.
  let end = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65557); offset--) {
    if (buffer.readUInt32LE(offset) === 0x06054b50 && offset + 22 + buffer.readUInt16LE(offset + 20) === buffer.length) { end = offset; break; }
  }
  if (end < 0) throw new CoursePackageError('This file is not a readable ZIP. Re-export the package and try again.');
  const count = buffer.readUInt16LE(end + 10), size = buffer.readUInt32LE(end + 12), start = buffer.readUInt32LE(end + 16);
  if (buffer.readUInt16LE(end + 4) || buffer.readUInt16LE(end + 6) || buffer.readUInt16LE(end + 8) !== count) throw new CoursePackageError('Split ZIP archives are not supported.');
  if (count > 650) throw new CoursePackageError('The package contains too many files.');
  if (start + size !== end || start > end) throw new CoursePackageError('The ZIP directory is invalid. Re-export the package and try again.');
  let offset = start, total = 0; const names = new Set<string>();
  for (let index = 0; index < count; index++) {
    if (offset + 46 > end || buffer.readUInt32LE(offset) !== 0x02014b50) throw new CoursePackageError('The ZIP directory is incomplete.');
    if (buffer.readUInt16LE(offset + 8) & 1) throw new CoursePackageError('Encrypted ZIP files are not supported.');
    const nameSize = buffer.readUInt16LE(offset + 28), extraSize = buffer.readUInt16LE(offset + 30), commentSize = buffer.readUInt16LE(offset + 32);
    const next = offset + 46 + nameSize + extraSize + commentSize;
    if (next > end || nameSize > 1024) throw new CoursePackageError('The ZIP directory contains an invalid file name.');
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameSize).replace(/\/$/, '').normalize('NFC').toLocaleLowerCase();
    if (names.has(name)) throw new CoursePackageError('The ZIP contains duplicate file names.');
    names.add(name); total += buffer.readUInt32LE(offset + 24);
    if (total > COURSE_PACKAGE_MAX_EXPANDED_BYTES) throw new CoursePackageError('The expanded package exceeds 200 MiB.', 413);
    offset = next;
  }
  if (offset !== end) throw new CoursePackageError('The ZIP file count does not match its contents.');
}
async function readBounded(entry: JSZip.JSZipObject, limit: number, budget: { bytes: number }): Promise<Buffer> {
  const size = (entry as any)._data?.uncompressedSize;
  if (typeof size === 'number' && size > limit) throw new CoursePackageError(`“${entry.name}” exceeds its size limit.`, 413);
  const stream = entry.nodeStream('nodebuffer') as Readable;
  const chunks: Buffer[] = []; let length = 0;
  try {
    // JSZip uses an older readable-stream implementation without async iterators.
    await new Promise<void>((resolve, reject) => {
      stream.on('data', chunk => {
        const bytes = Buffer.from(chunk); length += bytes.length; budget.bytes += bytes.length;
        if (length > limit || budget.bytes > COURSE_PACKAGE_MAX_EXPANDED_BYTES) {
          stream.destroy(); reject(new CoursePackageError('The expanded package is too large. Split it into smaller courses.', 413)); return;
        }
        chunks.push(bytes);
      });
      stream.once('end', resolve); stream.once('error', reject);
    });
  } finally { stream.destroy(); }
  return Buffer.concat(chunks, length);
}
function textFile(bytes: Buffer, name: string): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new CoursePackageError(`“${name}” must be saved as UTF-8 text.`); }
}
export async function parseCoursePackage(buffer: Buffer): Promise<ParsedCoursePackage> {
  if (buffer.length > COURSE_PACKAGE_MAX_BYTES) throw new CoursePackageError('Choose a ZIP smaller than 90 MiB.', 413);
  preflightZip(buffer);
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(buffer, { createFolders: false }); }
  catch { throw new CoursePackageError('This file is not a readable ZIP. Encrypted and split archives are not supported.'); }
  const entries = Object.values(zip.files);
  if (entries.length > 650) throw new CoursePackageError('The package contains too many files.');
  const seen = new Set<string>(); let claimedSize = 0;
  for (const entry of entries) {
    const original = (entry as any).unsafeOriginalName ?? entry.name;
    const name = original.replace(/\/$/, '');
    if (!safeCoursePackagePath(name) || original.replace(/\/$/, '') !== entry.name.replace(/\/$/, '')) throw new CoursePackageError('The ZIP contains an unsafe file path.');
    if ((Number(entry.unixPermissions) & 0o170000) === 0o120000) throw new CoursePackageError('Symbolic links are not supported in course packages.');
    if (seen.has(name.toLocaleLowerCase())) throw new CoursePackageError('The ZIP contains duplicate file names.');
    seen.add(name.toLocaleLowerCase());
    claimedSize += Number((entry as any)._data?.uncompressedSize ?? 0);
    if (!Number.isSafeInteger(claimedSize) || claimedSize > COURSE_PACKAGE_MAX_EXPANDED_BYTES) throw new CoursePackageError('The expanded package exceeds 200 MiB.', 413);
  }
  const files = entries.filter(e => !e.dir && !e.name.startsWith('__MACOSX/') && !e.name.endsWith('/.DS_Store') && e.name !== '.DS_Store');
  let root = '';
  if (!zip.file('course.json')) {
    const roots = files.filter(e => /^[^/]+\/course\.json$/.test(e.name));
    if (roots.length !== 1) throw new CoursePackageError('The ZIP needs course.json at its top level or inside one course folder.');
    root = roots[0].name.slice(0, -'course.json'.length);
  }
  if (files.some(e => !e.name.startsWith(root))) throw new CoursePackageError('Keep all course files inside the same folder.');
  const budget = { bytes: 0 }, json = zip.file(`${root}course.json`);
  if (!json) throw new CoursePackageError('course.json is missing.');
  let raw: unknown;
  try { raw = JSON.parse(textFile(await readBounded(json, 2 * 1024 * 1024, budget), 'course.json')); }
  catch (error) { if (error instanceof CoursePackageError) throw error; throw new CoursePackageError('course.json is not valid JSON. Download a starter package for an example.'); }
  const result = coursePackageSchema.safeParse(raw);
  if (!result.success) throw new CoursePackageError(result.error.issues[0]?.message || 'The course manifest is invalid.');
  const manifest = result.data;
  const allowed = new Set(['course.json', 'README.txt']);
  const entryFor = (name: string) => {
    if (!safeCoursePackagePath(name)) throw new CoursePackageError('A lesson or resource has an unsafe file path.');
    const entry = zip.file(root + name);
    if (!entry) throw new CoursePackageError(`“${name}” is missing from the ZIP.`);
    allowed.add(name); return entry;
  };
  for (const module of manifest.course.modules) for (const item of module.items) {
    const file = manifest.lessonFiles[item.id];
    if (!file) continue;
    if (!/^lessons\/[^/]+\.txt$/i.test(file)) throw new CoursePackageError('Lesson text files must be .txt files in lessons/.');
    item.content = textFile(await readBounded(entryFor(file), 120_000, budget), file);
  }
  const checked = courseDraftSchema.safeParse(manifest.course);
  if (!checked.success) throw new CoursePackageError(checked.error.issues[0]?.message || 'Check the lesson text.');
  manifest.course = checked.data;
  const media: ParsedCoursePackage['media'] = new Map(); const warnings: string[] = []; let mediaBytes = 0;
  const resources: CoursePackagePreview['resources'] = [];
  for (const resource of manifest.resources) {
    let bytes: Buffer | undefined;
    if (resource.file) {
      const extension = coursePackageMediaExtension(resource);
      if (!extension || !/^assets\/[^/]+$/i.test(resource.file)) throw new CoursePackageError(`${resource.title}: use a PDF, MP4 or WebM file in assets/.`);
      bytes = await readBounded(entryFor(resource.file), COURSE_PACKAGE_MAX_MEDIA_BYTES, budget);
      mediaBytes += bytes.length;
      if (mediaBytes > COURSE_PACKAGE_MAX_MEDIA_BYTES) throw new CoursePackageError('Included media exceeds 80 MiB. Upload larger videos separately.', 413);
      const valid = extension === '.pdf' ? bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))
        : extension === '.mp4' ? bytes.length >= 12 && bytes.toString('ascii', 4, 8) === 'ftyp'
        : bytes.length >= 4 && bytes.readUInt32BE(0) === 0x1a45dfa3;
      if (!valid) throw new CoursePackageError(`${resource.title}: the file contents do not match its format.`);
      if (resource.sha256 && coursePackageDigest(bytes) !== resource.sha256) throw new CoursePackageError(`${resource.title}: the file checksum changed. Export it again, or remove sha256 after intentionally replacing the file.`);
      media.set(resource.key, { bytes, extension });
    } else warnings.push(`${resource.title}: reconnect this ${resource.kind.toLowerCase()} resource after importing.`);
    resources.push({ key: resource.key, title: resource.title, kind: resource.kind, included: !!bytes, bytes: bytes?.length ?? 0 });
  }
  for (const entry of files) if (!allowed.has(entry.name.slice(root.length))) throw new CoursePackageError(`“${entry.name.slice(root.length)}” is not referenced by the course. Remove extra files before importing.`);
  if (media.size) warnings.push('Included media stays staff-only until an administrator approves the course.');
  if (manifest.course.modules.some(m => m.items.some(i => i.kind === 'LINK'))) warnings.push('External reading links still require internet.');
  return { manifest, media, preview: { digest: coursePackageDigest(buffer), course: manifest.course, resources, warnings } };
}
