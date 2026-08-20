import type { OfficialLanguageQuestChallenge, OfficialLanguageQuestCourse } from './languageQuestImportedCourses';
import { orderLanguageQuestOptions } from './shared/languageQuestOptionOrder';

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
  return seed.questions.map(([prompt, correct, distractors, explanation]) => {
    const options = orderLanguageQuestOptions(correct, distractors, `${seed.title}|${prompt}`);
    return {
      type: 'SELECT',
      question: `${seed.passage}\n\n${prompt}`,
      explanation,
      hint: 'Return to the source. Identify the exact words or relationships that support one answer and rule out unsupported choices.',
      options: options.map((text) => ({ text, correct: text === correct, emoji: null, audioText: null })),
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
      ['Which detail is stated explicitly?', 'Evening visits rose by 38 percent during the trial.', ['Staffing costs fell by 38 percent during the trial.', 'Daytime visits rose sharply after weekday hours changed.', 'The board permanently approved the later schedule.'], 'The passage directly reports the 38 percent increase; the other claims are not stated.'],
      ['What will the board review?', 'Staffing costs and visitor surveys', ['Book prices and donations', 'Evening circulation and utility expenses', 'Daytime attendance and closure plans'], 'The final sentence names both sources the board will review.'],
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
      ['What is the central idea?', 'Tree programs succeed through long-term care and targeted planning, not planting totals alone.', ['Cities should remove all street trees.', 'Traffic protection is the only action cities need to ensure that every newly planted tree survives.', 'All neighborhoods should receive identical tree care regardless of heat exposure or survival rates.'], 'The passage repeatedly contrasts planting counts with survival, care, and equitable placement.'],
      ['Which detail best supports the central idea?', 'Programs track whether trees survive and direct care where heat exposure is greatest.', ['Young trees may need protection when nearby traffic could damage trunks or branches.', 'Cities often plant trees along streets where mature canopies may eventually provide shade.', 'A city can publish the number of trees planted without reporting where each one was placed.'], 'Tracking survival and targeting care directly support the passage’s main point.'],
      ['Which title best fits the passage?', 'Beyond Planting: Making Urban Trees Last', ['Counting Trees: The Only Measure That Matters', 'Traffic Damage: The Sole Cause of Urban Heat', 'Equal Shade in Every City Neighborhood'], 'The passage focuses on what programs must do beyond planting.'],
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
      ['Which is the best objective summary?', 'The town uses maintained wetlands with conventional drainage because wetlands manage runoff and provide benefits but have limits.', ['The town wisely eliminated its entire drainage system after discovering that planted wetlands solve every flooding problem.', 'Planted wetlands are always less expensive than pipes because they need no land, pumps, or continuing maintenance.', 'The town created wildlife habitat near the bay, and the passage mainly catalogs species that now live in the wetlands.'], 'This choice includes the main function, benefits, limits, and combined approach without opinion.'],
      ['Which phrase makes a summary subjective?', 'the brilliant town', ['several channels', 'filter some pollutants', 'require continued maintenance'], '“Brilliant” adds the writer’s praise rather than reporting the source neutrally.'],
      ['Which detail is essential to an accurate summary?', 'Wetlands are used with pipes and pumps, not as a total replacement.', ['The channels were concrete.', 'Some filtered storm water eventually travels from the wetlands toward the nearby bay.', 'The planted areas may provide habitat for species that can live near managed wetlands.'], 'The combined approach is a major qualification in the source’s conclusion.'],
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
      ['Which inference is best supported?', 'Managers believe more time and comparison data are needed to judge the policy.', ['The policy definitely doubled profit.', 'Managers believe transportation conflicts grew worse even though employee surveys report fewer conflicts.', 'Managers intend to cancel flexible hours before examining absences, output, or employee turnover.'], 'Extending the trial and planning comparisons show that managers consider the evidence incomplete.'],
      ['What can reasonably be inferred about lateness?', 'Scheduling conflicts may have contributed to some previous late arrivals.', ['Every late arrival was intentional.', 'The decline in lateness proves that no factory employee now experiences transportation problems.', 'Lower lateness always causes production to fall during the first month of a scheduling policy.'], 'Lateness decreased while workers reported fewer transportation conflicts, supporting a cautious connection.'],
      ['Which conclusion goes beyond the evidence?', 'Flexible start times caused lower employee turnover.', ['Late arrivals decreased.', 'Production did not increase during the policy’s first month.', 'Managers plan to compare turnover with the same period last year.'], 'Turnover has not yet been compared, so causation cannot be concluded.'],
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
      ['What directly caused discarded fruit to fall?', 'Students chose fruit separately instead of automatically receiving it.', ['The cafeteria stopped serving fruit.', 'Students were required to select two pieces of fruit from every wrapped tray.', 'The school closed the cafeteria while staff measured all unopened food.'], 'The source connects voluntary selection to the reduction in discarded fruit.'],
      ['What happened first?', 'The cafeteria measured discarded unopened food.', ['It offered sliced fruit.', 'Discarded whole fruit fell to half of its earlier measured amount.', 'The cafeteria spent its savings on an expanded fruit selection.'], 'Measurement came before the choice-table change and its results.'],
      ['How were the savings used?', 'To offer sliced fruit twice a week', ['To buy wrapped trays', 'To remove fruit choices from student lunches', 'To measure unopened food for a second year'], 'The final sentence states how the savings supported a later change.'],
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
      ['What does “stopgap” most nearly mean?', 'A short-term measure used until a fuller solution is ready', ['A final solution requiring no more work', 'A public celebration held after a major construction project ends', 'A legal order permanently prohibiting repairs to an unsafe bridge'], 'The passage contrasts the patch with later permanent rehabilitation.'],
      ['What does “rehabilitation” mean in this context?', 'Extensive work restoring the bridge', ['Closing the bus route forever', 'Routine inspection of tickets on passing buses', 'Temporary paint marking cracks in the surface'], 'Replacing damaged beams is an example of restoration work.'],
      ['Which phrase provides the strongest context clue for “temporary”?', 'not a substitute for the larger project', ['buses could use the bridge', 'officials emphasized that the patch was a stopgap', 'the permanent rehabilitation began later'], 'The contrast shows that the patch was limited and interim.'],
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
      ['Why does the author present the report last?', 'It uses findings from the earlier inspection and tests.', ['Reports must always be brief.', 'It determines which tests the owner completed before requesting an audit.', 'It changes the factual explanation into a fictional account of repairs.'], 'The report logically follows and organizes the evidence gathered earlier.'],
      ['What is the function of the final sentence?', 'It explains the benefit of the ordered process.', ['It adds an unrelated problem.', 'It argues that owners should ignore the cost of every recommended repair.', 'It repeats the first insulation step without connecting it to later decisions.'], 'The sentence connects the sequence to practical decision-making.'],
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
      ['Who is the most likely audience?', 'People preparing to hike the ridge trail', ['Bridge engineers', 'Customers visiting the trailhead restaurant', 'Reviewers evaluating a novel about hiking'], 'The instructions directly address people undertaking the hike.'],
      ['Which detail most strongly signals the warning purpose?', 'Turn back if anyone shows dizziness or confusion.', ['The route is identified by the name “ridge trail.”', 'The final refill station is located beside the visitor center.', 'Hikers should tell another person which route they plan to take.'], 'The instruction identifies danger signs and an urgent response.'],
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
      ['How does the agency present the system?', 'As a useful improvement that simplifies travel', ['As a complete failure', 'As an environmental rule unrelated to buses or train travel', 'As a fictional invention unavailable to public transit riders'], 'The positive phrase and highlighted benefits create a favorable presentation.'],
      ['Which omission could limit the message’s perspective?', 'Views of riders who prefer cash', ['The system covers buses and trains.', 'The agency publishes annually.', 'Boarding speed is discussed.'], 'Those riders may provide evidence about accessibility or inconvenience that the message excludes.'],
      ['What is the effect of placing the cost in a footnote?', 'It gives less emphasis to a potential drawback.', ['It proves the system has no cost.', 'It makes installation cost the central headline of the annual message.', 'It provides detailed interviews with riders who still prefer paying cash.'], 'Placement can reduce the attention readers give to unfavorable information.'],
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
      ['What trend does the table show?', 'Average waits declined each quarter from 34 to 22 minutes.', ['Average waits increased every quarter after beginning at 34 minutes.', 'Average waits in Q2 and Q4 remained identical at 31 minutes.', 'The clinic stopped scheduling appointments when Q3 began.'], 'Every listed quarter has a lower average than the one before it.'],
      ['Why can the report not credit online check-in alone?', 'Additional nurses began in the same quarter.', ['The table contains minutes.', 'Online check-in began at the start of the clinic’s third quarter.', 'The fourth quarter occurred after both Q2 and Q3 had ended.'], 'A second simultaneous change could also explain some of the decline.'],
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
      ['Which event happens first in chronological time?', 'Mara’s grandfather teaches her to smooth a board.', ['The noon bell rings.', 'Mara asks the workshop owner about becoming an apprentice.', 'Mara opens the workshop door after touching the plane.'], 'The lesson with her grandfather occurs in the remembered past.'],
      ['What is the effect of the flashback?', 'It explains Mara’s connection to woodworking and her next choice.', ['It reveals that the workshop has closed before Mara can enter it.', 'It introduces another apprentice who learned from Mara’s grandfather.', 'It moves the main action from the present into an imagined future.'], 'The memory links her grandfather, the tool, and her decision to apply.'],
      ['What happens immediately after Mara touches the plane?', 'She opens the door and asks about an apprenticeship.', ['Her grandfather buys the workshop.', 'The noon bell stops ringing and the workshop owner closes the door.', 'She returns to the earlier afternoon and continues smoothing the board.'], 'The final clause gives the next present-time actions.'],
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
      ['Which description of Jian is best supported?', 'He is assertive about respect while remaining considerate.', ['He avoids public speaking.', 'He wants the moderator punished instead of helping her improve.', 'He is unconcerned about whether speakers pronounce his name correctly.'], 'He corrects the error and provides help without hostility.'],
      ['Which action most clearly shows consideration?', 'He thanks the moderator and gives her a pronunciation card.', ['He attends the debate.', 'He smiles before beginning his speech at the following week’s event.', 'He waits until the debate has ended before writing his name on a card.'], 'The card helps prevent another mistake, while the thanks recognizes her work.'],
      ['Why does Jian smile the next week?', 'The corrected introduction shows that his respectful effort worked.', ['The moderator announces that the following week’s debate has been canceled.', 'Jian realizes he has forgotten the speech he intended to deliver.', 'The moderator repeats the same mispronunciation after ignoring Jian’s card.'], 'The successful correction resolves the small conflict established earlier.'],
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
      ['What primarily motivates Nora?', 'Keeping her promise to deliver the medicine', ['Avoiding every hill', 'Studying unfamiliar maps purely for entertainment', 'Reaching the flooded road before the sun sets'], 'The promised delivery is her goal and explains why she seeks another route.'],
      ['What internal conflict does Nora face?', 'Fear of the footbridge versus determination to continue', ['Two maps show different countries', 'A disagreement with the person who placed medicine in her backpack', 'Uncertainty about whether sunset occurs before or after the afternoon'], 'Her shaking hands show fear, while tightening the straps shows resolve.'],
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
      ['How does the weather affect Lio?', 'He protects the letter beneath his coat.', ['It fills the square with shoppers.', 'It prevents the tower clock from beginning its midnight chime.', 'It causes every dark shop along the square to open immediately.'], 'The rain creates a practical threat to the sealed letter.'],
      ['Which detail most directly establishes the late hour?', 'the tower clock began to strike at midnight', ['paper lanterns', 'loose shutters tapping against the fronts of darkened shops', 'rain making the market square’s stones appear silver'], 'The opening and tower clock identify midnight explicitly.'],
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
      ['Which theme is best supported?', 'Sharing imperfect work can encourage both the creator and others.', ['Every painting must remain unfinished.', 'Honest artists inevitably lose the respect of students who view their work.', 'Natural talent removes uncertainty before an artist displays a new creation.'], 'Salma’s vulnerable choice creates connection and gratitude.'],
      ['Which event most clearly develops the theme?', 'Salma displays the unfinished canvas despite her fear.', ['Visitors enter rooms.', 'The school exhibition remains open for the duration of one day.', 'A younger student notices that one corner of the canvas is blank.'], 'Her decision changes the plot and allows the positive response to occur.'],
      ['How does Salma change?', 'She moves from hiding her work to showing it publicly.', ['She stops painting forever.', 'She decides the blank corner is perfect and requires no further work.', 'She removes the appreciative notes before any visitors can read them.'], 'The opening and later action create a clear shift in behavior.'],
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
      ['What does “the station yawned awake” suggest?', 'The station gradually became active in the morning.', ['The building literally had a mouth.', 'The station remained permanently abandoned as morning arrived.', 'Every passenger on the platform became tired and fell asleep.'], 'Personification compares increasing activity to a person waking.'],
      ['What effect does “metal eyelid” create?', 'It compares a rising kiosk shutter to an opening eye.', ['It describes a passenger’s glasses.', 'It proves that the kiosk is a living creature capable of seeing.', 'It changes the setting from early dawn to the middle of the night.'], 'The metaphor continues the waking-station image.'],
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
      ['What point of view is used?', 'First person', ['Third person', 'Second-person instructions', 'An objective news report'], 'The narrator uses “I” and reports personal thoughts.'],
      ['How does the second sentence affect the story?', 'It creates tension by revealing that the narrator is withholding the truth.', ['It confirms that a classmate secretly stole the missing key during lunch.', 'It ends the search as soon as everyone learns where the key was found.', 'It shifts the account from a first-person narrator to third-person narration.'], 'Readers know the truth while the classmates continue an unnecessary search.'],
      ['What can the reader infer about the narrator?', 'The narrator feels guilty but is afraid to confess.', ['The narrator never found the key.', 'The narrator enjoys directing classmates to search under tables.', 'The narrator believes an apology is unnecessary because no one was harmed.'], 'Practicing an apology shows guilt; delaying it shows fear.'],
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
      ['What do the watch and seeds share?', 'Both connect a character to family memory.', ['Both are repaired by neighbors after being damaged by time.', 'Both remain hidden inside drawers whenever the characters move.', 'Both measure the passing of time for their current owners.'], 'The passage explicitly says both objects provide family connection.'],
      ['How do the objects function differently?', 'The watch supports private reflection, while the garden makes memory public.', ['The garden remains hidden in a drawer while the broken watch grows outdoors.', 'Only the watch has a family connection; the seeds came from an unknown garden.', 'Neither object influences a choice or creates a visible connection for others.'], 'The final contrast distinguishes hidden personal use from visible community presence.'],
      ['Which theme could both texts develop?', 'Family connections can guide people across time and change.', ['Meaningful objects eliminate every difficult choice a person must make.', 'Moving to a different city always destroys memories of family members.', 'Neighbors should repair inherited watches before planting family gardens.'], 'Each character carries a family connection into present life in a different form.'],
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
      ['What is the main claim?', 'The city should add a protected cycle lane on Harbor Road.', ['Bicycle counts on Harbor Road increased by 22 percent over two years.', 'A survey asked riders whether safety concerns affected their road use.', 'Harbor Road is one of the routes currently used by city cyclists.'], 'The recommendation is the position; the statistics support it.'],
      ['Which evidence addresses a safety barrier?', 'Sixty-one percent of surveyed riders avoid the road because they feel unsafe.', ['The proposal comes from a council member who has discussed transportation policy.', 'Harbor Road has an official name and is located within the city’s boundaries.', 'Bicycle counts were measured across a period lasting two full years.'], 'This result directly measures avoidance associated with perceived danger.'],
      ['What reasoning links the evidence to the claim?', 'A protected lane could respond to increased use and the safety concern limiting more use.', ['Every transportation survey is perfectly accurate regardless of its methods or sample.', 'Any road used by bicycles must remove all cars before ridership can increase.', 'The increase in bicycle counts caused the city’s population and economy to grow.'], 'The conclusion connects demand and safety evidence to the proposed design.'],
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
      ['Why is the evidence insufficient?', 'One student’s result cannot establish a guarantee for every student.', ['The example measures a mathematics score rather than a student’s opinion of tutoring.', 'The blog presents its claim and supporting example in grammatically complete sentences.', 'The student attended four tutoring sessions before the reported score increased.'], 'The universal claim requires broader, controlled evidence.'],
      ['Which new evidence would most strengthen the claim?', 'Results for many comparable students with and without the program', ['A detailed explanation of which mathematics topic the tutor personally enjoys most', 'A photograph showing the room where one student attended four tutoring sessions', 'A longer narrative describing the same student’s feelings after the score increased'], 'A larger comparison helps separate program effects from other explanations.'],
      ['Is the one student’s result relevant?', 'Yes, but it is too limited to support the broad guarantee.', ['No, because changes in mathematics scores can never serve as program evidence.', 'Yes, and one improved score conclusively proves the guarantee for every student.', 'No, because researchers cannot compare outcomes from tutoring programs.'], 'The example concerns the program’s intended outcome but lacks sufficient scope.'],
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
      ['What reasoning error appears first?', 'Treating events that occurred in sequence as proof of causation', ['Using month names without supplying the exact dates on which sales were recorded', 'Comparing restaurant sales with an identical total from the same group of businesses', 'Defining every important term before presenting the columnist’s conclusion'], 'The garden opened before sales rose, but timing alone does not establish cause.'],
      ['What assumption does the causal claim require?', 'No other factor better explains the restaurant sales increase.', ['Every restaurant mentioned in the column was already operating before the month of May.', 'Community gardens must contain plants that residents are permitted to maintain.', 'June follows May in the calendar used by the columnist and local restaurants.'], 'The omitted alternative causes must be ruled out or controlled.'],
      ['Why is the final sentence fallacious?', 'It attacks critics’ motives instead of addressing their evidence.', ['It supplies controlled research that rules out tourism and seasonal events.', 'It measures changes in visitor numbers, menu prices, and restaurant sales.', 'It narrows the original causal claim to one carefully defined group of businesses.'], 'Calling critics opponents of improvement avoids the causal question.'],
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
      ['How do the positions differ?', 'Text A favors weekly closure; Text B favors monthly closure with delivery access.', ['Both texts reject every car-free closure regardless of pedestrian counts or delivery needs.', 'Text A focuses only on shop deliveries, while Text B discusses only pedestrian totals.', 'Text B proposes closing Main Street to cars permanently on every day of the week.'], 'The frequency and delivery arrangement distinguish the proposals.'],
      ['Which evidence supports Text A?', 'Pedestrian counts rose 30 percent during the pilot.', ['Eight of twelve surveyed shops experienced delays in receiving their deliveries.', 'Text B recommends allowing timed delivery access during the morning hours.', 'The town has a street named Main Street where shops receive goods.'], 'The measured increase supports a benefit emphasized by Text A.'],
      ['How does Text B address a counterclaim?', 'It acknowledges delivery problems and proposes limited access.', ['It denies that the three-week pilot or its pedestrian increase ever occurred.', 'It repeats only the higher pedestrian count without considering shop deliveries.', 'It attacks the motives of every shop owner who reported a delivery delay.'], 'Text B responds to a cost with a specific compromise.'],
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
      ['Which thesis is most defensible?', 'Source A is better supported because it uses a year of outcome data, though its missing sample size limits certainty.', ['Later school starts are the better policy because students, including the writer, generally prefer sleeping longer.', 'The two sources provide identical evidence and reach exactly the same conclusion about changing start times.', 'Source B must be incorrect because transportation concerns can never matter when a school changes its schedule.'], 'The thesis makes a source-based judgment and recognizes a real limitation.'],
      ['Which plan best supports the thesis?', 'Compare time span and evidence type, explain why attendance data are stronger, then address the missing sample size.', ['Copy the claims and evidence from both sources in order without evaluating their quality or connection to the thesis.', 'Describe a personal memory about arriving late to school without analyzing either source’s reported evidence.', 'List grammar and punctuation rules while avoiding any judgment about the arguments or their limitations.'], 'The plan focuses on evidence quality and the reasoning behind the judgment.'],
      ['Why mention Source B’s transportation survey?', 'To address relevant counterevidence and explain its shorter time frame.', ['To avoid analyzing Source A’s full year of attendance evidence anywhere in the response.', 'To prove that survey evidence is never useful when writers compare competing arguments.', 'To replace a source-based thesis with a neutral summary that reaches no judgment.'], 'Acknowledging and evaluating counterevidence strengthens analysis.'],
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
      ['Which revision most improves analysis?', 'Add that the before-and-after results from 240 inspected homes directly measure whether repairs reduced energy use.', ['Repeat the sentence “Source A is better” several times without explaining how its evidence supports that judgment.', 'Delete the number of homes and the measured change in energy use so the paragraph focuses only on its conclusion.', 'Add a personal story about a household electricity bill that does not appear in either of the provided sources.'], 'The revision explains why the specific evidence makes Source A more convincing.'],
      ['What should the writer do before correcting commas?', 'Clarify the comparison and connect evidence to the thesis.', ['Replace every short word with a longer synonym even when the original word is clearer.', 'Copy several sentences from both source passages without explaining their significance.', 'Remove every transition so that the evidence appears as a list of unrelated statements.'], 'Higher-level revision of reasoning and organization should precede final proofreading.'],
      ['Which transition best introduces the opposing source?', 'By contrast, Source B offers a cost claim but no measured outcome.', ['For example, Source B presents the same measured outcome and fully agrees with Source A.', 'Similarly, the sources contain no meaningful difference in their evidence or conclusions.', 'Yesterday, the paragraph ends before either source provides relevant evidence.'], '“By contrast” accurately signals a comparison between different evidence.'],
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
      ['How should “The supervisor ... review” be revised?', 'The supervisor, along with two assistants, reviews the final order.', ['The supervisor, along with two assistants, reviewing the final order.', 'The supervisor, along with two assistants, have review the final order.', 'The supervisor, along with two assistants, review the final order.'], 'The interrupting phrase does not make the singular subject “supervisor” plural.'],
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
      ['What is the main problem with “she” in the first sentence?', 'It could refer to either Ana or Priya.', ['It is a plural pronoun that cannot refer to one person.', 'It appears without any verb in the sentence.', 'It can only refer to the outdated schedule.'], 'Two singular female antecedents make the reference ambiguous.'],
      ['How should “Priya and I” be revised?', 'Priya and me', ['Priya and myself', 'Priya and mine', 'No revision is needed'], 'The pronoun is an object of “asked”; “asked me” confirms the objective form.'],
      ['Which sentence has clear modern agreement?', 'Every employee should check their assigned shift before Friday.', ['Every employee should checks his assigned shift before Friday.', 'Every employee should check them assigned shift before Friday.', 'Every employee check its assigned shifts before Friday.'], 'Singular “they/their” clearly and concisely refers to an employee whose gender is unspecified.'],
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
      ['Which revision fixes the first sentence?', 'Walking into the laboratory, the students saw safety goggles on the shelf.', ['Walking into the laboratory, the shelf displayed several pairs of safety goggles.', 'The safety goggles, walking into the laboratory, appeared on the shelf.', 'Walking into the laboratory, the safety goggles were still on the shelf.'], 'The revision supplies “students” as the people walking.'],
      ['What does the original second sentence accidentally suggest?', 'The students were packed in sealed bags.', ['The instructor was wearing the gloves while speaking to the students.', 'The sealed bags had been opened before the instructor distributed them.', 'The laboratory contained no students when the instructor arrived.'], 'The modifier sits next to “students” instead of “gloves.”'],
      ['Which revision fixes the final sentence?', 'After reading the label carefully, the technician should store the bottle in the cabinet.', ['After reading the label carefully, the cabinet should store the bottle for the technician.', 'After reading the label carefully, the bottle should place the technician in the cabinet.', 'After the label reads carefully, the bottle should be stored inside the cabinet.'], 'The revision names the person who reads and stores.'],
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
      ['Which revision makes the first series parallel?', 'Volunteers will greet visitors, record attendance, and answer questions.', ['Volunteers will greeting visitors, record attendance, and answers questions.', 'Volunteers greet visitors, recording attendance, and will answers questions.', 'Volunteers will greet visitors, recording attendance, and they answer questions.'], 'Three base-form verbs follow “will” in matching form.'],
      ['Which revision makes the requirements parallel?', 'patience, reliability, and clear communication', ['patient, reliability, and communicating clearly', 'patience, being reliable, and clearly', 'patience, reliable, and communication clear'], 'All three items become nouns or noun phrases.'],
      ['How should the final choice be revised?', 'submit the form online or mail it to the office', ['submitting the form online or mail it to the office', 'submit the form online or mailing it to the office', 'to submit the form online or mailed it to the office'], 'The two alternatives use matching base-form verbs.'],
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
      ['Which revision fixes the comma splice?', 'The outdoor concert continued, although the rain became heavier.', ['The outdoor concert continued, the rain became much heavier.', 'Although the outdoor concert continued during the heavier rain.', 'The outdoor concert continued, and although the heavier rain.'], '“Although” makes the rain clause dependent and expresses contrast.'],
      ['How should “Because the stage was covered.” be revised?', 'Because the stage was covered, the musicians remained dry.', ['Because the stage. The musicians remained dry under the cover.', 'The stage because covered while the musicians remained dry.', 'Because the stage was covered. The musicians remaining dry.'], 'The dependent because-clause is attached to the result it explains.'],
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
      ['Which is the most concise first sentence?', 'The committee reached a conclusion at the end of the meeting.', ['At the end of the meeting, the committee finally reached its final conclusion.', 'When the meeting reached its final end, the committee concluded a conclusion.', 'The committee reached a final and concluding conclusion when the meeting ended.'], '“Final conclusion” is redundant; the revision keeps the timing.'],
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
      ['Which revision correctly opens the announcement?', 'On Saturday, the workers’ lounge will close for repairs; employees can use the library’s meeting room.', ['on saturday the workers lounge will close for repairs, employees can use the librarys meeting room.', 'On Saturday the worker’s lounge closing for repairs; employees using the library’s meeting room.', 'On saturday; the workers lounge will close for repairs employees can use the librarys meeting room.'], 'The revision capitalizes, uses the plural possessive and singular possessive correctly, and joins two independent clauses with a semicolon.'],
      ['How should the second sentence be punctuated?', 'The room has tables, chairs, and a printer; however, food isn’t permitted.', ['The room has tables chairs and a printer, however food isnt permitted in the meeting room.', 'The room has; tables, chairs and a printer however food, isn’t permitted in the meeting room.', 'The room has tables chairs, and a printer however; food isnt permitted in the meeting room.'], 'Commas separate the series, a semicolon precedes the conjunctive adverb, and an apostrophe forms “isn’t.”'],
      ['How should the final fragment be corrected?', 'After the repairs are complete, the lounge will reopen.', ['After the repairs are complete, and the workers’ lounge.', 'The repairs after complete, the lounge will reopening.', 'After, the repairs, are complete the lounge reopening.'], 'The dependent opening clause now attaches to a complete independent clause.'],
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
