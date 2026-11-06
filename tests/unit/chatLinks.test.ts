import assert from 'node:assert/strict';
import test from 'node:test';
import { chatTextParts } from '../../src/lib/chatLinks';

test('chat messages make shared homework URLs clickable without swallowing punctuation', () => {
  assert.deepEqual(chatTextParts('Open https://forms.gle/YRFCgag9nkrXvK317, then reply.'), [
    { text: 'Open ' },
    { text: 'https://forms.gle/YRFCgag9nkrXvK317', href: 'https://forms.gle/YRFCgag9nkrXvK317' },
    { text: ',' },
    { text: ' then reply.' },
  ]);
  assert.deepEqual(chatTextParts('(https://school.example/a(b))'), [
    { text: '(' },
    { text: 'https://school.example/a(b)', href: 'https://school.example/a(b)' },
    { text: ')' },
  ]);
});

test('chat leaves unsafe or malformed URLs as plain text', () => {
  assert.deepEqual(chatTextParts('javascript:alert(1) and https://user:pass@example.org'), [
    { text: 'javascript:alert(1) and ' },
    { text: 'https://user:pass@example.org' },
  ]);
});
