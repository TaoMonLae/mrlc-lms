import type { Express, Request, RequestHandler, Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import { randomInt } from 'node:crypto';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { z } from 'zod';
import {
  HIGHEST_GRADE_OPTIONS,
  PLACEMENT_BANDS,
  PLACEMENT_FORMS,
  PLACEMENT_LEVELS,
  PLACEMENT_LEVEL_CLASS_NAMES,
  PLACEMENT_LEVEL_LABELS,
  PLACEMENT_SECTIONS,
  PLACEMENT_SECTION_IDS,
  PLACEMENT_STATUSES,
  PLACEMENT_TEST_VERSION,
  PLACEMENT_WRITING_PROMPT,
  WRITING_RATINGS,
  chooseForm,
  defaultSnapshot,
  isPlacementForm,
  placementReview,
  publicPlacementForm,
  sanitizePlacementAnswers,
  scorePlacement,
  validateBank,
  type PlacementLevel,
  type PlacementSnapshot,
  type SectionScore,
} from './shared/placementTest';
import { attemptTiming, contactKey, createAttemptToken, readAttemptToken } from './lib/placementAttempt';
import {
  BankError,
  availableForms,
  contentHash,
  ensureBank,
  getSettings,
  latestVersion,
  loadDraft,
  nextFormId,
  publishForm,
  questionStats,
  publishedBlueprints,
  rowsToSnapshotParts,
  thresholdsFrom,
  versionSnapshot,
} from './lib/placementBank';
import { buildPlacementDecisionEmail, buildPlacementReceiptEmail } from './lib/emailTemplates';

type JwtUser = { userId: string; role: string; email: string; externalLearner?: boolean };

export interface PlacementRoutesContext {
  app: Express;
  prisma: PrismaClient;
  authMiddleware: RequestHandler;
  logger: { error: (...args: any[]) => void };
  createAuditLog: (userId: string | null, userName: string | null, action: string, entityType: string, entityId: string | null, description: string, ipAddress: string | null, userAgent: string | null, severity?: string) => Promise<unknown>;
  queueEmail: (input: { toEmail: string; subject: string; textBody: string; htmlBody?: string | null; dedupeKey?: string | null }) => Promise<{ id: string }>;
  emailConfigured: () => boolean;
  appUrl: string;
  attemptSecret: string;
  admissions: {
    nextAdmissionNo: (tx: any) => Promise<string>;
    addTimeline: (tx: any, applicationId: string, eventType: string, title: string, description: string | null, fromStatus: string | null, toStatus: string | null, user: JwtUser) => Promise<unknown>;
    requiredDocuments: Array<{ title: string; documentType: string }>;
  };
}

const REVIEW_ROLES = new Set(['ADMIN', 'STAFF', 'TEACHER']);
const ADMISSION_ROLES = new Set(['ADMIN', 'STAFF']);
const BANK_ROLES = new Set(['ADMIN', 'TEACHER']);
const ADMIN_ONLY = new Set(['ADMIN']);

const CLASS_DESCRIPTIONS: Record<PlacementLevel, string> = {
  GED: 'In the GED class, you will prepare for the four GED tests: Reasoning Through Language Arts, Mathematical Reasoning, Science and Social Studies.',
  PRE_GED: 'The Pre-GED class builds your reading, writing and mathematics skills so that you are ready to begin GED preparation.',
  BELOW_PRE_GED: 'The Foundation class builds the basic English reading, writing and mathematics skills you need before the Pre-GED class.',
};

const SUBJECT_LEVEL_LABELS: Record<PlacementLevel, string> = { GED: 'GED level', PRE_GED: 'Pre-GED level', BELOW_PRE_GED: 'Foundation level' };

const phonePattern = /^[+0-9][0-9\s\-()]{6,22}$/;

const contactFields = {
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
  contactNumber: z.string().trim().regex(phonePattern, 'Enter a phone number using numbers only'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160),
};

const startSchema = z.object({
  ...contactFields,
  previousForms: z.array(z.string().max(2)).max(10).optional().default([]),
});

const submissionSchema = z.object({
  ...contactFields,
  token: z.string().min(10).max(800),
  age: z.union([z.literal(''), z.coerce.number().int().min(10).max(70)]).optional(),
  highestGrade: z.enum(HIGHEST_GRADE_OPTIONS.map(o => o.value) as [string, ...string[]]).optional().or(z.literal('')),
  answers: z.record(z.string(), z.number().int().min(0).max(9).nullable()).default({}),
  writingSample: z.string().max(PLACEMENT_WRITING_PROMPT.maxLength).optional().default(''),
  version: z.string().max(60).optional(),
  consent: z.literal(true, { error: 'Please agree before you submit' }),
  website: z.string().max(0).optional().default(''),
});

const reviewSchema = z.object({
  status: z.enum(PLACEMENT_STATUSES).optional(),
  finalLevel: z.enum(PLACEMENT_LEVELS).nullable().optional(),
  writingRating: z.enum(WRITING_RATINGS).optional(),
  reviewNotes: z.string().max(4000).nullable().optional(),
}).strict();

const decisionEmailSchema = z.object({
  message: z.string().trim().max(1500).optional().default(''),
  includeScores: z.boolean().optional().default(true),
}).strict();

const bulkSchema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(200),
  action: z.enum(['archive', 'unarchive', 'email-results']),
}).strict();

const questionSchema = z.object({
  section: z.enum(PLACEMENT_SECTION_IDS),
  band: z.enum(PLACEMENT_BANDS),
  skill: z.string().trim().min(1, 'Name the skill this question checks').max(80),
  passageId: z.string().max(64).nullable().optional(),
  prompt: z.string().trim().min(1, 'Write the question').max(1500),
  options: z.array(z.string().trim().min(1, 'Answer choices cannot be empty').max(400)).min(2, 'Add at least two answer choices').max(6, 'Use at most six answer choices'),
  answer: z.number().int().min(0),
  active: z.boolean().optional(),
  expectedUpdatedAt: z.string().max(40).optional(),
}).strict().refine(value => value.answer < value.options.length, { message: 'Mark the correct answer', path: ['answer'] });

const passageSchema = z.object({
  title: z.string().trim().min(1, 'Give the passage a title').max(160),
  body: z.array(z.string().trim().max(4000)).min(1).max(20).transform(paragraphs => paragraphs.filter(Boolean)).refine(paragraphs => paragraphs.length > 0, 'Write the passage text'),
  expectedUpdatedAt: z.string().max(40).optional(),
}).strict();

const staleEdit = (existing: { updatedAt: Date }, expected?: string) => Boolean(expected) && new Date(existing.updatedAt).toISOString() !== new Date(expected as string).toISOString();
const STALE_MESSAGE = 'Someone else saved this after you opened it. Your changes are kept on this device. Reload to see the latest version, then apply your changes again.';

const settingsSchema = z.object({
  isOpen: z.boolean(),
  closedMessage: z.string().trim().max(600).nullable().optional(),
  timeLimitMinutes: z.number().int().min(20).max(240),
  foundationMastery: z.number().int().min(30).max(100),
  preGedMastery: z.number().int().min(30).max(100),
  gedMastery: z.number().int().min(30).max(100),
  retakeWaitDays: z.number().int().min(0).max(365),
}).strict();

const listSelect = {
  id: true, referenceNo: true, fullName: true, contactNumber: true, email: true, age: true, highestGrade: true, formId: true,
  totalCorrect: true, totalQuestions: true, recommendedLevel: true, finalLevel: true, status: true, flags: true,
  sectionScores: true, submittedAt: true, reviewedByName: true, admissionApplicationId: true, decisionEmailedAt: true,
} as const;

function referenceNo() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i += 1) code += alphabet[randomInt(alphabet.length)];
  return `PT-${date}-${code}`;
}

const clientIp = (req: Request) => ipKeyGenerator(req.ip || '');

const csvCell = (value: unknown) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const restoredStatus = (row: { decisionEmailedAt: Date | null; finalLevel: string | null; reviewedAt: Date | null }) =>
  row.decisionEmailedAt ? 'CONTACTED' : row.finalLevel || row.reviewedAt ? 'REVIEWED' : 'NEW';

const dayStart = (value?: string) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+08:00`) : null;

export function registerPlacementRoutes(ctx: PlacementRoutesContext) {
  const { app, prisma, authMiddleware, logger, createAuditLog, queueEmail, emailConfigured, appUrl, attemptSecret, admissions } = ctx;
  const db = prisma as any;

  const limiter = (windowMinutes: number, max: number, message: string, key: (req: Request) => string) => rateLimit({
    windowMs: windowMinutes * 60 * 1000, max, standardHeaders: true, legacyHeaders: false, message: { error: message }, keyGenerator: key,
  });
  const startPerNetwork = limiter(60, 80, 'Too many tests were started from this network. Please try again later.', req => `placement-start:${clientIp(req)}`);
  const startPerApplicant = limiter(60, 6, 'This phone number has started the test several times this hour. Please wait, or ask a teacher for help.', req => `placement-start:${contactKey(String(req.body?.contactNumber || ''))}|${clientIp(req)}`);
  const submitPerNetwork = limiter(60, 80, 'Too many tests were sent from this network. Please try again later.', req => `placement-net:${clientIp(req)}`);
  const submitPerApplicant = limiter(60, 10, 'This phone number has sent several tests this hour. Please wait, or ask a teacher for help.', req => `placement:${contactKey(String(req.body?.contactNumber || ''))}|${clientIp(req)}`);

  const handle = (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler => async (req, res) => {
    try { await fn(req, res); }
    catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.issues[0]?.message || 'Please check the form', issues: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) });
        return;
      }
      if (error instanceof BankError) {
        res.status(error.status).json({ error: error.message, details: error.details });
        return;
      }
      logger.error('Placement test API failed:', error);
      res.status(error?.code === 'P2021' || error?.code === 'P2022' ? 503 : 500).json({ error: 'The placement test is not available right now. Please try again later.' });
    }
  };

  const allow = (roles: Set<string>): RequestHandler => (req, res, next) => {
    const user = (req as any).user as JwtUser | undefined;
    if (!user || !roles.has(user.role) || user.externalLearner) {
      res.status(403).json({ error: 'You do not have permission to do this.' });
      return;
    }
    next();
  };

  const userOf = (req: Request) => (req as any).user as JwtUser;
  const audit = (req: Request, action: string, entityId: string | null, description: string) => {
    const user = userOf(req);
    return createAuditLog(user?.userId ?? null, user?.email ?? null, action, 'PLACEMENT_TEST', entityId, description, req.ip || null, req.get('user-agent') || null);
  };

  const previousAttempts = (key: string, email: string) => db.placementTestSubmission.findMany({
    where: { OR: [{ contactKey: key }, { email }] },
    select: { formId: true, submittedAt: true },
    orderBy: { submittedAt: 'asc' },
    take: 20,
  }) as Promise<{ formId: string; submittedAt: Date }[]>;

  const snapshotFor = async (submission: { formId: string; formVersionId: string | null; testVersion: string }): Promise<PlacementSnapshot | null> => {
    if (submission.formVersionId) {
      const version = await db.placementFormVersion.findUnique({ where: { id: submission.formVersionId } });
      return version ? versionSnapshot(version) : null;
    }
    return submission.testVersion === PLACEMENT_TEST_VERSION && isPlacementForm(submission.formId) ? defaultSnapshot(submission.formId) : null;
  };

  app.get('/api/public/placement-test', handle(async (_req, res) => {
    await ensureBank(db);
    const [settings, forms] = await Promise.all([getSettings(db), availableForms(db)]);
    const sample = forms[0] ? versionSnapshot(forms[0].version) : null;
    const counts = forms.map(f => f.version.questionCount);
    res.set('Cache-Control', 'no-store');
    res.json({
      version: PLACEMENT_TEST_VERSION,
      isOpen: settings.isOpen && forms.length > 0,
      closedMessage: settings.closedMessage,
      timeLimitMinutes: settings.timeLimitMinutes,
      questionCount: counts.length ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length) : 0,
      sections: PLACEMENT_SECTIONS.map(section => ({ ...section, questionCount: sample ? sample.questions.filter(q => q.section === section.id).length : 0 })),
      highestGradeOptions: HIGHEST_GRADE_OPTIONS,
    });
  }));

  app.post('/api/public/placement-test/start', startPerNetwork, startPerApplicant, handle(async (req, res) => {
    const input = startSchema.parse(req.body);
    await ensureBank(db);
    const [settings, forms] = await Promise.all([getSettings(db), availableForms(db)]);
    if (!settings.isOpen || !forms.length) {
      res.status(403).json({ error: settings.closedMessage || 'The placement test is closed at the moment. Please contact the school office.' });
      return;
    }
    const key = contactKey(input.contactNumber);
    const previous = await previousAttempts(key, input.email);
    const last = previous.at(-1);
    if (last && settings.retakeWaitDays > 0) {
      const nextAllowed = new Date(last.submittedAt.getTime() + settings.retakeWaitDays * 86_400_000);
      if (nextAllowed > new Date()) {
        const date = nextAllowed.toLocaleDateString('en-MY', { dateStyle: 'long', timeZone: 'Asia/Kuala_Lumpur' });
        res.status(429).json({ error: `You have already taken the placement test. You can take it again from ${date}. If you think this is a mistake, contact the school office.` });
        return;
      }
    }
    const formId = chooseForm([...input.previousForms, ...previous.map(p => p.formId)], forms.map(f => f.id));
    const chosen = forms.find(f => f.id === formId)!;
    const limitSeconds = settings.timeLimitMinutes * 60;
    const { token, attempt } = createAttemptToken({ form: formId, versionId: chosen.version.id, contactNumber: input.contactNumber, limitSeconds }, attemptSecret);
    res.set('Cache-Control', 'no-store');
    res.json({ token, startedAt: attempt.startedAt, serverNow: Date.now(), timeLimitSeconds: limitSeconds, test: publicPlacementForm(versionSnapshot(chosen.version), limitSeconds) });
  }));

  app.post('/api/public/placement-test', submitPerNetwork, submitPerApplicant, handle(async (req, res) => {
    const input = submissionSchema.parse(req.body);
    const attempt = readAttemptToken(input.token, attemptSecret);
    if (!attempt || attempt.contact !== contactKey(input.contactNumber)) {
      res.status(400).json({ error: 'This test could not be checked. Please start the test again from the beginning.' });
      return;
    }
    const existing = await db.placementTestSubmission.findUnique({ where: { attemptNonce: attempt.nonce }, select: { referenceNo: true } });
    if (existing) {
      res.status(200).json({ referenceNo: existing.referenceNo, alreadyReceived: true });
      return;
    }
    const timing = attemptTiming(attempt);
    if (timing.expired) {
      res.status(410).json({ error: 'This test attempt is too old to send. Please start a new test.' });
      return;
    }
    const versionRow = await db.placementFormVersion.findUnique({ where: { id: attempt.versionId } });
    if (!versionRow) {
      res.status(410).json({ error: 'This version of the test is no longer available. Please start a new test.' });
      return;
    }
    const snapshot = versionSnapshot(versionRow);
    const settings = await getSettings(db);
    const key = contactKey(input.contactNumber);
    const previous = await previousAttempts(key, input.email);
    const answers = sanitizePlacementAnswers(input.answers, snapshot.questions);
    const writingSample = input.writingSample.trim();
    const highestGrade = input.highestGrade || null;
    const result = scorePlacement(answers, { snapshot, thresholds: thresholdsFrom(settings), writingSample, durationSeconds: timing.durationSeconds, highestGrade, overTime: timing.overTime, repeatAttempt: previous.length > 0 });
    let created: { id: string; referenceNo: string } | null = null;
    for (let i = 0; i < 4 && !created; i += 1) {
      try {
        created = await db.placementTestSubmission.create({
          data: {
            referenceNo: referenceNo(),
            attemptNonce: attempt.nonce,
            formId: attempt.form,
            formVersionId: snapshot.versionId,
            fullName: input.fullName.replace(/\s+/g, ' '),
            contactNumber: input.contactNumber.replace(/\s+/g, ' '),
            contactKey: key,
            email: input.email,
            age: typeof input.age === 'number' ? input.age : null,
            highestGrade,
            answers,
            writingSample: writingSample || null,
            sectionScores: result.sections,
            totalCorrect: result.totalCorrect,
            totalQuestions: result.totalQuestions,
            recommendedLevel: result.recommendedLevel,
            flags: result.flags,
            startedAt: new Date(attempt.startedAt),
            durationSeconds: timing.durationSeconds,
            testVersion: PLACEMENT_TEST_VERSION,
          },
          select: { id: true, referenceNo: true },
        });
      } catch (error: any) {
        if (error?.code !== 'P2002') throw error;
        const raced = await db.placementTestSubmission.findUnique({ where: { attemptNonce: attempt.nonce }, select: { id: true, referenceNo: true } });
        if (raced) {
          res.status(200).json({ referenceNo: raced.referenceNo, alreadyReceived: true });
          return;
        }
      }
    }
    if (!created) throw new Error('Could not create a unique placement reference');
    try {
      const mail = buildPlacementReceiptEmail({ recipientName: input.fullName, referenceNo: created.referenceNo, appUrl });
      const outbox = await queueEmail({ toEmail: input.email, ...mail, dedupeKey: `placement-receipt:${created.id}` });
      await db.placementTestSubmission.update({ where: { id: created.id }, data: { receiptEmailOutboxId: outbox.id } });
    } catch (error) {
      logger.error('Placement receipt email could not be queued:', error);
    }
    await createAuditLog(null, input.fullName, 'CREATE', 'PLACEMENT_TEST', created.id, `Placement test ${created.referenceNo} submitted (form ${attempt.form} v${snapshot.version}).`, req.ip || null, req.get('user-agent') || null);
    res.status(201).json({ referenceNo: created.referenceNo });
  }));

  const listWhere = (query: Record<string, string | undefined>) => {
    const { q, status, level, from, to, form } = query;
    const where: any = {};
    const and: any[] = [];
    if (status && (PLACEMENT_STATUSES as readonly string[]).includes(status)) where.status = status;
    else if (status !== 'any') where.status = { not: 'ARCHIVED' };
    if (level && (PLACEMENT_LEVELS as readonly string[]).includes(level)) and.push({ OR: [{ finalLevel: level }, { finalLevel: null, recommendedLevel: level }] });
    if (form && /^[A-Z]$/.test(form)) where.formId = form;
    const fromDate = dayStart(from);
    const toDate = dayStart(to);
    if (fromDate || toDate) where.submittedAt = { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lt: new Date(toDate.getTime() + 86_400_000) } : {}) };
    if (q?.trim()) {
      const term = q.trim().slice(0, 80);
      and.push({ OR: [
        { fullName: { contains: term, mode: 'insensitive' } },
        { contactNumber: { contains: term } },
        { referenceNo: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ] });
    }
    if (and.length) where.AND = and;
    return where;
  };

  app.get('/api/placement-tests', authMiddleware, allow(REVIEW_ROLES), handle(async (req, res) => {
    const where = listWhere(req.query as Record<string, string | undefined>);
    const [items, counts] = await Promise.all([
      db.placementTestSubmission.findMany({ where, select: listSelect, orderBy: { submittedAt: 'desc' }, take: 500 }),
      db.placementTestSubmission.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const user = userOf(req);
    res.json({ items, counts: Object.fromEntries(counts.map((c: any) => [c.status, c._count._all])), canManageBank: BANK_ROLES.has(user.role) });
  }));

  app.get('/api/placement-tests/export.csv', authMiddleware, allow(REVIEW_ROLES), handle(async (req, res) => {
    const rows = await db.placementTestSubmission.findMany({ where: listWhere(req.query as Record<string, string | undefined>), orderBy: { submittedAt: 'desc' }, take: 5000 });
    const header = ['Reference', 'Submitted', 'Name', 'Phone', 'Email', 'Age', 'Last grade finished', 'Form', 'Score', 'Out of', ...PLACEMENT_SECTIONS.map(s => s.title), 'Recommended', 'Placed', 'Writing', 'Status', 'Checks', 'Result emailed', 'Notes'];
    const lines = rows.map((row: any) => {
      const scores = (row.sectionScores || []) as SectionScore[];
      return [
        row.referenceNo, new Date(row.submittedAt).toISOString(), row.fullName, row.contactNumber, row.email, row.age ?? '',
        HIGHEST_GRADE_OPTIONS.find(o => o.value === row.highestGrade)?.label ?? '', row.formId, row.totalCorrect, row.totalQuestions,
        ...PLACEMENT_SECTIONS.map(s => { const sc = scores.find(x => x.section === s.id); return sc ? `${sc.correct}/${sc.total} ${PLACEMENT_LEVEL_LABELS[sc.level]}` : ''; }),
        PLACEMENT_LEVEL_LABELS[row.recommendedLevel as PlacementLevel] ?? row.recommendedLevel, row.finalLevel ? PLACEMENT_LEVEL_LABELS[row.finalLevel as PlacementLevel] : '',
        row.writingRating, row.status, (row.flags || []).join('; '), row.decisionEmailedAt ? new Date(row.decisionEmailedAt).toISOString() : '', row.reviewNotes ?? '',
      ].map(csvCell).join(',');
    });
    await audit(req, 'EXPORT', null, `Exported ${rows.length} placement test results.`);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="placement-tests-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(`﻿${[header.map(csvCell).join(','), ...lines].join('\r\n')}`);
  }));

  const emailState = async (id: string | null) => {
    if (!id) return null;
    const row = await db.emailOutbox.findUnique({ where: { id }, select: { status: true, sentAt: true, createdAt: true, lastError: true, attempts: true } });
    return row ? { status: row.status, sentAt: row.sentAt, queuedAt: row.createdAt, attempts: row.attempts, lastError: row.status === 'FAILED' ? row.lastError : null } : null;
  };

  app.get('/api/placement-tests/:id', authMiddleware, allow(REVIEW_ROLES), handle(async (req, res) => {
    const submission = await db.placementTestSubmission.findUnique({ where: { id: req.params.id } });
    if (!submission) {
      res.status(404).json({ error: 'Placement test not found' });
      return;
    }
    const [otherAttempts, receiptEmail, decisionEmail, snapshot] = await Promise.all([
      db.placementTestSubmission.findMany({
        where: { id: { not: submission.id }, OR: [{ contactKey: submission.contactKey }, { email: submission.email }] },
        select: { id: true, referenceNo: true, submittedAt: true, formId: true, recommendedLevel: true, finalLevel: true },
        orderBy: { submittedAt: 'desc' },
        take: 10,
      }),
      emailState(submission.receiptEmailOutboxId),
      emailState(submission.decisionEmailOutboxId),
      snapshotFor(submission),
    ]);
    const user = userOf(req);
    const { attemptNonce, contactKey: _contactKey, ...visible } = submission;
    res.json({
      ...visible,
      formVersion: snapshot?.version ?? null,
      review: snapshot ? placementReview(submission.answers, snapshot) : [],
      sections: PLACEMENT_SECTIONS,
      writingPrompt: PLACEMENT_WRITING_PROMPT.prompt,
      otherAttempts,
      receiptEmail,
      decisionEmail,
      emailConfigured: emailConfigured(),
      canCreateAdmission: ADMISSION_ROLES.has(user.role),
    });
  }));

  app.patch('/api/placement-tests/:id', authMiddleware, allow(REVIEW_ROLES), handle(async (req, res) => {
    const input = reviewSchema.parse(req.body);
    const user = userOf(req);
    const existing = await db.placementTestSubmission.findUnique({ where: { id: req.params.id }, select: { id: true, referenceNo: true, status: true } });
    if (!existing) {
      res.status(404).json({ error: 'Placement test not found' });
      return;
    }
    const decided = input.finalLevel !== undefined || input.writingRating !== undefined || input.reviewNotes !== undefined;
    const updated = await db.placementTestSubmission.update({
      where: { id: existing.id },
      data: {
        ...(input.finalLevel !== undefined ? { finalLevel: input.finalLevel } : {}),
        ...(input.writingRating !== undefined ? { writingRating: input.writingRating } : {}),
        ...(input.reviewNotes !== undefined ? { reviewNotes: input.reviewNotes?.trim() || null } : {}),
        status: input.status ?? (decided && existing.status === 'NEW' ? 'REVIEWED' : existing.status),
        ...(decided ? { reviewedById: user.userId, reviewedByName: user.email, reviewedAt: new Date() } : {}),
      },
      select: { id: true, status: true, finalLevel: true },
    });
    await audit(req, 'UPDATE', existing.id, `Placement test ${existing.referenceNo} reviewed${input.finalLevel ? `: ${PLACEMENT_LEVEL_LABELS[input.finalLevel]}` : ''}.`);
    res.json(updated);
  }));

  const sendDecision = async (submission: any, user: JwtUser, message: string, includeScores: boolean) => {
    const level = submission.finalLevel as PlacementLevel;
    const scores = (submission.sectionScores || []) as SectionScore[];
    const mail = buildPlacementDecisionEmail({
      recipientName: submission.fullName,
      referenceNo: submission.referenceNo,
      className: PLACEMENT_LEVEL_CLASS_NAMES[level],
      classDescription: CLASS_DESCRIPTIONS[level],
      subjects: includeScores ? scores.map(score => ({
        title: PLACEMENT_SECTIONS.find(s => s.id === score.section)?.title ?? score.section,
        correct: score.correct,
        total: score.total,
        level: SUBJECT_LEVEL_LABELS[score.level],
      })) : undefined,
      message,
      appUrl,
    });
    const outbox = await queueEmail({ toEmail: submission.email, ...mail, dedupeKey: `placement-decision:${submission.id}:${Date.now()}` });
    await db.placementTestSubmission.update({
      where: { id: submission.id },
      data: { decisionEmailOutboxId: outbox.id, decisionEmailedAt: new Date(), decisionEmailedByName: user.email, decisionEmailedLevel: level, status: submission.status === 'ARCHIVED' ? 'ARCHIVED' : 'CONTACTED' },
    });
    return outbox;
  };

  app.post('/api/placement-tests/:id/email-decision', authMiddleware, allow(REVIEW_ROLES), handle(async (req, res) => {
    const input = decisionEmailSchema.parse(req.body ?? {});
    const submission = await db.placementTestSubmission.findUnique({ where: { id: req.params.id } });
    if (!submission) {
      res.status(404).json({ error: 'Placement test not found' });
      return;
    }
    if (!submission.finalLevel) {
      res.status(400).json({ error: 'Choose and save a class before emailing the result.' });
      return;
    }
    const outbox = await sendDecision(submission, userOf(req), input.message, input.includeScores);
    await audit(req, 'NOTIFY', submission.id, `Placement result (${PLACEMENT_LEVEL_LABELS[submission.finalLevel as PlacementLevel]}) emailed for ${submission.referenceNo}.`);
    res.status(202).json({ queued: true, emailConfigured: emailConfigured(), decisionEmail: await emailState(outbox.id) });
  }));

  app.post('/api/placement-tests/bulk', authMiddleware, allow(REVIEW_ROLES), handle(async (req, res) => {
    const input = bulkSchema.parse(req.body);
    const user = userOf(req);
    const rows = await db.placementTestSubmission.findMany({ where: { id: { in: input.ids } } });
    if (input.action === 'archive' || input.action === 'unarchive') {
      let count = 0;
      for (const row of rows) {
        const status = input.action === 'archive' ? 'ARCHIVED' : restoredStatus(row);
        if (row.status === status) continue;
        await db.placementTestSubmission.update({ where: { id: row.id }, data: { status } });
        count += 1;
      }
      await audit(req, 'UPDATE', null, `${input.action === 'archive' ? 'Archived' : 'Restored'} ${count} placement tests.`);
      res.json({ updated: count });
      return;
    }
    let sent = 0;
    const skipped: { referenceNo: string; reason: string }[] = [];
    for (const row of rows) {
      if (!row.finalLevel) { skipped.push({ referenceNo: row.referenceNo, reason: 'No class chosen yet' }); continue; }
      if (row.decisionEmailedAt && row.decisionEmailedLevel === row.finalLevel) { skipped.push({ referenceNo: row.referenceNo, reason: 'Result already emailed' }); continue; }
      await sendDecision(row, user, '', true);
      sent += 1;
    }
    await audit(req, 'NOTIFY', null, `Emailed ${sent} placement results in bulk; ${skipped.length} skipped.`);
    res.json({ sent, skipped, emailConfigured: emailConfigured() });
  }));

  app.post('/api/placement-tests/:id/archive', authMiddleware, allow(REVIEW_ROLES), handle(async (req, res) => {
    const input = z.object({ archived: z.boolean() }).strict().parse(req.body);
    const existing = await db.placementTestSubmission.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Placement test not found' });
      return;
    }
    const status = input.archived ? 'ARCHIVED' : restoredStatus(existing);
    const updated = await db.placementTestSubmission.update({ where: { id: existing.id }, data: { status }, select: { id: true, status: true } });
    await audit(req, 'UPDATE', existing.id, `Placement test ${existing.referenceNo} ${input.archived ? 'archived' : 'restored'}.`);
    res.json(updated);
  }));

  app.post('/api/placement-tests/:id/admission', authMiddleware, allow(ADMISSION_ROLES), handle(async (req, res) => {
    const user = userOf(req);
    const result = await prisma.$transaction(async tx => {
      const t = tx as any;
      const submission = await t.placementTestSubmission.findUnique({ where: { id: req.params.id } });
      if (!submission) return { status: 404 as const, body: { error: 'Placement test not found' } };
      if (submission.admissionApplicationId) return { status: 409 as const, body: { error: 'An admission application already exists for this test', admissionApplicationId: submission.admissionApplicationId } };
      const level = (submission.finalLevel || submission.recommendedLevel) as PlacementLevel;
      const grade = HIGHEST_GRADE_OPTIONS.find(o => o.value === submission.highestGrade)?.label || null;
      const applicationNo = await admissions.nextAdmissionNo(t);
      const application = await t.admissionApplication.create({
        data: {
          applicationNo,
          applicantName: submission.fullName,
          email: submission.email,
          contactNumber: submission.contactNumber,
          targetLevel: PLACEMENT_LEVEL_LABELS[level],
          previousEducationLevel: grade,
          previousEducationNotes: `Placement test ${submission.referenceNo} (form ${submission.formId}): ${submission.totalCorrect}/${submission.totalQuestions} correct. Recommended ${PLACEMENT_LEVEL_LABELS[submission.recommendedLevel as PlacementLevel]}${submission.finalLevel ? `, teacher placement ${PLACEMENT_LEVEL_LABELS[level]}` : ''}.`,
          notes: submission.reviewNotes,
          status: 'SUBMITTED',
          createdById: user.userId,
          createdByName: user.email,
        },
      });
      await t.admissionDocument.createMany({ data: admissions.requiredDocuments.map(doc => ({ applicationId: application.id, ...doc, checklistStatus: 'PENDING' })) });
      await admissions.addTimeline(t, application.id, 'CREATED', 'Application created from placement test', `Created from placement test ${submission.referenceNo}.`, null, 'SUBMITTED', user);
      await t.placementTestSubmission.update({ where: { id: submission.id }, data: { admissionApplicationId: application.id } });
      return { status: 201 as const, body: { admissionApplicationId: application.id, applicationNo } };
    });
    if (result.status === 201) await createAuditLog(user.userId, user.email, 'CREATE', 'ADMISSION', result.body.admissionApplicationId, `Admission application ${result.body.applicationNo} created from a placement test.`, req.ip || null, req.get('user-agent') || null);
    res.status(result.status).json(result.body);
  }));

  app.get('/api/placement-settings', authMiddleware, allow(REVIEW_ROLES), handle(async (req, res) => {
    await ensureBank(db);
    const settings = await getSettings(db);
    res.json({ ...settings, canEdit: userOf(req).role === 'ADMIN' });
  }));

  app.put('/api/placement-settings', authMiddleware, allow(ADMIN_ONLY), handle(async (req, res) => {
    const input = settingsSchema.parse(req.body);
    if (!(input.foundationMastery >= 30 && input.preGedMastery >= 30 && input.gedMastery >= 30)) throw new BankError(400, 'Cut-offs must be at least 30%.');
    const user = userOf(req);
    const settings = await db.placementSettings.upsert({
      where: { id: 'default' },
      update: { ...input, closedMessage: input.closedMessage || null, updatedByName: user.email },
      create: { id: 'default', ...input, closedMessage: input.closedMessage || null, updatedByName: user.email },
    });
    await audit(req, 'UPDATE', null, `Placement settings changed: ${input.isOpen ? 'open' : 'closed'}, ${input.timeLimitMinutes} min, cut-offs ${input.foundationMastery}/${input.preGedMastery}/${input.gedMastery}%, retake wait ${input.retakeWaitDays} days.`);
    res.json({ ...settings, canEdit: true });
  }));

  const formSummary = async (form: any) => {
    const [draft, latest] = await Promise.all([loadDraft(db, form.id), latestVersion(db, form.id)]);
    const parts = rowsToSnapshotParts(draft.questions, draft.passages);
    const validation = validateBank(parts.questions, parts.passages.filter(p => parts.questions.some(q => q.passageId === p.id)));
    return {
      id: form.id, name: form.name, active: form.active,
      draftCount: parts.questions.length, retiredCount: draft.questions.length - parts.questions.length,
      latest: latest ? { id: latest.id, version: latest.version, publishedAt: latest.publishedAt, publishedByName: latest.publishedByName, questionCount: latest.questionCount } : null,
      hasChanges: !latest || latest.contentHash !== contentHash(parts),
      errorCount: validation.errors.length,
    };
  };

  const requireForm = async (id: string) => {
    if (!/^[A-Z]$/.test(id)) throw new BankError(404, 'Form not found');
    const form = await db.placementForm.findUnique({ where: { id } });
    if (!form) throw new BankError(404, 'Form not found');
    return form;
  };

  app.get('/api/placement-bank', authMiddleware, allow(REVIEW_ROLES), handle(async (req, res) => {
    await ensureBank(db);
    const forms = await db.placementForm.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
    res.json({ forms: await Promise.all(forms.map(formSummary)), canEdit: BANK_ROLES.has(userOf(req).role), canPublish: userOf(req).role === 'ADMIN' });
  }));

  app.post('/api/placement-bank/forms', authMiddleware, allow(BANK_ROLES), handle(async (req, res) => {
    const input = z.object({ copyFrom: z.string().regex(/^[A-Z]$/).optional() }).strict().parse(req.body ?? {});
    await ensureBank(db);
    const id = await nextFormId(db);
    await db.$transaction(async (tx: any) => {
      const count = await tx.placementForm.count();
      await tx.placementForm.create({ data: { id, name: `Form ${id}`, active: false, sortOrder: count } });
      if (input.copyFrom) {
        const source = await loadDraft(tx, input.copyFrom);
        const map = new Map<string, string>();
        for (const p of source.passages) {
          const row = await tx.placementBankPassage.create({ data: { formId: id, title: p.title, body: p.body, sortOrder: p.sortOrder } });
          map.set(p.id, row.id);
        }
        for (const q of source.questions) {
          await tx.placementBankQuestion.create({ data: { formId: id, section: q.section, band: q.band, skill: q.skill, passageId: q.passageId ? map.get(q.passageId) ?? null : null, prompt: q.prompt, options: q.options, answer: q.answer, sortOrder: q.sortOrder, active: q.active } });
        }
      }
    });
    await audit(req, 'CREATE', id, `Placement form ${id} created${input.copyFrom ? ` as a copy of form ${input.copyFrom}` : ''}.`);
    res.status(201).json({ id });
  }));

  app.patch('/api/placement-bank/forms/:form', authMiddleware, allow(BANK_ROLES), handle(async (req, res) => {
    const form = await requireForm(req.params.form);
    const input = z.object({ name: z.string().trim().min(1).max(60).optional(), active: z.boolean().optional() }).strict().parse(req.body);
    if (input.active === true && !(await latestVersion(db, form.id))) throw new BankError(400, 'Publish this form before adding it to the rotation.');
    if (input.active === false) {
      const active = await availableForms(db);
      if (active.length <= 1 && active.some(f => f.id === form.id)) throw new BankError(400, 'At least one published form must stay in the rotation.');
    }
    const updated = await db.placementForm.update({ where: { id: form.id }, data: input });
    await audit(req, 'UPDATE', form.id, `Placement form ${form.id} ${input.active === undefined ? 'renamed' : input.active ? 'added to rotation' : 'removed from rotation'}.`);
    res.json(updated);
  }));

  app.get('/api/placement-bank/forms/:form', authMiddleware, allow(REVIEW_ROLES), handle(async (req, res) => {
    await ensureBank(db);
    const form = await requireForm(req.params.form);
    const [draft, versions, compareWith, summary] = await Promise.all([
      loadDraft(db, form.id),
      db.placementFormVersion.findMany({ where: { formId: form.id }, orderBy: { version: 'desc' }, take: 10, select: { id: true, version: true, publishedAt: true, publishedByName: true, questionCount: true } }),
      publishedBlueprints(db, form.id),
      formSummary(form),
    ]);
    const parts = rowsToSnapshotParts(draft.questions, draft.passages);
    const validation = validateBank(parts.questions, parts.passages, compareWith);
    const usage = await db.placementTestSubmission.groupBy({ by: ['formVersionId'], where: { formId: form.id }, _count: { _all: true } });
    res.json({
      form: summary,
      passages: draft.passages.map((p: any) => ({ id: p.id, title: p.title, body: p.body, sortOrder: p.sortOrder, updatedAt: p.updatedAt })),
      questions: draft.questions.map((q: any) => ({ id: q.id, section: q.section, band: q.band, skill: q.skill, passageId: q.passageId, prompt: q.prompt, options: q.options, answer: q.answer, sortOrder: q.sortOrder, active: q.active, updatedAt: q.updatedAt })),
      versions: versions.map((v: any) => ({ ...v, submissions: usage.find((u: any) => u.formVersionId === v.id)?._count._all ?? 0 })),
      validation,
      canEdit: BANK_ROLES.has(userOf(req).role),
      canPublish: userOf(req).role === 'ADMIN',
    });
  }));

  app.get('/api/placement-bank/forms/:form/stats', authMiddleware, allow(REVIEW_ROLES), handle(async (req, res) => {
    const form = await requireForm(req.params.form);
    res.json(await questionStats(db, form.id));
  }));

  app.post('/api/placement-bank/forms/:form/publish', authMiddleware, allow(ADMIN_ONLY), handle(async (req, res) => {
    const form = await requireForm(req.params.form);
    const user = userOf(req);
    const { version, unchanged } = await publishForm(db, form.id, user);
    if (!unchanged) await audit(req, 'PUBLISH', form.id, `Placement form ${form.id} version ${version.version} published (${version.questionCount} questions).`);
    res.json({ version: version.version, unchanged });
  }));

  const nextOrder = async (model: string, where: any) => {
    const last = await db[model].findFirst({ where, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
    return (last?.sortOrder ?? -1) + 1;
  };

  const checkPassage = async (formId: string, passageId: string | null | undefined) => {
    if (!passageId) return null;
    const passage = await db.placementBankPassage.findUnique({ where: { id: passageId } });
    if (!passage || passage.formId !== formId) throw new BankError(400, 'Choose a passage from this form.');
    return passage.id;
  };

  app.post('/api/placement-bank/forms/:form/questions', authMiddleware, allow(BANK_ROLES), handle(async (req, res) => {
    const form = await requireForm(req.params.form);
    const input = questionSchema.parse(req.body);
    const question = await db.placementBankQuestion.create({ data: {
      formId: form.id, section: input.section, band: input.band, skill: input.skill, passageId: await checkPassage(form.id, input.passageId),
      prompt: input.prompt, options: input.options, answer: input.answer, active: input.active ?? true,
      sortOrder: await nextOrder('placementBankQuestion', { formId: form.id, section: input.section, band: input.band }),
    } });
    await audit(req, 'CREATE', question.id, `Question added to placement form ${form.id} draft.`);
    res.status(201).json(question);
  }));

  app.patch('/api/placement-bank/questions/:id', authMiddleware, allow(BANK_ROLES), handle(async (req, res) => {
    const existing = await db.placementBankQuestion.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new BankError(404, 'Question not found');
    const input = questionSchema.parse(req.body);
    if (staleEdit(existing, input.expectedUpdatedAt)) throw new BankError(409, STALE_MESSAGE);
    const question = await db.placementBankQuestion.update({ where: { id: existing.id }, data: {
      section: input.section, band: input.band, skill: input.skill, passageId: await checkPassage(existing.formId, input.passageId),
      prompt: input.prompt, options: input.options, answer: input.answer, ...(input.active !== undefined ? { active: input.active } : {}),
      ...(existing.section !== input.section || existing.band !== input.band ? { sortOrder: await nextOrder('placementBankQuestion', { formId: existing.formId, section: input.section, band: input.band }) } : {}),
    } });
    await audit(req, 'UPDATE', question.id, `Question edited in placement form ${existing.formId} draft.`);
    res.json(question);
  }));

  app.post('/api/placement-bank/questions/:id/active', authMiddleware, allow(BANK_ROLES), handle(async (req, res) => {
    const input = z.object({ active: z.boolean() }).strict().parse(req.body);
    const existing = await db.placementBankQuestion.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new BankError(404, 'Question not found');
    const question = await db.placementBankQuestion.update({ where: { id: existing.id }, data: { active: input.active } });
    await audit(req, 'UPDATE', question.id, `Question ${input.active ? 'restored' : 'retired'} in placement form ${existing.formId} draft.`);
    res.json(question);
  }));

  app.post('/api/placement-bank/questions/:id/move', authMiddleware, allow(BANK_ROLES), handle(async (req, res) => {
    const input = z.object({ direction: z.enum(['up', 'down']) }).strict().parse(req.body);
    const existing = await db.placementBankQuestion.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new BankError(404, 'Question not found');
    const siblings = await db.placementBankQuestion.findMany({ where: { formId: existing.formId, section: existing.section, band: existing.band }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    const index = siblings.findIndex((s: any) => s.id === existing.id);
    const swap = siblings[input.direction === 'up' ? index - 1 : index + 1];
    if (swap) {
      const ordered = siblings.map((s: any, i: number) => ({ id: s.id, sortOrder: i }));
      const a = ordered[index];
      const b = ordered.find((o: any) => o.id === swap.id)!;
      [a.sortOrder, b.sortOrder] = [b.sortOrder, a.sortOrder];
      await db.$transaction(ordered.map((o: any) => db.placementBankQuestion.update({ where: { id: o.id }, data: { sortOrder: o.sortOrder } })));
    }
    res.json({ moved: Boolean(swap) });
  }));

  app.delete('/api/placement-bank/questions/:id', authMiddleware, allow(BANK_ROLES), handle(async (req, res) => {
    const existing = await db.placementBankQuestion.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new BankError(404, 'Question not found');
    await db.placementBankQuestion.delete({ where: { id: existing.id } });
    await audit(req, 'DELETE', existing.id, `Question deleted from placement form ${existing.formId} draft.`);
    res.json({ deleted: true });
  }));

  app.post('/api/placement-bank/forms/:form/passages', authMiddleware, allow(BANK_ROLES), handle(async (req, res) => {
    const form = await requireForm(req.params.form);
    const input = passageSchema.parse(req.body);
    const passage = await db.placementBankPassage.create({ data: { formId: form.id, title: input.title, body: input.body, sortOrder: await nextOrder('placementBankPassage', { formId: form.id }) } });
    await audit(req, 'CREATE', passage.id, `Passage added to placement form ${form.id} draft.`);
    res.status(201).json(passage);
  }));

  app.patch('/api/placement-bank/passages/:id', authMiddleware, allow(BANK_ROLES), handle(async (req, res) => {
    const existing = await db.placementBankPassage.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new BankError(404, 'Passage not found');
    const { expectedUpdatedAt, ...input } = passageSchema.parse(req.body);
    if (staleEdit(existing, expectedUpdatedAt)) throw new BankError(409, STALE_MESSAGE);
    const passage = await db.placementBankPassage.update({ where: { id: existing.id }, data: input });
    await audit(req, 'UPDATE', passage.id, `Passage edited in placement form ${existing.formId} draft.`);
    res.json(passage);
  }));

  app.delete('/api/placement-bank/passages/:id', authMiddleware, allow(BANK_ROLES), handle(async (req, res) => {
    const existing = await db.placementBankPassage.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new BankError(404, 'Passage not found');
    const used = await db.placementBankQuestion.count({ where: { passageId: existing.id } });
    if (used) throw new BankError(409, `${used} question${used === 1 ? ' uses' : 's use'} this passage. Move or delete those questions first.`);
    await db.placementBankPassage.delete({ where: { id: existing.id } });
    await audit(req, 'DELETE', existing.id, `Passage deleted from placement form ${existing.formId} draft.`);
    res.json({ deleted: true });
  }));

  void PLACEMENT_FORMS;
}
