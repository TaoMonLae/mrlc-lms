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
    question: "Which detail best shows that library use increased during the Tuesday pilot?",
    evidence: [
      { id: "a", text: "The pilot required extra staff for four Tuesday evenings." },
      { id: "b", text: "Visits averaged 28 during the pilot, compared with 12 before." },
      { id: "c", text: "Thirty-one surveyed visitors could not usually visit at lunch." },
      { id: "d", text: "The principal wants attendance figures from a longer period." },
    ],
    reasoning: [
      { id: "a", text: "The survey describes a barrier during lunch, not evening turnout." },
      { id: "b", text: "The two attendance averages show how Tuesday visits changed." },
      { id: "c", text: "The staffing cost describes a tradeoff in keeping later hours." },
    ],
    answer: { evidence: "b", reasoning: "b" },
    explanation: "The attendance comparison directly connects the later opening time with more visits. It does not prove why every student came or predict long-term demand.",
    hint: "Match the claim to a detail that measures use during the same time period.",
  },
  {
    id: "rain-garden", title: "The rain garden", category: "Science", source: "Community project · field notes",
    paragraphs: [
      { label: "A", text: "A neighborhood group planted a rain garden beside the bus stop in April. A rain garden is a shallow planted area that lets stormwater soak into the soil." },
      { label: "B", text: "Volunteers measured standing water after six storms. Before planting, water remained by the stop for an average of nine hours. After planting, it remained for an average of four hours. The storms were not all the same size." },
      { label: "C", text: "The group plans to keep measuring through the wet season. They also want to check whether a nearby drain was cleared during the project." },
    ],
    question: "Which detail best supports the observation that water cleared sooner after planting?",
    evidence: [
      { id: "a", text: "The group planted the garden beside the bus stop in April." },
      { id: "b", text: "The storms measured before and after planting varied in size." },
      { id: "c", text: "The group plans to monitor pooling through the wet season." },
      { id: "d", text: "Water remained nine hours before planting and four hours after." },
    ],
    reasoning: [
      { id: "a", text: "The two averages compare how long water remained at the stop." },
      { id: "b", text: "Different storm sizes limit what caused the shorter duration." },
      { id: "c", text: "A possible drain change needs checking before assigning a cause." },
    ],
    answer: { evidence: "d", reasoning: "a" },
    explanation: "Nine hours compared with four shows a decrease. Unequal storms and a possible drain change mean the notes cannot isolate the garden as the only cause.",
    hint: "Separate what the group observed from questions about why it happened.",
  },
  {
    id: "town-meeting", title: "A town meeting", category: "Civics", source: "Town council · meeting summary",
    paragraphs: [
      { label: "A", text: "At a public meeting, residents asked the council to add a marked crossing near the market. Several speakers described walking across the road with children while traffic was busy." },
      { label: "B", text: "The council requested a traffic count before deciding where to place a crossing. The count recorded 420 pedestrians on a Saturday and 190 on a Monday. Vehicles were counted on both days as well." },
      { label: "C", text: "Council members agreed to review the count with the road safety team next month. No location or construction date has been approved." },
    ],
    question: "Which detail shows that the council acted on the request before deciding?",
    evidence: [
      { id: "a", text: "The council requested and received a traffic count." },
      { id: "b", text: "Residents described crossing the busy road with children." },
      { id: "c", text: "The count found more pedestrians on Saturday than Monday." },
      { id: "d", text: "The council has approved no construction date or location." },
    ],
    reasoning: [
      { id: "a", text: "Pedestrian totals may inform a location, but none is approved." },
      { id: "b", text: "Residents' concerns explain the request, rather than the council's response." },
      { id: "c", text: "Requesting data is a step toward assessing a proposed crossing." },
    ],
    answer: { evidence: "a", reasoning: "c" },
    explanation: "Requesting and reviewing data shows the council is evaluating the request. The summary explicitly says no crossing has been approved.",
    hint: "Keep the request, the council's action, and the future decision distinct.",
  },
  {
    id: "seed-trial", title: "Seeds in two rooms", category: "Science", source: "Classroom experiment · observation log",
    paragraphs: [
      { label: "A", text: "Two classes planted the same type of seeds in identical pots. Room 1 placed its pots near a sunny window; Room 2 placed its pots beneath a shaded shelf. Both classes watered their pots each morning." },
      { label: "B", text: "After three weeks, Room 1 plants averaged 18 centimeters in height. Room 2 plants averaged 11 centimeters. Room 1 was also warmer, and students did not measure the soil moisture." },
      { label: "C", text: "The students proposed a second trial with temperature and water levels measured more carefully." },
    ],
    question: "Which detail best supports the observation that Room 1 plants were taller after three weeks?",
    evidence: [
      { id: "a", text: "Both classes watered their pots each morning for three weeks." },
      { id: "b", text: "Room 1 pots sat near a sunny window for three weeks." },
      { id: "c", text: "Room 1 plants averaged 18 cm; Room 2 plants averaged 11 cm." },
      { id: "d", text: "Students planned another trial to measure water and temperature." },
    ],
    reasoning: [
      { id: "a", text: "The light difference could matter, but it is not a height measurement." },
      { id: "b", text: "The two height averages directly compare the plants in both rooms." },
      { id: "c", text: "A new trial could test causes, but it has no results yet." },
    ],
    answer: { evidence: "c", reasoning: "b" },
    explanation: "The measured averages establish the difference in height. Temperature and moisture were not controlled well enough to identify a single cause.",
    hint: "Decide whether the claim concerns a measured result or a possible cause.",
  },
  {
    id: "bus-routes", title: "A new bus route", category: "Civics", source: "Transit office · public notice",
    paragraphs: [
      { label: "A", text: "The transit office introduced Route 8 in January to connect the clinic, market, and college. It runs every 30 minutes from 7 a.m. to 7 p.m." },
      { label: "B", text: "In March, the office surveyed 120 Route 8 riders. Of those riders, 46 said they used the route to reach the clinic at least once that month. The survey did not include residents who never rode the bus." },
      { label: "C", text: "The office will review ridership and travel times before changing the schedule. It has not yet surveyed users of other routes." },
    ],
    question: "Which detail shows actual clinic use by the people surveyed?",
    evidence: [
      { id: "a", text: "Route 8 connected the clinic, market, and college in January." },
      { id: "b", text: "Forty-six of 120 riders reported a clinic trip that month." },
      { id: "c", text: "The service ran every 30 minutes during the daytime." },
      { id: "d", text: "The office planned to review ridership before changing the schedule." },
    ],
    reasoning: [
      { id: "a", text: "The route's stops show access but not whether anyone used it." },
      { id: "b", text: "The missing non-riders limit claims about the whole community." },
      { id: "c", text: "The rider responses count clinic trips among the surveyed group." },
    ],
    answer: { evidence: "b", reasoning: "c" },
    explanation: "The survey directly reports clinic trips among Route 8 riders. Because non-riders were excluded, it cannot describe all residents.",
    hint: "Notice the difference between a route being available and someone using it.",
  },
  {
    id: "market-waste", title: "Market waste audit", category: "Reading", source: "Market committee · weekly report",
    paragraphs: [
      { label: "A", text: "The committee put labeled compost bins beside the market's food stalls in June. Volunteers weighed waste collected on each of four Fridays before and after the bins were installed." },
      { label: "B", text: "Before the change, the market sent an average of 310 kilograms of mixed waste to disposal on Fridays. After the change, mixed waste averaged 240 kilograms, while compost bins collected an average of 55 kilograms." },
      { label: "C", text: "The committee says the early results are promising. It will check whether the change lasts during the busy holiday season." },
    ],
    question: "Which detail best supports that mixed waste sent to disposal decreased?",
    evidence: [
      { id: "a", text: "Mixed waste averaged 310 kg before and 240 kg after." },
      { id: "b", text: "Compost bins collected 55 kilograms on an average Friday." },
      { id: "c", text: "Volunteers weighed market waste on four Fridays in each period." },
      { id: "d", text: "The committee will check results during the busy holiday season." },
    ],
    reasoning: [
      { id: "a", text: "The two averages compare the same disposal stream over time." },
      { id: "b", text: "The compost amount shows how much entered the new bins." },
      { id: "c", text: "The Friday schedule limits what can be said about other days." },
    ],
    answer: { evidence: "a", reasoning: "a" },
    explanation: "The mixed-waste averages fell from 310 to 240 kilograms. That is a 70-kilogram decrease for the measured Fridays, not proof about all future weeks.",
    hint: "Check which waste stream the claim names before comparing figures.",
  },
  {
    id: "oral-history", title: "The bridge story", category: "Civics", source: "Local archive · oral history excerpt",
    paragraphs: [
      { label: "A", text: "In a 1998 interview, resident Mara Ko recalled that the old footbridge flooded several times when she was a child. She remembered neighbors carrying supplies across by boat during one particularly heavy storm." },
      { label: "B", text: "A municipal record lists repairs to the footbridge in 1976 and 1981. It does not say whether flooding caused the damage. An archive photograph dated 1982 shows the bridge after a repair." },
      { label: "C", text: "The archive notes that memories and official records can answer different questions. Researchers are looking for weather records and other interviews to learn more." },
    ],
    question: "Which detail best supports the claim that the footbridge was repaired more than once?",
    evidence: [
      { id: "a", text: "Mara Ko recalled several floods when she was a child." },
      { id: "b", text: "A 1982 photograph shows the footbridge after a repair." },
      { id: "c", text: "Researchers are looking for weather records and additional interviews." },
      { id: "d", text: "The municipal record lists footbridge repairs in 1976 and 1981." },
    ],
    reasoning: [
      { id: "a", text: "The record names two separate years in which repairs occurred." },
      { id: "b", text: "The interview describes storms, though it does not date repairs." },
      { id: "c", text: "The photograph confirms a repaired bridge, though it shows one moment." },
    ],
    answer: { evidence: "d", reasoning: "a" },
    explanation: "The municipal record names two repair dates. Neither it nor the photograph establishes the cause of the damage.",
    hint: "Ask whether a source establishes one repair, several repairs, or something else.",
  },
  {
    id: "reading-club", title: "Reading club", category: "Reading", source: "Student newspaper · interview",
    paragraphs: [
      { label: "A", text: "The school reading club moved its meetings from Friday afternoons to Wednesday lunch periods in September. Club leaders hoped the new time would fit more students' schedules." },
      { label: "B", text: "Attendance averaged 14 students during the final five Friday meetings and 22 during the first five Wednesday meetings. Club leaders also introduced graphic novels at the same time as the schedule change." },
      { label: "C", text: "A club leader said, 'The new time helped.' The newspaper notes that the change in books could also have affected attendance." },
    ],
    question: "Which detail best supports that reading club attendance increased across the change?",
    evidence: [
      { id: "a", text: "Leaders hoped Wednesday lunches would fit more student schedules." },
      { id: "b", text: "The club added graphic novels when it changed meeting times." },
      { id: "c", text: "Attendance averaged 14 on Fridays and 22 on Wednesdays." },
      { id: "d", text: "A leader credited the new time for higher attendance." },
    ],
    reasoning: [
      { id: "a", text: "The leader's view suggests a cause but does not measure turnout." },
      { id: "b", text: "The two averages show higher attendance during the Wednesday meetings." },
      { id: "c", text: "The new books offer another possible reason for increased turnout." },
    ],
    answer: { evidence: "c", reasoning: "b" },
    explanation: "The averages show eight more attendees after the changes. Because the book selection also changed, the figures alone cannot establish which change caused the increase.",
    hint: "Consider what establishes a change and what merely proposes a cause.",
  },
];

export function gradeEvidence(caseItem: EvidenceCase, evidenceId: string, reasoningId: string) {
  return {
    evidenceCorrect: evidenceId === caseItem.answer.evidence,
    reasoningCorrect: reasoningId === caseItem.answer.reasoning,
  };
}

export function evidenceAttemptResponse(caseItem: EvidenceCase, attempts: number, solved: boolean) {
  return solved
    ? { solved, attempts, answer: caseItem.answer, explanation: caseItem.explanation }
    : { solved, attempts, hint: caseItem.hint };
}

export function publicEvidenceCase({ answer: _answer, explanation: _explanation, hint: _hint, ...caseItem }: EvidenceCase) {
  return caseItem;
}
