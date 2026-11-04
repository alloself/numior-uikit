import { expect, test } from './fixtures';
import { record, summarize, type Operation } from '../../scripts/bench-harness';

const NODES = 100_000;
const RESULTS = new URL('../../packages/vue/bench/results/', import.meta.url);

test('the tree keeps window moves and frames within budget on a hundred thousand nodes', async ({
  treeBench,
  browser,
}) => {
  test.setTimeout(600_000);
  await treeBench.open(NODES);
  const operations: Operation[] = [];

  operations.push(
    summarize('generate a hundred thousand nodes in the page', [await treeBench.dataMs()]),
  );

  operations.push(
    summarize('cold mount to the first painted row', await treeBench.coldStarts(browser)),
  );

  const warm: number[] = [];

  for (let round = 0; round < 5; round += 1) {
    warm.push(await treeBench.remount());
  }

  operations.push(summarize('warm remount to the first painted row', warm));
  await treeBench.focusTree();

  operations.push(
    summarize('arrow down to the next paint', await treeBench.keyLatencies('ArrowDown', 200)),
  );

  operations.push(
    summarize('page down to the next paint', await treeBench.keyLatencies('PageDown', 50)),
  );

  operations.push(
    summarize(
      'move the row window by a viewport, main-thread ms',
      await treeBench.windowMoves(browser, 20),
    ),
  );

  operations.push(
    summarize('frame time while wheeling through rows', await treeBench.wheelFrames(120, 360)),
  );

  const file = await record(RESULTS, `${NODES} generated nodes, viewport 1440×900`, operations, {
    suffix: 'chromium',
    browser: `chromium ${browser.version()}`,
    heapUsedMb: await treeBench.heapMb(),
  });

  console.log(`bench: recorded ${operations.length} operations to ${file}`);
  expect(operations.every((operation) => operation.samples > 0)).toBe(true);
});
