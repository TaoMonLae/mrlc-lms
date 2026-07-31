export interface LanguageQuestVocabularyChoice {
  text: string;
  emoji?: string | null;
  audioText?: string | null;
  pinyin?: string[] | null;
}

export interface LanguageQuestVocabularyCard extends LanguageQuestVocabularyChoice {
  id: string;
  prompt: string;
  practicePrompt: string;
}

export interface LanguageQuestVocabularyQuestion {
  id: string;
  round: number;
  totalRounds: number;
  card: LanguageQuestVocabularyCard;
  correctText: string;
  options: LanguageQuestVocabularyChoice[];
}

function vocabularyKey(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function uniqueChoices(choices: LanguageQuestVocabularyChoice[]): LanguageQuestVocabularyChoice[] {
  const byText = new Map<string, LanguageQuestVocabularyChoice>();
  for (const choice of choices) {
    const text = choice.text.trim();
    if (!text) continue;
    const key = vocabularyKey(text);
    if (!byText.has(key)) byText.set(key, { ...choice, text });
  }
  return [...byText.values()];
}

export function uniqueLanguageQuestVocabularyCards(
  cards: LanguageQuestVocabularyCard[],
): LanguageQuestVocabularyCard[] {
  const byText = new Map<string, LanguageQuestVocabularyCard>();
  for (const card of cards) {
    const text = card.text.trim();
    if (!text) continue;
    const key = vocabularyKey(text);
    if (!byText.has(key)) byText.set(key, { ...card, text });
  }
  return [...byText.values()];
}

/**
 * Builds two deterministic recognition rounds before spelling. Questions use
 * the lesson's own answer bank for distractors, never write progress, and skip
 * only when there is no second choice to make a genuine multiple-choice item.
 */
export function buildLanguageQuestVocabularyQuestions(
  cards: LanguageQuestVocabularyCard[],
  lessonChoices: LanguageQuestVocabularyChoice[],
  totalRounds = 2,
): LanguageQuestVocabularyQuestion[] {
  const vocabularyCards = uniqueLanguageQuestVocabularyCards(cards);
  const choicePool = uniqueChoices([
    ...vocabularyCards,
    ...lessonChoices,
  ]);
  const rounds = Math.max(1, Math.floor(totalRounds));
  const questions: LanguageQuestVocabularyQuestion[] = [];

  for (let round = 0; round < rounds; round += 1) {
    for (const card of vocabularyCards) {
      const correctKey = vocabularyKey(card.text);
      const distractors = choicePool
        .filter((choice) => vocabularyKey(choice.text) !== correctKey)
        .sort((left, right) => (
          stableHash(`${card.id}:${round}:distractor:${left.text}`)
          - stableHash(`${card.id}:${round}:distractor:${right.text}`)
        ))
        .slice(0, 3);

      if (distractors.length === 0) continue;

      const correctChoice: LanguageQuestVocabularyChoice = {
        text: card.text,
        emoji: card.emoji,
        audioText: card.audioText,
        pinyin: card.pinyin,
      };
      const options = [correctChoice, ...distractors]
        .sort((left, right) => (
          stableHash(`${card.id}:${round}:position:${left.text}`)
          - stableHash(`${card.id}:${round}:position:${right.text}`)
        ));

      questions.push({
        id: `${card.id}:vocabulary:${round + 1}`,
        round,
        totalRounds: rounds,
        card,
        correctText: card.text,
        options,
      });
    }
  }

  return questions;
}
