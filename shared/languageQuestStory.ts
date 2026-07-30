export interface LanguageQuestStoryChoice {
  id: string;
  text: string;
  translation: string;
  nextNodeId: string;
}

export interface LanguageQuestStoryNode {
  id: string;
  speaker: string;
  line: string;
  translation: string;
  audioText?: string;
  /** Terminal nodes have no choices -- `ending` names the outcome instead. */
  choices?: LanguageQuestStoryChoice[];
  ending?: { tone: 'good' | 'ok' | 'poor'; title: string; message: string };
}

export interface LanguageQuestStory {
  id: string;
  category: string;
  language: string;
  title: string;
  scenario: string;
  startNodeId: string;
  nodes: Record<string, LanguageQuestStoryNode>;
}

// Story Mode is unscored, branching-dialogue practice: read (and optionally
// hear) an NPC line, pick how to respond, and see the conversation play out
// differently depending on your choices. It sits alongside Culture Quest as
// bonus content unlocked once a course is complete, rather than gating XP or
// hearts on it, so a wrong branch is just a different story beat to explore.
export const LANGUAGE_QUEST_STORIES: LanguageQuestStory[] = [
  {
    id: 'cafe-order-zh',
    category: 'Chinese Courses',
    language: 'Mandarin Chinese',
    title: 'Ordering at the Cafe',
    scenario: 'You walk into a small cafe. The owner greets you at the counter.',
    startNodeId: 'greet',
    nodes: {
      greet: {
        id: 'greet',
        speaker: 'Cafe owner',
        line: '你好！你想喝点什么？',
        translation: 'Hello! What would you like to drink?',
        choices: [
          { id: 'polite', text: '你好，我想要一杯茶，谢谢。', translation: 'Hello, I would like a cup of tea, thank you.', nextNodeId: 'tea-good' },
          { id: 'blunt', text: '茶。', translation: 'Tea.', nextNodeId: 'tea-ok' },
          { id: 'confused', text: '（不回答，只是看菜单）', translation: '(No answer, just look at the menu)', nextNodeId: 'confused' },
        ],
      },
      'tea-good': {
        id: 'tea-good',
        speaker: 'Cafe owner',
        line: '好的，马上来。请坐！',
        translation: "Sure, coming right up. Please, have a seat!",
        ending: { tone: 'good', title: 'A warm welcome', message: 'Being polite and clear made the whole exchange easy and friendly -- exactly how a real order would go.' },
      },
      'tea-ok': {
        id: 'tea-ok',
        speaker: 'Cafe owner',
        line: '（微微一笑）好，茶。',
        translation: '(A small smile) Okay, tea.',
        ending: { tone: 'ok', title: 'Order understood', message: "Short and direct still gets the job done, but a little politeness (你好, 谢谢) goes a long way in everyday conversation." },
      },
      confused: {
        id: 'confused',
        speaker: 'Cafe owner',
        line: '没关系，慢慢看，想好了告诉我。',
        translation: "No worries, take your time -- let me know when you've decided.",
        ending: { tone: 'poor', title: 'Still deciding', message: "It's completely fine to pause and think! Next time, try replying with 我想要... (I would like...) once you've picked something." },
      },
    },
  },
  {
    id: 'new-neighbor-es',
    category: 'Spanish Courses',
    language: 'Spanish',
    title: 'Meeting a New Neighbor',
    scenario: 'You just moved in. A neighbor waves and walks over to introduce themselves.',
    startNodeId: 'greet',
    nodes: {
      greet: {
        id: 'greet',
        speaker: 'Neighbor',
        line: '¡Hola! Bienvenido al barrio. ¿Cómo te llamas?',
        translation: 'Hi! Welcome to the neighborhood. What is your name?',
        choices: [
          { id: 'friendly', text: '¡Hola! Mucho gusto, me llamo Alex. ¿Y usted?', translation: "Hello! Nice to meet you, I'm Alex. And you?", nextNodeId: 'friendly-good' },
          { id: 'short', text: 'Alex.', translation: 'Alex.', nextNodeId: 'short-ok' },
          { id: 'silent', text: '(Solo saluda con la mano)', translation: '(Just wave back)', nextNodeId: 'silent' },
        ],
      },
      'friendly-good': {
        id: 'friendly-good',
        speaker: 'Neighbor',
        line: 'Mucho gusto, Alex. Me llamo Sofía. ¡Si necesitas algo, aquí estoy!',
        translation: "Nice to meet you, Alex. I'm Sofía. If you need anything, I'm right here!",
        ending: { tone: 'good', title: 'A new friend', message: "Introducing yourself and asking their name back kept the conversation going naturally -- now you know your neighbor's name too." },
      },
      'short-ok': {
        id: 'short-ok',
        speaker: 'Neighbor',
        line: 'Ah, Alex. Un placer. Me llamo Sofía.',
        translation: 'Ah, Alex. A pleasure. My name is Sofía.',
        ending: { tone: 'ok', title: 'Introduction made', message: "They got your name, but the conversation stayed one-sided. Asking '¿Y usted?' (and you?) would have kept it flowing both ways." },
      },
      silent: {
        id: 'silent',
        speaker: 'Neighbor',
        line: '(Sonríe y sigue caminando) ¡Nos vemos!',
        translation: '(Smiles and keeps walking) See you around!',
        ending: { tone: 'poor', title: 'A missed chance', message: "A wave is friendly, but it skipped the introduction. Next time, try 'Me llamo...' to share your name." },
      },
    },
  },
  {
    id: 'lost-tourist-en',
    category: 'English Courses',
    language: 'English',
    title: 'Asking for Directions',
    scenario: "You're a bit lost downtown. A stranger walking by looks approachable.",
    startNodeId: 'greet',
    nodes: {
      greet: {
        id: 'greet',
        speaker: 'Stranger',
        line: 'Hi there! You look a little lost -- can I help?',
        translation: 'A friendly stranger offers help.',
        choices: [
          { id: 'polite', text: 'Excuse me, could you tell me how to get to the train station?', translation: 'A polite, clear request for directions.', nextNodeId: 'directions-good' },
          { id: 'blunt', text: 'Train station?', translation: 'A short, direct question.', nextNodeId: 'directions-ok' },
          { id: 'shy', text: "No, I'm fine, thanks.", translation: 'Politely decline the help.', nextNodeId: 'shy' },
        ],
      },
      'directions-good': {
        id: 'directions-good',
        speaker: 'Stranger',
        line: "Of course! Go straight two blocks, then turn left -- you can't miss it.",
        translation: 'Clear directions, given warmly.',
        ending: { tone: 'good', title: 'Right on track', message: "Starting with 'Excuse me' and stating exactly what you need made it easy for the stranger to help you quickly." },
      },
      'directions-ok': {
        id: 'directions-ok',
        speaker: 'Stranger',
        line: 'Yeah, it\'s that way -- two blocks and turn left.',
        translation: 'Understood, but a bit terse.',
        ending: { tone: 'ok', title: 'Got there anyway', message: "You got the directions, but a fuller question -- 'could you tell me how to get to...' -- usually reads as more polite to a stranger." },
      },
      shy: {
        id: 'shy',
        speaker: 'Stranger',
        line: 'No worries -- good luck finding it!',
        translation: 'The stranger walks on.',
        ending: { tone: 'poor', title: 'Still lost', message: "It's okay to prefer figuring it out yourself! If you get stuck again, 'Excuse me, could you help me find...' is a friendly way to ask." },
      },
    },
  },
];

export function languageQuestStoriesForCategory(category: string): LanguageQuestStory[] {
  return LANGUAGE_QUEST_STORIES.filter((story) => story.category === category);
}

export function languageQuestStoryById(storyId: string): LanguageQuestStory | undefined {
  return LANGUAGE_QUEST_STORIES.find((story) => story.id === storyId);
}
