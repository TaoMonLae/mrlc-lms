import assert from 'node:assert/strict';
import test from 'node:test';
import { ebookMatchesSearch, normalizeEbookSearchText } from '../../lib/ebookSearch';

const book = {
  title: "Harry Potter and the Philosopher's Stone",
  author: 'J. K. Rowling',
  description: 'A young wizard begins his education.',
  category: 'Fantasy',
  seriesName: 'Harry Potter',
  language: 'English',
  format: 'EPUB',
};

test('normalizes casing, Unicode width, and repeated whitespace', () => {
  assert.equal(normalizeEbookSearchText('  ＨＡＲＲＹ   Potter  '), 'harry potter');
});

test('searches title, author, genre, series, language, format, and description', () => {
  for (const query of ['philosopher', 'rowling', 'fantasy', 'harry potter', 'english', 'epub', 'young wizard']) {
    assert.equal(ebookMatchesSearch(book, query), true, query);
  }
});

test('matches separate query terms across multiple metadata fields', () => {
  assert.equal(ebookMatchesSearch(book, 'rowling fantasy'), true);
  assert.equal(ebookMatchesSearch(book, 'rowling science'), false);
  assert.equal(ebookMatchesSearch(book, '   '), true);
});
