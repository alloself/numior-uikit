import { expect, test } from '@playwright/test';
import { GRID_COLUMNS } from '../../packages/grid/bench/dataset';
import { record, summarize, type Operation } from '../../packages/grid/bench/harness';
import { GridBenchPage } from './pages/grid-bench';

const ROWS = 1_000_000;
const RESULTS = new URL('../../packages/grid/bench/results/', import.meta.url);

test('the data grid keeps input and frames within budget on a million rows', async ({
  page,
  browser,
}) => {
  test.setTimeout(900_000);
  const bench = new GridBenchPage(page);
  await bench.open(ROWS);
  const operations: Operation[] = [];

  operations.push(summarize('generate a million rows in the page', [await bench.dataMs()]));
  operations.push(summarize('cold mount to the first painted row', [await bench.coldStart()]));

  const warm: number[] = [];

  for (let round = 0; round < 5; round += 1) {
    warm.push(await bench.remount());
  }
  operations.push(summarize('warm remount to the first painted row', warm));
  await bench.focusCell(0, 1);

  operations.push(
    summarize('arrow down to the next paint', await bench.keyLatencies('ArrowDown', 200)),
  );

  operations.push(
    summarize('arrow across columns to the next paint', await bench.keyLatencies('ArrowRight', 40)),
  );

  operations.push(
    summarize('page down to the next paint', await bench.keyLatencies('PageDown', 50)),
  );

  const jumps = [
    ...(await bench.keyLatencies('Control+End', 1)),
    ...(await bench.keyLatencies('Control+Home', 1)),
  ];

  for (let round = 0; round < 9; round += 1) {
    jumps.push(...(await bench.keyLatencies('Control+End', 1)));
    jumps.push(...(await bench.keyLatencies('Control+Home', 1)));
  }
  operations.push(summarize('jump between the first and the last row to the next paint', jumps));

  operations.push(
    summarize('frame time while wheeling through rows', await bench.wheelFrames(120, 360)),
  );

  const file = await record(
    RESULTS,
    `${ROWS} generated rows, ${GRID_COLUMNS.length} columns, seed 1, viewport 1440×900`,
    operations,
    {
      suffix: 'chromium',
      browser: `chromium ${browser.version()}`,
      heapUsedMb: await bench.heapMb(),
    },
  );

  console.log(`bench: recorded ${operations.length} operations to ${file}`);
  expect(operations.every((operation) => operation.samples > 0)).toBe(true);
});
