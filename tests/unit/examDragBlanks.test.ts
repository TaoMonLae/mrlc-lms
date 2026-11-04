import assert from 'node:assert/strict';
import test from 'node:test';
import { hasDragBlanks, splitDragPrompt, splitDragText, toDragBlankText } from '../../src/lib/dragBlanks';

test('player and authoring helpers recognize Studio alphanumeric blank IDs and legacy numeric IDs', () => {
  const text = 'The {{b0}} orbits {{1}}.';
  assert.deepEqual(splitDragText(text), [
    { kind: 'text', text: 'The ' }, { kind: 'blank', blankId: 'b0' },
    { kind: 'text', text: ' orbits ' }, { kind: 'blank', blankId: '1' },
    { kind: 'text', text: '.' },
  ]);
  assert.equal(toDragBlankText(text, [{ id: 'b0', answer: 'Earth' }, { id: '1', answer: 'Sun' }]), 'The [[Earth]] orbits [[Sun]].');
});

test('splitDragPrompt shows instructions once and keeps the blanks for the answer area', () => {
  const text = '5. Put the statements in order.\n\n1st: {{b0}}\n2nd: {{b1}}';
  assert.deepEqual(splitDragPrompt(text), { lead: '5. Put the statements in order.', body: '1st: {{b0}}\n2nd: {{b1}}' });
  assert.deepEqual(splitDragPrompt('The {{b0}} sat on the {{b1}}.'), { lead: '', body: 'The {{b0}} sat on the {{b1}}.' });
  assert.deepEqual(splitDragPrompt('Order them.\n\n1st: ___'), { lead: 'Order them.', body: '1st: ___' });
  assert.equal(hasDragBlanks('Plain stem'), false);
  assert.equal(hasDragBlanks('A ___ blank'), true);
});
