import { defineConfig, devices } from '@playwright/test';

const PLAYGROUND_URL = 'http://127.0.0.1:4173';
const DOCS_URL = 'http://127.0.0.1:4174';
const NUXT_URL = 'http://127.0.0.1:4176';
const DOCS_SPECS = /\/docs\//;
const NUXT_SPECS = /\/nuxt\//;
const PLAYGROUND_IGNORE = [DOCS_SPECS, NUXT_SPECS];

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: PLAYGROUND_URL, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: PLAYGROUND_IGNORE },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: PLAYGROUND_IGNORE },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: PLAYGROUND_IGNORE },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] }, testIgnore: PLAYGROUND_IGNORE },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] }, testIgnore: PLAYGROUND_IGNORE },
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
    {
      name: 'nuxt-chromium',
      use: { ...devices['Desktop Chrome'], baseURL: NUXT_URL },
      testMatch: NUXT_SPECS,
    },
  ],
  webServer: [
    {
      command:
        'pnpm build && (node packages/collaboration/server/main.ts & pnpm --filter @numior/playground preview)',
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
    {
      command:
        'pnpm --filter @numior/nuxt fixture:build && pnpm --filter @numior/nuxt fixture:start',
      url: NUXT_URL,
      env: { HOST: '127.0.0.1', PORT: '4176', NUXT_TELEMETRY_DISABLED: '1' },
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
