import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { VolunteerDocumentSheetProps } from '../../src/pages/documents/VolunteerDocumentSheet';
import type { VolunteerDocumentPayload, VolunteerDocumentSignature, VolunteerDocumentType } from '../../shared/volunteerDocuments';

// Node cannot import the sheet's CSS. Bundle the actual component with only
// that stylesheet omitted; React stays external so this uses the real server renderer.
const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const bundle = buildSync({
  absWorkingDir: projectRoot,
  entryPoints: ['src/pages/documents/VolunteerDocumentSheet.tsx'],
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  loader: { '.css': 'empty' },
});
const module = { exports: {} as { default: ComponentType<VolunteerDocumentSheetProps> } };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const VolunteerDocumentSheet = module.exports.default;

const TYPES: VolunteerDocumentType[] = [
  'VOLUNTEER_APPRECIATION_CERTIFICATE', 'VOLUNTEER_APPRECIATION_LETTER', 'PART_TIME_VOLUNTEER_CONFIRMATION',
];
const chop = 'data:image/png;base64,c2Nob29sLWNob3AtZml4dHVyZQ==';
const signatureImage = 'data:image/png;base64,c2lnbmF0dXJlLWZpeHR1cmU=';
const payload: VolunteerDocumentPayload = {
  version: 2,
  organization: { name: 'Mon Refugee Organization' },
  school: {
    name: 'Mon Refugee Learning Centre', program: 'GED Program',
    logoUrl: null, address: null, contactEmail: null, contactPhone: null, chopDataUrl: chop,
  },
  volunteer: {
    name: 'Volunteer One', role: 'English Tutor', fromMonth: '2025-01', toMonth: '2025-06',
    contributions: 'Supported GED learners.', hoursPerWeek: 4, totalHours: 96,
  },
  signatory: { name: 'School Director', title: 'Director' },
  organizationSignatory: null,
};
const schoolSignature: VolunteerDocumentSignature = {
  id: 'school-signature', slot: 'SCHOOL', signerUserId: 'staff-one',
  signerName: 'Authorized School Signer', signerTitle: 'Programme Director',
  imageDataUrl: signatureImage, signedAt: '2026-10-30T01:30:00.000Z', contentHash: 'test-hash',
};

function render(type: VolunteerDocumentType, overrides: Partial<VolunteerDocumentSheetProps> = {}) {
  return renderToStaticMarkup(createElement(VolunteerDocumentSheet, {
    type, payload, documentNumber: 'MRLC-TEST-001', issueDate: '2026-10-29T16:30:00.000Z',
    status: 'ACTIVE', ...overrides,
  }));
}

function assertNoChop(html: string) {
  assert.ok(!html.includes(chop), 'Historical chop image must not be rendered');
  assert.ok(!html.includes('data-volunteer-seal'));
  assert.ok(!html.includes('volunteer-school-chop'));
  assert.ok(!html.includes('volunteer-chop-placeholder'));
  assert.ok(!html.includes('School chop'));
}

for (const type of TYPES) {
  test(`${type} prints the authenticated signature without the historical chop and retains Malaysian dates`, () => {
    const html = render(type, { signatures: [schoolSignature], signingStatus: 'SIGNED' });
    assert.match(html, /<img[^>]*data-volunteer-signature/);
    assert.ok(html.includes(signatureImage));
    assertNoChop(html);
    assert.ok(html.includes('Authorized School Signer'));
    assert.ok(html.includes('Programme Director'));
    assert.ok(html.includes('Digitally signed'));
    assert.ok(html.includes('30 October 2026, 09:30 MYT'));
    assert.ok(html.includes('Issued: 30 October 2026'));
    assert.ok(html.includes('January 2025'));
    assert.ok(html.includes('June 2025'));
    assert.ok(!html.includes('volunteer-pending-watermark'));
    assert.ok(!html.includes('Awaiting signatures · not yet valid'));
  });

  test(`${type} with pending signatures cannot appear digitally signed and has no chop`, () => {
    const html = render(type, { signatures: [], signingStatus: 'PENDING' });
    assert.ok(html.includes('volunteer-pending-watermark'));
    assert.ok(html.includes('Awaiting signatures · not yet valid'));
    assert.ok(html.includes('Awaiting authorized signature'));
    assert.ok(!html.includes('data-volunteer-signature'));
    assertNoChop(html);
    assert.ok(!html.includes('Digitally signed'));
  });
}

test('a two-signatory document remains visibly pending after only the school signer signs', () => {
  const html = render('VOLUNTEER_APPRECIATION_CERTIFICATE', {
    payload: { ...payload, organizationSignatory: { name: 'Organization Director', title: 'President' } },
    signatures: [schoolSignature], signingStatus: 'PENDING',
  });
  assert.equal((html.match(/data-volunteer-signature/g) || []).length, 1);
  assertNoChop(html);
  assert.ok(html.includes('Organization Director'));
  assert.ok(html.includes('Awaiting authorized signature'));
  assert.ok(html.includes('Awaiting signatures · not yet valid'));
});

test('cancellation takes precedence over signature completion and pending status', () => {
  for (const signingStatus of ['SIGNED', 'PENDING'] as const) {
    const html = render('VOLUNTEER_APPRECIATION_CERTIFICATE', {
      signatures: [schoolSignature], signingStatus, status: 'CANCELLED',
    });
    assert.match(html, /class="volunteer-watermark"[^>]*>CANCELLED/);
    assert.ok(html.includes('Cancelled · no longer valid'));
    assert.ok(!html.includes('volunteer-pending-watermark'));
    assert.ok(!html.includes('Awaiting signatures · not yet valid'));
    assertNoChop(html);
  }
});

test('legacy documents retain manual signatory lines without digital-signing claims', () => {
  for (const type of TYPES) {
    const html = render(type, { payload: { ...payload, version: 1 }, signingStatus: 'NOT_REQUESTED' });
    assert.ok(html.includes('School Director'));
    assert.ok(html.includes('volunteer-signature-line'));
    assert.ok(!html.includes('Digitally signed'));
    assert.ok(!html.includes('Awaiting authorized signature'));
    assert.ok(!html.includes('volunteer-pending-watermark'));
    assertNoChop(html);
  }
});

test('partial draft month selections never print malformed service dates', () => {
  for (const type of TYPES) {
    const html = render(type, {
      draft: true,
      payload: { ...payload, volunteer: { ...payload.volunteer, fromMonth: '2026-', toMonth: '-01' } },
    });
    assert.ok(html.includes('[Start month / year]'));
    assert.ok(html.includes('[End month / year]'));
    assert.ok(!html.includes('<dd>2026-</dd>'));
    assert.ok(!html.includes('<dd>-01</dd>'));
    assert.ok(html.includes('DRAFT · NOT ISSUED'));
    assertNoChop(html);
  }
});
