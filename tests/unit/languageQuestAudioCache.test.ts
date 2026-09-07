import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { courseAudioKey, createSavedCourseAudioLibrary, emptyCourseAudioIndex } from '../../languageQuestAudioCache';
import { languageQuestVoiceServiceFromEnv } from '../../languageQuestVoice';
import { buildCourseAudioPlan } from '../../shared/languageQuestAudioPlan';

test('saved audio survives service restarts without an API key; misses make no paid request', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'lq-audio-'));
  try {
    const file = `${'a'.repeat(64)}.mp3`;
    const index = emptyCourseAudioIndex();
    index.clips[courseAudioKey('Selamat pagi', 'Malay')] = { file, language: 'malay', model: 'eleven_flash_v2_5', voice: 'educator', characters: 12 };
    await writeFile(path.join(directory, file), Buffer.alloc(256, 1));
    await writeFile(path.join(directory, 'index.json'), JSON.stringify(index));
    for (let i = 0; i < 2; i++) {
      const service = languageQuestVoiceServiceFromEnv({ LANGUAGE_QUEST_AUDIO_DIR: directory });
      assert.equal(service.enabled, true);
      assert.equal(service.supportsLanguage('Malay'), true);
      assert.equal(service.canSynthesize('Selamat pagi', 'Malay'), true);
      assert.equal(service.canSynthesize('New content', 'Malay'), false);
      assert.equal((await service.synthesize('  Selamat\n pagi ', 'Malay')).data.length, 256);
      await assert.rejects(service.synthesize('New content', 'Malay'), /No saved course audio/);
    }
    await unlink(path.join(directory, file));
    assert.equal(createSavedCourseAudioLibrary(directory).has('Selamat pagi', 'Malay'), false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('cache isolates languages and refuses paths outside its directory', async () => {
  assert.notEqual(courseAudioKey('chat', 'English'), courseAudioKey('chat', 'French'));
  const directory = await mkdtemp(path.join(tmpdir(), 'lq-audio-'));
  try {
    const index = emptyCourseAudioIndex();
    index.clips[courseAudioKey('Hello', 'English')] = { file: '../private.mp3', language: 'english', model: 'test', voice: 'test', characters: 5 };
    await writeFile(path.join(directory, 'index.json'), JSON.stringify(index));
    const library = createSavedCourseAudioLibrary(directory);
    assert.equal(library.has('Hello', 'English'), false);
    assert.equal(await library.read('Hello', 'English'), null);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('plan deduplicates repeated course words, includes protected dictation and excludes subjects', () => {
  const challenge = { type: 'DICTATION', question: 'Listen and spell.', options: [{ text: 'Hello', audioText: 'Hello!', correct: true }] };
  const plan = buildCourseAudioPlan([
    { code: 'en1', title: 'English 1', language: 'English', challenges: [challenge] },
    { code: 'en2', title: 'English 2', language: 'English', challenges: [challenge] },
    { code: 'math', title: 'Math', language: 'Mathematics', challenges: [challenge] },
  ]);
  assert.equal(plan.clips.filter((clip) => clip.text === 'Hello!').length, 1);
  assert.deepEqual(plan.clips.find((clip) => clip.text === 'Hello!')?.courses, ['en1', 'en2']);
  assert.ok(plan.clips.some((clip) => clip.text === 'Hello'));
  assert.ok(plan.skipped.some((entry) => entry.course === 'math'));
  assert.ok(plan.clips.every((clip) => clip.language === 'english'));
});

test('vocabulary-only generation excludes question narration and story recordings', () => {
  const plan = buildCourseAudioPlan([{ code: 'en', title: 'English', language: 'English', challenges: [{
    type: 'SELECT', question: 'Which greeting is polite?', options: [
      { text: 'Hello', audioText: 'Hello', correct: true },
      { text: 'Goodbye', audioText: 'Goodbye', correct: false },
    ],
  }] }], { vocabularyOnly: true });
  assert.deepEqual(plan.clips.map((clip) => clip.text).sort(), ['Goodbye', 'Hello']);
});
