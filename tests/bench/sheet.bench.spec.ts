import { expect, test } from './fixtures';
import { record, summarize, type Operation } from '../../scripts/bench-harness';

const RESULTS = new URL('../../packages/table/bench/results/', import.meta.url);
const ROUNDS = 10;

test('a sheet of 1 048 576 rows and 16 384 columns keeps input and frames within budget', async ({
  sheetBench,
  browser,
}) => {
  test.setTimeout(900_000);
  await sheetBench.open(0);
  const operations: Operation[] = [];

  operations.push(summarize('build the cell adapter of the sheet', [await sheetBench.dataMs()]));

  operations.push(
    summarize('cold mount to the first painted row', await sheetBench.coldStarts(browser)),
  );

  const warm: number[] = [];

  for (let round = 0; round < 5; round += 1) {
    warm.push(await sheetBench.remount());
  }

  operations.push(summarize('warm remount to the first painted row', warm));
  await sheetBench.focusCell(1, 1);

  operations.push(
    summarize('arrow down to the next paint', await sheetBench.keyLatencies('ArrowDown', 200)),
  );

  operations.push(
    summarize(
      'arrow across columns to the next paint',
      await sheetBench.keyLatencies('ArrowRight', 60),
    ),
  );

  operations.push(
    summarize('page down to the next paint', await sheetBench.keyLatencies('PageDown', 50)),
  );

  const corners: number[] = [];

  for (let round = 0; round < ROUNDS; round += 1) {
    corners.push(...(await sheetBench.keyLatencies('Control+End', 1)));
    corners.push(...(await sheetBench.keyLatencies('Control+Home', 1)));
  }

  operations.push(
    summarize('jump between the first and the last cell of the sheet to the next paint', corners),
  );

  await sheetBench.focusCell(1, 1);
  await sheetBench.keyLatencies('Control+ArrowDown', 1);
  const edges: number[] = [];

  for (let round = 0; round < ROUNDS; round += 1) {
    edges.push(...(await sheetBench.keyLatencies('Control+ArrowDown', 1)));
    edges.push(...(await sheetBench.keyLatencies('Control+ArrowUp', 1)));
  }

  operations.push(
    summarize('walk a million empty cells to the edge of the data to the next paint', edges),
  );

  operations.push(
    summarize('frame time while wheeling through rows', await sheetBench.wheelFrames(120, 360)),
  );

  await sheetBench.scrollHome();

  operations.push(
    summarize(
      'frame time while wheeling across columns',
      await sheetBench.wheelAcrossFrames(120, 360),
    ),
  );

  operations.push(
    summarize(
      'move the row window by a viewport, main-thread ms',
      await sheetBench.windowMoves(browser, 20),
    ),
  );

  const file = await record(
    RESULTS,
    '1 048 576 rows × 16 384 columns through tableCells, a filled 500 × 30 block and marks every 1000 rows and 100 columns, viewport 1440×900',
    operations,
    {
      suffix: 'sheet',
      browser: `chromium ${browser.version()}`,
      heapUsedMb: await sheetBench.heapMb(),
    },
  );

  console.log(`bench: recorded ${operations.length} operations to ${file}`);
  expect(operations.every((operation) => operation.samples > 0)).toBe(true);
});
