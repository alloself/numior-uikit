import { createGridEngine, type GridEngine, type GridSort } from '@numior/grid/engine';
import { BENCH_COLUMNS, generateRows, type BenchRow } from './dataset.ts';
import { measure, record, type Operation } from './harness.ts';

const ROWS = 1_000_000;
const rows = generateRows(ROWS);
const heavy = { iterations: 3, warmup: 1 };
const light = { iterations: 5, warmup: 1 };

const engineFor = (): GridEngine<BenchRow> => {
  const engine = createGridEngine({ columns: BENCH_COLUMNS });
  engine.setRows(rows);
  return engine;
};

const sortBy = (...sort: GridSort[]) => ({ sort });

const warmed = async (...sort: GridSort[]): Promise<GridEngine<BenchRow>> => {
  const engine = engineFor();
  await engine.run(sortBy(...sort));
  return engine;
};

const coldSort = (name: string, sort: GridSort, options = heavy): Promise<Operation> =>
  measure(
    name,
    async () => {
      await engineFor().run(sortBy(sort));
    },
    options,
  );

const warmSort = (
  name: string,
  engine: GridEngine<BenchRow>,
  ...sort: GridSort[]
): Promise<Operation> =>
  measure(
    name,
    async () => {
      await engine.run(sortBy(...sort));
    },
    light,
  );

console.log(`grid engine on ${ROWS.toLocaleString('en-US')} rows`);
const operations: Operation[] = [];

operations.push(
  await coldSort('build a number store and sort', { key: 'amount', direction: 'asc' }),
);

operations.push(
  await coldSort('build a date store and sort', { key: 'created', direction: 'desc' }),
);

operations.push(
  await coldSort('build a low-cardinality string store and sort', {
    key: 'city',
    direction: 'asc',
  }),
);

operations.push(
  await coldSort(
    'build a unique string store and sort',
    { key: 'email', direction: 'asc' },
    { iterations: 1, warmup: 0 },
  ),
);

const warmNumber = await warmed({ key: 'amount', direction: 'asc' });
const warmString = await warmed({ key: 'city', direction: 'asc' });
const warmEmail = await warmed({ key: 'email', direction: 'asc' });

const warmMulti = await warmed(
  { key: 'country', direction: 'asc' },
  { key: 'city', direction: 'asc' },
  { key: 'amount', direction: 'desc' },
);

operations.push(
  await warmSort('sort numbers with a warm store', warmNumber, {
    key: 'amount',
    direction: 'desc',
  }),
);

operations.push(
  await warmSort('sort strings with a warm store', warmString, { key: 'city', direction: 'desc' }),
);

operations.push(
  await warmSort('sort unique strings with a warm store', warmEmail, {
    key: 'email',
    direction: 'desc',
  }),
);

operations.push(
  await warmSort(
    'multi-sort country, city and amount with warm stores',
    warmMulti,
    { key: 'country', direction: 'desc' },
    { key: 'city', direction: 'asc' },
    { key: 'amount', direction: 'asc' },
  ),
);

const file = await record(
  new URL('./results/', import.meta.url),
  `${ROWS} generated rows, 20 columns, seed 1`,
  operations,
);

console.log(`bench: recorded ${operations.length} operations to ${file}`);
