import assert from 'node:assert/strict';
import test from 'node:test';
import { addHighlight, highlightRuns, mapSelectSlots, splitPassage } from '../../src/lib/passageSlots';

const passage = 'A budget [Select 13] control. Track it by [Select 14] daily. Plain [Select] stays.';

test('markers link to the drop-down question numbered in its text, then by position', () => {
  const questions = [
    { type: 'MCQ', text: '1. Main idea?', passageText: passage },
    { type: 'DROPDOWN', text: '14. Track it by [Select]', passageText: passage },
    { type: 'DROPDOWN', text: '13. A budget [Select]', passageText: passage },
    { type: 'DROPDOWN', text: '13. Same number, other passage', passageText: 'other' },
  ];
  assert.deepEqual(mapSelectSlots(passage, questions), { '13': 2, '14': 1 });
  const byPosition = Array.from({ length: 14 }, (_, i) => ({ type: i === 12 ? 'DROPDOWN' : 'MCQ', text: 'No number', passageText: passage }));
  assert.deepEqual(mapSelectSlots(passage, byPosition), { '13': 12 });
});

test('splitPassage keeps offsets and leaves unlinked markers as text', () => {
  const pieces = splitPassage(passage, { '13': 2 });
  assert.equal(pieces.length, 3);
  assert.deepEqual(pieces[0], { kind: 'text', text: 'A budget ', start: 0 });
  assert.equal(pieces[1].kind, 'slot');
  const tail = pieces[2] as any;
  assert.equal(passage.slice(tail.start, tail.start + tail.text.length), tail.text);
  assert.ok(tail.text.includes('[Select 14]'));
});

test('highlights merge and split text into runs', () => {
  let ranges = addHighlight([], { start: 2, end: 5 });
  ranges = addHighlight(ranges, { start: 4, end: 8 });
  ranges = addHighlight(ranges, { start: 20, end: 22 });
  assert.deepEqual(ranges, [{ start: 2, end: 8 }, { start: 20, end: 22 }]);
  const runs = highlightRuns('0123456789', 0, ranges);
  assert.deepEqual(runs.map((run) => [run.text, !!run.mark]), [['01', false], ['234567', true], ['89', false]]);
  assert.deepEqual(addHighlight(ranges, { start: 5, end: 5 }), ranges);
});
