import {
  normalizeLanguageQuestLanguage,
  normalizeLanguageQuestSpeechText,
  voxCpmSupportsLanguage,
} from "./shared/languageQuestVoice";

const DEFAULT_MODEL = "openbmb/VoxCPM2";
const DEFAULT_VOICE = "A warm, clear teacher voice with patient pronunciation and a friendly pace";
const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 48;

export interface LanguageQuestVoiceAudio {
  contentType: string;
  data: Buffer;
}

export interface LanguageQuestVoiceService {
  enabled: boolean;
  model: string;
  synthesize: (text: string, language: string) => Promise<LanguageQuestVoiceAudio>;
}

interface VoiceServiceOptions {
  apiUrl?: string;
  model?: string;
  voice?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

function validAudioContentType(value: string | null): string {
  if (!value?.toLowerCase().startsWith("audio/")) return "audio/wav";
  return value.split(";", 1)[0];
}

export function createLanguageQuestVoiceService(
  options: VoiceServiceOptions = {},
): LanguageQuestVoiceService {
  const apiUrl = options.apiUrl?.trim().replace(/\/+$/, "") || "";
  const model = options.model?.trim() || DEFAULT_MODEL;
  const voice = options.voice?.trim() || DEFAULT_VOICE;
  const timeoutMs = Number.isFinite(options.timeoutMs)
    ? Math.max(5_000, Number(options.timeoutMs))
    : DEFAULT_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl || fetch;
  const cache = new Map<string, LanguageQuestVoiceAudio>();
  const pending = new Map<string, Promise<LanguageQuestVoiceAudio>>();

  async function generate(textValue: string, languageValue: string): Promise<LanguageQuestVoiceAudio> {
    if (!apiUrl) throw new Error("VoxCPM voice service is not configured");
    const text = normalizeLanguageQuestSpeechText(textValue);
    const language = normalizeLanguageQuestLanguage(languageValue);
    if (!text) throw new Error("Voice text is empty or too long");
    if (!voxCpmSupportsLanguage(language)) throw new Error("VoxCPM does not support this course language");

    const key = `${language}\u0000${text}`;
    const cached = cache.get(key);
    if (cached) {
      cache.delete(key);
      cache.set(key, cached);
      return cached;
    }
    const existing = pending.get(key);
    if (existing) return existing;

    const request = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(`${apiUrl}/v1/audio/speech`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            input: text,
            voice,
            language,
            response_format: "wav",
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          throw new Error(`VoxCPM returned ${response.status}${detail ? `: ${detail.slice(0, 160)}` : ""}`);
        }
        const data = Buffer.from(await response.arrayBuffer());
        if (data.length < 44 || data.length > MAX_AUDIO_BYTES) {
          throw new Error("VoxCPM returned an invalid audio payload");
        }
        const audio = {
          contentType: validAudioContentType(response.headers.get("content-type")),
          data,
        };
        if (cache.size >= MAX_CACHE_ENTRIES) {
          const oldest = cache.keys().next().value;
          if (oldest) cache.delete(oldest);
        }
        cache.set(key, audio);
        return audio;
      } finally {
        clearTimeout(timeout);
      }
    })();

    pending.set(key, request);
    try {
      return await request;
    } finally {
      pending.delete(key);
    }
  }

  return { enabled: Boolean(apiUrl), model, synthesize: generate };
}

export function languageQuestVoiceServiceFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): LanguageQuestVoiceService {
  const parsedTimeout = Number(env.VOXCPM_TIMEOUT_MS);
  return createLanguageQuestVoiceService({
    apiUrl: env.VOXCPM_API_URL,
    model: env.VOXCPM_MODEL,
    voice: env.VOXCPM_VOICE,
    timeoutMs: Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : undefined,
  });
}
