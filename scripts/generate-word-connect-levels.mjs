import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import WordPOS from 'wordpos';
import wordnet from 'wordnet-db';
import { buildCrossword, canSpell } from '../src/pages/games/word-connect/engine.ts';

// A reproducible, local content build. CEFR bands describe the progression;
// individual word-to-band assignments are editorial, not CEFR certifications.
const root = process.cwd();
const sourceFiles = ['english-word-courses.generated.json', 'advanced-english-courses.generated.json'];
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

const wordpos = new WordPOS({ stopwords: false });
const lookupCache = new Map();
async function entry(term) {
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

const academic = pools.get('Academic English Word Quest B1–B2');
const c1 = pools.get('English Word Power C1');
const core = pools.get('Advanced English: Core');
const mastery = pools.get('Advanced English: Mastery');
const expert = pools.get('Advanced English: Expert');
const stageSeeds = [academic.slice(0, 42), [...academic.slice(25), ...c1.slice(0, 30), ...core], [...c1.slice(20), ...core], [...mastery, ...expert]];
const titles = [
  ['First impressions','A closer look','The missing detail','Two sides','What follows?','Beyond the surface','The clue in context','A careful choice','The next question','The hidden pattern','Under review','Think it through','Making connections','A second opinion','The bigger picture','A fresh perspective','Follow the evidence','The central idea','A useful distinction','Reasons and results','A line of thought','Read between lines','The turning point','The final piece','The inquiry milestone'],
  ['A sharper lens','Ideas in motion','The strong case','Patterns of change','The measured view','A complex question','Turning evidence into insight','The fine print','Looking ahead','More than it seems','A thoughtful response','A difficult choice','The common thread','A change of course','A broader view','The hidden assumption','The long view','A reasoned conclusion','At the crossroads','A matter of scale','The unexpected link','Beyond first impressions','Making a case','The next horizon','The analysis milestone'],
  ['The subtle signal','A precise choice','A deeper current','The argument unfolds','A shift in meaning','Between the lines','The crucial nuance','An informed judgment','The quiet contradiction','A stronger expression','The wider context','Questions of degree','A delicate balance','An original thought','The telling detail','A different angle','An exacting claim','A point of principle','The underlying idea','A persuasive turn','An uncommon connection','A thoughtful challenge','The language of insight','A measured reply','The fluency milestone'],
  ['The rare distinction','A turn of phrase','Shades of meaning','The elegant solution','A hidden implication','A difficult inference','The exact word','A layered argument','Subtle intentions','The unusual case','Beyond the obvious','A question of tone','The decisive detail','A careful interpretation','The delicate claim','An unlikely parallel','The art of precision','The telling contrast','A refined judgment','The deeper reading','A nuanced reply','The final inference','Language in full colour','The masterstroke','The mastery milestone'],
];
const stages = [
  { id: 'b1', title: 'B1 · Inquiry Grove', description: 'Reason through everyday and academic ideas.', color: '#168c83' },
  { id: 'b2', title: 'B2 · Insight Coast', description: 'Connect evidence, perspectives and change.', color: '#4e91bd' },
  { id: 'c1', title: 'C1 · Nuance Summit', description: 'Choose precise words for complex ideas.', color: '#9474b7' },
  { id: 'c2', title: 'C2 · Mastery Observatory', description: 'Explore subtle meaning and rare expression.', color: '#bf7e45' },
];

const usedSeeds = new Set();
const worlds = [];
for (let band = 0; band < 4; band++) {
  const levels = [];
  for (const seed of stageSeeds[band]) {
    if (levels.length === 25) break;
    if (seed.length < 6 || seed.length > 10 || usedSeeds.has(seed) || !bank.has(seed)) continue;
    const candidates = [...lexicon].filter(term => term !== seed && !avoid.has(term) && term.length >= 4 && term.length <= Math.min(8, seed.length) && canSpell(term, seed) && (classroomWords.has(term) || bank.has(term) || (familiarity.get(term) || 0) >= 2));
    const score = term => Number(classroomWords.has(term)) * 55 + Number(bank.has(term)) * 55 + Math.min(familiarity.get(term) || 0, 30) * 3 + term.length * 15;
    candidates.sort((a, b) => score(b) - score(a) || a.localeCompare(b));
    const usable = (await Promise.all(candidates.slice(0, 150).map(entry))).filter(Boolean);
    let selected = seed === 'COMPARE' ? ['COMPARE', 'CREAM', 'CRAMP', 'RECAP'].map(term => bank.get(term)) : null;
    const limited = usable.slice(0, 28);
    if (!selected) outer: for (let a = 0; a < limited.length; a++) for (let b = a + 1; b < limited.length; b++) for (let c = b + 1; c < limited.length; c++) {
      const words = [bank.get(seed), limited[a], limited[b], limited[c]];
      if (new Set(words.map(item => item.word)).size !== 4 || words.slice(1).filter(item => item.word.length >= 5).length < (band === 0 ? 1 : 2)) continue;
      try {
        const board = buildCrossword(words.map(item => item.word));
        if (board.width > 14 || board.height > 14) continue;
        selected = words;
        break outer;
      } catch { /* Try another crossing. */ }
    }
    if (!selected) continue;
    const bonus = usable.filter(item => !selected.some(word => word.word === item.word)).slice(0, 2);
    const number = levels.length + 1;
    levels.push({ id: `${stages[band].id}-${String(number).padStart(2, '0')}`, title: titles[band][number - 1], letters: seed, words: selected, bonus });
    usedSeeds.add(seed);
    console.log(`${stages[band].id} ${number}: ${seed} -> ${selected.map(item => item.word).join(', ')}`);
  }
  if (levels.length !== 25) throw new Error(`${stages[band].id}: only ${levels.length} playable levels`);
  worlds.push({ ...stages[band], levels });
}
await writeFile(path.join(root, 'src/pages/games/word-connect/levels.generated.json'), `${JSON.stringify(worlds, null, 2)}\n`);
console.log('Wrote 100 levels.');
