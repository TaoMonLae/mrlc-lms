import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLanguageQuestVocabularyQuestions,
  uniqueLanguageQuestVocabularyCards,
  type LanguageQuestVocabularyCard,
} from "../../shared/languageQuestVocabularyPractice";

const cards: LanguageQuestVocabularyCard[] = [
  {
    id: "one",
    prompt: "Choose the Malay word for good morning.",
    practicePrompt: "Choose the Malay word for good morning.",
    text: "Selamat pagi",
    audioText: "Selamat pagi",
    emoji: null,
    pinyin: null,
  },
  {
    id: "two",
    prompt: "Choose the Malay word for thank you.",
    practicePrompt: "Choose the Malay word for thank you.",
    text: "Terima kasih",
    audioText: "Terima kasih",
    emoji: null,
    pinyin: null,
  },
  {
    id: "three",
    prompt: "Choose the Malay word for sorry.",
    practicePrompt: "Choose the Malay word for sorry.",
    text: "Maaf",
    audioText: "Maaf",
    emoji: null,
    pinyin: null,
  },
];

test("vocabulary practice repeats every distinct card for two recognition rounds", () => {
  const questions = buildLanguageQuestVocabularyQuestions(cards, cards);

  assert.equal(questions.length, cards.length * 2);
  assert.deepEqual([...new Set(questions.map((question) => question.round))], [0, 1]);
  assert.ok(questions.every((question) => question.totalRounds === 2));
  assert.ok(questions.every((question) => question.options.length === 3));
  assert.ok(questions.every((question) =>
    question.options.filter((option) => option.text === question.correctText).length === 1,
  ));
});

test("vocabulary practice removes duplicate answers and requires a real distractor", () => {
  const duplicates = [...cards, { ...cards[0], id: "duplicate" }];

  assert.equal(uniqueLanguageQuestVocabularyCards(duplicates).length, 3);
  assert.equal(buildLanguageQuestVocabularyQuestions([cards[0]], [], 2).length, 0);
});

test("vocabulary question order and answer positions are deterministic", () => {
  const first = buildLanguageQuestVocabularyQuestions(cards, cards);
  const second = buildLanguageQuestVocabularyQuestions(cards, cards);

  assert.deepEqual(first, second);
  assert.notDeepEqual(
    first.slice(0, cards.length).map((question) => question.options.map((option) => option.text)),
    first.slice(cards.length).map((question) => question.options.map((option) => option.text)),
  );
});
