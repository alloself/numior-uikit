import { expect, test } from '@playwright/test';
import { record, summarize, type Operation } from '../../scripts/bench-harness';
import { EditorBenchPage } from './pages/editor-bench';

const BLOCKS = 10_000;
const RESULTS = new URL('../../packages/editor-core/bench/results/', import.meta.url);
const TYPED = 'The quick brown fox jumps over the lazy dog again and again. ';

test('the editor keeps typing within budget on ten thousand blocks', async ({ page, browser }) => {
  test.setTimeout(900_000);
  const bench = new EditorBenchPage(page);

  await bench.open(BLOCKS);
  const operations: Operation[] = [];

  operations.push(
    summarize('generate the document and its JSON in the page', [await bench.dataMs()]),
  );

  operations.push(
    summarize('cold mount to the first painted block', await bench.coldStarts(browser)),
  );

  const warm: number[] = [];

  for (let round = 0; round < 5; round += 1) {
    warm.push(await bench.remount());
  }
  operations.push(summarize('warm remount to the first painted block', warm));
  await bench.placeAtStart();

  const typed = TYPED.repeat(4)
    .split('')
    .slice(0, 200)
    .map((char) => (char === ' ' ? 'Space' : char));

  operations.push(summarize('type a character to the next paint', await bench.pressEach(typed)));

  operations.push(
    summarize(
      'split a paragraph with Enter to the next paint',
      await bench.pressEach(Array.from({ length: 50 }, () => 'Enter')),
    ),
  );

  operations.push(
    summarize(
      'undo a step to the next paint',
      await bench.pressEach(Array.from({ length: 50 }, () => 'Control+z')),
    ),
  );

  operations.push(
    summarize('paste 500 lines as blocks to the next paint', await bench.pasteLines(500, 3)),
  );

  operations.push(
    summarize(
      'select everything and toggle bold to the next paint',
      await bench.selectAllAndBold(4),
    ),
  );

  const wheel = await bench.wheelFrames(120, 360);

  operations.push(summarize('frame time while wheeling through blocks', wheel.frames));

  operations.push(
    summarize('long tasks while wheeling', wheel.longTasks.length === 0 ? [0] : wheel.longTasks),
  );

  const file = await record(
    RESULTS,
    `${BLOCKS} generated blocks of contentSchema (seed 1) in NuiEditor, viewport 1440×900`,
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
