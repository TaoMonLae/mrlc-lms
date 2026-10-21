import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesFlashcardAnswer } from '../../src/lib/flashcardAnswers';

const accepted: [string, string][] = [
  ['hello world', 'Hello, world.'],
  ['answer yes', 'Answer: yes.'],
  ['dont', "don't"],
  ['dont', '“Don’t”'],
  ['well known', 'well-known'],
  ['wellknown', 'well-known'],
  ['first name', 'first_name'],
  ['A B', 'A + B'],
  ['AB', 'A+B'],
  ['US', 'U.S.'],
  ['well known persons', "well-known person's"],
  ['  HELLO   world  ', 'Hello world'],
  ['cafe\u0301', 'café'],
  ['word', 'word!?;'],
  ['one two three', 'one—two–three'],
  ['မင်္ဂလာပါ', 'မင်္ဂလာပါ.'],
];
for (const [typed, expected] of accepted) {
  test(`accepts punctuation and formatting differences: ${JSON.stringify([typed, expected])}`, () => {
    assert.equal(matchesFlashcardAnswer(typed, expected), true);
    assert.equal(matchesFlashcardAnswer(expected, typed), true);
  });
}

test('rejects wrong, missing, reordered words and arbitrary word joins', () => {
  for (const [typed, expected] of [
    ['cat', 'car'], ['hello', 'hello world'], ['world hello', 'hello world'],
    ['icecream', 'ice cream'], ['therapist', 'the rapist'],
    ['cafe', 'café'], ['12', '13'], ['a/b', 'ab'],
  ]) assert.equal(matchesFlashcardAnswer(typed, expected), false, `${typed} / ${expected}`);
});

test('rejects empty and punctuation-only submissions for content answers', () => {
  for (const typed of ['', '   ', ':, .\"\'-_+']) {
    assert.equal(matchesFlashcardAnswer(typed, 'hello'), false);
    assert.equal(matchesFlashcardAnswer(typed, ''), false);
  }
  assert.equal(matchesFlashcardAnswer('+', '-'), false);
  assert.equal(matchesFlashcardAnswer(' + ', '+'), true);
});
