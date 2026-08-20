import type {
  OfficialLanguageQuestChallenge,
  OfficialLanguageQuestCourse,
} from "./languageQuestImportedCourses";

type MandarinPhrase = readonly [hanzi: string, pinyin: string, emoji: string | null];

function chooseMandarin(
  english: string,
  correct: MandarinPhrase,
  distractors: readonly [MandarinPhrase, MandarinPhrase],
  correctIndex: 0 | 1 | 2,
  type: "SELECT" | "ASSIST" = "SELECT",
): OfficialLanguageQuestChallenge {
  const choices = [...distractors];
  choices.splice(correctIndex, 0, correct);
  return {
    type,
    question: `Choose the Mandarin for “${english}”. Pronunciation: ${correct[1]}.`,
    explanation: `“${english}” is “${correct[0]}” (${correct[1]}) in Mandarin.`,
    hint: "Use the meaning and the surrounding lesson topic to eliminate unrelated phrases.",
    options: choices.map(([hanzi, _pinyin, emoji], index) => ({
      text: hanzi,
      correct: index === correctIndex,
      emoji,
      audioText: hanzi,
    })),
  };
}

const hello: MandarinPhrase = ["你好", "nǐ hǎo", "👋"];
const goodMorning: MandarinPhrase = ["早上好", "zǎo shang hǎo", "🌅"];
const goodbye: MandarinPhrase = ["再见", "zài jiàn", "👋"];
const niceToMeetYou: MandarinPhrase = ["很高兴认识你", "hěn gāo xìng rèn shi nǐ", "😊"];
const myNameIs: MandarinPhrase = ["我叫安娜", "wǒ jiào Ān nà", "🪪"];
const yourName: MandarinPhrase = ["你叫什么名字？", "nǐ jiào shén me míng zi", "❓"];
const herNameIs: MandarinPhrase = ["她叫美玲", "tā jiào Měi líng", "👩"];
const pleaseTellMe: MandarinPhrase = ["请告诉我", "qǐng gào su wǒ", "🙏"];
const fromMyanmar: MandarinPhrase = ["我是缅甸人", "wǒ shì Miǎn diàn rén", "🇲🇲"];
const fromChina: MandarinPhrase = ["他是中国人", "tā shì Zhōng guó rén", "🇨🇳"];
const whichCountry: MandarinPhrase = ["你是哪国人？", "nǐ shì nǎ guó rén", "🌍"];
const littleChinese: MandarinPhrase = ["我会说一点中文", "wǒ huì shuō yì diǎn Zhōng wén", "🗣️"];
const iAmStudent: MandarinPhrase = ["我是学生", "wǒ shì xué sheng", "🧑‍🎓"];
const studyChinese: MandarinPhrase = ["我学习中文", "wǒ xué xí Zhōng wén", "📖"];
const thisIsMyFriend: MandarinPhrase = ["这是我的朋友", "zhè shì wǒ de péng you", "🧑‍🤝‍🧑"];
const weLearnTogether: MandarinPhrase = ["我们一起学习", "wǒ men yì qǐ xué xí", "🤝"];
const heClassmate: MandarinPhrase = ["他是我的同学", "tā shì wǒ de tóng xué", "🎒"];
const sheTeacher: MandarinPhrase = ["她是我的老师", "tā shì wǒ de lǎo shī", "🧑‍🏫"];
const whoIsThat: MandarinPhrase = ["那是谁？", "nà shì shéi", "👤"];
const thisPerson: MandarinPhrase = ["这个人是李明", "zhè ge rén shì Lǐ Míng", "🙋"];
const areYouStudent: MandarinPhrase = ["你是学生吗？", "nǐ shì xué sheng ma", "❓"];
const heNotTeacher: MandarinPhrase = ["他不是老师", "tā bú shì lǎo shī", "🙅"];
const sheAlsoStudent: MandarinPhrase = ["她也是学生", "tā yě shì xué sheng", "🧑‍🎓"];
const iAmNotTeacher: MandarinPhrase = ["我不是老师", "wǒ bú shì lǎo shī", "🙅"];
const howAreYou: MandarinPhrase = ["你好吗？", "nǐ hǎo ma", "🙂"];
const iAmWell: MandarinPhrase = ["我很好", "wǒ hěn hǎo", "😊"];
const isHeFriend: MandarinPhrase = ["他是你的朋友吗？", "tā shì nǐ de péng you ma", "❓"];
const yesHeIs: MandarinPhrase = ["是的，他是", "shì de, tā shì", "✅"];
const welcome: MandarinPhrase = ["欢迎", "huān yíng", "🎉"];
const pleaseComeIn: MandarinPhrase = ["请进", "qǐng jìn", "🚪"];
const meetMyFriend: MandarinPhrase = ["认识一下我的朋友", "rèn shi yí xià wǒ de péng you", "🤝"];
const learnTogether: MandarinPhrase = ["我们一起学中文吧", "wǒ men yì qǐ xué Zhōng wén ba", "📚"];

export const chineseConversationStarterCourse: OfficialLanguageQuestCourse = {
  code: "MRLC-CHINESE-CONVERSATION-STARTER-V1",
  title: "Chinese Conversation Starter",
  description: "An original MRLC beginner course for greetings, introductions, countries, friends, and short Mandarin conversations with pronunciation guidance.",
  language: "Mandarin Chinese",
  category: "Chinese Courses",
  imageEmoji: "🐼",
  accentColor: "#e11d48",
  published: true,
  units: [
    {
      title: "Meet and Greet",
      description: "Greet someone, exchange names, and give a short introduction.",
      lessons: [
        {
          title: "Friendly Greetings",
          description: "Practise hello, morning greetings, goodbye, and a warm first meeting.",
          challenges: [
            chooseMandarin("Hello", hello, [goodMorning, goodbye], 0),
            chooseMandarin("Good morning", goodMorning, [hello, niceToMeetYou], 1),
            chooseMandarin("Goodbye", goodbye, [hello, goodMorning], 2),
            chooseMandarin("Nice to meet you", niceToMeetYou, [goodbye, hello], 0, "ASSIST"),
          ],
        },
        {
          title: "Names",
          description: "Say your name and ask another learner for theirs.",
          challenges: [
            chooseMandarin("My name is Anna", myNameIs, [herNameIs, yourName], 1),
            chooseMandarin("What is your name?", yourName, [pleaseTellMe, myNameIs], 2),
            chooseMandarin("Her name is Meiling", herNameIs, [myNameIs, pleaseTellMe], 0),
            chooseMandarin("Please tell me", pleaseTellMe, [yourName, herNameIs], 1, "ASSIST"),
          ],
        },
        {
          title: "Countries and Languages",
          description: "Talk about where people come from and the language you are learning.",
          challenges: [
            chooseMandarin("I am from Myanmar", fromMyanmar, [fromChina, whichCountry], 2),
            chooseMandarin("He is from China", fromChina, [littleChinese, fromMyanmar], 0),
            chooseMandarin("Which country are you from?", whichCountry, [fromMyanmar, littleChinese], 1),
            chooseMandarin("I can speak a little Chinese", littleChinese, [whichCountry, fromChina], 2, "ASSIST"),
          ],
        },
        {
          title: "My First Introduction",
          description: "Combine familiar words into a useful introduction.",
          challenges: [
            chooseMandarin("I am a student", iAmStudent, [studyChinese, thisIsMyFriend], 0),
            chooseMandarin("I study Chinese", studyChinese, [weLearnTogether, iAmStudent], 1),
            chooseMandarin("This is my friend", thisIsMyFriend, [iAmStudent, weLearnTogether], 2),
            chooseMandarin("We study together", weLearnTogether, [studyChinese, thisIsMyFriend], 0, "ASSIST"),
          ],
        },
      ],
    },
    {
      title: "Friends and People",
      description: "Introduce friends, use simple identity sentences, and join a friendly conversation.",
      lessons: [
        {
          title: "Who Is This?",
          description: "Identify friends, classmates, teachers, and other people.",
          challenges: [
            chooseMandarin("He is my classmate", heClassmate, [sheTeacher, thisPerson], 1),
            chooseMandarin("She is my teacher", sheTeacher, [whoIsThat, heClassmate], 2),
            chooseMandarin("Who is that?", whoIsThat, [thisPerson, sheTeacher], 0),
            chooseMandarin("This person is Li Ming", thisPerson, [heClassmate, whoIsThat], 1, "ASSIST"),
          ],
        },
        {
          title: "Using 是 and 不是",
          description: "Build positive and negative identity sentences with shì and bú shì.",
          challenges: [
            chooseMandarin("Are you a student?", areYouStudent, [heNotTeacher, sheAlsoStudent], 2),
            chooseMandarin("He is not a teacher", heNotTeacher, [areYouStudent, iAmNotTeacher], 0),
            chooseMandarin("She is also a student", sheAlsoStudent, [iAmNotTeacher, areYouStudent], 1),
            chooseMandarin("I am not a teacher", iAmNotTeacher, [sheAlsoStudent, heNotTeacher], 2, "ASSIST"),
          ],
        },
        {
          title: "Simple Questions and Answers",
          description: "Ask how someone is and confirm whether a person is a friend.",
          challenges: [
            chooseMandarin("How are you?", howAreYou, [iAmWell, isHeFriend], 0),
            chooseMandarin("I am well", iAmWell, [yesHeIs, howAreYou], 1),
            chooseMandarin("Is he your friend?", isHeFriend, [howAreYou, yesHeIs], 2),
            chooseMandarin("Yes, he is", yesHeIs, [isHeFriend, iAmWell], 0, "ASSIST"),
          ],
        },
        {
          title: "Welcome, Friends!",
          description: "Use four practical phrases when meeting a group of new friends.",
          challenges: [
            chooseMandarin("Welcome", welcome, [pleaseComeIn, meetMyFriend], 1),
            chooseMandarin("Please come in", pleaseComeIn, [learnTogether, welcome], 2),
            chooseMandarin("Meet my friend", meetMyFriend, [welcome, learnTogether], 0),
            chooseMandarin("Let us learn Chinese together", learnTogether, [meetMyFriend, pleaseComeIn], 1, "ASSIST"),
          ],
        },
      ],
    },
  ],
};
