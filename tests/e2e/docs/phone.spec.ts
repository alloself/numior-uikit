import { expect, test } from '../fixtures';
import { docsRouteBatches } from '../helpers/docs-pages';

const BATCH = 8;

const PHONE = 390;

for (const [index, routes] of docsRouteBatches(BATCH).entries()) {
  test(`docs pages fit a ${String(PHONE)} px phone without a side scroll (batch ${index + 1})`, async ({
    docs,
    isMobile,
  }) => {
    test.skip(!isMobile, 'the sweep runs on the phone');
    test.slow();
    await docs.resize(PHONE);

    for (const route of routes) {
      await docs.open(route);
      expect.soft(await docs.misfits(), route).toEqual([]);
    }
  });
}
