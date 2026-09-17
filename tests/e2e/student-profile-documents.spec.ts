import { expect, test } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
const student = { id: 'card-student', studentCode: 'ST-2026-006', preferredName: 'Aye Mon', gender: 'MALE', status: 'ACTIVE', boardingType: 'BOARDING', user: { firstName: 'Aye', lastName: 'Mon' } };
const card = { id: 'issued-card', type: 'STUDENT_ID_CARD', status: 'ACTIVE', documentNumber: 'MRLC-ID-2026-006', verifyToken: 'qa-verification-token', studentId: student.id, studentCode: student.studentCode, studentName: 'Aye Mon', className: 'GED Year 1', issueDate: '2026-09-01', expiryDate: '2027-07-31T15:59:59.999Z', payload: { school: { name: 'Mon Refugee Learning Centre', contactPhone: '+60 12-345-6789' }, student: { academicYear: '2026–2027', identityNumber: 'UNHCR-12345678' } } };

for (const role of ['ADMIN', 'TEACHER', 'STUDENT']) test(`${role}: student photos and Documents controls respect ownership`, async ({ page }, testInfo) => {
  const user = { id: `${role.toLowerCase()}-card-test`, name: 'Aye Mon', email: 'card@example.test', role, firstName: 'Aye', lastName: 'Mon', isActive: true, studentId: student.id, boardingType: 'BOARDING' };
  let document = { id: 'supporting-doc', studentId: student.id, title: 'Identity record', documentType: 'UNHCR', fileUrl: '/uploads/student-docs/test.pdf', fileName: 'identity-record.pdf', fileSize: 12000, mimeType: 'application/pdf', createdAt: '2026-09-01', uploadedByName: 'Admin' };
  await page.addInitScript(user => {
    sessionStorage.setItem('auth_token', 'card-test-token');
    sessionStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem(`mrlc:release-seen:${user.id}`, '2026-09-06-language-quest-course-path');
  }, user);
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (path === '/api/student/profile') return route.fulfill({ json: { name: 'Aye Mon', studentId: student.studentCode, status: 'Active', class: 'GED Year 1', academicYear: '2026–2027', guardian: { name: '', relationship: '', phone: '', email: '' } } });
    if (path === `/api/students/${student.id}`) return route.fulfill({ json: student });
    if (path.endsWith('/supporting-doc') && route.request().method() === 'PUT') { document = { ...document, title: route.request().postDataJSON().title }; return route.fulfill({ json: document }); }
    if (path === `/api/students/${student.id}/documents`) return route.fulfill({ json: [document] });
    if (path === '/api/documents' || path === '/api/student/documents') return route.fulfill({ json: [card] });
    if (path === '/api/documents/issued-card') return route.fulfill({ json: card });
    if (path.endsWith('/profile-data')) return route.fulfill({ json: { exams: null, fees: null } });
    if (path.includes('settings') || path.includes('profile')) return route.fulfill({ json: {} });
    return route.fulfill({ json: [] });
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(role === 'STUDENT' ? '/profile' : `/students/${student.id}`);
  if (role === 'STUDENT') {
    await expect(page.getByRole('button', { name: /Change Picture|Change Photo|Remove profile picture/ })).toHaveCount(0);
    await expect(page.getByText('Photo managed by admin', { exact: true })).toBeVisible();
    await page.goto('/student/profile');
    await expect(page.getByRole('button', { name: /Change Picture|Change Photo|Remove profile picture/ })).toHaveCount(0);
  } else {
    await expect(page.getByRole('button', { name: 'Change Photo', exact: true })).toHaveCount(role === 'ADMIN' ? 1 : 0);
    await page.getByRole('tab', { name: 'Documents', exact: true }).click();
  }
  const section = page.getByRole('region', { name: 'Official student card' });
  await expect(section).toBeVisible();
  await expect(section.locator('[data-card-side="front"]')).toBeVisible();
  await section.getByRole('button', { name: 'Back / QR', exact: true }).click();
  await expect(section.getByAltText('Student card verification QR code')).toBeVisible();
  await section.screenshot({ path: testInfo.outputPath(`student-card-${role}-back.png`) });
  await expect(section.locator('[data-card-side="front"]')).toHaveCount(0);
  await section.getByRole('button', { name: 'Front', exact: true }).click();
  if (role === 'ADMIN') {
    await page.getByRole('button', { name: 'Rename Identity record', exact: true }).click();
    await page.getByLabel('Document title', { exact: true }).fill('Verified identity record');
    await page.getByRole('button', { name: 'Save title', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Verified identity record', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Upload Document', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  } else if (role === 'TEACHER') await expect(page.getByRole('button', { name: /Upload Document|Rename Identity record|Delete Identity record/ })).toHaveCount(0);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    expect(await section.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`student-card-${role}-${width}.png`) });
  }
  await section.getByRole('button', { name: 'View / Print Card', exact: true }).click();
  await expect(page.locator('.id-card-face')).toHaveCount(2);
  await expect(page.locator('.id-card-face [data-card-side="front"]')).toBeVisible();
  await expect(page.locator('.id-card-face [data-card-side="back"]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`student-card-${role}-print.png`), fullPage: true });
  expect(errors).toEqual([]);
});
