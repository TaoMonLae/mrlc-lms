import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './finance-e2e', workers: 1, timeout: 60000, use: { baseURL: 'http://127.0.0.1:8017', headless: true, launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}, screenshot: 'only-on-failure' } });
