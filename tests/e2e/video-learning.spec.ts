import { expect, test, type Page } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
const video = { id: 'learning-video', title: 'Cave safety', videoUrl: 'https://youtu.be/-mzqQ_vNiKg', duration: 540, classId: 'class-a', status: 'PUBLISHED', visibility: 'ALL', uploadedById: 'teacher-learning', uploadedByName: 'Teacher', createdAt: '2026-09-17T06:00:00Z' };
async function fixture(page: Page, role = 'STUDENT') {
  const user = { id: role === 'TEACHER' ? 'teacher-learning' : 'student-learning', role, firstName: 'Learning', lastName: 'Tester', isActive: true };
  const writes: { path: string; body: any }[] = [];
  let learning = { examId: 'quiz-a', homeworkId: 'homework-a', requireQuiz: true, chapters: [{ title: 'Introduction', seconds: 0 }, { title: 'Safety rules', seconds: 90 }], quiz: { id: 'quiz-a', title: 'Safety check', status: 'submitted', href: role === 'STUDENT' ? '/exams/quiz-a/take' : '/exams/quiz-a' }, homework: { id: 'homework-a', title: 'Safety reflection', status: 'not_submitted', href: role === 'STUDENT' ? '/student/homework?assignment=homework-a' : '/teacher/homework/homework-a' }, learningComplete: false };
  let notes: any[] = []; let playlists: any[] = [];
  await page.addInitScript(user => {
    sessionStorage.setItem('auth_token', 'fixture'); sessionStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem(`mrlc:release-seen:${user.id}`, '2026-09-06-language-quest-course-path');
    const state: any = { seconds: 0, duration: 600, playing: 2, seeks: [] };
    (window as any).__youtube = state;
    (window as any).YT = { Player: class {
      constructor(_frame: any, opts: any) { state.events = opts.events; setTimeout(() => opts.events.onReady({ target: this }), 20); }
      getCurrentTime() { return state.seconds; } getDuration() { return state.duration; } getPlayerState() { return state.playing; }
      seekTo(seconds: number) { state.seconds = seconds; state.seeks.push(seconds); } destroy() {} playVideo() { state.playing = 1; }
    } };
  }, user);
  await page.route('https://www.youtube.com/embed/**', route => route.fulfill({ contentType: 'text/html', body: 'Local player fixture' }));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname; const method = route.request().method();
    if (['POST', 'PUT', 'DELETE'].includes(method)) writes.push({ path, body: route.request().postData() ? route.request().postDataJSON() : null });
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (path === '/api/videos/learning-video') return route.fulfill({ json: video });
    if (path === '/api/videos') return route.fulfill({ json: [video, { ...video, id: 'second-video', title: 'Fieldwork preparation' }] });
    if (path.endsWith('/progress')) return route.fulfill({ json: method === 'POST' ? { ...route.request().postDataJSON(), resumePosition: route.request().postDataJSON().currentPosition } : { currentPosition: 180, resumePosition: 90, isCompleted: false } });
    if (path.endsWith('/learning/options')) return route.fulfill({ json: { exams: [{ id: 'quiz-a', title: 'Safety check', status: 'PUBLISHED', passMark: 6 }], homeworks: [{ id: 'homework-a', title: 'Safety reflection', status: 'OPEN' }] } });
    if (path.endsWith('/learning/report')) return route.fulfill({ json: [{ studentId: 'student-a', name: 'Student A', watched: false, quiz: 'submitted', homework: 'not_submitted', learningComplete: false }] });
    if (path.endsWith('/learning/reminders')) return route.fulfill({ json: { sent: 1 } });
    if (path.endsWith('/learning')) { if (method === 'PUT') learning = { ...learning, ...route.request().postDataJSON() }; return route.fulfill({ json: learning }); }
    if (path.endsWith('/notes')) { if (method === 'POST') notes.push({ id: 'note-a', userId: user.id, author: 'You', reply: null, ...route.request().postDataJSON() }); return route.fulfill({ json: method === 'POST' ? notes.at(-1) : notes }); }
    if (path === '/api/video-playlists') { if (method === 'POST') { const data = route.request().postDataJSON(); playlists.push({ ...data, id: 'playlist-a', canManage: true, lessons: data.videoIds.map((id: string) => ({ id, title: id === video.id ? video.title : 'Fieldwork preparation' })) }); } return route.fulfill({ json: method === 'POST' ? playlists.at(-1) : playlists }); }
    if (path.endsWith('/analytics')) return route.fulfill({ json: { total: 0, completed: 0, inProgress: 0, notStarted: 0, roster: [] } });
    return route.fulfill({ json: path.includes('settings') ? {} : [] });
  });
  return writes;
}

test('YouTube resumes, saves actual duration on pause, chapters seek and notes preserve the timestamp', async ({ page }, info) => {
  const writes = await fixture(page);
  await page.goto('/videos/learning-video');
  await expect.poll(() => page.evaluate(() => (window as any).__youtube.seeks)).toEqual([90]);
  await expect(page.getByRole('link', { name: 'Safety check', exact: true })).toHaveAttribute('href', '/exams/quiz-a/take');
  await expect(page.getByRole('link', { name: 'Safety reflection', exact: true })).toHaveAttribute('href', '/student/homework?assignment=homework-a');
  await expect(page.getByText('submitted · passing score required', { exact: true })).toBeVisible();
  await page.evaluate(() => { const p = (window as any).__youtube; p.seconds = 200; p.playing = 1; });
  await expect.poll(() => writes.filter(w => w.path.endsWith('/progress')).length).toBeGreaterThan(0);
  expect(writes.find(w => w.path.endsWith('/progress'))?.body).toMatchObject({ currentPosition: 200, duration: 600, isCompleted: false });
  await page.evaluate(() => { const p = (window as any).__youtube; p.seconds = 205; p.playing = 2; p.events.onStateChange({ data: 2 }); });
  await expect.poll(() => writes.filter(w => w.path.endsWith('/progress')).at(-1)?.body.currentPosition).toBe(205);
  await page.getByRole('button', { name: 'Use Current Time', exact: true }).click();
  await expect(page.getByLabel('Timestamp (seconds)')).toHaveValue('205');
  await page.getByLabel('Your private note').fill('Remember to check the weather.');
  await page.getByRole('button', { name: 'Save Note', exact: true }).click();
  await expect(page.getByText('Remember to check the weather.', { exact: true })).toBeVisible();
  expect(writes.find(w => w.path.endsWith('/notes'))?.body).toMatchObject({ seconds: 205, isQuestion: false });
  await page.getByRole('button', { name: /1:30.*Safety rules/ }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__youtube.seconds)).toBe(90);
  await page.evaluate(() => { const p = (window as any).__youtube; p.seconds = 600; p.events.onStateChange({ data: 0 }); });
  await expect.poll(() => writes.filter(w => w.path.endsWith('/progress')).at(-1)?.body.isCompleted).toBe(true);
  await expect(page.getByRole('button', { name: 'Configure Activities' })).toHaveCount(0);
  await page.evaluate(() => (window as any).__youtube.events.onError({ data: 150 }));
  await expect(page.getByRole('alert').filter({ hasText: 'owner does not allow' })).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: info.outputPath(`learning-student-${width}.png`), fullPage: true });
  }
});

test('teacher configures activities, preserves unsaved chapters during note refresh, sends confirmed reminders and orders a unit', async ({ page }, info) => {
  const writes = await fixture(page, 'TEACHER');
  await page.goto('/videos/learning-video');
  await page.getByRole('button', { name: 'Configure Activities', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Create a Quiz in Assessments', exact: true })).toHaveAttribute('href', '/exams/new?type=QUIZ');
  await page.getByLabel('Chapter 2 title', { exact: true }).fill('Updated safety rules');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.getByLabel('Linked quiz', { exact: true }).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: info.outputPath(`activity-editor-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Toggle theme between light and dark mode', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Dark', exact: true }).click();
  await page.getByLabel('Linked quiz', { exact: true }).scrollIntoViewIfNeeded();
  expect(await page.getByLabel('Linked quiz', { exact: true }).evaluate(e => e.getBoundingClientRect().height)).toBeGreaterThanOrEqual(40);
  await page.screenshot({ path: info.outputPath('activity-editor-dark.png'), fullPage: true });
  await page.getByLabel('Your private note').fill('Review this before class.');
  await page.getByRole('button', { name: 'Save Note', exact: true }).click();
  await expect(page.getByText('Review this before class.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Chapter 2 title', { exact: true })).toHaveValue('Updated safety rules');
  await page.getByRole('button', { name: 'Save Activities', exact: true }).click();
  await expect.poll(() => writes.filter(w => w.path.endsWith('/learning')).length).toBe(1);
  expect(writes.find(w => w.path.endsWith('/learning'))?.body).toMatchObject({ examId: 'quiz-a', homeworkId: 'homework-a', requireQuiz: true, chapters: [{ title: 'Introduction', seconds: 0 }, { title: 'Updated safety rules', seconds: 90 }] });
  await page.getByRole('region', { name: 'Learning report', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('learning-report-dark.png'), fullPage: true });
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Remind About Homework', exact: true }).click();
  await expect.poll(() => writes.filter(w => w.path.endsWith('/reminders')).length).toBe(1);
  await page.goto('/teacher/videos');
  await page.getByRole('button', { name: 'New Playlist', exact: true }).click();
  await page.getByLabel('Playlist Title', { exact: true }).fill('Outdoor safety unit');
  await page.getByLabel('Cave safety', { exact: true }).check();
  await page.getByLabel('Fieldwork preparation', { exact: true }).check();
  await page.getByRole('button', { name: 'Move lesson 2 up', exact: true }).click();
  await page.getByRole('button', { name: 'Save Playlist', exact: true }).click();
  await expect.poll(() => writes.filter(w => w.path === '/api/video-playlists').length).toBe(1);
  expect(writes.find(w => w.path === '/api/video-playlists')?.body.videoIds).toEqual(['second-video', 'learning-video']);
  await expect(page.getByText('Outdoor safety unit', { exact: false })).toBeVisible();
  await page.goto('/exams/new?type=QUIZ');
  await expect(page.getByRole('combobox').filter({ hasText: 'Quiz' })).toBeVisible();
});
