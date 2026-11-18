export const PLACEMENT_TEST_VERSION = 'mrlc-placement-2026-11b';

export const PLACEMENT_FORMS = ['A', 'B', 'C'] as const;
export type PlacementForm = typeof PLACEMENT_FORMS[number];

export const PLACEMENT_BANDS = ['FOUNDATION', 'PRE_GED', 'GED'] as const;
export type PlacementBand = typeof PLACEMENT_BANDS[number];

export const PLACEMENT_LEVELS = ['BELOW_PRE_GED', 'PRE_GED', 'GED'] as const;
export type PlacementLevel = typeof PLACEMENT_LEVELS[number];

export const PLACEMENT_SECTION_IDS = ['RLA', 'MATH', 'SCIENCE', 'SOCIAL_STUDIES'] as const;
export type PlacementSectionId = typeof PLACEMENT_SECTION_IDS[number];

export const PLACEMENT_STATUSES = ['NEW', 'REVIEWED', 'CONTACTED', 'ARCHIVED'] as const;
export type PlacementStatus = typeof PLACEMENT_STATUSES[number];

export const WRITING_RATINGS = ['NOT_RATED', 'BEGINNING', 'DEVELOPING', 'SECURE'] as const;
export type WritingRating = typeof WRITING_RATINGS[number];

export const PLACEMENT_TIME_LIMIT_SECONDS = 90 * 60;
export const PLACEMENT_GRACE_SECONDS = 2 * 60;

export const HIGHEST_GRADE_OPTIONS = [
  { value: 'NONE', label: 'I have not attended school' },
  { value: 'GRADE_1_4', label: 'Grade 1 to 4' },
  { value: 'GRADE_5_8', label: 'Grade 5 to 8' },
  { value: 'GRADE_9_10', label: 'Grade 9 or 10' },
  { value: 'GRADE_11_PLUS', label: 'Grade 11 or higher' },
] as const;

export const PLACEMENT_LEVEL_LABELS: Record<PlacementLevel, string> = {
  BELOW_PRE_GED: 'Below Pre-GED',
  PRE_GED: 'Pre-GED',
  GED: 'GED class',
};

export const PLACEMENT_LEVEL_CLASS_NAMES: Record<PlacementLevel, string> = {
  BELOW_PRE_GED: 'Foundation class',
  PRE_GED: 'Pre-GED class',
  GED: 'GED class',
};

export const PLACEMENT_BAND_LABELS: Record<PlacementBand, string> = {
  FOUNDATION: 'Foundation',
  PRE_GED: 'Pre-GED',
  GED: 'GED',
};

export const PLACEMENT_BAND_GRADES: Record<PlacementBand, string> = {
  FOUNDATION: 'about Grade 4 to 5',
  PRE_GED: 'about Grade 6 to 8',
  GED: 'about Grade 9 to 12',
};

export interface PlacementPassage {
  id: string;
  title: string;
  body: string[];
}

export interface PlacementQuestion {
  id: string;
  form: PlacementForm;
  section: PlacementSectionId;
  band: PlacementBand;
  skill: string;
  passageId?: string;
  prompt: string;
  options: string[];
  answer: number;
}

export interface PlacementSection {
  id: PlacementSectionId;
  title: string;
  shortTitle: string;
  description: string;
}

export const PLACEMENT_SECTIONS: PlacementSection[] = [
  { id: 'RLA', title: 'Reading and Writing', shortTitle: 'Reading', description: 'Read each passage carefully, then answer the questions. Some questions check grammar and sentences.' },
  { id: 'MATH', title: 'Mathematics', shortTitle: 'Math', description: 'Work out each answer on paper. Do not use a calculator.' },
  { id: 'SCIENCE', title: 'Science', shortTitle: 'Science', description: 'Answer questions about living things, matter, energy, data and experiments.' },
  { id: 'SOCIAL_STUDIES', title: 'Social Studies', shortTitle: 'Social Studies', description: 'Answer questions about maps, history, government, economics and data.' },
];

export const PLACEMENT_PASSAGES: PlacementPassage[] = [
  { id: 'a-rla-market', title: 'The night market', body: [
    'Every Friday evening, Aye Aye helps her uncle at the night market. They sell fried bananas and sweet tea. Before the market opens, Aye Aye counts the cups and cleans the table. Her uncle cooks while she takes money from customers.',
    'When it rains, fewer people come, so they cook less food. At the end of the night, Aye Aye is tired, but she is proud. She is saving her share of the money to buy a bicycle.',
  ] },
  { id: 'a-rla-garden', title: 'The parking lot garden', body: [
    'Last year, the people living in a small apartment block turned an empty parking area into a community garden. At first, many neighbours doubted the idea. The ground was hard, and there was no water tap nearby.',
    'However, a group of volunteers collected rainwater in old barrels and carried soil from a nearby farm. After three months, the garden produced long beans, chillies and morning glory. Families now share the vegetables, and children help water the plants after school.',
    'The garden did more than provide food. Neighbours who had lived next to each other for years without speaking now meet there every evening.',
  ] },
  { id: 'a-rla-phones', title: 'Phones at school', body: [
    'Some schools ban mobile phones during the school day. Supporters of these bans argue that phones distract students and that learning improves when phones are put away. One school district reported that students at schools with a ban scored slightly higher on reading tests the following year.',
    'Critics respond that the district study did not consider other changes those schools made at the same time, such as hiring more teachers. They also point out that, for many families, a phone is the only way to reach a child in an emergency.',
    'A better policy, critics say, would teach students when and how to use phones responsibly instead of removing them completely.',
  ] },
  { id: 'a-sci-plant', title: 'Plant height', body: [
    'A student measured the height of a bean plant at the end of each week.',
    'Week 1: 2 cm · Week 2: 5 cm · Week 3: 9 cm · Week 4: 14 cm',
  ] },
  { id: 'a-sci-beans', title: 'Aung’s experiment', body: [
    'Aung wants to find out whether fertilizer makes bean plants grow taller. He plants two groups of bean seeds in the same kind of soil. He gives fertilizer to one group only. After four weeks, he measures the height of every plant.',
  ] },
  { id: 'a-ss-branches', title: 'Three branches of government', body: [
    'The United States Constitution divides power among three branches of government. Congress makes laws. The President carries out laws. The courts decide what laws mean.',
    'Each branch can limit the others. For example, the President can veto, or reject, a law passed by Congress. Congress can then override the veto if two-thirds of its members vote for the law again.',
  ] },

  { id: 'b-rla-football', title: 'The football match', body: [
    'On Saturday, Nai Soe’s team played football against a team from another school. In the first half, Nai Soe’s team was losing by two goals. At half time, the coach told the players to pass the ball more and stop running alone.',
    'In the second half, the team worked together and scored three goals. After the game, Nai Soe shook hands with the other players. He learned that teamwork matters more than one strong player.',
  ] },
  { id: 'b-rla-repair', title: 'Learning to fix phones', body: [
    'When Hla Win moved to the city, she could not find work. A neighbour who repaired mobile phones offered to teach her. At first, the tiny screws and wires frustrated her, and she broke two old phones while practising.',
    'She did not give up. Each evening she watched her neighbour work and wrote notes in a small book. After six months, customers began asking for Hla Win by name.',
    'Today she runs her own small repair stall. She says the notes she wrote are still the most valuable tool she owns.',
  ] },
  { id: 'b-rla-week', title: 'A four-day school week', body: [
    'Some school districts have moved to a four-day school week to save money on buses, heating and electricity. Supporters say the longer school days on the remaining four days give teachers time for deeper lessons, and that families can use the free day for appointments and part-time work. A study in one state found that the districts saved about 1 to 2 percent of their budgets.',
    'Opponents argue that the savings are small compared with the costs to families. Parents who work five days must arrange childcare on the fifth day. A different study found that students in four-day districts made slightly smaller gains in mathematics than similar students in five-day districts.',
    'Opponents say schools should look for savings that do not reduce learning time.',
  ] },
  { id: 'b-sci-water', title: 'Heating water', body: [
    'A student heated a pot of water and recorded its temperature every two minutes.',
    '0 min: 20 °C · 2 min: 35 °C · 4 min: 50 °C · 6 min: 65 °C',
  ] },
  { id: 'b-sci-salt', title: 'Thida’s experiment', body: [
    'Thida wants to know whether salt water freezes more slowly than fresh water. She puts 200 mL of fresh water in one cup and 200 mL of salt water in an identical cup. She places both cups in the same freezer and checks them every 15 minutes.',
  ] },
  { id: 'b-ss-federalism', title: 'Federalism', body: [
    'Under federalism, power is divided between the national government and the state governments. The national government prints money, makes treaties with other countries and controls the military.',
    'State governments run public schools, issue driving licences and organise elections. Some powers, such as collecting taxes and building roads, are shared by both levels of government.',
  ] },

  { id: 'c-rla-rain', title: 'The rainy afternoon', body: [
    'Mi Chan wanted to play outside, but heavy rain was falling. Her grandmother gave her an old box of photographs. Together they looked at pictures of the village where her grandmother grew up: a wooden school, a river and a big tamarind tree.',
    'Mi Chan asked many questions, and her grandmother told stories for the whole afternoon. When the rain stopped, Mi Chan did not want to go outside anymore. She wanted to hear more stories.',
  ] },
  { id: 'c-rla-bus', title: 'The library on wheels', body: [
    'In many villages, children have few books at home. One teacher decided to solve this problem with an old bus. She removed most of the seats, built shelves and filled them with donated books.',
    'Every Saturday, the bus visits a different village. Children can borrow two books each and return them the next week. At first, only a few children came.',
    'Now the bus is so busy that the teacher has asked volunteers to help. Some parents have even started reading with their children in the evenings.',
  ] },
  { id: 'c-rla-bags', title: 'Banning plastic bags', body: [
    'Several cities have banned single-use plastic bags. Supporters point out that plastic bags can take hundreds of years to break down and often end up in rivers and the sea, where they harm fish and turtles. After one city banned the bags, volunteers found about 40 percent fewer bags during beach clean-ups.',
    'Critics agree that pollution is a problem but question whether bans are the best solution. Shoppers often switch to thicker reusable bags, which need more energy to make. One government study estimated that a cotton bag must be used more than 100 times before its environmental impact is lower than that of a plastic bag.',
    'Critics suggest charging a small fee for each bag instead, so that people reuse bags without a complete ban.',
  ] },
  { id: 'c-sci-birds', title: 'Birds at the lake', body: [
    'A science club counted the birds at a lake every two months.',
    'January: 120 · March: 90 · May: 60 · July: 30',
  ] },
  { id: 'c-sci-light', title: 'Ko Min’s experiment', body: [
    'Ko Min wants to test whether the colour of light changes how fast plants grow. He grows three groups of the same kind of seedling under red, blue and white light. All plants get the same amount of water and the same soil, and they are kept in the same room. After three weeks, he measures their height.',
  ] },
  { id: 'c-ss-rights', title: 'The Bill of Rights', body: [
    'The Bill of Rights is the first ten amendments to the United States Constitution. The First Amendment protects freedom of religion, speech and the press. It also protects the right of people to gather peacefully and to ask the government to fix problems.',
    'The Fourth Amendment protects people from unreasonable searches of their homes and belongings.',
  ] },
];

type Item = [band: PlacementBand, skill: string, prompt: string, options: string[], answer: number, passageId?: string];

const bandCode: Record<PlacementBand, string> = { FOUNDATION: 'f', PRE_GED: 'p', GED: 'g' };
const sectionCode: Record<PlacementSectionId, string> = { RLA: 'rla', MATH: 'math', SCIENCE: 'sci', SOCIAL_STUDIES: 'ss' };

function build(form: PlacementForm, section: PlacementSectionId, items: Item[]): PlacementQuestion[] {
  const counters: Record<string, number> = {};
  return items.map(([band, skill, prompt, options, answer, passageId]) => {
    counters[band] = (counters[band] ?? 0) + 1;
    return { id: `${form.toLowerCase()}-${sectionCode[section]}-${bandCode[band]}${counters[band]}`, form, section, band, skill, prompt, options, answer, ...(passageId ? { passageId } : {}) };
  });
}

const FORM_A: PlacementQuestion[] = [
  ...build('A', 'RLA', [
    ['FOUNDATION', 'Literal detail', 'What does Aye Aye do before the market opens?', ['She cooks fried bananas.', 'She counts the cups and cleans the table.', 'She buys a bicycle.', 'She sells sweet tea to her uncle.'], 1, 'a-rla-market'],
    ['FOUNDATION', 'Cause and effect', 'Why do they cook less food when it rains?', ['The stove does not work in the rain.', 'Fewer people come to the market.', 'Aye Aye is too tired.', 'The bananas get wet.'], 1, 'a-rla-market'],
    ['FOUNDATION', 'Character feelings', 'How does Aye Aye feel at the end of the night?', ['Angry and bored', 'Tired but proud', 'Scared and lonely', 'Sad because she lost money'], 1, 'a-rla-market'],
    ['FOUNDATION', 'Verb tense', 'Choose the word that completes the sentence.\n“Yesterday, we ___ to the market.”', ['go', 'goes', 'went', 'going'], 2],
    ['FOUNDATION', 'Capital letters', 'Which sentence uses capital letters correctly?', ['we live in kuala lumpur.', 'We live in Kuala Lumpur.', 'We Live in kuala Lumpur.', 'we live in Kuala lumpur.'], 1],
    ['PRE_GED', 'Main idea', 'What is the main idea of the passage?', ['Rainwater is useful for plants.', 'The garden gave families food and also brought neighbours together.', 'Children should water plants after school.', 'Parking areas are too small for cars.'], 1, 'a-rla-garden'],
    ['PRE_GED', 'Word meaning from context', 'In paragraph 1, the word “doubted” most nearly means', ['believed strongly', 'were not sure about', 'paid for', 'forgot about'], 1, 'a-rla-garden'],
    ['PRE_GED', 'Supporting detail', 'Which detail shows how the volunteers solved the water problem?', ['They collected rainwater in old barrels.', 'The garden produced chillies.', 'Neighbours meet there every evening.', 'The apartment block is small.'], 0, 'a-rla-garden'],
    ['PRE_GED', 'Inference', 'What can you infer about the neighbours before the garden was built?', ['They grew vegetables together.', 'Many of them did not know each other well.', 'They were all farmers.', 'They wanted to build a new parking area.'], 1, 'a-rla-garden'],
    ['PRE_GED', 'Punctuation', 'Which sentence is punctuated correctly?', ['After school the children water the plants, they enjoy it.', 'After school, the children water the plants; they enjoy it.', 'After school the children, water the plants they enjoy it.', 'After, school the children water the plants. they enjoy it.'], 1],
    ['GED', 'Evaluating evidence', 'What is the critics’ main concern about the district study?', ['It proves that phone bans work.', 'It may not show that the ban alone caused the higher scores.', 'It only measured mathematics.', 'It shows that phones improve reading scores.'], 1, 'a-rla-phones'],
    ['GED', 'Author’s purpose', 'What is the main purpose of this passage?', ['To tell a story about one student', 'To present arguments on more than one side of an issue', 'To persuade families to buy phones', 'To explain how mobile phones work'], 1, 'a-rla-phones'],
    ['GED', 'Strengthening an argument', 'Which new evidence would most strengthen the supporters’ argument?', ['A survey showing that most students like their phones', 'A study of schools that banned phones, changed nothing else, and saw scores rise', 'A report that phones are becoming more expensive', 'A list of popular apps used by students'], 1, 'a-rla-phones'],
    ['GED', 'Fact and opinion', 'Which sentence states an opinion rather than a fact?', ['Some schools ban mobile phones during the school day.', 'One district reported slightly higher reading scores at schools with a ban.', 'A better policy would teach students to use phones responsibly.', 'Those schools hired more teachers at the same time.'], 2, 'a-rla-phones'],
    ['GED', 'Subject-verb agreement', 'Which sentence is written correctly?', ['Each of the students have brought their lunch.', 'Each of the students has brought their lunch.', 'Each of the student has brought their lunch.', 'Each of the students having brought their lunch.'], 1],
  ]),
  ...build('A', 'MATH', [
    ['FOUNDATION', 'Subtraction', '1,205 − 487 = ?', ['728', '718', '822', '1,692'], 1],
    ['FOUNDATION', 'Multiplication', 'A bus has 14 rows. Each row has 4 seats. How many seats are on the bus?', ['18', '52', '56', '64'], 2],
    ['FOUNDATION', 'Comparing fractions', 'Which fraction is the largest?', ['1/2', '2/5', '3/4', '2/3'], 2],
    ['FOUNDATION', 'Money and decimals', 'Rice costs RM 7.50 and oil costs RM 4.80. You pay with RM 20. How much change do you get?', ['RM 7.70', 'RM 8.30', 'RM 12.30', 'RM 7.30'], 0],
    ['FOUNDATION', 'Division', '96 students are put into groups of 8. How many groups are there?', ['11', '12', '88', '104'], 1],
    ['PRE_GED', 'Percent', 'What is 15% of 60?', ['6', '9', '15', '45'], 1],
    ['PRE_GED', 'Linear equation', 'If 2x + 5 = 17, what is x?', ['6', '11', '8.5', '12'], 0],
    ['PRE_GED', 'Area of a triangle', 'A triangle has a base of 10 cm and a height of 6 cm. What is its area?', ['16 cm²', '30 cm²', '60 cm²', '32 cm²'], 1],
    ['PRE_GED', 'Integers', '−7 + 3 − (−5) = ?', ['−9', '1', '−15', '15'], 1],
    ['PRE_GED', 'Proportion', 'A recipe uses 3 cups of rice for 4 people. How many cups are needed for 12 people?', ['7', '9', '12', '16'], 1],
    ['GED', 'Equation with variables on both sides', 'Solve for x: 3x − 5 = 2x + 9', ['x = 4', 'x = 14', 'x = 2.8', 'x = −14'], 1],
    ['GED', 'Slope', 'What is the slope of the line through (−1, 4) and (3, −4)?', ['2', '−2', '−1/2', '1/2'], 1],
    ['GED', 'Percent change', 'A shirt costs RM 40 after a 20% discount. What was the original price?', ['RM 32', 'RM 48', 'RM 50', 'RM 60'], 2],
    ['GED', 'Evaluating expressions', 'What is the value of 2x² − 3x when x = −2?', ['−2', '2', '14', '−14'], 2],
    ['GED', 'Probability', 'A bag holds 3 red, 5 blue and 2 green marbles. One marble is taken without looking. What is the probability that it is not blue?', ['1/2', '1/5', '3/10', '2/5'], 0],
  ]),
  ...build('A', 'SCIENCE', [
    ['FOUNDATION', 'Living things', 'Which of these is NOT a living thing?', ['A mushroom', 'Coral', 'A cloud', 'Moss'], 2],
    ['FOUNDATION', 'States of matter', 'When water is heated until it boils, it changes into', ['ice', 'steam (water vapour)', 'salt', 'sand'], 1],
    ['FOUNDATION', 'Plant parts', 'Which part of a plant takes in water from the soil?', ['The flower', 'The leaf', 'The root', 'The seed'], 2],
    ['PRE_GED', 'Reading data', 'Between which two weeks did the plant grow the most?', ['Week 1 and Week 2', 'Week 2 and Week 3', 'Week 3 and Week 4', 'It grew the same amount each week.'], 2, 'a-sci-plant'],
    ['PRE_GED', 'Chemical change', 'Which is an example of a chemical change?', ['Ice melting', 'Paper being cut', 'Wood burning', 'Water freezing'], 2],
    ['PRE_GED', 'Photosynthesis', 'Which gas do plants take in from the air to make food?', ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Hydrogen'], 1],
    ['GED', 'Controlled experiment', 'To make this a fair test, what should be different between the two groups of plants?', ['The amount of water', 'Only whether they get fertilizer', 'The type of soil', 'The amount of sunlight'], 1, 'a-sci-beans'],
    ['GED', 'Variables', 'In Aung’s experiment, the height of the plants is the', ['independent variable', 'dependent variable', 'control group', 'hypothesis'], 1, 'a-sci-beans'],
    ['GED', 'Food chains', 'In this food chain: grass → grasshopper → frog → snake. If many frogs die from a disease, what will most likely happen next?', ['Grasshoppers increase and snakes decrease.', 'Grasshoppers decrease and snakes increase.', 'Grasshoppers and snakes both increase.', 'Nothing changes.'], 0],
    ['GED', 'Genetics', 'In pea plants, tall (T) is dominant over short (t). Two Tt plants are crossed. What fraction of the offspring are expected to be short?', ['0', '1/4', '1/2', '3/4'], 1],
  ]),
  ...build('A', 'SOCIAL_STUDIES', [
    ['FOUNDATION', 'Map skills', 'On most maps, north is at the', ['bottom', 'top', 'left', 'right'], 1],
    ['FOUNDATION', 'Laws and rules', 'A rule made by a government that everyone must follow is called a', ['law', 'hobby', 'holiday', 'market'], 0],
    ['FOUNDATION', 'Geography', 'Kuala Lumpur is the capital city of which country?', ['Thailand', 'Myanmar', 'Malaysia', 'Singapore'], 2],
    ['PRE_GED', 'Supply and demand', 'Many people want to buy a product, but there is only a little of it. What usually happens to the price?', ['It goes up.', 'It goes down.', 'It stays the same.', 'It becomes free.'], 0],
    ['PRE_GED', 'Timelines', 'A timeline shows: 1914 – World War I begins. 1939 – World War II begins. 1945 – the United Nations is founded. How many years after World War I began was the United Nations founded?', ['6 years', '25 years', '31 years', '45 years'], 2],
    ['PRE_GED', 'Democracy', 'In a democracy, leaders are usually chosen by', ['the army', 'the richest family', 'citizens voting in elections', 'leaders of other countries'], 2],
    ['GED', 'Checks and balances', 'This system is designed mainly to', ['give the President full control', 'stop any one branch from becoming too powerful', 'make laws pass more quickly', 'let the courts write laws'], 1, 'a-ss-branches'],
    ['GED', 'Applying a concept', 'Which is an example of a check on the President’s power?', ['The President signs a law.', 'Congress overrides a veto.', 'The courts hear a case.', 'Citizens read the news.'], 1, 'a-ss-branches'],
    ['GED', 'Economic reasoning', 'In one country, unemployment fell from 8% to 5% while prices rose quickly. Which conclusion is best supported?', ['More people had jobs, but goods became more expensive.', 'Fewer people had jobs, and goods became cheaper.', 'Prices fell because more people had jobs.', 'The government stopped collecting taxes.'], 0],
    ['GED', 'Percent change in data', 'A town had 25,000 people in 2010 and 35,000 people in 2020. By what percent did the population increase?', ['10%', '28.6%', '40%', '75%'], 2],
  ]),
];

const FORM_B: PlacementQuestion[] = [
  ...build('B', 'RLA', [
    ['FOUNDATION', 'Literal detail', 'What happened in the first half of the match?', ['Nai Soe scored three goals.', 'Nai Soe’s team was losing by two goals.', 'The coach left the game.', 'The other team stopped playing.'], 1, 'b-rla-football'],
    ['FOUNDATION', 'Cause and effect', 'Why did Nai Soe’s team score in the second half?', ['The other team was tired.', 'The players passed the ball and worked together.', 'It started to rain.', 'Nai Soe ran alone with the ball.'], 1, 'b-rla-football'],
    ['FOUNDATION', 'Character feelings', 'What did Nai Soe learn from the match?', ['Winning is the only thing that matters.', 'Teamwork matters more than one strong player.', 'Football is too difficult.', 'Coaches should not talk at half time.'], 1, 'b-rla-football'],
    ['FOUNDATION', 'Verb tense', 'Choose the word that completes the sentence.\n“Last week, my sister ___ a letter to our grandmother.”', ['write', 'writes', 'wrote', 'writing'], 2],
    ['FOUNDATION', 'Spelling', 'Which word is spelled correctly?', ['familys', 'familyes', 'families', 'famillies'], 2],
    ['PRE_GED', 'Main idea', 'What is the main idea of the passage?', ['Phones are very hard to repair.', 'Through practice and patience, Hla Win learned a skill and built a business.', 'Life in the city is expensive.', 'Neighbours should share their tools.'], 1, 'b-rla-repair'],
    ['PRE_GED', 'Word meaning from context', 'In paragraph 1, the word “frustrated” most nearly means', ['made her feel annoyed and discouraged', 'made her rich', 'made her laugh', 'made her sleepy'], 0, 'b-rla-repair'],
    ['PRE_GED', 'Supporting detail', 'Which detail best shows that Hla Win did not give up?', ['She moved to the city.', 'Each evening she watched her neighbour and wrote notes.', 'She broke two old phones.', 'Customers asked for her by name.'], 1, 'b-rla-repair'],
    ['PRE_GED', 'Inference', 'Why does Hla Win say her notes are her most valuable tool?', ['They hold the knowledge she worked hard to learn.', 'They cost a lot of money.', 'Customers like to read them.', 'They are made of metal.'], 0, 'b-rla-repair'],
    ['PRE_GED', 'Commas in a series', 'Which sentence uses commas correctly?', ['We bought, rice beans and onions at the market.', 'We bought rice, beans, and onions at the market.', 'We bought rice beans, and, onions at the market.', 'We, bought rice, beans and onions at the market.'], 1],
    ['GED', 'Evaluating evidence', 'Which statement would the opponents most likely agree with?', ['A small budget saving is not worth a possible loss in learning.', 'Four-day weeks always improve mathematics scores.', 'Childcare on the fifth day costs families nothing.', 'Buses are the largest cost for every school.'], 0, 'b-rla-week'],
    ['GED', 'Author’s purpose', 'Why does the author include the study about mathematics gains?', ['To support the supporters’ view', 'To give evidence for the opponents’ view', 'To explain how school buses work', 'To describe the cost of childcare'], 1, 'b-rla-week'],
    ['GED', 'Strengthening an argument', 'Which information would best help a reader judge whether the savings are really “small”?', ['The number of buses in each district', 'The total budget in ringgit or dollars and what the savings could pay for', 'The colour of the school buses', 'A list of school holidays'], 1, 'b-rla-week'],
    ['GED', 'Fact and opinion', 'Which sentence states an opinion rather than a fact?', ['Some districts have moved to a four-day week.', 'A study found districts saved about 1 to 2 percent.', 'Schools should look for savings that do not reduce learning time.', 'Parents who work five days must arrange childcare on the fifth day.'], 2, 'b-rla-week'],
    ['GED', 'Misplaced modifiers', 'Which sentence is written correctly?', ['While walking to school, a snake was seen by Min on the road.', 'While walking to school, Min saw a snake on the road.', 'Walking to school, the snake was on the road.', 'While walking to school a snake, Min saw on the road.'], 1],
  ]),
  ...build('B', 'MATH', [
    ['FOUNDATION', 'Subtraction', '2,003 − 768 = ?', ['1,235', '1,345', '1,245', '2,771'], 0],
    ['FOUNDATION', 'Multiplication', 'A school orders 23 boxes of pencils. Each box has 12 pencils. How many pencils are there?', ['35', '266', '276', '286'], 2],
    ['FOUNDATION', 'Comparing fractions', 'Which fraction is the smallest?', ['1/2', '3/8', '2/5', '5/12'], 1],
    ['FOUNDATION', 'Money and decimals', 'A notebook costs RM 3.25. How much do 4 notebooks cost?', ['RM 12.25', 'RM 13.00', 'RM 12.80', 'RM 7.25'], 1],
    ['FOUNDATION', 'Division', '150 chairs are placed in rows of 12. How many full rows can be made?', ['12', '13', '138', '162'], 0],
    ['PRE_GED', 'Percent', 'What is 35% of 200?', ['35', '70', '165', '7'], 1],
    ['PRE_GED', 'Linear equation', 'If 4x − 7 = 21, what is x?', ['3.5', '7', '14', '112'], 1],
    ['PRE_GED', 'Area of a triangle', 'A triangle has a base of 8 m and a height of 7 m. What is its area?', ['15 m²', '28 m²', '56 m²', '30 m²'], 1],
    ['PRE_GED', 'Integers', '−12 ÷ 3 + 6 = ?', ['−10', '2', '−2', '10'], 1],
    ['PRE_GED', 'Proportion', 'On a map, 2 cm stands for 5 km. Two towns are 8 cm apart on the map. How far apart are they in real life?', ['13 km', '16 km', '20 km', '40 km'], 2],
    ['GED', 'Equation with variables on both sides', 'Solve for x: 5x + 4 = 2x − 11', ['x = 5', 'x = −5', 'x = −7/3', 'x = 15'], 1],
    ['GED', 'Slope', 'What is the slope of the line through (−2, 5) and (4, −1)?', ['1', '−1', '−6', '6'], 1],
    ['GED', 'Percent change', 'After a 25% price increase, a fan costs RM 150. What was the price before the increase?', ['RM 112.50', 'RM 120', 'RM 125', 'RM 187.50'], 1],
    ['GED', 'Evaluating expressions', 'What is the value of 3x² + 2x when x = −3?', ['−33', '21', '33', '−21'], 1],
    ['GED', 'Probability', 'A fair number cube with sides 1 to 6 is rolled once. What is the probability of rolling a number greater than 4?', ['1/6', '1/3', '1/2', '2/3'], 1],
  ]),
  ...build('B', 'SCIENCE', [
    ['FOUNDATION', 'Living things', 'Which of these is NOT a living thing?', ['A mushroom', 'A fish', 'A plastic bottle', 'A tree'], 2],
    ['FOUNDATION', 'States of matter', 'When liquid water is cooled below 0 °C, it becomes', ['ice', 'steam', 'salt', 'air'], 0],
    ['FOUNDATION', 'Human body', 'Which organ pumps blood around the body?', ['The lungs', 'The heart', 'The stomach', 'The brain'], 1],
    ['PRE_GED', 'Reading data', 'If the pattern continues, what will the temperature most likely be at 8 minutes?', ['70 °C', '75 °C', '80 °C', '95 °C'], 2, 'b-sci-water'],
    ['PRE_GED', 'Physical change', 'Which is an example of a physical change?', ['Iron rusting', 'Bread baking', 'Sugar dissolving in water', 'Food rotting'], 2],
    ['PRE_GED', 'Respiration', 'Which gas do people need to breathe in to stay alive?', ['Carbon dioxide', 'Oxygen', 'Helium', 'Nitrogen'], 1],
    ['GED', 'Controlled experiment', 'Why does Thida use the same amount of water and identical cups?', ['So that only one thing is different between the cups', 'So that the cups look the same', 'To save water', 'Because the freezer is small'], 0, 'b-sci-salt'],
    ['GED', 'Variables', 'In Thida’s experiment, the independent variable is', ['the time the water takes to freeze', 'whether the water has salt in it', 'the temperature of the freezer', 'the size of the cups'], 1, 'b-sci-salt'],
    ['GED', 'Ecosystems', 'In a pond, fish eat insects and insects eat algae. Fertilizer from farms makes the algae grow very fast. What will most likely happen first?', ['The number of insects increases.', 'The number of fish decreases.', 'The algae disappear.', 'The number of insects decreases.'], 0],
    ['GED', 'Genetics', 'Brown eyes (B) are dominant over blue eyes (b). One parent is Bb and the other is bb. What is the probability that a child will have blue eyes?', ['0', '1/4', '1/2', '3/4'], 2],
  ]),
  ...build('B', 'SOCIAL_STUDIES', [
    ['FOUNDATION', 'Map skills', 'The sun rises in the east. If you walk toward the rising sun, which direction are you going?', ['West', 'East', 'North', 'South'], 1],
    ['FOUNDATION', 'Government', 'The group of people who make a country’s laws is often called the', ['market', 'parliament', 'hospital', 'police station'], 1],
    ['FOUNDATION', 'Geography', 'Which country shares a border with Myanmar?', ['Australia', 'Japan', 'Thailand', 'Brazil'], 2],
    ['PRE_GED', 'Supply and demand', 'A factory finds a way to make the same product for much less money. What will most likely happen to the product’s price over time?', ['It will go down.', 'It will go up.', 'It will stay exactly the same.', 'It will become free.'], 0],
    ['PRE_GED', 'Timelines', 'A timeline shows: 1945 – World War II ends. 1957 – Malaya becomes independent. 1963 – Malaysia is formed. How many years passed between the end of World War II and the formation of Malaysia?', ['6 years', '12 years', '18 years', '20 years'], 2],
    ['PRE_GED', 'Rights', 'Freedom of speech means that people can', ['share their opinions without being punished by the government', 'say anything without any limits at all', 'vote more than once', 'choose not to pay taxes'], 0],
    ['GED', 'Federalism', 'According to the passage, which power belongs to state governments?', ['Printing money', 'Making treaties', 'Issuing driving licences', 'Controlling the military'], 2, 'b-ss-federalism'],
    ['GED', 'Applying a concept', 'Why would the national government, not the states, make treaties with other countries?', ['So the country speaks with one voice to other nations', 'So each state can choose its own enemies', 'Because states run the schools', 'Because treaties are about driving licences'], 0, 'b-ss-federalism'],
    ['GED', 'Economic reasoning', 'A government raises the tax on imported cars. Which result is most likely?', ['Imported cars become more expensive, and more people buy locally made cars.', 'Imported cars become cheaper.', 'Fewer people buy locally made cars.', 'The price of all cars falls to zero.'], 0],
    ['GED', 'Percent change in data', 'A country’s exports were worth RM 80 billion in 2015 and RM 100 billion in 2020. By what percent did exports increase?', ['20%', '25%', '80%', '125%'], 1],
  ]),
];

const FORM_C: PlacementQuestion[] = [
  ...build('C', 'RLA', [
    ['FOUNDATION', 'Literal detail', 'Why could Mi Chan not play outside?', ['She was sick.', 'Heavy rain was falling.', 'Her grandmother said no.', 'It was night.'], 1, 'c-rla-rain'],
    ['FOUNDATION', 'Literal detail', 'What did the photographs show?', ['Mi Chan’s new school', 'The village where her grandmother grew up', 'A big city', 'Mi Chan’s birthday'], 1, 'c-rla-rain'],
    ['FOUNDATION', 'Character feelings', 'Why did Mi Chan not want to go outside when the rain stopped?', ['She was afraid of the river.', 'She enjoyed her grandmother’s stories.', 'She was too tired to walk.', 'Her friends had gone home.'], 1, 'c-rla-rain'],
    ['FOUNDATION', 'Verb tense', 'Choose the words that complete the sentence.\n“Tomorrow, our class ___ a test.”', ['had', 'will have', 'having', 'has had'], 1],
    ['FOUNDATION', 'Complete sentences', 'Which of these is a complete sentence?', ['Because the students were tired.', 'Running to the bus stop.', 'The students finished their homework.', 'After the long day at school.'], 2],
    ['PRE_GED', 'Main idea', 'What is the main idea of the passage?', ['Old buses are dangerous.', 'A teacher’s library bus has helped children and families read more.', 'Children should buy more books.', 'Volunteers like to drive buses.'], 1, 'c-rla-bus'],
    ['PRE_GED', 'Word meaning from context', 'In paragraph 1, the word “donated” most nearly means', ['sold', 'given for free', 'borrowed', 'lost'], 1, 'c-rla-bus'],
    ['PRE_GED', 'Supporting detail', 'Which detail best shows that the library bus became popular?', ['The teacher removed most of the seats.', 'Children can borrow two books each.', 'The teacher asked volunteers to help because the bus is so busy.', 'The bus visits a different village each week.'], 2, 'c-rla-bus'],
    ['PRE_GED', 'Inference', 'What can you infer about the villages the bus visits?', ['They have large libraries.', 'They probably do not have a library nearby.', 'Every family owns many books.', 'The children do not like reading.'], 1, 'c-rla-bus'],
    ['PRE_GED', 'Apostrophes', 'Which sentence is written correctly?', ['The childrens’ books are on the top shelf.', 'The childrens books are on the top shelf.', 'The children’s books are on the top shelf.', 'The children’s book’s are on the top shelf.'], 2],
    ['GED', 'Evaluating evidence', 'Which piece of evidence do supporters of the ban use?', ['Cotton bags must be used more than 100 times.', 'Volunteers found about 40 percent fewer bags after one city’s ban.', 'Reusable bags need more energy to make.', 'A small fee could be charged for each bag.'], 1, 'c-rla-bags'],
    ['GED', 'Comparing viewpoints', 'How does the critics’ view differ from the supporters’ view?', ['Critics think plastic pollution is not a problem.', 'Critics agree pollution is a problem but think a fee may work better than a ban.', 'Critics want to ban all reusable bags.', 'Critics think turtles are not harmed by plastic.'], 1, 'c-rla-bags'],
    ['GED', 'Weakening an argument', 'Which finding would most weaken the critics’ argument?', ['A study showing that most shoppers use each reusable bag hundreds of times', 'A report that cotton is grown in many countries', 'A survey showing people like the colour of plastic bags', 'A study showing that beach clean-ups are popular'], 0, 'c-rla-bags'],
    ['GED', 'Text structure', 'How is the passage organised?', ['It tells events in the order they happened.', 'It presents one side of an issue and then the other side.', 'It describes one problem and only one solution.', 'It compares two different cities.'], 1, 'c-rla-bags'],
    ['GED', 'Parallel structure', 'Which sentence is written correctly?', ['On weekends, she likes to read, swimming, and to cook.', 'On weekends, she likes reading, swimming, and cooking.', 'On weekends, she likes reading, to swim, and cooks.', 'On weekends, she likes read, swimming, and cook.'], 1],
  ]),
  ...build('C', 'MATH', [
    ['FOUNDATION', 'Subtraction', '3,050 − 1,276 = ?', ['1,774', '1,884', '2,226', '1,874'], 0],
    ['FOUNDATION', 'Multiplication', 'A shop sells 18 bags of rice each day. How many bags does it sell in 15 days?', ['33', '260', '270', '280'], 2],
    ['FOUNDATION', 'Equivalent fractions', 'Which fraction is equal to 3/4?', ['6/8', '4/6', '3/8', '9/16'], 0],
    ['FOUNDATION', 'Money and decimals', 'You buy 3 drinks for RM 2.40 each and pay with RM 10. How much change do you get?', ['RM 2.80', 'RM 3.20', 'RM 7.20', 'RM 7.60'], 0],
    ['FOUNDATION', 'Division', 'A rope 84 m long is cut into pieces 7 m long. How many pieces are there?', ['11', '12', '77', '91'], 1],
    ['PRE_GED', 'Percent', 'What is 40% of 45?', ['4.5', '18', '27', '40'], 1],
    ['PRE_GED', 'Linear equation', 'If 3x + 8 = 29, what is x?', ['7', '37/3', '9', '21'], 0],
    ['PRE_GED', 'Area of a triangle', 'A triangle has a base of 12 cm and a height of 5 cm. What is its area?', ['17 cm²', '30 cm²', '60 cm²', '34 cm²'], 1],
    ['PRE_GED', 'Integers', '5 − 9 + (−4) = ?', ['0', '−8', '8', '−18'], 1],
    ['PRE_GED', 'Proportion', '5 notebooks cost RM 12. How much do 15 notebooks cost?', ['RM 24', 'RM 36', 'RM 60', 'RM 27'], 1],
    ['GED', 'Equation with variables on both sides', 'Solve for x: 7x − 3 = 4x + 12', ['x = 5', 'x = 3', 'x = 9/11', 'x = 15'], 0],
    ['GED', 'Slope', 'What is the slope of the line through (0, −3) and (4, 5)?', ['2', '1/2', '−2', '8'], 0],
    ['GED', 'Percent change', 'A phone costs RM 360 after a 10% discount. What was the original price?', ['RM 324', 'RM 370', 'RM 396', 'RM 400'], 3],
    ['GED', 'Evaluating expressions', 'What is the value of x² − 4x + 1 when x = −1?', ['−4', '−2', '6', '2'], 2],
    ['GED', 'Probability', 'A class has 12 boys and 18 girls. One student is chosen at random. What is the probability that the student is a boy?', ['2/3', '2/5', '3/5', '1/12'], 1],
  ]),
  ...build('C', 'SCIENCE', [
    ['FOUNDATION', 'Living things', 'Which of these needs food and water to grow?', ['A rock', 'A puppy', 'A chair', 'A cloud'], 1],
    ['FOUNDATION', 'States of matter', 'On a hot day, the water on a wet road disappears. Where does it go?', ['It evaporates into the air.', 'It turns into ice.', 'It becomes salt.', 'It turns into sand.'], 0],
    ['FOUNDATION', 'Plant parts', 'Which part of a plant usually makes seeds?', ['The root', 'The stem', 'The flower', 'The leaf'], 2],
    ['PRE_GED', 'Reading data', 'If the pattern continues, how many birds will most likely be counted in September?', ['0', '15', '30', '60'], 0, 'c-sci-birds'],
    ['PRE_GED', 'Chemical change', 'Which is an example of a chemical change?', ['An ice cube melting', 'A glass breaking', 'An iron nail rusting', 'Salt dissolving in water'], 2],
    ['PRE_GED', 'Photosynthesis', 'Which gas do plants give off during photosynthesis?', ['Carbon dioxide', 'Oxygen', 'Smoke', 'Helium'], 1],
    ['GED', 'Controlled experiment', 'Which of these is kept the same for all three groups of plants?', ['The amount of water', 'The colour of the light', 'The height of the plants', 'The result of the experiment'], 0, 'c-sci-light'],
    ['GED', 'Variables', 'In Ko Min’s experiment, the dependent variable is', ['the colour of the light', 'the type of soil', 'the height of the plants', 'the room'], 2, 'c-sci-light'],
    ['GED', 'Ecosystems', 'On an island, foxes eat rabbits and rabbits eat grass. Hunters remove most of the foxes. What will most likely happen over the next few years?', ['Rabbits increase, then the amount of grass decreases.', 'Rabbits decrease, then grass decreases.', 'Grass increases and rabbits decrease.', 'Nothing changes.'], 0],
    ['GED', 'Genetics', 'Smooth seeds (S) are dominant over wrinkled seeds (s). A plant that is SS is crossed with a plant that is ss. What percent of the offspring will have smooth seeds?', ['0%', '25%', '50%', '100%'], 3],
  ]),
  ...build('C', 'SOCIAL_STUDIES', [
    ['FOUNDATION', 'Map skills', 'What is the key (legend) on a map used for?', ['To show what the symbols on the map mean', 'To lock the map', 'To show the date the map was made', 'To show the price of the map'], 0],
    ['FOUNDATION', 'Government', 'The person chosen to lead a city or town is often called the', ['judge', 'mayor', 'soldier', 'farmer'], 1],
    ['FOUNDATION', 'Geography', 'Which ocean lies to the west of Myanmar and Malaysia?', ['The Atlantic Ocean', 'The Arctic Ocean', 'The Indian Ocean', 'The Southern Ocean'], 2],
    ['PRE_GED', 'Supply and demand', 'A drought destroys half of a country’s rice crop. What will most likely happen to the price of rice?', ['It will rise.', 'It will fall.', 'It will stay the same.', 'Rice will become free.'], 0],
    ['PRE_GED', 'Timelines', 'A timeline shows: 1914 – World War I begins. 1918 – World War I ends. 1939 – World War II begins. How many years passed between the end of World War I and the start of World War II?', ['4 years', '21 years', '25 years', '29 years'], 1],
    ['PRE_GED', 'Citizenship', 'Which of these is a responsibility of citizens in a democracy?', ['Obeying laws and voting in elections', 'Choosing the army’s leaders by themselves', 'Printing their own money', 'Ignoring the courts'], 0],
    ['GED', 'Applying a concept', 'Which action is protected by the First Amendment?', ['A group holds a peaceful protest outside city hall.', 'Police search a home without a good reason.', 'A citizen refuses to pay taxes.', 'A company sells unsafe food.'], 0, 'c-ss-rights'],
    ['GED', 'Purpose of rights', 'Why would the writers of the Constitution protect freedom of the press?', ['So citizens can learn about and question the government', 'So newspapers can avoid paying taxes', 'So the government can control the news', 'So only leaders can publish information'], 0, 'c-ss-rights'],
    ['GED', 'Economic reasoning', 'Prices rise by 10% in one year, but a worker’s pay rises by only 4%. What happens to how much the worker can buy?', ['It decreases.', 'It increases.', 'It stays the same.', 'It doubles.'], 0],
    ['GED', 'Percent change in data', 'A city had 50,000 people in 2010 and 40,000 people in 2020. What was the percent change?', ['A decrease of 10%', 'A decrease of 20%', 'A decrease of 25%', 'An increase of 20%'], 1],
  ]),
];

export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [...FORM_A, ...FORM_B, ...FORM_C];

export function formQuestions(form: PlacementForm) {
  return PLACEMENT_QUESTIONS.filter(q => q.form === form);
}

export function isPlacementForm(value: unknown): value is PlacementForm {
  return typeof value === 'string' && (PLACEMENT_FORMS as readonly string[]).includes(value);
}

export const PLACEMENT_WRITING_PROMPT = {
  title: 'Short writing',
  prompt: 'Write 6 to 10 sentences in English. Tell us about your school life so far, what is difficult for you in learning, and why you want to study at MRLC.',
  help: 'Do your best. Teachers read this to understand your English writing. Spelling mistakes are okay.',
  maxLength: 3000,
};

const BAND_MASTERY: Record<PlacementBand, number> = { FOUNDATION: 0.6, PRE_GED: 0.6, GED: 0.6 };

const LEVEL_RANK: Record<PlacementLevel, number> = { BELOW_PRE_GED: 0, PRE_GED: 1, GED: 2 };

export interface BandScore { band: PlacementBand; correct: number; total: number; mastered: boolean }

export interface SectionScore {
  section: PlacementSectionId;
  correct: number;
  total: number;
  answered: number;
  bands: BandScore[];
  level: PlacementLevel;
}

export interface PlacementResult {
  version: string;
  form: PlacementForm;
  totalCorrect: number;
  totalQuestions: number;
  answered: number;
  sections: SectionScore[];
  recommendedLevel: PlacementLevel;
  flags: string[];
}

export const PLACEMENT_FLAG_LABELS: Record<string, string> = {
  MANY_UNANSWERED: 'Eight or more questions were left blank',
  VERY_FAST: 'Finished in under 20 minutes',
  OVER_TIME: 'Sent after the 90-minute limit',
  SHORT_WRITING: 'Writing sample is under 30 words',
  UNEVEN_CORE: 'Reading and Math levels are two steps apart',
  HARD_WITHOUT_EASY: 'Higher-level answers are stronger than foundation answers in a section',
  SCHOOLING_MISMATCH: 'Result is far from the schooling the applicant reported',
  REPEAT_ATTEMPT: 'This phone or email has taken the test before',
};

function seededOrder(seedText: string, length: number) {
  let seed = 2166136261;
  for (const char of seedText) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  const next = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function displayOrder(question: PlacementQuestion) {
  return seededOrder(`${PLACEMENT_TEST_VERSION}:${question.id}`, question.options.length);
}

export function placementOverview() {
  const sample = formQuestions('A');
  return {
    version: PLACEMENT_TEST_VERSION,
    timeLimitMinutes: PLACEMENT_TIME_LIMIT_SECONDS / 60,
    questionCount: sample.length,
    sections: PLACEMENT_SECTIONS.map(section => ({ ...section, questionCount: sample.filter(q => q.section === section.id).length })),
    highestGradeOptions: HIGHEST_GRADE_OPTIONS,
  };
}

export function publicPlacementForm(form: PlacementForm) {
  const questions = formQuestions(form);
  const passageIds = new Set(questions.map(q => q.passageId).filter(Boolean));
  return {
    version: PLACEMENT_TEST_VERSION,
    form,
    timeLimitSeconds: PLACEMENT_TIME_LIMIT_SECONDS,
    sections: PLACEMENT_SECTIONS.map(section => ({
      ...section,
      questions: questions.filter(q => q.section === section.id).map(question => ({
        id: question.id,
        passageId: question.passageId,
        prompt: question.prompt,
        options: displayOrder(question).map(value => ({ value, label: question.options[value] })),
      })),
    })),
    passages: PLACEMENT_PASSAGES.filter(p => passageIds.has(p.id)),
    writing: PLACEMENT_WRITING_PROMPT,
  };
}

export function chooseForm(previous: string[], random: () => number = Math.random): PlacementForm {
  const used = previous.filter(isPlacementForm);
  const unused = PLACEMENT_FORMS.filter(form => !used.includes(form));
  if (unused.length) return unused[Math.floor(random() * unused.length)];
  const lastSeen = (form: PlacementForm) => used.lastIndexOf(form);
  return [...PLACEMENT_FORMS].sort((a, b) => lastSeen(a) - lastSeen(b))[0];
}

export function sanitizePlacementAnswers(input: unknown, form: PlacementForm): Record<string, number> {
  const output: Record<string, number> = {};
  if (!input || typeof input !== 'object') return output;
  for (const question of formQuestions(form)) {
    const value = (input as Record<string, unknown>)[question.id];
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < question.options.length) output[question.id] = value;
  }
  return output;
}

export function countWords(text: string | null | undefined) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function sectionLevel(bands: BandScore[]): PlacementLevel {
  const mastered = (band: PlacementBand) => bands.find(b => b.band === band)?.mastered ?? false;
  if (!mastered('FOUNDATION')) return 'BELOW_PRE_GED';
  if (mastered('PRE_GED') && mastered('GED')) return 'GED';
  return 'PRE_GED';
}

const minLevel = (...levels: PlacementLevel[]) => levels.reduce((low, level) => LEVEL_RANK[level] < LEVEL_RANK[low] ? level : low);

export function scorePlacement(rawAnswers: unknown, context: { form: PlacementForm; writingSample?: string | null; durationSeconds?: number | null; highestGrade?: string | null; overTime?: boolean; repeatAttempt?: boolean }): PlacementResult {
  const questionsForForm = formQuestions(context.form);
  const answers = sanitizePlacementAnswers(rawAnswers, context.form);
  const sections: SectionScore[] = PLACEMENT_SECTIONS.map(section => {
    const questions = questionsForForm.filter(q => q.section === section.id);
    const bands = PLACEMENT_BANDS.map(band => {
      const inBand = questions.filter(q => q.band === band);
      const correct = inBand.filter(q => answers[q.id] === q.answer).length;
      return { band, correct, total: inBand.length, mastered: inBand.length > 0 && correct >= Math.ceil(inBand.length * BAND_MASTERY[band]) };
    });
    return {
      section: section.id,
      correct: bands.reduce((sum, b) => sum + b.correct, 0),
      total: questions.length,
      answered: questions.filter(q => answers[q.id] !== undefined).length,
      bands,
      level: sectionLevel(bands),
    };
  });
  const level = (id: PlacementSectionId) => sections.find(s => s.section === id)!.level;
  let recommendedLevel = minLevel(level('RLA'), level('MATH'));
  if (recommendedLevel === 'GED' && minLevel(level('SCIENCE'), level('SOCIAL_STUDIES')) === 'BELOW_PRE_GED') recommendedLevel = 'PRE_GED';

  const answered = Object.keys(answers).length;
  const flags: string[] = [];
  if (questionsForForm.length - answered >= 8) flags.push('MANY_UNANSWERED');
  if (typeof context.durationSeconds === 'number' && context.durationSeconds > 0 && context.durationSeconds < 20 * 60) flags.push('VERY_FAST');
  if (context.overTime) flags.push('OVER_TIME');
  if (countWords(context.writingSample) < 30) flags.push('SHORT_WRITING');
  if (Math.abs(LEVEL_RANK[level('RLA')] - LEVEL_RANK[level('MATH')]) === 2) flags.push('UNEVEN_CORE');
  if (sections.some(s => !s.bands[0].mastered && (s.bands[1].mastered || s.bands[2].mastered))) flags.push('HARD_WITHOUT_EASY');
  const reported = context.highestGrade;
  if ((reported === 'GRADE_11_PLUS' && recommendedLevel === 'BELOW_PRE_GED') || ((reported === 'NONE' || reported === 'GRADE_1_4') && recommendedLevel === 'GED')) flags.push('SCHOOLING_MISMATCH');
  if (context.repeatAttempt) flags.push('REPEAT_ATTEMPT');

  return {
    version: PLACEMENT_TEST_VERSION,
    form: context.form,
    totalCorrect: sections.reduce((sum, s) => sum + s.correct, 0),
    totalQuestions: questionsForForm.length,
    answered,
    sections,
    recommendedLevel,
    flags,
  };
}

export function placementReview(rawAnswers: unknown, form: PlacementForm) {
  const answers = sanitizePlacementAnswers(rawAnswers, form);
  return formQuestions(form).map(q => ({
    id: q.id,
    section: q.section,
    band: q.band,
    skill: q.skill,
    passageTitle: q.passageId ? PLACEMENT_PASSAGES.find(p => p.id === q.passageId)?.title ?? null : null,
    prompt: q.prompt,
    options: q.options,
    correctIndex: q.answer,
    chosenIndex: answers[q.id] ?? null,
    correct: answers[q.id] === q.answer,
  }));
}
