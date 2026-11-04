import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '../fixtures';
import { type DocsScheme } from '../pages/docs';

const DIST = fileURLToPath(new URL('../../../apps/docs/.vitepress/dist', import.meta.url));
const BATCH = 8;

const pagesOf = (dir: string): string[] =>
  readdirSync(dir)
    .toSorted()
    .flatMap((name) => {
      const path = join(dir, name);

      if (statSync(path).isDirectory()) {
        return name === 'assets' ? [] : pagesOf(path);
      }
      return name.endsWith('.html') && name !== '404.html' ? [path] : [];
    });

const routeOf = (file: string): string =>
  `/${relative(DIST, file)
    .replace(/index\.html$/, '')
    .replace(/\.html$/, '')}`;

const batches = (routes: readonly string[]): string[][] =>
  Array.from({ length: Math.ceil(routes.length / BATCH) }, (_, index) =>
    routes.slice(index * BATCH, (index + 1) * BATCH),
  );

const SCHEMES: readonly DocsScheme[] = ['light', 'dark'];

for (const scheme of SCHEMES) {
  for (const [index, routes] of batches(pagesOf(DIST).map(routeOf)).entries()) {
    test(`docs pages have no automatically detectable WCAG AA violations (${scheme}, batch ${index + 1})`, async ({
      docs,
      page,
      isMobile,
    }) => {
      test.skip(isMobile, 'the sweep runs on desktop Chromium');
      test.slow();
      await docs.emulate({ reducedMotion: 'reduce' });
      await page.addInitScript((value) => localStorage.setItem('nui-theme', value), scheme);

      for (const route of routes) {
        await docs.open(route);
        expect.soft(await docs.wcagViolations(), route).toEqual([]);
      }
    });
  }
}
