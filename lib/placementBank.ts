import { createHash } from 'node:crypto';
import {
  DEFAULT_THRESHOLDS,
  PLACEMENT_BANDS,
  PLACEMENT_FORMS,
  PLACEMENT_PASSAGES,
  PLACEMENT_SECTION_IDS,
  blueprintOf,
  formQuestions,
  validateBank,
  type Blueprint,
  type PlacementBand,
  type PlacementPassage,
  type PlacementQuestion,
  type PlacementSectionId,
  type PlacementSnapshot,
  type PlacementThresholds,
} from '../shared/placementTest';

type Db = any;

export interface BankQuestionRow {
  id: string; formId: string; section: string; band: string; skill: string; passageId: string | null;
  prompt: string; options: unknown; answer: number; sortOrder: number; active: boolean;
}

export interface BankPassageRow { id: string; formId: string; title: string; body: unknown; sortOrder: number }

export interface PlacementSettingsRow {
  isOpen: boolean; closedMessage: string | null; timeLimitMinutes: number;
  foundationMastery: number; preGedMastery: number; gedMastery: number; retakeWaitDays: number;
  updatedAt?: Date; updatedByName?: string | null;
}

export class BankError extends Error {
  constructor(public status: number, message: string, public details?: unknown) { super(message); }
}

const strings = (value: unknown) => Array.isArray(value) ? value.map(v => String(v)) : [];

export function rowsToSnapshotParts(questions: BankQuestionRow[], passages: BankPassageRow[]) {
  const orderedPassages = [...passages].sort((a, b) => a.sortOrder - b.sortOrder);
  const sectionRank = (s: string) => PLACEMENT_SECTION_IDS.indexOf(s as PlacementSectionId);
  const bandRank = (b: string) => PLACEMENT_BANDS.indexOf(b as PlacementBand);
  const orderedQuestions = questions
    .filter(q => q.active)
    .sort((a, b) => sectionRank(a.section) - sectionRank(b.section) || bandRank(a.band) - bandRank(b.band) || a.sortOrder - b.sortOrder);
  return {
    questions: orderedQuestions.map<PlacementQuestion>(q => ({
      id: q.id, form: q.formId, section: q.section as PlacementSectionId, band: q.band as PlacementBand, skill: q.skill,
      prompt: q.prompt, options: strings(q.options), answer: q.answer, ...(q.passageId ? { passageId: q.passageId } : {}),
    })),
    passages: orderedPassages.map<PlacementPassage>(p => ({ id: p.id, title: p.title, body: strings(p.body) })),
  };
}

export function contentHash(parts: { questions: PlacementQuestion[]; passages: PlacementPassage[] }) {
  const normal = {
    q: parts.questions.map(q => [q.id, q.section, q.band, q.skill, q.passageId ?? '', q.prompt, q.options, q.answer]),
    p: parts.passages.filter(p => parts.questions.some(q => q.passageId === p.id)).map(p => [p.id, p.title, p.body]),
  };
  return createHash('sha256').update(JSON.stringify(normal)).digest('hex');
}

export function thresholdsFrom(settings: PlacementSettingsRow): PlacementThresholds {
  return { FOUNDATION: settings.foundationMastery, PRE_GED: settings.preGedMastery, GED: settings.gedMastery };
}

export const DEFAULT_SETTINGS: PlacementSettingsRow = {
  isOpen: true, closedMessage: null, timeLimitMinutes: 90,
  foundationMastery: DEFAULT_THRESHOLDS.FOUNDATION, preGedMastery: DEFAULT_THRESHOLDS.PRE_GED, gedMastery: DEFAULT_THRESHOLDS.GED, retakeWaitDays: 30,
};

export async function getSettings(db: Db): Promise<PlacementSettingsRow> {
  return db.placementSettings.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } });
}

let seeding: Promise<void> | null = null;

export function ensureBank(db: Db) {
  if (!seeding) {
    seeding = seedDefaults(db).catch(error => {
      seeding = null;
      throw error;
    });
  }
  return seeding;
}

async function seedDefaults(db: Db) {
  if (await db.placementForm.count() > 0) return;
  await db.$transaction(async (tx: Db) => {
    if (await tx.placementForm.count() > 0) return;
    for (const [index, form] of PLACEMENT_FORMS.entries()) {
      await tx.placementForm.create({ data: { id: form, name: `Form ${form}`, sortOrder: index } });
      const questions = formQuestions(form);
      const passageMap = new Map<string, string>();
      const used = PLACEMENT_PASSAGES.filter(p => questions.some(q => q.passageId === p.id));
      for (const [i, passage] of used.entries()) {
        const row = await tx.placementBankPassage.create({ data: { formId: form, title: passage.title, body: passage.body, sortOrder: i } });
        passageMap.set(passage.id, row.id);
      }
      for (const [i, q] of questions.entries()) {
        await tx.placementBankQuestion.create({ data: {
          formId: form, section: q.section, band: q.band, skill: q.skill, passageId: q.passageId ? passageMap.get(q.passageId) ?? null : null,
          prompt: q.prompt, options: q.options, answer: q.answer, sortOrder: i,
        } });
      }
      await publishWith(tx, form, null);
    }
  });
}

export async function loadDraft(db: Db, formId: string) {
  const [questions, passages] = await Promise.all([
    db.placementBankQuestion.findMany({ where: { formId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }) as Promise<BankQuestionRow[]>,
    db.placementBankPassage.findMany({ where: { formId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }) as Promise<BankPassageRow[]>,
  ]);
  return { questions, passages };
}

export async function latestVersion(db: Db, formId: string) {
  return db.placementFormVersion.findFirst({ where: { formId }, orderBy: { version: 'desc' } });
}

export function versionSnapshot(version: { id: string; formId: string; version: number; snapshot: any }): PlacementSnapshot {
  return { versionId: version.id, form: version.formId, version: version.version, questions: version.snapshot?.questions ?? [], passages: version.snapshot?.passages ?? [] };
}

export async function publishedBlueprints(db: Db, exceptForm?: string): Promise<Blueprint | undefined> {
  const forms = await db.placementForm.findMany({ where: { active: true, ...(exceptForm ? { id: { not: exceptForm } } : {}) } });
  for (const form of forms) {
    const version = await latestVersion(db, form.id);
    if (version) return blueprintOf(versionSnapshot(version).questions);
  }
  return undefined;
}

async function publishWith(db: Db, formId: string, user: { userId: string; email: string } | null) {
  const draft = await loadDraft(db, formId);
  const parts = rowsToSnapshotParts(draft.questions, draft.passages);
  const usedPassages = parts.passages.filter(p => parts.questions.some(q => q.passageId === p.id));
  const validation = validateBank(parts.questions, usedPassages);
  if (validation.errors.length) throw new BankError(400, 'This form cannot be published yet.', validation);
  const hash = contentHash(parts);
  const latest = await latestVersion(db, formId);
  if (latest && latest.contentHash === hash) return { version: latest, unchanged: true };
  const version = await db.placementFormVersion.create({ data: {
    formId, version: (latest?.version ?? 0) + 1, snapshot: { questions: parts.questions, passages: usedPassages },
    contentHash: hash, questionCount: parts.questions.length, publishedById: user?.userId ?? null, publishedByName: user?.email ?? 'System',
  } });
  return { version, unchanged: false };
}

export async function publishForm(db: Db, formId: string, user: { userId: string; email: string }) {
  return db.$transaction((tx: Db) => publishWith(tx, formId, user));
}

export async function availableForms(db: Db) {
  const forms = await db.placementForm.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
  const result: { id: string; version: any }[] = [];
  for (const form of forms) {
    const version = await latestVersion(db, form.id);
    if (version && version.questionCount > 0) result.push({ id: form.id, version });
  }
  return result;
}

export async function nextFormId(db: Db) {
  const forms = await db.placementForm.findMany({ select: { id: true } });
  const used = new Set(forms.map((f: { id: string }) => f.id));
  for (let code = 65; code <= 90; code += 1) {
    const id = String.fromCharCode(code);
    if (!used.has(id)) return id;
  }
  throw new BankError(400, 'All 26 form letters are in use.');
}

export interface QuestionStats {
  seen: number;
  correct: number;
  wrong: number;
  blank: number;
  wrongChoices: { text: string; count: number }[];
  lastSeenAt: string | null;
}

export async function questionStats(db: Db, formId: string): Promise<Record<string, QuestionStats>> {
  const [versions, submissions] = await Promise.all([
    db.placementFormVersion.findMany({ where: { formId }, select: { id: true, snapshot: true } }),
    db.placementTestSubmission.findMany({ where: { formId, formVersionId: { not: null } }, select: { formVersionId: true, answers: true, submittedAt: true } }),
  ]);
  const keys = new Map<string, Map<string, { answer: number; options: string[] }>>();
  for (const version of versions) {
    const map = new Map<string, { answer: number; options: string[] }>();
    for (const q of (version.snapshot?.questions ?? []) as PlacementQuestion[]) map.set(q.id, { answer: q.answer, options: q.options });
    keys.set(version.id, map);
  }
  const stats: Record<string, QuestionStats & { choiceCounts: Map<string, number> }> = {};
  for (const submission of submissions) {
    const key = keys.get(submission.formVersionId);
    if (!key) continue;
    const answers = (submission.answers ?? {}) as Record<string, unknown>;
    const at = new Date(submission.submittedAt).toISOString();
    for (const [id, item] of key) {
      const row = stats[id] ??= { seen: 0, correct: 0, wrong: 0, blank: 0, wrongChoices: [], lastSeenAt: null, choiceCounts: new Map() };
      row.seen += 1;
      if (!row.lastSeenAt || at > row.lastSeenAt) row.lastSeenAt = at;
      const chosen = answers[id];
      if (typeof chosen !== 'number' || !item.options[chosen]) row.blank += 1;
      else if (chosen === item.answer) row.correct += 1;
      else {
        row.wrong += 1;
        const text = item.options[chosen];
        row.choiceCounts.set(text, (row.choiceCounts.get(text) ?? 0) + 1);
      }
    }
  }
  return Object.fromEntries(Object.entries(stats).map(([id, { choiceCounts, ...row }]) => [id, {
    ...row,
    wrongChoices: [...choiceCounts.entries()].map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count).slice(0, 3),
  }]));
}
