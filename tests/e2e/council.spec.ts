import { test, expect, type Page } from '@playwright/test';
import { CURRENT_RELEASE } from '../../src/data/releases';
test.use({ serviceWorkers: 'block' });
async function fixture(page: Page, theme = 'light') {
    const user = { id: 'council-ui', role: 'STAFF', firstName: 'Council', lastName: 'Reviewer', email: 'test@example.invalid', isActive: true, mfaEnabled: true, cursorEffect: 'NONE' };
    await page.addInitScript(({ user, release, theme }) => { sessionStorage.setItem('auth_token', 'fixture'); sessionStorage.setItem('auth_user', JSON.stringify(user)); localStorage.setItem(`mrlc:release-seen:${user.id}`, release); localStorage.setItem('mrlc-lms-theme', theme); }, { user, release: CURRENT_RELEASE.id, theme });
    const students = [{ id: 's1', studentCode: 'GED01', preferredName: 'Mi Su', boardingType: 'BOARDING' }, { id: 's2', studentCode: 'GED02', preferredName: 'Nai Min', boardingType: 'BOARDING' }];
    let entry = { id: 'e1', date: '2026-11-05', dutyNumber: 1, dutyName: 'Kitchen and meals', dutyType: 'COOKING', instructions: 'Breakfast 8 AM. Wash utensils after use.', groupNumber: 1, groupName: 'Morning team', members: [{ id: 's1', name: 'Mi Su' }], status: 'PENDING', rating: null, note: '', version: 0 };
    let topic: any = { id: 't1', title: 'Kitchen supplies', body: 'Can we restock soap?', category: 'School life', authorName: 'Mi Su', createdAt: '2026-11-05T00:00:00Z', locked: false, pinned: false, hidden: false, _count: { replies: 0 }, replies: [] };
    const writes: any[] = [];
    await page.route('**/api/**', async (route) => {
        const req = route.request(), url = new URL(req.url()), path = url.pathname;
        if (req.method() !== 'GET')
            writes.push({ path, body: req.postDataJSON() });
        if (path === '/api/auth/me')
            return route.fulfill({ json: { user } });
        if (path === '/api/settings' || path === '/api/public/branding')
            return route.fulfill({ json: { name: 'Mon Refugee Learning Centre', shortName: 'MRLC', cursorEffect: 'NONE' } });
        if (path.endsWith('/stream'))
            return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
        if (path === '/api/council/workspace')
            return route.fulfill({ json: { staff: true, canManage: true, today: '2026-11-05', members: [], students, plans: [], appointments: [] } });
        if (path === '/api/council/entries')
            return route.fulfill({ json: [entry] });
        if (path === '/api/council/entries/e1') {
            entry = { ...entry, ...req.postDataJSON(), version: 1 };
            return route.fulfill({ json: { ok: true } });
        }
        if (path === '/api/council/plans')
            return route.fulfill({ status: 201, json: { id: 'p1' } });
        if (path === '/api/council/forum' && req.method() === 'POST') {
            topic = { ...topic, ...req.postDataJSON() };
            return route.fulfill({ status: 201, json: topic });
        }
        if (path === '/api/council/forum')
            return route.fulfill({ json: { topics: [topic], count: 1 } });
        if (path === '/api/council/forum/t1/replies') {
            topic.replies.push({ id: 'r1', authorName: 'Council Reviewer', createdAt: '2026-11-05T01:00:00Z', ...req.postDataJSON() });
            topic._count.replies++;
            return route.fulfill({ status: 201, json: topic.replies[0] });
        }
        if (path === '/api/council/forum/t1/reports')
            return route.fulfill({ status: 201, json: { id: 'report1' } });
        if (path === '/api/council/forum/t1') {
            if (req.method() === 'PATCH')
                topic = { ...topic, ...req.postDataJSON() };
            return route.fulfill({ json: topic });
        }
        return route.fulfill({ json: [] });
    });
    return writes;
}
async function fits(page: Page) { await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); }
test('weekly roster can be divided, previewed and published; check-ins keep feedback', async ({ page }) => {
    const writes = await fixture(page);
    await page.goto('/council');
    await expect(page.getByRole('heading', { name: 'Student Council', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Review duty' }).click();
    await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('COMPLETED');
    await page.getByRole('combobox', { name: 'Points', exact: true }).selectOption('4');
    await page.getByLabel('Duty feedback').fill('Kitchen cleaned after breakfast.');
    await page.getByRole('button', { name: 'Save check-in' }).click();
    await expect(page.getByText('4 / 5 points')).toBeVisible();
    await page.getByRole('button', { name: 'Teams & rotation' }).click();
    await page.getByRole('button', { name: 'Select shown' }).click();
    await page.getByLabel('Number of teams').fill('2');
    await page.getByRole('button', { name: 'Divide 2 students evenly' }).click();
    await page.getByLabel('Group name').first().fill('Morning team');
    await page.getByRole('button', { name: 'Review rotation' }).click();
    await expect(page.getByRole('heading', { name: 'Weekly handovers' })).toBeVisible();
    await fits(page);
    await page.screenshot({ path: test.info().outputPath('rotation.png'), fullPage: true });
    await page.getByRole('button', { name: 'Publish rotation' }).click();
    await expect(page.getByRole('heading', { name: 'Seven-day register' })).toBeVisible();
    const saved = writes.find(w => w.path === '/api/council/plans').body;
    expect(saved.groups[0].name).toBe('Morning team');
    expect(saved.rotationDays).toBe(7);
    expect(saved.groups.flatMap((g: any) => g.studentIds)).toHaveLength(2);
});
test('forum supports a topic, reply, private report and closed discussion in dark mode', async ({ page }) => {
    await fixture(page, 'dark');
    await page.goto('/student-forum');
    await page.getByRole('button', { name: 'Start a discussion' }).click();
    await page.getByLabel('Title', { exact: true }).fill('Library study groups');
    await page.getByLabel('Your message').fill('Who wants to study together on Friday?');
    await page.getByRole('button', { name: 'Post discussion' }).click();
    await expect(page.getByRole('heading', { name: 'Library study groups' })).toBeVisible();
    await page.getByLabel('Add your reply').fill('I can join after cleaning.');
    await page.getByRole('button', { name: 'Post reply', exact: true }).click();
    await expect(page.getByText('I can join after cleaning.')).toBeVisible();
    await page.getByRole('button', { name: 'Report discussion' }).click();
    await page.getByLabel('What should staff review?').fill('Please check this discussion.');
    await page.getByRole('button', { name: 'Send report' }).click();
    await expect(page.getByText('Report sent to staff.', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Close replies' }).click();
    await expect(page.getByText('This discussion is closed to new replies.')).toBeVisible();
    await fits(page);
    await page.screenshot({ path: test.info().outputPath('forum-dark.png'), fullPage: true });
});
test('council register and forum stay readable, accessible and recover from loading failures', async ({ page }) => {
    await fixture(page, 'dark');
    await page.goto('/council');
    await expect(page.getByRole('heading', { name: 'Seven-day register' })).toBeVisible();
    await fits(page);
    await page.screenshot({ path: test.info().outputPath('register-dark.png') });
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    const audit = await new AxeBuilder({ page }).include('.council-page').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);
    await page.getByRole('button', { name: 'Council & handbook' }).click();
    await expect(page.getByText('MRLC GED Preparation Program · 2025–2026 edition')).toBeVisible();
    await fits(page);
    await page.goto('/student-forum');
    await expect(page.getByRole('heading', { name: 'Kitchen supplies' })).toBeVisible();
    const categoryButtons = page.getByRole('navigation', { name: 'Forum categories' }).getByRole('button');
    const boxes = await categoryButtons.evaluateAll(elements => elements.map(e => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top }; }));
    for (let i = 1; i < boxes.length; i++)
        if (Math.abs(boxes[i].top - boxes[i - 1].top) < 1)
            expect(boxes[i].left).toBeGreaterThanOrEqual(boxes[i - 1].right);
    await page.screenshot({ path: test.info().outputPath('forum-list-dark.png') });
    await page.route('**/api/council/forum?*', route => route.fulfill({ status: 503, json: { error: 'Discussion service temporarily unavailable' } }));
    await page.getByRole('button', { name: 'Study together', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Discussion service temporarily unavailable');
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});
