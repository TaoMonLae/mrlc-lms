import type {
  OfficialLanguageQuestChallenge,
  OfficialLanguageQuestCourse,
  OfficialLanguageQuestOption,
} from "./languageQuestImportedCourses";

// Adapted and reorganized from LibreLingo's Spanish-from-English curriculum:
// https://github.com/LibreLingo/LibreLingo-ES-from-EN
//
// The repository-level license is CC BY-NC-SA 4.0. Its course.yaml currently
// names CC BY-SA 4.0 instead, so this adaptation follows the more restrictive
// repository-level terms. The original source, attribution, modification note,
// and license are also shown on Language Quest's About page.

type ChoiceType = "SELECT" | "ASSIST" | "CLOZE" | "GRAMMAR_TRANSFORM";

function option(
  text: string,
  correct: boolean,
  emoji: string | null = null,
  audioText: string | null = text,
): OfficialLanguageQuestOption {
  return { text, correct, emoji, audioText };
}

function choice(
  question: string,
  correct: string,
  distractors: [string, string],
  type: ChoiceType = "SELECT",
  emoji: string | null = null,
): OfficialLanguageQuestChallenge {
  return {
    type,
    question,
    options: [
      option(correct, true, emoji),
      option(distractors[0], false),
      option(distractors[1], false),
    ],
  };
}

function dictation(text: string): OfficialLanguageQuestChallenge {
  return {
    type: "DICTATION",
    question: "Listen and type the Spanish sentence you hear.",
    options: [option(text, true)],
  };
}

function reorder(
  translation: string,
  words: string[],
): OfficialLanguageQuestChallenge {
  return {
    type: "REORDER",
    question: `Put the Spanish words in order: “${translation}”`,
    options: words.map((word) => option(word, true)),
  };
}

function matching(
  question: string,
  pairs: Array<[spanish: string, english: string]>,
): OfficialLanguageQuestChallenge {
  return {
    type: "MATCHING",
    question,
    options: pairs.flatMap(([spanish, english]) => [
      option(spanish, true),
      option(english, true, null, null),
    ]),
  };
}

export const libreLingoSpanishCourse: OfficialLanguageQuestCourse = {
  code: "MRLC-LIBRELINGO-SPANISH-FROM-EN-V1",
  title: "Spanish from English: Foundations",
  description: "A progressive beginner Spanish path with practical vocabulary, sentence building, listening, and grammar practice, adapted from LibreLingo.",
  language: "Spanish",
  imageEmoji: "🇪🇸",
  accentColor: "#e8590c",
  published: true,
  units: [
    {
      title: "First Words",
      description: "Meet people and learn useful words for everyday life.",
      lessons: [
        {
          title: "Greetings and Introductions",
          description: "Say hello, introduce yourself, and end a conversation politely.",
          challenges: [
            choice('Choose the Spanish for “Good morning!”', "¡Buenos días!", ["¡Buenas noches!", "¡Hasta luego!"], "ASSIST"),
            choice('What does “¿Cómo te llamas?” mean?', "What is your name?", ["How are you?", "Where are you going?"], "SELECT", null),
            choice('Complete the introduction: “Me ___ José.”', "llamo", ["gusta", "bebo"], "CLOZE"),
            reorder("My name is José", ["Me", "llamo", "José"]),
            matching("Match each Spanish greeting to its English meaning.", [
              ["Buenas tardes", "Good afternoon"],
              ["Buenas noches", "Good night"],
              ["Hasta luego", "See you later"],
            ]),
            dictation("Mucho gusto"),
          ],
        },
        {
          title: "Animals",
          description: "Name familiar animals and use Spanish articles.",
          challenges: [
            choice('Choose the Spanish word for “dog”.', "perro", ["gato", "pato"], "SELECT", "🐕"),
            choice('Which phrase means “the cat”?', "el gato", ["un oso", "el pato"], "SELECT", "🐈"),
            choice('Complete the sentence: “Es un ___.”', "caballo", ["león", "perro"], "CLOZE", "🐎"),
            reorder("Max is a dog", ["Max", "es", "un", "perro"]),
            matching("Match the animals.", [
              ["oso", "bear"],
              ["león", "lion"],
              ["pato", "duck"],
            ]),
            dictation("Un pato y un caballo"),
          ],
        },
        {
          title: "Food and Polite Requests",
          description: "Ask politely for simple food and drinks.",
          challenges: [
            choice('Choose the Spanish word for “bread”.', "pan", ["leche", "pasta"], "SELECT", "🍞"),
            choice('Which phrase means “Please”?', "Por favor", ["Buen provecho", "Mucho gusto"], "ASSIST"),
            choice('Complete the request: “Agua, por ___.”', "favor", ["gusto", "luego"], "CLOZE"),
            reorder("Bread, please", ["Pan", "por", "favor"]),
            matching("Match the food words.", [
              ["pan", "bread"],
              ["leche", "milk"],
              ["pasta", "pasta"],
            ]),
            dictation("Buen provecho"),
          ],
        },
        {
          title: "Clothes and Shopping",
          description: "Recognize common clothes and ask about a price.",
          challenges: [
            choice('Choose the Spanish word for “dress”.', "vestido", ["camisa", "falda"], "SELECT", "👗"),
            choice('Which phrase means “the shoes”?', "los zapatos", ["los calcetines", "la camiseta"], "SELECT", "👟"),
            choice('What does “¿Cuánto cuesta?” mean?', "How much is it?", ["Where is it?", "Do you like it?"], "ASSIST", null),
            reorder("The dress is beautiful", ["El", "vestido", "es", "bonito"]),
            matching("Match the clothes.", [
              ["camisa", "shirt"],
              ["falda", "skirt"],
              ["calcetines", "socks"],
            ]),
            dictation("La camiseta es grande"),
          ],
        },
        {
          title: "Nature and Travel",
          description: "Talk about natural places and a simple trip.",
          challenges: [
            choice('Choose the Spanish word for “river”.', "río", ["lago", "mar"], "SELECT", "🏞️"),
            choice('Which phrase means “the mountain”?', "la montaña", ["la playa", "el cielo"], "SELECT", "⛰️"),
            choice('Complete the question: “¿Mar o ___?”', "montaña", ["viaje", "cielo"], "CLOZE"),
            reorder("Let's go to the beach!", ["¡Vamos", "a", "la", "playa!"]),
            matching("Match the nature words.", [
              ["cielo", "sky"],
              ["sol", "sun"],
              ["lago", "lake"],
            ]),
            dictation("¡Buen viaje!"),
          ],
        },
      ],
    },
    {
      title: "Building Sentences",
      description: "Use verbs, plurals, professions, and describing words.",
      lessons: [
        {
          title: "Using Ser",
          description: "Build simple sentences with soy, eres, and es.",
          challenges: [
            choice('Complete the sentence: “Yo ___ un estudiante.”', "soy", ["estoy", "eres"], "CLOZE"),
            choice('Choose the Spanish for “You are big.”', "Tú eres grande", ["Yo soy grande", "Ella es grande"], "ASSIST"),
            choice('What does “El caballo es pequeño” mean?', "The horse is small", ["The horse is old", "The horse is big"], "SELECT", null),
            reorder("I am a cat", ["Yo", "soy", "un", "gato"]),
            matching("Match each subject and form of ser.", [
              ["yo", "soy"],
              ["tú", "eres"],
              ["él / ella", "es"],
            ]),
            dictation("Tú eres grande"),
          ],
        },
        {
          title: "Eating and Drinking",
          description: "Practise common present-tense verb forms.",
          challenges: [
            choice('Complete the sentence: “Yo ___ pan.”', "como", ["comes", "come"], "CLOZE"),
            choice('Choose the Spanish for “She eats pasta.”', "Ella come pasta", ["Ella bebe leche", "Yo como pasta"], "ASSIST"),
            choice('Complete the sentence: “Tú ___ leche.”', "bebes", ["bebo", "bebe"], "CLOZE"),
            reorder("The horse drinks water", ["El", "caballo", "bebe", "agua"]),
            matching("Match each subject with the correct form of comer.", [
              ["yo", "como"],
              ["tú", "comes"],
              ["ella", "come"],
            ]),
            dictation("Yo como pasta"),
          ],
        },
        {
          title: "Plurals and Agreement",
          description: "Make nouns and describing words agree in the plural.",
          challenges: [
            choice('Choose the plural of “gato”.', "gatos", ["gataso", "gatoes"], "GRAMMAR_TRANSFORM"),
            choice('Complete the phrase: “Las camisas son ___.”', "rojas", ["roja", "rojos"], "CLOZE"),
            choice('Which phrase means “beautiful beaches”?', "playas bonitas", ["playa bonita", "playas bonitos"], "ASSIST"),
            reorder("The glasses are big", ["Las", "gafas", "son", "grandes"]),
            matching("Match the singular and plural forms.", [
              ["pato", "patos"],
              ["camisa", "camisas"],
              ["médico", "médicos"],
            ]),
            dictation("Los gatos son pequeños"),
          ],
        },
        {
          title: "People and Professions",
          description: "Talk about occupations and what people do.",
          challenges: [
            choice('Choose the Spanish word for “doctor”.', "médico", ["granjero", "bombero"], "SELECT", "🧑‍⚕️"),
            choice('Which sentence means “The waiter works”?', "El camarero trabaja", ["El cantante canta", "El granjero llega"], "ASSIST"),
            choice('Complete the sentence: “Las bomberas ___.”', "llegan", ["bebe", "trabaja"], "CLOZE"),
            reorder("The farmer sees the animals", ["El", "granjero", "ve", "los", "animales"]),
            matching("Match each profession.", [
              ["bombero", "firefighter"],
              ["granjero", "farmer"],
              ["cantante", "singer"],
            ]),
            dictation("Los enfermeros viven aquí"),
          ],
        },
        {
          title: "Describing People and Places",
          description: "Use adjectives for size, age, and height.",
          challenges: [
            choice('Complete the sentence about Cecilia: “Cecilia es ___.”', "alta", ["alto", "altos"], "CLOZE"),
            choice('Choose the Spanish for “The mouse is small.”', "El ratón es pequeño", ["El ratón es grande", "El elefante es pequeño"], "ASSIST"),
            choice('Make this sentence negative: “Max es bajo.”', "Max no es bajo", ["Max es no bajo", "No Max bajo es"], "GRAMMAR_TRANSFORM"),
            reorder("The park is big", ["El", "parque", "es", "grande"]),
            matching("Match the adjectives.", [
              ["alto", "tall"],
              ["viejo", "old"],
              ["pequeño", "small"],
            ]),
            dictation("El perro es pequeño y viejo"),
          ],
        },
      ],
    },
    {
      title: "Everyday Conversation",
      description: "Express preferences and distinguish identity, state, and ongoing action.",
      lessons: [
        {
          title: "Likes and Preferences",
          description: "Say what you like and do not like.",
          challenges: [
            choice('Choose the Spanish for “Do you like coffee?”', "¿Te gusta el café?", ["¿Bebes el café?", "¿Cuánto cuesta el café?"], "ASSIST"),
            choice('Complete the sentence: “Me ___ la pasta.”', "gusta", ["llamo", "estoy"], "CLOZE"),
            choice('Make this sentence negative: “Me gusta el café.”', "No me gusta el café", ["Me no gusta el café", "No gusta me el café"], "GRAMMAR_TRANSFORM"),
            reorder("I like pasta", ["Me", "gusta", "la", "pasta"]),
            matching("Match each useful expression.", [
              ["me gusta", "I like"],
              ["no me gusta", "I do not like"],
              ["¿te gusta?", "do you like?"],
            ]),
            dictation("¿No te gusta el pan?"),
          ],
        },
        {
          title: "Ser and Estar",
          description: "Choose between identity and temporary state or location.",
          challenges: [
            choice('Complete the identity statement: “Yo ___ estudiante.”', "soy", ["estoy", "estás"], "CLOZE"),
            choice('Complete the location: “Yo ___ en la escuela.”', "estoy", ["soy", "eres"], "CLOZE"),
            choice('Which sentence means “She is a nurse”?', "Ella es enfermera", ["Ella está enferma", "Ella está en la escuela"], "ASSIST"),
            choice('Choose the sentence for a temporary condition.', "Ella está enferma", ["Ella es enfermera", "Ella es estudiante"], "GRAMMAR_TRANSFORM"),
            matching("Match each sentence to its meaning.", [
              ["Ellos están listos", "They are ready"],
              ["Ellos son listos", "They are smart"],
              ["Estamos en la ciudad", "We are in the city"],
            ]),
            dictation("El gato está limpio"),
          ],
        },
        {
          title: "Actions Happening Now",
          description: "Use estar plus the present participle for ongoing actions.",
          challenges: [
            choice('Complete the sentence: “Estamos ___ la cena.”', "cocinando", ["cocinar", "cocinamos"], "CLOZE"),
            choice('Choose the Spanish for “They are playing.”', "Ellos están jugando", ["Ellos son jugando", "Ellos juegan ayer"], "ASSIST"),
            choice('Change to an action happening now: “Ella nada en el mar.”', "Ella está nadando en el mar", ["Ella es nadando en el mar", "Ella está nada en el mar"], "GRAMMAR_TRANSFORM"),
            reorder("I am singing a song", ["Yo", "estoy", "cantando", "una", "canción"]),
            matching("Match the ongoing actions.", [
              ["escuchando", "listening"],
              ["aprendiendo", "learning"],
              ["escribiendo", "writing"],
            ]),
            dictation("¿Estás escuchando?"),
          ],
        },
      ],
    },
  ],
};
