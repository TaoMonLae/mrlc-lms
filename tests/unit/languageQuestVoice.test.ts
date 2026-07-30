import assert from "node:assert/strict";
import test from "node:test";
import {
  createLanguageQuestVoiceService,
} from "../../languageQuestVoice";
import {
  kokoroSupportsLanguage,
  languageQuestKokoroVoice,
  languageQuestSpeechLocale,
  normalizeLanguageQuestSpeechText,
} from "../../shared/languageQuestVoice";

test("Language Quest maps course languages to speech locales and Kokoro support", () => {
  assert.equal(languageQuestSpeechLocale("Mandarin Chinese"), "zh-CN");
  assert.equal(languageQuestSpeechLocale("Burmese"), "my-MM");
  assert.equal(kokoroSupportsLanguage("English"), true);
  // Kokoro's published voice list has no Burmese/Myanmar voice, unlike the
  // prior VoxCPM provider -- Burmese now falls back to browser speech.
  assert.equal(kokoroSupportsLanguage("Myanmar"), false);
  assert.equal(kokoroSupportsLanguage("Burmese"), false);
  assert.equal(kokoroSupportsLanguage("Mon"), false);
});

test("Language Quest picks a named Kokoro voice per supported language", () => {
  assert.deepEqual(languageQuestKokoroVoice("English"), { langCode: "a", voice: "af_heart" });
  assert.deepEqual(languageQuestKokoroVoice("Mandarin Chinese"), { langCode: "z", voice: "zf_xiaoxiao" });
  assert.deepEqual(languageQuestKokoroVoice("Japanese"), { langCode: "j", voice: "jf_alpha" });
  assert.equal(languageQuestKokoroVoice("Mon"), null);
  assert.equal(languageQuestKokoroVoice("Myanmar"), null);
});

test("Language Quest voice text is normalized and bounded", () => {
  assert.equal(normalizeLanguageQuestSpeechText("  Hello \n learner  "), "Hello learner");
  assert.equal(normalizeLanguageQuestSpeechText(""), null);
  assert.equal(normalizeLanguageQuestSpeechText("x".repeat(501)), null);
  assert.equal(normalizeLanguageQuestSpeechText({ text: "hello" }), null);
});

test("Kokoro requests are cached and use the private OpenAI-compatible endpoint", async () => {
  const calls: Array<{ url: string; body: any }> = [];
  const wav = new Uint8Array(64);
  wav.set([82, 73, 70, 70], 0);
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(input),
      body: JSON.parse(String(init?.body)),
    });
    return new Response(wav, { headers: { "Content-Type": "audio/wav" } });
  };
  const service = createLanguageQuestVoiceService({
    apiUrl: "http://127.0.0.1:8810/",
    fetchImpl: fetchImpl as typeof fetch,
  });

  const first = await service.synthesize("Good morning", "English");
  const second = await service.synthesize("Good morning", "English");

  assert.equal(service.enabled, true);
  assert.equal(first.data.length, 64);
  assert.equal(second, first);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://127.0.0.1:8810/v1/audio/speech");
  assert.equal(calls[0].body.input, "Good morning");
  assert.equal(calls[0].body.language, "english");
  assert.equal(calls[0].body.voice, "af_heart");
  assert.equal(calls[0].body.lang_code, "a");
});

test("Kokoro rejects unsupported languages before making a network request", async () => {
  let called = false;
  const service = createLanguageQuestVoiceService({
    apiUrl: "http://127.0.0.1:8810",
    fetchImpl: (async () => {
      called = true;
      return new Response();
    }) as typeof fetch,
  });

  await assert.rejects(() => service.synthesize("ဟာဲ", "Mon"), /does not support/);
  assert.equal(called, false);
});

test("Kokoro rejects Burmese now that it falls back to browser speech", async () => {
  let called = false;
  const service = createLanguageQuestVoiceService({
    apiUrl: "http://127.0.0.1:8810",
    fetchImpl: (async () => {
      called = true;
      return new Response();
    }) as typeof fetch,
  });

  await assert.rejects(() => service.synthesize("Hello", "Burmese"), /does not support/);
  assert.equal(called, false);
});
