import { expect, test } from '../fixtures';
import { docsRouteBatches } from '../helpers/docs-pages';

const BATCH = 8;

for (const [index, routes] of docsRouteBatches(BATCH).entries()) {
  test(`docs pages hydrate what the server rendered (batch ${index + 1})`, async ({ docs }) => {
    test.slow();

    for (const route of routes) {
      await docs.open(route);
      expect.soft(docs.hydrationMessages(), route).toEqual([]);
    }
  });
}
