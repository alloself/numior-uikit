import {
  createTableEngine,
  type TableEngine,
  type TableFilter,
  type TableSort,
} from '@numior/table/engine';
import {
  BENCH_COLUMNS,
  TREE_COLUMNS,
  generateRows,
  generateTree,
  type BenchNode,
  type BenchRow,
} from './dataset.ts';
import { measure, record, type Operation } from '../../../scripts/bench-harness.ts';

const ROWS = 1_000_000;
const rows = generateRows(ROWS);
const heavy = { iterations: 3, warmup: 1 };
const light = { iterations: 20, warmup: 1 };

const yieldTo = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

const engineFor = (): TableEngine<BenchRow> => {
  const engine = createTableEngine({ columns: BENCH_COLUMNS, yieldTo });
  engine.setRows(rows);
  return engine;
};

const sortBy = (...sort: TableSort[]) => ({ sort });

const warmed = async (...sort: TableSort[]): Promise<TableEngine<BenchRow>> => {
  const engine = engineFor();
  await engine.run(sortBy(...sort));
  return engine;
};

const coldSort = (name: string, sort: TableSort, options = heavy): Promise<Operation> =>
  measure(
    name,
    async () => {
      await engineFor().run(sortBy(sort));
    },
    options,
  );

const warmSort = (
  name: string,
  engine: TableEngine<BenchRow>,
  ...sort: TableSort[]
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

const warmFilters = await warmed({ key: 'city', direction: 'asc' });
await warmFilters.run({ sort: [{ key: 'status', direction: 'asc' }] });
await warmFilters.run({ sort: [{ key: 'amount', direction: 'asc' }] });

const filterOnly = (name: string, ...filters: TableFilter[]): Promise<Operation> =>
  measure(
    name,
    async () => {
      await warmFilters.run({ filters });
    },
    light,
  );

operations.push(
  await filterOnly('filter city contains "an" with a warm store', {
    kind: 'text',
    key: 'city',
    op: 'contains',
    value: 'an',
  }),
);

operations.push(
  await filterOnly('filter amount between 1000 and 50000 with a warm store', {
    kind: 'number',
    key: 'amount',
    min: 1000,
    max: 50_000,
  }),
);

operations.push(
  await filterOnly('filter status in a set with a warm store', {
    kind: 'set',
    key: 'status',
    values: ['active', 'paused'],
  }),
);

operations.push(
  await measure(
    'quick filter over every string column with cold stores',
    async () => {
      await engineFor().run({ filters: [{ kind: 'quick', value: 'mos' }] });
    },
    heavy,
  ),
);

const warmQuick = engineFor();
await warmQuick.run({ filters: [{ kind: 'quick', value: 'a' }] });

operations.push(
  await measure(
    'quick filter over every string column with warm stores',
    async () => {
      await warmQuick.run({ filters: [{ kind: 'quick', value: 'mos' }] });
    },
    light,
  ),
);

operations.push(
  await measure(
    'group by country with sum, count and avg on warm stores',
    async () => {
      await warmMulti.run({ groupBy: ['country'] });
    },
    light,
  ),
);

operations.push(
  await measure(
    'totals of sum, count and avg over all rows on warm stores',
    async () => {
      await warmMulti.run({ totals: true });
    },
    light,
  ),
);

operations.push(
  await measure(
    'group by country and city with aggregates on warm stores',
    async () => {
      await warmMulti.run({ groupBy: ['country', 'city'] });
    },
    light,
  ),
);

const TREE_NODES = 100_000;
const tree = generateTree(TREE_NODES);

const treeEngine = (): TableEngine<BenchNode> =>
  createTableEngine({
    columns: TREE_COLUMNS,
    children: (row) => row.items,
    keyOf: (row) => row.id,
    yieldTo,
  });

operations.push(
  await measure(
    `flatten a ${TREE_NODES.toLocaleString('en-US')} node tree, sort siblings and walk it`,
    async () => {
      const engine = treeEngine();
      engine.setRows(tree);
      await engine.run({ sort: [{ key: 'name', direction: 'asc' }] });
    },
    heavy,
  ),
);

const walkable = treeEngine();
walkable.setRows(tree);
await walkable.run({ sort: [{ key: 'size', direction: 'desc' }] });

operations.push(
  await measure(
    `collapse and expand a root of the ${TREE_NODES.toLocaleString('en-US')} node tree`,
    async () => {
      walkable.toggle(0);
      walkable.toggle(0);
    },
    { iterations: 10, warmup: 2 },
  ),
);

const file = await record(
  new URL('./results/', import.meta.url),
  `${ROWS} generated rows, 20 columns, seed 1`,
  operations,
);

console.log(`bench: recorded ${operations.length} operations to ${file}`);
