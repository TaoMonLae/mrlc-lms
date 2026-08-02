import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import WordPOS from "wordpos";
import { buildOddOneOut, option, tokenizeWords } from "./lib/language-quest-practice-helpers.mjs";

const outputPath = path.resolve(process.cwd(), "curricula/language-quest/english-word-courses.generated.json");
const sourceCandidates = [
  process.env.ENGLISH_WORDS_ALPHA_PATH,
  path.resolve(process.cwd(), "curricula/sources/english-words/words_alpha.txt"),
  "/private/tmp/mrlc-english-words/words_alpha.txt",
].filter(Boolean);

const courseSpecs = [
  {
    code: "MRLC-ENGLISH-WORDS-EVERYDAY-V2",
    title: "Everyday English Word Quest A1–A2",
    description: "Build practical A1–A2 vocabulary in definitions and real usage contexts for school, home, food, feelings, actions, and places.",
    imageEmoji: "💬",
    accentColor: "#2563eb",
    units: [
      ["Daily Foundations", "Useful vocabulary for school, home, and meals.", [
        ["School", ["student", "teacher", "classroom", "lesson", "homework", "library", "pencil", "notebook", "question", "answer"]],
        ["Home", ["family", "parent", "child", "kitchen", "bedroom", "window", "garden", "breakfast", "dinner", "welcome"]],
        ["Food and Drink", ["apple", "banana", "bread", "rice", "water", "coffee", "vegetable", "hungry", "delicious", "recipe"]],
      ]],
      ["People on the Move", "Words for actions, emotions, and getting around.", [
        ["Actions", ["walk", "speak", "listen", "write", "carry", "open", "close", "begin", "finish", "choose"]],
        ["Feelings and Character", ["happy", "sad", "angry", "afraid", "excited", "tired", "calm", "proud", "kind", "brave"]],
        ["Around Town", ["hospital", "market", "station", "airport", "restaurant", "street", "bridge", "village", "journey", "ticket"]],
      ]],
    ],
  },
  {
    code: "MRLC-ENGLISH-WORDS-ACADEMIC-V2",
    title: "Academic English Word Quest B1–B2",
    description: "Practise high-value B1–B2 words in definitions and real usage contexts from research, writing, science, mathematics, and society.",
    imageEmoji: "🎓",
    accentColor: "#7c3aed",
    units: [
      ["Study and Research", "Words for thinking, evidence, reading, and writing.", [
        ["Thinking Skills", ["analyze", "compare", "contrast", "evaluate", "explain", "infer", "interpret", "observe", "predict", "summarize"]],
        ["Evidence and Research", ["evidence", "research", "source", "data", "method", "result", "theory", "survey", "sample", "conclusion"]],
        ["Reading and Writing", ["argument", "paragraph", "sentence", "context", "quotation", "reference", "revise", "draft", "grammar", "vocabulary"]],
      ]],
      ["STEM and Society", "Academic vocabulary across technical and social subjects.", [
        ["Science", ["energy", "matter", "element", "organism", "climate", "environment", "experiment", "variable", "measure", "process"]],
        ["Mathematics", ["equation", "fraction", "decimal", "ratio", "average", "geometry", "calculate", "estimate", "sequence", "pattern"]],
        ["Society", ["culture", "community", "economy", "government", "justice", "migration", "population", "tradition", "citizen", "history"]],
      ]],
    ],
  },
  {
    code: "MRLC-ENGLISH-WORDS-POWER-V2",
    title: "English Word Power C1",
    description: "Strengthen C1 vocabulary through precise definitions and real usage contexts for communication, problem-solving, change, and the wider world.",
    imageEmoji: "⚡",
    accentColor: "#059669",
    units: [
      ["Expression and Growth", "Words for character, communication, and positive change.", [
        ["Character", ["adaptable", "ambitious", "confident", "curious", "diligent", "generous", "honest", "patient", "reliable", "resilient"]],
        ["Communication", ["articulate", "clarify", "collaborate", "concise", "debate", "describe", "discuss", "persuade", "respond", "translate"]],
        ["Change", ["accelerate", "adapt", "develop", "emerge", "expand", "improve", "innovate", "reduce", "transform", "transition"]],
      ]],
      ["Solutions and the World", "Precise words for challenges, decisions, and global topics.", [
        ["Challenges and Solutions", ["complex", "conflict", "consequence", "obstacle", "pressure", "priority", "solution", "strategy", "succeed", "urgent"]],
        ["Precision", ["accurate", "approximate", "consistent", "distinct", "efficient", "essential", "flexible", "significant", "specific", "valid"]],
        ["Our World", ["ecosystem", "conservation", "democracy", "equality", "global", "infrastructure", "sustainable", "technology", "urban", "welfare"]],
      ]],
    ],
  },
];

const definitionOverrides = {
  answer: "a reply to a question or a solution to a problem",
  afraid: "feeling fear or worry",
  average: "a value found by adding numbers and dividing by how many there are",
  begin: "to start doing or being something",
  brave: "ready to face danger or difficulty with courage",
  bridge: "a structure carrying a path or road over an obstacle",
  calm: "peaceful and not excited, worried, or upset",
  carry: "to hold and move something from one place to another",
  close: "to shut an opening or bring something to an end",
  coffee: "a dark drink made from roasted beans",
  collaborate: "to work together toward a shared goal",
  conclusion: "a judgment or decision reached after reasoning",
  conflict: "a serious disagreement or struggle",
  conservation: "the protection of nature and careful use of resources",
  consequence: "a result or effect of an action",
  curious: "eager to know or learn something",
  decimal: "a number written with a point to show a fraction of ten",
  delicious: "having a very pleasant taste or smell",
  develop: "to grow or change into a more advanced form",
  element: "a pure substance made from one kind of atom",
  energy: "the ability to do work or cause change",
  excited: "very enthusiastic and eager",
  experiment: "a scientific test used to discover or demonstrate something",
  finish: "to complete something or reach its end",
  fraction: "a number representing part of a whole",
  garden: "a piece of land where flowers, fruit, or vegetables are grown",
  hungry: "needing or wanting food",
  improve: "to make or become better",
  infer: "to reach a conclusion from evidence and reasoning",
  infrastructure: "the basic systems and structures a society or organization needs",
  innovate: "to introduce new ideas or methods",
  interpret: "to explain or understand the meaning of something",
  kind: "friendly, generous, and considerate toward others",
  market: "a place where people buy and sell goods",
  matter: "physical substance from which things are made",
  measure: "to find the size, amount, or degree of something",
  observe: "to notice or watch something carefully",
  open: "to move something so that it is no longer closed",
  parent: "a mother, father, or person who cares for a child",
  pattern: "a repeated or regular arrangement",
  predict: "to say what is likely to happen in the future",
  pressure: "a difficult demand or feeling of urgency",
  priority: "something considered more important than other things",
  process: "a series of actions that produces a result",
  question: "a sentence or request that asks for information",
  reduce: "to make something smaller or less",
  reference: "a source used to find or support information",
  respond: "to reply or react to something",
  source: "the place, person, or thing from which information comes",
  sample: "a small part chosen to represent a larger whole",
  result: "the outcome produced by an action or event",
  draft: "an early version of a piece of writing",
  sequence: "a set of things arranged in a particular order",
  solution: "an answer to a problem or difficult situation",
  speak: "to use your voice to say words",
  station: "a place where trains or buses regularly stop",
  strategy: "a carefully planned method for achieving a goal",
  summarize: "to give the main points in a shorter form",
  sustainable: "able to continue without using up resources or harming the environment",
  technology: "scientific knowledge and tools used to solve practical problems",
  tired: "in need of rest or sleep",
  transform: "to change greatly in form, appearance, or character",
  variable: "a factor that can change or be changed",
  water: "a clear liquid that people, animals, and plants need to live",
  welcome: "received with pleasure or friendly approval",
  welfare: "the health, happiness, and safety of a person or group",
  write: "to form words or symbols on a surface",
  culture: "the shared ideas, customs, and arts of a group",
  history: "the study or record of past events",
  global: "relating to the whole world",
  valid: "based on sound reasoning or officially acceptable",
};

const usageExampleOverrides = {
  teacher: "The teacher explained the new idea with a clear example.",
  lesson: "Today's lesson introduces the water cycle.",
  library: "We borrowed two science books from the library.",
  pencil: "Use a pencil so you can correct your work easily.",
  question: "Mina raised her hand to ask a question.",
  answer: "Check your answer before submitting the worksheet.",
  family: "Her family eats dinner together every Friday.",
  child: "The child read the short story aloud.",
  window: "Sunlight came through the classroom window.",
  garden: "The students planted herbs in the school garden.",
  breakfast: "A healthy breakfast can help learners concentrate.",
  dinner: "We talked about our day during dinner.",
  welcome: "The new student received a warm welcome.",
  bread: "He made a sandwich with fresh bread.",
  rice: "The family served vegetables with rice.",
  water: "Remember to drink enough water after exercise.",
  coffee: "The cafe also serves tea and coffee.",
  hungry: "I felt hungry after the football match.",
  delicious: "The vegetable soup smelled delicious.",
  walk: "We walk to the library after lunch.",
  speak: "Please speak clearly during your presentation.",
  listen: "Listen carefully for the main idea.",
  write: "Write your name at the top of the page.",
  carry: "This bag can carry all of my school books.",
  open: "Please open your book to page ten.",
  close: "Close the door quietly when you leave.",
  begin: "The assembly will begin at nine o'clock.",
  finish: "Try to finish the activity before the bell.",
  choose: "Choose the strongest evidence for your answer.",
  happy: "The class felt happy about its progress.",
  sad: "The ending of the story made him feel sad.",
  angry: "She felt angry when the rule was applied unfairly.",
  afraid: "He was afraid to speak until his partner encouraged him.",
  tired: "After the long journey, everyone felt tired.",
  calm: "She stayed calm and followed the safety instructions.",
  proud: "The students were proud of their community project.",
  kind: "It was kind of you to help the new learner.",
  brave: "The brave student admitted the mistake and corrected it.",
  market: "Farmers sell fresh produce at the weekend market.",
  station: "The train arrived at the station on time.",
  street: "Use the crossing when you walk across the street.",
  bridge: "The bridge connects the village to the main road.",
  village: "The small village has a school and a health clinic.",
  ticket: "Keep your bus ticket until the end of the journey.",
  analyze: "Students analyze the results before writing a conclusion.",
  compare: "Compare the two articles and identify their similarities.",
  contrast: "The essay will contrast city life with village life.",
  evaluate: "Researchers evaluate whether the method produced reliable results.",
  explain: "Use the diagram to explain how the machine works.",
  interpret: "The class will interpret the information shown in the graph.",
  observe: "Scientists observe the plant each day and record any changes.",
  summarize: "Summarize the passage in three clear sentences.",
  evidence: "The writer supports the claim with evidence from the text.",
  research: "Their research examines how sleep affects learning.",
  source: "Always check whether an online source is trustworthy.",
  data: "The class organized its survey data in a table.",
  result: "The final result matched the team's prediction.",
  theory: "The evidence supports the theory presented in the article.",
  survey: "The student council conducted a survey about school lunches.",
  sample: "The laboratory tested a small sample of river water.",
  conclusion: "The conclusion explains what the experiment demonstrated.",
  argument: "A strong argument includes reasons and supporting evidence.",
  sentence: "Each sentence should express a complete idea.",
  context: "The surrounding paragraph provides context for the unfamiliar word.",
  quotation: "Use a short quotation to support your interpretation.",
  reference: "The report includes a reference for every borrowed idea.",
  revise: "Writers revise their drafts to make the meaning clearer.",
  draft: "Her first draft contained several ideas to develop.",
  vocabulary: "Reading widely can expand your academic vocabulary.",
  energy: "Solar panels convert sunlight into energy.",
  matter: "All matter has mass and occupies space.",
  element: "Oxygen is an element found in air and water.",
  organism: "Each organism depends on its environment to survive.",
  climate: "The region's climate is warm and humid throughout the year.",
  environment: "Recycling can reduce harm to the environment.",
  experiment: "The experiment tests how light affects plant growth.",
  variable: "The scientist changed one variable at a time.",
  measure: "Use a ruler to measure the length of the leaf.",
  process: "Photosynthesis is the process plants use to make food.",
  decimal: "Write one half as the decimal 0.5.",
  average: "The average of four, six, and eight is six.",
  estimate: "Make an estimate before calculating the exact total.",
  sequence: "Place the events in the correct sequence.",
  pattern: "The number pattern increases by three each time.",
  culture: "Food, language, and art are important parts of culture.",
  community: "The community worked together to clean the park.",
  economy: "Small businesses contribute to the local economy.",
  government: "The government introduced a new education policy.",
  population: "The town's population has grown over the last decade.",
  history: "The museum preserves objects from local history.",
  adaptable: "An adaptable learner can use different study strategies.",
  ambitious: "The class set an ambitious goal for its reading challenge.",
  confident: "Practice helped her feel confident during the presentation.",
  curious: "A curious student asks questions and explores new ideas.",
  diligent: "His diligent research uncovered several useful sources.",
  generous: "The generous volunteers shared their time and skills.",
  honest: "Give an honest account of what happened.",
  patient: "The tutor remained patient while the learner tried again.",
  reliable: "A reliable source provides accurate, verifiable information.",
  resilient: "The resilient team recovered from its early setback.",
  articulate: "Her articulate response communicated a complex idea clearly.",
  clarify: "Ask a follow-up question to clarify the instructions.",
  concise: "A concise summary includes only the most important points.",
  persuade: "The campaign aims to persuade students to save water.",
  translate: "Can you translate this short message into English?",
  adapt: "The group will adapt its plan after reviewing the feedback.",
  develop: "Students develop stronger arguments through careful revision.",
  emerge: "New themes emerge as the class examines the interviews.",
  expand: "Add evidence to expand the second paragraph.",
  reduce: "Turning off unused lights can reduce energy consumption.",
  transform: "Heat can transform ice into liquid water.",
  transition: "A linking phrase creates a smooth transition between ideas.",
  complex: "The team divided the complex problem into smaller steps.",
  conflict: "The mediator helped both sides resolve the conflict.",
  consequence: "Soil erosion can be a consequence of removing too many trees.",
  obstacle: "Limited transport was an obstacle to attending the event.",
  pressure: "The container cracked when the internal pressure became too high.",
  priority: "Student safety is the school's highest priority.",
  solution: "The group tested more than one solution to the problem.",
  succeed: "Teams succeed when members communicate and share responsibility.",
  urgent: "The broken water pipe required urgent attention.",
  accurate: "The report must include accurate measurements.",
  approximate: "The map shows the approximate location of the campsite.",
  consistent: "Her results were consistent across all three trials.",
  distinct: "The two materials have distinct properties.",
  efficient: "The new system is more efficient and uses less energy.",
  essential: "Clean water is essential for human health.",
  flexible: "A flexible schedule can accommodate unexpected changes.",
  significant: "The study found a significant improvement in attendance.",
  specific: "Use a specific example to support your claim.",
  valid: "The conclusion is valid because it follows from the evidence.",
  global: "Climate change is a global challenge.",
  technology: "Assistive technology can make learning more accessible.",
  urban: "The city created more green spaces in urban neighborhoods.",
  welfare: "The organization protects the welfare of children and families.",
  student: "The student asked a thoughtful question during the lesson.",
  classroom: "The classroom became quiet when the lesson began.",
  homework: "I finished my homework before dinner.",
  notebook: "She recorded each new word in her notebook.",
  parent: "A parent signed the school permission form.",
  kitchen: "We prepared breakfast together in the kitchen.",
  bedroom: "He opened the bedroom window to let in fresh air.",
  apple: "She packed an apple for her morning snack.",
  banana: "The banana was ripe and sweet.",
  vegetable: "Carrots are the vegetable in today's soup.",
  recipe: "The recipe explains how to prepare the dish step by step.",
  excited: "The students felt excited about the class trip.",
  hospital: "The ambulance carried the patient to the hospital.",
  airport: "We arrived at the airport two hours before the flight.",
  restaurant: "The family reserved a table at the restaurant.",
  journey: "Their long journey ended safely at the village.",
  infer: "Readers infer the character's feelings from clues in the story.",
  predict: "Scientists predict tomorrow's weather using current data.",
  method: "The researcher explained the method used in the experiment.",
  paragraph: "Each paragraph should develop one clear main idea.",
  grammar: "Careful grammar makes formal writing easier to understand.",
  equation: "Solve the equation to find the unknown value.",
  fraction: "One half is a fraction that represents one of two equal parts.",
  ratio: "The ratio of blue cards to red cards is two to one.",
  geometry: "In geometry, students study shapes, angles, and space.",
  calculate: "Use the measurements to calculate the area of the room.",
  justice: "The court aims to deliver justice fairly.",
  migration: "Seasonal migration brings the birds back each spring.",
  tradition: "Sharing this meal is an important family tradition.",
  citizen: "Every citizen has both rights and responsibilities.",
  collaborate: "The two classes collaborate on a community garden project.",
  debate: "Students debate whether the proposed solution is fair.",
  describe: "Please describe what you observed during the experiment.",
  discuss: "The group will discuss the evidence before making a decision.",
  respond: "Please respond to the question with a complete sentence.",
  accelerate: "New tools can accelerate the research process.",
  improve: "Regular feedback can improve the quality of a first draft.",
  innovate: "Engineers innovate when existing solutions no longer work.",
  strategy: "The team developed a strategy for completing the project on time.",
  ecosystem: "A healthy wetland ecosystem supports many species.",
  conservation: "Water conservation helps communities prepare for dry seasons.",
  democracy: "In a democracy, citizens choose representatives through elections.",
  equality: "The policy promotes equality by giving every learner the same opportunity.",
  infrastructure: "Reliable transport infrastructure connects rural communities to cities.",
  sustainable: "The school chose a sustainable design that uses less energy.",
};

const wordpos = new WordPOS({ stopwords: false });

function lookup(word) {
  return new Promise((resolve) => wordpos.lookup(word, resolve));
}

function chooseDefinition(word, rows) {
  if (definitionOverrides[word]) return definitionOverrides[word];
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wordPattern = new RegExp(`\\b${escaped}\\b`, "i");
  const candidates = (rows || [])
    .filter((row) => typeof row?.def === "string" && row.def.trim())
    .map((row, index) => {
      const definition = row.def.replace(/\s+/g, " ").trim();
      const lemma = String(row.lemma || "").replace(/_/g, " ").toLowerCase();
      let score = lemma === word ? 100 : 0;
      if (!wordPattern.test(definition)) score += 30;
      if (!definition.startsWith("(")) score += 10;
      if (definition.length >= 20 && definition.length <= 150) score += 10;
      score -= index;
      return { definition, score };
    })
    .sort((a, b) => b.score - a.score || a.definition.length - b.definition.length);
  if (!candidates.length) throw new Error(`WordNet has no definition for “${word}”`);
  return candidates[0].definition.replace(/[.;]+$/, "");
}

function normalizeExample(value) {
  const compact = value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  const sentence = `${compact.charAt(0).toUpperCase()}${compact.slice(1)}`;
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function chooseUsageExample(word, rows) {
  if (usageExampleOverrides[word]) return usageExampleOverrides[word];
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wordPattern = new RegExp(`\\b${escaped}\\b`, "i");
  const candidates = (rows || [])
    .flatMap((row) => Array.isArray(row?.exp) ? row.exp : [])
    .filter((example) => typeof example === "string" && wordPattern.test(example))
    .map(normalizeExample)
    .filter((example) => example.length >= 12 && example.length <= 180)
    .sort((left, right) => Math.abs(left.length - 72) - Math.abs(right.length - 72));
  if (!candidates.length) throw new Error(`WordNet has no usage example for “${word}”; add a curated override`);
  return candidates[0];
}

function blankUsageExample(word, example) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return example.replace(new RegExp(`\\b${escaped}\\b`, "i"), "_____");
}

async function findSourceWords() {
  for (const candidate of sourceCandidates) {
    try {
      await access(candidate);
      const contents = await readFile(candidate, "utf8");
      return { path: candidate, words: new Set(contents.split(/\r?\n/).map((word) => word.trim()).filter(Boolean)) };
    } catch {
      // Try the next configured source location.
    }
  }
  return null;
}

const selectedWords = [...new Set(courseSpecs.flatMap((course) => course.units.flatMap((unit) => unit[2].flatMap((lesson) => lesson[1]))))];
const source = await findSourceWords();
if (source) {
  const missing = selectedWords.filter((word) => !source.words.has(word));
  if (missing.length) throw new Error(`Words missing from dwyl/english-words: ${missing.join(", ")}`);
} else {
  console.warn("dwyl/english-words source not found; generating from the already validated selection");
}

const definitions = new Map();
const usageExamples = new Map();
await Promise.all(selectedWords.map(async (word) => {
  const rows = await lookup(word);
  definitions.set(word, chooseDefinition(word, rows));
  usageExamples.set(word, chooseUsageExample(word, rows));
}));

function createChallenge(words, word, index) {
  const distractors = [];
  for (let step = 1; distractors.length < 2; step += 1) {
    const candidate = words[(index + step) % words.length];
    if (candidate !== word && !distractors.includes(candidate)) distractors.push(candidate);
  }
  const options = distractors.map((text) => ({ text, correct: false, emoji: null, audioText: text }));
  options.splice(index % 3, 0, { text: word, correct: true, emoji: null, audioText: word });
  const definition = definitions.get(word);
  const usageExample = usageExamples.get(word);
  const explanation = `“${word}” means ${definition}. Example: ${usageExample}`;
  switch (index % 4) {
    case 0:
      return { type: "SELECT", question: `Which word means “${definition}”?`, explanation, options };
    case 1:
      return { type: "ASSIST", question: `Which word means “${definition}”?`, explanation, options };
    case 2:
      return { type: "CLOZE", question: `Complete this sentence: “${blankUsageExample(word, usageExample)}”`, explanation, options };
    default:
      return { type: "GRAMMAR_TRANSFORM", question: `Choose the most precise word for this sentence: “${blankUsageExample(word, usageExample)}”`, explanation, options };
  }
}

// Pairs the first 4 words of a lesson with their definitions into one
// MATCHING challenge (2 tiles per pair, positionally paired -- see
// matchingChallengeIsCorrect in shared/languageQuest.ts).
function matchingChallenge(words) {
  const pairs = words.slice(0, 4).map((word) => ({ word, definition: definitions.get(word) }));
  const options = [];
  for (const pair of pairs) {
    options.push({ text: pair.word, correct: true, emoji: null, audioText: pair.word });
    options.push({ text: pair.definition, correct: true, emoji: null, audioText: pair.definition });
  }
  return {
    type: "MATCHING",
    question: "Match each word to its definition.",
    explanation: pairs.map((pair) => `“${pair.word}” means ${pair.definition}.`).join(" "),
    options,
  };
}

// Precomputes every lesson's own word list up front so each lesson's extra
// ODD_ONE_OUT/REORDER challenges can safely borrow a "ringer" word from the
// very next lesson -- guaranteed to exist and guaranteed distinct, since
// every lesson draws from its own disjoint word list.
const lessonPlans = courseSpecs.flatMap((course) => course.units.flatMap(([, , lessons]) => lessons.map(([, words]) => words)));

function lessonExtras(planIndex) {
  const words = lessonPlans[planIndex];
  const nextWords = lessonPlans[(planIndex + 1) % lessonPlans.length];
  const extras = [];

  const inGroup = words.slice(0, 3);
  const oddWord = nextWords[0];
  const oddOneOut = buildOddOneOut(
    "Which word does not belong with the others in this lesson?",
    inGroup,
    oddWord,
    `“${oddWord}” comes from a different lesson; the rest of this set is ${inGroup.map((word) => `“${word}”`).join(", ")}.`,
  );
  if (oddOneOut) extras.push(oddOneOut);

  let bestSentence = null;
  for (const word of words) {
    const tokens = tokenizeWords(usageExamples.get(word));
    if (tokens && (!bestSentence || tokens.length > bestSentence.tokens.length)) {
      bestSentence = { word, tokens };
    }
  }
  if (bestSentence) {
    extras.push({
      type: "REORDER",
      question: `Put this example sentence about “${bestSentence.word}” back in the correct order.`,
      options: bestSentence.tokens.map((token) => option(token, true)),
    });
  }

  return extras;
}

let planIndex = 0;
const courses = courseSpecs.map((course) => ({
  code: course.code,
  title: course.title,
  description: course.description,
  language: "English",
  imageEmoji: course.imageEmoji,
  accentColor: course.accentColor,
  published: true,
  units: course.units.map(([title, description, lessons]) => ({
    title,
    description,
    lessons: lessons.map(([lessonTitle, words]) => {
      const extras = lessonExtras(planIndex);
      planIndex += 1;
      return {
        title: lessonTitle,
        description: `Learn ${words.length} English words through definitions, sentence context, precise usage, grammar, ordering, and a matching review.`,
        challenges: [...words.map((word, index) => createChallenge(words, word, index)), ...extras, matchingChallenge(words)],
      };
    }),
  })),
}));

const allChallenges = courses.flatMap((course) => course.units.flatMap((unit) => unit.lessons.flatMap((lesson) => lesson.challenges)));
const lessonCount = courses.flatMap((course) => course.units.flatMap((unit) => unit.lessons)).length;
const matchingChallenges = allChallenges.filter((challenge) => challenge.type === "MATCHING");
const reorderChallenges = allChallenges.filter((challenge) => challenge.type === "REORDER");
const oddOneOutChallenges = allChallenges.filter((challenge) => challenge.type === "ODD_ONE_OUT");
const challenges = allChallenges.filter((challenge) => !["MATCHING", "REORDER", "ODD_ONE_OUT"].includes(challenge.type));
if (courses.length !== 3 || selectedWords.length !== 180 || challenges.length !== 180) {
  throw new Error(`Expected 3 courses and 180 unique challenges; generated ${courses.length} courses, ${selectedWords.length} words, and ${challenges.length} challenges`);
}
if (challenges.some((challenge) => challenge.options.length !== 3 || challenge.options.filter((opt) => opt.correct).length !== 1)) {
  throw new Error("Every generated word challenge must have three choices and exactly one answer");
}
if (challenges.filter((challenge) => challenge.type !== "SELECT").length !== 126) {
  throw new Error("Expected 126 of the 180 English word challenges (7/10 per lesson) to use translation-assist, sentence-context, or grammar framing");
}
{
  const typeCounts = new Map();
  for (const challenge of challenges) typeCounts.set(challenge.type, (typeCounts.get(challenge.type) || 0) + 1);
  for (const requiredType of ["SELECT", "ASSIST", "CLOZE", "GRAMMAR_TRANSFORM"]) {
    if (!typeCounts.get(requiredType)) throw new Error(`Generated English word course is missing ${requiredType} challenges`);
  }
}
if (challenges.some((challenge) => !challenge.explanation || challenge.question.includes("undefined"))) {
  throw new Error("Every generated English word challenge must include a valid teaching explanation");
}
if (reorderChallenges.length !== lessonCount) {
  throw new Error(`Expected one REORDER challenge per lesson (${lessonCount}), found ${reorderChallenges.length}`);
}
if (reorderChallenges.some((challenge) => challenge.options.length < 2 || challenge.options.some((opt) => !opt.correct))) {
  throw new Error("Every REORDER challenge must have at least two tokens, all marked correct");
}
if (oddOneOutChallenges.length !== lessonCount) {
  throw new Error(`Expected one ODD_ONE_OUT challenge per lesson (${lessonCount}), found ${oddOneOutChallenges.length}`);
}
if (oddOneOutChallenges.some((challenge) => challenge.options.length !== 4 || challenge.options.filter((opt) => opt.correct).length !== 1)) {
  throw new Error("Every ODD_ONE_OUT challenge must have four options and exactly one odd-one-out answer");
}
if (matchingChallenges.length !== lessonCount) {
  throw new Error(`Expected one MATCHING challenge per lesson (${lessonCount}), found ${matchingChallenges.length}`);
}
if (matchingChallenges.some((challenge) => challenge.options.length !== 8 || challenge.options.some((opt) => !opt.correct))) {
  throw new Error("Every generated MATCHING challenge must have 4 pairs (8 tiles), all marked correct");
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(courses, null, 2)}\n`, "utf8");
console.log(`Generated ${courses.length} English word courses with ${selectedWords.length} validated words${source ? ` from ${source.path}` : ""}`);
