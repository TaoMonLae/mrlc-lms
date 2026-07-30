import assert from "node:assert/strict";
import test from "node:test";
import {
  createLanguageQuestVoiceService,
} from "../../languageQuestVoice";
import {
  languageQuestSpeechLocale,
  normalizeLanguageQuestSpeechText,
  voxCpmSupportsLanguage,
} from "../../shared/languageQuestVoice";

test("Language Quest maps course languages to speech locales and VoxCPM support", () => {
  assert.equal(languageQuestSpeechLocale("Mandarin Chinese"), "zh-CN");
  assert.equal(languageQuestSpeechLocale("Burmese"), "my-MM");
  assert.equal(voxCpmSupportsLanguage("English"), true);
  assert.equal(voxCpmSupportsLanguage("Myanmar"), true);
  assert.equal(voxCpmSupportsLanguage("Mon"), false);
});

test("Language Quest voice text is normalized and bounded", () => {
  assert.equal(normalizeLanguageQuestSpeechText("  Hello \n learner  "), "Hello learner");
  assert.equal(normalizeLanguageQuestSpeechText(""), null);
  assert.equal(normalizeLanguageQuestSpeechText("x".repeat(501)), null);
  assert.equal(normalizeLanguageQuestSpeechText({ text: "hello" }), null);
});

test("VoxCPM requests are cached and use the private OpenAI-compatible endpoint", async () => {
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
});

test("VoxCPM rejects unsupported languages before making a network request", async () => {
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
