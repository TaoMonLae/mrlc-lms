import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileDomTranslationSource } from '../../src/i18n/domTranslator';

test('DOM translation tracks new React text in a reused node', () => {
  const originalPrompt = 'Which greeting is normally used in the morning?';
  const translatedPrompt = 'မနက်ခင်းမှာ ပုံမှန်အားဖြင့် ဘယ်နှုတ်ဆက်စကားကို သုံးသလဲ။';
  const nextPrompt = 'Choose the polite response to “Thank you.”';

  assert.equal(
    reconcileDomTranslationSource(
      translatedPrompt,
      originalPrompt,
      translatedPrompt,
      true,
    ),
    originalPrompt,
    'the translator should retain the source while its translation is rendered',
  );

  assert.equal(
    reconcileDomTranslationSource(
      nextPrompt,
      originalPrompt,
      translatedPrompt,
      true,
    ),
    nextPrompt,
    'a new React value should replace the remembered source',
  );
});

test('catalog refresh does not mistake an old translation for new source text', () => {
  assert.equal(
    reconcileDomTranslationSource(
      'စာကြည့်တိုက်',
      'Library',
      'Biblioteca',
      false,
    ),
    'Library',
  );
});
