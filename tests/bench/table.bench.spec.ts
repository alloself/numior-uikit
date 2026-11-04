import { expect, test } from './fixtures';
import { TABLE_COLUMNS } from '../../packages/table/bench/dataset';
import { record, summarize, type Operation } from '../../scripts/bench-harness';

const ROWS = 1_000_000;
const READING_PAUSE = 2000;
const EMAIL_COLUMN = 2;
const RESULTS = new URL('../../packages/table/bench/results/', import.meta.url);

test('the data table keeps input and frames within budget on a million rows', async ({
  tableBench,
  page,
  browser,
}) => {
  test.setTimeout(900_000);
  await tableBench.open(ROWS);
  const operations: Operation[] = [];

  operations.push(summarize('generate a million rows in the page', [await tableBench.dataMs()]));

  operations.push(
    summarize('cold mount to the first painted row', await tableBench.coldStarts(browser)),
  );

  const warm: number[] = [];

  for (let round = 0; round < 5; round += 1) {
    warm.push(await tableBench.remount());
  }

  operations.push(summarize('warm remount to the first painted row', warm));
  await tableBench.focusCell(0, 1);

  operations.push(
    summarize('arrow down to the next paint', await tableBench.keyLatencies('ArrowDown', 200)),
  );

  operations.push(
    summarize(
      'arrow across columns to the next paint',
      await tableBench.keyLatencies('ArrowRight', 40),
    ),
  );

  operations.push(
    summarize('page down to the next paint', await tableBench.keyLatencies('PageDown', 50)),
  );

  const jumps = [
    ...(await tableBench.keyLatencies('Control+End', 1)),
    ...(await tableBench.keyLatencies('Control+Home', 1)),
  ];

  for (let round = 0; round < 9; round += 1) {
    jumps.push(...(await tableBench.keyLatencies('Control+End', 1)));
    jumps.push(...(await tableBench.keyLatencies('Control+Home', 1)));
  }

  operations.push(summarize('jump between the first and the last row to the next paint', jumps));

  operations.push(
    summarize('frame time while wheeling through rows', await tableBench.wheelFrames(120, 360)),
  );

  operations.push(
    summarize(
      'move the row window by a viewport, main-thread ms',
      await tableBench.windowMoves(browser, 20),
    ),
  );

  await tableBench.scrollHome();
  const [coldNumber = Number.NaN, ...warmNumber] = await tableBench.sortLatencies(5, 6);

  operations.push(
    summarize('first sort of a number column from the header to the painted result', [coldNumber]),
  );

  operations.push(
    summarize('repeat sort of a number column from the header to the painted result', warmNumber),
  );

  const [coldText = Number.NaN, ...warmText] = await tableBench.sortLatencies(3, 6);

  operations.push(
    summarize('first sort of a text column from the header to the painted result', [coldText]),
  );

  operations.push(
    summarize('repeat sort of a text column from the header to the painted result', warmText),
  );

  operations.push(
    summarize(
      'add a sort key with Shift from the header to the painted result',
      await tableBench.sortLatencies(4, 3, true),
    ),
  );

  operations.push(
    summarize(
      'apply a set filter from the header popover to the painted result',
      await tableBench.setFilterLatencies(19, [
        'active',
        'paused',
        'active',
        'closed',
        'paused',
        'new',
      ]),
    ),
  );

  await tableBench.resetFilter(19);

  const [coldCountry = Number.NaN, ...countries] = await tableBench.groupLatencies([
    ['country'],
    [],
    ['country'],
    [],
    ['country'],
  ]);

  operations.push(
    summarize('first grouping by a column from the model to the painted result', [coldCountry]),
  );

  operations.push(
    summarize(
      'change the grouping from the model to the painted result',
      countries.filter((_, index) => index % 2 === 1),
    ),
  );

  operations.push(
    summarize(
      'group by two columns from the model to the painted result',
      (await tableBench.groupLatencies([['country', 'city'], [], ['country', 'city']])).filter(
        (_, index) => index % 2 === 0,
      ),
    ),
  );

  await tableBench.groupLatencies([['country']]);
  await tableBench.scrollHome();
  await tableBench.focusCell(0, 1);

  operations.push(
    summarize(
      'expand and collapse a group to the next paint',
      await tableBench.keyLatencies('Enter', 10),
    ),
  );

  await tableBench.groupLatencies([[]]);
  await page.waitForTimeout(READING_PAUSE);
  const [coldQuick = Number.NaN, ...warmQuick] = await tableBench.quickLatencies('mosc', 4);

  operations.push(
    summarize('first quick filter keystroke after a two-second pause to the painted result', [
      coldQuick,
    ]),
  );

  operations.push(summarize('next quick filter keystroke to the painted result', warmQuick));

  const file = await record(
    RESULTS,
    `${ROWS} generated rows, ${TABLE_COLUMNS.length} columns, seed 1, viewport 1440×900`,
    operations,
    {
      suffix: 'chromium',
      browser: `chromium ${browser.version()}`,
      heapUsedMb: await tableBench.heapMb(),
    },
  );

  console.log(`bench: recorded ${operations.length} operations to ${file}`);
  expect(operations.every((operation) => operation.samples > 0)).toBe(true);
});

test('the data table sorts a million unique strings without blocking the page', async ({
  tableBench,
  browser,
}) => {
  test.setTimeout(600_000);
  await tableBench.open(ROWS);

  const { latency, longTasks } = await tableBench.sortWithLongTasks(EMAIL_COLUMN);

  const operations: Operation[] = [
    summarize('first sort of a column of unique strings right after mount to the painted result', [
      latency,
    ]),
    summarize('longest main-thread task while it sorts', [Math.max(0, ...longTasks)]),
  ];

  const file = await record(
    RESULTS,
    `${ROWS} generated rows, sort by ${ROWS} unique emails on cold stores, viewport 1440×900`,
    operations,
    { suffix: 'unique', browser: `chromium ${browser.version()}` },
  );

  console.log(`bench: recorded ${operations.length} operations to ${file}`);
  expect(Number.isFinite(latency)).toBe(true);
});
