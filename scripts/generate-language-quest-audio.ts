import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import { mkdir, open, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { buildCourseAudioPlan, type AudioCourse, type CourseAudioText } from '../shared/languageQuestAudioPlan';
import { courseAudioDirectory, courseAudioKey, emptyCourseAudioIndex, type SavedCourseAudioIndex } from '../languageQuestAudioCache';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });
const directory = courseAudioDirectory();
const args = process.argv.slice(2);
const generate = args.includes('--generate');
const model = 'eleven_flash_v2_5';
const settings = { stability: 0.65, similarity_boost: 0.75, speed: 0.9 };
const voiceFor = (language: string) => process.env[`ELEVENLABS_VOICE_${language.startsWith('mandarin') || language === 'chinese' ? 'CHINESE' : language === 'bahasa melayu' ? 'MALAY' : language.toUpperCase()}`] || process.env.ELEVENLABS_VOICE_ID || 'Xb7hH8MSUJpSbSDYk0k2';
const indexPath = path.join(directory, 'index.json');
await mkdir(directory, { recursive: true });
const lockPath = path.join(directory, 'generation.lock');
const lock = await open(lockPath, 'wx').catch(() => { throw new Error('Another generation is running, or a previous run was interrupted. Check generation.lock before resuming.'); });
await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
try {
  let courses: AudioCourse[];
  const snapshotAt = args.indexOf('--snapshot');
  if (snapshotAt >= 0) courses = JSON.parse(await readFile(args[snapshotAt + 1], 'utf8'));
  else {
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
    try {
      const rows = await prisma.languageQuestCourse.findMany({ where: { published: true }, orderBy: [{ language: 'asc' }, { title: 'asc' }], include: { units: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' }, include: { challenges: { orderBy: { order: 'asc' }, include: { options: { orderBy: { order: 'asc' } } } } } } } } } });
      courses = rows.map((course) => ({ code: course.code, title: course.title, language: course.language, challenges: course.units.flatMap((unit) => unit.lessons.flatMap((lesson) => lesson.challenges)) }));
      await writeFile(path.join(directory, 'courses.json'), JSON.stringify(courses));
    } finally { await prisma.$disconnect(); }
  }
  const languageAt = args.indexOf('--language');
  if (languageAt >= 0) {
    const language = args[languageAt + 1]?.trim().toLowerCase();
    if (!language) throw new Error('Provide a language after --language');
    courses = courses.filter((course) => course.language.toLowerCase() === language);
    if (!courses.length) throw new Error('No published courses match this language');
  }
  const plan = buildCourseAudioPlan(courses, { vocabularyOnly: args.includes('--vocabulary-only') });
  let index: SavedCourseAudioIndex;
  try { index = JSON.parse(await readFile(indexPath, 'utf8')); }
  catch (error: any) { if (error.code !== 'ENOENT') throw error; index = emptyCourseAudioIndex(); }
  if (index.version !== 1 || !index.clips) throw new Error('Unsupported audio index');
  const missing: CourseAudioText[] = [];
  for (const clip of plan.clips) {
    const entry = index.clips[courseAudioKey(clip.text, clip.language)];
    const saved = entry && /^[a-f0-9]{64}\.mp3$/.test(entry.file) && await stat(path.join(directory, entry.file)).catch(() => null);
    if (!saved || saved.size < 128) missing.push(clip);
  }
  const characters = missing.reduce((sum, clip) => sum + clip.text.length, 0);
  const summary = { courses: courses.length, totalClips: plan.clips.length, missingClips: missing.length, characters, estimatedCredits: Math.ceil(characters / 2), skipped: plan.skipped };
  await writeFile(path.join(directory, 'plan.json'), JSON.stringify({ ...summary, clips: plan.clips }, null, 2));
  console.log(JSON.stringify(summary));
  if (generate && missing.length) {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error('Add ELEVENLABS_API_KEY to .env.local');
    async function subscription() {
      const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': key! }, signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`Credit check failed (${response.status}); enable User: Read on the API key.`);
      const data = await response.json();
      if (!Number.isFinite(data.character_limit) || !Number.isFinite(data.character_count)) throw new Error('Invalid credit balance');
      return { available: Math.max(0, data.character_limit - data.character_count), used: data.character_count };
    }
    const before = await subscription();
    console.log(JSON.stringify({ availableCredits: before.available, estimatedCredits: summary.estimatedCredits }));
    if (summary.estimatedCredits > before.available) throw new Error('The remaining audio exceeds included credits. No audio generated; reduce the course snapshot or resume after credits reset.');
    // One owner and sequential atomic index commits; parallel requests never overwrite another clip.
    let commits = Promise.resolve();
    async function commit() {
      const run = commits.then(async () => {
        await writeFile(`${indexPath}.tmp`, JSON.stringify(index));
        await rename(`${indexPath}.tmp`, indexPath);
      });
      commits = run.catch(() => {});
      await run;
    }
    let completed = 0;
    let cursor = 0;
    let failure: unknown;
    let reserved = 0;
    const maxAt = args.indexOf('--limit');
    const limit = maxAt >= 0 ? Number(args[maxAt + 1]) : missing.length;
    if (!Number.isInteger(limit) || limit < 1) throw new Error('Invalid --limit');
    async function worker() {
      while (!failure && cursor < Math.min(missing.length, limit)) {
        const clip = missing[cursor++];
        try {
          const voice = voiceFor(clip.language);
          const hash = createHash('sha256').update(JSON.stringify([model, voice, settings, clip.language, clip.text])).digest('hex');
          const file = `${hash}.mp3`;
          const audioPath = path.join(directory, file);
          const pendingPath = `${audioPath}.pending`;
          const already = await stat(audioPath).catch(() => null);
          if (!already || already.size < 128) {
            // Never automatically repeat a request whose billing/result is uncertain.
            const pending = await open(pendingPath, 'wx').catch(() => { throw new Error(`Unresolved generation ${hash}. Check provider history before retrying.`); });
            await pending.writeFile(JSON.stringify({ startedAt: new Date().toISOString(), key: courseAudioKey(clip.text, clip.language) }));
            await pending.close();
            const cost = Math.ceil(clip.text.length / 2);
            if (reserved + cost > before.available) { await unlink(pendingPath); throw new Error('Included-credit safety limit reached'); }
            reserved += cost;
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
              method: 'POST', headers: { 'xi-api-key': key!, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
              body: JSON.stringify({ text: clip.text, model_id: model, voice_settings: settings }), signal: AbortSignal.timeout(120000),
            });
            if (!response.ok) {
              const detail = await response.json().catch(() => ({}));
              if (response.status < 500) await unlink(pendingPath);
              throw new Error(`ElevenLabs ${response.status}: ${String(detail.detail?.message || detail.detail?.status || 'generation failed').slice(0, 250)}`);
            }
            const data = Buffer.from(await response.arrayBuffer());
            if (!response.headers.get('content-type')?.startsWith('audio/') || data.length < 128 || data.length > 12 * 1024 * 1024) throw new Error('Invalid audio response; generation will not be retried automatically');
            await writeFile(`${audioPath}.tmp`, data);
            await rename(`${audioPath}.tmp`, audioPath);
            await unlink(pendingPath);
          }
          index.clips[courseAudioKey(clip.text, clip.language)] = { file, language: clip.language, model, voice, characters: clip.text.length };
          await commit();
          completed++;
          if (completed % 25 === 0 || completed === Math.min(missing.length, limit)) console.log(JSON.stringify({ saved: completed, target: Math.min(missing.length, limit), libraryClips: Object.keys(index.clips).length }));
        } catch (error) { failure = error; }
      }
    }
    await Promise.all(Array.from({ length: 4 }, () => worker()));
    await commits;
    const after = await subscription();
    console.log(JSON.stringify({ savedThisRun: completed, creditsUsed: after.used - before.used, remainingCredits: after.available }));
    await writeFile(path.join(directory, 'last-run.json'), JSON.stringify({ at: new Date().toISOString(), savedThisRun: completed, creditsUsed: after.used - before.used, remainingCredits: after.available, failure: failure instanceof Error ? failure.message : null }, null, 2));
    if (failure) throw failure;
  }
  // Exams use recordings only after the entire language snapshot is available.
  const languages = [...new Set(plan.clips.map((clip) => clip.language))];
  index.completeLanguages = languages.filter((language) => plan.clips.filter((clip) => clip.language === language).every((clip) => Boolean(index.clips[courseAudioKey(clip.text, language)])));
  await writeFile(`${indexPath}.tmp`, JSON.stringify(index));
  await rename(`${indexPath}.tmp`, indexPath);
} finally {
  await lock.close();
  await unlink(lockPath);
}
