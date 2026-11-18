import { test, expect, type Page } from '@playwright/test';
import { CURRENT_RELEASE } from '../../src/data/releases';
import AxeBuilder from '@axe-core/playwright';
import JSZip from 'jszip';
import { GED_COURSE_TEMPLATES, newCourseDraft, type CourseDraft, type CourseRecord, type CourseItem } from '../../shared/courses';

test.use({ serviceWorkers: 'block' });
const lesson = (patch: Partial<CourseItem> = {}): CourseItem => ({ id: 'reading', title: 'Compare two quantities', kind: 'TEXT', content: 'A recipe uses 2 cups of rice for 3 cups of water.\n\nThe ratio of rice to water is 2:3. Explain how much water is needed for 4 cups of rice. Support your answer with a diagram or a calculation.', resourceId: '', url: '', source: 'MRLC original teaching example.', minutes: 15, ...patch });
const syllabus: CourseDraft = { ...newCourseDraft(), title: 'GED mathematics: ratios & reasoning', subject: 'Mathematical Reasoning', summary: 'Connect ratios, percentages and equations to everyday decisions. Work through examples, practise, then explain your thinking.', objectives: 'Compare quantities using ratios.\nUse a worked example to justify a solution.\nReview mistakes and choose a strategy for the next problem.', modules: [{ id: 'ratios', title: 'Ratios in everyday problems', outcomes: 'Represent a relationship between quantities and explain what it means.', items: [lesson(), lesson({ id: 'video', title: 'Watch a worked example', kind: 'VIDEO', resourceId: 'video-1', content: 'Watch how the quantities change together.' }), lesson({ id: 'practice', title: 'Try it independently', kind: 'PRACTICE', resourceId: 'practice-1', content: 'Complete the linked practice and review your feedback.' })] }, { id: 'review', title: 'Explain, check & review', outcomes: 'Identify an error and explain how to correct it.', items: [lesson({ id: 'reflection', title: 'Reflect on your strategy' })] }] };
const base: CourseRecord = { id: 'course-1', ownerId: 'teacher', ownerName: 'Sample Teacher', draft: syllabus, status: 'DRAFT', revision: 3, reviewNote: null, publishedVersion: null, enrollmentCount: 0, updatedAt: '2026-10-31T01:00:00Z' };
async function fixture(page: Page, role: 'TEACHER' | 'ADMIN' | 'STUDENT' = 'TEACHER', options: { status?: CourseRecord['status']; saveFailure?: boolean; unavailable?: boolean; listFailure?: boolean; external?: boolean; importRetry?: boolean } = {}) {
  const user = { id: role === 'TEACHER' ? 'teacher' : role.toLowerCase(), firstName: 'Sample', lastName: role, role, isActive: true, isExternalLearner: options.external, email: `${role.toLowerCase()}@example.test`, mfaEnabled: true, cursorEffect: 'NONE' };
  const writes: any[] = [], reviews: any[] = [], completed: string[] = [];
  const imports: string[] = [];
  const zip = new JSZip(); zip.file('course.json', JSON.stringify({ format: 'mrlc-course', version: 1, course: syllabus }));
  const zipBytes = await zip.generateAsync({ type: 'nodebuffer' });
  let record = structuredClone({ ...base, status: options.status ?? base.status, publishedVersion: options.status === 'PUBLISHED' ? 1 : null });
  const learning = () => ({ id: 'enrollment-1', courseId: record.id, className: 'GED A', version: 1, syllabus, assignedAt: '2026-10-31T01:00:00Z', completedIds: [...completed], unavailableIds: options.unavailable ? ['video'] : [] });
  await page.addInitScript(({ user, release }) => { sessionStorage.clear(); localStorage.clear(); sessionStorage.setItem('auth_token', 'course-fixture'); sessionStorage.setItem('auth_user', JSON.stringify(user)); localStorage.setItem(`mrlc:release-seen:${user.id}`, release); localStorage.setItem('theme', 'light'); }, { user, release: CURRENT_RELEASE.id });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname, method = route.request().method();
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (path === '/api/settings' || path === '/api/public/branding') return route.fulfill({ json: { name: 'Mon Refugee Learning Centre', cursorEffect: 'NONE' } });
    if (path === '/api/courses/options') return route.fulfill({ json: { classes: [{ id: 'class-1', name: 'GED A' }] } });
    if (path === '/api/courses/import/preview') return route.fulfill({ json: { digest: 'a'.repeat(64), course: syllabus, resources: [{ key: 'video', title: 'Worked ratio example', kind: 'VIDEO', included: true, bytes: 1024 }, { key: 'practice', title: 'Independent practice', kind: 'PRACTICE', included: false, bytes: 0 }], warnings: ['Independent practice: reconnect this practice resource after importing.', 'Included media stays staff-only until an administrator approves the course.'] } });
    if (path === '/api/courses/import') {
      const body = route.request().postDataBuffer()?.toString() || '';
      imports.push(body.match(/name="requestKey"\r\n\r\n([^\r]+)/)?.[1] || '');
      if (options.importRetry && imports.length === 1) return route.fulfill({ status: 500, json: { error: 'Could not complete the import. Please try again.' } });
      return route.fulfill({ status: 201, json: { id: 'course-1', warnings: ['Independent practice needs reconnecting.'] } });
    }
    if (path === '/api/courses/package-template' || path === '/api/courses/course-1/export') return route.fulfill({ contentType: 'application/zip', headers: { 'Content-Disposition': 'attachment; filename="mrlc-course.zip"' }, body: zipBytes });
    if (path === '/api/courses/course-1/imported-media') return route.fulfill({ json: [] });
    if (path === '/api/courses/resources') return route.fulfill({ json: [{ id: 'video-1', title: 'A worked ratio example', classId: 'class-1' }] });
    if (path === '/api/courses' && method === 'POST') { const data = route.request().postDataJSON(); writes.push(data); record = { ...record, draft: data }; return route.fulfill({ status: 201, json: record }); }
    if (path === '/api/courses') return options.listFailure ? route.fulfill({ status: 503, json: { error: 'Courses need the pending database update before they can be used.' } }) : route.fulfill({ json: [record] });
    if (path === '/api/courses/course-1' && method === 'PUT') {
      const data = route.request().postDataJSON(); writes.push(data);
      if (options.saveFailure) return route.fulfill({ status: 409, json: { error: 'A newer draft was saved. Reload it before making changes.' } });
      record = { ...record, draft: data.draft, status: 'DRAFT', revision: record.revision + 1 }; return route.fulfill({ json: { revision: record.revision, status: record.status } });
    }
    if (path === '/api/courses/course-1/submit') { record.status = 'IN_REVIEW'; record.revision++; return route.fulfill({ json: { revision: record.revision, status: record.status } }); }
    if (path === '/api/courses/course-1/review') { const body = route.request().postDataJSON(); reviews.push(body); record.status = body.decision === 'APPROVE' ? 'PUBLISHED' : 'CHANGES_REQUESTED'; record.reviewNote = body.note; record.revision++; record.publishedVersion = body.decision === 'APPROVE' ? 1 : null; return route.fulfill({ json: { ok: true } }); }
    if (path === '/api/courses/course-1/assign') return route.fulfill({ json: { assigned: 14, version: 1, revision: record.revision + 1 } });
    if (path === '/api/courses/course-1/report') return route.fulfill({ json: [{ id: 'report-1', name: 'Sample Student', className: 'GED A', version: 1, completed: 1, total: 4, percent: 25 }] });
    if (path === '/api/courses/course-1') return route.fulfill({ json: record });
    if (path === '/api/my-courses') return route.fulfill({ json: [learning()] });
    if (path === '/api/my-courses/enrollment-1') return route.fulfill({ json: learning() });
    if (path === '/api/my-courses/enrollment-1/complete') { completed.push(route.request().postDataJSON().itemId); return route.fulfill({ json: learning() }); }
    return route.fulfill({ json: [] });
  });
  return { writes, reviews, completed, imports, zipBytes };
}

test('teacher creates a GED outline and saves the syllabus', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/courses');
  await expect(page.getByRole('heading', { name: 'Courses', exact: true })).toBeVisible();
  await page.getByRole('link', { name: /Mathematical Reasoning.*modules/ }).click();
  await expect(page.getByLabel('Course title', { exact: true })).toHaveValue('GED Mathematical Reasoning');
  await page.getByLabel('Course title', { exact: true }).fill('Our GED mathematics');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page).toHaveURL(/\/courses\/course-1\/edit/);
  expect(state.writes[0].modules).toHaveLength(GED_COURSE_TEMPLATES.find(template => template.key === 'math')!.modules.length);
  expect(state.writes[0].title).toBe('Our GED mathematics');
});
test('teacher edits, reorders and connects lessons before submitting for approval', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/courses/course-1/edit');
  await page.getByRole('button', { name: 'Curriculum', exact: true }).click();
  await page.getByRole('button', { name: /Compare two quantities.*Written lesson/ }).click();
  await page.getByLabel('Lesson content', { exact: true }).fill('Read the worked ratio example, then explain your calculation.');
  await page.getByRole('button', { name: 'Move lesson down', exact: true }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  expect(state.writes[0].draft.modules[0].items[1].id).toBe('reading');
  await page.getByRole('button', { name: 'Review & assign', exact: true }).click();
  await page.getByRole('button', { name: 'Submit for approval', exact: true }).click();
  await expect(page.getByText('Awaiting review', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve & publish' })).toHaveCount(0);
});
test('administrator reviews and publishes, then assigns the approved version', async ({ page }) => {
  const state = await fixture(page, 'ADMIN', { status: 'IN_REVIEW' });
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/courses/course-1/edit');
  await page.getByRole('button', { name: 'Review & assign', exact: true }).click();
  await page.getByLabel('Review feedback').fill('Reviewed the sequence and checked the source attribution.');
  await page.getByRole('button', { name: 'Approve & publish', exact: true }).click();
  await expect(page.getByText('Published', { exact: true })).toBeVisible();
  expect(state.reviews[0].decision).toBe('APPROVE');
  await page.getByLabel('Class', { exact: true }).selectOption('class-1');
  await page.getByRole('button', { name: 'Assign to class', exact: true }).click();
  await expect(page.getByText('14 new assignments for published version 1.')).toBeVisible();
  await page.getByRole('button', { name: 'Student progress', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sample Student' })).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
});
test('a failed save keeps the teacher draft and shows the conflict', async ({ page }) => {
  await fixture(page, 'TEACHER', { saveFailure: true });
  await page.goto('/courses/course-1/edit');
  await page.getByLabel('Course title', { exact: true }).fill('Unsaved teacher revision');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('A newer draft was saved');
  await expect(page.getByLabel('Course title', { exact: true })).toHaveValue('Unsaved teacher revision');
  await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible();
});
test('students follow the assigned syllabus and cannot manually complete linked activities', async ({ page }) => {
  const state = await fixture(page, 'STUDENT');
  await page.goto('/courses');
  await page.getByRole('link', { name: 'Start course', exact: true }).click();
  await page.getByRole('button', { name: 'Start learning', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Compare two quantities', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mark complete & continue', exact: true }).click();
  expect(state.completed).toEqual(['reading']);
  await expect(page.getByRole('heading', { name: 'Watch a worked example', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open uploaded video lesson', exact: true })).toHaveAttribute('href', '/videos/video-1');
  await expect(page.getByRole('button', { name: 'Mark complete & continue', exact: true })).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
});
test('unavailable resources stay in the syllabus with recovery guidance', async ({ page }) => {
  await fixture(page, 'STUDENT', { unavailable: true });
  await page.goto('/courses/learn/enrollment-1?lesson=video');
  await expect(page.getByText('This resource is no longer available to your class.', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open uploaded video lesson', exact: true })).toHaveCount(0);
});
test('draft preview does not write student progress', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/courses/course-1/preview?lesson=reading');
  await expect(page.getByText('Draft preview', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark complete & continue', exact: true })).toHaveCount(0);
  expect(state.completed).toEqual([]);
});
test('linked activities keep the school session and provide a return to course', async ({ page }) => {
  await fixture(page, 'STUDENT');
  await page.goto('/courses/learn/enrollment-1?lesson=video');
  const open = page.getByRole('link', { name: 'Open uploaded video lesson', exact: true });
  await expect(open).not.toHaveAttribute('target', '_blank');
  await open.click();
  await expect(page).toHaveURL(/\/videos\/video-1/);
  await page.getByRole('link', { name: 'Return to course', exact: true }).click();
  await expect(page).toHaveURL(/\/courses\/learn\/enrollment-1\?lesson=video/);
  await expect(page.getByRole('heading', { name: 'Watch a worked example', exact: true })).toBeVisible();
});
test('teacher can add modules and select existing learning resources', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/courses/course-1/edit');
  await page.getByRole('button', { name: 'Curriculum', exact: true }).click();
  await page.getByRole('button', { name: 'Module', exact: true }).click();
  await page.getByLabel('Module title', { exact: true }).fill('Worked examples');
  await page.getByLabel('Learning outcome', { exact: true }).fill('Explain the steps in a worked ratio example.');
  await page.getByRole('button', { name: 'Add lesson', exact: true }).click();
  await page.getByLabel('Lesson type', { exact: true }).selectOption('VIDEO');
  await page.getByLabel('Learning resource', { exact: true }).selectOption('video-1');
  await expect(page.getByLabel('Lesson title', { exact: true })).toHaveValue('A worked ratio example');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  expect(state.writes[0].draft.modules.at(-1).items[0].resourceId).toBe('video-1');
});
test('course loading failures display a retry instead of an empty catalog', async ({ page }) => {
  await fixture(page, 'TEACHER', { listFailure: true });
  await page.goto('/courses');
  await expect(page.getByRole('alert')).toContainText('pending database update');
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
});
test('offline packages are previewed and imported as new drafts', async ({ page }, testInfo) => {
  const state = await fixture(page);
  await page.goto('/courses');
  await page.getByRole('link', { name: 'Import course', exact: true }).click();
  await page.getByLabel('Course ZIP', { exact: true }).setInputFiles({ name: 'offline-course.zip', mimeType: 'application/zip', buffer: state.zipBytes });
  await page.getByRole('button', { name: 'Preview package', exact: true }).click();
  await expect(page.getByRole('heading', { name: syllabus.title, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import as new draft', exact: true })).toBeDisabled();
  await expect(page.getByText('Reconnect after import', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel('I may copy and share these materials in this school’s LMS.', { exact: true }).scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  expect((await new AxeBuilder({ page }).include('.courses-workspace').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('course-import-preview.png'), fullPage: true });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await expect(page.getByRole('button', { name: 'Preview package', exact: true })).toHaveCSS('color', 'rgb(237, 242, 250)');
  expect((await new AxeBuilder({ page }).include('.courses-workspace').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('course-import-preview-dark.png'), fullPage: true });
  await page.getByLabel('I may copy and share these materials in this school’s LMS.', { exact: true }).check();
  await page.getByRole('button', { name: 'Import as new draft', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your course draft is ready', exact: true })).toBeVisible();
  expect(state.imports).toHaveLength(1);
  await page.getByRole('link', { name: 'Open imported draft', exact: true }).click();
  await expect(page).toHaveURL(/\/courses\/course-1\/edit/);
});
test('failed imports retain the selected package and reuse their retry key', async ({ page }) => {
  const state = await fixture(page, 'TEACHER', { importRetry: true });
  await page.goto('/courses/import');
  await page.getByLabel('Course ZIP', { exact: true }).setInputFiles({ name: 'offline-course.zip', mimeType: 'application/zip', buffer: state.zipBytes });
  await page.getByRole('button', { name: 'Preview package', exact: true }).click();
  await page.getByLabel('I may copy and share these materials in this school’s LMS.', { exact: true }).check();
  await page.getByRole('button', { name: 'Import as new draft', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Please try again');
  await page.getByRole('button', { name: 'Import as new draft', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your course draft is ready', exact: true })).toBeVisible();
  expect(state.imports[0]).toBeTruthy(); expect(state.imports[0]).toBe(state.imports[1]);
});
test('saved courses export a ZIP with explicit media permission', async ({ page }) => {
  await fixture(page);
  await page.goto('/courses/course-1/edit');
  await page.getByRole('button', { name: 'Export ZIP', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Download ZIP', exact: true })).toBeDisabled();
  await page.getByLabel('I may copy and transfer the included materials.', { exact: true }).check();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download ZIP', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('mrlc-course.zip');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('Course title', { exact: true }).fill('Unsaved change');
  await expect(page.getByRole('button', { name: 'Export ZIP', exact: true })).toBeDisabled();
});
test('starter downloads and invalid ZIP selections have clear recovery', async ({ page }) => {
  await fixture(page);
  await page.goto('/courses/import');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download starter ZIP', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('mrlc-course.zip');
  await page.getByLabel('Course ZIP', { exact: true }).setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Not a course package') });
  await expect(page.getByRole('alert')).toContainText('Choose an MRLC .zip package');
  await expect(page.getByRole('button', { name: 'Preview package', exact: true })).toBeDisabled();
});
test('course editor and learner views fit narrow screens in both themes', async ({ page }, testInfo) => {
  await fixture(page);
  await page.goto('/courses/course-1/edit');
  await page.getByRole('button', { name: 'Curriculum', exact: true }).click();
  await page.getByRole('button', { name: /Compare two quantities.*Written lesson/ }).click();
  await expect(page.getByLabel('Lesson content', { exact: true })).toBeVisible();
  await page.getByLabel('Lesson content', { exact: true }).scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include('.courses-workspace').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('course-editor-light.png'), fullPage: true });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  // Wait for the existing button color transition before measuring contrast.
  await expect(page.getByRole('button', { name: 'Add lesson', exact: true })).toHaveCSS('color', 'rgb(237, 242, 250)');
  expect((await new AxeBuilder({ page }).include('.courses-workspace').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('course-editor-dark.png'), fullPage: true });
  await page.goto('/courses/course-1/preview');
  await expect(page.getByRole('heading', { name: 'Your learning path', exact: true })).toBeVisible();
  await page.getByRole('heading', { name: 'Your learning path', exact: true }).scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('course-learner.png'), fullPage: true });
});
