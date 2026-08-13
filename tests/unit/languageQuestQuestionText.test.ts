import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  LanguageQuestQuestionText,
  languageQuestRlaQuestionParts,
} from '../../src/components/games/LanguageQuestQuestionText';

const rlaText = 'A short source passage with evidence for the learner.\n\nWhich detail is supported?';

test('GED RLA questions separate their source passage from the prompt', () => {
  assert.deepEqual(languageQuestRlaQuestionParts('GED RLA', rlaText), {
    passage: 'A short source passage with evidence for the learner.',
    question: 'Which detail is supported?',
  });
  assert.equal(languageQuestRlaQuestionParts('GED Science', rlaText), null);
  assert.equal(languageQuestRlaQuestionParts('GED RLA', 'Question without a source separator'), null);
});

test('GED RLA sources render in a scrollable box outside the question heading', () => {
  const html = renderToStaticMarkup(createElement(LanguageQuestQuestionText, {
    language: 'GED RLA',
    text: rlaText,
    headingLevel: 2,
  }));

  assert.match(html, /Source passage/);
  assert.match(html, /role="region"/);
  assert.match(html, /overflow-y-auto/);
  assert.match(html, /<h2[^>]*>Which detail is supported\?<\/h2>/);
  assert.doesNotMatch(html, /<h2[^>]*>[^<]*A short source passage/);
});
