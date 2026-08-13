import type { OfficialLanguageQuestChallenge, OfficialLanguageQuestCourse } from './languageQuestImportedCourses';

type Visual =
  | { type: 'process'; title: string; steps: string[]; caption?: string }
  | { type: 'table'; title: string; headers: string[]; rows: string[][]; caption?: string }
  | { type: 'bar'; title: string; items: Array<{ label: string; value: number; unit?: string }>; caption?: string }
  | { type: 'line'; title: string; points: Array<{ x: number; y: number; label?: string }>; xLabel: string; yLabel: string; caption?: string }
  | { type: 'compare'; title: string; leftTitle: string; rightTitle: string; left: string[]; shared?: string[]; right: string[] }
  | { type: 'evidence'; title: string; claim: string; evidence: string[]; reasoning: string };

type Question = [question: string, correct: string, distractors: [string, string, string], explanation: string];

interface LessonSeed {
  title: string;
  summary: string;
  objectives: string[];
  explanation: [string, string];
  visual: Visual;
  keyTerms: Array<{ marker: string; text: string }>;
  gedStrategy: string;
  checkpoint: string;
  questions: [Question, Question, Question];
}

const PREFIX = 'SOCIAL_STUDIES_V1::';

function encode(seed: LessonSeed): string {
  return PREFIX + JSON.stringify({
    version: 1,
    subject: 'social-studies',
    summary: seed.summary,
    objectives: seed.objectives,
    explanation: seed.explanation,
    visual: seed.visual,
    keyTerms: seed.keyTerms,
    gedStrategy: seed.gedStrategy,
    checkpoint: seed.checkpoint,
  });
}

function challenges(seed: LessonSeed): OfficialLanguageQuestChallenge[] {
  return seed.questions.map(([question, correct, distractors, explanation], index) => {
    const options = [correct, ...distractors];
    const shift = index % options.length;
    const rotated = [...options.slice(shift), ...options.slice(0, shift)];
    return {
      type: 'SELECT',
      question,
      explanation,
      hint: 'Use the source, labels, timeline, quantities, or civic principle in the learning section before choosing.',
      options: rotated.map((text) => ({ text, correct: text === correct, emoji: null, audioText: null })),
    };
  });
}

function lesson(seed: LessonSeed) {
  return {
    title: seed.title,
    description: seed.summary,
    conceptIntro: encode(seed),
    challenges: challenges(seed),
  };
}

const civics: LessonSeed[] = [
  {
    title: 'Primary and Secondary Sources',
    summary: 'Primary sources come from the time or participants being studied; secondary sources interpret evidence after the fact.',
    objectives: ['Classify common source types', 'Use origin and purpose to evaluate a source', 'Avoid treating every firsthand account as complete'],
    explanation: ['A letter, law, speech, photograph, or diary can be primary evidence. A later textbook or historian’s analysis is usually secondary evidence.', 'Primary does not automatically mean unbiased. Ask who created the source, when, for whom, and why; then corroborate it with other evidence.'],
    visual: { type: 'table', title: 'Source classification', headers: ['Source', 'Likely type', 'Reason'], rows: [['Election speech recorded that day', 'Primary', 'Created during the event'], ['Later scholarly history', 'Secondary', 'Interprets earlier evidence'], ['Government census table', 'Primary data', 'Official record produced by the survey']] },
    keyTerms: [{ marker: 'primary source', text: 'evidence created during an event or by a participant' }, { marker: 'secondary source', text: 'later interpretation based on primary and other sources' }, { marker: 'corroborate', text: 'check one source against other evidence' }],
    gedStrategy: 'Read the attribution line before the passage. Date, author, audience, and source type can explain point of view.',
    checkpoint: 'Would a diary be useful evidence even if it gives only one person’s perspective?',
    questions: [
      ['Which item is most clearly a primary source?', 'A court ruling issued when the case was decided', ['A modern textbook chapter', 'A documentary made decades later', 'A historian’s journal article'], 'The ruling is an official record created as part of the event being studied.'],
      ['Why should a firsthand account be corroborated?', 'Its author may have limited knowledge or a particular viewpoint', ['Primary sources are always fictional', 'Old documents contain no evidence', 'Secondary sources never use facts'], 'Firsthand access can be valuable without making the account complete or neutral.'],
      ['Which detail best helps identify a source’s purpose?', 'Its intended audience and reason for publication', ['Its page color', 'Its paragraph count', 'Its file size'], 'Audience and publication purpose help explain what the author hoped to accomplish.'],
    ],
  },
  {
    title: 'Central Ideas, Claims, and Inferences',
    summary: 'Strong social studies reasoning separates what a source states directly from what its evidence reasonably implies.',
    objectives: ['Identify a central idea', 'Distinguish claims from supporting evidence', 'Make evidence-limited inferences'],
    explanation: ['A central idea should account for the source’s major details. A claim is a conclusion or position; evidence is the information used to support it.', 'An inference goes beyond an explicit statement but must remain anchored to the source. Avoid answers that add assumptions the passage cannot support.'],
    visual: { type: 'evidence', title: 'Reasoning from a public notice', claim: 'The city expects bus use to rise.', evidence: ['Two new routes begin next month', 'Service frequency will increase', 'The city added sheltered stops'], reasoning: 'The coordinated expansion supports an expectation of greater use, even if the notice does not state an exact ridership forecast.' },
    keyTerms: [{ marker: 'central idea', text: 'the broad point supported by the main details' }, { marker: 'claim', text: 'a conclusion or position that can be evaluated' }, { marker: 'inference', text: 'a conclusion logically drawn from evidence' }],
    gedStrategy: 'Paraphrase the source in one sentence, then test every answer against at least one specific detail.',
    checkpoint: 'Which is safer: an inference supported by two details or a broad guess based on background knowledge?',
    questions: [
      ['What makes a central-idea answer strongest?', 'It accounts for most of the source’s important details', ['It repeats one minor example', 'It introduces a new topic', 'It uses the most dramatic wording'], 'A central idea must cover the source broadly without exceeding its evidence.'],
      ['Which statement is evidence rather than a claim?', 'The report records a 12 percent increase in turnout', ['Turnout will always rise', 'The policy was unquestionably successful', 'The campaign caused every voter to participate'], 'A recorded measurement is evidence; the other options make conclusions.'],
      ['When is an inference valid?', 'When source details logically support it', ['When it sounds familiar', 'When it is more specific than the source', 'When no evidence contradicts a guess'], 'Valid inferences follow from the provided evidence.'],
    ],
  },
  {
    title: 'Forms of Government',
    summary: 'Governments differ in who holds power, how leaders are selected, and how authority is limited.',
    objectives: ['Compare democracy, monarchy, and authoritarian rule', 'Distinguish direct and representative democracy', 'Identify parliamentary and presidential structures'],
    explanation: ['In a direct democracy, citizens vote on policies; in a representative democracy, they elect officials to make decisions. Constitutional monarchies limit a monarch through law.', 'Presidential systems separate the executive from the legislature. Parliamentary systems generally form an executive from the legislative majority or coalition.'],
    visual: { type: 'compare', title: 'Two democratic structures', leftTitle: 'Presidential', rightTitle: 'Parliamentary', left: ['separately elected executive', 'fixed executive term is common'], shared: ['elections', 'representative institutions', 'rule-bound authority'], right: ['executive emerges from legislature', 'government may depend on legislative confidence'] },
    keyTerms: [{ marker: 'democracy', text: 'government in which political authority ultimately comes from the people' }, { marker: 'authoritarian', text: 'system concentrating power with limited public accountability' }, { marker: 'constitutional monarchy', text: 'monarchy whose powers are constrained by a constitution and laws' }],
    gedStrategy: 'Identify the power relationship described instead of relying only on the country or leader named.',
    checkpoint: 'If voters choose legislators who then select a prime minister, which democratic structure is likely?',
    questions: [
      ['Which feature best identifies representative democracy?', 'Citizens elect officials to make public decisions', ['One ruler inherits unlimited power', 'Military leaders cancel elections', 'Citizens vote personally on every law'], 'Representative democracy operates through elected decision-makers.'],
      ['What commonly distinguishes a parliamentary system?', 'The executive is formed from the legislature', ['Courts write every law', 'Citizens cannot vote', 'States possess no local authority'], 'Parliamentary executives normally depend on legislative support.'],
      ['Which system most clearly concentrates power without competitive accountability?', 'An authoritarian government', ['A constitutional democracy', 'A representative republic', 'A federal democracy'], 'Authoritarian systems restrict meaningful checks and public competition for power.'],
    ],
  },
  {
    title: 'Natural Rights and Popular Sovereignty',
    summary: 'American constitutional democracy draws on the ideas that people possess rights and legitimate government depends on their consent.',
    objectives: ['Explain natural rights', 'Connect consent to popular sovereignty', 'Recognize majority rule with minority rights'],
    explanation: ['Natural-rights philosophy treats certain rights as belonging to people rather than being gifts from a ruler. The Declaration used this reasoning to challenge government without consent.', 'Popular sovereignty means political authority originates with the people. Majority decisions remain limited by constitutional protections for individuals and minorities.'],
    visual: { type: 'process', title: 'Legitimate democratic authority', steps: ['People possess rights', 'People grant limited authority', 'Government acts under law', 'People hold government accountable'] },
    keyTerms: [{ marker: 'natural rights', text: 'rights understood as inherent to persons' }, { marker: 'popular sovereignty', text: 'the people are the ultimate source of governmental authority' }, { marker: 'consent', text: 'agreement of the governed to legitimate authority' }],
    gedStrategy: 'When a passage discusses “the people” as the source of power, connect it to consent and popular sovereignty.',
    checkpoint: 'Why does majority rule alone not fully define constitutional democracy?',
    questions: [
      ['Which principle says government authority comes from the people?', 'Popular sovereignty', ['Judicial review', 'Hereditary rule', 'Command economy'], 'Popular sovereignty locates ultimate political authority in the people.'],
      ['Why are minority rights important in a democracy?', 'They limit what a majority may do to protected individuals or groups', ['They eliminate elections', 'They give every policy to courts', 'They require unanimous voting'], 'Constitutional protections prevent majority power from becoming unlimited.'],
      ['Which statement best reflects natural-rights philosophy?', 'People possess basic rights that government must respect', ['Rulers create every human right', 'Rights exist only during elections', 'Only property owners have legal protection'], 'Natural rights are understood as inherent rather than granted at a ruler’s discretion.'],
    ],
  },
  {
    title: 'Constitutionalism and Rule of Law',
    summary: 'A constitution creates and limits public authority, while rule of law requires officials and citizens to operate under known laws.',
    objectives: ['Explain limited government', 'Distinguish rule of law from rule by personal command', 'Apply constitutional limits to scenarios'],
    explanation: ['Constitutionalism means government power is structured and constrained by higher law. Written rules define institutions, procedures, and protected rights.', 'Rule of law rejects arbitrary government. Laws should be public, applied through fair procedures, and binding on officials as well as ordinary people.'],
    visual: { type: 'table', title: 'Rule-of-law check', headers: ['Question', 'Healthy sign'], rows: [['Are rules public?', 'People can know obligations'], ['Are officials bound?', 'Power is not personal'], ['Is process consistent?', 'Similar cases receive fair procedures'], ['Can decisions be reviewed?', 'Errors and abuses can be challenged']] },
    keyTerms: [{ marker: 'constitutionalism', text: 'government organized and limited by a constitution' }, { marker: 'rule of law', text: 'law governs public power rather than personal whim' }, { marker: 'arbitrary', text: 'based on uncontrolled choice rather than stable rules' }],
    gedStrategy: 'Look for whether the scenario limits authority through rules and procedures, not whether you agree with the policy outcome.',
    checkpoint: 'If an official can ignore a published law without review, which principle is weakened?',
    questions: [
      ['Which situation best demonstrates rule of law?', 'A court applies the same published procedure to officials and citizens', ['A leader changes penalties secretly', 'An agency ignores its legal limits', 'A mayor decides cases personally'], 'Rule of law requires public, consistent rules that bind officials too.'],
      ['What is a central purpose of constitutionalism?', 'To define and limit governmental power', ['To abolish public institutions', 'To guarantee every policy succeeds', 'To remove all disagreement'], 'Constitutionalism structures authority and places enforceable limits on it.'],
      ['Which action is most arbitrary?', 'Punishing conduct under a secret rule created afterward', ['Publishing regulations before enforcement', 'Allowing an appeal', 'Following an established hearing process'], 'Secret, retroactive punishment depends on uncontrolled power rather than known law.'],
    ],
  },
  {
    title: 'Separation of Powers',
    summary: 'The Constitution assigns legislative, executive, and judicial functions to different branches to diffuse power.',
    objectives: ['Identify the core work of each branch', 'Explain why powers are separated', 'Distinguish separation from checks and balances'],
    explanation: ['Article I vests legislative power in Congress, Article II executive power in the President, and Article III judicial power in the federal courts.', 'The branches are distinct but not completely isolated. Separation identifies their primary functions; checks and balances describe ways one branch can constrain another.'],
    visual: { type: 'table', title: 'Federal branch functions', headers: ['Branch', 'Core function', 'Example'], rows: [['Legislative', 'Makes laws', 'Congress passes a bill'], ['Executive', 'Carries out laws', 'An agency implements a program'], ['Judicial', 'Resolves cases under law', 'A court interprets a statute']] },
    keyTerms: [{ marker: 'legislative', text: 'concerned with making laws' }, { marker: 'executive', text: 'concerned with administering laws' }, { marker: 'judicial', text: 'concerned with resolving legal cases' }],
    gedStrategy: 'Translate the action into a verb—make, execute, or interpret law—then match it to the branch.',
    checkpoint: 'Which branch’s core function is to pass federal legislation?',
    questions: [
      ['Which branch has the core function of making federal laws?', 'The legislative branch', ['The executive branch', 'The judicial branch', 'The state courts only'], 'Congress is the federal legislative branch.'],
      ['Why does the Constitution separate powers?', 'To reduce the risk of concentrated, arbitrary authority', ['To prevent all cooperation', 'To eliminate elections', 'To place every function in one office'], 'Diffusing functions makes concentrated power harder to exercise.'],
      ['Which action is primarily executive?', 'A department administers a law passed by Congress', ['The Senate passes a bill', 'A court decides a case', 'A convention proposes an amendment'], 'Administering enacted law is an executive function.'],
    ],
  },
  {
    title: 'Checks and Balances',
    summary: 'Checks and balances give each branch specific tools to limit or respond to actions by the others.',
    objectives: ['Recognize common constitutional checks', 'Trace a bill through shared powers', 'Explain how checks differ from branch functions'],
    explanation: ['A president may veto legislation, Congress may override a veto with the required supermajority, and courts may review legal questions presented in cases.', 'Checks create friction by design. They can slow decisions, but they also require multiple institutions to participate in major exercises of power.'],
    visual: { type: 'process', title: 'One lawmaking check', steps: ['Congress passes bill', 'President signs or vetoes', 'Congress may attempt override', 'Courts may later hear a legal challenge'] },
    keyTerms: [{ marker: 'veto', text: 'executive rejection of legislation' }, { marker: 'override', text: 'legislative action overcoming a veto with the required vote' }, { marker: 'check', text: 'constitutional power one institution uses to constrain another' }],
    gedStrategy: 'Name both institutions in a check: who acts first and who has the responding power?',
    checkpoint: 'A presidential veto checks which branch’s lawmaking power?',
    questions: [
      ['Which example is a check by the executive on the legislature?', 'The president vetoes a bill', ['Congress holds a hearing', 'A court hears an appeal', 'A state conducts an election'], 'The veto allows the executive to reject legislation passed by Congress.'],
      ['What can Congress do after a presidential veto?', 'Attempt an override with the constitutionally required vote', ['Order a court to ignore the Constitution', 'Cancel all future elections', 'Replace the veto with an executive order'], 'The Constitution permits a congressional override when the required supermajority agrees.'],
      ['What is the main effect of checks and balances?', 'Major powers are shared and constrained across institutions', ['One branch becomes legally unlimited', 'Every branch performs identical work', 'Public laws become unnecessary'], 'Checks require institutions to respond to and limit one another.'],
    ],
  },
  {
    title: 'Federalism',
    summary: 'Federalism divides and shares authority between the national government and state governments.',
    objectives: ['Distinguish federal, state, and shared powers', 'Explain dual political accountability', 'Apply federalism to policy examples'],
    explanation: ['The federal government has powers granted by the Constitution; states retain broad authority in many areas of local concern, subject to constitutional limits.', 'Some powers overlap. Both levels tax and spend, while the Constitution and federal law govern conflicts within the scope of valid federal authority.'],
    visual: { type: 'compare', title: 'Federalism examples', leftTitle: 'Federal focus', rightTitle: 'State focus', left: ['currency', 'national defense', 'treaties'], shared: ['taxation', 'courts', 'public spending'], right: ['local government structure', 'most licensing', 'many election rules'] },
    keyTerms: [{ marker: 'federalism', text: 'division and sharing of power between national and state governments' }, { marker: 'reserved power', text: 'authority retained by states or the people' }, { marker: 'concurrent power', text: 'authority exercised by both levels' }],
    gedStrategy: 'Do not assume every issue belongs to only one level; look for shared authority and constitutional limits.',
    checkpoint: 'Taxation by both national and state governments illustrates which kind of power?',
    questions: [
      ['Which statement best defines federalism?', 'Power is divided and shared between national and state governments', ['All power belongs to cities', 'Courts control every election', 'States conduct foreign treaties independently'], 'Federalism creates two constitutionally significant levels of government.'],
      ['Which is a concurrent power?', 'Collecting taxes', ['Coining national currency', 'Negotiating treaties', 'Declaring war'], 'Both federal and state governments collect taxes.'],
      ['Why can federalism increase accountability?', 'Citizens can evaluate officials at more than one level of government', ['It removes state elections', 'It guarantees identical laws everywhere', 'It makes courts unnecessary'], 'Separate levels create distinct lines of political responsibility.'],
    ],
  },
  {
    title: 'Congress and Lawmaking',
    summary: 'Congress is a bicameral legislature whose two chambers represent people and states through different structures.',
    objectives: ['Compare the House and Senate', 'Sequence the federal lawmaking process', 'Identify legislative oversight and revenue roles'],
    explanation: ['The House apportions seats by population and members serve two-year terms. Each state has two senators, and senators serve six-year terms.', 'Both chambers generally must pass the same bill before it goes to the president. Committees investigate, revise proposals, and conduct oversight.'],
    visual: { type: 'table', title: 'Congress at a glance', headers: ['Feature', 'House', 'Senate'], rows: [['Representation', 'By state population', 'Two per state'], ['Term', '2 years', '6 years'], ['Special role', 'Originates revenue bills', 'Advice and consent on many appointments/treaties']] },
    keyTerms: [{ marker: 'bicameral', text: 'having two legislative chambers' }, { marker: 'apportionment', text: 'distribution of House seats by population' }, { marker: 'oversight', text: 'legislative review of executive administration' }],
    gedStrategy: 'For chamber questions, focus on representation, term length, and specifically assigned constitutional roles.',
    checkpoint: 'Which chamber gives every state equal representation?',
    questions: [
      ['How is representation in the House primarily determined?', 'By state population', ['Two members per state', 'By presidential appointment', 'By the number of counties'], 'House seats are apportioned among states by population.'],
      ['What must normally happen before a bill goes to the president?', 'Both chambers pass the same text', ['Only one committee approves it', 'The Supreme Court signs it', 'Every state legislature ratifies it'], 'Federal legislation must pass both the House and Senate in identical form.'],
      ['Which chamber gives each state two members?', 'The Senate', ['The House', 'The Cabinet', 'The Supreme Court'], 'The Constitution provides equal state representation in the Senate.'],
    ],
  },
  {
    title: 'The Presidency and Executive Branch',
    summary: 'The president leads the executive branch, which enforces laws and administers federal programs through departments and agencies.',
    objectives: ['Identify constitutional executive roles', 'Distinguish execution from legislation', 'Evaluate limits on executive action'],
    explanation: ['The president serves as chief executive and commander in chief, may veto bills, appoints many officials with Senate participation, and conducts diplomacy within constitutional arrangements.', 'Executive orders direct executive operations but cannot validly replace the Constitution or an act of Congress. Agencies implement statutes under delegated authority.'],
    visual: { type: 'process', title: 'From statute to administration', steps: ['Congress enacts law', 'President oversees execution', 'Agency issues lawful procedures', 'Program operates', 'Congress and courts may review'] },
    keyTerms: [{ marker: 'chief executive', text: 'the official responsible for leading execution of federal law' }, { marker: 'agency', text: 'executive organization administering a defined area of law' }, { marker: 'executive order', text: 'presidential directive governing executive operations' }],
    gedStrategy: 'Ask whether the action carries out existing authority or attempts to create a new law.',
    checkpoint: 'Why must an agency connect a regulation to authority granted by law?',
    questions: [
      ['Which action is a core executive responsibility?', 'Administering laws enacted by Congress', ['Writing constitutional amendments alone', 'Serving as the final appellate court', 'Apportioning House seats without a census'], 'The executive branch carries enacted law into operation.'],
      ['What limits an executive order?', 'The Constitution and valid federal statutes', ['Only public opinion polls', 'No legal limits exist', 'County ordinances alone'], 'Executive directives must remain within lawful presidential authority.'],
      ['Who is commander in chief of the armed forces?', 'The president', ['The chief justice', 'The speaker of the House', 'The secretary of the Senate'], 'Article II assigns the commander-in-chief role to the president.'],
    ],
  },
  {
    title: 'Federal Courts and Judicial Review',
    summary: 'Federal courts decide cases within their jurisdiction and may determine whether government action conflicts with the Constitution.',
    objectives: ['Explain judicial review', 'Distinguish trial and appellate work', 'Recognize judicial independence and limits'],
    explanation: ['Trial courts develop records and decide facts and law; appellate courts review claimed legal errors. The Supreme Court is the highest federal court.', 'Judicial review allows courts in proper cases to decline enforcement of unconstitutional government action. Courts depend on cases, legal arguments, and enforceable judgments rather than initiating policy programs.'],
    visual: { type: 'process', title: 'Simplified federal court path', steps: ['Federal trial court', 'Federal court of appeals', 'Supreme Court review may be requested'] },
    keyTerms: [{ marker: 'jurisdiction', text: 'legal authority of a court to hear a case' }, { marker: 'appeal', text: 'request for higher-court review of a legal decision' }, { marker: 'judicial review', text: 'court review of government action for constitutional consistency' }],
    gedStrategy: 'Separate “unpopular” from “unconstitutional”; judicial review concerns legal validity, not simple policy preference.',
    checkpoint: 'Which court level ordinarily creates the initial factual record?',
    questions: [
      ['What does judicial review allow a court to do?', 'Assess whether government action conflicts with the Constitution', ['Write any law it prefers', 'Conduct elections', 'Command state legislatures to vote'], 'Judicial review addresses the constitutional validity of government action in a case.'],
      ['What is the primary role of an appellate court?', 'Review claimed legal errors in a lower-court decision', ['Collect federal taxes', 'Create the original census', 'Negotiate treaties'], 'Appellate courts review lower-court proceedings and legal rulings.'],
      ['What does jurisdiction mean?', 'A court’s legal authority to hear a matter', ['A judge’s popularity', 'The length of a statute', 'The number of voters in a district'], 'Jurisdiction defines the matters a court may decide.'],
    ],
  },
  {
    title: 'The Amendment Process',
    summary: 'Article V makes constitutional change possible but requires broader agreement than ordinary legislation.',
    objectives: ['Distinguish amendment from ordinary lawmaking', 'Sequence proposal and ratification', 'Explain the role of supermajorities and states'],
    explanation: ['An amendment may be proposed by two-thirds of both houses of Congress or by a convention called after applications from two-thirds of state legislatures.', 'Ratification requires approval by three-fourths of the states through the method Congress specifies. The president does not sign constitutional amendments.'],
    visual: { type: 'process', title: 'Common amendment route', steps: ['Two-thirds of House proposes', 'Two-thirds of Senate agrees', 'States consider proposal', 'Three-fourths ratify', 'Amendment becomes part of Constitution'] },
    keyTerms: [{ marker: 'amendment', text: 'formal change or addition to the Constitution' }, { marker: 'propose', text: 'formally put forward for consideration' }, { marker: 'ratify', text: 'give final approval through the constitutional process' }],
    gedStrategy: 'Keep proposal and ratification separate; proposal starts the process, while state ratification completes it.',
    checkpoint: 'Does the president’s signature form part of Article V ratification?',
    questions: [
      ['What is required after Congress proposes an amendment by the necessary vote?', 'Ratification by three-fourths of the states', ['A presidential signature', 'A simple national referendum', 'Approval by every federal judge'], 'State ratification at the three-fourths threshold completes the common route.'],
      ['Why is amendment harder than passing an ordinary law?', 'It requires supermajority proposal and broad state agreement', ['It uses no written procedure', 'Only one chamber participates', 'It can occur by executive order'], 'Article V intentionally demands unusually broad agreement.'],
      ['Which statement is correct about the president and amendments?', 'The president does not sign or veto proposed constitutional amendments', ['The president ratifies for all states', 'The president may amend the Constitution alone', 'The president replaces state ratification'], 'Article V assigns proposal and ratification roles without presidential approval.'],
    ],
  },
  {
    title: 'The Bill of Rights',
    summary: 'The first ten amendments protect important liberties and place limits on governmental power.',
    objectives: ['Match major protections to amendments', 'Distinguish protected liberty from unlimited conduct', 'Interpret rights in a factual scenario'],
    explanation: ['The First Amendment protects religion, speech, press, assembly, and petition. Other amendments address arms, searches, criminal procedure, jury rights, punishment, unenumerated rights, and reserved powers.', 'Rights operate through legal standards and can involve competing interests. On the GED, focus on the amendment language and facts provided rather than assuming every restriction is valid or invalid.'],
    visual: { type: 'table', title: 'Selected protections', headers: ['Amendment', 'Core area'], rows: [['1st', 'Religion, speech, press, assembly, petition'], ['4th', 'Unreasonable searches and seizures'], ['5th', 'Due process and protections in criminal procedure'], ['6th', 'Rights in criminal prosecutions'], ['8th', 'Bail, fines, and cruel and unusual punishment']] },
    keyTerms: [{ marker: 'civil liberty', text: 'freedom protected from unjustified government interference' }, { marker: 'petition', text: 'request that government address a grievance' }, { marker: 'warrant', text: 'court authorization meeting legal requirements for a search or seizure' }],
    gedStrategy: 'Underline the government action and the protected activity before matching the scenario to an amendment.',
    checkpoint: 'Which amendment expressly protects peaceful assembly?',
    questions: [
      ['Which freedom is expressly protected by the First Amendment?', 'Peaceful assembly', ['Trial by jury in civil cases', 'Protection from unreasonable searches', 'Protection from double jeopardy'], 'Assembly is one of the five freedoms expressly listed in the First Amendment.'],
      ['Which amendment centers on unreasonable searches and seizures?', 'The Fourth Amendment', ['The First Amendment', 'The Seventh Amendment', 'The Tenth Amendment'], 'The Fourth Amendment regulates searches and seizures.'],
      ['What is the Bill of Rights?', 'The first ten amendments to the Constitution', ['The original Articles of Confederation', 'Every federal statute', 'A list of presidential orders'], 'The Bill of Rights is the name for Amendments One through Ten.'],
    ],
  },
  {
    title: 'Due Process and Equal Protection',
    summary: 'The Fourteenth Amendment restricts state action through due process and equal protection guarantees.',
    objectives: ['Explain procedural fairness', 'Identify equal-protection questions', 'Connect the Fourteenth Amendment to civil-rights development'],
    explanation: ['Due process requires government to use constitutionally adequate procedures before depriving a person of life, liberty, or property and also protects certain fundamental liberties.', 'Equal protection requires states to govern consistently with constitutional equality. Courts examine classifications and the governmental reasons offered for them.'],
    visual: { type: 'compare', title: 'Two Fourteenth Amendment guarantees', leftTitle: 'Due process', rightTitle: 'Equal protection', left: ['notice and fair procedure', 'protected liberty'], shared: ['limits state government', 'enforced through constitutional review'], right: ['government classifications', 'equal treatment under law'] },
    keyTerms: [{ marker: 'due process', text: 'constitutional guarantee against unjust deprivation through inadequate law or procedure' }, { marker: 'equal protection', text: 'constitutional requirement that state classifications comply with equality guarantees' }, { marker: 'incorporation', text: 'application of many Bill of Rights protections to states through the Fourteenth Amendment' }],
    gedStrategy: 'Ask whether the problem concerns an unfair procedure, unequal classification, or both.',
    checkpoint: 'A hearing held without notice most directly raises which concern?',
    questions: [
      ['A state cancels a license without notice or a hearing. What issue is most direct?', 'Procedural due process', ['Treaty power', 'Legislative apportionment', 'Monetary policy'], 'Notice and an opportunity to be heard are core procedural concerns.'],
      ['Which amendment expressly limits states through equal protection?', 'The Fourteenth Amendment', ['The Second Amendment', 'The Seventh Amendment', 'The Twelfth Amendment'], 'The Equal Protection Clause appears in Section 1 of the Fourteenth Amendment.'],
      ['What question is central to equal-protection analysis?', 'Whether a government classification is constitutionally justified', ['Whether a bill has a title', 'Whether prices increased', 'Whether a map has a legend'], 'Equal protection evaluates governmental distinctions among persons or groups.'],
    ],
  },
  {
    title: 'Civic Participation and Responsibilities',
    summary: 'Democratic self-government depends on legal rights, informed participation, and responsibilities shared by community members.',
    objectives: ['Distinguish rights from responsibilities', 'Compare forms of civic participation', 'Evaluate evidence before public action'],
    explanation: ['Voting, petitioning, peaceful assembly, public comment, jury service, community work, and contacting representatives connect people to public decisions.', 'Some duties are legally required, while other responsibilities are civic expectations. Informed participation includes checking sources and considering effects on others.'],
    visual: { type: 'table', title: 'Participation pathways', headers: ['Action', 'Purpose'], rows: [['Vote', 'Choose representatives or decide ballot questions'], ['Petition', 'Request government action'], ['Public comment', 'Provide evidence or views on a proposal'], ['Jury service', 'Participate in administration of justice']] },
    keyTerms: [{ marker: 'civic duty', text: 'responsibility required by law, such as obeying law or serving when properly summoned' }, { marker: 'civic responsibility', text: 'expected contribution to informed community life' }, { marker: 'public comment', text: 'formal opportunity to respond to proposed public action' }],
    gedStrategy: 'Match the participation method to the decision-maker: voters, legislators, agencies, courts, or local boards.',
    checkpoint: 'Which action most directly communicates a policy request to an elected representative?',
    questions: [
      ['Which activity is a form of civic participation?', 'Giving evidence at a public hearing', ['Ignoring all public notices', 'Preventing others from voting', 'Spreading an unverified claim'], 'Public hearings provide a structured opportunity to participate in government decisions.'],
      ['Which is generally a legal civic duty when properly required?', 'Serving on a jury after receiving a valid summons', ['Joining a political party', 'Attending every council meeting', 'Donating to a campaign'], 'Jury service can be legally required; the other activities are voluntary.'],
      ['What supports informed participation?', 'Checking the credibility and relevance of evidence', ['Using only anonymous rumors', 'Rejecting every opposing source', 'Assuming correlation proves causation'], 'Source evaluation improves the quality of civic decisions.'],
    ],
  },
  {
    title: 'Political Parties and Interest Groups',
    summary: 'Parties seek to win public office, while interest groups chiefly seek to influence policy and public opinion.',
    objectives: ['Compare parties and interest groups', 'Recognize coalition building', 'Evaluate claims about political influence'],
    explanation: ['Political parties recruit candidates, organize voters, and develop platforms. Interest groups may lobby, conduct research, mobilize members, or communicate positions.', 'Neither label proves credibility. Evaluate the evidence, funding, expertise, methods, and disclosed interests of any political organization.'],
    visual: { type: 'compare', title: 'Political organizations', leftTitle: 'Political party', rightTitle: 'Interest group', left: ['nominates candidates', 'seeks governing office', 'broad platform'], shared: ['mobilizes supporters', 'communicates policy views', 'tries to shape public decisions'], right: ['focuses on issues or constituencies', 'lobbies officeholders', 'does not usually nominate a full slate'] },
    keyTerms: [{ marker: 'party platform', text: 'formal statement of a party’s principles and policy positions' }, { marker: 'interest group', text: 'organization seeking to influence public policy' }, { marker: 'lobbying', text: 'communication intended to influence public officials or policy' }],
    gedStrategy: 'Identify the organization’s primary goal: winning office or influencing people who hold office.',
    checkpoint: 'An organization that researches one issue and briefs lawmakers is most likely what kind of group?',
    questions: [
      ['What is a primary goal of a political party?', 'Winning elections and organizing government', ['Deciding court cases', 'Calculating the CPI', 'Drawing every district map'], 'Parties seek office and coordinate political action through elections.'],
      ['How does an interest group most commonly differ from a party?', 'It focuses on influencing policy rather than electing a full governing team', ['It has no political views', 'It controls the courts', 'It cannot communicate with voters'], 'Interest groups usually organize around issues or constituencies rather than governing broadly.'],
      ['What should a reader check in a group’s policy report?', 'Evidence quality and disclosed interests', ['Only the logo', 'Only the report length', 'Whether every reader agrees'], 'Evidence and potential interests help evaluate credibility.'],
    ],
  },
  {
    title: 'Elections, Representation, and the Electoral College',
    summary: 'U.S. elections combine voter choice, district representation, state administration, and constitutional procedures for selecting a president.',
    objectives: ['Distinguish primary and general elections', 'Explain district representation and apportionment', 'Distinguish popular ballots from electoral votes'],
    explanation: ['Primary elections select party nominees under state rules; general elections choose officeholders. House districts are reapportioned among states after the census.', 'Turnout is a rate, so compare the same denominator. In presidential elections, each state appoints electors equal to its representatives plus two senators; voters cast popular ballots and electors cast the formal electoral votes.'],
    visual: { type: 'table', title: 'Turnout example', headers: ['District', 'Votes cast', 'Eligible voters', 'Turnout'], rows: [['A', '48,000', '80,000', '60%'], ['B', '54,000', '100,000', '54%'], ['C', '35,000', '50,000', '70%']] },
    keyTerms: [{ marker: 'primary election', text: 'election used to choose a party nominee' }, { marker: 'turnout', text: 'share of an eligible or registered population that votes' }, { marker: 'elector', text: 'person appointed by a state to cast an electoral vote for president and vice president' }],
    gedStrategy: 'For election tables, calculate or verify the rate before comparing districts with different populations.',
    checkpoint: 'Which example district has the highest turnout percentage?',
    questions: [
      ['Which district has the highest turnout in the table?', 'District C', ['District A', 'District B', 'All three are equal'], 'District C has 70 percent turnout, higher than 60 and 54 percent.'],
      ['What is the usual purpose of a party primary?', 'Select a party’s nominee', ['Ratify a constitutional amendment', 'Appoint federal judges', 'Conduct the census'], 'Primaries are commonly used to choose candidates for the general election.'],
      ['A state has 8 representatives. How many presidential electors does it have?', '10 electors', ['8 electors', '6 electors', '16 electors'], 'The state receives 8 electors for its House seats plus 2 for its senators.'],
    ],
  },
  {
    title: 'Public Policy and Trade-offs',
    summary: 'Public policy analysis compares goals, authority, evidence, costs, benefits, implementation, and unequal effects.',
    objectives: ['Identify a policy problem and goal', 'Compare alternatives using consistent criteria', 'Recognize intended and unintended consequences'],
    explanation: ['Policies can regulate behavior, spend funds, tax, provide services, disclose information, or change institutional procedures.', 'A sound comparison uses the same criteria for every option and distinguishes measured outcomes from predictions. Trade-offs do not prove a policy is good or bad; they show competing effects.'],
    visual: { type: 'table', title: 'Transit policy comparison', headers: ['Option', 'Estimated annual cost', 'Expected access', 'Main risk'], rows: [['Add bus route', '$2.4 million', 'High in two districts', 'Low ridership'], ['Fare subsidy', '$1.1 million', 'Broad for current riders', 'Does not add routes'], ['Bike network', '$1.6 million', 'Medium', 'Weather and distance limits']] },
    keyTerms: [{ marker: 'public policy', text: 'governmental course of action addressing a public issue' }, { marker: 'trade-off', text: 'gain in one objective accompanied by a cost or loss in another' }, { marker: 'implementation', text: 'process of putting an adopted policy into operation' }],
    gedStrategy: 'Choose answers that match the stated goal and evidence; do not silently replace the goal with your own preference.',
    checkpoint: 'Which option in the table has the lowest estimated annual cost?',
    questions: [
      ['Which transit option has the lowest estimated annual cost?', 'Fare subsidy', ['Add bus route', 'Bike network', 'All cost the same'], 'The table lists the fare subsidy at $1.1 million, the lowest amount.'],
      ['What is an unintended consequence?', 'An effect not included among the policy’s stated goals', ['The policy title', 'A required legislative vote', 'The original problem definition'], 'Unintended consequences are effects beyond the intended objectives.'],
      ['What makes a policy comparison fair?', 'Applying the same criteria to every alternative', ['Using cost for one option and popularity for another', 'Ignoring implementation', 'Counting only benefits'], 'Consistent criteria allow meaningful comparison.'],
    ],
  },
  {
    title: 'Fact, Opinion, Bias, and Propaganda',
    summary: 'Source evaluation distinguishes verifiable statements, reasoned judgments, unsupported opinions, and persuasive techniques.',
    objectives: ['Classify fact and opinion', 'Identify loaded language and omitted evidence', 'Evaluate credibility without dismissing a source automatically'],
    explanation: ['A fact is verifiable; an opinion expresses a belief or preference. A reasoned judgment evaluates evidence and explains how it supports a conclusion.', 'Bias is a tendency or perspective that can shape selection and framing. Propaganda deliberately uses selective or emotional communication to influence an audience.'],
    visual: { type: 'table', title: 'Statement check', headers: ['Statement', 'Best classification'], rows: [['The measure passed 61–39', 'Verifiable fact'], ['The measure is the wisest choice', 'Opinion unless supported'], ['The measure best meets the goal because it costs least and serves most residents', 'Reasoned judgment if data are accurate']] },
    keyTerms: [{ marker: 'bias', text: 'perspective or tendency affecting selection, interpretation, or presentation' }, { marker: 'loaded language', text: 'wording chosen to trigger strong approval or disapproval' }, { marker: 'propaganda', text: 'strategic communication designed to shape attitudes or action' }],
    gedStrategy: 'A biased source can still contain useful evidence. Separate the claim, evidence, and rhetorical framing.',
    checkpoint: 'Can the statement “the proposal passed 61–39” be checked against an official vote record?',
    questions: [
      ['Which statement is a verifiable fact?', 'The council voted 7–2 on Tuesday', ['The council made a perfect decision', 'Every resident loves the result', 'The proposal is obviously unfair'], 'The vote and date can be checked against a public record.'],
      ['What is loaded language designed to do?', 'Shape emotional reaction to a subject', ['Provide a neutral measurement', 'Calculate a median', 'Identify map scale'], 'Loaded words carry strong connotations that influence readers.'],
      ['How should a reader handle a source with a clear viewpoint?', 'Evaluate its evidence, purpose, and omissions', ['Assume every statement is false', 'Accept it without checking', 'Ignore its author and date'], 'Point of view is a factor to evaluate, not an automatic verdict.'],
    ],
  },
  {
    title: 'Paired Sources and Political Cartoons',
    summary: 'Comparing sources reveals agreements, discrepancies, purposes, and ways that text and images frame the same issue.',
    objectives: ['Compare two accounts using shared criteria', 'Interpret common political-cartoon devices', 'Identify evidence that corroborates or challenges a claim'],
    explanation: ['First identify the common topic, then compare claims, evidence, tone, date, audience, and omitted details. A discrepancy may result from access, purpose, or historical context.', 'Political cartoons use symbols, labels, exaggeration, analogy, and irony. Interpret the visual evidence before deciding what viewpoint it advances.'],
    visual: { type: 'compare', title: 'Paired-source organizer', leftTitle: 'Source A', rightTitle: 'Source B', left: ['supports proposal', 'uses projected benefits'], shared: ['addresses same transit plan', 'cites city data'], right: ['questions proposal', 'uses current budget limits'] },
    keyTerms: [{ marker: 'corroborate', text: 'support or confirm using independent evidence' }, { marker: 'discrepancy', text: 'meaningful difference between accounts' }, { marker: 'irony', text: 'contrast between appearance or expectation and intended meaning' }],
    gedStrategy: 'Build a quick “both / only A / only B” chart before choosing a comparison answer.',
    checkpoint: 'If both sources cite the same total but interpret it differently, do they disagree about data, meaning, or both?',
    questions: [
      ['What is the best first step when comparing two sources?', 'Identify their common topic and each source’s main claim', ['Count their sentences', 'Assume the newer one is correct', 'Ignore their dates and audiences'], 'Comparison begins with what each source is saying about the shared subject.'],
      ['In a political cartoon, what does a label usually help identify?', 'The person, institution, or idea represented by a symbol', ['The exact market price', 'The author’s birth date', 'The document’s legal force'], 'Labels connect visual symbols to political subjects or concepts.'],
      ['Two sources use the same statistic but reach different conclusions. What should a reader compare?', 'Their assumptions and interpretation of the statistic', ['Only their font sizes', 'Only which appears first', 'Whether both contain pictures'], 'Shared data can support different arguments depending on assumptions and reasoning.'],
    ],
  },
];

const history: LessonSeed[] = [
  {
    title: 'Founding Documents in Context',
    summary: 'Founding-era documents respond to different problems: independence, weak national coordination, constitutional design, and protection of liberties.',
    objectives: ['Sequence major founding documents', 'Connect a document to its historical problem', 'Use excerpts as primary-source evidence'],
    explanation: ['The Declaration explained separation from Britain and stated equality and natural-rights ideals. The Articles of Confederation created a weak union that exposed coordination problems.', 'The Constitution designed a stronger federal framework, and the Bill of Rights answered demands for explicit protections. Later debates continue to interpret these texts.'],
    visual: { type: 'process', title: 'Founding sequence', steps: ['Declaration of Independence (1776)', 'Articles of Confederation take effect (1781)', 'Constitution signed (1787)', 'Bill of Rights ratified (1791)'] },
    keyTerms: [{ marker: 'Declaration', text: 'document announcing independence and explaining its political justification' }, { marker: 'Articles of Confederation', text: 'first U.S. national framework with a weak central government' }, { marker: 'ratification', text: 'formal approval required to bring a governing document into force' }],
    gedStrategy: 'Use the document’s date and problem to infer purpose; do not treat all founding texts as interchangeable.',
    checkpoint: 'Which document directly replaced the Articles’ national framework?',
    questions: [
      ['Which document created the current federal framework?', 'The Constitution', ['The Declaration of Independence', 'The Articles of Confederation', 'The Emancipation Proclamation'], 'The Constitution replaced the Articles as the national governing framework.'],
      ['What was a major purpose of the Declaration of Independence?', 'Explain and justify separation from British rule', ['Create the Federal Reserve', 'Ratify the Bill of Rights', 'Establish judicial review by statute'], 'The Declaration announced independence and set out its justification.'],
      ['Why was the Bill of Rights added?', 'To provide explicit protections and limits demanded during ratification', ['To abolish Congress', 'To create political parties', 'To transfer all state power to cities'], 'Promised amendments helped address concerns about individual liberty and federal power.'],
    ],
  },
  {
    title: 'Revolution and the Early Republic',
    summary: 'Colonial resistance, independence, and early national debates shaped institutions and competing views of federal power.',
    objectives: ['Trace causes and effects of revolution', 'Distinguish sequence from causation', 'Compare early constitutional viewpoints'],
    explanation: ['Taxation, representation, imperial authority, colonial self-government, and Enlightenment ideas all contributed to conflict; no single cause explains the Revolution.', 'After independence, leaders debated finance, foreign relations, national authority, and political organization. The War of 1812 further tested the young republic.'],
    visual: { type: 'process', title: 'Multiple-cause model', steps: ['Imperial policies after Seven Years’ War', 'Colonial resistance and organization', 'Escalating conflict', 'Declaration and war', 'Independent republic'] },
    keyTerms: [{ marker: 'multiple causation', text: 'an outcome produced by several interacting causes' }, { marker: 'republic', text: 'government in which public authority is exercised through representatives under law' }, { marker: 'precedent', text: 'earlier action used as a guide for later conduct' }],
    gedStrategy: 'Reject answers claiming one event “alone” caused a complex historical change unless the source explicitly supports it.',
    checkpoint: 'Why is a multiple-cause explanation stronger for the Revolution?',
    questions: [
      ['Which is the strongest explanation of the American Revolution?', 'Several political, economic, and ideological causes interacted', ['One tax alone caused every conflict', 'Geography had no role', 'All colonists held identical views'], 'Complex historical outcomes usually involve interacting causes and varied participants.'],
      ['What is a precedent?', 'An earlier action that guides later decisions', ['A future population estimate', 'A secret tax', 'A type of map scale'], 'Precedents shape expectations about how institutions and officials act.'],
      ['What did the War of 1812 test?', 'The security and international position of the young republic', ['The ratification of the Fourteenth Amendment', 'The New Deal banking system', 'The postwar NATO alliance'], 'The war occurred during the early republic and tested national defense and sovereignty.'],
    ],
  },
  {
    title: 'Expansion, Land, and Indigenous Policy',
    summary: 'Territorial expansion increased settlement and national power while dispossessing Indigenous nations and intensifying political conflict.',
    objectives: ['Analyze competing perspectives on expansion', 'Connect geography to migration and policy', 'Recognize costs omitted by celebratory narratives'],
    explanation: ['Expansion was driven by land demand, transportation, resources, national policy, and ideas such as Manifest Destiny.', 'The process involved treaties, war, forced removal, broken agreements, and Indigenous resistance and adaptation. Source perspective strongly affects how expansion is described.'],
    visual: { type: 'compare', title: 'Expansion viewed from different positions', leftTitle: 'Settler-government account', rightTitle: 'Indigenous account', left: ['new farms and states', 'transport routes', 'national reach'], shared: ['land-use change', 'migration', 'political conflict'], right: ['loss of homeland', 'treaty violations', 'survival and sovereignty'] },
    keyTerms: [{ marker: 'Manifest Destiny', text: 'nineteenth-century belief used to justify U.S. continental expansion' }, { marker: 'sovereignty', text: 'authority of a people or government over its affairs and territory' }, { marker: 'dispossession', text: 'loss of land or property through force, law, or coercion' }],
    gedStrategy: 'Ask whose benefits and whose costs a source includes; missing perspective can change the historical conclusion.',
    checkpoint: 'Why might two primary sources describe the same removal policy differently?',
    questions: [
      ['Which factor helped drive westward expansion?', 'Demand for land and access to resources and transportation', ['The end of all migration', 'A ban on new states', 'The absence of federal policy'], 'Land, resources, transport, and policy all encouraged movement west.'],
      ['What does dispossession mean in this context?', 'Loss of Indigenous land through force, coercion, or policy', ['Voluntary cultural exchange only', 'Creation of a bank account', 'A rise in factory productivity'], 'Expansion often transferred land away from Indigenous nations under unequal conditions.'],
      ['Why compare settler and Indigenous accounts?', 'They reveal different experiences, interests, and omitted evidence', ['One account will contain no viewpoint', 'Dates become irrelevant', 'Comparison removes the need for evidence'], 'Paired perspectives help construct a fuller, better-corroborated history.'],
    ],
  },
  {
    title: 'Slavery, Sectionalism, and Civil War',
    summary: 'The expansion and protection of slavery drove sectional conflict that culminated in secession and civil war.',
    objectives: ['Connect slavery to sectional conflict', 'Trace secession and war as cause and effect', 'Interpret political and economic evidence'],
    explanation: ['Regional economies and politics differed, but slavery was central to disputes over western territories, federal power, political representation, and human freedom.', 'After Lincoln’s election, slaveholding states seceded and formed the Confederacy. The Union fought to preserve the nation; emancipation became a central war aim.'],
    visual: { type: 'process', title: 'Escalating sectional conflict', steps: ['Expansion raises slavery question', 'Compromises and court conflicts', 'Party system realigns', 'Secession', 'Civil War', 'Emancipation and constitutional change'] },
    keyTerms: [{ marker: 'sectionalism', text: 'loyalty to a region’s interests over national unity' }, { marker: 'secession', text: 'claimed withdrawal of a state from the Union' }, { marker: 'emancipation', text: 'release from slavery' }],
    gedStrategy: 'Distinguish immediate triggers from deeper causes; an election can trigger secession without being the underlying source of conflict.',
    checkpoint: 'Which institution was central to the sectional conflict?',
    questions: [
      ['What issue was central to sectional conflict before the Civil War?', 'The expansion and protection of slavery', ['The creation of NATO', 'The federal minimum wage', 'The internet'], 'Slavery shaped the major political, territorial, and economic disputes of the era.'],
      ['What is sectionalism?', 'Prioritizing a region’s interests over the nation as a whole', ['Dividing government into branches', 'Calculating inflation', 'Drawing a physical map'], 'Sectionalism describes intense regional division and loyalty.'],
      ['Which event immediately followed secession in the causal sequence?', 'Armed conflict between the Union and Confederacy', ['Ratification of the Bill of Rights', 'The Great Depression', 'The Cold War'], 'Secession led directly into the Civil War.'],
    ],
  },
  {
    title: 'Reconstruction and the Civil War Amendments',
    summary: 'Reconstruction attempted to reunite the nation and define freedom, citizenship, and voting rights after slavery.',
    objectives: ['Match the 13th, 14th, and 15th Amendments', 'Evaluate Reconstruction policies and resistance', 'Distinguish legal change from lived outcomes'],
    explanation: ['The Thirteenth Amendment abolished slavery except as punishment for crime; the Fourteenth established birthright citizenship and major limits on states; the Fifteenth prohibited certain racial restrictions on voting.', 'New governments, schools, political participation, and civil-rights laws expanded freedom, while violence, restrictive laws, and later abandonment of federal enforcement undermined these gains.'],
    visual: { type: 'table', title: 'Civil War Amendments', headers: ['Amendment', 'Ratified', 'Central change'], rows: [['13th', '1865', 'Abolished slavery, with a punishment exception'], ['14th', '1868', 'Citizenship, due process, equal protection'], ['15th', '1870', 'Voting rights cannot be denied on listed racial grounds']] },
    keyTerms: [{ marker: 'Reconstruction', text: 'postwar period of reunion and transformation after the Civil War' }, { marker: 'birthright citizenship', text: 'citizenship based on birth under Fourteenth Amendment terms' }, { marker: 'enfranchisement', text: 'grant or protection of voting rights' }],
    gedStrategy: 'Legal adoption and actual enforcement are different. Check whether the question asks what a law promised or what occurred in practice.',
    checkpoint: 'Which amendment contains Equal Protection and Due Process Clauses directed at states?',
    questions: [
      ['Which amendment abolished slavery with a stated punishment exception?', 'The Thirteenth Amendment', ['The Tenth Amendment', 'The Fourteenth Amendment', 'The Nineteenth Amendment'], 'The Thirteenth Amendment ended slavery and involuntary servitude subject to its text.'],
      ['Which amendment established equal protection against state action?', 'The Fourteenth Amendment', ['The First Amendment', 'The Twelfth Amendment', 'The Twenty-Second Amendment'], 'The Equal Protection Clause is part of the Fourteenth Amendment.'],
      ['Why is enforcement evidence important when studying Reconstruction?', 'Constitutional promises did not automatically determine lived outcomes', ['Amendments had no legal meaning', 'All resistance ended in 1865', 'Only economic data matter'], 'Rights can be undermined when institutions fail to enforce them.'],
    ],
  },
  {
    title: 'Suffrage, Jim Crow, and Civil Rights',
    summary: 'Long movements challenged exclusion from voting and segregation through organizing, litigation, protest, legislation, and constitutional change.',
    objectives: ['Trace major civil-rights developments', 'Compare legal segregation with equality claims', 'Analyze how historical context shapes source viewpoints'],
    explanation: ['The Nineteenth Amendment barred denial of voting rights on account of sex, though discriminatory barriers still excluded many women. Jim Crow laws enforced racial segregation and voter suppression.', 'Brown v. Board rejected state-mandated school segregation under equal protection. Grassroots activism helped produce the Civil Rights Act of 1964 and Voting Rights Act of 1965.'],
    visual: { type: 'process', title: 'Rights movement sequence', steps: ['Organizing and public argument', 'Court challenges', 'Mass protest and direct action', 'Federal civil-rights legislation', 'Continuing enforcement and debate'] },
    keyTerms: [{ marker: 'suffrage', text: 'the right to vote' }, { marker: 'segregation', text: 'enforced separation of people by racial or other classification' }, { marker: 'civil disobedience', text: 'public, nonviolent violation of a law judged unjust to press for change' }],
    gedStrategy: 'Use the source date: identical words can carry different implications before and after a major court ruling or law.',
    checkpoint: 'Which case rejected legally segregated public schools?',
    questions: [
      ['What did Brown v. Board of Education reject?', 'State-mandated racial segregation in public schools', ['Women’s suffrage', 'Federal income taxation', 'The amendment process'], 'Brown held that segregated public education violated equal protection.'],
      ['What does suffrage mean?', 'The right to vote', ['The right to hold a patent', 'A measure of inflation', 'A military alliance'], 'Suffrage is political voting eligibility.'],
      ['Why does historical context matter when reading a civil-rights speech?', 'Current laws and events shaped the speaker’s purpose and audience', ['Context proves every claim true', 'The date replaces textual evidence', 'All speeches have the same purpose'], 'Context helps explain what problem the speaker addressed and why.'],
    ],
  },
  {
    title: 'World Wars and Their Consequences',
    summary: 'The world wars grew from interacting alliances, nationalism, imperial competition, economic crisis, militarism, and expansionist regimes.',
    objectives: ['Analyze multiple causes of global war', 'Compare Allied and Axis systems', 'Evaluate domestic and international consequences'],
    explanation: ['World War I’s alliance system turned regional crisis into wider war. Its settlement and unresolved tensions contributed to instability but did not alone cause World War II.', 'World War II involved fascist and Nazi expansion, genocide in the Holocaust, mass mobilization, Japanese American incarceration, Allied victory, and accelerated decolonization and U.S. global influence.'],
    visual: { type: 'compare', title: 'Selected consequences', leftTitle: 'Domestic United States', rightTitle: 'International', left: ['wartime production', 'migration to industrial centers', 'Japanese American incarceration'], shared: ['mass casualties', 'expanded government action'], right: ['United Nations', 'decolonization', 'new balance of power'] },
    keyTerms: [{ marker: 'militarism', text: 'strong emphasis on military power and readiness' }, { marker: 'totalitarianism', text: 'system seeking extensive state control over public and private life' }, { marker: 'Holocaust', text: 'Nazi Germany’s systematic murder of six million Jews and millions of other victims' }],
    gedStrategy: 'Treat “contributed to” and “caused by itself” differently; complex wars require multi-cause reasoning.',
    checkpoint: 'Why is the Treaty of Versailles better described as one contributing condition than the sole cause of World War II?',
    questions: [
      ['What helped turn the 1914 crisis into a wider war?', 'A network of alliances and mobilization plans', ['The internet', 'The Marshall Plan', 'The United Nations'], 'Alliance commitments and military planning widened the conflict.'],
      ['What was the Holocaust?', 'Nazi Germany’s systematic mass murder of Jews and other targeted groups', ['A postwar trade agreement', 'A U.S. voting amendment', 'A monetary policy'], 'The Holocaust was a state-organized genocide during World War II.'],
      ['Which was an international consequence of World War II?', 'Creation of the United Nations', ['Ratification of the Bill of Rights', 'End of the Revolutionary War', 'Writing of the Magna Carta'], 'The United Nations was established in 1945 after the war.'],
    ],
  },
  {
    title: 'Cold War and Recent Foreign Policy',
    summary: 'After World War II, U.S.–Soviet rivalry shaped alliances, aid, proxy conflicts, nuclear strategy, and later foreign-policy debates.',
    objectives: ['Compare capitalism and communism in Cold War context', 'Sequence major Cold War developments', 'Interpret post-9/11 policy sources cautiously'],
    explanation: ['The Truman Doctrine and Marshall Plan sought to contain Soviet influence; NATO and the Warsaw Pact organized opposing alliances. The rivalry included proxy wars and nuclear deterrence.', 'The Soviet Union collapsed in 1991. After the attacks of September 11, 2001, U.S. policy emphasized counterterrorism and wars in Afghanistan and Iraq, generating continuing debates over security, executive power, cost, and civil liberty.'],
    visual: { type: 'process', title: 'Selected chronology', steps: ['Truman Doctrine and Marshall Plan', 'NATO and Warsaw Pact', 'Proxy conflicts and nuclear rivalry', 'Soviet collapse (1991)', 'Post-9/11 counterterrorism era'] },
    keyTerms: [{ marker: 'containment', text: 'policy aimed at limiting expansion of Soviet influence' }, { marker: 'proxy war', text: 'conflict in which larger rivals support opposing sides indirectly' }, { marker: 'deterrence', text: 'discouraging action by threatening unacceptable cost' }],
    gedStrategy: 'For contemporary policy, identify the document date and separate what was known then from later outcomes.',
    checkpoint: 'Which event marks the conventional end of the Cold War era?',
    questions: [
      ['What was the purpose of containment?', 'Limit expansion of Soviet influence', ['End all international trade', 'Dissolve the Constitution', 'Replace elections with inheritance'], 'Containment was the central U.S. strategy toward Soviet expansion.'],
      ['Which alliance included the United States and Western partners?', 'NATO', ['The Warsaw Pact', 'The Confederacy', 'The League of Nations mandate system'], 'NATO organized the United States, Canada, and Western European allies.'],
      ['Why is a source’s date especially important in recent foreign-policy analysis?', 'Later evidence may not have been available to the original author', ['Dates prove motives automatically', 'Recent events have no context', 'Every later source is unbiased'], 'Evaluating claims fairly requires knowing the information available at the time.'],
    ],
  },
];

const economics: LessonSeed[] = [
  {
    title: 'Scarcity and Opportunity Cost',
    summary: 'Because resources are limited, choices require trade-offs; opportunity cost is the value of the best alternative given up.',
    objectives: ['Identify scarce resources', 'Calculate opportunity cost from a choice', 'Distinguish money cost from total trade-off'],
    explanation: ['Scarcity does not mean a resource is rare in every sense; it means available resources cannot satisfy all competing wants at zero cost.', 'Opportunity cost is not the sum of every rejected option. It is the next-best alternative sacrificed when a choice is made.'],
    visual: { type: 'table', title: 'Community budget choice', headers: ['Option', 'Cost', 'Expected benefit'], rows: [['Library hours', '$80,000', 'Evening access'], ['Park repairs', '$75,000', 'Safer recreation'], ['Bus shelters', '$70,000', 'Weather protection']] },
    keyTerms: [{ marker: 'scarcity', text: 'condition in which limited resources face competing uses' }, { marker: 'opportunity cost', text: 'value of the next-best alternative forgone' }, { marker: 'incentive', text: 'factor that changes the costs or benefits of a choice' }],
    gedStrategy: 'Find the chosen option, then identify the most valuable rejected alternative—not every alternative.',
    checkpoint: 'If the library is chosen and park repairs were the next-best option, what is the opportunity cost?',
    questions: [
      ['What is opportunity cost?', 'The value of the next-best alternative given up', ['The price of every possible option combined', 'A benefit with no trade-off', 'Only the cash paid for a choice'], 'Opportunity cost focuses on the best forgone alternative.'],
      ['Why does scarcity require choice?', 'Resources cannot satisfy all competing uses at once', ['Every resource is illegal', 'Prices never change', 'People have no preferences'], 'Limited time, money, labor, and materials must be allocated.'],
      ['If the city chooses library hours over next-best park repairs, what is forgone?', 'The expected benefit of the park repairs', ['All future library access', 'The cost of all three projects combined', 'The existence of the park'], 'The next-best rejected benefit is the opportunity cost.'],
    ],
  },
  {
    title: 'Supply, Demand, and Price',
    summary: 'Market price and quantity respond to buyers’ demand, sellers’ supply, and changes in underlying conditions.',
    objectives: ['Distinguish supply from demand', 'Predict directional price pressure', 'Separate movement along a curve from a shift in conditions'],
    explanation: ['Demand describes quantities buyers are willing and able to purchase at different prices; supply describes quantities sellers will offer.', 'When demand rises while supply is unchanged, price tends to rise. When supply rises while demand is unchanged, price tends to fall, though real markets may have additional constraints.'],
    visual: { type: 'table', title: 'Market changes', headers: ['Change', 'Other side fixed', 'Typical price pressure'], rows: [['Demand increases', 'Supply fixed', 'Upward'], ['Demand decreases', 'Supply fixed', 'Downward'], ['Supply increases', 'Demand fixed', 'Downward'], ['Supply decreases', 'Demand fixed', 'Upward']] },
    keyTerms: [{ marker: 'demand', text: 'quantities buyers are willing and able to purchase at various prices' }, { marker: 'supply', text: 'quantities sellers are willing and able to offer at various prices' }, { marker: 'equilibrium', text: 'price and quantity at which planned supply and demand meet' }],
    gedStrategy: 'Hold everything else constant only when the scenario tells you to; name which curve changes and why.',
    checkpoint: 'If a crop failure reduces supply while demand is steady, which way is price pressured?',
    questions: [
      ['Demand rises while supply stays fixed. What usually happens to price?', 'It faces upward pressure', ['It must fall to zero', 'It cannot change', 'It becomes unrelated to quantity'], 'More demand competing for unchanged supply tends to raise price.'],
      ['A crop failure reduces available produce. Which market side changes first?', 'Supply decreases', ['Demand increases automatically', 'Demand disappears', 'Currency supply doubles'], 'The failure reduces the quantity sellers can bring to market.'],
      ['What does equilibrium describe?', 'The point where planned supply and demand meet', ['The highest possible tax', 'A guaranteed business profit', 'A fixed wage for every worker'], 'Market equilibrium is the intersection of supply and demand plans.'],
    ],
  },
  {
    title: 'Competition, Monopoly, and Incentives',
    summary: 'Market structure shapes choice, price, innovation, and bargaining power, while incentives influence decisions at the margin.',
    objectives: ['Compare competition and monopoly', 'Identify positive and negative incentives', 'Evaluate claims about market outcomes'],
    explanation: ['Competition among sellers can expand choice and pressure prices, while monopoly places a market under one dominant seller and may reduce competitive constraints.', 'Incentives change expected benefits or costs. Their effects depend on behavior, enforcement, available alternatives, and unintended responses.'],
    visual: { type: 'compare', title: 'Simplified market structures', leftTitle: 'Competitive market', rightTitle: 'Monopoly', left: ['many sellers', 'more consumer alternatives', 'stronger price competition'], shared: ['buyers and sellers', 'costs and incentives', 'subject to rules'], right: ['one dominant seller', 'high entry barriers', 'weaker direct competition'] },
    keyTerms: [{ marker: 'competition', text: 'rivalry among sellers or buyers in a market' }, { marker: 'monopoly', text: 'market dominated by a single seller' }, { marker: 'externality', text: 'cost or benefit affecting people outside a transaction' }],
    gedStrategy: 'Do not assume an incentive guarantees behavior; choose the answer describing likely pressure, not certainty.',
    checkpoint: 'How can a tax on pollution change a firm’s incentive?',
    questions: [
      ['Which feature most clearly indicates monopoly?', 'One seller dominates with major barriers to entry', ['Many similar sellers', 'Easy market entry', 'Strong price comparison'], 'Monopoly is characterized by a dominant seller and limited competition.'],
      ['What is an incentive?', 'A factor that changes expected costs or benefits of a choice', ['A historical timeline', 'A branch of government', 'A map projection'], 'Incentives make actions more or less attractive.'],
      ['Pollution affecting nearby residents is what kind of economic effect?', 'A negative externality', ['A private benefit only', 'A comparative advantage', 'A budget surplus'], 'The transaction imposes a cost on third parties.'],
    ],
  },
  {
    title: 'Labor, Capital, Productivity, and Trade',
    summary: 'Production combines labor, capital, resources, and organization; specialization and trade can raise output while distributing gains unevenly.',
    objectives: ['Distinguish labor from capital', 'Calculate simple productivity', 'Explain specialization and comparative advantage'],
    explanation: ['Labor is human effort; capital includes tools, machinery, and productive assets. Productivity measures output relative to an input such as hours worked.', 'Comparative advantage means producing at lower opportunity cost. Specialization and exchange can increase total output, though adjustment costs and bargaining power affect who benefits.'],
    visual: { type: 'table', title: 'Output per workday', headers: ['Team', 'Workers', 'Units', 'Units per worker'], rows: [['A', '4', '80', '20'], ['B', '5', '75', '15'], ['C', '3', '66', '22']] },
    keyTerms: [{ marker: 'labor', text: 'human effort used in production' }, { marker: 'capital', text: 'tools and productive assets used to create goods or services' }, { marker: 'productivity', text: 'output produced per unit of input' }],
    gedStrategy: 'When comparing productivity, divide by the same input; do not compare total output when team sizes differ.',
    checkpoint: 'Which team has the highest units per worker?',
    questions: [
      ['Which team has the highest productivity per worker?', 'Team C', ['Team A', 'Team B', 'All teams are equal'], 'Team C produces 22 units per worker, the highest rate.'],
      ['Which item is productive capital?', 'A machine used to manufacture parts', ['A worker’s time', 'A customer’s preference', 'A rainfall forecast'], 'Machinery is a produced asset used in further production.'],
      ['What is comparative advantage?', 'Ability to produce at lower opportunity cost', ['Ability to produce the largest total quantity only', 'A ban on specialization', 'Government ownership of every business'], 'Comparative advantage depends on relative opportunity cost.'],
    ],
  },
  {
    title: 'GDP, Inflation, and Unemployment',
    summary: 'Macroeconomic indicators measure different dimensions of an economy and must be interpreted with definitions and limits.',
    objectives: ['Explain GDP, CPI, and unemployment', 'Calculate percent change', 'Avoid using one indicator as a complete welfare measure'],
    explanation: ['GDP measures the value of final goods and services produced within a country. The Consumer Price Index tracks average price change for a representative consumer basket.', 'The unemployment rate counts unemployed people actively seeking work as a share of the labor force. No single indicator describes distribution, unpaid work, environmental cost, or individual experience completely.'],
    visual: { type: 'line', title: 'Illustrative price index', points: [{ x: 1, y: 100, label: '100' }, { x: 2, y: 103, label: '103' }, { x: 3, y: 108, label: '108' }, { x: 4, y: 110, label: '110' }], xLabel: 'Year', yLabel: 'Index', caption: 'An index rising from 100 to 110 represents a 10 percent increase across the period.' },
    keyTerms: [{ marker: 'GDP', text: 'value of final goods and services produced within an economy' }, { marker: 'inflation', text: 'sustained increase in the general price level' }, { marker: 'labor force', text: 'employed people plus unemployed people actively seeking work' }],
    gedStrategy: 'Read the denominator. An unemployment rate uses the labor force, not the entire population.',
    checkpoint: 'What percent increase is shown from index 100 to 110?',
    questions: [
      ['What does GDP primarily measure?', 'The value of final goods and services produced within the economy', ['Every household’s happiness', 'Only stock prices', 'The number of laws passed'], 'GDP is a production measure, not a complete measure of well-being.'],
      ['The index rises from 100 to 110. What is the percent increase?', '10 percent', ['5 percent', '11 percent', '110 percent'], 'The increase is 10 divided by the original 100, or 10 percent.'],
      ['Who is counted as unemployed in the standard rate?', 'A jobless person actively seeking work', ['Every retired person', 'Every full-time student', 'Every child'], 'The standard definition requires joblessness, availability, and active job search.'],
    ],
  },
  {
    title: 'Public Policy, Money, Credit, and Consumers',
    summary: 'Fiscal policy, monetary policy, saving, and credit affect economic activity through different institutions and mechanisms.',
    objectives: ['Distinguish fiscal from monetary policy', 'Calculate simple interest and total repayment', 'Evaluate credit terms and consumer evidence'],
    explanation: ['Fiscal policy involves government spending and taxation. Monetary policy is conducted by the central bank and influences financial conditions, interest rates, and the availability of money and credit.', 'Credit moves purchasing power across time but creates repayment obligations. Compare annual percentage rates, fees, term length, and total cost rather than monthly payment alone.'],
    visual: { type: 'table', title: 'Two loan offers', headers: ['Offer', 'Amount', 'Finance cost', 'Total repayment'], rows: [['A', '$1,000', '$120', '$1,120'], ['B', '$1,000', '$90 + $50 fee', '$1,140']] },
    keyTerms: [{ marker: 'fiscal policy', text: 'government decisions about taxes and spending' }, { marker: 'monetary policy', text: 'central-bank action influencing money, credit, and financial conditions' }, { marker: 'APR', text: 'annualized measure used to compare credit cost' }],
    gedStrategy: 'Add fees before comparing total credit cost. The smaller advertised interest charge may not produce the cheaper loan.',
    checkpoint: 'Which loan in the table has the lower total repayment?',
    questions: [
      ['Which loan has the lower total repayment?', 'Offer A', ['Offer B', 'Both cost $1,000 total', 'Both cost $1,140 total'], 'Offer A totals $1,120; Offer B totals $1,140 after its fee.'],
      ['Which is an example of fiscal policy?', 'Congress changes federal spending and tax levels', ['The central bank changes its policy interest rate', 'A household opens a savings account', 'A store changes one price'], 'Taxing and spending decisions are fiscal policy.'],
      ['Why compare total repayment instead of monthly payment alone?', 'A longer term or added fees can make a low payment more expensive overall', ['Monthly payments never use money', 'Fees reduce every loan cost', 'Term length has no effect'], 'Total repayment captures charges that a monthly figure can hide.'],
    ],
  },
];

const geography: LessonSeed[] = [
  {
    title: 'Maps, Scale, and Geographic Tools',
    summary: 'Maps are selective models whose title, legend, scale, orientation, and projection determine how spatial evidence should be read.',
    objectives: ['Use legends and scales', 'Distinguish physical, political, and thematic maps', 'Recognize map distortion and selection'],
    explanation: ['A political map emphasizes boundaries; a physical map emphasizes landforms; a thematic map displays a variable such as population density or rainfall.', 'Every flat projection distorts some combination of area, shape, distance, or direction. A map can be accurate for one purpose and poor for another.'],
    visual: { type: 'table', title: 'Map elements', headers: ['Element', 'Question answered'], rows: [['Title', 'What is mapped?'], ['Legend', 'What do symbols mean?'], ['Scale', 'How does map distance relate to real distance?'], ['Orientation', 'Which direction is shown?'], ['Source/date', 'Who made it and when?']] },
    keyTerms: [{ marker: 'thematic map', text: 'map showing the spatial pattern of a selected variable' }, { marker: 'scale', text: 'relationship between map distance and ground distance' }, { marker: 'projection', text: 'method for representing Earth’s curved surface on a flat map' }],
    gedStrategy: 'Read title, legend, and date before using color or size to infer a pattern.',
    checkpoint: 'Which map element explains what shaded colors represent?',
    questions: [
      ['Which map element explains symbols and colors?', 'The legend', ['The border', 'The page number', 'The compass alone'], 'The legend or key defines map symbols and shading.'],
      ['Which map best displays population density by county?', 'A thematic map', ['A physical relief map only', 'A road map without data', 'A blank outline map'], 'A thematic map is designed to show one variable across space.'],
      ['Why do map projections involve distortion?', 'A curved surface cannot be flattened without altering some properties', ['Maps contain no measurements', 'North changes location yearly', 'Legends create distance'], 'Flattening the globe necessarily changes area, shape, distance, or direction.'],
    ],
  },
  {
    title: 'Environment, Resources, and Society',
    summary: 'Physical geography creates opportunities and constraints, while societies use technology and institutions to adapt and transform environments.',
    objectives: ['Connect resources and settlement patterns', 'Analyze human–environment interaction', 'Evaluate sustainability trade-offs'],
    explanation: ['Water, climate, soils, terrain, hazards, and resource locations influence settlement and economic activity without mechanically determining human choices.', 'Technology can reduce constraints or create new environmental costs. Sustainability considers whether present systems can continue without undermining future needs.'],
    visual: { type: 'process', title: 'Human–environment feedback', steps: ['Physical conditions', 'Settlement and production choices', 'Technology and land use', 'Environmental change', 'Adaptation or policy response'] },
    keyTerms: [{ marker: 'adaptation', text: 'adjustment to environmental conditions or change' }, { marker: 'sustainability', text: 'meeting current needs while maintaining future ecological and social capacity' }, { marker: 'resource', text: 'material or environmental asset people use to meet needs' }],
    gedStrategy: 'Avoid geographic determinism: physical conditions influence choices, but policy, culture, and technology also matter.',
    checkpoint: 'How can irrigation both expand agriculture and create a trade-off?',
    questions: [
      ['Which statement best describes human–environment interaction?', 'People adapt to and also change physical environments', ['Geography determines every decision', 'Technology has no environmental effect', 'Societies never respond to hazards'], 'The relationship runs in both directions and changes over time.'],
      ['What does sustainability consider?', 'Whether present activity preserves capacity for future needs', ['Only immediate profit', 'Only map boundaries', 'Whether a policy has a short title'], 'Sustainability links present choices to long-term environmental and social capacity.'],
      ['Why is geographic determinism too strong?', 'Human institutions, culture, and technology also shape outcomes', ['Physical geography never matters', 'Maps cannot show resources', 'Climate has no patterns'], 'Geography matters without being the sole cause of social development.'],
    ],
  },
  {
    title: 'Regions, Borders, and Cultural Diversity',
    summary: 'Regions organize space by physical, political, economic, or cultural features, while borders express power and may be contested.',
    objectives: ['Compare formal, functional, and perceptual regions', 'Analyze border effects', 'Distinguish nation, state, and nation-state'],
    explanation: ['A formal region shares a defined trait; a functional region centers on networks or activity; a perceptual region exists through shared public understanding.', 'A state is a sovereign political entity, while a nation is a community connected by identity and history. Their boundaries do not always coincide.'],
    visual: { type: 'table', title: 'Region types', headers: ['Type', 'Basis', 'Example pattern'], rows: [['Formal', 'Shared measurable trait', 'Language-majority area'], ['Functional', 'Connections to a node', 'Commuter zone around a city'], ['Perceptual', 'Shared mental image', 'A culturally understood “heartland”']] },
    keyTerms: [{ marker: 'state', text: 'sovereign political entity with territory and government' }, { marker: 'nation', text: 'people connected through shared identity, history, or culture' }, { marker: 'region', text: 'area grouped by selected characteristics or connections' }],
    gedStrategy: 'Identify the criterion used to draw the region; different valid maps can group the same places differently.',
    checkpoint: 'A metropolitan commuter zone is what type of region?',
    questions: [
      ['A city and the suburbs linked to it by daily commuting form what kind of region?', 'A functional region', ['A formal climate region', 'A perceptual region only', 'No geographic region'], 'Flows and connections to a central node define a functional region.'],
      ['What is a state in political geography?', 'A sovereign political entity with territory and government', ['Any cultural group', 'Every city neighborhood', 'A line of latitude'], 'State refers to a political unit with sovereign authority.'],
      ['Why can borders become contested?', 'Political boundaries may divide resources, identities, or populations', ['Borders have no effects', 'Every nation and state aligns perfectly', 'Physical maps abolish conflict'], 'Borders can conflict with settlement patterns, identity, or resource claims.'],
    ],
  },
  {
    title: 'Migration and Cultural Change',
    summary: 'Migration results from interacting push, pull, network, policy, and environmental factors and reshapes both origin and destination communities.',
    objectives: ['Distinguish immigration and emigration', 'Analyze push and pull factors', 'Compare diffusion, assimilation, and pluralism'],
    explanation: ['Push factors encourage departure, while pull factors attract people to a destination. Family networks, transport, borders, and law affect whether movement occurs.', 'Cultural diffusion spreads practices and ideas. Assimilation describes increased adoption of a receiving society’s patterns, while pluralism allows distinct identities to persist.'],
    visual: { type: 'compare', title: 'Migration factors', leftTitle: 'Push', rightTitle: 'Pull', left: ['conflict', 'job loss', 'environmental hazard'], shared: ['evaluated through personal circumstances', 'shaped by policy and networks'], right: ['safety', 'employment', 'family connection'] },
    keyTerms: [{ marker: 'immigration', text: 'movement into a country or region to live' }, { marker: 'emigration', text: 'movement out of a country or region to live elsewhere' }, { marker: 'diaspora', text: 'population dispersed from a homeland while maintaining connections or identity' }],
    gedStrategy: 'Classify a factor from the migrant’s viewpoint: does it encourage leaving or attract toward a destination?',
    checkpoint: 'A war threatening a family’s home is a push factor or pull factor?',
    questions: [
      ['Which is a push factor?', 'Violent conflict in the place of origin', ['Job opportunity at a destination', 'Family already living at a destination', 'A scholarship offered abroad'], 'Conflict can make departure more likely.'],
      ['What is immigration?', 'Movement into a place to live', ['Movement out of a place only', 'Daily travel to work', 'Spread of a map projection'], 'Immigration is defined relative to the destination receiving migrants.'],
      ['What is cultural diffusion?', 'Spread of ideas or practices between groups and places', ['Complete disappearance of all identities', 'A legal border survey', 'A decline in every city population'], 'Diffusion occurs through contact, migration, trade, media, and other connections.'],
    ],
  },
  {
    title: 'Population, Urbanization, and Sustainability',
    summary: 'Population change reflects births, deaths, and migration; urbanization concentrates people and creates both efficiencies and pressures.',
    objectives: ['Read population-change components', 'Interpret density and urbanization', 'Compare infrastructure trade-offs'],
    explanation: ['Population change equals births minus deaths plus net migration. Population density divides population by land area and does not show how evenly people are distributed inside the area.', 'Urban areas can support efficient services and economic networks while facing housing, transport, pollution, heat, and inequality challenges.'],
    visual: { type: 'table', title: 'Illustrative annual population change', headers: ['Component', 'People'], rows: [['Births', '12,000'], ['Deaths', '8,000'], ['In-migration', '6,000'], ['Out-migration', '7,500'], ['Net change', '+2,500']] },
    keyTerms: [{ marker: 'net migration', text: 'in-migration minus out-migration' }, { marker: 'population density', text: 'population divided by land area' }, { marker: 'urbanization', text: 'increase in the share of people living in urban areas' }],
    gedStrategy: 'Watch the signs: subtract deaths and out-migration; add births and in-migration.',
    checkpoint: 'Using the table, what is net migration before natural increase is included?',
    questions: [
      ['What is net migration in the table?', '−1,500 people', ['+1,500 people', '+6,000 people', '−7,500 people'], '6,000 in-migrants minus 7,500 out-migrants equals −1,500.'],
      ['What is the total population change shown?', '+2,500 people', ['+4,000 people', '−1,500 people', '+17,500 people'], 'Natural increase is 4,000 and net migration is −1,500, producing +2,500.'],
      ['What does population density measure?', 'People per unit of land area', ['Births minus deaths only', 'Average household income', 'Distance from the capital'], 'Density relates population size to land area.'],
    ],
  },
  {
    title: 'Geographic Data and Integrated Practice',
    summary: 'GED geography questions combine maps, tables, graphs, text, percentages, and causal claims that must be evaluated together.',
    objectives: ['Integrate quantitative and textual evidence', 'Distinguish correlation from causation', 'Make cautious trend predictions'],
    explanation: ['A spatial correlation shows variables occur together across places; it does not prove one causes the other. Consider confounders, reverse causation, and measurement differences.', 'Trend projections are strongest within a reasonable range and under stated assumptions. Read source date, units, scale, and category definitions before combining displays.'],
    visual: { type: 'bar', title: 'Illustrative transit share by district', items: [{ label: 'Central', value: 42, unit: '%' }, { label: 'North', value: 28, unit: '%' }, { label: 'West', value: 19, unit: '%' }, { label: 'Rural', value: 7, unit: '%' }], caption: 'The chart describes association with district type; it does not establish why shares differ.' },
    keyTerms: [{ marker: 'correlation', text: 'pattern in which two variables change together' }, { marker: 'causation', text: 'relationship in which a change in one factor helps produce another' }, { marker: 'confounder', text: 'third factor related to both variables that may explain an observed pattern' }],
    gedStrategy: 'Describe what the display proves before asking what explanation might fit; do not reverse that order.',
    checkpoint: 'Does the chart alone prove that living centrally causes transit use?',
    questions: [
      ['Which district has the highest transit share?', 'Central', ['North', 'West', 'Rural'], 'Central is shown at 42 percent, the largest bar.'],
      ['What can the chart establish by itself?', 'Transit share differs across the four district categories', ['District type alone causes every travel choice', 'Every central resident uses transit', 'The shares will remain unchanged forever'], 'The display supports a measured difference, not a complete causal explanation.'],
      ['Why should a long-range trend prediction be cautious?', 'Conditions and relationships may change beyond the observed data', ['Graphs cannot contain numbers', 'Percentages never change', 'Predictions require no assumptions'], 'Extrapolation grows less reliable as it extends beyond the evidence.'],
    ],
  },
];

export const gedSocialStudiesCourse: OfficialLanguageQuestCourse = {
  code: 'MRLC-GED-SOCIAL-STUDIES-V1',
  title: 'GED Social Studies Preparation & Practice',
  description: 'A comprehensive, evidence-first GED Social Studies course with 40 guided lessons and 120 original practice questions aligned to the official civics, U.S. history, economics, geography, source-analysis, and quantitative-reasoning targets.',
  language: 'GED Social Studies',
  category: 'GED Preparation',
  imageEmoji: '',
  accentColor: '#2563eb',
  published: true,
  units: [
    { title: 'Unit 1: Civics and Government', description: 'Government systems, constitutional principles, branches, rights, participation, elections, policy, and source evaluation.', lessons: civics.map(lesson) },
    { title: 'Unit 2: United States History', description: 'Founding documents, national development, civil rights, global conflict, and historical-source reasoning.', lessons: history.map(lesson) },
    { title: 'Unit 3: Economics', description: 'Choice, markets, production, macroeconomic indicators, public policy, credit, and quantitative reasoning.', lessons: economics.map(lesson) },
    { title: 'Unit 4: Geography and the World', description: 'Maps, environment, regions, migration, population, urbanization, and integrated data analysis.', lessons: geography.map(lesson) },
  ],
};
