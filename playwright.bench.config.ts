import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/bench',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 900_000,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'off' },
  projects: [
    {
      name: 'bench-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm --filter @numior/playground preview',
    url: 'http://127.0.0.1:4173/bench.html',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
