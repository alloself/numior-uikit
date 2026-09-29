import { expect, test } from '@playwright/test';
import { GRID_COLUMNS } from '../../packages/table/bench/dataset';
import { record, summarize, type Operation } from '../../packages/table/bench/harness';
import { GridBenchPage } from './pages/grid-bench';

const ROWS = 1_000_000;
const RESULTS = new URL('../../packages/table/bench/results/', import.meta.url);

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

  await bench.scrollHome();
  const [coldNumber = Number.NaN, ...warmNumber] = await bench.sortLatencies(5, 6);

  operations.push(
    summarize('first sort of a number column from the header to the painted result', [coldNumber]),
  );

  operations.push(
    summarize('repeat sort of a number column from the header to the painted result', warmNumber),
  );

  const [coldText = Number.NaN, ...warmText] = await bench.sortLatencies(3, 6);

  operations.push(
    summarize('first sort of a text column from the header to the painted result', [coldText]),
  );

  operations.push(
    summarize('repeat sort of a text column from the header to the painted result', warmText),
  );

  operations.push(
    summarize(
      'add a sort key with Shift from the header to the painted result',
      await bench.sortLatencies(4, 3, true),
    ),
  );

  operations.push(
    summarize(
      'apply a set filter from the header popover to the painted result',
      await bench.setFilterLatencies(19, ['active', 'paused', 'active', 'closed', 'paused', 'new']),
    ),
  );

  await bench.resetFilter(19);

  const [coldCountry = Number.NaN, ...countries] = await bench.groupLatencies([
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
      (await bench.groupLatencies([['country', 'city'], [], ['country', 'city']])).filter(
        (_, index) => index % 2 === 0,
      ),
    ),
  );

  await bench.groupLatencies([['country']]);
  await bench.focusCell(0, 1);

  operations.push(
    summarize(
      'expand and collapse a group to the next paint',
      await bench.keyLatencies('Enter', 10),
    ),
  );

  await bench.groupLatencies([[]]);
  const [coldQuick = Number.NaN, ...warmQuick] = await bench.quickLatencies('mosc', 4);

  operations.push(
    summarize('first quick filter keystroke while text stores build to the painted result', [
      coldQuick,
    ]),
  );

  operations.push(summarize('next quick filter keystroke to the painted result', warmQuick));

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
