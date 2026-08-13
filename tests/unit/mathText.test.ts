import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MathText } from '../../src/components/MathText';

test('MathText leaves ordinary hyphenated prose readable', () => {
  const html = renderToStaticMarkup(createElement(MathText, { text: 'Solve a GED-style, real-world problem.' }));
  assert.match(html, /GED-style, real-world problem/);
  assert.doesNotMatch(html, /class="katex"/);
});

test('MathText still typesets explicit and legacy classroom expressions', () => {
  const explicit = renderToStaticMarkup(createElement(MathText, { text: 'Use $\\frac{3}{4}$ of the total.' }));
  const legacy = renderToStaticMarkup(createElement(MathText, { text: 'Solve x+2=7 now.' }));
  assert.match(explicit, /class="katex"/);
  assert.match(legacy, /class="katex"/);
});
