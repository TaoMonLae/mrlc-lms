import type { Express, Request, RequestHandler, Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import { randomInt } from 'node:crypto';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { z } from 'zod';
import {
  HIGHEST_GRADE_OPTIONS,
  PLACEMENT_LEVELS,
  PLACEMENT_LEVEL_CLASS_NAMES,
  PLACEMENT_LEVEL_LABELS,
  PLACEMENT_SECTIONS,
  PLACEMENT_STATUSES,
  PLACEMENT_TEST_VERSION,
  PLACEMENT_TIME_LIMIT_SECONDS,
  PLACEMENT_WRITING_PROMPT,
  WRITING_RATINGS,
  chooseForm,
  isPlacementForm,
  placementOverview,
  placementReview,
  publicPlacementForm,
  sanitizePlacementAnswers,
  scorePlacement,
  type PlacementLevel,
  type SectionScore,
} from './shared/placementTest';
import { attemptTiming, contactKey, createAttemptToken, readAttemptToken } from './lib/placementAttempt';
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
  token: z.string().min(10).max(600),
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
        res.status(400).json({ error: error.issues[0]?.message || 'Please check your answers', issues: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) });
        return;
      }
      logger.error('Placement test API failed:', error);
      res.status(error?.code === 'P2021' || error?.code === 'P2022' ? 503 : 500).json({ error: 'The placement test is not available right now. Please try again later.' });
    }
  };

  const staffOnly = (roles: Set<string>): RequestHandler => (req, res, next) => {
    const user = (req as any).user as JwtUser | undefined;
    if (!user || !roles.has(user.role) || user.externalLearner) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };

  const previousAttempts = (key: string, email: string) => db.placementTestSubmission.findMany({
    where: { OR: [{ contactKey: key }, { email }] },
    select: { formId: true, submittedAt: true },
    orderBy: { submittedAt: 'asc' },
    take: 20,
  }) as Promise<{ formId: string; submittedAt: Date }[]>;

  app.get('/api/public/placement-test', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json(placementOverview());
  });

  app.post('/api/public/placement-test/start', startPerNetwork, startPerApplicant, handle(async (req, res) => {
    const input = startSchema.parse(req.body);
    const key = contactKey(input.contactNumber);
    const previous = await previousAttempts(key, input.email);
    const form = chooseForm([...input.previousForms, ...previous.map(p => p.formId)]);
    const { token, attempt } = createAttemptToken({ form, contactNumber: input.contactNumber }, attemptSecret);
    res.set('Cache-Control', 'no-store');
    res.json({ token, startedAt: attempt.startedAt, serverNow: Date.now(), timeLimitSeconds: PLACEMENT_TIME_LIMIT_SECONDS, test: publicPlacementForm(form) });
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
    if (input.version && input.version !== PLACEMENT_TEST_VERSION) {
      res.status(409).json({ error: 'The test was updated. Please reload the page and start again.' });
      return;
    }
    const key = contactKey(input.contactNumber);
    const previous = await previousAttempts(key, input.email);
    const answers = sanitizePlacementAnswers(input.answers, attempt.form);
    const writingSample = input.writingSample.trim();
    const highestGrade = input.highestGrade || null;
    const result = scorePlacement(answers, { form: attempt.form, writingSample, durationSeconds: timing.durationSeconds, highestGrade, overTime: timing.overTime, repeatAttempt: previous.length > 0 });
    let created: { id: string; referenceNo: string } | null = null;
    for (let i = 0; i < 4 && !created; i += 1) {
      try {
        created = await db.placementTestSubmission.create({
          data: {
            referenceNo: referenceNo(),
            attemptNonce: attempt.nonce,
            formId: attempt.form,
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
    await createAuditLog(null, input.fullName, 'CREATE', 'PLACEMENT_TEST', created.id, `Placement test ${created.referenceNo} submitted (form ${attempt.form}).`, req.ip || null, req.get('user-agent') || null);
    res.status(201).json({ referenceNo: created.referenceNo });
  }));

  app.get('/api/placement-tests', authMiddleware, staffOnly(REVIEW_ROLES), handle(async (req, res) => {
    const { q, status, level } = req.query as Record<string, string | undefined>;
    const where: any = {};
    if (status && (PLACEMENT_STATUSES as readonly string[]).includes(status)) where.status = status;
    else if (status !== 'any') where.status = { not: 'ARCHIVED' };
    if (level && (PLACEMENT_LEVELS as readonly string[]).includes(level)) where.OR = [{ finalLevel: level }, { finalLevel: null, recommendedLevel: level }];
    if (q?.trim()) {
      const term = q.trim().slice(0, 80);
      where.AND = [{ OR: [
        { fullName: { contains: term, mode: 'insensitive' } },
        { contactNumber: { contains: term } },
        { referenceNo: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ] }];
    }
    const [items, counts] = await Promise.all([
      db.placementTestSubmission.findMany({ where, select: listSelect, orderBy: { submittedAt: 'desc' }, take: 300 }),
      db.placementTestSubmission.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    res.json({ items, counts: Object.fromEntries(counts.map((c: any) => [c.status, c._count._all])) });
  }));

  const emailState = async (id: string | null) => {
    if (!id) return null;
    const row = await db.emailOutbox.findUnique({ where: { id }, select: { status: true, sentAt: true, createdAt: true, lastError: true, attempts: true } });
    return row ? { status: row.status, sentAt: row.sentAt, queuedAt: row.createdAt, attempts: row.attempts, lastError: row.status === 'FAILED' ? row.lastError : null } : null;
  };

  app.get('/api/placement-tests/:id', authMiddleware, staffOnly(REVIEW_ROLES), handle(async (req, res) => {
    const submission = await db.placementTestSubmission.findUnique({ where: { id: req.params.id } });
    if (!submission) {
      res.status(404).json({ error: 'Placement test not found' });
      return;
    }
    const [otherAttempts, receiptEmail, decisionEmail] = await Promise.all([
      db.placementTestSubmission.findMany({
        where: { id: { not: submission.id }, OR: [{ contactKey: submission.contactKey }, { email: submission.email }] },
        select: { id: true, referenceNo: true, submittedAt: true, formId: true, recommendedLevel: true, finalLevel: true },
        orderBy: { submittedAt: 'desc' },
        take: 10,
      }),
      emailState(submission.receiptEmailOutboxId),
      emailState(submission.decisionEmailOutboxId),
    ]);
    const user = (req as any).user as JwtUser;
    const { attemptNonce, contactKey: _contactKey, ...visible } = submission;
    res.json({
      ...visible,
      review: submission.testVersion === PLACEMENT_TEST_VERSION && isPlacementForm(submission.formId) ? placementReview(submission.answers, submission.formId) : [],
      sections: PLACEMENT_SECTIONS,
      writingPrompt: PLACEMENT_WRITING_PROMPT.prompt,
      otherAttempts,
      receiptEmail,
      decisionEmail,
      emailConfigured: emailConfigured(),
      canCreateAdmission: ADMISSION_ROLES.has(user.role),
    });
  }));

  app.patch('/api/placement-tests/:id', authMiddleware, staffOnly(REVIEW_ROLES), handle(async (req, res) => {
    const input = reviewSchema.parse(req.body);
    const user = (req as any).user as JwtUser;
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
    await createAuditLog(user.userId, user.email, 'UPDATE', 'PLACEMENT_TEST', existing.id, `Placement test ${existing.referenceNo} reviewed${input.finalLevel ? `: ${PLACEMENT_LEVEL_LABELS[input.finalLevel]}` : ''}.`, req.ip || null, req.get('user-agent') || null);
    res.json(updated);
  }));

  app.post('/api/placement-tests/:id/email-decision', authMiddleware, staffOnly(REVIEW_ROLES), handle(async (req, res) => {
    const input = decisionEmailSchema.parse(req.body ?? {});
    const user = (req as any).user as JwtUser;
    const submission = await db.placementTestSubmission.findUnique({ where: { id: req.params.id } });
    if (!submission) {
      res.status(404).json({ error: 'Placement test not found' });
      return;
    }
    if (!submission.email) {
      res.status(400).json({ error: 'This applicant did not give an email address.' });
      return;
    }
    const level = submission.finalLevel as PlacementLevel | null;
    if (!level) {
      res.status(400).json({ error: 'Choose and save a class before emailing the result.' });
      return;
    }
    const scores = (submission.sectionScores || []) as SectionScore[];
    const mail = buildPlacementDecisionEmail({
      recipientName: submission.fullName,
      referenceNo: submission.referenceNo,
      className: PLACEMENT_LEVEL_CLASS_NAMES[level],
      classDescription: CLASS_DESCRIPTIONS[level],
      subjects: input.includeScores ? scores.map(score => ({
        title: PLACEMENT_SECTIONS.find(s => s.id === score.section)?.title ?? score.section,
        correct: score.correct,
        total: score.total,
        level: SUBJECT_LEVEL_LABELS[score.level],
      })) : undefined,
      message: input.message,
      appUrl,
    });
    const outbox = await queueEmail({ toEmail: submission.email, ...mail, dedupeKey: `placement-decision:${submission.id}:${Date.now()}` });
    await db.placementTestSubmission.update({
      where: { id: submission.id },
      data: {
        decisionEmailOutboxId: outbox.id,
        decisionEmailedAt: new Date(),
        decisionEmailedByName: user.email,
        decisionEmailedLevel: level,
        status: submission.status === 'ARCHIVED' ? 'ARCHIVED' : 'CONTACTED',
      },
    });
    await createAuditLog(user.userId, user.email, 'NOTIFY', 'PLACEMENT_TEST', submission.id, `Placement result (${PLACEMENT_LEVEL_LABELS[level]}) emailed for ${submission.referenceNo}.`, req.ip || null, req.get('user-agent') || null);
    res.status(202).json({ queued: true, emailConfigured: emailConfigured(), decisionEmail: await emailState(outbox.id) });
  }));

  app.post('/api/placement-tests/:id/admission', authMiddleware, staffOnly(ADMISSION_ROLES), handle(async (req, res) => {
    const user = (req as any).user as JwtUser;
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
}
