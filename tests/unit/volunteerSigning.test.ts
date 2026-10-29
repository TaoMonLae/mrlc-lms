import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import sharp from 'sharp';
import { registerVolunteerDocumentRoutes } from '../../volunteerDocumentRoutes';
import { normalizeVolunteerMark, volunteerContentHash, volunteerSigningStatus } from '../../shared/volunteerSigning';

const input = {
  type: 'VOLUNTEER_APPRECIATION_CERTIFICATE', recipientName: ' A Volunteer ', role: 'English tutor',
  fromMonth: '2025-01', toMonth: '2025-06', contributions: 'Supported GED learners.',
  hoursPerWeek: 4, totalHours: 96, signatoryName: 'A client-controlled name', signatoryTitle: 'Director',
  signatoryUserId: 'teacher-id',
};

async function markImage(format: 'png' | 'jpeg' | 'webp' = 'png') {
  const width = 240; const height = 90;
  const pixels = Buffer.alloc(width * height * 4, 255);
  for (let x = 20; x < 220; x += 1) {
    const y = Math.round(45 + Math.sin(x / 9) * 20);
    for (let offset = -2; offset <= 2; offset += 1) {
      const at = ((y + offset) * width + x) * 4;
      pixels[at] = 12; pixels[at + 1] = 35; pixels[at + 2] = 64;
    }
  }
  const image = await sharp(pixels, { raw: { width, height, channels: 4 } }).toFormat(format).toBuffer();
  return `data:image/${format};base64,${image.toString('base64')}`;
}

test('signature and chop raster validation normalizes images and rejects unsafe or empty marks', async () => {
  for (const format of ['png', 'jpeg', 'webp'] as const) {
    const normalized = await normalizeVolunteerMark(await markImage(format), 'signature');
    assert.match(normalized, /^data:image\/png;base64,/);
    const meta = await sharp(Buffer.from(normalized.split(',')[1], 'base64')).metadata();
    assert.ok(meta.width! <= 1200 && meta.height! <= 400);
    assert.equal(meta.hasAlpha, true);
  }
  for (const invalid of [null, '', 'https://example.test/signature.png', 'data:image/svg+xml;base64,PHN2Zz4=',
    'data:image/png;base64,%%%=', 'data:image/png;base64,dGV4dA==', `data:image/png;base64,${'A'.repeat(2_800_000)}`]) {
    await assert.rejects(normalizeVolunteerMark(invalid, 'signature'));
  }
  const blank = await sharp({ create: { width: 200, height: 80, channels: 4, background: '#ffffff' } }).png().toBuffer();
  await assert.rejects(normalizeVolunteerMark(`data:image/png;base64,${blank.toString('base64')}`, 'signature'), /blank/);
  const solid = await sharp({ create: { width: 200, height: 80, channels: 4, background: '#000000' } }).png().toBuffer();
  await assert.rejects(normalizeVolunteerMark(`data:image/png;base64,${solid.toString('base64')}`, 'chop'), /blank/);
  const png = await markImage('png');
  await assert.rejects(normalizeVolunteerMark(png.replace('image/png', 'image/jpeg'), 'signature'), /could not be read/);
});

function setup() {
  const documents = new Map<string, any>();
  const signatures: any[] = [];
  const audits: any[] = [];
  const users = new Map<string, any>([
    ['admin-id', { id: 'admin-id', firstName: 'School', lastName: 'Admin', role: 'ADMIN', isActive: true, isExternalLearner: false }],
    ['teacher-id', { id: 'teacher-id', firstName: 'School', lastName: 'Director', role: 'TEACHER', isActive: true, isExternalLearner: false }],
    ['staff-id', { id: 'staff-id', firstName: 'MRO', lastName: 'Director', role: 'STAFF', isActive: true, isExternalLearner: false }],
    ['student-id', { id: 'student-id', firstName: 'A', lastName: 'Student', role: 'STUDENT', isActive: true, isExternalLearner: false }],
    ['disabled-id', { id: 'disabled-id', firstName: 'Disabled', lastName: 'Teacher', role: 'TEACHER', isActive: false, isExternalLearner: false }],
    ['external-id', { id: 'external-id', firstName: 'External', lastName: 'Account', role: 'STAFF', isActive: true, isExternalLearner: true }],
  ]);
  let school: any = { id: 'school-id', name: 'School', logoUrl: '/school-logo.png', address: 'School address', contactEmail: 'school@example.test', contactPhone: '12345', schoolChopDataUrl: null };
  let auditUnavailable = false;
  let lockFailure = false;
  const find = (where: any) => {
    const stored = where.verifyToken ? [...documents.values()].find(document => document.verifyToken === where.verifyToken) : documents.get(where.id);
    return stored ? { ...stored, signatures: signatures.filter(signature => signature.documentId === stored.id) } : null;
  };
  const matches = (document: any, where: any) => (!where.status || document.status === where.status)
    && (!where.type || document.type === where.type)
    && (!where.OR || where.OR.some((clause: any) => Object.entries(clause).every(([key, value]) => document[key] === value)));
  const prisma: any = {
    schoolProfile: {
      findFirst: async () => school,
      update: async ({ data }: any) => { school = { ...school, ...data }; return school; },
      create: async ({ data }: any) => { school = { id: 'school-id', ...data }; return school; },
    },
    user: {
      findUnique: async ({ where }: any) => users.get(where.id) || null,
      findMany: async ({ where }: any) => [...users.values()].filter(user => (!where.id || where.id.in.includes(user.id))
        && user.isActive === where.isActive && user.isExternalLearner === where.isExternalLearner && where.role.in.includes(user.role)),
    },
    volunteerDocument: {
      create: async ({ data }: any) => {
        const document = { id: `document-${documents.size + 1}`, status: 'ACTIVE', cancelledReason: null, downloadCount: 0, createdAt: new Date(), updatedAt: new Date(), ...data };
        documents.set(document.id, document); return find({ id: document.id });
      },
      findUnique: async ({ where }: any) => find(where),
      findUniqueOrThrow: async ({ where }: any) => { const record = find(where); assert.ok(record); return record; },
      findMany: async ({ where }: any) => [...documents.values()].filter(record => matches(record, where)).map(record => find({ id: record.id })),
      update: async ({ where, data }: any) => {
        const record = documents.get(where.id); assert.ok(record);
        Object.assign(record, { ...data, ...(data.downloadCount ? { downloadCount: record.downloadCount + data.downloadCount.increment } : {}) }); return find(where);
      },
      updateMany: async ({ where, data }: any) => {
        const record = documents.get(where.id);
        if (lockFailure || !record || record.status !== where.status
          || (where.updatedAt && record.updatedAt.valueOf() !== where.updatedAt.valueOf())) return { count: 0 };
        Object.assign(record, data); return { count: 1 };
      },
    },
    volunteerDocumentSignature: {
      create: async ({ data }: any) => {
        if (signatures.some(signature => signature.documentId === data.documentId && signature.slot === data.slot)) throw Object.assign(new Error('Unique'), { code: 'P2002' });
        const signature = { id: `signature-${signatures.length + 1}`, signedAt: new Date(), ...data };
        signatures.push(signature); return signature;
      },
    },
  };
  prisma.$transaction = async (callback: any) => callback(prisma);
  const app = express();
  registerVolunteerDocumentRoutes(app, {
    prisma, APP_URL: 'https://ged.example.test/', authMiddleware: async (_req, _res, next) => { next(); },
    createAuditLog: async (...args: any[]) => { if (auditUnavailable) throw new Error('Audit unavailable'); audits.push(args); }, logger: { error: () => {} } as any,
  });
  async function send(path: string, method: string, userId: string | null, body?: any, params: any = {}, query: any = {}) {
    const route = (app as any)._router.stack.find((layer: any) => layer.route?.path === path && layer.route.methods[method.toLowerCase()])?.route;
    assert.ok(route, `${method} ${path}`);
    const user = userId ? users.get(userId) : null;
    const req: any = { body, params, query, headers: {}, ip: '127.0.0.1', ...(user ? { user: { role: user.role, userId, email: 'private-account@example.test', externalLearner: user.isExternalLearner } } : {}) };
    const res: any = { statusCode: 200, data: undefined, headers: {}, status(code: number) { this.statusCode = code; return this; }, json(data: any) { this.data = data; return this; }, setHeader(name: string, value: string) { this.headers[name] = value; } };
    for (const layer of route.stack) {
      if (res.data !== undefined) break;
      await layer.handle(req, res, (error?: Error) => { if (error) throw error; });
    }
    return res;
  }
  return { send, documents, signatures, users, audits, getSchool: () => school, failAudit: () => { auditUnavailable = true; }, failLock: () => { lockFailure = true; } };
}

test('admins assign actual staff identities; chop snapshots and option access stay private', async () => {
  const { send, getSchool } = setup();
  for (const user of [null, 'student-id', 'teacher-id', 'external-id']) {
    assert.equal((await send('/api/volunteer-documents/options', 'GET', user)).statusCode, 403);
    assert.equal((await send('/api/volunteer-documents/chop', 'POST', user, { imageDataUrl: null })).statusCode, 403);
    assert.equal((await send('/api/volunteer-documents', 'POST', user, input)).statusCode, 403);
  }
  const options = await send('/api/volunteer-documents/options', 'GET', 'admin-id');
  assert.deepEqual(options.data.signatories.map((person: any) => person.id), ['admin-id', 'teacher-id', 'staff-id']);
  assert.equal(options.headers['Cache-Control'], 'private, no-store');
  assert.equal((await send('/api/volunteer-documents', 'POST', 'admin-id', { ...input, signatoryUserId: undefined })).statusCode, 400);
  for (const signatoryUserId of ['student-id', 'disabled-id', 'external-id', 'unknown']) {
    assert.equal((await send('/api/volunteer-documents', 'POST', 'admin-id', { ...input, signatoryUserId })).statusCode, 400);
  }
  assert.equal((await send('/api/volunteer-documents/chop', 'POST', 'admin-id', { imageDataUrl: 'https://example.test/chop.png' })).statusCode, 400);
  const uploaded = await send('/api/volunteer-documents/chop', 'POST', 'admin-id', { imageDataUrl: await markImage() });
  assert.equal(uploaded.statusCode, 200);
  assert.match(getSchool().schoolChopDataUrl, /^data:image\/png;base64,/);
  const issued = await send('/api/volunteer-documents', 'POST', 'admin-id', input);
  assert.equal(issued.statusCode, 201);
  const document = issued.data;
  assert.equal(document.payload.version, 2);
  assert.equal(document.payload.signatory.name, 'School Director', 'The account name wins over client-provided names');
  assert.equal(document.payload.school.chopDataUrl, uploaded.data.schoolChopDataUrl);
  await send('/api/volunteer-documents/chop', 'POST', 'admin-id', { imageDataUrl: null });
  assert.equal(getSchool().schoolChopDataUrl, null);
  assert.equal(document.payload.school.chopDataUrl, uploaded.data.schoolChopDataUrl, 'Issued chop remains frozen');
  assert.equal(document.signingStatus, 'PENDING');
  assert.match(document.contentHash, /^[a-f0-9]{64}$/);
  assert.equal((await send('/api/volunteer-documents', 'GET', 'teacher-id')).data.length, 1);
  assert.equal((await send('/api/volunteer-documents', 'GET', 'staff-id')).data.length, 0);
  assert.equal((await send('/api/volunteer-documents/:id', 'GET', 'staff-id', undefined, { id: document.id })).statusCode, 403);
  assert.equal((await send('/api/volunteer-documents/:id/download', 'POST', 'staff-id', {}, { id: document.id })).statusCode, 403);
  const verified = await send('/api/verify/volunteer/:token', 'GET', null, undefined, { token: document.verifyToken });
  assert.equal(verified.data.valid, false);
  assert.equal(verified.data.signingStatus, 'PENDING');
  const publicJson = JSON.stringify(verified.data);
  for (const privateText of ['chopDataUrl', 'imageDataUrl', 'contentHash', 'signatoryUserId', 'private-account', 'Supported GED learners.']) assert.ok(!publicJson.includes(privateText), privateText);
});

test('only assigned active accounts can sign reviewed content; all requested signatures are required', async () => {
  const { send, signatures, users, audits } = setup();
  const created = await send('/api/volunteer-documents', 'POST', 'admin-id', {
    ...input, organizationSignatoryUserId: 'staff-id', organizationSignatoryName: 'Not trusted', organizationSignatoryTitle: 'President',
  });
  const document = created.data;
  const body = { slot: 'SCHOOL', imageDataUrl: await markImage(), consent: true, contentHash: document.contentHash };
  const sign = (user: string | null, patch = {}) => send('/api/volunteer-documents/:id/sign', 'POST', user, { ...body, ...patch }, { id: document.id });
  assert.equal((await sign('admin-id')).statusCode, 403, 'Admins cannot sign as someone else');
  assert.equal((await sign('student-id')).statusCode, 403);
  assert.equal((await sign('teacher-id', { consent: false })).statusCode, 400);
  assert.equal((await sign('teacher-id', { slot: 'OTHER' })).statusCode, 400);
  assert.equal((await sign('teacher-id', { contentHash: '0'.repeat(64) })).statusCode, 409);
  assert.equal((await sign('teacher-id', { imageDataUrl: 'invalid' })).statusCode, 400);
  users.get('teacher-id').isActive = false;
  assert.equal((await sign('teacher-id')).statusCode, 403);
  users.get('teacher-id').isActive = true;
  const schoolSigned = await sign('teacher-id');
  assert.equal(schoolSigned.statusCode, 200);
  assert.equal(schoolSigned.data.signingStatus, 'PENDING');
  assert.equal(signatures.length, 1);
  assert.equal(signatures[0].signerUserId, 'teacher-id');
  assert.equal(signatures[0].signerName, 'School Director');
  assert.ok(signatures[0].signedAt instanceof Date);
  assert.equal((await sign('teacher-id')).statusCode, 409);
  assert.equal((await sign('teacher-id', { slot: 'ORGANIZATION' })).statusCode, 403);
  const orgSigned = await sign('staff-id', { slot: 'ORGANIZATION' });
  assert.equal(orgSigned.statusCode, 200);
  assert.equal(orgSigned.data.signingStatus, 'SIGNED');
  assert.equal(signatures.length, 2);
  assert.equal(audits.filter(audit => audit[2].startsWith('SIGN_')).length, 2);
  const verified = await send('/api/verify/volunteer/:token', 'GET', null, undefined, { token: document.verifyToken });
  assert.equal(verified.data.valid, true);
  assert.equal(verified.data.signatures.length, 2);
  for (const entry of verified.data.signatures) assert.deepEqual(Object.keys(entry).sort(), ['signedAt', 'signerName', 'signerTitle', 'slot']);
  assert.equal((await send('/api/volunteer-documents/:id/cancel', 'POST', 'teacher-id', { reason: 'No' }, { id: document.id })).statusCode, 403);
  const cancelled = await send('/api/volunteer-documents/:id/cancel', 'POST', 'admin-id', { reason: 'Service dates need correcting' }, { id: document.id });
  assert.equal(cancelled.statusCode, 200);
  const revoked = await send('/api/verify/volunteer/:token', 'GET', null, undefined, { token: document.verifyToken });
  assert.equal(revoked.data.valid, false);
  assert.equal(revoked.data.status, 'CANCELLED');
  assert.equal(revoked.data.signatures.length, 2, 'Revocation retains signing evidence');
  assert.equal((await sign('teacher-id')).statusCode, 409);
});

test('legacy documents remain verifiable and cancellation/transaction conflicts never create signatures', async () => {
  const { send, documents, signatures, failLock, failAudit } = setup();
  const created = await send('/api/volunteer-documents', 'POST', 'admin-id', input);
  const record = documents.get(created.data.id);
  const signBody = { slot: 'SCHOOL', imageDataUrl: await markImage(), consent: true, contentHash: created.data.contentHash };
  record.payload = { ...record.payload, version: 1 };
  record.signatoryUserId = null;
  assert.equal(volunteerSigningStatus({ ...record, signatures: [] }), 'NOT_REQUESTED');
  const legacy = await send('/api/verify/volunteer/:token', 'GET', null, undefined, { token: record.verifyToken });
  assert.equal(legacy.data.valid, true);
  assert.equal(legacy.data.signingStatus, 'NOT_REQUESTED');
  assert.equal((await send('/api/verify/volunteer/:token', 'GET', null, undefined, { token: 'bad' })).statusCode, 404);
  assert.equal((await send('/api/verify/volunteer/:token', 'GET', null, undefined, { token: 'a'.repeat(48) })).statusCode, 404);
  record.payload.version = 2; record.signatoryUserId = 'teacher-id';
  failLock();
  const conflict = await send('/api/volunteer-documents/:id/sign', 'POST', 'teacher-id', signBody, { id: record.id });
  assert.equal(conflict.statusCode, 409);
  assert.equal(signatures.length, 0);
  failAudit();
  assert.equal((await send('/api/volunteer-documents', 'POST', 'admin-id', input)).statusCode, 201, 'Committed creation succeeds even if the separate audit write fails');
});

test('content fingerprints ignore JSON key order but detect changes to dates, signers or printed content', async () => {
  const { send, documents } = setup();
  const issued = await send('/api/volunteer-documents', 'POST', 'admin-id', input);
  const document = documents.get(issued.data.id);
  const original = volunteerContentHash(document);
  const reversed = Object.fromEntries(Object.entries(document.payload).reverse());
  assert.equal(volunteerContentHash({ ...document, payload: reversed }), original);
  assert.equal(volunteerContentHash({ ...document, downloadCount: 30, status: 'CANCELLED' }), original);
  for (const changed of [{ toMonth: '2025-07' }, { signatoryUserId: 'staff-id' }, { payload: { ...document.payload, signatory: { name: 'Changed', title: 'Director' } } }]) {
    assert.notEqual(volunteerContentHash({ ...document, ...changed }), original);
  }
  assert.equal(volunteerSigningStatus({ ...document, signatures: [{ slot: 'SCHOOL', signerUserId: 'teacher-id', contentHash: original }] }), 'SIGNED');
  assert.equal(volunteerSigningStatus({ ...document, toMonth: '2025-07', signatures: [{ slot: 'SCHOOL', signerUserId: 'teacher-id', contentHash: original }] }), 'PENDING');
  assert.equal(volunteerSigningStatus({ ...document, signatures: [{ slot: 'SCHOOL', signerUserId: 'teacher-id', contentHash: '0'.repeat(64) }] }), 'PENDING');
  assert.equal(volunteerSigningStatus({ ...document, payload: { ...document.payload, version: 1 }, signatures: [{ slot: 'SCHOOL', signerUserId: 'teacher-id', contentHash: original }] }), 'PENDING', 'A downgraded payload must not inherit the legacy exemption');
  assert.equal(volunteerSigningStatus({ ...document, payload: { ...document.payload, version: 999 } }), 'PENDING', 'Unknown versions never verify');
  assert.equal(volunteerSigningStatus({ ...document, signatoryUserId: null, organizationSignatoryUserId: null, payload: { ...document.payload, version: 1 }, signatures: [{ slot: 'SCHOOL', signerUserId: 'teacher-id', contentHash: original }] }), 'PENDING', 'Removing assignment IDs must not hide existing signing evidence');
});
