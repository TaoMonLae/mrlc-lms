import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../../src/pages/games/word-connect/content';
import { buildCrossword, canSpell, emptyLevel, emptyProgress, isComplete, normaliseProgress, revealHint, starsFor, submitWord, unlockedLevel } from '../../src/pages/games/word-connect/engine';

test('every curated puzzle is spellable and forms a connected crossword with no stray adjacent words', () => {
  for (const level of LEVELS) {
    assert.equal(new Set([...level.words, ...level.bonus].map(item => item.word)).size, level.words.length + level.bonus.length);
    for (const item of [...level.words, ...level.bonus]) {
      assert.ok(canSpell(item.word, level.letters), `${level.id}: ${item.word}`);
      assert.ok(item.meaning && item.example.toUpperCase().includes(item.word));
    }
    const board = buildCrossword(level.words.map(item => item.word));
    assert.equal(board.placements.length, level.words.length);
    const cells = new Map(board.cells.map(c => [`${c.x},${c.y}`, c]));
    const visited = new Set<string>();
    function walk(x: number, y: number) {
      const key = `${x},${y}`;
      if (!cells.has(key) || visited.has(key)) return;
      visited.add(key);
      walk(x + 1, y); walk(x - 1, y); walk(x, y + 1); walk(x, y - 1);
    }
    walk(board.cells[0].x, board.cells[0].y);
    assert.equal(visited.size, cells.size, `${level.id} is connected`);
    for (const p of board.placements) {
      assert.equal(p.word.split('').map((_, i) => cells.get(`${p.x + (p.direction === 'across' ? i : 0)},${p.y + (p.direction === 'down' ? i : 0)}`)?.letter).join(''), p.word);
    }
    // Every horizontal/vertical run longer than one must be one of the intended words.
    for (const cell of board.cells) for (const [dx, dy] of [[1, 0], [0, 1]]) {
      if (cells.has(`${cell.x - dx},${cell.y - dy}`)) continue;
      let run = '', x = cell.x, y = cell.y;
      while (cells.has(`${x},${y}`)) { run += cells.get(`${x},${y}`)!.letter; x += dx; y += dy; }
      if (run.length > 1) assert.ok(level.words.some(item => item.word === run), `${level.id}: stray ${run}`);
    }
  }
  assert.throws(() => buildCrossword([]));
});

test('word submission respects physical letters, bonus discoveries, and duplicates', () => {
  assert.equal(canSpell('REAR', 'READ'), false);
  assert.equal(canSpell('REAR', 'REAR'), true);
  const level = LEVELS[0], start = emptyLevel();
  const correct = submitWord(level, start, ' read ');
  assert.equal(correct.kind, 'correct');
  assert.deepEqual(start.found, []);
  assert.equal(submitWord(level, correct.progress, 'READ').kind, 'duplicate');
  const bonus = submitWord(level, correct.progress, 'RED');
  assert.equal(bonus.kind, 'bonus');
  assert.equal(submitWord(level, bonus.progress, 'RED').kind, 'duplicate');
  assert.equal(submitWord(level, bonus.progress, 'REAR').kind, 'invalid');
  assert.equal(submitWord(level, bonus.progress, 'AD').kind, 'invalid');
  assert.equal(isComplete(level, bonus.progress), false);
});

test('staged hints eventually solve a word, and completion unlocks only the next level', () => {
  const level = LEVELS[0];
  let progress = emptyLevel();
  assert.equal(starsFor(progress), 3);
  for (let i = 1; i <= 4; i++) {
    progress = revealHint(level, progress, 'READ');
    assert.equal(progress.hints.READ, i);
    assert.equal(progress.found.includes('READ'), i === 4);
  }
  assert.equal(starsFor(progress), 1);
  assert.deepEqual(revealHint(level, progress, 'READ'), progress);
  assert.deepEqual(revealHint(level, progress, 'FAKE'), progress);
  for (const item of level.words) progress = submitWord(level, progress, item.word).progress;
  const adventure = { ...emptyProgress(), levels: { [level.id]: progress } };
  assert.equal(isComplete(level, progress), true);
  assert.equal(unlockedLevel(1, adventure), true);
  assert.equal(unlockedLevel(2, adventure), false);
  assert.equal(unlockedLevel(0, emptyProgress()), true);
  assert.equal(starsFor({ ...emptyLevel(), hints: { READ: 2 } }), 2);
});

test('loaded progress filters unknown levels, invalid words and broken hint values', () => {
  const saved = normaliseProgress({ version: 1, tutorialSeen: true, sound: 'true', levels: { read: { found: ['READ', 'READ', 3, 'CHEAT'], bonus: ['RED', 'DARE'], hints: { DEAR: 2, DARE: 7, EAR: 1.5 } }, unknown: { found: ['ALL'] } } });
  assert.deepEqual(saved.levels.read, { found: ['READ'], bonus: ['RED'], hints: { DEAR: 2 } });
  assert.equal(saved.sound, false);
  assert.equal(saved.tutorialSeen, true);
  assert.equal(saved.levels.unknown, undefined);
  for (const broken of [null, 'invalid', [], { version: 99 }]) assert.deepEqual(normaliseProgress(broken), emptyProgress());
});
