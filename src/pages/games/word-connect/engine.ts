import { LEVELS, type WordLevel } from './content';

export interface Placement { word: string; x: number; y: number; direction: 'across' | 'down' }
export interface Crossword { placements: Placement[]; width: number; height: number; cells: { x: number; y: number; letter: string; words: string[] }[] }
const key = (x: number, y: number) => `${x},${y}`;

/** Each physical letter can be used only once, including repeated letters. */
export function canSpell(word: string, letters: string) {
  const available = letters.split('');
  return word.split('').every(letter => {
    const index = available.indexOf(letter);
    if (index < 0) return false;
    available.splice(index, 1);
    return true;
  });
}

/** Small curated puzzles are laid out deterministically with real crossings.
 * Check neighbouring cells so placing a word never creates accidental words. */
export function buildCrossword(words: string[]): Crossword {
  if (!words.length || words.some(word => !word) || new Set(words).size !== words.length) throw new Error('Puzzle words must be nonempty and unique');
  const ordered = [...words].sort((a, b) => b.length - a.length);
  function cellsFor(placements: Placement[]) {
    const cells = new Map<string, { x: number; y: number; letter: string; words: string[]; directions: string[] }>();
    for (const p of placements) p.word.split('').forEach((letter, i) => {
      const x = p.x + (p.direction === 'across' ? i : 0);
      const y = p.y + (p.direction === 'down' ? i : 0);
      const existing = cells.get(key(x, y));
      if (existing) { existing.words.push(p.word); existing.directions.push(p.direction); }
      else cells.set(key(x, y), { x, y, letter, words: [p.word], directions: [p.direction] });
    });
    return cells;
  }
  function place(placements: Placement[], remaining: string[]): Placement[] | null {
    if (!remaining.length) return placements;
    const cells = cellsFor(placements);
    for (const word of remaining) {
      for (const cell of cells.values()) {
        for (let i = 0; i < word.length; i++) {
          if (cell.letter !== word[i]) continue;
          for (const direction of ['across', 'down'] as const) {
            const dx = direction === 'across' ? 1 : 0;
            const dy = direction === 'down' ? 1 : 0;
            const x = cell.x - i * dx, y = cell.y - i * dy;
            if (cells.has(key(x - dx, y - dy)) || cells.has(key(x + word.length * dx, y + word.length * dy))) continue;
            const valid = word.split('').every((letter, n) => {
              const px = x + n * dx, py = y + n * dy;
              const existing = cells.get(key(px, py));
              if (existing) return existing.letter === letter && !existing.directions.includes(direction);
              return !cells.has(key(px + dy, py + dx)) && !cells.has(key(px - dy, py - dx));
            });
            if (!valid) continue;
            const result = place([...placements, { word, x, y, direction }], remaining.filter(item => item !== word));
            if (result) return result;
          }
        }
      }
    }
    return null;
  }
  const placed = place([{ word: ordered[0], x: 0, y: 0, direction: 'across' }], ordered.slice(1));
  if (!placed) throw new Error(`Cannot connect puzzle: ${words.join(', ')}`);
  const raw = [...cellsFor(placed).values()];
  const minX = Math.min(...raw.map(c => c.x)), minY = Math.min(...raw.map(c => c.y));
  return {
    width: Math.max(...raw.map(c => c.x)) - minX + 1,
    height: Math.max(...raw.map(c => c.y)) - minY + 1,
    placements: placed.map(p => ({ ...p, x: p.x - minX, y: p.y - minY })),
    cells: raw.map(({ x, y, letter, words }) => ({ x: x - minX, y: y - minY, letter, words })),
  };
}

export interface LevelProgress { found: string[]; bonus: string[]; hints: Record<string, number> }
export interface AdventureProgress { version: 1; levels: Record<string, LevelProgress>; tutorialSeen: boolean; sound: boolean }
export const emptyProgress = (): AdventureProgress => ({ version: 1, levels: {}, tutorialSeen: false, sound: false });
export const emptyLevel = (): LevelProgress => ({ found: [], bonus: [], hints: {} });
export const isComplete = (level: WordLevel, progress?: LevelProgress) => level.words.every(item => progress?.found.includes(item.word));
export const hintCount = (progress?: LevelProgress) => Object.values(progress?.hints ?? {}).reduce((sum, value) => sum + value, 0);
export const starsFor = (progress?: LevelProgress) => hintCount(progress) === 0 ? 3 : hintCount(progress) <= 2 ? 2 : 1;
export function unlockedLevel(index: number, progress: AdventureProgress) {
  return index === 0 || LEVELS.slice(0, index).every(level => isComplete(level, progress.levels[level.id]));
}

export function normaliseProgress(value: unknown): AdventureProgress {
  const result = emptyProgress();
  if (!value || typeof value !== 'object' || (value as any).version !== 1) return result;
  const saved = value as any;
  result.tutorialSeen = saved.tutorialSeen === true;
  result.sound = saved.sound === true;
  for (const level of LEVELS) {
    const data = saved.levels?.[level.id];
    if (!data || typeof data !== 'object') continue;
    const filter = (values: unknown, allowed: string[]) => Array.isArray(values) ? [...new Set(values.filter((v): v is string => typeof v === 'string' && allowed.includes(v)))] : [];
    const hints: Record<string, number> = {};
    for (const item of level.words) {
      const count = data.hints?.[item.word];
      if (Number.isInteger(count) && count >= 1 && count <= 4) hints[item.word] = count;
    }
    result.levels[level.id] = { found: filter(data.found, level.words.map(w => w.word)), bonus: filter(data.bonus, level.bonus.map(w => w.word)), hints };
  }
  return result;
}

export function submitWord(level: WordLevel, progress: LevelProgress, candidate: string): { progress: LevelProgress; kind: 'correct' | 'bonus' | 'duplicate' | 'invalid' } {
  const word = candidate.toUpperCase().trim();
  if (!canSpell(word, level.letters) || word.length < 3) return { progress, kind: 'invalid' };
  if (progress.found.includes(word) || progress.bonus.includes(word)) return { progress, kind: 'duplicate' };
  if (level.words.some(item => item.word === word)) return { progress: { ...progress, found: [...progress.found, word] }, kind: 'correct' };
  if (level.bonus.some(item => item.word === word)) return { progress: { ...progress, bonus: [...progress.bonus, word] }, kind: 'bonus' };
  return { progress, kind: 'invalid' };
}

export function revealHint(level: WordLevel, progress: LevelProgress, word: string): LevelProgress {
  if (!level.words.some(item => item.word === word) || progress.found.includes(word)) return progress;
  const stage = Math.min(4, (progress.hints[word] || 0) + 1);
  return { ...progress, hints: { ...progress.hints, [word]: stage }, found: stage === 4 ? [...progress.found, word] : progress.found };
}
