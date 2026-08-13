export interface LanguageQuestCultureTopic {
  id: string;
  emoji: string;
  title: string;
  summary: string;
  facts: string[];
}

// Culture Quest is unscored, side-of-the-path content: short, factual reads
// that give a language some real-world context between lessons. Grouped by
// the same broad course category used elsewhere in Learning Quest (Chinese /
// English / Spanish / Other) rather than per-course, since the same cultural
// notes are useful across every course in that language.
export const LANGUAGE_QUEST_CULTURE_TOPICS: Record<string, LanguageQuestCultureTopic[]> = {
  "Chinese Courses": [
    {
      id: "lunar-new-year",
      emoji: "🧧",
      title: "Lunar New Year",
      summary: "The most important holiday on the Chinese calendar, built around family reunion.",
      facts: [
        "Also called Spring Festival (春节, Chūnjié), it falls on a different date each year based on the lunar calendar, usually between late January and mid-February.",
        "Red envelopes (红包, hóngbāo) filled with money are given to children and unmarried relatives as a symbol of good luck.",
        "Family reunion dinner on New Year's Eve is considered the most important meal of the year -- many people travel long distances to be home for it.",
        "Each year is associated with one of 12 zodiac animals, which repeat on a 12-year cycle.",
      ],
    },
    {
      id: "tea-culture",
      emoji: "🍵",
      title: "Tea culture",
      summary: "Tea is woven into daily life, hospitality, and formal ceremony alike.",
      facts: [
        "Offering tea to guests is a basic form of hospitality, and pouring tea for elders first is a sign of respect.",
        "Tapping two fingers on the table after someone pours your tea is a quiet, wordless way of saying thank you.",
        "China is home to many distinct tea traditions -- green, black (called 'red tea' locally), oolong, and pu'er teas are all produced in different regions.",
      ],
    },
    {
      id: "greetings-and-names",
      emoji: "🙏",
      title: "Names and greetings",
      facts: [
        "Family (surname) comes before the given name -- so Wáng Fāng has the surname Wáng, not Fāng.",
        "Asking 'have you eaten yet?' (吃了吗? Chī le ma?) is a common, casual way to greet someone, similar to 'how are you?' in English.",
        "A slight nod or handshake is a common modern greeting; bowing is more associated with formal or traditional contexts.",
      ],
      summary: "Small habits that make a first conversation feel natural.",
    },
  ],
  "Spanish Courses": [
    {
      id: "greetings-and-touch",
      emoji: "🤗",
      title: "Greetings",
      summary: "Spanish-speaking cultures tend to greet warmly, though customs vary by country.",
      facts: [
        "A single cheek kiss (or two, depending on the country) between friends is common in Spain and much of Latin America, alongside handshakes in more formal settings.",
        "Using usted instead of tú is a simple way to show respect to someone older or in a formal situation -- both mean 'you', but usted is more formal.",
        "Meal times often run later than in many English-speaking countries -- dinner around 9 or 10pm is normal in Spain.",
      ],
    },
    {
      id: "holidays",
      emoji: "🎉",
      title: "Celebrations",
      summary: "Spanish-speaking countries share a calendar full of distinct regional festivals.",
      facts: [
        "Día de los Muertos (Day of the Dead), celebrated in Mexico on November 1-2, honours deceased loved ones with colourful altars (ofrendas), not with sadness but with celebration.",
        "Many Spanish-speaking countries celebrate Three Kings' Day (Día de Reyes) on January 6th, when children traditionally receive gifts.",
        "Spain's La Tomatina, a giant tomato-throwing festival, happens every August in the town of Buñol.",
      ],
    },
    {
      id: "language-variety",
      emoji: "🌎",
      title: "One language, many accents",
      summary: "Spanish sounds different from country to country -- and that's normal.",
      facts: [
        "Spanish is an official language in 20 countries across Europe and the Americas, each with its own accent, slang, and expressions.",
        "'Vos' is used instead of 'tú' for 'you' in several Latin American countries, especially Argentina and Uruguay -- both are correct Spanish.",
        "Words for everyday things can differ by country -- for example, a straw is 'pajita' in Spain but 'popote' in Mexico and 'sorbete' in Argentina.",
      ],
    },
  ],
  "English Courses": [
    {
      id: "small-talk",
      emoji: "☕",
      title: "Small talk",
      summary: "Short, low-stakes conversation is a big part of everyday English.",
      facts: [
        "Commenting on the weather is one of the most common ways to start a casual conversation with a stranger in English-speaking countries.",
        "'How are you?' is often asked as a greeting rather than a real question -- a short 'good, thanks, you?' is the expected reply, not a detailed answer.",
        "Saying 'please' and 'thank you' frequently, even for small things, is considered polite and expected in most English-speaking cultures.",
      ],
    },
    {
      id: "idioms",
      emoji: "🗣️",
      title: "Everyday idioms",
      summary: "English leans heavily on figures of speech that don't translate literally.",
      facts: [
        "'It's raining cats and dogs' just means it's raining heavily -- no animals involved.",
        "'Break a leg' is a way of wishing someone good luck, especially before a performance.",
        "'Piece of cake' describes something that's very easy to do.",
      ],
    },
  ],
};

export function languageQuestCultureTopics(category: string): LanguageQuestCultureTopic[] {
  return LANGUAGE_QUEST_CULTURE_TOPICS[category] ?? [];
}
