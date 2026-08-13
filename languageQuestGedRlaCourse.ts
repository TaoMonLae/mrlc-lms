import type { OfficialLanguageQuestChallenge, OfficialLanguageQuestCourse } from './languageQuestImportedCourses';

type SourceKind = 'informational' | 'literary' | 'argument' | 'editing';
type Question = [prompt: string, correct: string, distractors: [string, string, string], explanation: string];

interface LessonSeed {
  title: string;
  kind: SourceKind;
  summary: string;
  passage: string;
  instruction: string;
  terms: [[string, string], [string, string]];
  strategy: string;
  questions: [Question, Question, Question];
}

const PREFIX = 'RLA_V1::';

function concept(seed: LessonSeed): string {
  return PREFIX + JSON.stringify({
    version: 1,
    subject: 'rla',
    sourceType: seed.kind,
    summary: seed.summary,
    objectives: [
      `Apply ${seed.title.toLocaleLowerCase()} to a source`,
      'Select and explain relevant text evidence',
      'Eliminate answers that overstate or contradict the source',
    ],
    explanation: [seed.summary, seed.instruction],
    visual: {
      type: 'passage',
      title: `${seed.title}: guided source`,
      text: seed.passage,
      attribution: 'Original MRLC GED RLA practice source',
      kind: seed.kind,
    },
    keyTerms: seed.terms.map(([marker, text]) => ({ marker, text })),
    gedStrategy: seed.strategy,
    checkpoint: seed.questions[0][0],
  });
}

function challenges(seed: LessonSeed): OfficialLanguageQuestChallenge[] {
  return seed.questions.map(([prompt, correct, distractors, explanation], index) => {
    const options = [correct, ...distractors];
    const shift = index % options.length;
    return {
      type: 'SELECT',
      question: `${seed.passage}\n\n${prompt}`,
      explanation,
      hint: 'Return to the source. Identify the exact words or relationships that support one answer and rule out unsupported choices.',
      options: [...options.slice(shift), ...options.slice(0, shift)].map((text) => ({ text, correct: text === correct, emoji: null, audioText: null })),
    };
  });
}

function lesson(seed: LessonSeed) {
  return { title: seed.title, description: seed.summary, conceptIntro: concept(seed), challenges: challenges(seed) };
}

const informationalReading: LessonSeed[] = [
  {
    title: 'Explicit Details and Text Evidence', kind: 'informational',
    summary: 'Close reading begins with what a source states directly and the exact evidence that proves it.',
    passage: 'A neighborhood library extended its weekday closing time from 6:00 p.m. to 8:00 p.m. for a three-month trial. During the trial, evening visits rose by 38 percent, while daytime visits stayed nearly unchanged. The board will review staffing costs and visitor surveys before deciding whether to keep the schedule.',
    instruction: 'Separate stated facts from predictions. A correct evidence answer can be pointed to directly in the passage.',
    terms: [['explicit', 'stated directly in the source'], ['text evidence', 'specific source information supporting an answer']],
    strategy: 'Underline names, numbers, dates, and actions before interpreting why they matter.',
    questions: [
      ['Which detail is stated explicitly?', 'Evening visits rose by 38 percent during the trial.', ['The trial saved the library money.', 'Every visitor preferred the later hours.', 'The board permanently approved the schedule.'], 'The passage directly reports the 38 percent increase; the other claims are not stated.'],
      ['What will the board review?', 'Staffing costs and visitor surveys', ['Book prices and school grades', 'Only daytime attendance', 'A permanent closure plan'], 'The final sentence names both sources the board will review.'],
      ['Which claim is NOT supported?', 'The later schedule has already become permanent.', ['The trial lasted three months.', 'Daytime visits changed little.', 'The old weekday closing time was 6:00 p.m.'], 'The board has not yet decided whether to keep the schedule.'],
    ],
  },
  {
    title: 'Central Ideas', kind: 'informational',
    summary: 'A central idea captures the broad point that the source develops through its most important details.',
    passage: 'Cities often plant trees to cool streets, but planting alone is not enough. Young trees need suitable soil, regular watering, and protection from traffic damage. A city that counts only the number planted may miss whether those trees survive long enough to provide shade. Successful programs track survival and direct care toward neighborhoods with the greatest heat exposure.',
    instruction: 'Choose an idea broad enough to include most major details but narrow enough to remain faithful to the text.',
    terms: [['central idea', 'the main point developed by a source'], ['supporting detail', 'information that explains or proves the central idea']],
    strategy: 'Ask what the details have in common, then state that relationship in one sentence.',
    questions: [
      ['What is the central idea?', 'Tree programs succeed through long-term care and targeted planning, not planting totals alone.', ['Cities should remove all street trees.', 'Traffic is the only cause of urban heat.', 'Every neighborhood has identical heat exposure.'], 'The passage repeatedly contrasts planting counts with survival, care, and equitable placement.'],
      ['Which detail best supports the central idea?', 'Programs track whether trees survive and direct care where heat exposure is greatest.', ['Cities contain streets.', 'Trees are plants.', 'Some reports use numbers.'], 'Tracking survival and targeting care directly support the passage’s main point.'],
      ['Which title best fits the passage?', 'Beyond Planting: Making Urban Trees Last', ['Why Cities Should End Tree Programs', 'A History of Traffic Laws', 'Identical Neighborhood Temperatures'], 'The passage focuses on what programs must do beyond planting.'],
    ],
  },
  {
    title: 'Objective Summaries', kind: 'informational',
    summary: 'An objective summary states the source’s main ideas accurately without opinions, minor details, or outside information.',
    passage: 'A coastal town replaced several concrete drainage channels with planted wetlands. The wetlands slow storm water and filter some pollutants before water reaches the bay. They also provide habitat, but they require land and continued maintenance. Engineers therefore use them alongside, rather than as a complete replacement for, pipes and pumps.',
    instruction: 'Keep the central idea and major qualifications. Remove judgment words and details that do not change the overall meaning.',
    terms: [['objective', 'neutral and based on the source'], ['summary', 'a concise account of central ideas and major details']],
    strategy: 'Reject choices containing praise, criticism, or facts absent from the source.',
    questions: [
      ['Which is the best objective summary?', 'The town uses maintained wetlands with conventional drainage because wetlands manage runoff and provide benefits but have limits.', ['The brilliant town discovered the only good solution to flooding.', 'Wetlands are always cheaper than pipes in every city.', 'The passage mainly describes one species living near the bay.'], 'This choice includes the main function, benefits, limits, and combined approach without opinion.'],
      ['Which phrase makes a summary subjective?', 'the brilliant town', ['replaced several channels', 'filter some pollutants', 'require continued maintenance'], '“Brilliant” adds the writer’s praise rather than reporting the source neutrally.'],
      ['Which detail is essential to an accurate summary?', 'Wetlands are used with pipes and pumps, not as a total replacement.', ['The channels were concrete.', 'The town is coastal.', 'The water reaches a bay.'], 'The combined approach is a major qualification in the source’s conclusion.'],
    ],
  },
  {
    title: 'Inferences and Conclusions', kind: 'informational',
    summary: 'An inference is not stated word for word, but it must follow logically from one or more source details.',
    passage: 'After a factory introduced flexible start times, late arrivals decreased. Production did not rise during the first month, but employee surveys reported fewer transportation conflicts. Managers kept the policy for another quarter and planned to compare output, absences, and turnover with the same period from the previous year.',
    instruction: 'Build an inference from evidence plus reasoning. Do not confuse a possible explanation with a conclusion the source actually supports.',
    terms: [['inference', 'a conclusion logically drawn from evidence'], ['assumption', 'an unstated idea accepted without proof']],
    strategy: 'Complete the sentence “Because the source says ___, it is reasonable to conclude ___.”',
    questions: [
      ['Which inference is best supported?', 'Managers believe more time and comparison data are needed to judge the policy.', ['The policy has definitely doubled profit.', 'Transportation conflicts increased.', 'The factory will cancel flexible hours immediately.'], 'Extending the trial and planning comparisons show that managers consider the evidence incomplete.'],
      ['What can reasonably be inferred about lateness?', 'Scheduling conflicts may have contributed to some previous late arrivals.', ['Every late arrival was intentional.', 'No employee uses transportation.', 'Output always falls when lateness falls.'], 'Lateness decreased while workers reported fewer transportation conflicts, supporting a cautious connection.'],
      ['Which conclusion goes beyond the evidence?', 'Flexible start times caused lower employee turnover.', ['Late arrivals decreased.', 'First-month production did not rise.', 'Managers will examine turnover later.'], 'Turnover has not yet been compared, so causation cannot be concluded.'],
    ],
  },
  {
    title: 'Relationships Among Ideas', kind: 'informational',
    summary: 'Readers trace sequence, cause and effect, comparison, and problem–solution relationships among events and ideas.',
    passage: 'A school cafeteria first measured how much unopened food students discarded. It then moved whole fruit from wrapped meal trays to a separate choice table. Because students selected fruit only when they wanted it, discarded fruit fell by half. The cafeteria used the savings to offer sliced fruit twice a week.',
    instruction: 'Identify signal words, then verify the relationship through what happened before and after each action.',
    terms: [['cause', 'an event or condition that helps produce a result'], ['effect', 'a result produced by an event or condition']],
    strategy: 'Make a quick arrow chain: action → immediate result → later result.',
    questions: [
      ['What directly caused discarded fruit to fall?', 'Students chose fruit separately instead of automatically receiving it.', ['The cafeteria stopped serving fruit.', 'Students were required to take two fruits.', 'The school closed the cafeteria.'], 'The source connects voluntary selection to the reduction in discarded fruit.'],
      ['What happened first?', 'The cafeteria measured discarded unopened food.', ['It offered sliced fruit.', 'Discarded fruit fell by half.', 'Savings were spent.'], 'Measurement came before the choice-table change and its results.'],
      ['How were the savings used?', 'To offer sliced fruit twice a week', ['To buy wrapped trays', 'To reduce all meal choices', 'To increase discarded food'], 'The final sentence states how the savings supported a later change.'],
    ],
  },
  {
    title: 'Vocabulary in Context', kind: 'informational',
    summary: 'Context reveals a word’s meaning, connotation, and role even when the word is unfamiliar.',
    passage: 'The first repair was temporary: crews patched the cracked surface so buses could use the bridge safely that week. The permanent rehabilitation began later and included replacing damaged beams. Officials emphasized that the patch was a stopgap, not a substitute for the larger project.',
    instruction: 'Use definitions, examples, contrasts, and nearby consequences. Then substitute the possible meaning into the sentence.',
    terms: [['context', 'surrounding words and ideas that clarify meaning'], ['connotation', 'the feeling or association a word carries']],
    strategy: 'Look for restatements after commas, colons, dashes, or contrast words such as “not.”',
    questions: [
      ['What does “stopgap” most nearly mean?', 'A short-term measure used until a fuller solution is ready', ['A final solution requiring no more work', 'A celebration after construction', 'A law banning bridge repairs'], 'The passage contrasts the patch with later permanent rehabilitation.'],
      ['What does “rehabilitation” mean in this context?', 'Extensive work restoring the bridge', ['Closing the bus route forever', 'Inspecting passenger tickets', 'Painting a temporary warning line'], 'Replacing damaged beams is an example of restoration work.'],
      ['Which phrase provides the strongest context clue for “temporary”?', 'not a substitute for the larger project', ['buses could use', 'officials emphasized', 'began later'], 'The contrast shows that the patch was limited and interim.'],
    ],
  },
  {
    title: 'Text Structure and Organization', kind: 'informational',
    summary: 'Authors organize information through chronology, comparison, cause and effect, problem–solution, and description.',
    passage: 'Home energy audits identify where a building loses heat. First, an auditor examines insulation and seals. Next, tests locate drafts around doors and windows. The final report ranks repairs by cost and likely savings. This sequence helps owners address the most useful improvements before less urgent ones.',
    instruction: 'Ask why each paragraph or sentence appears where it does and how transitions connect its function to the whole.',
    terms: [['structure', 'the pattern used to organize a text'], ['transition', 'a word or phrase connecting ideas or stages']],
    strategy: 'Name the structure, then explain how it advances the author’s purpose.',
    questions: [
      ['Which structure organizes the passage?', 'A chronological process', ['Comparison of two opposing theories', 'A fictional flashback', 'A list with no order'], '“First,” “Next,” and “final” arrange the audit in time order.'],
      ['Why does the author present the report last?', 'It uses findings from the earlier inspection and tests.', ['Reports must always be one sentence.', 'The owner writes it before the audit.', 'It changes the passage into fiction.'], 'The report logically follows and organizes the evidence gathered earlier.'],
      ['What is the function of the final sentence?', 'It explains the benefit of the ordered process.', ['It introduces an unrelated problem.', 'It denies that repairs have costs.', 'It repeats only the first step.'], 'The sentence connects the sequence to practical decision-making.'],
    ],
  },
  {
    title: 'Author Purpose', kind: 'informational',
    summary: 'Purpose describes what an author intends a source to accomplish for a particular audience.',
    passage: 'Before hiking the ridge trail, carry at least two liters of water per person. Shade is limited, and the final refill station is beside the visitor center at the trailhead. Check the heat advisory, tell someone your route, and turn back if anyone shows signs of dizziness or confusion.',
    instruction: 'Use content, tone, format, audience, and requested action to distinguish informing, explaining, persuading, and warning.',
    terms: [['purpose', 'what the author intends the text to accomplish'], ['audience', 'the readers or listeners the source addresses']],
    strategy: 'Ask: What does the author want this reader to know, believe, or do?',
    questions: [
      ['What is the author’s primary purpose?', 'To instruct and warn hikers about heat safety', ['To entertain with a fictional adventure', 'To argue that all trails should close', 'To describe the history of the visitor center'], 'Commands, hazard details, and symptoms show a safety purpose.'],
      ['Who is the most likely audience?', 'People preparing to hike the ridge trail', ['Bridge engineers', 'Restaurant customers', 'Novel reviewers'], 'The instructions directly address people undertaking the hike.'],
      ['Which detail most strongly signals the warning purpose?', 'Turn back if anyone shows dizziness or confusion.', ['The trail has a name.', 'A visitor center exists.', 'People can tell someone a route.'], 'The instruction identifies danger signs and an urgent response.'],
    ],
  },
  {
    title: 'Point of View, Tone, and Rhetoric', kind: 'informational',
    summary: 'Word choice and rhetorical techniques reveal an author’s attitude, perspective, and method of influencing readers.',
    passage: 'In its annual message, the transit agency called the new payment system “a practical step toward simpler travel.” The message highlighted faster boarding and one card for buses and trains. It mentioned the installation cost only in a footnote and did not include comments from riders who prefer cash.',
    instruction: 'Distinguish the author’s position from the evidence. Notice loaded language, emphasis, omissions, repetition, and appeals.',
    terms: [['tone', 'the author’s attitude conveyed through language'], ['rhetoric', 'language choices used to shape an audience’s response']],
    strategy: 'Pair each tone or viewpoint claim with one wording or selection choice from the source.',
    questions: [
      ['How does the agency present the system?', 'As a useful improvement that simplifies travel', ['As a complete failure', 'As an unrelated environmental law', 'As a fictional invention'], 'The positive phrase and highlighted benefits create a favorable presentation.'],
      ['Which omission could limit the message’s perspective?', 'Views of riders who prefer cash', ['The system covers buses and trains.', 'The agency publishes annually.', 'Boarding speed is discussed.'], 'Those riders may provide evidence about accessibility or inconvenience that the message excludes.'],
      ['What is the effect of placing the cost in a footnote?', 'It gives less emphasis to a potential drawback.', ['It proves the system has no cost.', 'It makes the cost the headline.', 'It supplies rider interviews.'], 'Placement can reduce the attention readers give to unfavorable information.'],
    ],
  },
  {
    title: 'Integrating Text and Data', kind: 'informational',
    summary: 'Strong readers reconcile prose with tables, graphs, and other formats instead of reading each source element separately.',
    passage: 'A report says a clinic reduced average appointment wait time after adding online check-in. Its table lists quarterly waits: Q1, 34 minutes; Q2, 31 minutes; Q3, 24 minutes; Q4, 22 minutes. Online check-in began at the start of Q3. The report notes that two additional nurses also began work in Q3.',
    instruction: 'Check units, labels, time periods, and qualifying text. Data can support a trend without proving the author’s causal explanation.',
    terms: [['trend', 'a general direction of change'], ['correlation', 'variables changing together without necessarily proving cause']],
    strategy: 'Describe what the numbers show before deciding what caused the pattern.',
    questions: [
      ['What trend does the table show?', 'Average waits declined each quarter from 34 to 22 minutes.', ['Waits rose after Q1.', 'Q2 and Q4 were identical.', 'The clinic stopped appointments in Q3.'], 'Every listed quarter has a lower average than the one before it.'],
      ['Why can the report not credit online check-in alone?', 'Additional nurses began in the same quarter.', ['The table contains minutes.', 'Online check-in began in Q3.', 'Q4 came after Q3.'], 'A second simultaneous change could also explain some of the decline.'],
      ['How much lower was Q4 than Q1?', '12 minutes', ['8 minutes', '22 minutes', '56 minutes'], 'Subtract 22 from 34 to find a 12-minute decline.'],
    ],
  },
];

const literaryReading: LessonSeed[] = [
  {
    title: 'Sequence and Flashback', kind: 'literary',
    summary: 'Literary sequence may follow clock time or interrupt the present with memories that explain later actions.',
    passage: 'Mara paused outside the workshop as the noon bell rang. The smell of sawdust carried her back to the afternoon her grandfather had shown her how to smooth a rough board. She touched the worn plane in her bag, then opened the door and asked the owner about an apprenticeship.',
    instruction: 'Track present action and remembered action separately, then ask what the interruption reveals.',
    terms: [['sequence', 'the order in which events occur'], ['flashback', 'a shift from the present action to an earlier event']],
    strategy: 'Mark time signals and return points before deciding the order or effect.',
    questions: [
      ['Which event happens first in chronological time?', 'Mara’s grandfather teaches her to smooth a board.', ['The noon bell rings.', 'Mara asks about an apprenticeship.', 'Mara opens the workshop door.'], 'The lesson with her grandfather occurs in the remembered past.'],
      ['What is the effect of the flashback?', 'It explains Mara’s connection to woodworking and her next choice.', ['It proves the workshop is closed.', 'It introduces a second apprenticeship.', 'It changes the setting to the future.'], 'The memory links her grandfather, the tool, and her decision to apply.'],
      ['What happens immediately after Mara touches the plane?', 'She opens the door and asks about an apprenticeship.', ['Her grandfather buys the workshop.', 'The bell stops existing.', 'She returns to the remembered afternoon.'], 'The final clause gives the next present-time actions.'],
    ],
  },
  {
    title: 'Character Inference', kind: 'literary',
    summary: 'Characters are revealed through actions, dialogue, thoughts, choices, and other characters’ responses.',
    passage: 'When the debate moderator mispronounced Jian’s name, Jian quietly corrected her before answering. After the event, he wrote the pronunciation on a card and thanked her for moderating. The next week, the moderator introduced him correctly, and Jian smiled before beginning his speech.',
    instruction: 'Infer a trait only when multiple details support it; avoid labels based on a single action.',
    terms: [['characterization', 'how a text reveals a character'], ['inference', 'a conclusion supported rather than directly stated']],
    strategy: 'Use the pattern “action + dialogue + response = supported trait.”',
    questions: [
      ['Which description of Jian is best supported?', 'He is assertive about respect while remaining considerate.', ['He avoids all public speaking.', 'He wants the moderator punished.', 'He does not care how his name is said.'], 'He corrects the error and provides help without hostility.'],
      ['Which action most clearly shows consideration?', 'He thanks the moderator and gives her a pronunciation card.', ['He attends the debate.', 'He begins a speech.', 'He has a name.'], 'The card helps prevent another mistake, while the thanks recognizes her work.'],
      ['Why does Jian smile the next week?', 'The corrected introduction shows that his respectful effort worked.', ['The debate has been canceled.', 'He forgot his speech.', 'The moderator again mispronounces his name.'], 'The successful correction resolves the small conflict established earlier.'],
    ],
  },
  {
    title: 'Motivation and Conflict', kind: 'literary',
    summary: 'Motivation explains why a character acts, while conflict places that goal against an internal or external obstacle.',
    passage: 'Nora had promised to deliver the medicine before sunset, but floodwater covered the usual road. She studied the map and saw a longer route over the hill. Her hands shook at the thought of crossing the narrow footbridge, yet she tightened her backpack straps and started uphill.',
    instruction: 'Identify the character’s goal, the obstacle, and the choice the conflict produces.',
    terms: [['motivation', 'the reason a character acts'], ['conflict', 'a struggle between opposing forces or choices']],
    strategy: 'Do not confuse the obstacle with the motivation for overcoming it.',
    questions: [
      ['What primarily motivates Nora?', 'Keeping her promise to deliver the medicine', ['Avoiding every hill', 'Studying maps for entertainment', 'Reaching the flooded road'], 'The promised delivery is her goal and explains why she seeks another route.'],
      ['What internal conflict does Nora face?', 'Fear of the footbridge versus determination to continue', ['Two maps showing different countries', 'A dispute with the medicine', 'Uncertainty about the time of day'], 'Her shaking hands show fear, while tightening the straps shows resolve.'],
      ['What does Nora’s final action reveal?', 'She chooses to act despite fear.', ['She abandons the delivery.', 'She waits for the road to dry.', 'She believes the bridge is wide.'], 'Starting uphill shows a decision to pursue the difficult alternative.'],
    ],
  },
  {
    title: 'Setting, Mood, and Plot', kind: 'literary',
    summary: 'Setting is more than location; time and physical conditions can create mood and shape what events are possible.',
    passage: 'By midnight, the market square was empty except for paper lanterns turning in the wind. Rain silvered the stones, and each loose shutter tapped against a dark shopfront. Lio crossed quickly, holding the sealed letter beneath his coat as the tower clock began to strike.',
    instruction: 'Connect sensory details to atmosphere, then explain how conditions affect a character or event.',
    terms: [['setting', 'the time, place, and conditions of a story'], ['mood', 'the feeling or atmosphere created for the reader']],
    strategy: 'Cite two setting details rather than relying on one dramatic word.',
    questions: [
      ['What mood does the setting create?', 'Tense and secretive', ['Cheerful and crowded', 'Calm and sunny', 'Playful and noisy'], 'Midnight, empty streets, dark shops, and a concealed letter build tension and secrecy.'],
      ['How does the weather affect Lio?', 'He protects the letter beneath his coat.', ['It fills the square with shoppers.', 'It stops the clock.', 'It opens every shop.'], 'The rain creates a practical threat to the sealed letter.'],
      ['Which detail most directly establishes the late hour?', 'the tower clock began to strike at midnight', ['paper lanterns', 'shopfronts', 'silvered stones'], 'The opening and tower clock identify midnight explicitly.'],
    ],
  },
  {
    title: 'Theme and Supporting Details', kind: 'literary',
    summary: 'A theme is an insight developed through events and choices, not merely a topic or a one-word label.',
    passage: 'For weeks, Salma hid her unfinished painting whenever visitors entered. On exhibition day, a younger student stared at the blank corner and whispered, “Mine never looks finished either.” Salma placed the canvas on the wall anyway. By afternoon, three notes beneath it thanked her for showing work still in progress.',
    instruction: 'State theme as a complete idea about life, then support it with the character’s change and the outcome.',
    terms: [['theme', 'a broader insight developed through a literary work'], ['topic', 'the general subject, such as courage or friendship']],
    strategy: 'Avoid theme answers that simply name the plot or claim “always” and “never.”',
    questions: [
      ['Which theme is best supported?', 'Sharing imperfect work can encourage both the creator and others.', ['Every painting must remain unfinished.', 'Visitors dislike honest artists.', 'Talent removes all uncertainty.'], 'Salma’s vulnerable choice creates connection and gratitude.'],
      ['Which event most clearly develops the theme?', 'Salma displays the unfinished canvas despite her fear.', ['Visitors enter rooms.', 'The exhibition lasts one day.', 'The canvas has a blank corner.'], 'Her decision changes the plot and allows the positive response to occur.'],
      ['How does Salma change?', 'She moves from hiding her work to showing it publicly.', ['She stops painting forever.', 'She decides the canvas is perfect.', 'She removes all visitor notes.'], 'The opening and later action create a clear shift in behavior.'],
    ],
  },
  {
    title: 'Figurative Language and Connotation', kind: 'literary',
    summary: 'Figurative language and connotation add meanings and feelings beyond a word’s literal definition.',
    passage: 'At dawn, the station yawned awake. One kiosk lifted its metal eyelid; then another. Soon the platform hummed with footsteps, rolling bags, and clipped announcements, while the last pool of night retreated beneath the benches.',
    instruction: 'Identify what is literally described, then explain the comparison or association and its effect.',
    terms: [['personification', 'giving human qualities to something nonhuman'], ['connotation', 'an emotional or cultural association carried by a word']],
    strategy: 'Replace the figure with literal language, then compare what feeling is lost.',
    questions: [
      ['What does “the station yawned awake” suggest?', 'The station gradually became active in the morning.', ['The building literally had a mouth.', 'The station was permanently abandoned.', 'All passengers fell asleep.'], 'Personification compares increasing activity to a person waking.'],
      ['What effect does “metal eyelid” create?', 'It compares a rising kiosk shutter to an opening eye.', ['It describes a passenger’s glasses.', 'It proves the kiosk is alive.', 'It changes dawn to midnight.'], 'The metaphor continues the waking-station image.'],
      ['What does “hummed” connote here?', 'Steady, lively activity', ['Complete silence', 'Dangerous collapse', 'A single loud explosion'], 'The word suggests a continuous blend of ordinary sounds and motion.'],
    ],
  },
  {
    title: 'Narrator and Story Structure', kind: 'literary',
    summary: 'Narrator perspective controls what readers know, while structural choices control when and how information is revealed.',
    passage: 'I told everyone the key had vanished during lunch, which was true. I did not tell them I had found it again in my own pocket before the search began. As my classmates checked under tables, I practiced the apology I would give—after I found enough courage to stop them.',
    instruction: 'Distinguish the narrator from the author and evaluate how limited or withheld information shapes the reader’s response.',
    terms: [['narrator', 'the voice that tells a story'], ['first person', 'a perspective using I or we']],
    strategy: 'Ask what the narrator knows, admits, hides, or may misunderstand.',
    questions: [
      ['What point of view is used?', 'First person', ['Third-person omniscient', 'Second-person instructions', 'An objective news report'], 'The narrator uses “I” and reports personal thoughts.'],
      ['How does the second sentence affect the story?', 'It creates tension by revealing that the narrator is withholding the truth.', ['It proves a classmate stole the key.', 'It ends the search immediately.', 'It changes the narrator to third person.'], 'Readers know the truth while the classmates continue an unnecessary search.'],
      ['What can the reader infer about the narrator?', 'The narrator feels guilty but is afraid to confess.', ['The narrator never found the key.', 'The narrator enjoys giving instructions.', 'The narrator believes no apology is needed.'], 'Practicing an apology shows guilt; delaying it shows fear.'],
    ],
  },
  {
    title: 'Comparing Literary Texts', kind: 'literary',
    summary: 'Comparing texts means analyzing how different authors develop a shared theme, event, character, or technique.',
    passage: 'Text A: Arun keeps his father’s broken watch in a drawer and checks it whenever he must make a difficult choice. Text B: Mei plants seeds from her grandmother’s garden in every city where she lives. Both objects connect the characters to family, but the watch remains hidden while the garden becomes visible to neighbors.',
    instruction: 'Compare a precise feature in both texts, then explain a meaningful similarity or difference in its treatment.',
    terms: [['comparison', 'analysis of meaningful similarities'], ['contrast', 'analysis of meaningful differences']],
    strategy: 'Use a both–but statement: both texts do X, but Text A does Y while Text B does Z.',
    questions: [
      ['What do the watch and seeds share?', 'Both connect a character to family memory.', ['Both are repaired by neighbors.', 'Both are hidden in drawers.', 'Both measure time.'], 'The passage explicitly says both objects provide family connection.'],
      ['How do the objects function differently?', 'The watch supports private reflection, while the garden makes memory public.', ['The garden is hidden while the watch grows.', 'Only the watch belonged to family.', 'Neither object affects a character.'], 'The final contrast distinguishes hidden personal use from visible community presence.'],
      ['Which theme could both texts develop?', 'Family connections can guide people across time and change.', ['Objects erase every difficult choice.', 'Moving always destroys memory.', 'Neighbors should repair watches.'], 'Each character carries a family connection into present life in a different form.'],
    ],
  },
];

const argumentAndResponse: LessonSeed[] = [
  {
    title: 'Claims, Reasons, and Evidence', kind: 'argument',
    summary: 'Arguments connect a claim to reasons and source evidence; evidence is not useful unless reasoning explains the connection.',
    passage: 'A council member argues that the city should add a protected cycle lane on Harbor Road. She notes that bicycle counts there rose 22 percent in two years and that 61 percent of surveyed riders avoid the road because they feel unsafe. She concludes that a protected lane would serve growing demand and address the reported barrier.',
    instruction: 'Label the main claim, supporting reasons, evidence, and reasoning before judging the argument.',
    terms: [['claim', 'a position the author asks readers to accept'], ['evidence', 'facts, examples, or data offered in support']],
    strategy: 'A statistic is evidence; the sentence explaining why it matters is reasoning.',
    questions: [
      ['What is the main claim?', 'The city should add a protected cycle lane on Harbor Road.', ['Bicycle counts rose 22 percent.', 'A survey included riders.', 'Harbor Road exists.'], 'The recommendation is the position; the statistics support it.'],
      ['Which evidence addresses a safety barrier?', 'Sixty-one percent of surveyed riders avoid the road because they feel unsafe.', ['The speaker is a council member.', 'The road has a name.', 'The counts cover two years.'], 'This result directly measures avoidance associated with perceived danger.'],
      ['What reasoning links the evidence to the claim?', 'A protected lane could respond to increased use and the safety concern limiting more use.', ['All surveys are perfectly accurate.', 'Every road must remove cars.', 'Bicycles caused the city to grow.'], 'The conclusion connects demand and safety evidence to the proposed design.'],
    ],
  },
  {
    title: 'Relevance and Sufficiency of Evidence', kind: 'argument',
    summary: 'Relevant evidence bears directly on a claim; sufficient evidence is adequate in amount, quality, and variety to justify it.',
    passage: 'A blog claims that a new tutoring program guarantees higher mathematics scores for every student. As proof, it describes one student whose score rose after four sessions. The post provides no comparison group, does not report results for other participants, and does not explain whether the student received additional help.',
    instruction: 'Test relevance first, then sufficiency. One relevant example can still be far too weak for a broad conclusion.',
    terms: [['relevant', 'directly connected to the claim'], ['sufficient', 'enough strong evidence to support the scope of the claim']],
    strategy: 'Compare the size of the claim with the size and quality of the evidence.',
    questions: [
      ['Why is the evidence insufficient?', 'One student’s result cannot establish a guarantee for every student.', ['The example concerns mathematics.', 'The post uses complete sentences.', 'Tutoring includes sessions.'], 'The universal claim requires broader, controlled evidence.'],
      ['Which new evidence would most strengthen the claim?', 'Results for many comparable students with and without the program', ['The tutor’s favorite subject', 'A photo of the classroom', 'A longer description of the same student'], 'A larger comparison helps separate program effects from other explanations.'],
      ['Is the one student’s result relevant?', 'Yes, but it is too limited to support the broad guarantee.', ['No, because scores never count as evidence.', 'Yes, and it proves the claim completely.', 'No, because tutoring cannot be studied.'], 'The example concerns the program’s intended outcome but lacks sufficient scope.'],
    ],
  },
  {
    title: 'Assumptions and Fallacious Reasoning', kind: 'argument',
    summary: 'Readers identify unstated premises and reasoning errors that weaken the link between evidence and conclusion.',
    passage: 'A columnist argues, “The community garden opened in May, and restaurant sales increased in June. Therefore, the garden caused the sales increase. Anyone who questions this conclusion must oppose neighborhood improvement.” The column gives no information about tourism, prices, seasonal events, or other changes.',
    instruction: 'Ask what must be true for the conclusion to follow and whether the author dismisses alternatives unfairly.',
    terms: [['assumption', 'an unstated premise required by an argument'], ['fallacy', 'a recurring error in reasoning']],
    strategy: 'Sequence alone does not prove causation, and attacking a critic does not answer the criticism.',
    questions: [
      ['What reasoning error appears first?', 'Treating events that occurred in sequence as proof of causation', ['Using no dates', 'Comparing two identical totals', 'Defining every term precisely'], 'The garden opened before sales rose, but timing alone does not establish cause.'],
      ['What assumption does the causal claim require?', 'No other factor better explains the restaurant sales increase.', ['Restaurants existed before May.', 'Gardens contain plants.', 'June follows May on calendars.'], 'The omitted alternative causes must be ruled out or controlled.'],
      ['Why is the final sentence fallacious?', 'It attacks critics’ motives instead of addressing their evidence.', ['It supplies controlled research.', 'It measures tourism.', 'It narrows the original claim.'], 'Calling critics opponents of improvement avoids the causal question.'],
    ],
  },
  {
    title: 'Opposing Arguments and Counterclaims', kind: 'argument',
    summary: 'Paired-source questions require comparing claims, evidence quality, assumptions, and responses to counterarguments.',
    passage: 'Text A argues that the town should close Main Street to cars every Saturday because a three-week pilot increased pedestrian counts by 30 percent. Text B supports one car-free Saturday per month, noting that the same pilot caused delivery delays for eight of twelve surveyed shops. Text B proposes timed morning delivery access as a compromise.',
    instruction: 'State each position accurately before deciding which is better supported or how one responds to the other.',
    terms: [['counterclaim', 'a position that challenges part or all of another claim'], ['rebuttal', 'a reasoned response to a counterclaim']],
    strategy: 'Do not choose by personal preference; compare evidence and how well each source handles trade-offs.',
    questions: [
      ['How do the positions differ?', 'Text A favors weekly closure; Text B favors monthly closure with delivery access.', ['Both reject any closure.', 'Text A discusses only deliveries.', 'Text B favors permanent daily closure.'], 'The frequency and delivery arrangement distinguish the proposals.'],
      ['Which evidence supports Text A?', 'Pedestrian counts rose 30 percent during the pilot.', ['Eight shops reported delays.', 'Text B proposes morning access.', 'The town has a Main Street.'], 'The measured increase supports a benefit emphasized by Text A.'],
      ['How does Text B address a counterclaim?', 'It acknowledges delivery problems and proposes limited access.', ['It denies the pilot occurred.', 'It repeats pedestrian counts only.', 'It attacks all shop owners.'], 'Text B responds to a cost with a specific compromise.'],
    ],
  },
  {
    title: 'Extended Response Planning and Evidence', kind: 'argument',
    summary: 'The 45-minute extended response asks learners to analyze two arguments and support a judgment with specific source evidence.',
    passage: 'Source A supports later high-school start times, citing a district study in which average attendance rose after the change. Source B opposes the change, citing a survey in which 54 percent of participating families reported transportation difficulties. Neither source explains sample size; Source A compares attendance across a full year, while Source B reports one month of responses.',
    instruction: 'Budget time to read and annotate, choose the better-supported position, outline, draft, and revise. Analyze evidence rather than merely summarizing.',
    terms: [['thesis', 'the response’s controlling judgment'], ['analysis', 'explanation of how and why evidence supports a conclusion']],
    strategy: 'A defensible thesis may qualify its choice: identify the stronger source while acknowledging a limitation.',
    questions: [
      ['Which thesis is most defensible?', 'Source A is better supported because it uses a year of outcome data, though its missing sample size limits certainty.', ['Later starts are good because I prefer sleeping.', 'Both sources say exactly the same thing.', 'Source B is wrong because transportation never matters.'], 'The thesis makes a source-based judgment and recognizes a real limitation.'],
      ['Which plan best supports the thesis?', 'Compare time span and evidence type, explain why attendance data are stronger, then address the missing sample size.', ['Copy both sources without analysis.', 'Discuss an unrelated school memory.', 'List grammar rules without evaluating evidence.'], 'The plan focuses on evidence quality and the reasoning behind the judgment.'],
      ['Why mention Source B’s transportation survey?', 'To address relevant counterevidence and explain its shorter time frame.', ['To avoid using Source A.', 'To prove surveys are never useful.', 'To replace the thesis with a summary.'], 'Acknowledging and evaluating counterevidence strengthens analysis.'],
    ],
  },
  {
    title: 'Extended Response Organization and Revision', kind: 'argument',
    summary: 'A strong response earns across argument/evidence, development/organization, and clarity/standard English—not by length alone.',
    passage: 'Draft paragraph: “Source A is more convincing. It reports inspected homes. The other article says the plan costs too much. Source A studied 240 homes before and after repairs and found average energy use fell 18 percent. This is better.” The writer has 10 minutes remaining to revise.',
    instruction: 'Use a clear thesis, logically ordered evidence and analysis, transitions, formal tone, and mostly correct conventions. Reserve time to revise meaning before proofreading.',
    terms: [['organization', 'a logical progression connecting ideas and evidence'], ['revision', 'improving ideas, evidence, structure, and clarity']],
    strategy: 'Use the three-trait check: argument/evidence; development/organization; clarity/conventions. Each trait is worth up to two rubric points.',
    questions: [
      ['Which revision most improves analysis?', 'Add that the before-and-after results from 240 inspected homes directly measure whether repairs reduced energy use.', ['Repeat “Source A is better” three times.', 'Delete the numerical evidence.', 'Add a personal story about electricity.'], 'The revision explains why the specific evidence makes Source A more convincing.'],
      ['What should the writer do before correcting commas?', 'Clarify the comparison and connect evidence to the thesis.', ['Replace every short word.', 'Copy the source passages.', 'Remove all transitions.'], 'Higher-level revision of reasoning and organization should precede final proofreading.'],
      ['Which transition best introduces the opposing source?', 'By contrast, Source B offers a cost claim but no measured outcome.', ['For example, the same source agrees.', 'Similarly, no difference exists.', 'Yesterday, the paragraph ends.'], '“By contrast” accurately signals a comparison between different evidence.'],
    ],
  },
];

const languageAndEditing: LessonSeed[] = [
  {
    title: 'Commonly Confused Words and Contractions', kind: 'editing',
    summary: 'Editing questions test whether a word or contraction has the meaning and grammatical role required by its sentence.',
    passage: 'Draft notice: “Their planning to reopen the center on Tuesday. Its entrance has been repaired, and visitors should leave there bags at the front desk. The director said your welcome to attend the morning tour.”',
    instruction: 'Read for meaning first: their/there/they’re, its/it’s, your/you’re, and similar pairs cannot be chosen by sound alone.',
    terms: [['contraction', 'a shortened form joining words with an apostrophe'], ['possessive', 'a form showing ownership or association']],
    strategy: 'Expand a contraction in the sentence; if the full words do not fit, choose the possessive or location form.',
    questions: [
      ['How should “Their planning” be revised?', 'They’re planning', ['There planning', 'Their planing', 'Theyre planning'], '“They are planning” fits, so the contraction “they’re” is required.'],
      ['How should “there bags” be revised?', 'their bags', ['they’re bags', 'there bag’s', 'theirs bags'], 'The bags belong to the visitors, requiring the possessive “their.”'],
      ['How should “your welcome” be revised?', 'you’re welcome', ['your welcomed', 'yore welcome', 'youre welcomed'], 'The intended phrase is “you are welcome,” so use “you’re.”'],
    ],
  },
  {
    title: 'Subject–Verb Agreement', kind: 'editing',
    summary: 'A verb agrees with its true subject, even when phrases, compound structures, or indefinite pronouns intervene.',
    passage: 'Draft report: “The list of replacement parts are on the desk. Each of the technicians check the list before work. The supervisor, along with two assistants, review the final order.”',
    instruction: 'Find the complete subject, remove interrupting phrases mentally, and decide whether the subject is singular or plural.',
    terms: [['subject', 'the noun or pronoun the clause is about'], ['agreement', 'matching grammatical number or person']],
    strategy: 'Cross out “of” and “along with” phrases temporarily; they often hide the subject that controls the verb.',
    questions: [
      ['Which revision fixes the first sentence?', 'The list of replacement parts is on the desk.', ['The list of replacement parts be on the desk.', 'The list of replacement parts were on the desk.', 'No revision is needed.'], 'The singular subject “list,” not plural “parts,” controls “is.”'],
      ['Which verb should follow “Each of the technicians”?', 'checks', ['check', 'checking', 'have check'], '“Each” is singular even though the following noun is plural.'],
      ['How should “The supervisor ... review” be revised?', 'The supervisor, along with two assistants, reviews the final order.', ['The supervisor ... reviewing the final order.', 'The supervisor ... have reviewed the final order.', 'No revision is needed.'], 'The interrupting phrase does not make the singular subject “supervisor” plural.'],
    ],
  },
  {
    title: 'Pronouns and Clear Reference', kind: 'editing',
    summary: 'Pronouns must agree with and clearly refer to an antecedent, use the correct case, and avoid ambiguity.',
    passage: 'Draft email: “When Ana spoke with Priya, she said the schedule was outdated. The manager asked Priya and I to submit a corrected copy. Every employee should check their assigned shift before Friday.”',
    instruction: 'Check who each pronoun means, whether its form fits its grammatical job, and whether agreement remains clear and inclusive.',
    terms: [['pronoun', 'a word that substitutes for a noun'], ['antecedent', 'the noun or idea a pronoun refers to']],
    strategy: 'Replace the pronoun with its noun; ambiguity or an incorrect form will often become obvious.',
    questions: [
      ['What is the main problem with “she” in the first sentence?', 'It could refer to either Ana or Priya.', ['It is always a plural pronoun.', 'It has no verb.', 'It must refer to the schedule.'], 'Two singular female antecedents make the reference ambiguous.'],
      ['How should “Priya and I” be revised?', 'Priya and me', ['Priya and myself', 'Priya and mine', 'No revision is needed'], 'The pronoun is an object of “asked”; “asked me” confirms the objective form.'],
      ['Which sentence has clear modern agreement?', 'Every employee should check their assigned shift before Friday.', ['Every employee should checks his shift.', 'Every employee should check them assigned shift.', 'Every employee check its shifts.'], 'Singular “they/their” clearly and concisely refers to an employee whose gender is unspecified.'],
    ],
  },
  {
    title: 'Modifiers and Word Order', kind: 'editing',
    summary: 'Modifiers belong next to the words they describe; misplaced or dangling modifiers create confusion or unintended meaning.',
    passage: 'Draft instructions: “Walking into the laboratory, the safety goggles were on the shelf. The instructor handed gloves to the students packed in sealed bags. After reading the label carefully, the bottle should be stored in the cabinet.”',
    instruction: 'Identify who performs the opening action and place descriptive phrases beside the intended noun.',
    terms: [['modifier', 'a word or phrase that describes another element'], ['dangling modifier', 'a modifier whose intended subject is missing']],
    strategy: 'Ask “Who is doing this?” after every introductory -ing phrase.',
    questions: [
      ['Which revision fixes the first sentence?', 'Walking into the laboratory, the students saw safety goggles on the shelf.', ['Walking into the laboratory, the shelf had goggles.', 'The safety goggles, walking, were on the shelf.', 'No revision is needed.'], 'The revision supplies “students” as the people walking.'],
      ['What does the original second sentence accidentally suggest?', 'The students were packed in sealed bags.', ['The instructor wore gloves.', 'The bags were unsealed.', 'The laboratory had no students.'], 'The modifier sits next to “students” instead of “gloves.”'],
      ['Which revision fixes the final sentence?', 'After reading the label carefully, the technician should store the bottle in the cabinet.', ['After reading the label, the cabinet stores the bottle.', 'The label carefully stored the bottle.', 'No revision is needed.'], 'The revision names the person who reads and stores.'],
    ],
  },
  {
    title: 'Parallel Structure', kind: 'editing',
    summary: 'Parallel structure expresses equal ideas in matching grammatical forms, improving clarity and rhythm.',
    passage: 'Draft policy: “Volunteers will greet visitors, recording attendance, and they answer questions. The role requires patience, being reliable, and clear communication. Applicants may submit the form online or mailing it to the office.”',
    instruction: 'Find items joined by and/or, then make their grammatical forms match without changing meaning.',
    terms: [['parallelism', 'matching form for ideas with equal function'], ['series', 'three or more related grammatical items']],
    strategy: 'Circle the joining word and compare the form immediately before and after it.',
    questions: [
      ['Which revision makes the first series parallel?', 'Volunteers will greet visitors, record attendance, and answer questions.', ['Volunteers will greeting, record, and answers.', 'Volunteers greet visitors, recording and answers.', 'No revision is needed.'], 'Three base-form verbs follow “will” in matching form.'],
      ['Which revision makes the requirements parallel?', 'patience, reliability, and clear communication', ['patient, reliability, and communicating clearly', 'patience, being reliable, and clearly', 'patience, reliable, and communication clear'], 'All three items become nouns or noun phrases.'],
      ['How should the final choice be revised?', 'submit the form online or mail it to the office', ['submitting online or mail it', 'submit online or mailing it', 'to submit online or mailed it'], 'The two alternatives use matching base-form verbs.'],
    ],
  },
  {
    title: 'Coordination and Subordination', kind: 'editing',
    summary: 'Writers coordinate equally important ideas and subordinate details that explain time, cause, condition, or contrast.',
    passage: 'Draft update: “The outdoor concert continued, the rain became heavier. Because the stage was covered. The musicians remained dry, but the audience moved beneath the tents.”',
    instruction: 'Decide whether ideas are equal or whether one depends on another, then join clauses without creating a fragment or comma splice.',
    terms: [['independent clause', 'a group of words that can stand as a sentence'], ['dependent clause', 'a clause that cannot stand alone']],
    strategy: 'Words such as because, although, when, and if create dependent clauses that must attach to a complete clause.',
    questions: [
      ['Which revision fixes the comma splice?', 'The outdoor concert continued, although the rain became heavier.', ['The outdoor concert continued, the rain heavier.', 'Although the outdoor concert.', 'The concert, and the rain.'], '“Although” makes the rain clause dependent and expresses contrast.'],
      ['How should “Because the stage was covered.” be revised?', 'Because the stage was covered, the musicians remained dry.', ['Because. The stage was covered.', 'The stage because covered.', 'No revision is needed.'], 'The dependent because-clause is attached to the result it explains.'],
      ['What relationship does “but” express in the last sentence?', 'Contrast', ['Cause', 'Sequence', 'Definition'], 'The covered musicians and shelter-seeking audience experienced contrasting conditions.'],
    ],
  },
  {
    title: 'Concision and Transitions', kind: 'editing',
    summary: 'Effective editing removes redundancy and uses transitions that accurately signal relationships among ideas.',
    passage: 'Draft paragraph: “The committee reached a final conclusion at the end of the meeting. The playground surface was old and worn due to the fact that it had been used for many years. In contrast, the committee voted to replace it. The work will begin in June; for example, the playground will close for two weeks.”',
    instruction: 'Preserve meaning while removing repeated ideas, and replace transitions whose logical signal does not fit.',
    terms: [['redundancy', 'unnecessary repetition of meaning'], ['transition', 'a word or phrase signaling a relationship']],
    strategy: 'Prefer the shortest complete wording, but never delete a necessary qualification or logical connection.',
    questions: [
      ['Which is the most concise first sentence?', 'The committee reached a conclusion at the end of the meeting.', ['The committee finally reached a final conclusion.', 'At the end ending, the committee concluded a conclusion.', 'The committee reached a final concluding conclusion.'], '“Final conclusion” is redundant; the revision keeps the timing.'],
      ['How should “due to the fact that” be revised?', 'because', ['in spite of', 'for example', 'similarly'], '“Because” expresses the same cause more directly.'],
      ['Which transition should replace “In contrast”?', 'Therefore', ['Meanwhile', 'For example', 'Nevertheless'], 'The replacement decision follows as a result of the worn condition.'],
    ],
  },
  {
    title: 'Sentence Boundaries and Punctuation', kind: 'editing',
    summary: 'Standard English uses complete sentence boundaries, capitalization, apostrophes, commas, and clause punctuation to make meaning clear.',
    passage: 'Draft announcement: “on saturday the workers lounge will close for repairs, employees can use the librarys meeting room. The room has tables chairs and a printer however food isnt permitted. After the repairs are complete.”',
    instruction: 'Edit in layers: complete sentences first, then clause punctuation, lists, apostrophes, and capitalization.',
    terms: [['run-on', 'independent clauses joined without correct punctuation'], ['fragment', 'an incomplete group presented as a sentence']],
    strategy: 'Read each clause aloud and identify its subject and complete verb before choosing punctuation.',
    questions: [
      ['Which revision correctly opens the announcement?', 'On Saturday, the workers’ lounge will close for repairs; employees can use the library’s meeting room.', ['on saturday the workers lounge will close, employees can use the librarys room.', 'On Saturday the worker’s lounge closing for repairs employees.', 'On saturday; the workers lounge will close for repairs.'], 'The revision capitalizes, uses the plural possessive and singular possessive correctly, and joins two independent clauses with a semicolon.'],
      ['How should the second sentence be punctuated?', 'The room has tables, chairs, and a printer; however, food isn’t permitted.', ['The room has tables chairs and a printer however food isnt permitted.', 'The room has; tables, chairs and a printer however.', 'The room has tables chairs, and a printer, however food.'], 'Commas separate the series, a semicolon precedes the conjunctive adverb, and an apostrophe forms “isn’t.”'],
      ['How should the final fragment be corrected?', 'After the repairs are complete, the lounge will reopen.', ['After the repairs are complete.', 'The repairs after complete.', 'After, the repairs, are complete.'], 'The dependent opening clause now attaches to a complete independent clause.'],
    ],
  },
];

export const gedRlaCourse: OfficialLanguageQuestCourse = {
  code: 'MRLC-GED-RLA-V1',
  title: 'GED Reasoning Through Language Arts Preparation & Practice',
  description: 'A comprehensive, source-based GED RLA course with 32 guided lessons and 96 original questions covering informational and literary reading, argument analysis, extended response, and editing.',
  language: 'GED RLA',
  category: 'GED Preparation',
  imageEmoji: '',
  accentColor: '#7c3aed',
  published: true,
  units: [
    { title: 'Unit 1: Informational Reading', description: 'Close reading, evidence, central ideas, inference, vocabulary, structure, purpose, rhetoric, and data integration.', lessons: informationalReading.map(lesson) },
    { title: 'Unit 2: Literary Reading', description: 'Sequence, character, conflict, setting, theme, figurative language, narrator, structure, and paired literary texts.', lessons: literaryReading.map(lesson) },
    { title: 'Unit 3: Argument and Extended Response', description: 'Claims, evidence, reasoning, assumptions, counterclaims, source comparison, planning, organization, and revision.', lessons: argumentAndResponse.map(lesson) },
    { title: 'Unit 4: Language and Editing', description: 'Usage, agreement, pronouns, modifiers, parallelism, clause relationships, concision, transitions, and punctuation.', lessons: languageAndEditing.map(lesson) },
  ],
};
