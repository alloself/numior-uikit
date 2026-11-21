import { expect, test } from '../fixtures';

const PAGES = [
  { path: '/components/table/cells', peer: 'Анна' },
  { path: '/en/components/table/cells', peer: 'Anna' },
];

const PAYMENT_ROW = 2;

const HOURS = 2;

const WRAPPED_RISE = 10;

const FRAME_TOLERANCE = 1;

for (const { path, peer } of PAGES) {
  test(`the peers example on ${path} frames the cell of a person below a pinned row of wrapped text`, async ({
    docs,
    docsPeers,
  }) => {
    await docs.open(path);
    await docsPeers.root.scrollIntoViewIfNeeded();
    await expect(docsPeers.frame(peer)).toBeVisible();

    expect(await docsPeers.pinnedRise()).toBeGreaterThan(WRAPPED_RISE);

    await expect
      .poll(() => docsPeers.frameDrift(peer, PAYMENT_ROW, HOURS))
      .toBeLessThanOrEqual(FRAME_TOLERANCE);
  });
}
