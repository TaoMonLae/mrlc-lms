import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { registerVolunteerDocumentRoutes } from '../../volunteerDocumentRoutes';
import { currentVolunteerMonth, formatVolunteerMonth, validateVolunteerDocumentInput } from '../../shared/volunteerDocuments';

const input = {
  type: 'VOLUNTEER_APPRECIATION_CERTIFICATE', recipientName: ' A Volunteer ', role: 'English tutor',
  fromMonth: '2025-01', toMonth: '2025-06', contributions: 'Supported GED learners.',
  hoursPerWeek: 4, totalHours: 96, signatoryName: 'School Director', signatoryTitle: 'Director',
};

test('volunteer document validation requires honest service months and bounded fields', () => {
  const now = new Date('2026-10-01T00:00:00Z');
  const result = validateVolunteerDocumentInput(input, now);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.recipientName, 'A Volunteer');
  for (const bad of [
    { fromMonth: '2025-13' }, { toMonth: '2024-12' }, { toMonth: '2026-11' },
    { fromMonth: '2025-1' }, { fromMonth: '' }, { toMonth: null }, { type: '__proto__' },
    { recipientName: ' ' }, { recipientName: 'a'.repeat(161) }, { signatoryName: '' }, { recipientName: 'A\u0000B' },
    { hoursPerWeek: 169 }, { hoursPerWeek: '4' }, { totalHours: -1 }, { totalHours: Number.POSITIVE_INFINITY },
    { contributions: 'a'.repeat(1201) }, { organizationSignatoryName: 'A Director' },
  ]) assert.equal(validateVolunteerDocumentInput({ ...input, ...bad }, now).success, false, JSON.stringify(bad));
  assert.equal(validateVolunteerDocumentInput({ ...input, fromMonth: '2026-10', toMonth: '2026-10', hoursPerWeek: null, totalHours: null }, now).success, true);
  assert.equal(currentVolunteerMonth(new Date('2026-09-30T16:00:00Z')), '2026-10');
  assert.equal(formatVolunteerMonth('2025-01'), 'January 2025');
  assert.equal(formatVolunteerMonth('2025-13'), '2025-13');
  assert.equal(validateVolunteerDocumentInput({ ...input, contributions: 'x'.repeat(500) }, now).success, true);
  assert.equal(validateVolunteerDocumentInput({ ...input, contributions: 'x'.repeat(501) }, now).success, false);
  assert.equal(validateVolunteerDocumentInput({ ...input, type: 'VOLUNTEER_APPRECIATION_LETTER', contributions: 'x'.repeat(1200) }, now).success, true);
  assert.equal(validateVolunteerDocumentInput({ ...input, type: 'PART_TIME_VOLUNTEER_CONFIRMATION', contributions: 'x'.repeat(1201) }, now).success, false);
  const normalized = validateVolunteerDocumentInput({ ...input, recipientName: ' A\n\t Volunteer ', organizationSignatoryName: ' MRO\n Director ', organizationSignatoryTitle: ' School\t Director ' }, now);
  assert.equal(normalized.success, true);
  if (normalized.success) {
    assert.equal(normalized.data.recipientName, 'A Volunteer');
    assert.equal(normalized.data.organizationSignatoryName, 'MRO Director');
    assert.equal(normalized.data.organizationSignatoryTitle, 'School Director');
  }
});

test('only admins issue external volunteer documents; public verification exposes a snapshot and honours revocation', async () => {
  const documents = new Map<string, any>();
  const audits: any[] = [];
  let auditUnavailable = false;
  let school = { name: 'Editable school name', logoUrl: '/school-logo.png', address: 'School address', contactEmail: 'school@example.test', contactPhone: '12345' };
  const find = (where: any) => where.verifyToken
    ? [...documents.values()].find(document => document.verifyToken === where.verifyToken) || null
    : documents.get(where.id) || null;
  const prisma: any = {
    schoolProfile: { findFirst: async () => school },
    volunteerDocument: {
      create: async ({ data }: any) => {
        const document = { id: `document-${documents.size + 1}`, status: 'ACTIVE', cancelledReason: null, downloadCount: 0, createdAt: new Date(), updatedAt: new Date(), ...data };
        documents.set(document.id, document); return document;
      },
      findUnique: async ({ where }: any) => find(where),
      findUniqueOrThrow: async ({ where }: any) => { const record = find(where); assert.ok(record); return record; },
      findMany: async ({ where }: any) => [...documents.values()].filter(record => (!where.type || where.type === record.type) && (!where.status || where.status === record.status)),
      update: async ({ where, data }: any) => {
        const record = find(where); assert.ok(record);
        Object.assign(record, { ...data, ...(data.downloadCount ? { downloadCount: record.downloadCount + data.downloadCount.increment } : {}) }); return record;
      },
      updateMany: async ({ where, data }: any) => {
        const record = find(where);
        if (!record || record.status !== where.status) return { count: 0 };
        Object.assign(record, data); return { count: 1 };
      },
    },
  };
  const app = express();
  registerVolunteerDocumentRoutes(app, {
    prisma, APP_URL: 'https://ged.example.test/', authMiddleware: async (_req, _res, next) => { next(); },
    createAuditLog: async (...args: any[]) => { if (auditUnavailable) throw new Error('Audit unavailable'); audits.push(args); }, logger: { error: () => {} } as any,
  });
  async function send(path: string, method: string, role: string | null, body?: any, params: any = {}, query: any = {}) {
    const route = (app as any)._router.stack.find((layer: any) => layer.route?.path === path && layer.route.methods[method.toLowerCase()])?.route;
    assert.ok(route, `${method} ${path}`);
    const req: any = { body, params, query, headers: {}, ip: '127.0.0.1', ...(role ? { user: { role, userId: 'admin-id', email: 'private-admin@example.test' } } : {}) };
    const res: any = { statusCode: 200, data: undefined, headers: {}, status(code: number) { this.statusCode = code; return this; }, json(data: any) { this.data = data; return this; }, setHeader(name: string, value: string) { this.headers[name] = value; } };
    for (const layer of route.stack) {
      if (res.data !== undefined) break;
      await layer.handle(req, res, (error?: Error) => { if (error) throw error; });
    }
    return res;
  }
  for (const role of [null, 'TEACHER', 'STUDENT', 'STAFF']) {
    assert.equal((await send('/api/volunteer-documents', 'POST', role, input)).statusCode, 403);
    assert.equal((await send('/api/volunteer-documents', 'GET', role)).statusCode, 403);
  }
  assert.equal(documents.size, 0);
  assert.equal((await send('/api/volunteer-documents', 'POST', 'ADMIN', { ...input, fromMonth: '2026-01' })).statusCode, 400);
  const issued = await send('/api/volunteer-documents', 'POST', 'ADMIN', input);
  assert.equal(issued.statusCode, 201);
  const document = issued.data;
  assert.match(document.verifyToken, /^[a-f0-9]{48}$/);
  assert.equal(document.verifyUrl, `https://ged.example.test/verify/volunteer/${document.verifyToken}`);
  assert.equal(document.recipientName, 'A Volunteer');
  assert.equal(document.payload.organization.name, 'Mon Refugee Organization');
  assert.equal(document.payload.school.name, 'Mon Refugee Learning Centre');
  assert.equal(document.payload.school.program, 'GED Program');
  assert.equal((await send('/api/volunteer-documents/:id', 'GET', 'TEACHER', undefined, { id: document.id })).statusCode, 403);
  assert.equal((await send('/api/volunteer-documents/:id/cancel', 'POST', 'STUDENT', { reason: 'Not allowed' }, { id: document.id })).statusCode, 403);
  school = { ...school, contactEmail: 'changed@example.test' };
  const verification = await send('/api/verify/volunteer/:token', 'GET', null, undefined, { token: document.verifyToken });
  assert.equal(verification.data.valid, true);
  assert.equal(verification.data.school.contactEmail, 'school@example.test', 'Verification uses the issued snapshot');
  assert.equal(verification.headers['Cache-Control'], 'no-store');
  for (const key of ['payload', 'issuedByName', 'issuedById', 'cancelledReason', 'contributions', 'downloadCount']) assert.equal(key in verification.data, false, key);
  const serialized = JSON.stringify(verification.data);
  assert.ok(!serialized.includes('private-admin@example.test'));
  assert.ok(!serialized.includes('Supported GED learners.'));
  assert.equal((await send('/api/verify/volunteer/:token', 'GET', null, undefined, { token: 'bad' })).statusCode, 404);
  assert.equal((await send('/api/verify/volunteer/:token', 'GET', null, undefined, { token: 'a'.repeat(48) })).statusCode, 404);
  assert.equal((await send('/api/volunteer-documents', 'GET', 'ADMIN', undefined, {}, { status: 'INVALID' })).statusCode, 400);
  assert.equal((await send('/api/volunteer-documents/:id/cancel', 'POST', 'ADMIN', { reason: ' ' }, { id: document.id })).statusCode, 400);
  const cancelled = await send('/api/volunteer-documents/:id/cancel', 'POST', 'ADMIN', { reason: 'Correction needed' }, { id: document.id });
  assert.equal(cancelled.statusCode, 200);
  const revoked = await send('/api/verify/volunteer/:token', 'GET', null, undefined, { token: document.verifyToken });
  assert.equal(revoked.data.valid, false);
  assert.equal(revoked.data.status, 'CANCELLED');
  assert.ok(!JSON.stringify(revoked.data).includes('Correction needed'));
  assert.equal((await send('/api/volunteer-documents/:id/cancel', 'POST', 'ADMIN', { reason: 'Second attempt' }, { id: document.id })).statusCode, 409);
  assert.equal(documents.size, 1, 'Revoked documents remain verifiable');
  assert.equal(audits.length, 2);
  auditUnavailable = true;
  const another = await send('/api/volunteer-documents', 'POST', 'ADMIN', { ...input, recipientName: 'Another Volunteer' });
  assert.equal(another.statusCode, 201, 'A committed document still returns success when the audit write fails');
  assert.notEqual(another.data.verifyToken, document.verifyToken);
  assert.notEqual(another.data.documentNumber, document.documentNumber);
});
