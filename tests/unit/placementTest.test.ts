import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLACEMENT_BANDS,
  PLACEMENT_FORMS,
  PLACEMENT_PASSAGES,
  PLACEMENT_QUESTIONS,
  PLACEMENT_SECTIONS,
  PLACEMENT_TIME_LIMIT_SECONDS,
  chooseForm,
  defaultSnapshot,
  validateBank,
  blueprintOf,
  displayOrder,
  formQuestions,
  placementReview,
  publicPlacementForm,
  sanitizePlacementAnswers,
  scorePlacement,
  type PlacementBand,
  type PlacementForm,
} from '../../shared/placementTest';
import { attemptTiming, contactKey, createAttemptToken, readAttemptToken } from '../../lib/placementAttempt';
import { contentHash, rowsToSnapshotParts } from '../../lib/placementBank';
import { buildPlacementDecisionEmail, buildPlacementReceiptEmail } from '../../lib/emailTemplates';

const answerUpTo = (form: PlacementForm, bands: PlacementBand[], sections?: string[]) => Object.fromEntries(
  formQuestions(form).filter(q => bands.includes(q.band) && (!sections || sections.includes(q.section))).map(q => [q.id, q.answer]),
);

const writing = 'I studied in a village school in Mon State until grade eight. Then my family moved and I had to stop. Mathematics is difficult for me, especially fractions. I want to study at MRLC because I want to finish the GED and become a nurse for my community one day.';

const blueprint = (form: PlacementForm) => formQuestions(form).map(q => `${q.section}:${q.band}`).sort().join('|');

test('three forms share the same blueprint and length', () => {
  assert.equal(formQuestions('A').length, 50);
  assert.equal(blueprint('A'), blueprint('B'));
  assert.equal(blueprint('A'), blueprint('C'));
});

test('forms use the same skills in parallel', () => {
  const skills = (form: PlacementForm, section: string) => formQuestions(form).filter(q => q.section === section && q.band !== 'FOUNDATION').map(q => q.skill.split(' ')[0]);
  for (const section of ['MATH']) {
    assert.deepEqual(skills('A', section), skills('B', section));
    assert.deepEqual(skills('A', section), skills('C', section));
  }
});

test('forms do not repeat prompts or passages', () => {
  const items = PLACEMENT_QUESTIONS.map(q => `${q.passageId ?? ''}|${q.prompt}|${[...q.options].sort().join('|')}`);
  assert.equal(new Set(items).size, items.length);
  for (const form of PLACEMENT_FORMS) {
    const passages = new Set(formQuestions(form).map(q => q.passageId).filter(Boolean));
    for (const id of passages) assert.ok(id!.startsWith(form.toLowerCase() + '-'), id);
  }
});

test('every question has a valid key, unique id and known passage', () => {
  const ids = new Set<string>();
  const passages = new Set(PLACEMENT_PASSAGES.map(p => p.id));
  for (const q of PLACEMENT_QUESTIONS) {
    assert.ok(!ids.has(q.id), q.id);
    ids.add(q.id);
    assert.equal(q.options.length, 4, q.id);
    assert.ok(q.answer >= 0 && q.answer < 4, q.id);
    assert.equal(new Set(q.options).size, 4, q.id);
    if (q.passageId) assert.ok(passages.has(q.passageId), q.id);
  }
});

test('math answer keys match worked answers', () => {
  const expected: Record<string, string> = {
    'a-math-f1': '718', 'a-math-f2': '56', 'a-math-f3': '3/4', 'a-math-f4': 'RM 7.70', 'a-math-f5': '12',
    'a-math-p1': '9', 'a-math-p2': '6', 'a-math-p3': '30 cm²', 'a-math-p4': '1', 'a-math-p5': '9',
    'a-math-g1': 'x = 14', 'a-math-g2': '−2', 'a-math-g3': 'RM 50', 'a-math-g4': '14', 'a-math-g5': '1/2',
    'b-math-f1': '1,235', 'b-math-f2': '276', 'b-math-f3': '3/8', 'b-math-f4': 'RM 13.00', 'b-math-f5': '12',
    'b-math-p1': '70', 'b-math-p2': '7', 'b-math-p3': '28 m²', 'b-math-p4': '2', 'b-math-p5': '20 km',
    'b-math-g1': 'x = −5', 'b-math-g2': '−1', 'b-math-g3': 'RM 120', 'b-math-g4': '21', 'b-math-g5': '1/3',
    'c-math-f1': '1,774', 'c-math-f2': '270', 'c-math-f3': '6/8', 'c-math-f4': 'RM 2.80', 'c-math-f5': '12',
    'c-math-p1': '18', 'c-math-p2': '7', 'c-math-p3': '30 cm²', 'c-math-p4': '−8', 'c-math-p5': 'RM 36',
    'c-math-g1': 'x = 5', 'c-math-g2': '2', 'c-math-g3': 'RM 400', 'c-math-g4': '6', 'c-math-g5': '2/5',
  };
  for (const [id, text] of Object.entries(expected)) {
    const q = PLACEMENT_QUESTIONS.find(item => item.id === id);
    assert.ok(q, id);
    assert.equal(q!.options[q!.answer], text, id);
  }
});

test('public form never exposes answer keys or bands', () => {
  for (const form of PLACEMENT_FORMS) {
    const json = JSON.stringify(publicPlacementForm(defaultSnapshot(form)));
    assert.ok(!json.includes('"answer"'));
    assert.ok(!json.includes('"band"'));
    assert.ok(!json.includes('FOUNDATION'));
    assert.equal(publicPlacementForm(defaultSnapshot(form)).timeLimitSeconds, PLACEMENT_TIME_LIMIT_SECONDS);
  }
});

test('displayed answer positions are spread out in every form', () => {
  for (const form of PLACEMENT_FORMS) {
    const positions = [0, 0, 0, 0];
    for (const q of formQuestions(form)) positions[displayOrder(q).indexOf(q.answer)] += 1;
    for (const count of positions) assert.ok(count <= 20, `${form}: ${positions.join(',')}`);
  }
});

test('always choosing the same displayed position never reaches Pre-GED', () => {
  for (const form of PLACEMENT_FORMS) {
    for (let position = 0; position < 4; position += 1) {
      const answers = Object.fromEntries(formQuestions(form).map(q => [q.id, displayOrder(q)[position]]));
      assert.equal(scorePlacement(answers, { snapshot: defaultSnapshot(form), writingSample: writing }).recommendedLevel, 'BELOW_PRE_GED', `${form} position ${position}`);
    }
  }
});

test('band placement works the same on every form', () => {
  for (const form of PLACEMENT_FORMS) {
    assert.equal(scorePlacement({}, { snapshot: defaultSnapshot(form) }).recommendedLevel, 'BELOW_PRE_GED');
    assert.equal(scorePlacement(answerUpTo(form, ['FOUNDATION']), { snapshot: defaultSnapshot(form), writingSample: writing }).recommendedLevel, 'PRE_GED');
    assert.equal(scorePlacement(answerUpTo(form, ['FOUNDATION', 'PRE_GED']), { snapshot: defaultSnapshot(form), writingSample: writing }).recommendedLevel, 'PRE_GED');
    const full = scorePlacement(answerUpTo(form, ['FOUNDATION', 'PRE_GED', 'GED']), { snapshot: defaultSnapshot(form), writingSample: writing, durationSeconds: 3600 });
    assert.equal(full.recommendedLevel, 'GED');
    assert.equal(full.totalCorrect, 50);
    assert.deepEqual(full.flags, []);
  }
});

test('GED level needs at least 60 percent of the hardest questions', () => {
  const form: PlacementForm = 'A';
  const answers = answerUpTo(form, ['FOUNDATION', 'PRE_GED']);
  const gedMath = formQuestions(form).filter(q => q.section === 'MATH' && q.band === 'GED');
  const gedRla = formQuestions(form).filter(q => q.section === 'RLA' && q.band === 'GED');
  for (const q of [...gedMath.slice(0, 2), ...gedRla.slice(0, 2)]) answers[q.id] = q.answer;
  assert.equal(scorePlacement(answers, { snapshot: defaultSnapshot(form), writingSample: writing }).recommendedLevel, 'PRE_GED');
  for (const q of [gedMath[2], gedRla[2]]) answers[q.id] = q.answer;
  for (const q of formQuestions(form).filter(item => item.band === 'GED' && (item.section === 'SCIENCE' || item.section === 'SOCIAL_STUDIES'))) answers[q.id] = q.answer;
  assert.equal(scorePlacement(answers, { snapshot: defaultSnapshot(form), writingSample: writing }).recommendedLevel, 'GED');
});

test('weak math holds the overall placement down', () => {
  const result = scorePlacement(answerUpTo('B', ['FOUNDATION', 'PRE_GED', 'GED'], ['RLA', 'SCIENCE', 'SOCIAL_STUDIES']), { snapshot: defaultSnapshot('B'), writingSample: writing });
  assert.equal(result.recommendedLevel, 'BELOW_PRE_GED');
  assert.ok(result.flags.includes('UNEVEN_CORE'));
});

test('answers from another form are ignored', () => {
  assert.deepEqual(sanitizePlacementAnswers({ 'a-rla-f1': 1, 'b-rla-f1': 1 }, formQuestions('B')), { 'b-rla-f1': 1 });
  assert.equal(scorePlacement(answerUpTo('A', ['FOUNDATION', 'PRE_GED', 'GED']), { snapshot: defaultSnapshot('C') }).totalCorrect, 0);
});

test('flags cover timing, retakes and blank answers', () => {
  const result = scorePlacement({}, { snapshot: defaultSnapshot('C'), durationSeconds: 300, overTime: true, repeatAttempt: true, highestGrade: 'GRADE_11_PLUS' });
  for (const flag of ['MANY_UNANSWERED', 'VERY_FAST', 'OVER_TIME', 'SHORT_WRITING', 'SCHOOLING_MISMATCH', 'REPEAT_ATTEMPT']) assert.ok(result.flags.includes(flag), flag);
});

test('form rotation never repeats a form until all three are used', () => {
  assert.ok((PLACEMENT_FORMS as readonly string[]).includes(chooseForm([])));
  assert.equal(chooseForm(['A', 'B']), 'C');
  assert.notEqual(chooseForm(['C']), 'C');
  assert.equal(chooseForm(['B', 'C', 'A']), 'B');
  assert.equal(chooseForm(['A', 'B', 'C', 'B']), 'A');
});

test('review marks chosen and correct options for the right form', () => {
  const review = placementReview({ 'c-rla-f1': 1, 'c-rla-f2': 3 }, defaultSnapshot('C'));
  assert.equal(review.length, 50);
  assert.equal(review.find(r => r.id === 'c-rla-f1')!.correct, true);
  assert.equal(review.find(r => r.id === 'c-rla-f2')!.correct, false);
  assert.equal(review.find(r => r.id === 'c-rla-f1')!.passageTitle, 'The rainy afternoon');
});

test('attempt tokens are signed, bound to a phone and timed', () => {
  const secret = 'test-secret-value-1234';
  const start = Date.UTC(2026, 10, 18, 2, 0, 0);
  const { token } = createAttemptToken({ form: 'B', versionId: 'v1', contactNumber: '+60 12-345 6789', limitSeconds: PLACEMENT_TIME_LIMIT_SECONDS, now: start }, secret);
  const attempt = readAttemptToken(token, secret)!;
  assert.equal(attempt.form, 'B');
  assert.equal(attempt.contact, contactKey('012-345 6789'));
  assert.equal(readAttemptToken(token, 'another-secret-value'), null);
  assert.equal(readAttemptToken(token.replace(/^./, c => c === 'e' ? 'f' : 'e'), secret), null);
  assert.equal(attemptTiming(attempt, start + 60 * 60 * 1000).overTime, false);
  assert.equal(attemptTiming(attempt, start + 91 * 60 * 1000).overTime, false);
  const late = attemptTiming(attempt, start + 95 * 60 * 1000);
  assert.equal(late.overTime, true);
  assert.equal(late.durationSeconds, PLACEMENT_TIME_LIMIT_SECONDS);
  assert.equal(attemptTiming(attempt, start + 8 * 24 * 60 * 60 * 1000).expired, true);
});

test('placement emails escape names and include the reference and class', () => {
  const receipt = buildPlacementReceiptEmail({ recipientName: '<b>Min</b>', referenceNo: 'PT-261118-ABCDE', appUrl: 'https://gedmrlc.monrefugeelc.com' });
  assert.ok(receipt.subject.includes('PT-261118-ABCDE'));
  assert.ok(!receipt.htmlBody.includes('<b>Min</b>'));
  const decision = buildPlacementDecisionEmail({
    recipientName: 'Min', referenceNo: 'PT-261118-ABCDE', className: 'Pre-GED class', classDescription: 'Builds skills.',
    subjects: [{ title: 'Mathematics', correct: 9, total: 15, level: 'Pre-GED level' }], message: 'See you on Monday.', appUrl: 'https://gedmrlc.monrefugeelc.com',
  });
  assert.ok(decision.subject.includes('Pre-GED class'));
  assert.ok(decision.textBody.includes('Mathematics: 9 of 15 correct'));
  assert.ok(decision.textBody.includes('See you on Monday.'));
});

test('form rotation uses only the forms in rotation', () => {
  assert.equal(chooseForm([], ['D']), 'D');
  assert.equal(chooseForm(['A'], ['A', 'D']), 'D');
  assert.throws(() => chooseForm([], []));
});

test('cut-offs change the level', () => {
  const snapshot = defaultSnapshot('A');
  const answers: Record<string, number> = answerUpTo('A', ['FOUNDATION', 'PRE_GED']);
  for (const q of formQuestions('A').filter(item => item.band === 'GED')) {
    const sameBand = formQuestions('A').filter(item => item.band === 'GED' && item.section === q.section);
    if (sameBand.indexOf(q) < 2) answers[q.id] = q.answer;
  }
  assert.equal(scorePlacement(answers, { snapshot, writingSample: writing }).recommendedLevel, 'PRE_GED');
  assert.equal(scorePlacement(answers, { snapshot, writingSample: writing, thresholds: { FOUNDATION: 60, PRE_GED: 60, GED: 40 } }).recommendedLevel, 'GED');
});

test('bank validation blocks unpublishable forms and warns on thin bands', () => {
  const snapshot = defaultSnapshot('A');
  assert.deepEqual(validateBank(snapshot.questions, snapshot.passages).errors, []);
  const noGedMath = snapshot.questions.filter(q => !(q.section === 'MATH' && q.band === 'GED'));
  assert.ok(validateBank(noGedMath, snapshot.passages).errors.some(e => e.includes('Mathematics has no GED')));
  const broken = snapshot.questions.map((q, i) => i === 0 ? { ...q, options: ['Same', 'Same'], answer: 3 } : q);
  const errors = validateBank(broken, snapshot.passages).errors;
  assert.ok(errors.some(e => e.includes('identical')));
  assert.ok(errors.some(e => e.includes('no correct answer')));
  const thin = snapshot.questions.filter(q => !(q.section === 'SCIENCE' && q.band === 'FOUNDATION')).concat(snapshot.questions.filter(q => q.section === 'SCIENCE' && q.band === 'FOUNDATION').slice(0, 1));
  assert.ok(validateBank(thin, snapshot.passages, blueprintOf(snapshot.questions)).warnings.some(w => w.includes('only 1')));
});

test('draft rows become an ordered snapshot and a stable hash', () => {
  const rows = [
    { id: 'q2', formId: 'D', section: 'MATH', band: 'GED', skill: 's', passageId: null, prompt: 'Two', options: ['a', 'b'], answer: 0, sortOrder: 0, active: true },
    { id: 'q1', formId: 'D', section: 'RLA', band: 'FOUNDATION', skill: 's', passageId: 'p1', prompt: 'One', options: ['a', 'b'], answer: 1, sortOrder: 5, active: true },
    { id: 'q3', formId: 'D', section: 'RLA', band: 'FOUNDATION', skill: 's', passageId: null, prompt: 'Retired', options: ['a', 'b'], answer: 1, sortOrder: 1, active: false },
  ];
  const passages = [{ id: 'p1', formId: 'D', title: 'T', body: ['x'], sortOrder: 0 }];
  const parts = rowsToSnapshotParts(rows, passages);
  assert.deepEqual(parts.questions.map(q => q.id), ['q1', 'q2']);
  assert.equal(contentHash(parts), contentHash(rowsToSnapshotParts([...rows].reverse(), passages)));
  const edited = rowsToSnapshotParts(rows.map(r => r.id === 'q2' ? { ...r, answer: 1 } : r), passages);
  assert.notEqual(contentHash(parts), contentHash(edited));
});
