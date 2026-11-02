import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyStageProgress, readStageProgress, validStage, writeStageProgress } from '../../src/pages/games/pacman/utils/stageProgress';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

test('checkpoints belong to the signed-in student and game mode', () => {
  const store = storage();
  assert.equal(writeStageProgress(store, 'student-a', 'CLASSIC', 3), true);
  assert.equal(readStageProgress(store, 'student-a').CLASSIC, 3);
  assert.equal(readStageProgress(store, 'student-a').SURVIVAL, 1);
  assert.deepEqual(readStageProgress(store, 'student-b'), emptyStageProgress());
});

test('old tabs and malformed saves cannot roll a checkpoint back or skip the campaign', () => {
  const store = storage();
  writeStageProgress(store, 'student-a', 'CLASSIC', 8);
  writeStageProgress(store, 'student-a', 'CLASSIC', 3);
  assert.equal(readStageProgress(store, 'student-a').CLASSIC, 8);
  assert.equal(writeStageProgress(store, 'student-a', 'CLASSIC', 16), false);
  assert.equal(validStage(2.5), null);
  assert.equal(validStage(NaN), null);
  assert.equal(readStageProgress(store, 'student-a').CLASSIC, 8);
});

test('an earlier on-device save can still resume after upgrading to the 15-stage game', () => {
  const store = storage();
  store.setItem('pacman_stage_save:student-a', JSON.stringify({ gameMode: 'TIME_ATTACK', level: 5 }));
  assert.equal(readStageProgress(store, 'student-a').TIME_ATTACK, 5);
});
