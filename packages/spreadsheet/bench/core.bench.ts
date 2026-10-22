import {
  createCalculator,
  createStepper,
  createWorkbook,
  loadCells,
  numberValue,
  parseFormula,
} from '@numior/spreadsheet/core';
import { readWorkbook } from '@numior/spreadsheet/xlsx';
import {
  filledSheet,
  ledger,
  ledgerFormulas,
  orderTable,
  xlsxBook,
  type Ledger,
} from './fixtures.ts';
import { measure, record, summarize, type Operation } from '../../../scripts/bench-harness.ts';

const ROWS = 20_000;
const COLS = 50;
const heavy = { iterations: 5, warmup: 1 };
const light = { iterations: 30, warmup: 3 };

const settle = (book: Pick<Ledger, 'calculator'>): void => {
  book.calculator.recalculate({ budgetMs: Number.POSITIVE_INFINITY });
};

const memoryMb = (): number => {
  globalThis.gc?.();
  const usage = process.memoryUsage();

  return (usage.heapUsed + usage.arrayBuffers) / 1_048_576;
};

const sampled = async (
  name: string,
  iterations: number,
  prepare: () => Ledger,
  run: (book: Ledger) => void,
): Promise<Operation> => {
  const samples: number[] = [];

  for (let index = 0; index < iterations; index += 1) {
    const book = prepare();
    const started = performance.now();

    run(book);
    samples.push(performance.now() - started);
    await Promise.resolve();
  }
  return summarize(name, samples);
};

const repeated = async (
  name: string,
  book: Pick<Ledger, 'calculator'>,
  edit: (index: number) => void,
): Promise<Operation> => {
  const samples: number[] = [];

  for (let index = 0; index < light.warmup + light.iterations; index += 1) {
    const started = performance.now();

    edit(index);
    book.calculator.recalculate({ budgetMs: 8 }).cancel();
    if (index >= light.warmup) {
      samples.push(performance.now() - started);
    }
    settle(book);
    await Promise.resolve();
  }
  return summarize(name, samples);
};

const before = memoryMb();
const filled = filledSheet(ROWS, COLS);
const sheetMemory = Math.round(memoryMb() - before);

console.log(
  `spreadsheet core: ${filled.sheet.cells.size.toLocaleString('en-US')} cells take ${String(sheetMemory)} MB of heap and array buffers`,
);

const operations: Operation[] = [];

operations.push(
  await measure(
    'fill a 20,000 × 50 sheet with 1,000,000 values',
    async () => {
      filledSheet(ROWS, COLS);
    },
    heavy,
  ),
);

operations.push(
  await measure(
    'read every cell of a 1,000,000 cell sheet',
    async () => {
      let count = 0;

      filled.sheet.cells.forEachInRange(
        { top: 0, left: 0, bottom: ROWS - 1, right: COLS - 1 },
        () => {
          count += 1;
        },
      );

      if (count !== ROWS * COLS) {
        throw new Error(`read ${String(count)} cells`);
      }
    },
    heavy,
  ),
);

const texts = ledgerFormulas(ROWS);

console.log(`ledger: ${texts.length.toLocaleString('en-US')} formulas on ${String(ROWS)} rows`);

operations.push(
  await measure(
    'parse 100,050 formulas',
    async () => {
      texts.forEach((formula) => parseFormula(formula.text));
    },
    heavy,
  ),
);

operations.push(
  await measure(
    'enter 100,050 formulas with their dependencies',
    async () => {
      ledger(ROWS);
    },
    heavy,
  ),
);

const loadSlices: number[] = [];

for (let index = 0; index < heavy.warmup + heavy.iterations; index += 1) {
  const workbook = createWorkbook();
  const target = workbook.addSheet('Ledger');

  workbook.addSheet('Rates');

  const loading = loadCells(
    createCalculator(workbook),
    target,
    texts.map((formula) => ({ row: formula.row, col: formula.col, formula: formula.text })),
    { yieldTo: () => Promise.resolve() },
  );

  await loading.settled;
  if (index >= heavy.warmup) {
    loadSlices.push(loading.longestMs);
  }
}

operations.push(summarize('longest main-thread slice while loading 100,050 formulas', loadSlices));

operations.push(
  await sampled(
    'recalculate 100,050 formulas from scratch',
    heavy.iterations,
    () => ledger(ROWS),
    settle,
  ),
);

operations.push(
  await sampled(
    'insert a row in the middle of the 100,050 formula ledger',
    heavy.iterations,
    () => {
      const fresh = ledger(ROWS);

      settle(fresh);
      return fresh;
    },
    (fresh) => {
      const result = createStepper(fresh.workbook, fresh.calculator).apply({
        kind: 'insertLines',
        sheet: fresh.sheet.name,
        axis: 'rows',
        at: ROWS / 2,
        count: 1,
      });

      if (!result.ok) {
        throw new Error(`the insertion was refused: ${result.reason}`);
      }
    },
  ),
);

const book = ledger(ROWS);

settle(book);

operations.push(
  await repeated('edit the head of a 20,000 deep chain to the first chunk', book, (index) => {
    book.calculator.setValue(book.sheet, 0, 1, numberValue(index % 9));
  }),
);

operations.push(
  await repeated('change a lookup rate to the first chunk', book, (index) => {
    book.calculator.setValue(book.rates, index % 5000, 1, numberValue(index));
  }),
);

operations.push(
  await measure(
    'edit an unrelated cell',
    async () => {
      book.calculator.setValue(book.sheet, 40_000, 60, numberValue(Math.random()));
      book.calculator.recalculate();
    },
    light,
  ),
);

operations.push(
  await sampled(
    'finish the recalculation after editing the chain head',
    heavy.iterations,
    () => {
      book.calculator.setValue(book.sheet, 0, 1, numberValue(Math.random()));
      return book;
    },
    settle,
  ),
);

const orders = orderTable(ROWS);

settle(orders);

operations.push(
  await repeated('rename a table column read by 20,000 row formulas', orders, (index) => {
    const entry = orders.editor.input(orders.sheet, 0, 0, index % 2 === 0 ? 'Qty' : 'Amount');

    if (!entry.ok || !orders.stepper.apply(entry.step).ok) {
      throw new Error('the header edit was refused');
    }
  }),
);

const xlsx = await xlsxBook(ROWS, COLS);
const readSlices: number[] = [];

operations.push(
  await measure(
    'read a 1,000,000 cell xlsx with 20,000 formulas',
    async () => {
      globalThis.gc?.();

      let longest = 0;
      let last = performance.now();

      const timer = setInterval(() => {
        const now = performance.now();

        longest = Math.max(longest, now - last);
        last = now;
      }, 1);

      const read = await readWorkbook(xlsx);

      clearInterval(timer);
      readSlices.push(longest);
      if (read.kind === 'rejected') {
        throw new Error(`the bench book was rejected: ${read.reason}`);
      }
    },
    heavy,
  ),
);

operations.push(
  summarize(
    'longest main-thread gap while reading a 1,000,000 cell xlsx',
    readSlices.slice(heavy.warmup),
  ),
);

const file = await record(
  new URL('./results/', import.meta.url),
  `${String(ROWS)} × ${String(COLS)} generated values (seed 1); ledger of ${String(texts.length)} formulas on ${String(ROWS)} rows with a 5,000 row lookup table`,
  operations,
  { heapUsedMb: sheetMemory },
);

console.log(`bench: recorded ${String(operations.length)} operations to ${file}`);
