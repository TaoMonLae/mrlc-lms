import { expect, test, type Page } from '@playwright/test';
import { CURRENT_RELEASE } from '../../src/data/releases';
import type { VolunteerDocumentRecord, VolunteerDocumentVerification } from '../../shared/volunteerDocuments';

test.use({ serviceWorkers: 'block' });

const admin = {
  id: 'volunteer-documents-admin', role: 'ADMIN', firstName: 'Document', lastName: 'Administrator',
  email: 'admin@example.test', isActive: true, mfaEnabled: true, cursorEffect: 'NONE',
};

const verifyToken = 'a'.repeat(48);

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

function verification(status: VolunteerDocumentRecord['status'] = 'ACTIVE'): VolunteerDocumentVerification {
  return {
    valid: status === 'ACTIVE', status,
    documentNumber: certificate.documentNumber, documentType: 'Certificate of Appreciation',
    recipientName: certificate.recipientName, role: certificate.role,
    fromMonth: certificate.fromMonth, toMonth: certificate.toMonth, issueDate: certificate.issueDate,
    organization: certificate.payload.organization, school: certificate.payload.school,
    hoursPerWeek: 4, totalHours: 120,
  };
}

/** All records are intercepted fixtures; these tests never create school records. */
async function fixture(page: Page, options: {
  authenticated?: boolean;
  document?: VolunteerDocumentRecord;
  verificationStatus?: VolunteerDocumentRecord['status'] | 'NOT_FOUND' | 'UNAVAILABLE';
} = {}) {
  const writes: Record<string, unknown>[] = [];
  const cancellations: Record<string, unknown>[] = [];
  let currentDocument = options.document || certificate;
  let documents: VolunteerDocumentRecord[] = options.document ? [options.document] : [];
  if (options.authenticated) {
    await page.addInitScript(({ user, release }) => {
      sessionStorage.setItem('auth_token', 'volunteer-fixture-token');
      sessionStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem(`mrlc:release-seen:${user.id}`, release);
    }, { user: admin, release: CURRENT_RELEASE.id });
  }
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    if (path === '/api/auth/me') return route.fulfill({ json: { user: admin } });
    if (path === '/api/volunteer-documents' && route.request().method() === 'POST') {
      const input = route.request().postDataJSON();
      writes.push(input);
      const created = {
        ...certificate, type: input.type, recipientName: input.recipientName, role: input.role,
        fromMonth: input.fromMonth, toMonth: input.toMonth,
        payload: {
          ...certificate.payload,
          volunteer: { ...certificate.payload.volunteer, name: input.recipientName, role: input.role, fromMonth: input.fromMonth, toMonth: input.toMonth },
        },
      };
      documents = [created, ...documents];
      return route.fulfill({ status: 201, json: created });
    }
    if (path === '/api/volunteer-documents') return route.fulfill({ json: documents });
    if (path === '/api/volunteer-documents/volunteer-certificate/cancel') {
      const input = route.request().postDataJSON();
      cancellations.push(input);
      currentDocument = { ...currentDocument, status: 'CANCELLED', cancelledReason: input.reason };
      documents = documents.map(document => document.id === currentDocument.id ? currentDocument : document);
      return route.fulfill({ json: currentDocument });
    }
    if (path === '/api/volunteer-documents/volunteer-certificate') return route.fulfill({ json: currentDocument });
    if (path.startsWith('/api/verify/volunteer/')) {
      if (options.verificationStatus === 'NOT_FOUND') return route.fulfill({ status: 404, json: { error: 'Document not found.' } });
      if (options.verificationStatus === 'UNAVAILABLE') return route.fulfill({ status: 503, json: { error: 'Try again later.' } });
      return route.fulfill({ json: verification(options.verificationStatus || currentDocument.status) });
    }
    return route.fulfill({ json: path.includes('settings') || path.includes('branding') ? {} : [] });
  });
  return { writes, cancellations };
}

test('service dates and review confirmation gate issuing a volunteer certificate', async ({ page }) => {
  const { writes } = await fixture(page, { authenticated: true });
  await page.goto('/documents/volunteers');
  await expect(page.getByRole('heading', { name: 'Volunteer documents', exact: true })).toBeVisible();
  await expect(page.getByText('DRAFT · NOT ISSUED', { exact: true })).toBeVisible();
  await expect(page.getByAltText('Scan to verify this document')).toHaveCount(0);
  const issue = page.getByRole('button', { name: 'Issue verified document', exact: true });
  const review = page.getByRole('checkbox', { name: 'I have reviewed the preview and confirmed the name, service dates, contributions and signatories.' });
  await expect(issue).toBeDisabled();
  await page.getByLabel('Volunteer’s full name *', { exact: true }).fill('Sample Volunteer');
  await page.getByLabel('Volunteer role *', { exact: true }).fill('English Teaching Volunteer');
  await page.getByLabel('From month / year *', { exact: true }).fill('2025-01');
  const to = page.getByLabel('To month / year *', { exact: true });
  await to.fill('2024-12');
  await page.getByLabel('Signatory name *', { exact: true }).fill('Sample Signatory');
  await page.getByLabel('Position / title *', { exact: true }).fill('Program Coordinator');
  await page.getByLabel('Hours per week', { exact: true }).fill('4');
  await page.getByLabel('Total service hours', { exact: true }).fill('120');
  await review.check();
  await issue.click();
  expect(await to.evaluate(input => (input as HTMLInputElement).validity.rangeUnderflow)).toBe(true);
  expect(writes).toHaveLength(0);
  await to.fill('2025-08');
  await expect(review).not.toBeChecked();
  await expect(issue).toBeDisabled();
  expect(writes).toHaveLength(0);
  await review.check();
  await issue.click();
  await expect(page.getByText('Document issued', { exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({
    type: 'VOLUNTEER_APPRECIATION_CERTIFICATE', recipientName: 'Sample Volunteer', role: 'English Teaching Volunteer',
    fromMonth: '2025-01', toMonth: '2025-08', hoursPerWeek: 4, totalHours: 120,
    signatoryName: 'Sample Signatory', signatoryTitle: 'Program Coordinator',
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
