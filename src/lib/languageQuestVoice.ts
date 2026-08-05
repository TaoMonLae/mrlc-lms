import { authHeaders } from '@/src/lib/api';
import {
  kokoroSupportsLanguage,
  languageQuestSpeechLocale,
  normalizeLanguageQuestSpeechText,
  type LanguageQuestVoiceProvider,
} from '@/shared/languageQuestVoice';

export type LanguageQuestVoiceResult = 'kokoro' | 'browser' | 'unavailable' | 'cancelled';

let activeRequest: AbortController | null = null;
let activeAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;
let requestVersion = 0;

export function cancelLanguageQuestVoice(): void {
  requestVersion += 1;
  activeRequest?.abort();
  activeRequest = null;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = '';
    activeAudio = null;
  }
  if (activeAudioUrl) {
    URL.revokeObjectURL(activeAudioUrl);
    activeAudioUrl = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function speakWithBrowser(text: string, language: string): LanguageQuestVoiceResult {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return 'unavailable';
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = languageQuestSpeechLocale(language);
  utterance.rate = 0.88;
  utterance.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return 'browser';
}

async function playAudioBlob(blob: Blob, version: number): Promise<boolean> {
  if (version !== requestVersion) return false;
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  activeAudio = audio;
  activeAudioUrl = url;
  const release = () => {
    URL.revokeObjectURL(url);
    if (activeAudio === audio) activeAudio = null;
    if (activeAudioUrl === url) activeAudioUrl = null;
  };
  audio.addEventListener('ended', release, { once: true });
  audio.addEventListener('error', release, { once: true });
  try {
    await audio.play();
    return true;
  } catch {
    release();
    return false;
  }
}

export async function speakLanguageQuestVoice(
  value: string,
  language: string,
  provider: LanguageQuestVoiceProvider = 'kokoro',
): Promise<LanguageQuestVoiceResult> {
  const text = normalizeLanguageQuestSpeechText(value);
  if (!text) return 'unavailable';

  cancelLanguageQuestVoice();
  const version = requestVersion;
  if (provider === 'browser' || !kokoroSupportsLanguage(language)) {
    return speakWithBrowser(text, language);
  }

  const controller = new AbortController();
  activeRequest = controller;
  try {
    const response = await fetch('/api/language-quest/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ text, language }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Voice request failed (${response.status})`);
    const blob = await response.blob();
    if (version !== requestVersion) return 'cancelled';
    if (await playAudioBlob(blob, version)) return 'kokoro';
  } catch (error: any) {
    if (error?.name === 'AbortError' || version !== requestVersion) return 'cancelled';
  } finally {
    if (activeRequest === controller) activeRequest = null;
  }
  return version === requestVersion ? speakWithBrowser(text, language) : 'cancelled';
}

/** Plays server-owned speech without exposing protected assessment text. */
export async function playLanguageQuestProtectedVoice(
  url: string,
  body: Record<string, string>,
): Promise<LanguageQuestVoiceResult> {
  cancelLanguageQuestVoice();
  const version = requestVersion;
  const controller = new AbortController();
  activeRequest = controller;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) return 'unavailable';
    const blob = await response.blob();
    if (version !== requestVersion) return 'cancelled';
    return await playAudioBlob(blob, version) ? 'kokoro' : 'unavailable';
  } catch (error: any) {
    if (error?.name === 'AbortError' || version !== requestVersion) return 'cancelled';
    return 'unavailable';
  } finally {
    if (activeRequest === controller) activeRequest = null;
  }
}
