import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';
import { CURRENT_RELEASE } from '../../src/data/releases';
import type { VolunteerDocumentRecord, VolunteerDocumentVerification } from '../../shared/volunteerDocuments';

test.use({ serviceWorkers: 'block' });

const admin = {
  id: 'volunteer-documents-admin', role: 'ADMIN', firstName: 'Document', lastName: 'Administrator',
  email: 'admin@example.test', isActive: true, mfaEnabled: true, cursorEffect: 'NONE',
};

const teacher = {
  ...admin, id: 'volunteer-documents-teacher', role: 'TEACHER',
  firstName: 'Sample', lastName: 'Signatory', email: 'teacher@example.test',
};
const verifyToken = 'a'.repeat(48);
let fixturePng: Buffer;
let fixtureImage: string;
test.beforeAll(async () => {
  // Synthetic ink fixture: no real person's signature or school stamp.
  fixturePng = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100"><path d="M20 75 L65 20 L90 75 L125 30 L150 70 L210 35 L280 65" fill="none" stroke="#17354a" stroke-width="7"/></svg>')).png().toBuffer();
  fixtureImage = `data:image/png;base64,${fixturePng.toString('base64')}`;
});

const certificate: VolunteerDocumentRecord = {
  id: 'volunteer-certificate', documentNumber: 'MRLC-VA-2026-TEST',
  verifyToken,
  verifyUrl: `https://school.example.test/verify/volunteer/${verifyToken}`,
  type: 'VOLUNTEER_APPRECIATION_CERTIFICATE', status: 'ACTIVE',
  recipientName: 'Sample Volunteer', role: 'English Teaching Volunteer',
  fromMonth: '2025-01', toMonth: '2025-08',
  issueDate: '2026-10-01T04:00:00.000Z', createdAt: '2026-10-01T04:00:00.000Z', updatedAt: '2026-10-01T04:00:00.000Z',
  cancelledReason: null, downloadCount: 0,
  payload: {
    version: 1,
    organization: { name: 'Mon Refugee Organization' },
    school: {
      name: 'Mon Refugee Learning Centre', program: 'GED Program', logoUrl: null,
      address: null, contactEmail: null, contactPhone: null,
    },
    volunteer: {
      name: 'Sample Volunteer', role: 'English Teaching Volunteer', fromMonth: '2025-01', toMonth: '2025-08',
      contributions: 'Supported weekly English reading lessons.', hoursPerWeek: 4, totalHours: 120,
    },
    signatory: { name: 'Sample Signatory', title: 'Program Coordinator' },
    organizationSignatory: { name: 'Organization Signatory', title: 'Organization Representative' },
  },
};

function verification(document: VolunteerDocumentRecord, status = document.status): VolunteerDocumentVerification {
  const { chopDataUrl: _chop, ...school } = document.payload.school;
  return {
    valid: status === 'ACTIVE' && (document.payload.version === 1 || document.signingStatus === 'SIGNED'), status,
    documentNumber: document.documentNumber, documentType: 'Certificate of Appreciation',
    recipientName: document.recipientName, role: document.role,
    fromMonth: document.fromMonth, toMonth: document.toMonth, issueDate: document.issueDate,
    organization: document.payload.organization, school,
    hoursPerWeek: 4, totalHours: 120, signingStatus: document.signingStatus,
    signatures: document.signatures?.map(({ slot, signerName, signerTitle, signedAt }) => ({ slot, signerName, signerTitle, signedAt })),
  };
}

function pendingCertificate(userId = teacher.id, organizationSigner = false): VolunteerDocumentRecord {
  return {
    ...certificate, signatoryUserId: userId, organizationSignatoryUserId: organizationSigner ? admin.id : null,
    signingStatus: 'PENDING', signatures: [], contentHash: 'c'.repeat(64),
    issueDate: '2026-09-30T16:05:00.000Z',
    payload: {
      ...certificate.payload, version: 2,
      school: { ...certificate.payload.school, chopDataUrl: fixtureImage },
      signatory: { name: userId === teacher.id ? 'Sample Signatory' : 'Document Administrator', title: 'Program Coordinator' },
      organizationSignatory: organizationSigner ? { name: 'Document Administrator', title: 'Organization Representative' } : null,
    },
  };
}

/** All records are intercepted fixtures; these tests never create school records. */
async function fixture(page: Page, options: {
  authenticated?: boolean;
  role?: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'GUARDIAN';
  document?: VolunteerDocumentRecord;
  freshDocument?: VolunteerDocumentRecord;
  verificationStatus?: VolunteerDocumentRecord['status'] | 'NOT_FOUND' | 'UNAVAILABLE';
} = {}) {
  const writes: Record<string, unknown>[] = [];
  const cancellations: Record<string, unknown>[] = [];
  const signs: Record<string, unknown>[] = [];
  const user = options.role === 'TEACHER' ? teacher : { ...admin, role: options.role || 'ADMIN' };
  let currentDocument = options.document || certificate;
  let documents: VolunteerDocumentRecord[] = options.document ? [options.document] : [];
  await page.addInitScript(({ user, release, authenticated }) => {
    sessionStorage.clear(); localStorage.clear();
    if (authenticated) {
      sessionStorage.setItem('auth_token', 'volunteer-fixture-token');
      sessionStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem(`mrlc:release-seen:${user.id}`, release);
    }
  }, { user, release: CURRENT_RELEASE.id, authenticated: Boolean(options.authenticated) });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (path === '/api/settings' || path === '/api/public/branding') return route.fulfill({ json: { name: 'Mon Refugee Learning Centre', cursorEffect: 'NONE' } });
    if (path === '/api/volunteer-documents/options') return route.fulfill({ json: {
      signatories: [{ id: admin.id, name: 'Document Administrator', role: 'ADMIN' }, { id: teacher.id, name: 'Sample Signatory', role: 'TEACHER' }],
    } });
    if (path === '/api/volunteer-documents' && route.request().method() === 'POST') {
      const input = route.request().postDataJSON();
      writes.push(input);
      currentDocument = {
        ...pendingCertificate(input.signatoryUserId, Boolean(input.organizationSignatoryUserId)),
        type: input.type, recipientName: input.recipientName, role: input.role,
        fromMonth: input.fromMonth, toMonth: input.toMonth,
        payload: {
          ...pendingCertificate(input.signatoryUserId, Boolean(input.organizationSignatoryUserId)).payload,
          school: { ...certificate.payload.school },
          volunteer: { ...certificate.payload.volunteer, name: input.recipientName, role: input.role, fromMonth: input.fromMonth, toMonth: input.toMonth },
          signatory: { name: input.signatoryName, title: input.signatoryTitle },
        },
      };
      documents = [currentDocument, ...documents];
      return route.fulfill({ status: 201, json: currentDocument });
    }
    if (path === '/api/volunteer-documents') return route.fulfill({ json: documents });
    if (path === '/api/volunteer-documents/volunteer-certificate/cancel') {
      const input = route.request().postDataJSON();
      cancellations.push(input);
      currentDocument = { ...currentDocument, status: 'CANCELLED', cancelledReason: input.reason };
      documents = documents.map(document => document.id === currentDocument.id ? currentDocument : document);
      return route.fulfill({ json: currentDocument });
    }
    if (path === '/api/volunteer-documents/volunteer-certificate/sign') {
      const input = route.request().postDataJSON(); signs.push(input);
      const assigned = input.slot === 'SCHOOL' ? currentDocument.payload.signatory : currentDocument.payload.organizationSignatory!;
      const signatures = [...(currentDocument.signatures || []), {
        id: `signature-${input.slot}`, slot: input.slot, imageDataUrl: input.imageDataUrl, contentHash: input.contentHash,
        signerUserId: user.id, signerName: assigned.name, signerTitle: assigned.title, signedAt: '2026-09-30T16:30:00.000Z',
      }];
      currentDocument = { ...currentDocument, signatures, signingStatus: signatures.length === (currentDocument.organizationSignatoryUserId ? 2 : 1) ? 'SIGNED' : 'PENDING' };
      documents = documents.map(document => document.id === currentDocument.id ? currentDocument : document);
      return route.fulfill({ json: currentDocument });
    }
    if (path === '/api/volunteer-documents/volunteer-certificate') {
      if (options.freshDocument) currentDocument = options.freshDocument;
      return route.fulfill({ json: currentDocument });
    }
    if (path.startsWith('/api/verify/volunteer/')) {
      if (options.verificationStatus === 'NOT_FOUND') return route.fulfill({ status: 404, json: { error: 'Document not found.' } });
      if (options.verificationStatus === 'UNAVAILABLE') return route.fulfill({ status: 503, json: { error: 'Try again later.' } });
      return route.fulfill({ json: verification(currentDocument, options.verificationStatus || currentDocument.status) });
    }
    return route.fulfill({ json: [] });
  });
  return { writes, cancellations, signs, current: () => currentDocument };
}

async function chooseServiceMonth(page: Page, label: 'From' | 'To', value: string) {
  const [year, month] = value.split('-');
  await page.getByLabel(`${label} year`, { exact: true }).selectOption(year);
  await page.getByLabel(`${label} month`, { exact: true }).selectOption(month);
}

async function completeServiceForm(page: Page) {
  await page.getByLabel('Volunteer’s full name *', { exact: true }).fill('Sample Volunteer');
  await page.getByLabel('Volunteer role *', { exact: true }).fill('English Teaching Volunteer');
  await chooseServiceMonth(page, 'From', '2025-01');
  await chooseServiceMonth(page, 'To', '2025-08');
  await page.getByLabel('Authorized staff account *', { exact: true }).selectOption(teacher.id);
  await page.getByLabel('Position / title *', { exact: true }).fill('Program Coordinator');
}

test('service dates and review confirmation gate issuing a volunteer certificate', async ({ page }) => {
  const { writes } = await fixture(page, { authenticated: true });
  await page.goto('/documents/volunteers');
  await expect(page.getByRole('heading', { name: 'Volunteer documents', exact: true })).toBeVisible();
  await expect(page.getByText('DRAFT · NOT ISSUED', { exact: true })).toBeVisible();
  await expect(page.getByAltText('Scan to verify this document')).toHaveCount(0);
  const issue = page.getByRole('button', { name: 'Create for signing', exact: true });
  const review = page.getByRole('checkbox', { name: 'I have reviewed the preview and confirmed the name, service dates, contributions and signatories.' });
  await expect(issue).toBeDisabled();
  await page.getByLabel('Volunteer’s full name *', { exact: true }).fill('Sample Volunteer');
  await page.getByLabel('Volunteer role *', { exact: true }).fill('English Teaching Volunteer');
  await chooseServiceMonth(page, 'From', '2025-01');
  await chooseServiceMonth(page, 'To', '2024-12');
  await page.getByLabel('Authorized staff account *', { exact: true }).selectOption(teacher.id);
  await page.getByLabel('Position / title *', { exact: true }).fill('Program Coordinator');
  await page.getByLabel('Hours per week', { exact: true }).fill('4');
  await page.getByLabel('Total service hours', { exact: true }).fill('120');
  await review.check();
  await issue.click();
  await expect(page.getByRole('alert')).toHaveText('The To month must be on or after the From month.');
  expect(writes).toHaveLength(0);
  await chooseServiceMonth(page, 'To', '2025-08');
  await expect(review).not.toBeChecked();
  await expect(issue).toBeDisabled();
  expect(writes).toHaveLength(0);
  await review.check();
  await issue.click();
  await expect(page.getByRole('complementary', { name: 'Document preview' }).getByText('Awaiting signatures', { exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({
    type: 'VOLUNTEER_APPRECIATION_CERTIFICATE', recipientName: 'Sample Volunteer', role: 'English Teaching Volunteer',
    fromMonth: '2025-01', toMonth: '2025-08', hoursPerWeek: 4, totalHours: 120,
    signatoryName: 'Sample Signatory', signatoryTitle: 'Program Coordinator', signatoryUserId: teacher.id,
  });
  await expect(issue).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Open / print PDF', exact: true })).toHaveAttribute('href', '/documents/volunteer/volunteer-certificate/print');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('cancellation can be dismissed and an intentional cancellation invalidates public verification', async ({ page }) => {
  const { cancellations } = await fixture(page, { authenticated: true, document: certificate });
  await page.goto('/documents/volunteers');
  const cancel = page.getByRole('button', { name: `Cancel document ${certificate.documentNumber}`, exact: true });
  await cancel.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Cancel this document?', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep document', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(cancellations).toHaveLength(0);
  await cancel.click();
  await dialog.getByLabel('Reason for cancellation *', { exact: true }).fill('The service dates need correction.');
  await dialog.getByRole('button', { name: 'Cancel document', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(cancel).toHaveCount(0);
  expect(cancellations).toEqual([{ reason: 'The service dates need correction.' }]);
  await page.goto(`/verify/volunteer/${certificate.verifyToken}`);
  await expect(page.getByRole('heading', { name: 'Document cancelled', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Verified volunteer document', exact: true })).toHaveCount(0);
});

for (const [type, title, landscape] of [
  ['VOLUNTEER_APPRECIATION_CERTIFICATE', 'Certificate of Appreciation', true],
  ['VOLUNTEER_APPRECIATION_LETTER', 'Letter of Appreciation', false],
  ['PART_TIME_VOLUNTEER_CONFIRMATION', 'Proof of Part-Time Volunteering', false],
] as const) {
  test(`${title} prints both issuers, service months and a verification QR in the correct orientation`, async ({ page }, info) => {
    await fixture(page, { authenticated: true, document: { ...certificate, type } });
    await page.goto('/documents/volunteer/volunteer-certificate/print');
    const sheet = page.locator('.volunteer-sheet');
    await expect(sheet.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(sheet.getByAltText('Scan to verify this document')).toBeVisible();
    await expect(sheet.locator('.volunteer-organization')).toHaveText('Mon Refugee Organization');
    await expect(sheet.locator('.volunteer-school')).toHaveText('Mon Refugee Learning Centre');
    await expect(sheet.locator('.volunteer-program')).toHaveText('GED Program');
    await expect(sheet.locator('.volunteer-service-period dt')).toHaveText(['From', 'To']);
    await expect(sheet.locator('.volunteer-service-period dd')).toHaveText(['January 2025', 'August 2025']);
    await expect(sheet.locator('.volunteer-verify-url')).toHaveAttribute('href', certificate.verifyUrl);
    await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.emulateMedia({ media: 'print' });
    const bounds = await sheet.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width > bounds!.height).toBe(landscape);
    // Capture printable output without opening a printer dialog or saving a real record.
    await sheet.screenshot({ path: info.outputPath(`${type}.png`) });
  });
}

for (const [type, contributionLimit] of [
  ['VOLUNTEER_APPRECIATION_CERTIFICATE', 500],
  ['PART_TIME_VOLUNTEER_CONFIRMATION', 1200],
] as const) {
  test(`${type} keeps maximum-length content and its verification footer inside the printed sheet`, async ({ page }, info) => {
    const fillLength = (words: string, length: number) => words.repeat(Math.ceil(length / words.length)).slice(0, length);
    const recipientName = fillLength('Alexandria Volunteer Community ', 160);
    const role = fillLength('Lead Volunteer GED Literacy and Student Learning Support ', 120);
    const signatoryName = fillLength('Authorized Education Coordinator ', 120);
    const signatoryTitle = fillLength('Director of Volunteer Learning and Community Support ', 120);
    const contributions = fillLength('Supported weekly reading lessons, individual study plans and supervised GED preparation for learners. ', contributionLimit);
    const document: VolunteerDocumentRecord = {
      ...certificate, type, recipientName, role,
      payload: {
        ...certificate.payload,
        volunteer: { ...certificate.payload.volunteer, name: recipientName, role, contributions },
        signatory: { name: signatoryName, title: signatoryTitle },
        organizationSignatory: { name: signatoryName, title: signatoryTitle },
      },
    };
    await fixture(page, { authenticated: true, document });
    await page.goto('/documents/volunteer/volunteer-certificate/print');
    const sheet = page.locator('.volunteer-sheet');
    await expect(sheet.getByAltText('Scan to verify this document')).toBeVisible();
    await expect(sheet.locator('.volunteer-contributions')).toHaveText(contributions);
    await expect(sheet.locator('.volunteer-signature-name')).toHaveText([signatoryName, signatoryName]);
    await expect(sheet).toContainText(recipientName);
    await expect(sheet).toContainText(role);
    await page.emulateMedia({ media: 'print' });
    // Print media changes the container's dimensions. Dispatch the browser event
    // so this checks the synchronous fitting path used by the print dialog too.
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));

    const measurePrintedContent = () => sheet.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const css = getComputedStyle(element);
      const padded = {
        left: bounds.left + parseFloat(css.borderLeftWidth) + parseFloat(css.paddingLeft),
        right: bounds.right - parseFloat(css.borderRightWidth) - parseFloat(css.paddingRight),
        top: bounds.top + parseFloat(css.borderTopWidth) + parseFloat(css.paddingTop),
        bottom: bounds.bottom - parseFloat(css.borderBottomWidth) - parseFloat(css.paddingBottom),
      };
      const content = element.querySelector('.volunteer-sheet-content')!;
      const footer = element.querySelector('.volunteer-sheet-footer')!.getBoundingClientRect();
      const header = element.querySelector('.volunteer-sheet-header')!.getBoundingClientRect();
      const qr = element.querySelector('.volunteer-qr')!.getBoundingClientRect();
      const rendered = Array.from(content.querySelectorAll('*')).map(node => node.getBoundingClientRect())
        .filter(box => box.width > 0 && box.height > 0);
      // getBoundingClientRect includes the actual scale transform. scrollHeight
      // deliberately describes natural overflow and is not a clipping check.
      const overflow = Math.max(0, ...rendered.flatMap(box => [
        padded.left - box.left, box.right - padded.right,
        padded.top - box.top, box.bottom - padded.bottom,
      ]));
      return {
        overflow, footerBottom: footer.bottom, paddedBottom: padded.bottom,
        footerHeight: footer.height, headerHeight: header.height, qrWidth: qr.width,
        renderedElements: rendered.length, scale: new DOMMatrix(getComputedStyle(content).transform).a,
      };
    });

    await expect.poll(async () => (await measurePrintedContent()).overflow).toBeLessThanOrEqual(1.5);
    const printed = await measurePrintedContent();
    expect(printed.footerBottom).toBeLessThanOrEqual(printed.paddedBottom + 1.5);
    expect(printed.renderedElements).toBeGreaterThan(20);
    expect(printed.headerHeight).toBeGreaterThan(20);
    expect(printed.footerHeight).toBeGreaterThan(20);
    expect(printed.qrWidth).toBeGreaterThan(24);
    expect(printed.scale).toBeGreaterThan(0);
    expect(printed.scale).toBeLessThanOrEqual(1);
    await sheet.screenshot({ path: info.outputPath(`${type}-maximum-content.png`) });
  });
}

test('cancelled certificate remains visibly invalid in its printed copy', async ({ page }) => {
  await fixture(page, { authenticated: true, document: { ...certificate, status: 'CANCELLED' } });
  await page.goto('/documents/volunteer/volunteer-certificate/print');
  await expect(page.getByRole('alert')).toContainText('no longer valid');
  await expect(page.locator('.volunteer-watermark')).toHaveText('CANCELLED');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.volunteer-invalid-status')).toHaveText('Cancelled · no longer valid');
  await expect(page.locator('.volunteer-watermark')).toBeVisible();
});

test('anonymous verification shows matching service dates without exposing signatures or contributions', async ({ page }) => {
  await fixture(page);
  await page.goto(`/verify/volunteer/${certificate.verifyToken}`);
  await expect(page.getByRole('heading', { name: 'Verified volunteer document', exact: true })).toBeVisible();
  await expect(page.getByText('Sample Volunteer', { exact: true })).toBeVisible();
  await expect(page.getByText('January 2025', { exact: true })).toBeVisible();
  await expect(page.getByText('August 2025', { exact: true })).toBeVisible();
  await expect(page.getByText(certificate.documentNumber, { exact: true })).toBeVisible();
  await expect(page.getByText('Sample Signatory', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Supported weekly English reading lessons.', { exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/verify\/volunteer\//);
});

for (const [status, heading] of [
  ['NOT_FOUND', 'Document not found'],
  ['UNAVAILABLE', 'Unable to verify right now'],
] as const) {
  test(`anonymous verification distinguishes ${status.toLowerCase()} from a valid certificate`, async ({ page }) => {
    await fixture(page, { verificationStatus: status });
    await page.goto(`/verify/volunteer/${certificate.verifyToken}`);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Verified volunteer document', exact: true })).toHaveCount(0);
    await expect(page.getByText('Sample Volunteer', { exact: true })).toHaveCount(0);
    if (status === 'UNAVAILABLE') await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  });
}

async function uploadSignature(page: Page) {
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Upload', exact: true }).click();
  await dialog.getByLabel('Upload your signature image', { exact: true }).setInputFiles({ name: 'synthetic-test-signature.png', mimeType: 'image/png', buffer: fixturePng });
  await expect(dialog.getByText('Signature ready for review. It is applied only when you confirm signing.', { exact: true })).toBeVisible();
}

test('an assigned teacher reviews and signs their document, with consent and the reviewed content fingerprint', async ({ page }) => {
  const document = pendingCertificate();
  const { signs } = await fixture(page, { authenticated: true, role: 'TEACHER', document });
  await page.goto('/documents/volunteers');
  await expect(page.getByRole('heading', { name: 'Documents assigned to you', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create for signing', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Upload the official school chop', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: `Cancel document ${document.documentNumber}`, exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: `Sign MRLC document ${document.documentNumber}`, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Review and sign for MRLC', exact: true })).toBeVisible();
  await expect(dialog.locator('.volunteer-sheet')).toContainText('January 2025');
  await expect(dialog.getByAltText('MRLC school chop', { exact: true })).toHaveCount(0);
  const sign = dialog.getByRole('button', { name: 'Sign this document', exact: true });
  await expect(sign).toBeDisabled();
  await uploadSignature(page);
  await expect(sign).toBeDisabled();
  await dialog.getByRole('checkbox', { name: /I have reviewed this document, confirm that I am its assigned MRLC signatory/ }).check();
  expect(signs).toHaveLength(0);
  await sign.click();
  await expect(dialog).toHaveCount(0);
  expect(signs).toHaveLength(1);
  expect(signs[0]).toMatchObject({ slot: 'SCHOOL', consent: true, contentHash: document.contentHash });
  expect(signs[0].imageDataUrl).toMatch(/^data:image\/png;base64,/);
  await expect(page.getByRole('button', { name: `Sign MRLC document ${document.documentNumber}`, exact: true })).toHaveCount(0);
  await expect(page.locator('tbody')).toContainText('Digitally signed');

  await page.goto('/documents/volunteer/volunteer-certificate/print');
  const sheet = page.locator('.volunteer-sheet');
  await expect(sheet.getByAltText('Signature of Sample Signatory', { exact: true })).toBeVisible();
  await expect(sheet.getByAltText('MRLC school chop', { exact: true })).toHaveCount(0);
  await expect(sheet.locator('.volunteer-pending-watermark')).toHaveCount(0);
  await expect(sheet.locator('.volunteer-signature-audit')).toContainText('1 October 2026, 00:30 MYT');
  await page.goto(`/verify/volunteer/${verifyToken}`);
  await expect(page.getByRole('heading', { name: 'Verified volunteer document', exact: true })).toBeVisible();
  await expect(page.getByText('Sample Signatory', { exact: true })).toBeVisible();
  await expect(page.getByText('1 October 2026, 00:30 MYT', { exact: true })).toBeVisible();
  await expect(page.locator('img')).toHaveCount(0);
});

test('pending records are clearly invalid in print and public verification', async ({ page }) => {
  await fixture(page, { authenticated: true, document: pendingCertificate() });
  await page.goto('/documents/volunteer/volunteer-certificate/print');
  await expect(page.locator('.volunteer-pending-watermark')).toHaveText('AWAITING SIGNATURES');
  await expect(page.locator('.volunteer-invalid-status')).toHaveText('Awaiting signatures · not yet valid');
  await expect(page.getByAltText('MRLC school chop', { exact: true })).toHaveCount(0);
  await page.goto(`/verify/volunteer/${verifyToken}`);
  await expect(page.getByRole('heading', { name: 'Awaiting authorized signatures', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Verified volunteer document', exact: true })).toHaveCount(0);
  await expect(page.getByText('Pending', { exact: true })).toBeVisible();
});

test('administrators cannot use the interface to sign another assigned person’s slot', async ({ page }) => {
  await fixture(page, { authenticated: true, document: pendingCertificate() });
  await page.goto('/documents/volunteers');
  await expect(page.locator('tbody')).toContainText('Sample Volunteer');
  await expect(page.getByRole('button', { name: /^Sign (MRLC|MRO) document/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: `Cancel document ${certificate.documentNumber}`, exact: true })).toBeVisible();
});

test('opening a stale signing row reloads the record and blocks a cancelled document', async ({ page }) => {
  const pending = pendingCertificate();
  const { signs } = await fixture(page, {
    authenticated: true, role: 'TEACHER', document: pending,
    freshDocument: { ...pending, status: 'CANCELLED' },
  });
  await page.goto('/documents/volunteers');
  await page.getByRole('button', { name: `Sign MRLC document ${certificate.documentNumber}`, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Sign this document', exact: true })).toBeDisabled();
  expect(signs).toHaveLength(0);
});

test('administrators can create and sign a document without a school chop', async ({ page }) => {
  const { current, signs } = await fixture(page, { authenticated: true });
  await page.goto('/documents/volunteers');
  await expect(page.getByLabel('Upload the official school chop', { exact: true })).toHaveCount(0);
  await expect(page.locator('.volunteer-school-chop, .volunteer-chop-placeholder')).toHaveCount(0);
  await completeServiceForm(page);
  await page.getByLabel('Authorized staff account *', { exact: true }).selectOption(admin.id);
  await page.getByRole('checkbox', { name: 'I have reviewed the preview and confirmed the name, service dates, contributions and signatories.' }).check();
  await page.getByRole('button', { name: 'Create for signing', exact: true }).click();
  await expect(page.locator('tbody')).toContainText('Sample Volunteer');
  expect(current().payload.school).not.toHaveProperty('chopDataUrl');
  await page.getByRole('button', { name: `Sign MRLC document ${certificate.documentNumber}`, exact: true }).click();
  await expect(page.getByAltText('School chop to be applied', { exact: true })).toHaveCount(0);
  await uploadSignature(page);
  await page.getByRole('dialog').getByRole('checkbox', { name: /I have reviewed this document, confirm that I am its assigned MRLC signatory/ }).check();
  await page.getByRole('dialog').getByRole('button', { name: 'Sign this document', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(signs).toHaveLength(1);
  await page.goto('/documents/volunteer/volunteer-certificate/print');
  await expect(page.locator('.volunteer-sheet').getByAltText('Signature of Document Administrator', { exact: true })).toBeVisible();
  await expect(page.locator('.volunteer-school-chop, .volunteer-chop-placeholder')).toHaveCount(0);
});

test.describe('Malaysia dates on a computer in another timezone', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });
  test('list, print and verification retain the Malaysian issue date at a month boundary', async ({ page }) => {
    await fixture(page, { authenticated: true, role: 'TEACHER', document: pendingCertificate() });
    await page.goto('/documents/volunteers');
    await expect(page.locator('tbody')).toContainText('1 October 2026');
    await page.goto('/documents/volunteer/volunteer-certificate/print');
    await expect(page.locator('.volunteer-footer-record')).toContainText('Issued: 1 October 2026');
    await expect(page.locator('.volunteer-service-period dd')).toHaveText(['January 2025', 'August 2025']);
    await page.goto(`/verify/volunteer/${verifyToken}`);
    await expect(page.getByText('1 October 2026', { exact: true })).toBeVisible();
  });
});

for (const [role, destination] of [['STUDENT', '/unauthorized'], ['GUARDIAN', '/family']] as const) {
  test(`${role} accounts cannot enter volunteer document signing`, async ({ page }) => {
    await fixture(page, { authenticated: true, role });
    await page.goto('/documents/volunteers');
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
    await expect(page.getByRole('heading', { name: 'Volunteer documents', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Create for signing', exact: true })).toHaveCount(0);
  });
}

test('a second assigned MRO signatory completes a document without replacing its MRLC signature', async ({ page }) => {
  const document = pendingCertificate(teacher.id, true);
  document.signatures = [{
    id: 'existing-school-signature', slot: 'SCHOOL', signerUserId: teacher.id,
    signerName: 'Sample Signatory', signerTitle: 'Program Coordinator',
    signedAt: '2026-09-30T16:20:00.000Z', imageDataUrl: fixtureImage, contentHash: document.contentHash!,
  }];
  const { signs } = await fixture(page, { authenticated: true, document });
  await page.goto(`/verify/volunteer/${verifyToken}`);
  await expect(page.getByRole('heading', { name: 'Awaiting authorized signatures', exact: true })).toBeVisible();
  await expect(page.getByText('Sample Signatory', { exact: true })).toBeVisible();
  await page.goto('/documents/volunteers');
  await expect(page.getByRole('button', { name: `Sign MRLC document ${document.documentNumber}`, exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: `Sign MRO document ${document.documentNumber}`, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByAltText('Signature of Sample Signatory', { exact: true })).toBeVisible();
  await uploadSignature(page);
  await dialog.getByRole('checkbox', { name: /I have reviewed this document, confirm that I am its assigned MRO signatory/ }).check();
  await dialog.getByRole('button', { name: 'Sign this document', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(signs).toHaveLength(1);
  expect(signs[0]).toMatchObject({ slot: 'ORGANIZATION', contentHash: document.contentHash, consent: true });
  await page.goto('/documents/volunteer/volunteer-certificate/print');
  await expect(page.getByAltText('Signature of Sample Signatory', { exact: true })).toHaveAttribute('src', fixtureImage);
  await expect(page.getByAltText('Signature of Document Administrator', { exact: true })).toBeVisible();
  await expect(page.locator('.volunteer-school-chop, .volunteer-chop-placeholder')).toHaveCount(0);
  await page.goto(`/verify/volunteer/${verifyToken}`);
  await expect(page.getByRole('heading', { name: 'Verified volunteer document', exact: true })).toBeVisible();
  await expect(page.getByText('Complete', { exact: true })).toBeVisible();
  await expect(page.getByText('Sample Signatory', { exact: true })).toBeVisible();
  await expect(page.getByText('Document Administrator', { exact: true })).toBeVisible();
});
