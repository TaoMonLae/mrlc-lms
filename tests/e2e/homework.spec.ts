import { CURRENT_RELEASE } from '../../src/data/releases';
import { expect, test, type Page } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
const file = { url: '/uploads/homework-media/00000000-0000-0000-0000-000000000001-00000000-0000-0000-0000-000000000002.txt', originalName: 'answer.txt', mimeType: 'text/plain', size: 12 };
const student = { id: 'student-a', studentCode: 'ST-001', user: { firstName: 'Aye', lastName: 'Mon' } };
const assignment = { id: 'homework-a', title: 'Explain the water cycle', instructions: 'Describe evaporation, condensation and precipitation. Include one example.', attachmentUrl: null as string | null, dueDate: '2026-10-01T00:00:00Z', maxMarks: 10, status: 'OPEN', subject: { id: 'science', name: 'Science' }, class: { id: 'class-a', name: 'GED Year 1', students: [student], _count: { students: 1 } }, submissions: [{ id: 'submission-a', studentId: student.id, text: 'Water evaporates when heated.', status: 'SUBMITTED', submittedAt: '2026-09-18T06:00:00Z', score: null, feedback: null, attachments: [file] }] };
async function darkTheme(page: Page) {
  await page.getByRole('button', { name: 'Toggle theme between light and dark mode' }).click();
  await page.getByRole('menuitem', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByRole('menuitem', { name: 'Dark', exact: true })).toHaveCount(0);
}
async function captureWorkspace(page: Page, path: string) {
  await expect(page.locator('.hw-workspace')).toBeVisible();
  await expect.poll(() => page.locator('.hw-workspace').evaluate(el => {
    let opacity = 1;
    for (let node = el as HTMLElement; node; node = node.parentElement!) opacity *= Number(getComputedStyle(node).opacity);
    return opacity;
  })).toBe(1);
  await page.locator('#main-content').evaluate(el => el.scrollTo(0, 0));
  await page.screenshot({ path, animations: 'disabled' });
}
async function fixture(page: Page, role = 'STUDENT', documentType = 'text', withQueue = false, resourceUrl: string | null = null) {
  const user = { id: `${role}-homework-test`, role, firstName: role, lastName: 'Tester', isActive: true };
  const writes: { path: string; body: any }[] = [];
  let data = structuredClone(assignment);
  data.attachmentUrl = resourceUrl;
  if (documentType !== 'text') data.submissions[0].attachments = [{ ...file, url: file.url.replace(/\.txt$/, documentType === 'pdf' ? '.pdf' : '.png'), originalName: documentType === 'pdf' ? 'answer.pdf' : 'answer.png', mimeType: documentType === 'pdf' ? 'application/pdf' : 'image/png' }];
  if (withQueue) {
    data.submissions[0].text = 'Evaporation turns water into vapour. '.repeat(100) + 'Complete answer ends here.';
    data.class.students.push({ id: 'student-paper', studentCode: 'ST-003', user: { firstName: 'Paper', lastName: 'Student' } });
    data.class.students.push({ id: 'student-b', studentCode: 'ST-002', user: { firstName: 'Nai', lastName: 'Aung' } });
    data.submissions.push({ ...data.submissions[0], id: 'submission-b', studentId: 'student-b', text: 'Second student answer.' });
  }
  let mySubmission: any = null;
  let failSave = true;
  await page.addInitScript(({ user, releaseId }) => {
    sessionStorage.setItem('auth_token', 'homework-test'); sessionStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem(`mrlc:release-seen:${user.id}`, releaseId);
  }, { user, releaseId: CURRENT_RELEASE.id });
  await page.route('**/uploads/homework-media/**', route => {
    expect(route.request().headers().authorization).toBe('Bearer homework-test');
    if (route.request().url().endsWith('.png')) return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWKsAAAAASUVORK5CYII=', 'base64') });
    return route.fulfill({ contentType: route.request().url().endsWith('.pdf') ? 'application/pdf' : 'text/plain', body: route.request().url().endsWith('.pdf') ? '%PDF-1.4\n%%EOF' : 'Student work' });
  });
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname, method = route.request().method();
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (path === '/api/homework-media') { writes.push({ path, body: method === 'DELETE' ? route.request().postDataJSON() : null }); return route.fulfill({ status: method === 'POST' ? 201 : 200, json: file }); }
    if (path === '/api/homework/homework-a/submit') {
      const body = route.request().postDataJSON(); writes.push({ path, body });
      mySubmission = { id: 'submission-a', ...body, status: 'SUBMITTED', submittedAt: new Date().toISOString() };
      return route.fulfill({ json: mySubmission });
    }
    if (path === '/api/homework/homework-a/mark') {
      const body = route.request().postDataJSON(); writes.push({ path, body });
      if (failSave) { failSave = false; return route.fulfill({ status: 500, json: { error: 'Could not save feedback. Try again.' } }); }
      const existing = data.submissions.findIndex(sub => sub.studentId === body.studentId);
      const saved = { id: `submission-${body.studentId}`, text: '', attachments: [], submittedAt: new Date().toISOString(), ...body };
      if (existing >= 0) data.submissions[existing] = { ...data.submissions[existing], ...body };
      else data.submissions.push(saved);
      return route.fulfill({ json: saved });
    }
    if (path === '/api/homework/homework-a') return route.fulfill({ json: data });
    if (path === '/api/homework') return route.fulfill({ json: [data] });
    if (path === '/api/student/homework') return route.fulfill({ json: [{ ...data, subjectName: 'Science', teacherName: 'Teacher Mon', mySubmission }] });
    if (path === '/api/teacher/classes') return route.fulfill({ json: [{ classInfo: { id: 'class-a', name: 'GED Year 1' } }] });
    if (path === '/api/subjects') return route.fulfill({ json: [{ id: 'science', name: 'Science' }] });
    return route.fulfill({ json: path.includes('settings') ? {} : [] });
  });
  return writes;
}

test('student attaches files, sees validation, removes a file and submits work', async ({ page }, info) => {
  const writes = await fixture(page);
  await page.goto('/student/homework?assignment=homework-a');
  await page.getByRole('button', { name: 'Open workspace' }).click();
  await page.getByLabel('Attach homework files').setInputFiles({ name: 'unsafe.html', mimeType: 'text/html', buffer: Buffer.from('unsafe') });
  await expect(page.getByRole('alert').filter({ hasText: 'unsafe.html' })).toBeVisible();
  expect(writes.filter(write => write.path === '/api/homework-media')).toHaveLength(0);
  await page.getByLabel('Attach homework files').setInputFiles({ name: 'answer.txt', mimeType: 'text/plain', buffer: Buffer.from('Student work') });
  await expect(page.getByRole('link', { name: /answer.txt/ })).toBeVisible();
  await page.getByRole('button', { name: 'Remove answer.txt' }).click();
  await expect.poll(() => writes.filter(write => write.path === '/api/homework-media').length).toBe(2);
  await page.getByLabel('Attach homework files').setInputFiles({ name: 'answer.txt', mimeType: 'text/plain', buffer: Buffer.from('Student work') });
  await expect(page.getByRole('button', { name: 'Remove answer.txt' })).toBeVisible();
  await page.getByLabel('Your answer').fill('Evaporation turns liquid water into water vapour.');
  await captureWorkspace(page, info.outputPath('student-workspace-light.png'));
  await page.getByRole('button', { name: 'Turn in', exact: true }).click();
  await expect.poll(() => writes.find(write => write.path.endsWith('/submit'))?.body.attachments.length).toBe(1);
  await expect(page.getByRole('button', { name: 'Edit submission' })).toBeVisible();
});

test('teacher Review opens a refreshable independent page, preserves failures and saves zero marks', async ({ page }, info) => {
  const writes = await fixture(page, 'TEACHER');
  await page.goto('/teacher/homework/homework-a');
  await page.getByRole('link', { name: 'Review', exact: true }).click();
  await expect(page).toHaveURL(/\/teacher\/homework\/homework-a\/review\/student-a$/);
  await expect(page.getByRole('heading', { name: 'Teacher feedback' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
  await expect(page.getByRole('table')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Review: Aye Mon/ })).toBeVisible();
  await page.getByLabel('Score out of 10').fill('0');
  await page.getByLabel('Feedback', { exact: true }).fill('Please explain condensation.');
  await page.getByRole('button', { name: 'Mark reviewed', exact: true }).click();
  await expect(page.getByText('Could not save feedback. Try again.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Feedback', { exact: true })).toHaveValue('Please explain condensation.');
  await page.getByRole('button', { name: 'Mark reviewed', exact: true }).click();
  await expect.poll(() => writes.filter(write => write.path.endsWith('/mark')).length).toBe(2);
  expect(writes.at(-1)?.body.score).toBe(0);
  await expect(page.locator('.hw-review').getByText('Marked', { exact: true })).toBeVisible();
  await captureWorkspace(page, info.outputPath('review-desktop-light.png'));
  await page.setViewportSize({ width: 390, height: 844 });
  await darkTheme(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByLabel('Feedback', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await captureWorkspace(page, info.outputPath('review-mobile-dark.png'));
  await page.getByRole('link', { name: 'Back to assignment' }).click();
  await expect(page).toHaveURL(/\/teacher\/homework\/homework-a$/);
});

test('student mobile dark workspace has no horizontal clipping', async ({ page }, info) => {
  await fixture(page); await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/student/homework?assignment=homework-a');
  await darkTheme(page);
  await page.getByRole('button', { name: 'Open workspace' }).click();
  await expect(page.getByLabel('Attach homework files')).toBeAttached();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await captureWorkspace(page, info.outputPath('student-mobile-dark.png'));
});

for (const type of ['pdf', 'image']) test(`protected ${type} previews and downloads do not expose auth tokens in URLs`, async ({ page }) => {
  await fixture(page, 'TEACHER', type);
  await page.goto('/teacher/homework/homework-a/review/student-a');
  if (type === 'pdf') await expect(page.locator('.hw-review iframe')).toHaveAttribute('src', /^blob:/);
  else { await expect(page.getByRole('img', { name: 'answer.png', exact: true })).toHaveAttribute('src', /^blob:/); await expect.poll(() => page.getByRole('img', { name: 'answer.png', exact: true }).evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1); }
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  expect((await download).suggestedFilename()).toBe(type === 'pdf' ? 'answer.pdf' : 'answer.png');
});

test('review queue moves to another independent student URL only after a successful save', async ({ page }) => {
  await fixture(page, 'TEACHER', 'text', true);
  await page.goto('/teacher/homework/homework-a/review/student-a');
  await page.getByLabel('Feedback', { exact: true }).fill('Good explanation.');
  await page.getByRole('button', { name: 'Mark & next pending' }).click();
  await expect(page.getByText('Could not save feedback. Try again.', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/review\/student-a$/);
  await page.getByRole('button', { name: 'Mark & next pending' }).click();
  await expect(page).toHaveURL(/\/review\/student-b$/);
  await expect(page.getByRole('heading', { name: /Review: Nai Aung/ })).toBeVisible();
  await page.getByRole('button', { name: 'Previous submission' }).click();
  await expect(page).toHaveURL(/\/review\/student-paper$/);
  await page.getByRole('button', { name: 'Previous submission' }).click();
  await expect(page).toHaveURL(/\/review\/student-a$/);
});

test('teacher desk filters assignments and remains reachable on mobile', async ({ page }, info) => {
  await fixture(page, 'TEACHER');
  await page.goto('/teacher/homework');
  await expect(page.getByRole('heading', { name: 'Homework', exact: true })).toBeVisible();
  await expect(page.getByText('Your assignments and submission queue. Only you and admins can manage your homework.')).toBeVisible();
  await captureWorkspace(page, info.outputPath('teacher-desk-light.png'));
  await page.getByLabel('Search assignments').fill('not found');
  await expect(page.getByText('No homework matches these filters.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await darkTheme(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await captureWorkspace(page, info.outputPath('teacher-desk-mobile-dark.png'));
  await page.getByRole('link', { name: /Explain the water cycle/ }).click();
  await expect(page).toHaveURL(/\/teacher\/homework\/homework-a$/);
});


test('compact roster filters students and records paper work in the review workspace', async ({ page }, info) => {
  const writes = await fixture(page, 'TEACHER', 'text', true);
  await page.goto('/teacher/homework/homework-a');
  await expect(page.locator('.hw-roster-row')).toHaveCount(3);
  expect(await page.locator('.hw-submission-excerpt').first().evaluate(el => el.getBoundingClientRect().height)).toBeLessThan(40);
  await page.locator('.hw-roster-row').first().getByRole('link', { name: 'Review', exact: true }).click();
  await expect(page.locator('.hw-review').getByText(/Complete answer ends here/)).toBeVisible();
  await page.getByRole('link', { name: 'Back to assignment' }).click();
  await expect(page.locator('.hw-roster-row')).toHaveCount(3);
  await expect(page.getByPlaceholder('Optional feedback')).toHaveCount(0);
  await captureWorkspace(page, info.outputPath('roster-desktop.png'));
  await page.getByRole('button', { name: 'Missing 1', exact: true }).click();
  await expect(page.locator('.hw-roster-row')).toHaveCount(1);
  await page.getByLabel('Search students').fill('unknown');
  await expect(page.getByText('No students match these filters.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.locator('.hw-roster-row')).toHaveCount(3);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await captureWorkspace(page, info.outputPath('roster-mobile.png'));
  await page.getByRole('link', { name: 'Record paper work' }).click();
  await expect(page.getByRole('heading', { name: 'Review: Paper Student' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Request changes', exact: true })).toBeDisabled();
  await page.getByLabel('Score out of 10').fill('8');
  await page.getByLabel('Feedback', { exact: true }).fill('Reviewed on paper.');
  await page.getByRole('button', { name: 'Mark reviewed', exact: true }).click();
  await expect(page.getByText('Could not save feedback. Try again.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mark reviewed', exact: true }).click();
  await expect(page.locator('.hw-review').getByText('Marked', { exact: true })).toBeVisible();
  expect(writes.at(-1)?.body).toMatchObject({ studentId: 'student-paper', score: 8, feedback: 'Reviewed on paper.', status: 'MARKED' });
});


for (const role of ['TEACHER', 'STUDENT']) test(`${role} opens a linked library book in the signed-in tab`, async ({ page, context }) => {
  const readerPath = '/elibrary/book-homework/read';
  await fixture(page, role, 'text', false, readerPath);
  await page.route(/\/api\/ebooks\/book-homework(?:\/|$)/, route => {
    expect(route.request().headers().authorization).toBe('Bearer homework-test');
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/comic/pages/1')) return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWKsAAAAASUVORK5CYII=', 'base64') });
    if (path.endsWith('/comic/manifest')) return route.fulfill({ json: { pageCount: 1 } });
    if (path === '/api/ebooks/book-homework') return route.fulfill({ json: { id: 'book-homework', title: 'Homework reading book', format: 'CBZ', downloadAllowed: false } });
    return route.fulfill({ json: {} });
  });
  await page.goto(role === 'TEACHER' ? '/teacher/homework/homework-a' : '/student/homework');
  const link = page.getByRole('link', { name: role === 'TEACHER' ? 'Linked E-Book' : 'Read the book' });
  await expect(link).toHaveAttribute('target', '_self');
  const tabsBefore = context.pages().length;
  await link.click();
  await expect(page).toHaveURL(new RegExp(`${readerPath}$`));
  await expect(page.getByRole('region', { name: 'CBZ comic reader' })).toBeVisible();
  await expect.poll(() => page.getByRole('img', { name: 'Comic page 1', exact: true }).evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1);
  expect(context.pages()).toHaveLength(tabsBefore);
  expect(await page.evaluate(() => sessionStorage.getItem('auth_token'))).toBe('homework-test');
  await page.goBack();
  await expect(link).toBeVisible();
});
