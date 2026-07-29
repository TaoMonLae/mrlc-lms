import { importedSpanishCourse } from "../languageQuestImportedCourses";
import { mandarinFoundationsCourse } from "../languageQuestMandarinCourse";
import completeMandarinJson from "../curricula/language-quest/mandarin-complete.generated.json";
import englishWordJson from "../curricula/language-quest/english-word-courses.generated.json";
import advancedEnglishJson from "../curricula/language-quest/advanced-english-courses.generated.json";
import linguifyJson from "../curricula/language-quest/linguify-cefr-courses.generated.json";

const starterCourse = {
  code: "MRLC-EVERYDAY-ENGLISH",
  title: "Everyday English",
  description: "Short, practical lessons for friendly conversations and school life.",
  units: [
    {
      title: "Everyday Basics",
      description: "Friendly English for common conversations.",
      lessons: [
        {
          title: "Greetings",
          description: "Say hello and respond politely.",
          challenges: [
            { question: "Which greeting is normally used in the morning?" },
            { question: "Choose the polite response to “Thank you.”" },
            { question: "Which question asks for a person's name?" }
          ]
        },
        {
          title: "Helpful Words",
          description: "Use please, sorry, and excuse me.",
          challenges: [
            { question: "Which word makes a request more polite?" },
            { question: "What should you say when you make a mistake?" },
            { question: "Which phrase politely gets someone's attention?" }
          ]
        }
      ]
    },
    {
      title: "Around School",
      description: "Recognise useful people, places, and classroom phrases.",
      lessons: [
        {
          title: "People and Places",
          description: "Learn common school words.",
          challenges: [
            { question: "Who helps students learn in a classroom?" },
            { question: "Where can you borrow and read books?" },
            { question: "What do students complete at home after class?" }
          ]
        },
        {
          title: "Classroom English",
          description: "Ask for help and follow simple instructions.",
          challenges: [
            { question: "Which sentence asks a teacher for help?" },
            { question: "What does “Open your book” ask you to do?" },
            { question: "Which sentence says you do not understand?" }
          ]
        }
      ]
    }
  ]
};

const allCourses = [
  starterCourse,
  importedSpanishCourse,
  mandarinFoundationsCourse,
  completeMandarinJson,
  ...englishWordJson,
  ...advancedEnglishJson,
  ...linguifyJson
];

const questions = new Set<string>();

for (const course of allCourses) {
  if (course.units && Array.isArray(course.units)) {
    for (const unit of course.units) {
      if (unit.lessons && Array.isArray(unit.lessons)) {
        for (const lesson of unit.lessons) {
          if (lesson.challenges && Array.isArray(lesson.challenges)) {
            for (const challenge of lesson.challenges) {
              if (challenge.question) {
                questions.add(challenge.question.trim());
              }
            }
          }
        }
      }
    }
  }
}

console.log(JSON.stringify(Array.from(questions).sort(), null, 2));
console.log("Total unique questions:", questions.size);
