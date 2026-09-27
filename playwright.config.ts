import { defineConfig, devices } from '@playwright/test';

const PLAYGROUND_URL = 'http://127.0.0.1:4173';
const DOCS_URL = 'http://127.0.0.1:4174';
const DOCS_SPECS = /\/docs\//;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: PLAYGROUND_URL, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: DOCS_SPECS },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: DOCS_SPECS },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: DOCS_SPECS },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] }, testIgnore: DOCS_SPECS },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] }, testIgnore: DOCS_SPECS },
    {
      name: 'docs-chromium',
      use: { ...devices['Desktop Chrome'], baseURL: DOCS_URL },
      testMatch: DOCS_SPECS,
    },
    {
      name: 'docs-mobile',
      use: { ...devices['Pixel 7'], baseURL: DOCS_URL },
      testMatch: DOCS_SPECS,
    },
  ],
  webServer: [
    {
      command: 'pnpm build && pnpm --filter @numior/playground preview',
      url: PLAYGROUND_URL,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        'pnpm docs:reference && pnpm docs:build && pnpm --filter @numior/docs preview --port 4174',
      url: DOCS_URL,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
