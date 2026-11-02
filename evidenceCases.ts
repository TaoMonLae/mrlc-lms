/** Original practice passages. Answer keys stay on the server. */
export type EvidenceOption = { id: string; text: string };
export type EvidenceCase = {
  id: string;
  title: string;
  category: "Reading" | "Civics" | "Science";
  source: string;
  paragraphs: { label: string; text: string }[];
  question: string;
  evidence: EvidenceOption[];
  reasoning: EvidenceOption[];
  answer: { evidence: string; reasoning: string };
  explanation: string;
  hint: string;
};

export const EVIDENCE_CASES: EvidenceCase[] = [
  {
    id: "library-hours", title: "The library pilot", category: "Reading", source: "School newsletter · editorial",
    paragraphs: [
      { label: "A", text: "Last term, the library stayed open until 6 p.m. on Tuesdays for a four-week pilot. The librarian counted an average of 28 visitors on those evenings, compared with 12 on a typical Tuesday before the pilot." },
      { label: "B", text: "Most evening visitors used the quiet tables or computers. In a survey of 40 students who attended, 31 said they could not regularly use the library during lunch because of classes or other commitments." },
      { label: "C", text: "The pilot cost the school extra staffing hours. Before extending it, the principal wants to compare attendance over a longer period and ask students who did not visit why they stayed away." },
    ],
    question: "Which evidence best supports the claim that later hours gave students more access to the library?",
    evidence: [
      { id: "a", text: "Evening visits averaged 28, versus 12 on earlier Tuesdays." },
      { id: "b", text: "The pilot lasted four weeks." },
      { id: "c", text: "The principal wants a longer comparison." },
      { id: "d", text: "The school paid for extra staffing hours." },
    ],
    reasoning: [
      { id: "a", text: "It shows more students used the library when it was open later." },
      { id: "b", text: "It proves every student prefers evening study." },
      { id: "c", text: "It shows that staffing costs decreased." },
    ],
    answer: { evidence: "a", reasoning: "a" },
    explanation: "The attendance comparison directly connects the later opening time with more visits. It does not prove why every student came or predict long-term demand.",
    hint: "Look for a before-and-after comparison about access, then avoid claims broader than the data.",
  },
  {
    id: "rain-garden", title: "The rain garden", category: "Science", source: "Community project · field notes",
    paragraphs: [
      { label: "A", text: "A neighborhood group planted a rain garden beside the bus stop in April. A rain garden is a shallow planted area that lets stormwater soak into the soil." },
      { label: "B", text: "Volunteers measured standing water after six storms. Before planting, water remained by the stop for an average of nine hours. After planting, it remained for an average of four hours. The storms were not all the same size." },
      { label: "C", text: "The group plans to keep measuring through the wet season. They also want to check whether a nearby drain was cleared during the project." },
    ],
    question: "Which evidence supports the cautious conclusion that pooling decreased after the garden was planted?",
    evidence: [
      { id: "a", text: "The garden was planted in April." },
      { id: "b", text: "Standing water averaged nine hours before and four hours after." },
      { id: "c", text: "The storms varied in size." },
      { id: "d", text: "The group plans more measurements." },
    ],
    reasoning: [
      { id: "a", text: "The measured duration was shorter afterward, though other factors may matter." },
      { id: "b", text: "The garden alone has been proven to cause every change." },
      { id: "c", text: "Rain stopped falling after April." },
    ],
    answer: { evidence: "b", reasoning: "a" },
    explanation: "Nine hours compared with four shows a decrease. Unequal storms and a possible drain change mean the notes cannot isolate the garden as the only cause.",
    hint: "Find the measured outcome, and keep the conclusion within what was observed.",
  },
  {
    id: "town-meeting", title: "A town meeting", category: "Civics", source: "Town council · meeting summary",
    paragraphs: [
      { label: "A", text: "At a public meeting, residents asked the council to add a marked crossing near the market. Several speakers described walking across the road with children while traffic was busy." },
      { label: "B", text: "The council requested a traffic count before deciding where to place a crossing. The count recorded 420 pedestrians on a Saturday and 190 on a Monday. Vehicles were counted on both days as well." },
      { label: "C", text: "Council members agreed to review the count with the road safety team next month. No location or construction date has been approved." },
    ],
    question: "What best supports the claim that the council has begun studying the crossing request?",
    evidence: [
      { id: "a", text: "Residents spoke about crossing with children." },
      { id: "b", text: "The council requested and received a traffic count." },
      { id: "c", text: "Saturday had more pedestrians than Monday." },
      { id: "d", text: "No construction date has been approved." },
    ],
    reasoning: [
      { id: "a", text: "Collecting traffic data is a step toward evaluating the request." },
      { id: "b", text: "A traffic count means construction is already scheduled." },
      { id: "c", text: "A public comment automatically becomes a council decision." },
    ],
    answer: { evidence: "b", reasoning: "a" },
    explanation: "Requesting and reviewing data shows the council is evaluating the request. The summary explicitly says no crossing has been approved.",
    hint: "Separate the residents' request from an action the council actually took.",
  },
  {
    id: "seed-trial", title: "Seeds in two rooms", category: "Science", source: "Classroom experiment · observation log",
    paragraphs: [
      { label: "A", text: "Two classes planted the same type of seeds in identical pots. Room 1 placed its pots near a sunny window; Room 2 placed its pots beneath a shaded shelf. Both classes watered their pots each morning." },
      { label: "B", text: "After three weeks, Room 1 plants averaged 18 centimeters in height. Room 2 plants averaged 11 centimeters. Room 1 was also warmer, and students did not measure the soil moisture." },
      { label: "C", text: "The students proposed a second trial with temperature and water levels measured more carefully." },
    ],
    question: "Which evidence best supports the observation that the plants in Room 1 grew taller?",
    evidence: [
      { id: "a", text: "Both classes watered each morning." },
      { id: "b", text: "Room 1 was warmer." },
      { id: "c", text: "Room 1 averaged 18 cm; Room 2 averaged 11 cm." },
      { id: "d", text: "The students proposed another trial." },
    ],
    reasoning: [
      { id: "a", text: "The height measurements compare growth directly, without proving the sole cause." },
      { id: "b", text: "The measurements prove sunlight was the only factor." },
      { id: "c", text: "The second trial already showed the same result." },
    ],
    answer: { evidence: "c", reasoning: "a" },
    explanation: "The measured averages establish the difference in height. Temperature and moisture were not controlled well enough to identify a single cause.",
    hint: "Choose the numbers that measure the exact outcome in the claim.",
  },
  {
    id: "bus-routes", title: "A new bus route", category: "Civics", source: "Transit office · public notice",
    paragraphs: [
      { label: "A", text: "The transit office introduced Route 8 in January to connect the clinic, market, and college. It runs every 30 minutes from 7 a.m. to 7 p.m." },
      { label: "B", text: "In March, the office surveyed 120 Route 8 riders. Of those riders, 46 said they used the route to reach the clinic at least once that month. The survey did not include residents who never rode the bus." },
      { label: "C", text: "The office will review ridership and travel times before changing the schedule. It has not yet surveyed users of other routes." },
    ],
    question: "Which evidence supports the limited claim that some surveyed riders used Route 8 to reach the clinic?",
    evidence: [
      { id: "a", text: "Route 8 runs every 30 minutes." },
      { id: "b", text: "The route connects the market and college." },
      { id: "c", text: "The office will review travel times." },
      { id: "d", text: "46 of 120 surveyed riders reported a clinic trip." },
    ],
    reasoning: [
      { id: "a", text: "A rider survey records clinic use among the people asked." },
      { id: "b", text: "It proves 46 of all residents visited the clinic by bus." },
      { id: "c", text: "It proves other bus routes are unnecessary." },
    ],
    answer: { evidence: "d", reasoning: "a" },
    explanation: "The survey directly reports clinic trips among Route 8 riders. Because non-riders were excluded, it cannot describe all residents.",
    hint: "The claim says surveyed riders. Find the survey result and keep that population in mind.",
  },
  {
    id: "market-waste", title: "Market waste audit", category: "Reading", source: "Market committee · weekly report",
    paragraphs: [
      { label: "A", text: "The committee put labeled compost bins beside the market's food stalls in June. Volunteers weighed waste collected on each of four Fridays before and after the bins were installed." },
      { label: "B", text: "Before the change, the market sent an average of 310 kilograms of mixed waste to disposal on Fridays. After the change, mixed waste averaged 240 kilograms, while compost bins collected an average of 55 kilograms." },
      { label: "C", text: "The committee says the early results are promising. It will check whether the change lasts during the busy holiday season." },
    ],
    question: "Which evidence best supports the claim that less mixed waste was sent to disposal after the bins appeared?",
    evidence: [
      { id: "a", text: "Mixed waste averaged 310 kg before and 240 kg after." },
      { id: "b", text: "The compost bins were labeled." },
      { id: "c", text: "The committee expects a busy holiday season." },
      { id: "d", text: "Volunteers measured on Fridays." },
    ],
    reasoning: [
      { id: "a", text: "The report says all waste vanished after June." },
      { id: "b", text: "The before-and-after average for mixed waste fell by 70 kg." },
      { id: "c", text: "The holiday season has already confirmed the result." },
    ],
    answer: { evidence: "a", reasoning: "b" },
    explanation: "The mixed-waste averages fell from 310 to 240 kilograms. That is a 70-kilogram decrease for the measured Fridays, not proof about all future weeks.",
    hint: "Compare the two mixed-waste amounts, not the compost total.",
  },
  {
    id: "oral-history", title: "The bridge story", category: "Civics", source: "Local archive · oral history excerpt",
    paragraphs: [
      { label: "A", text: "In a 1998 interview, resident Mara Ko recalled that the old footbridge flooded several times when she was a child. She remembered neighbors carrying supplies across by boat during one particularly heavy storm." },
      { label: "B", text: "A municipal record lists repairs to the footbridge in 1976 and 1981. It does not say whether flooding caused the damage. An archive photograph dated 1982 shows the bridge after a repair." },
      { label: "C", text: "The archive notes that memories and official records can answer different questions. Researchers are looking for weather records and other interviews to learn more." },
    ],
    question: "Which evidence best supports the claim that the bridge was repaired more than once?",
    evidence: [
      { id: "a", text: "Mara Ko remembered a heavy storm." },
      { id: "b", text: "Researchers are looking for weather records." },
      { id: "c", text: "A municipal record lists repairs in 1976 and 1981." },
      { id: "d", text: "A photograph shows the bridge in 1982." },
    ],
    reasoning: [
      { id: "a", text: "The dated record documents two separate repairs, while their causes remain uncertain." },
      { id: "b", text: "An interview proves the exact dates of both repairs." },
      { id: "c", text: "The photograph proves the bridge was never flooded." },
    ],
    answer: { evidence: "c", reasoning: "a" },
    explanation: "The municipal record names two repair dates. Neither it nor the photograph establishes the cause of the damage.",
    hint: "A claim about repair dates calls for a record with dates.",
  },
  {
    id: "reading-club", title: "Reading club", category: "Reading", source: "Student newspaper · interview",
    paragraphs: [
      { label: "A", text: "The school reading club moved its meetings from Friday afternoons to Wednesday lunch periods in September. Club leaders hoped the new time would fit more students' schedules." },
      { label: "B", text: "Attendance averaged 14 students during the final five Friday meetings and 22 during the first five Wednesday meetings. Club leaders also introduced graphic novels at the same time as the schedule change." },
      { label: "C", text: "A club leader said, 'The new time helped.' The newspaper notes that the change in books could also have affected attendance." },
    ],
    question: "Which evidence supports the claim that club attendance increased after the change?",
    evidence: [
      { id: "a", text: "The leaders hoped to fit more schedules." },
      { id: "b", text: "Attendance averaged 14 on Fridays and 22 on Wednesdays." },
      { id: "c", text: "The club introduced graphic novels." },
      { id: "d", text: "A leader said the new time helped." },
    ],
    reasoning: [
      { id: "a", text: "The numbers compare attendance, but two changes prevent a certain cause claim." },
      { id: "b", text: "A leader's opinion proves the schedule caused every additional visit." },
      { id: "c", text: "The numbers show the club lost eight students." },
    ],
    answer: { evidence: "b", reasoning: "a" },
    explanation: "The averages show eight more attendees after the changes. Because the book selection also changed, the figures alone cannot establish which change caused the increase.",
    hint: "Use attendance data to establish what happened, then check for another possible explanation.",
  },
];

export function gradeEvidence(caseItem: EvidenceCase, evidenceId: string, reasoningId: string) {
  return {
    evidenceCorrect: evidenceId === caseItem.answer.evidence,
    reasoningCorrect: reasoningId === caseItem.answer.reasoning,
  };
}

export function publicEvidenceCase({ answer: _answer, explanation: _explanation, hint: _hint, ...caseItem }: EvidenceCase) {
  return caseItem;
}
