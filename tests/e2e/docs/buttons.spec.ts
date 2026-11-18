import { expect, test } from '../fixtures';
import { docsRouteBatches } from '../helpers/docs-pages';

const BATCH = 8;

for (const [index, routes] of docsRouteBatches(BATCH).entries()) {
  test(`kit buttons on docs pages keep a 4 px step and icon buttons stay square (batch ${index + 1})`, async ({
    docs,
    isMobile,
  }) => {
    test.skip(isMobile, 'the sweep runs on the desktop');
    test.slow();

    for (const route of routes) {
      await docs.open(route);
      expect.soft(await docs.offGridButtons(), route).toEqual([]);
    }
  });
}
