import generated from './levels.generated.json' with { type: 'json' };

export interface VocabularyWord { word: string; meaning: string; example: string }
export interface WordLevel { id: string; title: string; letters: string; words: VocabularyWord[]; bonus: VocabularyWord[] }
export interface WordWorld { id: string; title: string; description: string; color: string; levels: WordLevel[] }

export const WORLDS: WordWorld[] = generated;
export const LEVELS = WORLDS.flatMap(world => world.levels);
export const worldFor = (levelId: string) => WORLDS.find(world => world.levels.some(level => level.id === levelId))!;
