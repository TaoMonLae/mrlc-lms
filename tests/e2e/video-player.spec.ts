import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRENT_RELEASE } from '../../src/data/releases';
import { expect, test, type Locator, type Page } from '@playwright/test';
test.use({ serviceWorkers: 'block' });

// A 30-second, near-static VP8/Vorbis clip (WebM plays in the open-source
// Chromium build that Playwright ships; H.264 does not). The stored duration is
// deliberately wrong so the test proves the player trusts the media, not the
// database. Byte-range requests are honoured because Chromium only seeks media
// whose server supports them, exactly like the real upload route.
const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const video = { id: 'direct-lesson', title: 'Direct file lesson', description: 'Served as a direct video URL.', videoUrl: 'https://media.example.test/lesson.webm', captionsUrl: 'https://media.example.test/lesson.vtt', thumbnailUrl: null, duration: 999, classId: null, className: null, subjectId: null, subjectName: null, status: 'PUBLISHED', visibility: 'ALL', isRequired: false, dueDate: null, uploadedById: 'teacher-player', uploadedByName: 'Teacher', createdAt: '2026-09-17T06:00:00Z' };

async function fixture(page: Page) {
  const user = { id: 'student-player', role: 'STUDENT', firstName: 'Player', lastName: 'Tester', isActive: true };
  await page.addInitScript(({ user, releaseId }) => {
    sessionStorage.setItem('auth_token', 'fixture'); sessionStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem(`mrlc:release-seen:${user.id}`, releaseId);
  }, { user, releaseId: CURRENT_RELEASE.id });
  await page.route('https://media.example.test/**', async route => {
    const file = new URL(route.request().url()).pathname.split('/').pop()!;
    const body = await fs.promises.readFile(path.join(fixtures, file));
    const contentType = file.endsWith('.vtt') ? 'text/vtt' : 'video/webm';
    const range = route.request().headers().range?.match(/bytes=(\d*)-(\d*)/);
    if (!range) return route.fulfill({ status: 200, body, headers: { 'content-type': contentType, 'accept-ranges': 'bytes', 'content-length': String(body.length) } });
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
    return route.fulfill({ status: 206, body: body.subarray(start, end + 1), headers: { 'content-type': contentType, 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${body.length}`, 'content-length': String(end - start + 1) } });
  });
  await page.route('**/api/**', route => {
    const p = new URL(route.request().url()).pathname; const method = route.request().method();
    if (p.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    if (p === '/api/auth/me') return route.fulfill({ json: { user } });
    if (p === '/api/videos/direct-lesson') return route.fulfill({ json: video });
    if (p.endsWith('/progress')) return route.fulfill({ json: method === 'POST' ? { ...route.request().postDataJSON(), resumePosition: route.request().postDataJSON().currentPosition } : { currentPosition: 12, resumePosition: 12, isCompleted: false } });
    if (p.endsWith('/learning')) return route.fulfill({ json: { examId: null, homeworkId: null, requireQuiz: false, chapters: [{ title: 'Intro', seconds: 0 }, { title: 'Ending', seconds: 20 }], quiz: null, homework: null, learningComplete: false } });
    return route.fulfill({ json: p.includes('settings') ? {} : [] });
  });
  await page.goto('/videos/direct-lesson');
  const player = page.locator('video');
  await expect(player).toBeVisible();
  await expect.poll(() => player.evaluate(element => (element as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(1);
  return player;
}
const currentTime = (player: Locator) => player.evaluate(element => Math.round((element as HTMLVideoElement).currentTime));
const barOpacity = (page: Page) => page.getByRole('toolbar', { name: 'Video playback controls' }).locator('..').evaluate(element => getComputedStyle(element).opacity);

test('direct video: media duration, resume badge, mute, fullscreen frame and chapter seek', async ({ page, isMobile }) => {
  const player = await fixture(page);
  const press = (target: Locator) => isMobile ? target.tap() : target.click();
  await expect(page.getByRole('toolbar', { name: 'Video playback controls' })).toContainText('0:12 / 0:30');
  expect(await currentTime(player)).toBe(12);
  const badge = page.getByText('Resuming from 0:12');
  await expect(badge).toBeVisible();
  await press(page.getByRole('button', { name: 'Play video' }));
  await expect(page.getByRole('button', { name: 'Pause video' })).toBeVisible();
  await expect(badge).toHaveCount(0);
  await press(page.getByRole('button', { name: 'Pause video' }));
  // The collapsed volume slider must not swallow the tap on Mute.
  await press(page.getByRole('button', { name: 'Mute' }));
  expect(await player.evaluate(element => (element as HTMLVideoElement).muted)).toBe(true);
  await press(page.getByRole('button', { name: 'Unmute' }));
  expect(await player.evaluate(element => (element as HTMLVideoElement).muted)).toBe(false);
  await expect(page.getByRole('button', { name: 'Show captions' }).or(page.getByRole('button', { name: 'Hide captions' }))).toBeVisible();
  // Fullscreen wraps the frame (video + custom controls), not the bare <video>.
  await press(page.getByRole('button', { name: 'Enter fullscreen' }));
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.getAttribute('aria-label') ?? null)).toBe('Lesson video player');
  await press(page.getByRole('button', { name: 'Exit fullscreen' }));
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
  await press(page.getByRole('button', { name: /0:20.*Ending/ }));
  await expect.poll(() => currentTime(player)).toBe(20);
});

test('direct video: controls hide while playing, return on pointer or keyboard, and the slider unmutes', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Hover and keyboard behaviour is a desktop concern.');
  const player = await fixture(page);
  const region = page.getByRole('region', { name: 'Lesson video player' });
  await page.getByRole('button', { name: 'Play video' }).click();
  await page.mouse.move(5, 5);
  await expect.poll(() => barOpacity(page), { timeout: 6000 }).toBe('0');
  // Moving over the picture (not only the control bar) brings the controls back.
  await region.hover({ position: { x: 120, y: 80 } });
  await region.hover({ position: { x: 140, y: 80 } });
  await expect.poll(() => barOpacity(page)).toBe('1');
  await page.mouse.move(5, 5);
  await expect.poll(() => barOpacity(page), { timeout: 6000 }).toBe('0');
  await page.getByRole('button', { name: 'Pause video' }).focus();
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Pause video' })).toBeFocused();
  await expect.poll(() => barOpacity(page)).toBe('1');
  await page.getByRole('button', { name: 'Pause video' }).click();
  await page.getByRole('button', { name: 'Mute' }).click();
  await page.getByRole('slider', { name: 'Volume' }).focus();
  await page.getByRole('slider', { name: 'Volume' }).fill('0.5');
  expect(await player.evaluate(element => [(element as HTMLVideoElement).muted, (element as HTMLVideoElement).volume])).toEqual([false, 0.5]);
  await expect(page.getByRole('button', { name: 'Mute' })).toBeVisible();
  await page.getByRole('button', { name: /Playback speed/ }).click();
  await expect(page.getByRole('menu', { name: 'Playback speed options' })).toBeVisible();
  await page.getByRole('heading', { name: 'Direct file lesson' }).click();
  await expect(page.getByRole('menu', { name: 'Playback speed options' })).toHaveCount(0);
});
