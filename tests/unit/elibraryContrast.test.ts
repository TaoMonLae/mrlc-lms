import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8');
function rule(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`))?.[1];
  assert.ok(block, `Missing contrast rule: ${selector}`);
  return block;
}
function value(block: string, property: string): string {
  const result = block.match(new RegExp(`(?:^|;)\\s*${property}:\\s*([^;]+)`))?.[1].trim();
  assert.ok(result, `Missing ${property}`);
  const token = result.match(/^var\((--elib-[a-z-]+)\)$/)?.[1];
  return token ? value(rule('.dark .elibrary-catalog-page'), token) : result;
}
function contrast(a: string, b: string) {
  const luminance = (hex: string) => {
    assert.match(hex, /^#[0-9a-f]{6}$/i);
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  };
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
test('E-Library dark search and staff panels keep paired readable surface/text colors', () => {
  const panel = rule('.dark .elibrary-search-panel,\n.dark .elibrary-staff-rail');
  assert.ok(contrast(value(panel, 'color'), value(panel, 'background')) >= 4.5);
  const label = rule('.dark .elibrary-staff-rail > div:first-child span');
  assert.ok(contrast(value(label, 'color'), value(panel, 'background')) >= 4.5);
});
test('E-Library dark search input and placeholder remain readable', () => {
  const input = rule('.dark .elibrary-search-field input');
  const bg = value(input, 'background');
  assert.ok(contrast(value(input, 'color'), bg) >= 4.5);
  assert.ok(contrast(value(rule('.dark .elibrary-search-field input::placeholder'), 'color'), bg) >= 4.5);
});
test('E-Library badges and primary staff actions do not put white text on light backgrounds', () => {
  const badge = rule('.dark .elibrary-book-card__volume');
  assert.ok(contrast(value(badge, 'color'), value(badge, 'background')) >= 4.5);
  const primary = rule('.dark .elibrary-staff-rail__actions a.is-primary');
  assert.ok(contrast(value(primary, 'color'), value(rule('.dark .elibrary-catalog-page'), '--elib-action')) >= 4.5);
  const hover = rule('.dark .elibrary-genre-index button:hover em');
  assert.ok(contrast(value(hover, 'color'), value(rule('.dark .elibrary-catalog-page'), '--elib-ink')) >= 4.5);
});
