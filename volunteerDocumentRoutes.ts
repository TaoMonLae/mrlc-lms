import type { Express, Request, Response } from 'express';
import type { PrismaClient, VolunteerDocument } from '@prisma/client';
import crypto from 'node:crypto';
import type { JwtPayload, authMiddleware, createAuditLog, logger } from './server';
import {
  isVolunteerDocumentType,
  validateVolunteerDocumentInput,
  volunteerDocumentLabel,
  VOLUNTEER_ORGANIZATION_NAME,
  VOLUNTEER_SCHOOL_NAME,
  VOLUNTEER_PROGRAM_NAME,
  type VolunteerDocumentPayload,
  type VolunteerDocumentType,
} from './shared/volunteerDocuments';

export interface VolunteerDocumentRoutesContext {
  prisma: PrismaClient;
  authMiddleware: typeof authMiddleware;
  createAuditLog: typeof createAuditLog;
  logger: typeof logger;
  APP_URL: string;
}

export function registerVolunteerDocumentRoutes(app: Express, ctx: VolunteerDocumentRoutesContext) {
  const { prisma, authMiddleware, createAuditLog, logger, APP_URL } = ctx;
  const requireAdmin = (req: Request, res: Response): JwtPayload | null => {
    const user = (req as any).user as JwtPayload | undefined;
    if (!user || user.role !== 'ADMIN') { res.status(403).json({ error: 'Only administrators can manage volunteer documents.' }); return null; }
    return user;
  };
  const documentResponse = (document: VolunteerDocument) => ({
    ...document,
    verifyUrl: `${APP_URL.replace(/\/$/, '')}/verify/volunteer/${encodeURIComponent(document.verifyToken)}`,
  });
  const audit = async (req: Request, user: JwtPayload, action: string, document: VolunteerDocument) => {
    try {
      await createAuditLog(user.userId, user.email, action, 'VOLUNTEER_DOCUMENT', document.id,
        `${volunteerDocumentLabel(document.type)} ${document.documentNumber}: ${action.toLowerCase()}.`,
        req.ip, req.headers['user-agent'] || null, action === 'CANCEL' ? 'WARNING' : 'SUCCESS');
    } catch (error) {
      // The document mutation has committed. Report its success so a retry cannot
      // issue a second certificate just because the separate audit write failed.
      logger.error(`Unable to audit volunteer document ${document.id} (${action}):`, error);
    }
  };
  const handleError = (res: Response, error: unknown, action: string) => {
    logger.error(`Error ${action} volunteer document:`, error);
    const code = (error as { code?: string } | null)?.code;
    if (code === 'P2021' || code === 'P2022') {
      res.status(503).json({ error: 'Volunteer documents are unavailable until the database migration is applied.' });
    } else if (code === 'P2002') {
      res.status(409).json({ error: 'A document was created at the same time. Please try again.' });
    } else {
      res.status(500).json({ error: 'Unable to complete the volunteer document request.' });
    }
  };

  app.post('/api/volunteer-documents', authMiddleware, async (req, res) => {
    const user = requireAdmin(req, res); if (!user) return;
    const validated = validateVolunteerDocumentInput(req.body);
    if (validated.success === false) { res.status(400).json({ error: validated.error }); return; }
    const input = validated.data;
    try {
      const profile = await prisma.schoolProfile.findFirst();
      const payload: VolunteerDocumentPayload = {
        version: 1,
        organization: { name: VOLUNTEER_ORGANIZATION_NAME },
        school: {
          name: VOLUNTEER_SCHOOL_NAME, program: VOLUNTEER_PROGRAM_NAME,
          logoUrl: profile?.logoUrl || null, address: profile?.address || null,
          contactEmail: profile?.contactEmail || null, contactPhone: profile?.contactPhone || null,
        },
        volunteer: {
          name: input.recipientName, role: input.role, fromMonth: input.fromMonth, toMonth: input.toMonth,
          contributions: input.contributions || '', hoursPerWeek: input.hoursPerWeek ?? null, totalHours: input.totalHours ?? null,
        },
        signatory: { name: input.signatoryName, title: input.signatoryTitle },
        organizationSignatory: input.organizationSignatoryName
          ? { name: input.organizationSignatoryName, title: input.organizationSignatoryTitle! } : null,
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
          issueDate: issuedAt,
        },
      });
      await audit(req, user, 'GENERATE', document);
      res.status(201).json(documentResponse(document));
    } catch (error) { handleError(res, error, 'issuing'); }
  });

  app.get('/api/volunteer-documents', authMiddleware, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { type, status } = req.query;
    if (type !== undefined && !isVolunteerDocumentType(type)) { res.status(400).json({ error: 'Invalid document type.' }); return; }
    if (status !== undefined && !['ACTIVE', 'CANCELLED', 'REISSUED'].includes(status as string)) { res.status(400).json({ error: 'Invalid document status.' }); return; }
    try {
      const documents = await prisma.volunteerDocument.findMany({
        where: { ...(type ? { type: type as VolunteerDocumentType } : {}), ...(status ? { status: status as 'ACTIVE' | 'CANCELLED' | 'REISSUED' } : {}) },
        orderBy: { createdAt: 'desc' },
      });
      res.setHeader('Cache-Control', 'private, no-store');
      res.json(documents.map(documentResponse));
    } catch (error) { handleError(res, error, 'listing'); }
  });

  app.get('/api/volunteer-documents/:id', authMiddleware, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const document = await prisma.volunteerDocument.findUnique({ where: { id: req.params.id } });
      if (!document) { res.status(404).json({ error: 'Volunteer document not found.' }); return; }
      res.setHeader('Cache-Control', 'private, no-store');
      res.json(documentResponse(document));
    } catch (error) { handleError(res, error, 'reading'); }
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
      // Keep the record and token so previously downloaded certificates show their revoked status.
      const changed = await prisma.volunteerDocument.updateMany({
        where: { id: existing.id, status: 'ACTIVE' }, data: { status: 'CANCELLED', cancelledReason: reason.trim() },
      });
      if (!changed.count) { res.status(409).json({ error: 'This document is no longer active.' }); return; }
      const document = await prisma.volunteerDocument.findUniqueOrThrow({ where: { id: existing.id } });
      await audit(req, user, 'CANCEL', document);
      res.json(documentResponse(document));
    } catch (error) { handleError(res, error, 'cancelling'); }
  });

  app.post('/api/volunteer-documents/:id/download', authMiddleware, async (req, res) => {
    const user = requireAdmin(req, res); if (!user) return;
    try {
      const existing = await prisma.volunteerDocument.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ error: 'Volunteer document not found.' }); return; }
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
      const document = await prisma.volunteerDocument.findUnique({ where: { verifyToken: req.params.token } });
      if (!document) { res.status(404).json({ valid: false, error: 'Document not found.' }); return; }
      const payload = document.payload as unknown as VolunteerDocumentPayload;
      // Public data is a deliberate allowlist. Do not expose audit names, cancellation reasons,
      // contributions, download counts, or the entire private snapshot.
      res.json({
        valid: document.status === 'ACTIVE', status: document.status,
        documentNumber: document.documentNumber, documentType: volunteerDocumentLabel(document.type),
        recipientName: document.recipientName, role: document.role,
        fromMonth: document.fromMonth, toMonth: document.toMonth, issueDate: document.issueDate,
        organization: payload.organization, school: payload.school,
        hoursPerWeek: payload.volunteer.hoursPerWeek, totalHours: payload.volunteer.totalHours,
      });
    } catch (error) { handleError(res, error, 'verifying'); }
  });
}
