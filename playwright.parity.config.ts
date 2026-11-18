import { defineConfig } from '@playwright/test';
import base from './playwright.config';
import type { ParityOptions } from './tests/parity/fixtures';
import { PROFILES } from './tests/parity/profiles';

const TARGET = process.env.PARITY_TARGET ?? 'all';

const URLS = { playground: 'http://127.0.0.1:4173', docs: 'http://127.0.0.1:4174' };
const RASTER = ['--disable-partial-raster'];
const SCALE = '--force-device-scale-factor=';
const SPECS = { playground: /playground\.spec\.ts$/, docs: /docs\.spec\.ts$/ };

const profiles = PROFILES.filter((profile) => TARGET === 'all' || profile.target === TARGET);
const targets = new Set(profiles.map((profile) => profile.target));
const servers = Array.isArray(base.webServer) ? base.webServer : [];

export default defineConfig<ParityOptions>({
  testDir: './tests/parity',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  reporter: [['list']],
  timeout: 240_000,
  projects: profiles.map((profile) => ({
    name: profile.id,
    testMatch: SPECS[profile.target],
    use: {
      browserName: 'chromium',
      launchOptions: { args: [...RASTER, `${SCALE}${profile.dpr}`] },
      baseURL: URLS[profile.target],
      viewport: { width: profile.width, height: profile.height },
      deviceScaleFactor: profile.dpr,
      colorScheme: profile.scheme,
      locale: 'ru-RU',
      timezoneId: 'UTC',
      trace: 'off',
      actionTimeout: 15_000,
      profile,
    },
  })),
  webServer: servers.filter((server) =>
    Array.from(targets).some((target) => server.url === URLS[target]),
  ),
});
