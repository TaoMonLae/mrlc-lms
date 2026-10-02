import assert from 'node:assert/strict';
import test from 'node:test';
import { splitDragText, toDragBlankText } from '../../src/lib/dragBlanks';

test('player and authoring helpers recognize Studio alphanumeric blank IDs and legacy numeric IDs', () => {
  const text = 'The {{b0}} orbits {{1}}.';
  assert.deepEqual(splitDragText(text), [
    { kind: 'text', text: 'The ' }, { kind: 'blank', blankId: 'b0' },
    { kind: 'text', text: ' orbits ' }, { kind: 'blank', blankId: '1' },
    { kind: 'text', text: '.' },
  ]);
  assert.equal(toDragBlankText(text, [{ id: 'b0', answer: 'Earth' }, { id: '1', answer: 'Sun' }]), 'The [[Earth]] orbits [[Sun]].');
});
