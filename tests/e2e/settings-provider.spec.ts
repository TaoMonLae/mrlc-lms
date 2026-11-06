import { expect, test, type Page } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

// Exercise the real provider in isolation: no authentication redirects,
// unrelated page requests, database records or production mutations.
test.use({ serviceWorkers: 'block' });

let harnessScript: string;
test.beforeAll(async () => {
  const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
  const bundle = await build({
    absWorkingDir: projectRoot,
    stdin: {
      resolveDir: projectRoot,
      loader: 'tsx',
      contents: `
        import React, { useState } from 'react';
        import { createRoot } from 'react-dom/client';
        import { SettingsProvider, useSettings } from './src/providers/SettingsProvider';
        function Harness() {
          const settings = useSettings();
          const [status, setStatus] = useState('Ready');
          const changeSession = (token) => {
            if (token) sessionStorage.setItem('auth_token', token);
            else sessionStorage.removeItem('auth_token');
            window.dispatchEvent(new Event('auth-state-changed'));
          };
          return <>
            <output data-testid="name">{settings.schoolProfile.name}</output>
            <output data-testid="principal">{settings.schoolProfile.principalName}</output>
            <output data-testid="email">{settings.schoolProfile.email}</output>
            <output data-testid="color">{settings.brandingSettings.primaryColor}</output>
            <output data-testid="status">{status}</output>
            <button onClick={() => settings.reloadSettings()}>Refresh settings</button>
            <button onClick={() => settings.updateSchoolProfile({ name: 'Saved school' })
              .then(() => setStatus('Saved'), () => setStatus('Save failed'))}>Save school name</button>
            <button onClick={() => changeSession(null)}>Sign out</button>
            <button onClick={() => changeSession('second-account')}>Switch account</button>
          </>;
        }
        createRoot(document.getElementById('root')).render(
          <SettingsProvider><Harness /></SettingsProvider>
        );
      `,
    },
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'iife',
    target: 'es2022',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  harnessScript = bundle.outputFiles[0].text;
});

async function mountProvider(page: Page, token: string | null = null) {
  await page.addInitScript(({ initialToken }) => {
    if (initialToken) sessionStorage.setItem('auth_token', initialToken);
    else sessionStorage.removeItem('auth_token');
  }, { initialToken: token });
  await page.route('**/__settings-provider-test.js', route => route.fulfill({
    contentType: 'text/javascript', body: harnessScript,
  }));
  await page.route('**/__settings-provider-test', route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><html lang="en"><head><title>Settings provider test</title></head><body><div id="root"></div><script src="/__settings-provider-test.js"></script></body></html>',
  }));
  await page.goto('/__settings-provider-test');
  await expect(page.getByTestId('status')).toHaveText('Ready');
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

async function letResponsesFinish(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

// A late response can survive cancellation in a fetch wrapper or while its
// body is being processed. Keep it deliverable to test the response guard,
// not just the browser's AbortController implementation.
async function allowLateResponses(page: Page) {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => originalFetch(input, { ...init, signal: undefined });
  });
}

test('loads public branding once and ignores unrelated storage changes', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/public/branding', route => {
    requests += 1;
    return route.fulfill({ json: { name: 'Public school', contactEmail: null, primaryColor: null } });
  });
  await mountProvider(page);
  await expect(page.getByTestId('name')).toHaveText('Public school');
  await expect(page.getByTestId('email')).toBeEmpty();
  await expect(page.getByTestId('color')).toHaveText('#19324d');
  await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', {
    key: 'theme', newValue: 'dark',
  })));
  await letResponsesFinish(page);
  expect(requests).toBe(1);
});

test('a delayed private response cannot restore settings after logout', async ({ page }) => {
  const requested = deferred();
  const release = deferred();
  const completed = deferred();
  await allowLateResponses(page);
  await page.route('**/api/settings', async route => {
    requested.resolve();
    await release.promise;
    await route.fulfill({ json: { name: 'Private school', principalName: 'Private principal' } });
    completed.resolve();
  });
  await page.route('**/api/public/branding', route => route.fulfill({ json: { name: 'Public school' } }));
  await mountProvider(page, 'first-account');
  await requested.promise;
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByTestId('name')).toHaveText('Public school');
  const finished = page.waitForEvent('requestfinished', request => request.url().endsWith('/api/settings'));
  release.resolve();
  await completed.promise;
  await finished;
  await letResponsesFinish(page);
  await expect(page.getByTestId('name')).toHaveText('Public school');
  await expect(page.getByTestId('principal')).toBeEmpty();
});

test('a successful save cannot be overwritten by an older read', async ({ page }) => {
  const requested = deferred();
  const release = deferred();
  const completed = deferred();
  let reads = 0;
  await allowLateResponses(page);
  await page.route('**/api/settings', async route => {
    if (route.request().method() === 'PUT') {
      expect(route.request().postDataJSON()).toMatchObject({ name: 'Saved school' });
      return route.fulfill({ json: { name: 'Saved school' } });
    }
    reads += 1;
    if (reads === 1) return route.fulfill({ json: { name: 'Original school' } });
    requested.resolve();
    await release.promise;
    await route.fulfill({ json: { name: 'Outdated school' } });
    completed.resolve();
  });
  await mountProvider(page, 'first-account');
  await expect(page.getByTestId('name')).toHaveText('Original school');
  await page.getByRole('button', { name: 'Refresh settings', exact: true }).click();
  await requested.promise;
  await page.getByRole('button', { name: 'Save school name', exact: true }).click();
  await expect(page.getByTestId('status')).toHaveText('Saved');
  await expect(page.getByTestId('name')).toHaveText('Saved school');
  const finished = page.waitForEvent('requestfinished', request =>
    request.url().endsWith('/api/settings') && request.method() === 'GET');
  release.resolve();
  await completed.promise;
  await finished;
  await letResponsesFinish(page);
  await expect(page.getByTestId('name')).toHaveText('Saved school');
});

test('switching accounts clears the previous private fields when the new load fails', async ({ page }) => {
  await page.route('**/api/settings', route => {
    const firstAccount = route.request().headers().authorization === 'Bearer first-account';
    return route.fulfill(firstAccount
      ? { json: { name: 'First account school', principalName: 'Private principal' } }
      : { status: 503, json: { error: 'Temporarily unavailable' } });
  });
  await mountProvider(page, 'first-account');
  await expect(page.getByTestId('principal')).toHaveText('Private principal');
  const failedLoad = page.waitForResponse(response => response.url().endsWith('/api/settings') && response.status() === 503);
  await page.getByRole('button', { name: 'Switch account', exact: true }).click();
  await failedLoad;
  await expect(page.getByTestId('name')).toHaveText('Mon Refugee Learning Centre');
  await expect(page.getByTestId('principal')).toBeEmpty();
});

for (const status of [401, 403]) {
  test(`a ${status} settings response clears private fields and falls back to public branding`, async ({ page }) => {
    let reads = 0;
    await page.route('**/api/settings', route => {
      reads += 1;
      return route.fulfill(reads === 1
        ? { json: { name: 'Private school', principalName: 'Private principal' } }
        : { status, json: { error: 'Session rejected' } });
    });
    await page.route('**/api/public/branding', route => route.fulfill({ json: { name: 'Public school' } }));
    await mountProvider(page, 'first-account');
    await expect(page.getByTestId('principal')).toHaveText('Private principal');
    await page.getByRole('button', { name: 'Refresh settings', exact: true }).click();
    await expect(page.getByTestId('name')).toHaveText('Public school');
    await expect(page.getByTestId('principal')).toBeEmpty();
  });
}
