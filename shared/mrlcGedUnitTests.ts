import type { CourseQuestion } from './courses';

type RawQuestion = { kind: 'CHOICE' | 'NUMERIC'; prompt: string; answer: string; options: string[]; explanation: string };
const c = (prompt: string, answer: string, wrong: [string, string, string], explanation: string): RawQuestion => ({ kind: 'CHOICE', prompt, answer, options: [answer, ...wrong], explanation });
const n = (prompt: string, answer: string, explanation: string): RawQuestion => ({ kind: 'NUMERIC', prompt, answer, options: [], explanation });
type ChapterCheck = { passage: string; questions: [RawQuestion, RawQuestion, RawQuestion] };

// Original short sources and problems. These are MRLC chapter checks, not
// reproductions or simulations of secure GED test items.
const checks: Record<string, ChapterCheck[]> = {
  rla: [
    { passage: 'A community library began opening an hour earlier on weekdays. Its log shows 12 visitors before 9 a.m. on Monday and 15 on Tuesday. The director plans to review a full month of records before deciding whether to keep the hours.', questions: [
      c('Which statement best expresses the passage’s central idea?', 'The library is testing an earlier opening time.', ['The library will close on Tuesdays.', 'Every visitor prefers mornings.', 'The director has decided to add staff.'], 'The schedule change and planned review are the main points.'),
      c('Which detail directly supports the claim that someone used the early hour?', 'The log lists 12 visitors before 9 a.m. on Monday.', ['The director has a plan.', 'The library serves the community.', 'A month contains several weeks.'], 'The visitor count records use of the early hour.'),
      c('What conclusion is best supported?', 'Two days of records are not enough for the director’s final decision.', ['The change has failed.', 'The library has doubled its visitors.', 'The director will keep the hours permanently.'], 'The director intends to review a full month before deciding.'),
    ] },
    { passage: 'A student proposes a quiet room and reports that 36 of 50 survey respondents requested one. Another student opposes the plan because the school has not measured the cost of staffing it. Both agree that the current study hall is noisy.', questions: [
      c('Which evidence most directly supports demand for a quiet room?', 'Thirty-six of 50 respondents requested one.', ['The school has a study hall.', 'The second student disagrees.', 'Rooms require doors.'], 'The survey directly measures expressed demand among respondents.'),
      c('What is a valid limitation of the survey?', 'It may not represent students who did not respond.', ['It proves every student wants the room.', 'It measures staff costs exactly.', 'It shows that noise is harmless.'], 'The 50 respondents might differ from nonrespondents.'),
      c('Which additional evidence would best address the opposing argument?', 'An estimate of staffing cost and available funds.', ['A list of room colors.', 'A second statement that the hall is noisy.', 'A description of the school’s founding.'], 'The objection concerns the cost of staffing the room.'),
    ] },
    { passage: 'Mina waited beside the empty bus stop with a spare umbrella. When Arun arrived in the rain, she handed it to him, though the two had argued that morning. He thanked her, and they walked to class together.', questions: [
      c('Which action most clearly shows Mina setting aside the argument?', 'She gives Arun the spare umbrella.', ['She waits at the bus stop.', 'Rain falls before class.', 'Arun arrives at the bus stop.'], 'Her helpful choice despite the argument shows a change in behavior.'),
      c('Which theme is supported by the passage?', 'Kindness can reopen a strained relationship.', ['Umbrellas are expensive.', 'Rain always causes arguments.', 'Bus stops are unsafe.'], 'The act of kindness is followed by thanks and a shared walk.'),
      c('What can the reader infer about Arun’s response?', 'He appreciates Mina’s gesture.', ['He refuses to speak to Mina.', 'He owns the umbrella.', 'He planned the rain.'], 'He thanks her and walks with her.'),
    ] },
    { passage: 'A school newsletter draft reads: “The meeting ended, the volunteers cleaned the room. Because they wanted the next group to use it.” The editor wants complete sentences and clear relationships.', questions: [
      c('Which revision correctly joins the first two complete clauses?', 'The meeting ended, and the volunteers cleaned the room.', ['The meeting ended, the volunteers cleaned the room.', 'The meeting ended the volunteers cleaned the room.', 'The meeting ended, because and the volunteers cleaned.'], 'A comma plus “and” correctly joins the two independent clauses.'),
      c('Which revision makes the second statement complete?', 'They cleaned the room because they wanted the next group to use it.', ['Because they wanted the next group to use it.', 'Wanted the next group to use it.', 'Because the next group, to use it.'], 'The dependent reason is attached to a complete main clause.'),
      c('Which part of the original draft is a sentence fragment?', 'Because they wanted the next group to use it.', ['The meeting ended', 'The volunteers cleaned the room', 'The meeting ended, the volunteers cleaned the room'], 'A clause beginning with “because” cannot stand alone here.'),
    ] },
    { passage: 'An editor must arrange these notes: (1) The new reading room seats 20 people. (2) The old room seated only 12. (3) The school opened the larger room after attendance grew. (4) The cafeteria sells fruit on Fridays.', questions: [
      c('Which note does not support the paragraph about the reading room?', 'The cafeteria sells fruit on Fridays.', ['The new room seats 20.', 'The old room seated 12.', 'Attendance grew.'], 'The cafeteria note is unrelated to room capacity and its cause.'),
      c('Which order best explains the change?', 'Old capacity, attendance growth, then new capacity.', ['Fruit sales, new capacity, old capacity.', 'New capacity, fruit sales, attendance growth.', 'Attendance growth, fruit sales, old capacity.'], 'The sequence states the previous situation, reason, and resulting change.'),
      c('Which transition best links the old and new capacities?', 'By comparison,', ['For example,', 'Meanwhile,', 'In conclusion,'], 'A comparison explicitly relates 12 seats to 20 seats.'),
    ] },
    { passage: 'Proposal A says a second water station reduced waiting during a one-week trial: average waits fell from eight minutes to four. Proposal B says a painted wall would reduce waiting because students would feel happier. No wait times were measured for Proposal B.', questions: [
      c('Which proposal has stronger evidence for reducing wait time?', 'Proposal A, because it reports measured waits before and during a trial.', ['Proposal B, because its wall is colorful.', 'Both, because neither mentions time.', 'Proposal B, because happiness always halves a queue.'], 'Proposal A offers data directly connected to the claimed outcome.'),
      c('Which caution should a careful response include?', 'Other changes during the trial might also have affected wait time.', ['Four minutes proves every future wait will be four minutes.', 'No one used the water station.', 'A one-week trial measures an entire year.'], 'A trial supports a claim but does not exclude every other possible cause.'),
      c('Which thesis best responds to both arguments?', 'Proposal A is better supported by wait-time data, though a longer trial would improve confidence.', ['Water is useful.', 'Both proposals are exactly the same.', 'Painted walls are always harmful.'], 'It selects one argument, cites comparative evidence, and acknowledges a limitation.'),
    ] },
    { passage: 'Draft: “The new timetable is good. It is a nice change. People like it.” A revision should name evidence and remove vague repetition.', questions: [
      c('Which revision is most precise?', 'The new timetable adds a morning bus that 18 surveyed riders requested.', ['The timetable is really very good.', 'The change is nice and good.', 'People like many things about it.'], 'The revision names the change and evidence instead of repeating a vague opinion.'),
      c('What is the main weakness of “People like it” in this draft?', 'The sentence gives no specific people or evidence.', ['It is written in the present tense.', 'It contains a subject and a verb.', 'It is shorter than the first sentence.'], 'The claim lacks a defined group or support.'),
      c('Which editing step should come before polishing punctuation?', 'Check whether the paragraph has a clear claim and support.', ['Change every word to a longer synonym.', 'Count every comma.', 'Delete all short sentences.'], 'A clear argument and evidence matter before surface corrections.'),
    ] },
    { passage: 'Report draft: “The collection of maps are on the shelf. Rina gave Leila her notes after she finished the chart.” The editor wants agreement and clear pronoun reference.', questions: [
      c('Which verb agrees with the subject in the first sentence?', 'is', ['are', 'were', 'have'], '“Collection” is the singular subject; “of maps” does not change its number.'),
      c('What is unclear in the second sentence?', 'Who finished the chart.', ['Whether there were notes.', 'Whether Leila is a name.', 'Whether the shelf holds maps.'], '“She” could refer to Rina or Leila.'),
      c('Which revision clarifies that Rina finished the chart?', 'After Rina finished the chart, she gave her notes to Leila.', ['Rina gave Leila her notes after she finished it.', 'She gave her notes to her after finishing.', 'After the chart, she gave her notes.'], 'Naming Rina in the introductory clause resolves the reference.'),
    ] },
    { passage: 'A notice says: “Its time to return the teachers books. Students can leave them over there after class.” The editor must correct meaning and possession.', questions: [
      c('Which form correctly means “it is” in the notice?', 'It’s', ['Its', 'Its’', 'It’s’'], '“It’s” is the contraction of “it is.”'),
      c('Which form shows that the books belong to multiple teachers?', 'teachers’ books', ['teacher books', 'teacher’s books', 'teachers books'], 'The plural possessive has the apostrophe after the plural -s.'),
      c('Which word in the original notice identifies a place?', 'there', ['their', 'they’re', 'theirs'], '“There” points to a location; “their” shows possession.'),
    ] },
  ],
  math: [
    { passage: 'A class buys four folders at RM3 each and two markers at RM5 each.', questions: [
      n('What is the total cost in RM?', '22', 'Four folders cost 12 and two markers cost 10; together they cost 22.'),
      c('Which expression represents the total?', '4 × 3 + 2 × 5', ['4 + 3 × 2 + 5', '4 × (3 + 2) × 5', '4 + 3 + 2 + 5'], 'Multiply quantity by unit price for each item, then add.'),
      n('If the class pays RM25, what change should it receive in RM?', '3', 'Subtract the total cost of 22 from 25.'),
    ] },
    { passage: 'A recipe uses 3/4 litre of water. The cook has already added 0.25 litre.', questions: [
      n('How many litres are still needed?', '0.5', 'Three quarters is 0.75; subtract 0.25 to obtain 0.5.'),
      c('Which fraction is equal to 0.25?', '1/4', ['1/2', '1/3', '3/4'], 'Twenty-five hundredths simplifies to one quarter.'),
      n('If the recipe is doubled, how many litres of water are needed altogether?', '1.5', 'Two times 0.75 litre is 1.5 litres.'),
    ] },
    { passage: 'A shop offers 2 kg of rice for RM13. A second shop offers 3 kg for RM18.', questions: [
      n('What is the second shop’s price per kg in RM?', '6', 'Divide 18 by 3 to obtain RM6 per kg.'),
      c('Which shop has the lower unit price?', 'The second shop', ['The first shop', 'They are equal', 'It cannot be determined'], 'The first costs RM6.50/kg; the second costs RM6/kg.'),
      n('A price rises from RM40 to RM50. What is the percent increase?', '25', 'The increase of 10 is 10/40 of the original price, or 25%.'),
    ] },
    { passage: 'The numbers of books read by four students are 2, 3, 3 and 8. A bag separately contains two red and three blue tokens.', questions: [
      n('What is the mean number of books?', '4', 'The sum 16 divided by four students is 4.'),
      n('What is the median number of books?', '3', 'The middle two values in sorted order are both 3.'),
      c('What is the probability of drawing a red token if all five tokens are equally likely?', '2/5', ['3/5', '1/2', '2/3'], 'Two of the five possible tokens are red.'),
    ] },
    { passage: 'A service charges RM6 to register and RM4 for each visit. Let v be the number of visits.', questions: [
      c('Which expression gives total cost?', '6 + 4v', ['6v + 4', '10v', '6 + v + 4'], 'The registration fee is fixed; each visit adds RM4.'),
      n('What is the cost in RM for three visits?', '18', 'Substitute v = 3: 6 + 4 × 3 = 18.'),
      c('Which expression is equivalent to 3(x + 2) − x?', '2x + 6', ['3x + 2', '4x + 6', '2x + 2'], 'Distribute 3 and combine the like x terms.'),
    ] },
    { passage: 'A tank begins with 5 litres of water and receives 3 litres per minute. Let t be minutes and V be the total volume in litres.', questions: [
      c('Which equation models the volume?', 'V = 5 + 3t', ['V = 3 + 5t', 'V = 15t', 'V = 5 − 3t'], 'The starting volume is 5 and the rate is 3 per minute.'),
      n('How many litres are in the tank after four minutes?', '17', 'Substitute t = 4: 5 + 3 × 4 = 17.'),
      n('At what time in minutes will the tank contain 26 litres?', '7', 'Solve 5 + 3t = 26, so 3t = 21 and t = 7.'),
    ] },
    { passage: 'A rectangular garden is 6 m long and 4 m wide. A separate right triangle has legs of 3 m and 4 m.', questions: [
      n('What is the garden area in square metres?', '24', 'A rectangle’s area is length times width: 6 × 4 = 24.'),
      n('What is the garden perimeter in metres?', '20', 'The boundary is 2 × (6 + 4) = 20 metres.'),
      n('What is the right triangle’s hypotenuse in metres?', '5', 'Use the Pythagorean relationship: √(3² + 4²) = 5.'),
    ] },
  ],
  'social-studies': [
    { passage: 'A town report lists monthly bus ridership rising from 800 to 900. A campaign flyer says, “Every resident now prefers the bus.” The report does not survey preferences.', questions: [
      c('Which claim is directly supported by the report?', 'Recorded bus rides increased by 100.', ['Every resident prefers buses.', 'No resident drives.', 'Bus fares fell by 100%.'], 'Subtract 800 from 900; ridership is recorded but preferences are not.'),
      c('What is the flyer’s main weakness?', 'It generalizes preferences without survey evidence.', ['It mentions a bus.', 'It refers to residents.', 'It uses a complete sentence.'], 'Ridership counts do not establish every resident’s preference.'),
      c('What evidence would best test the flyer’s claim?', 'A representative survey about travel preferences.', ['The color of the bus.', 'A map of the town name.', 'The date the report was printed.'], 'A representative preference survey directly addresses the claim.'),
    ] },
    { passage: 'A museum label dates a factory opening to 1900. A town record shows population rising between 1900 and 1920. A diary from 1910 describes workers arriving for jobs.', questions: [
      c('Which source is a firsthand account of a worker’s period?', 'The 1910 diary', ['The museum label', 'A modern textbook summary', 'A present-day visitor guide'], 'A diary written during the period is a primary account.'),
      c('Which statement best respects the evidence?', 'Factory jobs may have contributed to growth, but other causes should be checked.', ['The factory explains every move into town.', 'No one moved for work.', 'The population was unchanged.'], 'The timeline and diary suggest a connection without excluding other causes.'),
      c('What should a historian examine next to test the explanation?', 'Additional employment and migration records.', ['The museum gift-shop schedule.', 'One current weather forecast.', 'Only the factory’s paint color.'], 'Employment and migration records directly help test the proposed cause.'),
    ] },
    { passage: 'A proposed national law passes one chamber of Congress. Some supporters say it is already law; others say more steps remain.', questions: [
      c('Which institution is acting when Congress debates the proposal?', 'The legislative branch', ['The judicial branch', 'A state court alone', 'A local library'], 'Congress belongs to the legislative branch.'),
      c('Why is the supporters’ claim too strong?', 'Passing one chamber is not the entire lawmaking process.', ['Congress cannot discuss laws.', 'Every proposal automatically becomes law.', 'The courts wrote the proposal.'], 'A bill needs the remaining required steps before it becomes law.'),
      c('Which principle describes separate national and state powers?', 'Federalism', ['Inflation', 'Judicial precedent', 'Opportunity cost'], 'Federalism divides governmental authority between national and state levels.'),
    ] },
    { passage: 'A school has RM300 available. It can buy two computers or replace worn desks, but not both this term.', questions: [
      c('What economic idea does the choice illustrate?', 'Scarcity', ['Unlimited resources', 'A guaranteed profit', 'A population census'], 'The budget cannot cover both desired purchases.'),
      c('If the school chooses computers, what is a possible opportunity cost?', 'The replacement desks it gives up.', ['The computers it receives.', 'Money that does not exist.', 'The current weather.'], 'Opportunity cost is the next best forgone choice.'),
      n('If a computer costs RM120, how much of the RM300 budget remains after buying two?', '60', 'Two computers cost RM240; 300 − 240 = RM60.'),
    ] },
    { passage: 'On a map, two towns are 4 cm apart and the scale is 1 cm = 15 km. A river runs near both towns; the map does not show jobs or transport routes.', questions: [
      n('What distance in kilometres does the map represent?', '60', 'Multiply 4 cm by 15 km per centimetre.'),
      c('What cannot be concluded from this map alone?', 'The river is the only reason either town grew.', ['A river runs near both towns.', 'The towns are shown on the map.', 'The scale converts centimetres to kilometres.'], 'The map lacks other factors such as jobs or roads.'),
      c('What would help explain differences in the towns’ populations?', 'Population records and transport or employment data.', ['Only the map’s ink color.', 'The paper size alone.', 'A single town’s name.'], 'Additional records can test several possible explanations.'),
    ] },
  ],
  science: [
    { passage: 'A class grows two sets of identical seedlings. One set receives six hours of light per day, the other two. All plants receive the same water and soil. Heights are measured after four weeks.', questions: [
      c('What variable does the class change?', 'Hours of light', ['Plant height after four weeks', 'Water amount', 'Soil type'], 'The two sets differ in their light exposure.'),
      c('What is the measured outcome?', 'Seedling height', ['Soil type', 'Water amount', 'Type of ruler'], 'Height is recorded after the experiment.'),
      c('Why keep water and soil the same?', 'To reduce alternative explanations for a height difference.', ['To guarantee every plant reaches the same height.', 'To make light impossible to measure.', 'To remove all natural variation.'], 'Controls help isolate the effect of changing light.'),
    ] },
    { passage: 'A pond food web includes algae, insects and fish. Insects eat algae; fish eat insects. A second pond has fewer fish but also less algae.', questions: [
      c('Which organism is the producer in the described food web?', 'Algae', ['Fish', 'Insects', 'Both fish and insects'], 'Algae produce food using light rather than eating other organisms.'),
      c('Why can the number of insects not be predicted from fish counts alone?', 'Algae availability and other factors also affect insects.', ['Fish never eat insects.', 'Algae cannot change.', 'All ponds are identical.'], 'More than one part of the food web affects insect numbers.'),
      c('Which observation would best test a claim that fish numbers affect insects?', 'Repeated insect counts alongside fish counts in comparable ponds.', ['A single photograph of one fish.', 'The pond’s name.', 'An unrelated weather report.'], 'Comparable measurements over time can test the relationship.'),
    ] },
    { passage: 'A station records rainfall every month for two years. Year 1 totals 900 mm; Year 2 totals 950 mm. A headline declares that the area’s climate has permanently changed.', questions: [
      n('How many millimetres higher is Year 2’s rainfall?', '50', 'Subtract 900 from 950 to find the measured difference.'),
      c('What is the headline’s main problem?', 'Two years do not establish a permanent climate trend.', ['Rainfall cannot be measured.', 'The totals are identical.', 'Weather and climate always mean the same thing.'], 'Climate claims need a much longer record and context.'),
      c('Which evidence would improve the climate claim?', 'Many decades of consistent rainfall measurements.', ['One rainy afternoon.', 'A photograph of a cloud.', 'Only the second year’s total.'], 'Long-term measurements are more relevant to climate.'),
    ] },
    { passage: 'A bicycle travels 120 m in 40 s. In another experiment, a closed container has 5 g of one reactant and 7 g of a second reactant.', questions: [
      n('What is the bicycle’s average speed in metres per second?', '3', 'Average speed is 120 ÷ 40 = 3 m/s.'),
      n('If no matter enters or leaves, what total mass in grams should the products have?', '12', 'In a closed system, 5 g + 7 g = 12 g of matter.'),
      c('What cannot be known from the bicycle’s average speed alone?', 'Its speed at every instant.', ['Its total distance.', 'Its total time.', 'Its average speed.'], 'Average speed does not describe every moment of a journey.'),
    ] },
  ],
};

const extraChecks: Record<string, [RawQuestion, RawQuestion][]> = {
  rla: [
    [c('Which detail shows the director has not decided on a permanent change?', 'A full month of records will be reviewed.', ['Monday had 12 visitors.', 'The library opens on weekdays.', 'Tuesday had 15 visitors.'], 'The review is planned before a final decision.'), c('What does “log” mean in this source?', 'A record of visits', ['A piece of wood', 'A complaint letter', 'A calendar of holidays'], 'The recorded visitor counts make the meaning clear.')],
    [c('Which statement is a claim rather than measured evidence?', 'The quiet room will benefit every student.', ['Thirty-six respondents requested it.', 'Fifty students responded.', 'Staffing costs were not measured.'], 'A prediction about every student goes beyond the reported data.'), c('What do the two students agree on?', 'The current study hall is noisy.', ['The room is free to staff.', 'The plan must be rejected.', 'Every student answered the survey.'], 'The final sentence identifies their shared observation.')],
    [c('Which event happens first?', 'Mina and Arun argue.', ['Arun thanks Mina.', 'They walk to class.', 'Mina hands over the umbrella.'], 'The argument happened that morning, before the rain encounter.'), c('What does the spare umbrella suggest about Mina?', 'She had an umbrella available to share.', ['She missed the bus.', 'She bought a new umbrella for Arun.', 'She planned to argue again.'], '“Spare” indicates an extra umbrella, not an unstated purchase.')],
    [c('What is the error in “The meeting ended, the volunteers cleaned the room”?', 'A comma splice between complete clauses', ['An unclear pronoun', 'A missing subject', 'A tense shift'], 'A comma alone cannot join those two independent clauses.'), c('Which punctuation could also join the two clauses correctly?', 'A semicolon', ['An apostrophe', 'A question mark inside the first clause', 'A comma alone'], 'A semicolon can connect two closely related complete clauses.')],
    [c('Which sentence best introduces a paragraph on room capacity?', 'The school expanded its reading room after attendance increased.', ['Fruit is sold on Fridays.', 'Many rooms have walls.', 'Old furniture is sometimes heavy.'], 'The topic sentence names the change and its reason.'), c('What is the change in capacity?', 'Eight more seats', ['Eight fewer seats', 'Twenty more seats', 'Twelve more seats'], 'Subtract the previous 12 seats from the new 20 seats.')],
    [c('Which phrase signals an unsupported assertion in Proposal B?', 'Students would feel happier.', ['Eight minutes', 'One-week trial', 'Four minutes'], 'It predicts a feeling without measured wait-time evidence.'), c('Which evidence would strengthen Proposal A further?', 'Wait times measured over several more weeks.', ['A photo of the station sign.', 'A description of wall paint.', 'One person’s guess.'], 'More repeated observations can test whether the decrease persists.')],
    [c('Which original sentence mainly repeats the first without adding evidence?', 'It is a nice change.', ['The new timetable is good.', 'People like it.', 'A timetable lists times.'], '“Nice change” restates the positive judgment without a reason.'), c('Which question would help an editor find useful evidence?', 'What changed in the schedule and who used the new time?', ['Which word is longest?', 'Can every sentence end in an exclamation point?', 'Can the timetable be called nice again?'], 'Specific usage and change would support a precise claim.')],
    [c('Which word is the subject of “The collection of maps are on the shelf”?', 'collection', ['maps', 'shelf', 'on'], 'The head of the noun phrase is “collection.”'), c('Which revision clearly says Leila finished the chart?', 'After Leila finished the chart, Rina gave her the notes.', ['Rina gave Leila her notes after she finished.', 'After she finished, her notes were given.', 'Rina gave her notes to her.'], 'Naming Leila in the time clause removes the ambiguity.')],
    [c('Which correction shows possession by one teacher?', 'the teacher’s book', ['the teachers book', 'the teachers’ book', 'the teacher book’s'], 'The singular possessive puts the apostrophe before s.'), c('Which sentence uses “their” correctly?', 'Students placed their books on the table.', ['Students placed there books on the table.', 'Students placed they’re books on the table.', 'Students placed their over there books.'], '“Their” shows that the books belong to the students.')],
  ],
  math: [
    [n('How much do the four folders cost in RM?', '12', 'Four folders at RM3 each cost 4 × 3 = RM12.'), n('How much do the two markers cost in RM?', '10', 'Two markers at RM5 each cost RM10.')],
    [n('What is 3/4 written as a decimal?', '0.75', 'Divide 3 by 4 to get 0.75.'), n('How many litres are needed for half the recipe?', '0.375', 'Half of 0.75 litre is 0.375 litre.')],
    [n('What is the first shop’s price per kg in RM?', '6.5', 'Divide RM13 by 2 kg to obtain RM6.50/kg.'), n('What is the price difference per kg in RM?', '0.5', 'The unit prices differ by 6.50 − 6.00 = RM0.50.')],
    [n('What is the range of books read?', '6', 'The greatest value 8 minus the least value 2 is 6.'), c('Which value is the mode?', '3', ['2', '4', '8'], 'Three occurs twice; the others occur once.')],
    [n('What is the cost for zero visits in RM?', '6', 'The fixed registration cost remains when v = 0.'), n('What is the coefficient of v in 6 + 4v?', '4', 'The coefficient multiplying v is 4.')],
    [n('How much water is in the tank after two minutes?', '11', 'Compute 5 + 3 × 2 = 11 litres.'), c('What does the slope of V = 5 + 3t represent?', 'Three litres added per minute', ['Five litres added per minute', 'The tank’s final capacity', 'Three minutes to fill the tank'], 'The coefficient of time is the rate of increase.')],
    [n('What is the length of the garden’s diagonal in metres, rounded to two decimals?', '7.21', 'The diagonal is √(6² + 4²) = √52 ≈ 7.21 metres.'), n('What is the right triangle’s area in square metres?', '6', 'One-half times the legs gives 3 × 4 ÷ 2 = 6.')],
  ],
  'social-studies': [
    [n('By what percent did recorded ridership rise from 800 to 900?', '12.5', 'The increase of 100 divided by the starting 800 is 12.5%.'), c('Which source is trying to persuade rather than simply report a count?', 'The campaign flyer', ['The ridership table', 'A ticket count', 'A dated tally'], 'The flyer makes a broad preference claim to influence readers.')],
    [c('Which event occurred between the factory opening and the 1920 record?', 'The 1910 diary entry', ['The 1900 opening', 'The 1920 population count', 'A 1930 report'], 'The diary is dated 1910, between 1900 and 1920.'), c('Which detail is not supplied by the three sources?', 'The exact number of workers who moved for the factory.', ['The factory opened in 1900.', 'A worker diary dates to 1910.', 'Population rose by 1920.'], 'No count of relocating workers appears in these sources.')],
    [c('What branch could later interpret the law in a case?', 'The judicial branch', ['The legislative branch alone', 'A campaign committee', 'A private business'], 'Courts interpret laws in cases.'), c('What is a reason to check the bill’s status before calling it law?', 'The source describes only one chamber’s passage.', ['Every bill is automatically signed.', 'Courts create every bill.', 'The proposal has no topic.'], 'The described action is only part of the process.')],
    [n('If replacement desks cost RM280, how much would remain in RM after buying them?', '20', 'Subtract 280 from the RM300 budget.'), c('Which information would help compare the two purchases?', 'Expected benefits and useful life of each option', ['Only the color of the receipt', 'The order of words in the school name', 'A random guess about weather'], 'The decision involves trade-offs and benefits over time.')],
    [n('If the map distance were 2 cm, what distance in kilometres would it show?', '30', 'Two centimetres times 15 kilometres per centimetre is 30.'), c('Which item on a map explains what a line symbol represents?', 'The legend', ['The title alone', 'The paper edge', 'The printing date alone'], 'A legend defines map symbols.')],
  ],
  science: [
    [c('What should a graph of the result place on its vertical axis?', 'Seedling height with a unit', ['The researcher’s favorite color', 'Only the word light', 'An unlabeled number'], 'The measured outcome belongs on a labeled axis.'), c('What is a possible improvement to the investigation?', 'Use several seedlings in each group.', ['Change light and water together.', 'Use different soil for each group.', 'Stop measuring growth.'], 'Replicates reduce the influence of variation in one plant.')],
    [c('What eats the algae in the described food web?', 'Insects', ['Fish', 'The pond', 'Sunlight'], 'The source explicitly says insects eat algae.'), c('Which observation could indicate less energy entering the insect level?', 'A decline in available algae.', ['An increase in the pond’s name length.', 'A fish changing color.', 'A different drawing style.'], 'Algae are the insects’ food in this simplified web.')],
    [n('What was the average yearly rainfall in millimetres across the two reported years?', '925', 'Add 900 and 950, then divide by two.'), c('What does a single monthly rainfall value describe?', 'Weather conditions over a short period', ['A permanent climate trend', 'All future rainfall', 'Earth’s entire atmosphere'], 'One month is too short to establish a climate pattern.')],
    [n('How far would the bicycle travel in 10 seconds at a constant 3 m/s?', '30', 'Distance = speed × time = 3 × 10 = 30 metres.'), c('Which condition is needed for the stated mass calculation?', 'No matter enters or leaves the container.', ['The bicycle must stop.', 'The container must be blue.', 'The reactants must be liquids.'], 'Conservation of mass is applied to the closed system described.')],
  ],
};

export function mrlcGedUnitQuestions(key: string, chapterIndex: number, makeId: () => string): CourseQuestion[] {
  const chapter = checks[key]?.[chapterIndex];
  if (!chapter) throw new Error(`Missing original MRLC unit test: ${key}/${chapterIndex}`);
  const questions = [...chapter.questions, ...(extraChecks[key]?.[chapterIndex] ?? [])];
  if (questions.length !== 5) throw new Error(`Incomplete original MRLC unit test: ${key}/${chapterIndex}`);
  return questions.map((question, index) => {
    const options = question.kind === 'CHOICE' ? question.options.map((_, n) => question.options[(n + index + chapterIndex + 1) % 4]) : [];
    return { id: makeId(), kind: question.kind, prompt: question.prompt, passage: chapter.passage, options, answer: question.answer, explanation: question.explanation };
  });
}

export const MRLC_GED_UNIT_COUNTS = Object.fromEntries(Object.entries(checks).map(([key, chapters]) => [key, chapters.length]));
