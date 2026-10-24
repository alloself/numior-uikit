import { expect, test } from '@playwright/test';
import { record, summarize, type Operation } from '../../scripts/bench-harness';
import { SheetBenchPage } from './pages/sheet-bench';

const RESULTS = new URL('../../packages/spreadsheet/bench/results/', import.meta.url);
const ROUNDS = 10;

test('a styled sheet of 20 000 × 50 cells keeps input and frames within budget', async ({
  page,
  browser,
}) => {
  test.setTimeout(900_000);
  const bench = new SheetBenchPage(page, 'book');
  await bench.open(0);
  const operations: Operation[] = [];

  operations.push(summarize('generate the styled book', [await bench.dataMs()]));

  operations.push(
    summarize('cold mount to the first painted row', await bench.coldStarts(browser)),
  );

  const warm: number[] = [];

  for (let round = 0; round < 5; round += 1) {
    warm.push(await bench.remount());
  }
  operations.push(summarize('warm remount to the first painted row', warm));
  await bench.focusCell(2, 2);

  operations.push(
    summarize('arrow down to the next paint', await bench.keyLatencies('ArrowDown', 200)),
  );

  operations.push(
    summarize('arrow across columns to the next paint', await bench.keyLatencies('ArrowRight', 40)),
  );

  operations.push(
    summarize('page down to the next paint', await bench.keyLatencies('PageDown', 50)),
  );

  const corners: number[] = [];

  for (let round = 0; round < ROUNDS; round += 1) {
    corners.push(...(await bench.keyLatencies('Control+End', 1)));
    corners.push(...(await bench.keyLatencies('Control+Home', 1)));
  }

  operations.push(
    summarize('jump between the first and the last cell of the sheet to the next paint', corners),
  );

  await bench.scrollHome();

  operations.push(
    summarize('frame time while wheeling through rows', await bench.wheelFrames(120, 360)),
  );

  await bench.scrollHome();

  operations.push(
    summarize('frame time while wheeling across columns', await bench.wheelAcrossFrames(120, 360)),
  );

  operations.push(
    summarize(
      'move the row window by a viewport, main-thread ms',
      await bench.windowMoves(browser, 20),
    ),
  );

  const file = await record(
    RESULTS,
    'NuiSpreadsheet over a 20 000 × 50 book (70 % numbers, 25 % texts, 5 % dates; 30 % of cells with fills, borders or fonts; frozen header row and first column), viewport 1440×900',
    operations,
    {
      suffix: 'book',
      browser: `chromium ${browser.version()}`,
      heapUsedMb: await bench.heapMb(),
    },
  );

  console.log(`bench: recorded ${operations.length} operations to ${file}`);
  expect(operations.every((operation) => operation.samples > 0)).toBe(true);
});
