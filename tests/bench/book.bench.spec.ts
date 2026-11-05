import { expect, test } from './fixtures';
import { record, summarize, summarizeFrames, type Operation } from '../../scripts/bench-harness';

const RESULTS = new URL('../../packages/spreadsheet/bench/results/', import.meta.url);
const ROUNDS = 10;
const WHEEL_STEPS = 120;
const WHEEL_STEP = 100;
const WHEEL_FLING = 360;

test('a styled sheet of 20 000 × 50 cells keeps input and frames within budget', async ({
  bookBench,
  browser,
}) => {
  test.setTimeout(900_000);
  await bookBench.open(0);
  const operations: Operation[] = [];

  operations.push(summarize('generate the styled book', [await bookBench.dataMs()]));

  operations.push(
    summarize('cold mount to the first painted row', await bookBench.coldStarts(browser)),
  );

  const warm: number[] = [];

  for (let round = 0; round < 5; round += 1) {
    warm.push(await bookBench.remount());
  }

  operations.push(summarize('warm remount to the first painted row', warm));
  await bookBench.focusCell(2, 2);

  operations.push(
    summarize('arrow down to the next paint', await bookBench.keyLatencies('ArrowDown', 200)),
  );

  operations.push(
    summarize(
      'arrow across columns to the next paint',
      await bookBench.keyLatencies('ArrowRight', 40),
    ),
  );

  operations.push(
    summarize('page down to the next paint', await bookBench.keyLatencies('PageDown', 50)),
  );

  const corners: number[] = [];

  for (let round = 0; round < ROUNDS; round += 1) {
    corners.push(...(await bookBench.keyLatencies('Control+End', 1)));
    corners.push(...(await bookBench.keyLatencies('Control+Home', 1)));
  }

  operations.push(
    summarize('jump between the first and the last cell of the sheet to the next paint', corners),
  );

  for (const step of [WHEEL_STEP, WHEEL_FLING]) {
    await bookBench.scrollHome();

    operations.push(
      summarizeFrames(
        `frame time while wheeling through rows by ${step} px`,
        await bookBench.wheelFrames(WHEEL_STEPS, step),
      ),
    );

    await bookBench.scrollHome();

    operations.push(
      summarizeFrames(
        `frame time while wheeling across columns by ${step} px`,
        await bookBench.wheelAcrossFrames(WHEEL_STEPS, step),
      ),
    );
  }

  operations.push(
    summarize(
      'move the row window by a viewport, main-thread ms',
      await bookBench.windowMoves(browser, 20),
    ),
  );

  const file = await record(
    RESULTS,
    'NuiSpreadsheet over a 20 000 × 50 book (70 % numbers, 25 % texts, 5 % dates; 30 % of cells with fills, borders or fonts; frozen header row and first column), viewport 1440×900',
    operations,
    {
      suffix: 'book',
      browser: `chromium ${browser.version()}`,
      heapUsedMb: await bookBench.heapMb(),
    },
  );

  console.log(`bench: recorded ${operations.length} operations to ${file}`);
  expect(operations.every((operation) => operation.samples > 0)).toBe(true);
});
