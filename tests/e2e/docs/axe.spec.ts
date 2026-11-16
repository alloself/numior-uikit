import { expect, test } from '../fixtures';
import { docsRouteBatches } from '../helpers/docs-pages';
import { type DocsScheme } from '../pages/docs';

const BATCH = 8;

const SCHEMES: readonly DocsScheme[] = ['light', 'dark'];

for (const scheme of SCHEMES) {
  for (const [index, routes] of docsRouteBatches(BATCH).entries()) {
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
