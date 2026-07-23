import type {
  OfficialLanguageQuestChallenge,
  OfficialLanguageQuestCourse,
} from "./languageQuestImportedCourses";

type Choice = readonly [text: string, emoji: string | null];

function chooseChinese(
  english: string,
  choices: readonly [Choice, Choice, Choice],
  correctIndex: 0 | 1 | 2,
  type: "SELECT" | "ASSIST" = "SELECT",
): OfficialLanguageQuestChallenge {
  return {
    type,
    question: `Choose the Mandarin translation for “${english}”.`,
    options: choices.map(([text, emoji], index) => ({
      text,
      correct: index === correctIndex,
      emoji,
      audioText: text,
    })),
  };
}

export const mandarinFoundationsCourse: OfficialLanguageQuestCourse = {
  code: "MRLC-MANDARIN-FOUNDATIONS-V1",
  title: "Mandarin Foundations",
  description: "Original beginner Mandarin lessons for greetings, people, numbers, food, daily activities, places, questions, and directions.",
  language: "Mandarin Chinese",
  imageEmoji: "🇨🇳",
  accentColor: "#dc2626",
  published: true,
  units: [
    {
      title: "First Conversations",
      description: "Start with greetings, polite expressions, and introductions.",
      lessons: [
        {
          title: "Greetings",
          description: "Say hello, goodbye, and greet people at different times.",
          challenges: [
            chooseChinese("Hello", [["你好", "👋"], ["再见", "🚪"], ["谢谢", "🙏"]], 0),
            chooseChinese("Goodbye", [["请", "🤲"], ["再见", "👋"], ["对不起", "😔"]], 1),
            chooseChinese("Good morning", [["晚安", "🌙"], ["你好", "👋"], ["早上好", "🌅"]], 2),
            chooseChinese("Good night", [["晚安", "🌙"], ["早上好", "🌅"], ["再见", "👋"]], 0, "ASSIST"),
          ],
        },
        {
          title: "Courtesy",
          description: "Use friendly words for thanks, apologies, and requests.",
          challenges: [
            chooseChinese("Thank you", [["不客气", "😊"], ["谢谢", "🙏"], ["没问题", "👌"]], 1),
            chooseChinese("Please", [["对不起", "😔"], ["谢谢", "🙏"], ["请", "🤲"]], 2),
            chooseChinese("Sorry", [["对不起", "😔"], ["不客气", "😊"], ["请", "🤲"]], 0),
            chooseChinese("You're welcome", [["没问题", "👌"], ["不客气", "😊"], ["谢谢", "🙏"]], 1, "ASSIST"),
          ],
        },
        {
          title: "People and Introductions",
          description: "Introduce yourself and talk about familiar people.",
          challenges: [
            chooseChinese("I am a student", [["她是老师", "🧑‍🏫"], ["我是学生", "🧑‍🎓"], ["他是我的朋友", "🧑‍🤝‍🧑"]], 1),
            chooseChinese("She is a teacher", [["她是老师", "🧑‍🏫"], ["我是学生", "🧑‍🎓"], ["你叫什么名字？", "🪪"]], 0),
            chooseChinese("He is my friend", [["她是老师", "🧑‍🏫"], ["你叫什么名字？", "🪪"], ["他是我的朋友", "🧑‍🤝‍🧑"]], 2),
            chooseChinese("What is your name?", [["我是学生", "🧑‍🎓"], ["你叫什么名字？", "🪪"], ["他是我的朋友", "🧑‍🤝‍🧑"]], 1, "ASSIST"),
          ],
        },
      ],
    },
    {
      title: "Everyday Essentials",
      description: "Build confidence with numbers, food, time, and daily actions.",
      lessons: [
        {
          title: "Numbers",
          description: "Recognise useful Mandarin numbers.",
          challenges: [
            chooseChinese("One", [["一", "1️⃣"], ["五", "5️⃣"], ["十", "🔟"]], 0),
            chooseChinese("Five", [["十", "🔟"], ["五", "5️⃣"], ["二十", "2️⃣"]], 1),
            chooseChinese("Ten", [["一", "1️⃣"], ["二十", "2️⃣"], ["十", "🔟"]], 2),
            chooseChinese("Twenty", [["二十", "2️⃣"], ["五", "5️⃣"], ["十", "🔟"]], 0, "ASSIST"),
          ],
        },
        {
          title: "Food and Drink",
          description: "Order and recognise common food and drinks.",
          challenges: [
            chooseChinese("Water", [["茶", "🍵"], ["水", "💧"], ["米饭", "🍚"]], 1),
            chooseChinese("Tea", [["面条", "🍜"], ["水", "💧"], ["茶", "🍵"]], 2),
            chooseChinese("Rice", [["米饭", "🍚"], ["茶", "🍵"], ["面条", "🍜"]], 0),
            chooseChinese("Noodles", [["水", "💧"], ["面条", "🍜"], ["米饭", "🍚"]], 1, "ASSIST"),
          ],
        },
        {
          title: "Time and Actions",
          description: "Talk about today, tomorrow, study, and simple actions.",
          challenges: [
            chooseChinese("Today", [["明天", "➡️"], ["昨天", "⬅️"], ["今天", "📅"]], 2),
            chooseChinese("Tomorrow", [["明天", "➡️"], ["今天", "📅"], ["昨天", "⬅️"]], 0),
            chooseChinese("I study Chinese", [["她喝茶", "🍵"], ["我学习中文", "📖"], ["我吃米饭", "🍚"]], 1),
            chooseChinese("She drinks tea", [["我学习中文", "📖"], ["我吃米饭", "🍚"], ["她喝茶", "🍵"]], 2, "ASSIST"),
          ],
        },
      ],
    },
    {
      title: "Getting Around",
      description: "Recognise places, ask useful questions, and follow directions.",
      lessons: [
        {
          title: "Places",
          description: "Learn common places around school and town.",
          challenges: [
            chooseChinese("School", [["学校", "🏫"], ["图书馆", "📚"], ["医院", "🏥"]], 0),
            chooseChinese("Library", [["商店", "🏪"], ["图书馆", "📚"], ["学校", "🏫"]], 1),
            chooseChinese("Hospital", [["图书馆", "📚"], ["商店", "🏪"], ["医院", "🏥"]], 2),
            chooseChinese("Shop", [["商店", "🏪"], ["医院", "🏥"], ["学校", "🏫"]], 0, "ASSIST"),
          ],
        },
        {
          title: "Useful Questions",
          description: "Ask for locations, prices, language help, and clarification.",
          challenges: [
            chooseChinese("Where is the school?", [["这个多少钱？", "💰"], ["学校在哪里？", "🗺️"], ["我不明白", "❓"]], 1),
            chooseChinese("How much is this?", [["你会说英语吗？", "🗣️"], ["学校在哪里？", "🗺️"], ["这个多少钱？", "💰"]], 2),
            chooseChinese("Do you speak English?", [["你会说英语吗？", "🗣️"], ["我不明白", "❓"], ["这个多少钱？", "💰"]], 0),
            chooseChinese("I don't understand", [["学校在哪里？", "🗺️"], ["我不明白", "❓"], ["你会说英语吗？", "🗣️"]], 1, "ASSIST"),
          ],
        },
        {
          title: "Directions",
          description: "Understand simple instructions for moving around.",
          challenges: [
            chooseChinese("Left", [["右边", "➡️"], ["左边", "⬅️"], ["一直走", "⬆️"]], 1),
            chooseChinese("Right", [["右边", "➡️"], ["在这里停", "🛑"], ["左边", "⬅️"]], 0),
            chooseChinese("Go straight", [["左边", "⬅️"], ["在这里停", "🛑"], ["一直走", "⬆️"]], 2),
            chooseChinese("Stop here", [["一直走", "⬆️"], ["在这里停", "🛑"], ["右边", "➡️"]], 1, "ASSIST"),
          ],
        },
      ],
    },
  ],
};
