import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeLanguageQuestLanguage, normalizeLanguageQuestSpeechText } from './shared/languageQuestVoice';

export interface SavedCourseAudioIndex {
  version: 1;
  clips: Record<string, { file: string; language: string; model: string; voice: string; characters: number }>;
  completeLanguages: string[];
}

export const emptyCourseAudioIndex = (): SavedCourseAudioIndex => ({ version: 1, clips: {}, completeLanguages: [] });
export const courseAudioDirectory = (env: NodeJS.ProcessEnv = process.env) =>
  path.resolve(env.LANGUAGE_QUEST_AUDIO_DIR || 'data/language-quest-audio');

export function courseAudioKey(text: string, language: string): string {
  const normalized = normalizeLanguageQuestSpeechText(text);
  if (!normalized) throw new Error('Voice text is empty or too long');
  return createHash('sha256').update(JSON.stringify([normalizeLanguageQuestLanguage(language), normalized])).digest('hex');
}

/** Read-only playback. This module never calls ElevenLabs or needs an API key. */
export function createSavedCourseAudioLibrary(directory = courseAudioDirectory()) {
  const indexPath = path.join(directory, 'index.json');
  let index = emptyCourseAudioIndex();
  let stamp = '';
  function refresh() {
    try {
      const stat = statSync(indexPath);
      const next = `${stat.mtimeMs}:${stat.size}`;
      if (next !== stamp) {
        const parsed = JSON.parse(readFileSync(indexPath, 'utf8'));
        if (parsed.version !== 1 || !parsed.clips || !Array.isArray(parsed.completeLanguages)) throw new Error('Invalid audio index');
        index = parsed;
        stamp = next;
      }
    } catch {
      index = emptyCourseAudioIndex();
      stamp = '';
    }
    return index;
  }
  return {
    get enabled() { return Object.keys(refresh().clips).length > 0; },
    supportsLanguage(language: string) {
      const normalized = normalizeLanguageQuestLanguage(language);
      return Object.values(refresh().clips).some((clip) => clip.language === normalized);
    },
    completeLanguage(language: string) {
      return refresh().completeLanguages.includes(normalizeLanguageQuestLanguage(language));
    },
    has(text: string, language: string) {
      if (!normalizeLanguageQuestSpeechText(text)) return false;
      const clip = refresh().clips[courseAudioKey(text, language)];
      if (!clip || !/^[a-f0-9]{64}\.mp3$/.test(clip.file)) return false;
      try { return statSync(path.join(directory, clip.file)).size >= 128; }
      catch { return false; }
    },
    async read(text: string, language: string) {
      const clip = refresh().clips[courseAudioKey(text, language)];
      if (!clip || !/^[a-f0-9]{64}\.mp3$/.test(clip.file)) return null;
      const file = path.join(directory, clip.file);
      if (!existsSync(file)) return null;
      const data = await readFile(file);
      if (data.length < 128) return null;
      return { contentType: 'audio/mpeg', data, provider: 'elevenlabs' as const };
    },
  };
}
