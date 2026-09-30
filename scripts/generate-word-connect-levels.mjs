import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import WordPOS from 'wordpos';
import wordnet from 'wordnet-db';
import { buildCrossword, canSpell } from '../src/pages/games/word-connect/engine.ts';

// A reproducible, local content build. CEFR bands describe the progression;
// individual word-to-band assignments are editorial, not CEFR certifications.
const root = process.cwd();
const sourceFiles = ['english-word-courses.generated.json'];
const courses = (await Promise.all(sourceFiles.map(file => readFile(path.join(root, 'curricula/language-quest', file), 'utf8')))).flatMap(raw => JSON.parse(raw));
const bank = new Map();
const pools = new Map();
for (const course of courses) {
  const list = [];
  for (const unit of course.units) for (const lesson of unit.lessons) for (const challenge of lesson.challenges) {
    const term = challenge.options?.find(option => option.correct)?.text?.toUpperCase();
    if (!term || !/^[A-Z]{4,10}$/.test(term)) continue;
    const explanation = challenge.explanation || '';
    const match = explanation.match(/means\s+(.+?)\.\s+Example:\s+(.+)$/i);
    if (match && new RegExp(`\\b${term}\\b`, 'i').test(match[2])) bank.set(term, { word: term, meaning: match[1].replace(/[.;]+$/, ''), example: match[2].replace(/^[“"]|[”"]$/g, '') });
    if (!list.includes(term)) list.push(term);
  }
  pools.set(course.title, list);
}
for (const item of [
  { word: 'CREAM', meaning: 'the thick, rich part of milk, often used in cooking', example: 'The cook added cream to the soup.' },
  { word: 'CRAMP', meaning: 'a sudden, painful tightening of a muscle', example: 'She felt a cramp in her leg after the race.' },
  { word: 'RECAP', meaning: 'a short summary of the main points', example: 'The teacher gave a recap of yesterday’s lesson.' },
  { word: 'CAMP', meaning: 'a temporary place where people stay outdoors', example: 'The class set up camp beside the river.' },
  { word: 'ENTER', meaning: 'to go into a place or begin taking part', example: 'Please enter the library quietly.' },
  { word: 'STONE', meaning: 'a small, hard piece of rock', example: 'She picked up a smooth stone by the river.' },
  { word: 'NEAT', meaning: 'tidy and arranged with care', example: 'His neat notes were easy to read.' },
  { word: 'STING', meaning: 'a sudden sharp pain, often caused by an insect', example: 'The bee’s sting made his arm sore.' },
  { word: 'FAST', meaning: 'moving or happening quickly', example: 'The fast runner reached the finish line first.' },
  { word: 'CONSUMMATE', meaning: 'showing complete skill or mastery', example: 'Her consummate skill impressed the entire orchestra.' },
]) bank.set(item.word, item);

// Beginner puzzles use a classroom sense and example, rather than the first
// WordNet sense (which can be a rare technical or figurative meaning).
const beginnerEntries = new Map(`
USED|already owned or put to use|She used the blue pencil.
TEST|a set of questions that checks what someone knows|We have a spelling test today.
NEST|a home that a bird builds|The bird made a nest in the tree.
TRACE|to follow a line with your finger or pencil|Trace the shape on the paper.
REACH|to get to a place or touch something|I can reach the top shelf.
CREATE|to make something new|We create a picture together.
HEART|the part of your body that beats in your chest|My heart beats faster when I run.
CALM|quiet and peaceful|Take a breath and stay calm.
CROSS|to go from one side to the other|Cross the road carefully.
COLOR|the appearance of something, such as red or blue|Blue is my favorite color.
LESSON|a time when you learn something|Our lesson starts at nine.
NOSE|the part of your face used to smell|My nose can smell the flowers.
LOSE|to no longer have something|Try not to lose your keys.
LOSS|the act of losing something|The loss of her bag made her sad.
HOME|the place where you live|I go home after school.
WORK|a task or job you do|I finish my work before lunch.
MORE|a larger amount|May I have more water?
RAIL|a bar you can hold for support|Hold the rail on the stairs.
BAIL|money paid to let someone leave a court before trial|The judge set bail for the man.
LINE|a long, narrow mark|Draw a straight line.
CLIP|a small object that holds things together|Use a clip to hold the papers.
PILE|a group of things placed on top of each other|There is a pile of books on the desk.
TONE|the way a voice sounds|Her kind tone made me smile.
NOTE|a short written message|I left a note for my friend.
BOOK|pages joined together for reading|I read a book every night.
STONE|a small piece of rock|She found a smooth stone.
UNIT|one group of lessons on a topic|We start a new unit today.
NEAR|not far away|The library is near our school.
WEAR|to have clothes on your body|I wear a coat when it is cold.
NEWS|new information about events|We heard the news this morning.
FAIL|to not succeed at something|It is okay to fail and try again.
FILM|a story shown with moving pictures|We watched a short film.
MAIL|letters and packages sent to people|The mail arrived this morning.
RATE|how fast or often something happens|Her heart rate rose after running.
NEAT|tidy and in order|Keep your desk neat.
THINK|to use your mind to make an idea|Think before you answer.
THICK|having a large distance between two sides|The book is thick.
THIN|not thick|This paper is very thin.
MODE|a way that something works|Put the tablet in reading mode.
BOOM|a loud, deep sound|We heard a boom outside.
DOWN|toward a lower place|Walk down the stairs.
WIND|moving air outdoors|The wind moved the leaves.
RANGE|a group of different things|The shop has a range of books.
GRADE|a level or mark at school|She is in fifth grade.
DRAG|to pull something along the ground|Do not drag the chair.
REST|to stop working for a short time|Sit down and rest.
BREAK|a short pause|We take a break after class.
FAST|moving quickly|The rabbit runs fast.
BASE|the bottom part of something|The base of the lamp is heavy.
RIDE|to travel on a bike, bus, or animal|I ride my bike to school.
INNER|on the inside|The inner pocket holds my keys.
COME|to move toward someone or someplace|Please come inside.
LEAP|to jump a long way|The frog can leap over a stone.
PALE|light in color|The wall is pale blue.
BEAR|a large wild animal with thick fur|We saw a bear in the storybook.
BARE|without a covering|Do not walk with bare feet on the hot sand.
READ|to look at words and understand them|I read a story before bed.
WATER|the clear liquid we drink|Drink water after playing.
TEAR|to pull something apart|Be careful not to tear the page.
LEAVE|to go away from a place|We leave school at three.
BEAT|to hit or make a repeated sound|I can hear the drum beat.
TABLE|a piece of furniture with a flat top|Put the book on the table.
LATE|after the expected time|The bus was late today.
CLOSE|to shut something|Please close the door.
CLOUD|a white or gray shape in the sky|A cloud covered the sun.
SOLID|hard and firm, not liquid or gas|Ice is solid water.
RICE|small grains cooked and eaten as food|We had rice for lunch.
PIECE|one part of something|May I have a piece of cake?
PRICE|the money needed to buy something|The price of the book is five dollars.
PEAK|the top of a mountain|We reached the peak at noon.
SILENT|making no sound|The room was silent.
SITE|a place where something is built or happens|The new school site is near the park.
WRITE|to make words with a pen or pencil|Please write your name.
WIRE|a thin metal line that carries electricity|The wire connects the lamp.
TIER|one level in a group of levels|The cake has three tiers.
FISH|an animal that lives in water|The fish swims in the pond.
ECHO|a sound that comes back after you make it|Our shout made an echo.
GRAY|a color between black and white|The gray clouds brought rain.
FAIR|right and equal for everyone|We want a fair game.
DIET|the food a person usually eats|Fruit is part of a healthy diet.
TIDE|the rise and fall of the sea|The tide is high today.
TIED|fastened with a knot|She tied her shoes.
DROP|to let something fall|Do not drop the glass.
POUR|to make a liquid flow from a container|Pour the water into a cup.
RAVE|to speak with great excitement|They rave about the new playground.
SLIP|to slide by accident|Be careful not to slip on the wet floor.
SPLIT|to divide into parts|Split the apple in half.
POST|a message you share online|I wrote a short post for the class.
STOP|to end an action or movement|Stop at the red light.
MATE|a friend or partner|My classmate is my reading mate.
MAKE|to create something|We make a paper boat.
MARK|a small sign or line|Put a mark next to the answer.
STAIN|a dirty mark that is hard to remove|The juice left a stain on my shirt.
TOAST|bread made brown by heat|I ate toast for breakfast.
STINT|a short period of work|He did a short stint at the library.
`.trim().split('\n').map(row => { const [word, meaning, example] = row.split('|'); return [word, { word, meaning, example }]; }));
const beginnerBonusAvoid = new Set(['BAIL', 'RAVE', 'STINT', 'TIER', 'SITE']);

const wordpos = new WordPOS({ stopwords: false });
const lookupCache = new Map();
async function entry(term) {
  if (beginnerEntries.has(term)) return beginnerEntries.get(term);
  if (bank.has(term)) return bank.get(term);
  if (lookupCache.has(term)) return lookupCache.get(term);
  const rows = await new Promise(resolve => wordpos.lookup(term.toLowerCase(), resolve));
  const exact = rows.filter(row => row.lemma?.toUpperCase() === term && row.def);
  const pattern = new RegExp(`\\b${term}\\b`, 'i');
  const choice = exact.map(row => ({
    word: term,
    meaning: row.def.replace(/\s+/g, ' ').replace(/[.;]+$/, ''),
    example: (row.exp || []).filter(example => pattern.test(example) && example.trim().split(/\s+/).length >= 4 && !/\b(?:of|to|and|the|a|an|with|for|by|in|on)$/i.test(example.trim())).sort((a, b) => b.length - a.length)[0]?.replace(/^['“"]|['”"]$/g, '').trim(),
  })).find(item => item.meaning.length >= 12 && item.meaning.length <= 170 && item.example && item.example.length <= 180);
  if (choice) choice.example = `${choice.example[0].toUpperCase()}${choice.example.slice(1).replace(/[.;!?]*$/, '')}.`;
  lookupCache.set(term, choice || null);
  return choice || null;
}

const lexicon = new Set();
const familiarity = new Map();
for (const part of ['noun', 'verb', 'adj', 'adv']) {
  const raw = await readFile(path.join(wordnet.path, `index.${part}`), 'utf8');
  for (const line of raw.split('\n')) {
    const [term, , count] = line.split(' ');
    if (/^[a-z]{4,8}$/.test(term)) {
      const upper = term.toUpperCase();
      lexicon.add(upper);
      familiarity.set(upper, (familiarity.get(upper) || 0) + (Number(count) || 0));
    }
  }
}
for (const term of bank.keys()) lexicon.add(term);
const avoid = new Set('ANAL ANUS CRAPE ALEUT VEDIC GERMAN VENICE CERE SENTE CLONIC TOED NISI SNIT EROTIC MOSES SANTIAGO COON SCOTS ULSTER'.split(' '));
const classroomWords = new Set('VALUE LEAVE CREAM PLANE PANEL CLEAN CLEAR SHARE CHAIR TRACE GRACE STAGE STARE RAISE ARISE IDEAL ALIVE GUIDE LATER ALTER ALERT RELATE CREATE ACTOR REACT COAST SCORE COURSE CROWN COUNT COURT NORTH SOUTH SOUND ROUND FOUND REASON SEARCH CHASE CAREER TEACH REACH EARTH HEART THERE THEIR STATE TASTE TESTS SCENE TENSE SENSE ENTER ENTIRE TIRED CREDIT DIRECT PRIME PRIDE RICE RIDE MODEL HOME MODE REST RUSTLE SAMPLE AMPLE LAPSE MAPLE RESULT CLIMATE SCALE CLAIM METAL TEAM MATE MEAN NAME NOTE TONE NEXT CONTEXT TEXT CITE SITE CITY RIVER DRIVE DRAW WIDE WIRE VIEW WAVE MORE SOME SAME MIND KIND FIND FORM FROM FIRM TERM TIME TIRE TIER FIRE FAIR FEAR YEAR NEAR REAL ROLE RULE TRUE TRUCE TRUST STONE STORE STORY STORM SHARE SHORE SHAPE SPACE PLACE PRICE PEACE PIECE SCOPE SCORE ORDER OTHER OUTER ABOVE ALONE ALONG UNDER UNTIL UNITED UNION UNIT IDEA ISSUE ESSAY CAUSE PAUSE USES USED USER STUDY STYLE START STARS RATES RATED RATE DATE DATA DETAIL TRAIL TRAIN TRIAL RATIO RADIO RAISE RAINS TEARS STEER STERN LEARN LEAST LATER CLEAR CLEAN CLERK CLIENT CLAIM CLIMB CLOSE CLOTH CLOUD GROUP GROUND GROWTH RIGHT SIGHT NIGHT LIGHT HEIGHT WEIGHT PAINT POINT PRINT PROVE PROVEN POWER LOWER OWNER KNOWN KNOWS NOTEBOOK'.split(' '));

const everyday = pools.get('Everyday English Word Quest A1–A2');
const academic = pools.get('Academic English Word Quest B1–B2');
const c1 = pools.get('English Word Power C1');
const stageSeeds = [everyday, [...everyday.slice(20), ...everyday.slice(0, 20)], academic, [...academic.slice(20), ...academic.slice(0, 20), ...c1], [...c1, ...academic]];
const titles = [
  ['Hello, words','In the classroom','People I know','At home','A new day','My things','Around town','On the way','Food and friends','Time to learn','The little details','Our world','A good question','What I can do','A place to go','What happens next','People and places','Let’s make a plan','Words in action','The first milestone'],
  ['More to explore','A day out','Things we share','A better way','The next step','Looking around','An interesting idea','A helpful hand','Plans and places','A story to tell','Something new','The right moment','A small surprise','Together again','A change of plans','Making choices','Out in the world','A closer look','Find the connection','The explorer milestone'],
  ['First impressions','A closer look','The missing detail','Two sides','What follows?','Beyond the surface','The clue in context','A careful choice','The next question','The hidden pattern','Under review','Think it through','Making connections','A second opinion','The bigger picture','A fresh perspective','Follow the evidence','The central idea','A useful distinction','Reasons and results','A line of thought','Read between lines','The turning point','The final piece','The inquiry milestone'],
  ['A sharper lens','Ideas in motion','The strong case','Patterns of change','The measured view','A complex question','Turning evidence into insight','The fine print','Looking ahead','More than it seems','A thoughtful response','A difficult choice','The common thread','A change of course','A broader view','The hidden assumption','The long view','A reasoned conclusion','At the crossroads','A matter of scale','The unexpected link','Beyond first impressions','Making a case','The next horizon','The analysis milestone'],
  ['The subtle signal','A precise choice','A deeper current','The argument unfolds','A shift in meaning','Between the lines','The crucial nuance','An informed judgment','The quiet contradiction','A stronger expression','The wider context','Questions of degree','A delicate balance','An original thought','The telling detail','A different angle','An exacting claim','A point of principle','The underlying idea','A persuasive turn','An uncommon connection','A thoughtful challenge','The language of insight','A measured reply','The fluency milestone'],
];
const stages = [
  { id: 'a1', title: 'A1 · Welcome Meadow', description: 'Find familiar words from everyday life.', color: '#56a690' },
  { id: 'a2', title: 'A2 · Explorer Lane', description: 'Connect words for people, places and plans.', color: '#d59b4a' },
  { id: 'b1', title: 'B1 · Inquiry Grove', description: 'Reason through everyday and academic ideas.', color: '#168c83' },
  { id: 'b2', title: 'B2 · Insight Coast', description: 'Connect evidence, perspectives and change.', color: '#4e91bd' },
  { id: 'c1', title: 'C1 · Nuance Summit', description: 'Choose precise words for complex ideas.', color: '#9474b7' },
];

const usedSeeds = new Set();
const worlds = [];
for (let band = 0; band < stages.length; band++) {
  const levels = [];
  const targetCount = 20;
  for (const seed of stageSeeds[band]) {
    if (levels.length === targetCount) break;
    if (seed.length < (band < 2 ? 5 : 6) || seed.length > 10 || usedSeeds.has(seed) || !bank.has(seed)) continue;
    const candidates = [...lexicon].filter(term => term !== seed && !avoid.has(term) && term.length >= 4 && term.length <= Math.min(8, seed.length) && canSpell(term, seed) && (classroomWords.has(term) || bank.has(term) || (familiarity.get(term) || 0) >= (band < 2 ? 5 : 2)));
    const score = term => Number(classroomWords.has(term)) * 55 + Number(bank.has(term)) * 55 + Math.min(familiarity.get(term) || 0, 30) * 3 + term.length * 15;
    candidates.sort((a, b) => score(b) - score(a) || a.localeCompare(b));
    const usable = (await Promise.all(candidates.slice(0, 150).map(entry))).filter(Boolean);
    let selected = null;
    const limited = usable.slice(0, 28);
    if (!selected) outer: for (let a = 0; a < limited.length; a++) for (let b = a + 1; b < limited.length; b++) for (let c = (band < 2 ? -1 : b + 1); c < (band < 2 ? 0 : limited.length); c++) {
      const words = [bank.get(seed), limited[a], limited[b], ...(c < 0 ? [] : [limited[c]])];
      if (new Set(words.map(item => item.word)).size !== words.length || words.slice(1).filter(item => item.word.length >= 5).length < (band < 2 ? 1 : 2)) continue;
      try {
        const board = buildCrossword(words.map(item => item.word));
        if (board.width > 14 || board.height > 14) continue;
        selected = words;
        break outer;
      } catch { /* Try another crossing. */ }
    }
    if (!selected && band < 2) for (const item of usable) {
      try { buildCrossword([seed, item.word]); selected = [bank.get(seed), item]; break; }
      catch { /* Try another familiar word. */ }
    }
    if (!selected) continue;
    const bonus = usable.filter(item => !selected.some(word => word.word === item.word) && (band >= 2 || ((beginnerEntries.has(item.word) || everyday.includes(item.word)) && !beginnerBonusAvoid.has(item.word)))).slice(0, 2);
    const number = levels.length + 1;
    levels.push({ id: `${stages[band].id}-${String(number).padStart(2, '0')}`, title: titles[band][number - 1], letters: seed, words: selected, bonus });
    usedSeeds.add(seed);
    console.log(`${stages[band].id} ${number}: ${seed} -> ${selected.map(item => item.word).join(', ')}`);
  }
  if (levels.length !== targetCount) throw new Error(`${stages[band].id}: only ${levels.length} playable levels`);
  worlds.push({ ...stages[band], levels });
}
await writeFile(path.join(root, 'src/pages/games/word-connect/levels.generated.json'), `${JSON.stringify(worlds, null, 2)}\n`);
console.log('Wrote 100 levels.');
