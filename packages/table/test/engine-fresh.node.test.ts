import * as fc from 'fast-check';
import { describe, expect, it } from 'vite-plus/test';
import {
  TableFilterKind,
  TableNodeKind,
  TableSortDirection,
  TableTextOp,
  createTableEngine,
  type TableEngine,
  type TableEngineOptions,
  type TableFilter,
  type TableFilterValue,
  type TableNode,
  type TableNodeId,
  type TableQuery,
} from '../src/engine';

interface Sale {
  readonly id: string;
  name: string | null;
  city: string | null;
  amount: number | null;
  qty: number | null;
  flag: boolean | null;
  when: number | null;
}

type SaleData = Omit<Sale, 'id'>;

type Field = keyof SaleData;

type EngineMoveKind = (typeof EngineMoveKind)[keyof typeof EngineMoveKind];

type EngineMove =
  | {
      readonly kind: typeof EngineMoveKind.Query;
      readonly query: TableQuery;
      readonly sync: boolean;
    }
  | {
      readonly kind: typeof EngineMoveKind.Patch;
      readonly row: number;
      readonly field: Field;
      readonly pick: number;
      readonly named: boolean;
    }
  | {
      readonly kind: typeof EngineMoveKind.Add;
      readonly rows: readonly SaleData[];
      readonly sync: boolean;
    }
  | { readonly kind: typeof EngineMoveKind.Remove; readonly row: number; readonly sync: boolean }
  | {
      readonly kind: typeof EngineMoveKind.Shuffle;
      readonly by: number;
      readonly reverse: boolean;
      readonly sync: boolean;
    }
  | {
      readonly kind: typeof EngineMoveKind.Toggle;
      readonly group: number;
      readonly direct: boolean;
    };

interface EngineDesk {
  readonly live: TableEngine<Sale>;
  rows: Sale[];
  query: TableQuery;
  toggled: Set<TableNodeId>;
  made: number;
}

const EngineMoveKind = {
  Query: 'query',
  Patch: 'patch',
  Add: 'add',
  Remove: 'remove',
  Shuffle: 'shuffle',
  Toggle: 'toggle',
} as const;

const PROPERTY_TIMEOUT = 60_000;

const RUNS = 300;

const MOVES = 40;

const DAY = 86_400_000;

const PRECISION = 1e6;

const LEAST_ROWS = 3;

const VALUES = {
  name: [
    'a',
    'A',
    'ä',
    'b',
    'B',
    '1',
    '01',
    '10',
    '2',
    '',
    null,
    'Москва',
    'москва',
    'ёлка',
    'елка',
    'a b',
    'ab',
  ],
  city: ['Oslo', 'oslo', 'Rome', null, '', 'Riga'],
  amount: [0, 1, 2, 2.5, null, 1e9, -3, 7, 7],
  qty: [1, 2, 3, null],
  flag: [true, false, null],
  when: [null, 0, DAY, 2 * DAY, 40 * DAY],
} as const;

const READ_BY = {
  name: ['name'],
  city: ['city'],
  amount: ['amount', 'total'],
  qty: ['qty', 'total'],
  flag: ['flag'],
  when: ['when'],
} as const;

const KEYS = ['name', 'city', 'amount', 'qty', 'total', 'flag', 'when'];

const SET_VALUES: readonly TableFilterValue[] = [
  ...VALUES.city,
  true,
  false,
  1,
  2,
  3,
  'a',
  'A',
  '1',
  '01',
];

const OPTIONS: TableEngineOptions<Sale> = {
  keyOf: (row) => row.id,
  defaultExpanded: true,
  columns: [
    { key: 'name', kind: 'string', value: (row) => row.name },
    { key: 'city', kind: 'string', value: (row) => row.city },
    { key: 'amount', kind: 'number', value: (row) => row.amount, aggregate: 'sum' },
    { key: 'qty', kind: 'number', value: (row) => row.qty, aggregate: 'max' },
    {
      key: 'total',
      kind: 'number',
      value: (row) => (row.amount === null || row.qty === null ? null : row.amount * row.qty),
      aggregate: 'avg',
    },
    { key: 'flag', kind: 'boolean', value: (row) => row.flag, aggregate: 'count' },
    { key: 'when', kind: 'date', value: (row) => row.when, aggregate: 'min' },
  ],
};

const SALE: fc.Arbitrary<SaleData> = fc.record({
  name: fc.constantFrom(...VALUES.name),
  city: fc.constantFrom(...VALUES.city),
  amount: fc.constantFrom(...VALUES.amount),
  qty: fc.constantFrom(...VALUES.qty),
  flag: fc.constantFrom(...VALUES.flag),
  when: fc.constantFrom(...VALUES.when),
});

const UNSET = { nil: undefined };

const FILTER: fc.Arbitrary<TableFilter> = fc.oneof(
  fc.record({
    kind: fc.constant(TableFilterKind.Number),
    key: fc.constantFrom('amount', 'qty', 'total'),
    min: fc.option(fc.integer({ min: 0, max: 2 }), UNSET),
    max: fc.option(fc.integer({ min: 2, max: 9 }), UNSET),
  }),
  fc.record({
    kind: fc.constant(TableFilterKind.Set),
    key: fc.constantFrom('city', 'name', 'flag', 'qty'),
    values: fc.array(fc.constantFrom(...SET_VALUES), { minLength: 1, maxLength: 2 }),
    exclude: fc.boolean(),
  }),
  fc.record({
    kind: fc.constant(TableFilterKind.Text),
    key: fc.constantFrom('name', 'city'),
    op: fc.constantFrom(
      TableTextOp.Contains,
      TableTextOp.Equals,
      TableTextOp.Starts,
      TableTextOp.Empty,
    ),
    value: fc.constantFrom('a', 'A', 'os', '', '1', 'е', 'ё'),
  }),
  fc.record({
    kind: fc.constant(TableFilterKind.Quick),
    value: fc.constantFrom('a', 'o', '1', 'мос', '7'),
  }),
  fc.record({
    kind: fc.constant(TableFilterKind.Date),
    key: fc.constant('when'),
    from: fc.option(fc.constant(DAY), UNSET),
    to: fc.option(fc.constant(3 * DAY), UNSET),
  }),
);

const QUERY: fc.Arbitrary<TableQuery> = fc.record({
  sort: fc.array(
    fc.record({
      key: fc.constantFrom(...KEYS),
      direction: fc.constantFrom(TableSortDirection.Asc, TableSortDirection.Desc),
    }),
    { maxLength: 3 },
  ),
  filters: fc.array(FILTER, { maxLength: 3 }),
  groupBy: fc.uniqueArray(fc.constantFrom('city', 'flag', 'name', 'qty', 'when'), { maxLength: 2 }),
  totals: fc.boolean(),
});

const FIELD: fc.Arbitrary<Field> = fc.constantFrom('name', 'city', 'amount', 'qty', 'flag', 'when');

const MOVE: fc.Arbitrary<EngineMove> = fc.oneof(
  {
    weight: 30,
    arbitrary: fc
      .record({ query: QUERY, sync: fc.boolean() })
      .map((picked): EngineMove => ({ kind: EngineMoveKind.Query, ...picked })),
  },
  {
    weight: 32,
    arbitrary: fc
      .record({ row: fc.nat(), field: FIELD, pick: fc.nat(), named: fc.boolean() })
      .map((picked): EngineMove => ({ kind: EngineMoveKind.Patch, ...picked })),
  },
  {
    weight: 5,
    arbitrary: fc
      .record({ rows: fc.array(SALE, { minLength: 1, maxLength: 2 }), sync: fc.boolean() })
      .map((picked): EngineMove => ({ kind: EngineMoveKind.Add, ...picked })),
  },
  {
    weight: 5,
    arbitrary: fc
      .record({ row: fc.nat(), sync: fc.boolean() })
      .map((picked): EngineMove => ({ kind: EngineMoveKind.Remove, ...picked })),
  },
  {
    weight: 4,
    arbitrary: fc
      .record({ by: fc.nat(), reverse: fc.boolean(), sync: fc.boolean() })
      .map((picked): EngineMove => ({ kind: EngineMoveKind.Shuffle, ...picked })),
  },
  {
    weight: 24,
    arbitrary: fc
      .record({ group: fc.nat(), direct: fc.boolean() })
      .map((picked): EngineMove => ({ kind: EngineMoveKind.Toggle, ...picked })),
  },
);

const rounded = (value: unknown): unknown =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.round(value * PRECISION) / PRECISION
    : value;

const recordText = (value: Readonly<Record<string, unknown>>): string =>
  JSON.stringify(
    Object.entries(value)
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([key, each]) => [key, rounded(each)]),
  );

const nodeText = (node: TableNode<Sale> | undefined): string => {
  if (node === undefined) {
    return 'missing';
  }
  return node.kind === TableNodeKind.Group
    ? `group ${node.id} of ${String(node.count)} ${node.expanded ? 'open' : 'shut'} at ${String(node.level)} ${recordText(node.aggregates)}`
    : `${node.kind} ${String(node.id)} at ${String(node.level)}`;
};

const viewOf = (engine: TableEngine<Sale>): readonly string[] => [
  `${String(engine.count())} nodes, ${String(engine.rowCount())} rows, totals ${recordText(engine.totals())}`,
  ...Array.from({ length: engine.count() }, (_unused, position) =>
    nodeText(engine.nodeAt(position)),
  ),
];

const freshView = (desk: EngineDesk): readonly string[] => {
  const fresh = createTableEngine(OPTIONS);

  fresh.setRows(desk.rows);
  fresh.runSync(desk.query);
  fresh.setToggled(desk.toggled);

  const view = viewOf(fresh);

  fresh.dispose();
  return view;
};

const saleOf = (desk: EngineDesk, data: SaleData): Sale => {
  desk.made += 1;

  return { id: `s${String(desk.made)}`, ...data };
};

const deskOf = (rows: readonly SaleData[]): EngineDesk => {
  const desk: EngineDesk = {
    live: createTableEngine(OPTIONS),
    rows: [],
    query: {},
    toggled: new Set(),
    made: 0,
  };

  desk.rows = rows.map((data) => saleOf(desk, data));
  desk.live.setRows(desk.rows);
  return desk;
};

const ran = async (desk: EngineDesk, sync: boolean): Promise<void> => {
  if (sync) {
    desk.live.runSync(desk.query);
  } else {
    await desk.live.run(desk.query, { yieldTo: () => Promise.resolve() });
  }

  desk.live.setToggled(desk.toggled);
};

const rowsAgain = async (desk: EngineDesk, rows: Sale[], sync: boolean): Promise<void> => {
  desk.rows = rows;
  desk.live.setRows(rows);
  await ran(desk, sync);
};

const rotated = (rows: readonly Sale[], by: number, reverse: boolean): Sale[] => {
  const cut = by % rows.length;
  const turned = [...rows.slice(cut), ...rows.slice(0, cut)];

  return reverse ? turned.toReversed() : turned;
};

const edited = (row: Sale, field: Field, pick: number): void => {
  switch (field) {
    case 'name':
      row.name = VALUES.name[pick % VALUES.name.length] ?? null;
      return;
    case 'city':
      row.city = VALUES.city[pick % VALUES.city.length] ?? null;
      return;
    case 'amount':
      row.amount = VALUES.amount[pick % VALUES.amount.length] ?? null;
      return;
    case 'qty':
      row.qty = VALUES.qty[pick % VALUES.qty.length] ?? null;
      return;
    case 'flag':
      row.flag = VALUES.flag[pick % VALUES.flag.length] ?? null;
      return;
    default:
      row.when = VALUES.when[pick % VALUES.when.length] ?? null;
  }
};

const patched = (desk: EngineDesk, move: Extract<EngineMove, { kind: 'patch' }>): void => {
  const row = desk.rows[move.row % desk.rows.length];

  if (row === undefined) {
    return;
  }

  edited(row, move.field, move.pick);
  desk.live.patch(desk.query, READ_BY[move.field], move.named ? [row] : undefined);
};

const groupsOf = (engine: TableEngine<Sale>): readonly (readonly [string, number])[] =>
  Array.from({ length: engine.count() }, (_unused, position) => position).flatMap((position) => {
    const node = engine.nodeAt(position);

    return node?.kind === TableNodeKind.Group ? [[node.id, position] as const] : [];
  });

const toggled = (desk: EngineDesk, move: Extract<EngineMove, { kind: 'toggle' }>): void => {
  const groups = groupsOf(desk.live);
  const [id, position] = groups[move.group % Math.max(1, groups.length)] ?? [];

  if (id === undefined || position === undefined) {
    return;
  }

  desk.toggled = new Set(desk.toggled);

  if (desk.toggled.has(id)) {
    desk.toggled.delete(id);
  } else {
    desk.toggled.add(id);
  }

  if (move.direct) {
    desk.live.toggle(position);
    return;
  }

  desk.live.setToggled(desk.toggled);
};

const play = async (desk: EngineDesk, move: EngineMove): Promise<void> => {
  switch (move.kind) {
    case EngineMoveKind.Query:
      desk.query = move.query;
      await ran(desk, move.sync);
      return;
    case EngineMoveKind.Add:
      await rowsAgain(
        desk,
        [...desk.rows, ...move.rows.map((data) => saleOf(desk, data))],
        move.sync,
      );

      return;
    case EngineMoveKind.Remove:
      await rowsAgain(
        desk,
        desk.rows.length > LEAST_ROWS
          ? desk.rows.filter((_row, index) => index !== move.row % desk.rows.length)
          : desk.rows,
        move.sync,
      );

      return;
    case EngineMoveKind.Shuffle:
      await rowsAgain(desk, rotated(desk.rows, move.by, move.reverse), move.sync);
      return;
    case EngineMoveKind.Toggle:
      toggled(desk, move);
      return;
    default:
      patched(desk, move);
  }
};

const readKeys = (query: TableQuery): ReadonlySet<string> =>
  new Set([
    ...(query.sort ?? []).map((sort) => sort.key),
    ...(query.groupBy ?? []),
    ...(query.filters ?? []).flatMap((filter) => ('key' in filter ? [filter.key] : KEYS)),
  ]);

const shownAtOnce = (desk: EngineDesk, move: EngineMove): boolean =>
  move.kind === EngineMoveKind.Patch &&
  READ_BY[move.field].every((key) => !readKeys(desk.query).has(key));

const lagOf = (desk: EngineDesk, move: EngineMove): readonly string[] => {
  if (!shownAtOnce(desk, move)) {
    return [];
  }

  const fresh = freshView(desk);

  return viewOf(desk.live).flatMap((line, index) =>
    line === fresh[index] ? [] : [`${line} instead of ${fresh[index] ?? 'nothing'}`],
  );
};

const caughtUp = async (desk: EngineDesk, move: EngineMove): Promise<void> => {
  if (move.kind !== EngineMoveKind.Patch) {
    return;
  }

  await ran(desk, true);
};

describe('a table engine that lives through queries, edits and new rows', () => {
  it(
    'shows what a fresh engine shows for the same rows, query and toggled groups',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(SALE, { minLength: 6, maxLength: 45 }),
          fc.array(MOVE, { maxLength: MOVES, size: 'max' }),
          async (rows, moves) => {
            const desk = deskOf(rows);

            for (const move of moves) {
              await play(desk, move);

              expect(lagOf(desk, move)).toEqual([]);

              await caughtUp(desk, move);
              expect(viewOf(desk.live)).toEqual(freshView(desk));
            }

            desk.live.dispose();
          },
        ),
        { numRuns: RUNS },
      );
    },
    PROPERTY_TIMEOUT,
  );
});
