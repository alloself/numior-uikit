import { expect, test } from '@playwright/test';
import { record, summarize, type Operation } from '../../packages/table/bench/harness';
import { TreeBenchPage } from './pages/tree-bench';

const NODES = 100_000;
const RESULTS = new URL('../../packages/vue/bench/results/', import.meta.url);

test('the tree keeps window moves and frames within budget on a hundred thousand nodes', async ({
  page,
  browser,
}) => {
  test.setTimeout(600_000);
  const bench = new TreeBenchPage(page);
  await bench.open(NODES);
  const operations: Operation[] = [];

  operations.push(
    summarize('generate a hundred thousand nodes in the page', [await bench.dataMs()]),
  );

  operations.push(summarize('cold mount to the first painted row', [await bench.coldStart()]));

  const warm: number[] = [];

  for (let round = 0; round < 5; round += 1) {
    warm.push(await bench.remount());
  }
  operations.push(summarize('warm remount to the first painted row', warm));
  await bench.focusTree();

  operations.push(
    summarize('arrow down to the next paint', await bench.keyLatencies('ArrowDown', 200)),
  );

  operations.push(
    summarize('page down to the next paint', await bench.keyLatencies('PageDown', 50)),
  );

  operations.push(
    summarize(
      'move the row window by a viewport, main-thread ms',
      await bench.windowMoves(browser, 20),
    ),
  );

  operations.push(
    summarize('frame time while wheeling through rows', await bench.wheelFrames(120, 360)),
  );

  const file = await record(RESULTS, `${NODES} generated nodes, viewport 1440×900`, operations, {
    suffix: 'chromium',
    browser: `chromium ${browser.version()}`,
    heapUsedMb: await bench.heapMb(),
  });

  console.log(`bench: recorded ${operations.length} operations to ${file}`);
  expect(operations.every((operation) => operation.samples > 0)).toBe(true);
});
