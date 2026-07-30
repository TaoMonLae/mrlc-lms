import assert from "node:assert/strict";
import test from "node:test";
import { languageQuestSpeechLocale } from "../../src/lib/languageQuestSpeechInput";

test("languageQuestSpeechLocale maps every Language Quest course language to a speech-recognition locale", () => {
  assert.equal(languageQuestSpeechLocale("Mandarin Chinese"), "zh-CN");
  assert.equal(languageQuestSpeechLocale("Chinese"), "zh-CN");
  assert.equal(languageQuestSpeechLocale("Spanish"), "es-ES");
  assert.equal(languageQuestSpeechLocale("Burmese"), "my-MM");
  assert.equal(languageQuestSpeechLocale("Myanmar"), "my-MM");
  // Generalized SPEECH_RECORDING (Phase 3): Malay now gets a real locale
  // instead of silently falling back to en-US like every other language.
  assert.equal(languageQuestSpeechLocale("Malay"), "ms-MY");
  assert.equal(languageQuestSpeechLocale("Bahasa Malaysia"), "ms-MY");
  // Anything unmapped still gets a usable fallback rather than no locale at all.
  assert.equal(languageQuestSpeechLocale("English"), "en-US");
  assert.equal(languageQuestSpeechLocale("Klingon"), "en-US");
});
