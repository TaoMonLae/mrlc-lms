import { CURRENT_RELEASE } from '../../src/data/releases';
import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

const classroom = { id: 'class-a', name: 'GED Year 1', level: 'GED', academicYear: '2026' };

async function fixture(page: Page, role: 'TEACHER' | 'STUDENT') {
  const user = { id: `${role}-classwork-test`, role, firstName: role, lastName: 'Tester', isActive: true };
  const created: any[] = [];
  await page.addInitScript(({ user, releaseId }) => {
    sessionStorage.setItem('auth_token', 'classwork-test');
    sessionStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem(`mrlc:release-seen:${user.id}`, releaseId);
  }, { user, releaseId: CURRENT_RELEASE.id });
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (path === '/api/classwork/classes') return route.fulfill({ json: [classroom] });
    if (path === '/api/classwork/classes/class-a') return route.fulfill({ json: {
      class: classroom,
      canManage: role === 'TEACHER',
      topics: [],
      items: [{
        id: 'HOMEWORK:homework-a', sourceType: 'HOMEWORK', sourceId: 'homework-a', kind: 'HOMEWORK',
        title: 'Explain the water cycle', description: 'Describe the stages.', subject: 'Science',
        dueDate: '2026-10-01T00:00:00Z', createdAt: '2026-09-29T00:00:00Z',
        href: role === 'TEACHER' ? '/teacher/homework/homework-a' : '/student/homework?assignment=homework-a',
        status: role === 'TEACHER' ? '1 to review' : 'REDO', topicId: null, pinned: false,
        actionable: role === 'STUDENT',
        ...(role === 'TEACHER' && { homeworkProgress: { submitted: 2, marked: 1, needsReview: 1, total: 3 } }),
      }],
    } });
    if (path === '/api/homework' && route.request().method() === 'POST') {
      created.push(route.request().postDataJSON());
      return route.fulfill({ status: 201, json: { id: 'homework-new' } });
    }
    if (path === '/api/homework') return route.fulfill({ json: [
      {
        id: 'homework-a', title: 'Explain the water cycle', dueDate: '2026-10-01T00:00:00Z',
        maxMarks: 10, status: 'OPEN', class: { ...classroom, _count: { students: 3 } },
        subject: { id: 'science', name: 'Science' },
        submissions: [{ id: 'submission-a', status: 'SUBMITTED', submittedAt: '2026-09-29T00:00:00Z' }],
      },
      {
        id: 'homework-b', title: 'Other class task', dueDate: '2026-10-02T00:00:00Z',
        maxMarks: null, status: 'OPEN', class: { id: 'class-b', name: 'GED Year 2', _count: { students: 3 } },
        subject: null,
        submissions: [
          { id: 'submission-b1', status: 'SUBMITTED', submittedAt: '2026-09-29T00:00:00Z' },
          { id: 'submission-b2', status: 'SUBMITTED', submittedAt: '2026-09-29T00:00:00Z' },
        ],
      },
    ] });
    if (path === '/api/teacher/classes') return route.fulfill({ json: [{ classInfo: classroom }] });
    if (path === '/api/subjects') return route.fulfill({ json: [{ id: 'science', name: 'Science' }] });
    if (path === '/api/student/homework') return route.fulfill({ json: [{
      id: 'homework-a', title: 'Explain the water cycle', instructions: 'Describe the stages.',
      dueDate: '2026-10-01T00:00:00Z', maxMarks: 10, status: 'OPEN', subjectName: 'Science',
      mySubmission: { id: 'submission-a', text: 'First draft', submittedAt: '2026-09-29T00:00:00Z', status: 'REDO', feedback: 'Please add condensation.' },
    }] });
    return route.fulfill({ json: path.includes('settings') ? {} : [] });
  });
  return created;
}

test('student can resume work needing changes from the classroom', async ({ page }, info) => {
  await fixture(page, 'STUDENT');
  await page.goto('/classwork?class=class-a');
  await expect(page.getByRole('heading', { name: '1 homework assignment to work on' })).toBeVisible();
  await expect(page.locator('.cw-focus-row').getByText('Changes requested')).toBeVisible();
  await page.locator('.cw-workspace').screenshot({ path: info.outputPath('student-classwork.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.cw-workspace').screenshot({ path: info.outputPath('student-classwork-mobile.png') });
  await page.getByRole('link', { name: /Revise work/ }).click();
  await expect(page).toHaveURL(/\/student\/homework\?assignment=homework-a$/);
  await expect(page.getByText('Please add condensation.')).toBeVisible();
});

test('teacher sees review progress and assigns homework within the selected class', async ({ page }, info) => {
  const created = await fixture(page, 'TEACHER');
  await page.goto('/classwork?class=class-a');
  await expect(page.getByRole('heading', { name: '1 submission to review' })).toBeVisible();
  await expect(page.getByText('2/3 turned in')).toBeVisible();
  await page.locator('.cw-workspace').screenshot({ path: info.outputPath('teacher-classwork.png') });
  await page.getByRole('link', { name: 'See all homework' }).click();
  await expect(page.getByRole('heading', { name: '1 submission ready for your attention.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Other class task/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'View review queue' }).click();
  await expect(page.getByRole('link', { name: /Other class task/ })).toHaveCount(0);
  await page.getByRole('link', { name: '← Back to classwork' }).click();
  await page.getByRole('link', { name: 'New homework' }).click();
  await expect(page.getByRole('combobox', { name: 'Assignment class' })).toContainText('GED Year 1');
  await page.getByLabel('Title *').fill('Draw the water cycle');
  await page.getByRole('button', { name: 'Assign to class' }).click();
  await expect.poll(() => created.length).toBe(1);
  expect(created[0].classId).toBe('class-a');
  await expect(page).toHaveURL(/\/classwork\?class=class-a$/);
});
