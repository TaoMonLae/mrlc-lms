import type { Express, Request, Response } from 'express';
import type { PrismaClient, VolunteerDocument, VolunteerDocumentSignature } from '@prisma/client';
import crypto from 'node:crypto';
import type { JwtPayload, authMiddleware, createAuditLog, logger } from './server';
import {
  isVolunteerDocumentType, isVolunteerStaffRole, validateVolunteerDocumentInput, volunteerDocumentLabel,
  VOLUNTEER_ORGANIZATION_NAME, VOLUNTEER_SCHOOL_NAME, VOLUNTEER_PROGRAM_NAME, VOLUNTEER_SIGNER_ROLES,
  type VolunteerDocumentPayload, type VolunteerDocumentType,
} from './shared/volunteerDocuments';
import { normalizeVolunteerMark, volunteerContentHash, volunteerSigningStatus, VolunteerSigningError } from './shared/volunteerSigning';

export interface VolunteerDocumentRoutesContext {
  prisma: PrismaClient;
  authMiddleware: typeof authMiddleware;
  createAuditLog: typeof createAuditLog;
  logger: typeof logger;
  APP_URL: string;
}

type DocumentWithSignatures = VolunteerDocument & { signatures?: VolunteerDocumentSignature[] };
const signatureInclude = { signatures: { orderBy: { signedAt: 'asc' as const } } };

export function registerVolunteerDocumentRoutes(app: Express, ctx: VolunteerDocumentRoutesContext) {
  const { prisma, authMiddleware, createAuditLog, logger, APP_URL } = ctx;
  const requireStaff = (req: Request, res: Response): JwtPayload | null => {
    const user = (req as any).user as JwtPayload | undefined;
    if (!user || user.externalLearner || !isVolunteerStaffRole(user.role)) {
      res.status(403).json({ error: 'An authorized school staff account is required.' }); return null;
    }
    return user;
  };
  const requireAdmin = (req: Request, res: Response): JwtPayload | null => {
    const user = (req as any).user as JwtPayload | undefined;
    if (!user || user.externalLearner || user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only administrators can manage volunteer documents.' }); return null;
    }
    return user;
  };
  const canRead = (user: JwtPayload, document: VolunteerDocument) => user.role === 'ADMIN'
    || document.signatoryUserId === user.userId || document.organizationSignatoryUserId === user.userId;
  const documentResponse = (document: DocumentWithSignatures) => ({
    ...document, signatures: document.signatures || [],
    signingStatus: volunteerSigningStatus(document), contentHash: volunteerContentHash(document),
    verifyUrl: `${APP_URL.replace(/\/$/, '')}/verify/volunteer/${encodeURIComponent(document.verifyToken)}`,
  });
  const audit = async (req: Request, user: JwtPayload, action: string, document: VolunteerDocument) => {
    try {
      await createAuditLog(user.userId, user.email, action, 'VOLUNTEER_DOCUMENT', document.id,
        `${volunteerDocumentLabel(document.type)} ${document.documentNumber}: ${action.toLowerCase()}.`,
        req.ip, req.headers['user-agent'] || null, action === 'CANCEL' ? 'WARNING' : 'SUCCESS');
    } catch (error) {
      // Signature evidence is saved in the same transaction as the signature.
      // A separate audit outage must not turn a committed mutation into a retry.
      logger.error(`Unable to audit volunteer document ${document.id} (${action}):`, error);
    }
  };
  const handleError = (res: Response, error: unknown, action: string) => {
    if (error instanceof VolunteerSigningError) { res.status(error.status).json({ error: error.message }); return; }
    logger.error(`Error ${action} volunteer document:`, error);
    const code = (error as { code?: string } | null)?.code;
    if (code === 'P2021' || code === 'P2022') {
      res.status(503).json({ error: 'Volunteer documents are unavailable until the database migration is applied.' });
    } else if (code === 'P2002' || code === 'P2034') {
      res.status(409).json({ error: 'This document changed during your request. Refresh it before trying again.' });
    } else {
      res.status(500).json({ error: 'Unable to complete the volunteer document request.' });
    }
  };

  app.get('/api/volunteer-documents/options', authMiddleware, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const [staff, school] = await Promise.all([
        prisma.user.findMany({
          where: { isActive: true, isExternalLearner: false, role: { in: [...VOLUNTEER_SIGNER_ROLES] } },
          select: { id: true, firstName: true, lastName: true, role: true },
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        }),
        prisma.schoolProfile.findFirst({ select: { schoolChopDataUrl: true } }),
      ]);
      res.setHeader('Cache-Control', 'private, no-store');
      res.json({ signatories: staff.map(user => ({ id: user.id, name: `${user.firstName} ${user.lastName}`.trim(), role: user.role })), schoolChopDataUrl: school?.schoolChopDataUrl || null });
    } catch (error) { handleError(res, error, 'loading signing options'); }
  });

  app.post('/api/volunteer-documents/chop', authMiddleware, async (req, res) => {
    const user = requireAdmin(req, res); if (!user) return;
    try {
      const image = req.body?.imageDataUrl === null ? null : await normalizeVolunteerMark(req.body?.imageDataUrl, 'chop');
      const existing = await prisma.schoolProfile.findFirst({ select: { id: true } });
      const school = existing
        ? await prisma.schoolProfile.update({ where: { id: existing.id }, data: { schoolChopDataUrl: image } })
        : await prisma.schoolProfile.create({ data: { name: VOLUNTEER_SCHOOL_NAME, schoolChopDataUrl: image } });
      try {
        await createAuditLog(user.userId, user.email, 'UPDATE', 'SCHOOL_PROFILE', school.id,
          image ? 'Updated the volunteer document school chop.' : 'Removed the volunteer document school chop.',
          req.ip, req.headers['user-agent'] || null, 'SUCCESS');
      } catch (error) { logger.error('Unable to audit the school chop update:', error); }
      res.setHeader('Cache-Control', 'private, no-store');
      res.json({ schoolChopDataUrl: image });
    } catch (error) { handleError(res, error, 'saving school chop'); }
  });

  app.post('/api/volunteer-documents', authMiddleware, async (req, res) => {
    const user = requireAdmin(req, res); if (!user) return;
    const validated = validateVolunteerDocumentInput(req.body);
    if (validated.success === false) { res.status(400).json({ error: validated.error }); return; }
    const input = validated.data;
    if (!input.signatoryUserId) { res.status(400).json({ error: 'Choose the school account authorized to sign this document.' }); return; }
    if (Boolean(input.organizationSignatoryUserId) !== Boolean(input.organizationSignatoryName)) {
      res.status(400).json({ error: 'Choose an organization signatory account and title, or leave the organization signatory blank.' }); return;
    }
    try {
      const ids = [input.signatoryUserId, input.organizationSignatoryUserId].filter((id): id is string => Boolean(id));
      const [profile, staff] = await Promise.all([
        prisma.schoolProfile.findFirst(),
        prisma.user.findMany({ where: { id: { in: ids }, isActive: true, isExternalLearner: false, role: { in: [...VOLUNTEER_SIGNER_ROLES] } }, select: { id: true, firstName: true, lastName: true } }),
      ]);
      const selected = (id: string) => {
        const person = staff.find(candidate => candidate.id === id);
        if (!person) throw new VolunteerSigningError('A selected signatory is no longer an active school staff account. Choose another account.');
        const name = `${person.firstName} ${person.lastName}`.trim().replace(/\s+/g, ' ');
        if (!name || name.length > 120) throw new VolunteerSigningError('The selected account needs a full name of 120 characters or fewer before it can sign documents.');
        return name;
      };
      const payload: VolunteerDocumentPayload = {
        version: 2,
        organization: { name: VOLUNTEER_ORGANIZATION_NAME },
        school: {
          name: VOLUNTEER_SCHOOL_NAME, program: VOLUNTEER_PROGRAM_NAME,
          logoUrl: profile?.logoUrl || null, address: profile?.address || null,
          contactEmail: profile?.contactEmail || null, contactPhone: profile?.contactPhone || null,
          chopDataUrl: profile?.schoolChopDataUrl || null,
        },
        volunteer: {
          name: input.recipientName, role: input.role, fromMonth: input.fromMonth, toMonth: input.toMonth,
          contributions: input.contributions || '', hoursPerWeek: input.hoursPerWeek ?? null, totalHours: input.totalHours ?? null,
        },
        signatory: { name: selected(input.signatoryUserId), title: input.signatoryTitle },
        organizationSignatory: input.organizationSignatoryUserId
          ? { name: selected(input.organizationSignatoryUserId), title: input.organizationSignatoryTitle! } : null,
      };
      const prefix: Record<VolunteerDocumentType, string> = {
        VOLUNTEER_APPRECIATION_LETTER: 'VAL', VOLUNTEER_APPRECIATION_CERTIFICATE: 'VAC', PART_TIME_VOLUNTEER_CONFIRMATION: 'PVC',
      };
      const issuedAt = new Date();
      const stamp = issuedAt.toISOString().replace(/\D/g, '').slice(0, 17);
      const document = await prisma.volunteerDocument.create({
        data: {
          documentNumber: `MRLC-${prefix[input.type]}-${stamp}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
          verifyToken: crypto.randomBytes(24).toString('hex'),
          type: input.type, recipientName: input.recipientName, role: input.role,
          fromMonth: input.fromMonth, toMonth: input.toMonth,
          payload: JSON.parse(JSON.stringify(payload)), issuedById: user.userId, issuedByName: user.email,
          issueDate: issuedAt, signatoryUserId: input.signatoryUserId,
          organizationSignatoryUserId: input.organizationSignatoryUserId || null,
        }, include: signatureInclude,
      });
      await audit(req, user, 'GENERATE', document);
      res.status(201).json(documentResponse(document));
    } catch (error) { handleError(res, error, 'issuing'); }
  });

  app.get('/api/volunteer-documents', authMiddleware, async (req, res) => {
    const user = requireStaff(req, res); if (!user) return;
    const { type, status } = req.query;
    if (type !== undefined && !isVolunteerDocumentType(type)) { res.status(400).json({ error: 'Invalid document type.' }); return; }
    if (status !== undefined && !['ACTIVE', 'CANCELLED', 'REISSUED'].includes(status as string)) { res.status(400).json({ error: 'Invalid document status.' }); return; }
    try {
      const documents = await prisma.volunteerDocument.findMany({
        where: {
          ...(type ? { type: type as VolunteerDocumentType } : {}),
          ...(status ? { status: status as 'ACTIVE' | 'CANCELLED' | 'REISSUED' } : {}),
          ...(user.role === 'ADMIN' ? {} : { OR: [{ signatoryUserId: user.userId }, { organizationSignatoryUserId: user.userId }] }),
        }, include: signatureInclude, orderBy: { createdAt: 'desc' },
      });
      res.setHeader('Cache-Control', 'private, no-store');
      res.json(documents.map(documentResponse));
    } catch (error) { handleError(res, error, 'listing'); }
  });

  app.get('/api/volunteer-documents/:id', authMiddleware, async (req, res) => {
    const user = requireStaff(req, res); if (!user) return;
    try {
      const document = await prisma.volunteerDocument.findUnique({ where: { id: req.params.id }, include: signatureInclude });
      if (!document) { res.status(404).json({ error: 'Volunteer document not found.' }); return; }
      if (!canRead(user, document)) { res.status(403).json({ error: 'You are not an assigned signatory for this document.' }); return; }
      res.setHeader('Cache-Control', 'private, no-store');
      res.json(documentResponse(document));
    } catch (error) { handleError(res, error, 'reading'); }
  });

  app.post('/api/volunteer-documents/:id/sign', authMiddleware, async (req, res) => {
    const user = requireStaff(req, res); if (!user) return;
    const { slot, consent, contentHash } = req.body || {};
    if (slot !== 'SCHOOL' && slot !== 'ORGANIZATION') { res.status(400).json({ error: 'Choose the signatory position to sign.' }); return; }
    if (consent !== true) { res.status(400).json({ error: 'Confirm that you have reviewed this document and authorize your signature.' }); return; }
    if (typeof contentHash !== 'string' || !/^[a-f0-9]{64}$/.test(contentHash)) { res.status(400).json({ error: 'Open and review the current document before signing.' }); return; }
    try {
      const imageDataUrl = await normalizeVolunteerMark(req.body?.imageDataUrl, 'signature');
      const document = await prisma.$transaction(async tx => {
        const existing = await tx.volunteerDocument.findUnique({ where: { id: req.params.id }, include: signatureInclude });
        if (!existing) throw new VolunteerSigningError('Volunteer document not found.', 404);
        const assignedId = slot === 'SCHOOL' ? existing.signatoryUserId : existing.organizationSignatoryUserId;
        if (assignedId !== user.userId) throw new VolunteerSigningError('Only the account assigned to this signatory position can sign.', 403);
        if (existing.status !== 'ACTIVE') throw new VolunteerSigningError('This document is no longer active and cannot be signed.', 409);
        const payload = existing.payload as unknown as VolunteerDocumentPayload;
        if (payload.version !== 2) throw new VolunteerSigningError('This older document does not have assigned digital signatories. Create a new document to collect signatures.', 409);
        const signer = slot === 'SCHOOL' ? payload.signatory : payload.organizationSignatory;
        if (!signer) throw new VolunteerSigningError('This document has no organization signatory.', 409);
        if (existing.signatures.some(signature => signature.slot === slot)) throw new VolunteerSigningError('This position has already been signed. Signed records cannot be replaced.', 409);
        if (volunteerContentHash(existing) !== contentHash) throw new VolunteerSigningError('The document changed after you reviewed it. Refresh and review it again before signing.', 409);
        const account = await tx.user.findUnique({ where: { id: user.userId }, select: { isActive: true, isExternalLearner: true, role: true } });
        if (!account?.isActive || account.isExternalLearner || !isVolunteerStaffRole(account.role)) throw new VolunteerSigningError('Your account is no longer authorized to sign school documents.', 403);
        // This conditional write locks the document until commit. A concurrent
        // cancellation or signature cannot pass an earlier status/version check.
        const locked = await tx.volunteerDocument.updateMany({
          where: { id: existing.id, status: 'ACTIVE', updatedAt: existing.updatedAt }, data: { updatedAt: new Date() },
        });
        if (!locked.count) throw new VolunteerSigningError('This document changed during signing. Refresh it and try again.', 409);
        await tx.volunteerDocumentSignature.create({ data: {
          documentId: existing.id, slot, signerUserId: user.userId,
          signerName: signer.name, signerTitle: signer.title, imageDataUrl, contentHash,
        } });
        return tx.volunteerDocument.findUniqueOrThrow({ where: { id: existing.id }, include: signatureInclude });
      }, { isolationLevel: 'Serializable' });
      await audit(req, user, `SIGN_${slot}`, document);
      res.setHeader('Cache-Control', 'private, no-store');
      res.json(documentResponse(document));
    } catch (error) { handleError(res, error, 'signing'); }
  });

  app.post('/api/volunteer-documents/:id/cancel', authMiddleware, async (req, res) => {
    const user = requireAdmin(req, res); if (!user) return;
    const reason = req.body?.reason;
    if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(reason)) {
      res.status(400).json({ error: 'Enter a cancellation reason of 500 characters or fewer.' }); return;
    }
    try {
      const existing = await prisma.volunteerDocument.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ error: 'Volunteer document not found.' }); return; }
      if (existing.status !== 'ACTIVE') { res.status(409).json({ error: 'This document is no longer active.' }); return; }
      const changed = await prisma.volunteerDocument.updateMany({
        where: { id: existing.id, status: 'ACTIVE' }, data: { status: 'CANCELLED', cancelledReason: reason.trim() },
      });
      if (!changed.count) { res.status(409).json({ error: 'This document is no longer active.' }); return; }
      const document = await prisma.volunteerDocument.findUniqueOrThrow({ where: { id: existing.id }, include: signatureInclude });
      await audit(req, user, 'CANCEL', document);
      res.json(documentResponse(document));
    } catch (error) { handleError(res, error, 'cancelling'); }
  });

  app.post('/api/volunteer-documents/:id/download', authMiddleware, async (req, res) => {
    const user = requireStaff(req, res); if (!user) return;
    try {
      const existing = await prisma.volunteerDocument.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ error: 'Volunteer document not found.' }); return; }
      if (!canRead(user, existing)) { res.status(403).json({ error: 'You are not an assigned signatory for this document.' }); return; }
      const document = await prisma.volunteerDocument.update({ where: { id: existing.id }, data: { downloadCount: { increment: 1 } } });
      await audit(req, user, 'DOWNLOAD', document);
      res.json({ success: true });
    } catch (error) { handleError(res, error, 'recording download of'); }
  });

  app.get('/api/verify/volunteer/:token', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (!/^[a-f0-9]{48}$/.test(req.params.token)) { res.status(404).json({ valid: false, error: 'Document not found.' }); return; }
    try {
      const document = await prisma.volunteerDocument.findUnique({ where: { verifyToken: req.params.token }, include: signatureInclude });
      if (!document) { res.status(404).json({ valid: false, error: 'Document not found.' }); return; }
      const payload = document.payload as unknown as VolunteerDocumentPayload;
      const signingStatus = volunteerSigningStatus(document);
      // Public verification intentionally excludes signature/chop images, user
      // IDs, audit details and contributions, including all newly added fields.
      res.json({
        valid: document.status === 'ACTIVE' && signingStatus !== 'PENDING', status: document.status, signingStatus,
        documentNumber: document.documentNumber, documentType: volunteerDocumentLabel(document.type),
        recipientName: document.recipientName, role: document.role,
        fromMonth: document.fromMonth, toMonth: document.toMonth, issueDate: document.issueDate,
        organization: { name: payload.organization.name },
        school: { name: payload.school.name, program: payload.school.program, logoUrl: payload.school.logoUrl,
          address: payload.school.address, contactEmail: payload.school.contactEmail, contactPhone: payload.school.contactPhone },
        hoursPerWeek: payload.volunteer.hoursPerWeek, totalHours: payload.volunteer.totalHours,
        signatures: document.signatures.map(signature => ({ slot: signature.slot,
          signerName: signature.signerName, signerTitle: signature.signerTitle, signedAt: signature.signedAt })),
      });
    } catch (error) { handleError(res, error, 'verifying'); }
  });
}
